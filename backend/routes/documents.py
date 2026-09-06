import re
import difflib
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from database.cloud_sql import get_db
from models.orm_models import Project, Client, Order, DesignFee
from services.google_drive_service import (
    ensure_project_drive_tree,
    ensure_order_drive_tree,
    ensure_design_drive_tree,
    ensure_client_folder,
    get_master_drive_tree,
    create_custom_folder,
    rename_drive_item,
    trash_drive_item,
    list_folder_files,
    upload_file_to_drive,
    get_drive_service,
    get_subfolders,
    get_subfolders_batch,
    get_or_create_root_containers,
    get_or_create_drive_folder,
    create_drive_shortcut,
    migrate_drive_to_2_tier,
    normalize_name,
    PROJECT_STANDARD_FOLDERS
)

logger = logging.getLogger(__name__)

router = APIRouter()


class CreateFolderRequest(BaseModel):
    parent_folder_id: str
    name: str


class RenameFolderRequest(BaseModel):
    name: str


# --- 1. Master Drive Tree for Global Folder Module ---
@router.get("/tree")
def get_global_drive_tree():
    """
    Returns the complete Google Drive folder tree for the Global Folder Module.
    Fetches all clients, projects, designs, and orders across the company drive.
    """
    try:
        nodes = get_master_drive_tree()
        return nodes
    except Exception as e:
        logger.error(f"Failed to fetch global drive tree: {e}", exc_info=True)
        return []


@router.get("/diag/inspect/{file_id}")
def inspect_file(file_id: str):
    """Diagnostic endpoint to inspect metadata and children of any Google Drive file or folder."""
    try:
        drive_service = get_drive_service()
        meta = drive_service.files().get(
            fileId=file_id,
            fields="id, name, mimeType, parents, trashed, driveId, shortcutDetails",
            supportsAllDrives=True
        ).execute()
        subs = get_subfolders(drive_service, file_id, include_shortcuts=True)
        return {"meta": meta, "subs": subs}
    except Exception as e:
        return {"error": str(e)}


def resolve_project_client(project: Optional[Project], db: Session) -> tuple[Optional[Client], str]:
    """
    Robustly resolves the canonical Client for a Project.
    1. By project.client_id
    2. By project.client_name matching Client.name (exact or case-insensitive)
    3. By fuzzy matching Client names against project.name or project.client_name
    Persists project.client_id and project.client_name in Cloud SQL when matched.
    Returns (client_instance, canonical_client_name).
    """
    if not project:
        return None, "General Clients"

    client = None
    if project.client_id:
        client = db.query(Client).filter(Client.id == project.client_id).first()
        if client:
            return client, client.name

    if project.client_name and project.client_name.strip():
        c_name = project.client_name.strip()
        client = db.query(Client).filter(func.lower(Client.name) == c_name.lower()).first()
        if not client:
            client = db.query(Client).filter(Client.name.ilike(f"%{c_name}%")).first()

    if not client and project.name:
        all_clients = db.query(Client).all()
        proj_norm = re.sub(r'[^a-z0-9]+', '', (project.name or "").lower())
        best_c = None
        best_score = 0.0
        for c in all_clients:
            c_norm = re.sub(r'[^a-z0-9]+', '', (c.name or "").lower())
            if not c_norm:
                continue
            if c_norm == proj_norm:
                best_c = c
                best_score = 1.0
                break
            ratio = difflib.SequenceMatcher(None, c_norm, proj_norm).ratio()
            if len(c_norm) >= 6 and (c_norm in proj_norm or proj_norm in c_norm):
                ratio = max(ratio, 0.90)
            if ratio >= 0.85 and ratio > best_score:
                best_score = ratio
                best_c = c
        if best_c:
            client = best_c

    if not client:
        # Check if any DesignFee for this project has a linked client
        df_with_client = db.query(DesignFee).filter(
            or_(DesignFee.project_id == project.id, DesignFee.project_key == project.project_key),
            DesignFee.client_id.isnot(None)
        ).first()
        if df_with_client and df_with_client.client_id:
            client = db.query(Client).filter(Client.id == df_with_client.client_id).first()

    if client:
        try:
            changed = False
            if project.client_id != client.id:
                project.client_id = client.id
                changed = True
            if project.client_name != client.name:
                project.client_name = client.name
                changed = True
            if changed:
                db.commit()
                logger.info(f"Relational link saved: Project {project.id} -> Client {client.id} ({client.name})")
        except Exception as e:
            db.rollback()
            logger.warning(f"Could not persist client link on project {project.id}: {e}")
        return client, client.name

    return None, (project.client_name or "General Clients")


# --- 2. Get Folder Tree Scoped to an Order ---
@router.get("/order/{order_id}/folders")
def get_order_folders(order_id: str, db: Session = Depends(get_db)):
    """
    Returns Google Drive folders scoped directly to an Order.
    Auto-provisions: [Client] / [Project] / Orders / [PO - Supplier]
    along with the 4 standard subfolders (BOQs, POs, Logistics, Invoices).
    """
    clean_id = (order_id or "").strip()
    if not clean_id:
        return []

    order = None
    if clean_id.isdigit():
        order = db.query(Order).filter(Order.id == int(clean_id)).first()
    if not order:
        order = db.query(Order).filter(func.lower(Order.po_number) == clean_id.lower()).first()

    client_name = "General Clients"
    project_name = "General Project"
    po_number = clean_id
    supplier_name = ""

    if order:
        po_number = order.po_number or f"ORD-{order.id}"
        supplier_name = order.supplier_name or ""
        
        # Resolve Project & Client
        project = None
        if order.project_id:
            project = db.query(Project).filter(Project.id == order.project_id).first()
        elif order.project_key:
            project = db.query(Project).filter(func.lower(Project.project_key) == order.project_key.lower()).first()

        if project:
            _, client_name = resolve_project_client(project, db)
            project_name = project.name

    try:
        folders = ensure_order_drive_tree(
            client_name=client_name,
            project_name=project_name,
            order_identifier=po_number,
            supplier_name=supplier_name
        )
        return folders
    except Exception as e:
        logger.error(f"Error ensuring drive tree for order {clean_id}: {e}", exc_info=True)
        return []


# --- 2b. Get Folder Tree Scoped to a Design Package ---
@router.get("/design/{design_id}/folders")
def get_design_folders(design_id: str, db: Session = Depends(get_db)):
    """
    Returns Google Drive folders scoped directly to a Design Package.
    Auto-provisions: [Client] / [Project] / Designs / [Fee Ref - Name]
    along with the 5 standard subfolders (Drawings, Specs, Site Photos, Proposals, Moodboards).
    """
    clean_id = (design_id or "").strip()
    if not clean_id:
        return []

    design = None
    if clean_id.isdigit():
        design = db.query(DesignFee).filter(DesignFee.id == int(clean_id)).first()
    if not design:
        design = db.query(DesignFee).filter(func.lower(DesignFee.fee_ref) == clean_id.lower()).first()

    client_name = "General Clients"
    project_name = "General Project"
    fee_ref = clean_id
    design_name = ""

    if design:
        fee_ref = design.fee_ref or f"DF-{design.id}"
        design_name = design.name or ""
        
        project = None
        if design.project_id:
            project = db.query(Project).filter(Project.id == design.project_id).first()
        elif design.project_key:
            project = db.query(Project).filter(func.lower(Project.project_key) == design.project_key.lower()).first()

        if project:
            _, client_name = resolve_project_client(project, db)
            project_name = project.name

    try:
        folders = ensure_design_drive_tree(
            client_name=client_name,
            project_name=project_name,
            fee_ref=fee_ref,
            design_name=design_name
        )
        return folders
    except Exception as e:
        logger.error(f"Error ensuring drive tree for design {clean_id}: {e}", exc_info=True)
        return []


# --- 2c. Migration Trigger Endpoint for 2-Tier Master Hierarchy ---
@router.post("/migrate-to-2-tier")
def trigger_drive_migration(db: Session = Depends(get_db)):
    """
    Triggers Google Drive restructuring to the 2-Tier Master Hierarchy:
    - Creates '01 - PROJECTS' and '02 - CLIENTS'
    - Eliminates nested duplicate project folders
    - Moves physical project folders to '01 - PROJECTS'
    - Moves client folders to '02 - CLIENTS'
    - Creates native Drive shortcuts from Client folders to their respective projects
    - Syncs Cloud SQL master_drive_folder pointers
    """
    try:
        report = migrate_drive_to_2_tier(db=db)
        return {"success": True, "report": report}
    except Exception as e:
        logger.error(f"Migration to 2-tier Drive hierarchy failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")


# --- 3. Get Folder Tree Scoped to a Client (2-Tier Fast Hierarchical View) ---
@router.get("/client/{client_id}/folders")
def get_client_folders(client_id: str, db: Session = Depends(get_db)):
    """
    Returns Google Drive folders scoped to a Client in the 2-Tier Architecture:
    1. Ensures Client folder exists under '02 - CLIENTS'.
    2. Queries DB for projects belonging to this client.
    3. Finds or links each project folder in '01 - PROJECTS' and ensures a shortcut in the client folder.
    4. Fast batch traversal: fetches immediate subfolders (Drawings, Specs, Photos, Designs, Orders)
       without sequential recursive explosion, returning in <1.5 seconds.
    """
    clean_id = (client_id or "").strip()
    if not clean_id:
        return []

    client = None
    if clean_id.isdigit():
        client = db.query(Client).filter(Client.id == int(clean_id)).first()
    if not client:
        client = db.query(Client).filter(func.lower(Client.name) == clean_id.lower()).first()
    if not client:
        client = db.query(Client).filter(Client.name.ilike(f"%{clean_id}%")).first()

    client_name = client.name if client else clean_id

    try:
        drive_service = get_drive_service()
        projects_root, clients_root = get_or_create_root_containers(drive_service)
        projects_root_id = projects_root['id']
        clients_root_id = clients_root['id']

        client_f = ensure_client_folder(client_name)
        client_folder_id = client_f['id']

        all_nodes = [
            {
                "id": client_folder_id,
                "gdrive_folder_id": client_folder_id,
                "name": client_f['name'],
                "parent_id": None,
                "type": "client_root",
                "sort_order": 0,
                "webViewLink": client_f.get('webViewLink', '')
            }
        ]

        # Query projects associated with this client
        projects = []
        if client:
            related_client_ids = {client.id}
            client_names_to_match = {client.name.lower().strip()}

            # Match sibling/alias clients via similarity (e.g. Wynand Wilsenacht vs Wynand Wilsenach)
            all_clients = db.query(Client).all()
            for other_c in all_clients:
                if other_c.id != client.id:
                    c1_norm = normalize_name(other_c.name)
                    c2_norm = normalize_name(client.name)
                    score = difflib.SequenceMatcher(None, c1_norm, c2_norm).ratio()
                    if score >= 0.85 or (len(c1_norm) >= 6 and (c1_norm in c2_norm or c2_norm in c1_norm)):
                        related_client_ids.add(other_c.id)
                        client_names_to_match.add(other_c.name.lower().strip())

            projects = db.query(Project).filter(
                or_(
                    Project.client_id.in_(related_client_ids),
                    func.lower(Project.client_name).in_(client_names_to_match),
                    *[Project.client_name.ilike(f"%{cn}%") for cn in client_names_to_match],
                    *[Project.name.ilike(f"%{cn}%") for cn in client_names_to_match]
                )
            ).all()

            # Also check if any orders referencing this client belong to additional projects
            client_orders = db.query(Order).filter(
                or_(
                    *[Order.quote_name.ilike(f"%{cn}%") for cn in client_names_to_match]
                )
            ).all()
            order_proj_ids = {o.project_id for o in client_orders if o.project_id}
            if order_proj_ids:
                addl_projects = db.query(Project).filter(Project.id.in_(order_proj_ids)).all()
                existing_pids = {p.id for p in projects}
                for ap in addl_projects:
                    if ap.id not in existing_pids:
                        projects.append(ap)
                        existing_pids.add(ap.id)

        # Query existing items inside client folder (shortcuts or folders)
        client_children = get_subfolders(drive_service, client_folder_id, include_shortcuts=True)
        client_shortcuts_by_target = {}
        client_children_by_norm = {}
        for ch in client_children:
            ch_norm = normalize_name(ch['name'])
            client_children_by_norm[ch_norm] = ch
            if ch.get('mimeType') == 'application/vnd.google-apps.shortcut':
                t_id = ch.get('shortcutDetails', {}).get('targetId')
                if t_id:
                    client_shortcuts_by_target[t_id] = ch

        seen_project_ids = set()
        seen_gdrive_ids = {client_folder_id}
        valid_projects = []
        proj_folder_ids = []

        for proj in projects:
            if proj.id in seen_project_ids:
                continue
            seen_project_ids.add(proj.id)

            # Persist relational link if missing
            try:
                if client and (proj.client_id != client.id or proj.client_name != client.name):
                    proj.client_id = client.id
                    proj.client_name = client.name
                    db.commit()
            except Exception:
                db.rollback()

            # Ensure physical project folder in 01 - PROJECTS
            proj_f = get_or_create_drive_folder(drive_service, proj.name, projects_root_id)
            proj_folder_id = proj_f['id']
            if proj.master_drive_folder != proj_folder_id:
                try:
                    proj.master_drive_folder = proj_folder_id
                    db.commit()
                except Exception:
                    db.rollback()

            # Ensure native shortcut in client folder pointing to the project in 01 - PROJECTS
            sc = create_drive_shortcut(drive_service, proj.name, proj_folder_id, client_folder_id)
            if sc and sc.get('id'):
                client_shortcuts_by_target[proj_folder_id] = sc

            valid_projects.append((proj, proj_folder_id))
            proj_folder_ids.append(proj_folder_id)

        # Batch 1: Query immediate subfolders of all projects in a single Drive call
        batch_proj_subs = get_subfolders_batch(drive_service, proj_folder_ids, include_shortcuts=False)

        container_ids_to_fetch = []
        proj_containers_map = {}

        for proj, proj_folder_id in valid_projects:
            if proj_folder_id not in seen_gdrive_ids:
                seen_gdrive_ids.add(proj_folder_id)
                all_nodes.append({
                    "id": proj_folder_id,
                    "gdrive_folder_id": proj_folder_id,
                    "name": proj.name,
                    "parent_id": client_folder_id,
                    "project_gdrive_id": proj_folder_id,
                    "type": "project_folder",
                    "sort_order": 1,
                    "webViewLink": f"https://drive.google.com/drive/folders/{proj_folder_id}"
                })

            proj_subs = batch_proj_subs.get(proj_folder_id, [])
            proj_subs_by_name = {ps['name'].lower().strip(): ps for ps in proj_subs}

            # If project standard folders don't exist yet, ensure them
            for starter in PROJECT_STANDARD_FOLDERS:
                s_name = starter["name"]
                match_key = s_name.lower().strip()
                matched = proj_subs_by_name.get(match_key)
                if not matched:
                    stripped = re.sub(r'^\d+\s*-\s*', '', match_key)
                    for ex_name, ex_f in proj_subs_by_name.items():
                        if stripped in ex_name or ex_name in stripped:
                            matched = ex_f
                            break
                if not matched:
                    matched = get_or_create_drive_folder(drive_service, s_name, proj_folder_id)
                    proj_subs_by_name[match_key] = matched

                if matched['id'] not in seen_gdrive_ids:
                    seen_gdrive_ids.add(matched['id'])
                    all_nodes.append({
                        "id": matched['id'],
                        "gdrive_folder_id": matched['id'],
                        "name": matched['name'],
                        "parent_id": proj_folder_id,
                        "project_gdrive_id": proj_folder_id,
                        "type": "project_standard",
                        "sort_order": starter["sort"],
                        "webViewLink": matched.get('webViewLink', '')
                    })

            # Check Designs container
            designs_root = proj_subs_by_name.get("designs")
            if not designs_root:
                designs_root = get_or_create_drive_folder(drive_service, "Designs", proj_folder_id)
                proj_subs_by_name["designs"] = designs_root

            if designs_root['id'] not in seen_gdrive_ids:
                seen_gdrive_ids.add(designs_root['id'])
                all_nodes.append({
                    "id": designs_root['id'],
                    "gdrive_folder_id": designs_root['id'],
                    "name": "📁 Designs",
                    "parent_id": proj_folder_id,
                    "project_gdrive_id": proj_folder_id,
                    "type": "design_root",
                    "sort_order": 4,
                    "webViewLink": designs_root.get('webViewLink', '')
                })

            # Check Orders container
            orders_root = proj_subs_by_name.get("orders")
            if not orders_root:
                orders_root = get_or_create_drive_folder(drive_service, "Orders", proj_folder_id)
                proj_subs_by_name["orders"] = orders_root

            if orders_root['id'] not in seen_gdrive_ids:
                seen_gdrive_ids.add(orders_root['id'])
                all_nodes.append({
                    "id": orders_root['id'],
                    "gdrive_folder_id": orders_root['id'],
                    "name": "📁 Orders",
                    "parent_id": proj_folder_id,
                    "project_gdrive_id": proj_folder_id,
                    "type": "orders_root",
                    "sort_order": 5,
                    "webViewLink": orders_root.get('webViewLink', '')
                })

            proj_containers_map[proj_folder_id] = {
                "designs_root_id": designs_root['id'],
                "orders_root_id": orders_root['id']
            }
            container_ids_to_fetch.append(designs_root['id'])
            container_ids_to_fetch.append(orders_root['id'])

        # Batch 2: Query immediate children inside Designs and Orders in a single Drive call
        batch_container_subs = get_subfolders_batch(drive_service, container_ids_to_fetch, include_shortcuts=False)

        all_known_clients = db.query(Client).all() if client else []
        client_norm = normalize_name(client_name)

        for proj, proj_folder_id in valid_projects:
            containers = proj_containers_map.get(proj_folder_id, {})
            d_root_id = containers.get("designs_root_id")
            o_root_id = containers.get("orders_root_id")

            # Designs children
            if d_root_id:
                df_subs = batch_container_subs.get(d_root_id, [])
                for df_sub in df_subs:
                    if df_sub['id'] not in seen_gdrive_ids:
                        seen_gdrive_ids.add(df_sub['id'])
                        all_nodes.append({
                            "id": df_sub['id'],
                            "gdrive_folder_id": df_sub['id'],
                            "name": df_sub['name'],
                            "parent_id": d_root_id,
                            "project_gdrive_id": proj_folder_id,
                            "type": "design_package",
                            "sort_order": 10,
                            "webViewLink": df_sub.get('webViewLink', '')
                        })

            # Orders children (scoped to client if relevant)
            if o_root_id:
                ord_subs = batch_container_subs.get(o_root_id, [])
                for ord_sub in ord_subs:
                    sub_norm = normalize_name(ord_sub['name'])
                    is_other_client = False
                    if client and all_known_clients:
                        for oc in all_known_clients:
                            if oc.id != client.id:
                                oc_norm = normalize_name(oc.name)
                                if len(oc_norm) >= 6 and oc_norm in sub_norm and oc_norm not in client_norm:
                                    is_other_client = True
                                    break
                    if not is_other_client and ord_sub['id'] not in seen_gdrive_ids:
                        seen_gdrive_ids.add(ord_sub['id'])
                        all_nodes.append({
                            "id": ord_sub['id'],
                            "gdrive_folder_id": ord_sub['id'],
                            "name": ord_sub['name'],
                            "parent_id": o_root_id,
                            "project_gdrive_id": proj_folder_id,
                            "type": "order_folder",
                            "sort_order": 15,
                            "webViewLink": ord_sub.get('webViewLink', '')
                        })

        # Also include any custom folders directly in Drive under Client folder
        for dc in client_children:
            if dc.get('mimeType') == 'application/vnd.google-apps.folder' and dc['id'] not in seen_gdrive_ids:
                seen_gdrive_ids.add(dc['id'])
                all_nodes.append({
                    "id": dc['id'],
                    "gdrive_folder_id": dc['id'],
                    "name": dc['name'],
                    "parent_id": client_folder_id,
                    "type": "custom",
                    "sort_order": 50,
                    "webViewLink": dc.get('webViewLink', '')
                })

        return all_nodes
    except Exception as e:
        logger.error(f"Error ensuring client folder tree for {clean_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch client folders: {str(e)}")


# --- 4. Get Folder Tree Scoped to a Project ---
@router.get("/{project_id}/folders")
def get_project_folders(project_id: str, db: Session = Depends(get_db)):
    """
    Returns the Google Drive folder tree for a project.
    Resolves project by integer ID, project_key, or name.
    Auto-provisions:
    - 01 - Drawings & CAD
    - 02 - Project Specifications
    - 03 - Site Photos & Snags
    - Designs/ (with folders for active design fees)
    - Orders/ (with folders for active orders and their 4 standard subfolders: BOQs, POs, Logistics, Invoices)
    """
    clean_id = (project_id or "").strip()
    if not clean_id:
        return []

    project = None

    # 1. Try resolving by integer ID
    if clean_id.isdigit():
        project = db.query(Project).filter(Project.id == int(clean_id)).first()

    # 2. Try resolving by project_key
    if not project:
        project = db.query(Project).filter(func.lower(Project.project_key) == clean_id.lower()).first()

    # 3. Try resolving by name
    if not project:
        project = db.query(Project).filter(func.lower(Project.name) == clean_id.lower()).first()

    # 4. Resolve client and project names
    if project:
        _, client_name = resolve_project_client(project, db)
        project_name = project.name
        
        # Fetch related design fees
        dfs = db.query(DesignFee).filter(
            or_(DesignFee.project_id == project.id, DesignFee.project_key == project.project_key)
        ).all()
        design_fee_list = []
        seen_df = set()
        for d in dfs:
            ref = (d.fee_ref or f"DF-{d.id}").strip()
            nm = (d.name or "").strip()
            k = (ref.lower(), nm.lower())
            if k not in seen_df:
                seen_df.add(k)
                design_fee_list.append({"id": d.id, "fee_ref": ref, "name": nm})

        # Fetch related orders
        ords = db.query(Order).filter(
            or_(Order.project_id == project.id, Order.project_key == project.project_key)
        ).all()
        order_list = []
        seen_ord = set()
        for o in ords:
            po = (o.po_number or f"ORD-{o.id}").strip()
            supp = (o.supplier_name or "").strip()
            k = (po.lower(), supp.lower())
            if k not in seen_ord:
                seen_ord.add(k)
                order_list.append({"id": o.id, "po_number": po, "supplier_name": supp})
    else:
        client_name = "General Clients"
        project_name = clean_id.replace('-', ' ').replace('_', ' ').title()
        design_fee_list = []
        order_list = []

    try:
        folders = ensure_project_drive_tree(
            client_name=client_name, 
            project_name=project_name,
            design_fees=design_fee_list,
            orders=order_list,
            parent_for_project=None
        )

        # Update master_drive_folder if not set or outdated
        if project and folders:
            first_project_gdrive_id = folders[0].get("project_gdrive_id")
            if first_project_gdrive_id and project.master_drive_folder != first_project_gdrive_id:
                try:
                    project.master_drive_folder = first_project_gdrive_id
                    db.commit()
                except Exception:
                    db.rollback()

        return folders
    except Exception as e:
        logger.error(f"Error ensuring drive tree for project {clean_id}: {e}", exc_info=True)
        return []


# --- 5. List Files Inside a Google Drive Folder ---
@router.get("/folders/{gdrive_folder_id}/files")
def get_folder_files(gdrive_folder_id: str):
    """Lists real files inside the specified Google Drive folder."""
    clean_folder_id = (gdrive_folder_id or "").strip()
    if not clean_folder_id:
        return []
    try:
        files = list_folder_files(clean_folder_id)
        return files
    except Exception as e:
        logger.error(f"Error fetching files for folder {clean_folder_id}: {e}", exc_info=True)
        return []


# --- 6. Upload File Directly into a Google Drive Folder ---
@router.post("/folders/{gdrive_folder_id}/upload")
async def upload_file_to_folder(
    gdrive_folder_id: str,
    file: UploadFile = File(...)
):
    """Streams an uploaded file directly into Google Drive."""
    try:
        contents = await file.read()
        uploaded = upload_file_to_drive(
            folder_id=gdrive_folder_id,
            file_bytes=contents,
            filename=file.filename or "Uploaded Document",
            content_type=file.content_type or "application/octet-stream"
        )
        return {"message": "File uploaded successfully to Google Drive", "file": uploaded}
    except Exception as e:
        logger.error(f"Upload to Google Drive failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


# --- 7. Create Custom User Folder ---
@router.post("/folders")
def create_new_folder(req: CreateFolderRequest):
    """Creates a new custom subfolder in Google Drive."""
    if not req.parent_folder_id or not req.name.strip():
        raise HTTPException(status_code=400, detail="parent_folder_id and name are required")
    try:
        created = create_custom_folder(req.parent_folder_id, req.name.strip())
        return {
            "id": created["id"],
            "gdrive_folder_id": created["id"],
            "name": created["name"],
            "parent_id": req.parent_folder_id,
            "type": "custom",
            "sort_order": 99,
            "webViewLink": created.get("webViewLink", "")
        }
    except Exception as e:
        logger.error(f"Failed to create folder: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create folder: {str(e)}")


# --- 8. Rename Folder ---
@router.patch("/folders/{folder_id}")
def rename_folder(folder_id: str, req: RenameFolderRequest):
    """Renames an existing folder in Google Drive."""
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="New name cannot be empty")
    try:
        updated = rename_drive_item(folder_id, req.name.strip())
        return {"message": "Folder renamed successfully", "folder": updated}
    except Exception as e:
        logger.error(f"Failed to rename folder: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to rename folder: {str(e)}")


# --- 9. Trash Folder ---
@router.delete("/folders/{folder_id}")
def trash_folder(folder_id: str):
    """Moves a folder to Google Drive trash."""
    try:
        trashed = trash_drive_item(folder_id)
        return {"message": "Folder moved to trash successfully", "folder": trashed}
    except Exception as e:
        logger.error(f"Failed to trash folder: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to trash folder: {str(e)}")


# --- 10. Trash File ---
@router.delete("/files/{gdrive_file_id}")
def trash_file(gdrive_file_id: str):
    """Moves a file to Google Drive trash."""
    try:
        trashed = trash_drive_item(gdrive_file_id)
        return {"message": "File moved to trash successfully", "file": trashed}
    except Exception as e:
        logger.error(f"Failed to trash file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to trash file: {str(e)}")


# --- 11. Stream File for In-Portal PDF & Image Preview ---
@router.get("/files/{gdrive_file_id}/stream")
def stream_file_content(gdrive_file_id: str):
    """Streams file content directly through backend proxy for seamless in-app preview without CORS/auth blocks."""
    try:
        drive_service = get_drive_service()
        file_meta = drive_service.files().get(
            fileId=gdrive_file_id,
            fields="id, name, mimeType, size",
            supportsAllDrives=True
        ).execute()

        request = drive_service.files().get_media(fileId=gdrive_file_id, supportsAllDrives=True)
        
        def iterfile():
            import io
            from googleapiclient.http import MediaIoBaseDownload
            fh = io.BytesIO()
            downloader = MediaIoBaseDownload(fh, request)
            done = False
            while not done:
                status, done = downloader.next_chunk()
            fh.seek(0)
            yield from fh

        mime_type = file_meta.get("mimeType", "application/pdf")
        filename = file_meta.get("name", "document.pdf")
        return StreamingResponse(
            iterfile(),
            media_type=mime_type,
            headers={
                "Content-Disposition": f"inline; filename=\"{filename}\"",
                "Cache-Control": "public, max-age=3600"
            }
        )
    except Exception as e:
        logger.error(f"Failed to stream file {gdrive_file_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to stream file: {str(e)}")
