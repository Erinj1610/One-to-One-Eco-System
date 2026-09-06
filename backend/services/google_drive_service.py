import os
import io
import re
import difflib
import logging
from typing import List, Dict, Any, Optional
import google.auth
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

logger = logging.getLogger(__name__)

SCOPES_DRIVE = [
    'https://www.googleapis.com/auth/drive'
]

# Shared Google Drive Root Folder
ROOT_DRIVE_FOLDER_ID = "0AFF94SUUC_EQUk9PVA"

# Project-Level Standard Starter Folders
PROJECT_STANDARD_FOLDERS = [
    {"name": "01 - Drawings & CAD", "sort": 1},
    {"name": "02 - Project Specifications", "sort": 2},
    {"name": "03 - Site Photos & Snags", "sort": 3},
]

# Order-Level Standard Subfolders
ORDER_STANDARD_SUBFOLDERS = [
    {"name": "01 - BOQs & Quotations", "sort": 1},
    {"name": "02 - Supplier POs & Confirmations", "sort": 2},
    {"name": "03 - Logistics (Delivery Notes & Packing Lists)", "sort": 3},
    {"name": "04 - Invoices & Proof of Payment", "sort": 4},
]

# Design-Level Standard Subfolders
DESIGN_STANDARD_SUBFOLDERS = [
    {"name": "01 - Drawings & CAD", "sort": 1},
    {"name": "02 - Project Specifications", "sort": 2},
    {"name": "03 - Site Photos & Snags", "sort": 3},
    {"name": "04 - Proposals & Contracts", "sort": 4},
    {"name": "05 - Moodboards & Presentations", "sort": 5},
]


def get_drive_service():
    """Initializes Google Drive v3 client using Cloud Run Compute service account."""
    try:
        creds, _ = google.auth.default(scopes=SCOPES_DRIVE)
        drive_service = build('drive', 'v3', credentials=creds)
        return drive_service
    except Exception as e:
        logger.error(f"Failed to initialize Google Drive service: {e}")
        raise RuntimeError(f"Google Drive Authentication Failed: {e}")


def normalize_name(s: str) -> str:
    """Normalizes string for fuzzy comparison (lowercase, alphanumeric only)."""
    return re.sub(r'[^a-z0-9]+', '', (s or "").lower())


def get_subfolders(drive_service, parent_id: str) -> List[Dict[str, Any]]:
    """Returns all immediate subfolders under a parent folder."""
    query = f"'{parent_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
    try:
        res = drive_service.files().list(
            q=query,
            fields="files(id, name, webViewLink, parents)",
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
            pageSize=100
        ).execute()
        return res.get('files', [])
    except Exception as e:
        logger.warning(f"Error listing subfolders under {parent_id}: {e}")
        return []


def get_or_create_drive_folder(
    drive_service, 
    folder_name: str, 
    parent_folder_id: Optional[str] = None,
    fuzzy_threshold: float = 0.85
) -> Dict[str, Any]:
    """
    Finds an existing folder by name under parent_folder_id or creates a new one in Shared Drive.
    Includes fuzzy matching & normalization deduplication to prevent duplicate client/project folders.
    """
    clean_name = folder_name.strip()
    sanitized_name = clean_name.replace("'", "\\'")
    
    # 1. Exact Name Query
    query = f"name='{sanitized_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    if parent_folder_id:
        query += f" and '{parent_folder_id}' in parents"

    try:
        res = drive_service.files().list(
            q=query,
            fields="files(id, name, webViewLink, parents)",
            supportsAllDrives=True,
            includeItemsFromAllDrives=True
        ).execute()
        files = res.get('files', [])
        if files:
            return files[0]
    except Exception as e:
        logger.warning(f"Error searching for Drive folder '{clean_name}': {e}")

    # 2. Fuzzy Matching Deduplication: Check existing subfolders in parent
    target_norm = normalize_name(clean_name)
    if len(target_norm) >= 3 and parent_folder_id:
        existing_subfolders = get_subfolders(drive_service, parent_folder_id)
        best_match = None
        best_score = 0.0

        for ef in existing_subfolders:
            ef_name = ef.get('name', '')
            ef_norm = normalize_name(ef_name)
            if not ef_norm:
                continue

            # Exact normalized match (e.g. spacing, punctuation, case differences)
            if ef_norm == target_norm:
                logger.info(f"Deduplication: folder '{clean_name}' matched existing '{ef_name}' ({ef.get('id')}) via normalization")
                return ef

            ratio = difflib.SequenceMatcher(None, target_norm, ef_norm).ratio()
            # If one is a significant substring of the other (e.g. "Wynand Wilsenach Architects" in "Wynand Wilsenach Architects - Project")
            if len(target_norm) >= 6 and (target_norm in ef_norm or ef_norm in target_norm):
                ratio = max(ratio, 0.90)

            if ratio >= fuzzy_threshold and ratio > best_score:
                best_score = ratio
                best_match = ef

        if best_match:
            logger.info(f"Deduplication: folder '{clean_name}' fuzzy-matched existing '{best_match.get('name')}' ({best_match.get('id')}) with score {best_score:.2f}")
            return best_match

    # 3. Create new folder if no match found
    folder_metadata = {
        'name': clean_name,
        'mimeType': 'application/vnd.google-apps.folder'
    }
    if parent_folder_id:
        folder_metadata['parents'] = [parent_folder_id]

    try:
        created = drive_service.files().create(
            body=folder_metadata,
            fields='id, name, webViewLink, parents',
            supportsAllDrives=True
        ).execute()
        logger.info(f"Created new Drive folder '{clean_name}' with ID: {created.get('id')}")
        return created
    except Exception as e:
        logger.error(f"Failed to create Drive folder '{clean_name}': {e}")
        raise


def ensure_client_folder(client_name: str) -> Dict[str, Any]:
    """Ensures a Client folder exists under the Shared Drive root."""
    drive_service = get_drive_service()
    clean_client = (client_name or "General Clients").strip()
    return get_or_create_drive_folder(drive_service, clean_client, ROOT_DRIVE_FOLDER_ID)


def ensure_order_drive_tree(
    client_name: str, 
    project_name: str, 
    order_identifier: str, 
    supplier_name: str = ""
) -> List[Dict[str, Any]]:
    """
    Ensures the path down to a specific Order:
    Root -> Client -> Project -> Orders -> [Order Ref / PO]
    Plus ensures the 4 standard order subfolders (BOQs, POs, Logistics, Invoices).
    Returns all folder nodes scoped to this order.
    """
    drive_service = get_drive_service()
    clean_client = (client_name or "General Clients").strip()
    clean_project = (project_name or "General Project").strip()
    
    supplier_part = f" - {supplier_name.strip()}" if supplier_name and supplier_name.strip() else ""
    order_folder_name = f"{order_identifier.strip()}{supplier_part}"

    # 1. Ensure Client & Project & Orders parent folders
    client_folder = get_or_create_drive_folder(drive_service, clean_client, ROOT_DRIVE_FOLDER_ID)
    project_folder = get_or_create_drive_folder(drive_service, clean_project, client_folder['id'])
    orders_root = get_or_create_drive_folder(drive_service, "Orders", project_folder['id'])
    
    # 2. Ensure Order Folder
    order_folder = get_or_create_drive_folder(drive_service, order_folder_name, orders_root['id'])
    order_folder_id = order_folder['id']

    # 3. Query existing subfolders in this Order
    existing = get_subfolders(drive_service, order_folder_id)
    existing_by_name = {f['name'].lower().strip(): f for f in existing}

    folder_nodes = [
        {
            "id": order_folder_id,
            "gdrive_folder_id": order_folder_id,
            "name": order_folder['name'],
            "parent_id": None, # Acts as root in order-scoped view
            "type": "order_root",
            "sort_order": 0,
            "webViewLink": order_folder.get('webViewLink', '')
        }
    ]

    # 4. Ensure 4 standard order subfolders
    for starter in ORDER_STANDARD_SUBFOLDERS:
        s_name = starter["name"]
        match_key = s_name.lower().strip()
        matched = existing_by_name.get(match_key)
        if not matched:
            stripped = re.sub(r'^\d+\s*-\s*', '', match_key)
            for ex_name, ex_f in existing_by_name.items():
                if stripped in ex_name or ex_name in stripped:
                    matched = ex_f
                    break

        if not matched:
            matched = get_or_create_drive_folder(drive_service, s_name, order_folder_id)
            existing_by_name[match_key] = matched

        folder_nodes.append({
            "id": matched['id'],
            "gdrive_folder_id": matched['id'],
            "name": matched['name'],
            "parent_id": order_folder_id,
            "type": "order_sub",
            "sort_order": starter["sort"],
            "webViewLink": matched.get('webViewLink', '')
        })

    # 5. Include any custom folders created inside the order
    known_ids = {n['id'] for n in folder_nodes}
    for ex in existing:
        if ex['id'] not in known_ids:
            folder_nodes.append({
                "id": ex['id'],
                "gdrive_folder_id": ex['id'],
                "name": ex['name'],
                "parent_id": order_folder_id,
                "type": "custom",
                "sort_order": 99,
                "webViewLink": ex.get('webViewLink', '')
            })

    return folder_nodes


def ensure_design_drive_tree(
    client_name: str, 
    project_name: str, 
    fee_ref: str, 
    design_name: str = ""
) -> List[Dict[str, Any]]:
    """
    Ensures the path down to a specific Design Package:
    Root -> Client -> Project -> Designs -> [Fee Ref - Design Name]
    Plus ensures the 5 standard design subfolders (Drawings, Specs, Site Photos, Proposals, Moodboards).
    Returns all folder nodes scoped to this design package.
    """
    drive_service = get_drive_service()
    clean_client = (client_name or "General Clients").strip()
    clean_project = (project_name or "General Project").strip()
    
    name_part = f" - {design_name.strip()}" if design_name and design_name.strip() else ""
    design_folder_name = f"{fee_ref.strip()}{name_part}"

    # 1. Ensure Client & Project & Designs parent folders
    client_folder = get_or_create_drive_folder(drive_service, clean_client, ROOT_DRIVE_FOLDER_ID)
    project_folder = get_or_create_drive_folder(drive_service, clean_project, client_folder['id'])
    designs_root = get_or_create_drive_folder(drive_service, "Designs", project_folder['id'])
    
    # 2. Ensure Design Folder
    design_folder = get_or_create_drive_folder(drive_service, design_folder_name, designs_root['id'])
    design_folder_id = design_folder['id']

    # 3. Query existing subfolders in this Design
    existing = get_subfolders(drive_service, design_folder_id)
    existing_by_name = {f['name'].lower().strip(): f for f in existing}

    folder_nodes = [
        {
            "id": design_folder_id,
            "gdrive_folder_id": design_folder_id,
            "name": design_folder['name'],
            "parent_id": None, # Acts as root in design-scoped view
            "type": "design_root",
            "sort_order": 0,
            "webViewLink": design_folder.get('webViewLink', '')
        }
    ]

    # 4. Ensure 5 standard design subfolders (Drawings, Specs, Site Photos, Proposals, Moodboards)
    for starter in DESIGN_STANDARD_SUBFOLDERS:
        s_name = starter["name"]
        match_key = s_name.lower().strip()
        matched = existing_by_name.get(match_key)
        if not matched:
            stripped = re.sub(r'^\d+\s*-\s*', '', match_key)
            for ex_name, ex_f in existing_by_name.items():
                if stripped in ex_name or ex_name in stripped:
                    matched = ex_f
                    break

        if not matched:
            matched = get_or_create_drive_folder(drive_service, s_name, design_folder_id)
            existing_by_name[match_key] = matched

        folder_nodes.append({
            "id": matched['id'],
            "gdrive_folder_id": matched['id'],
            "name": matched['name'],
            "parent_id": design_folder_id,
            "type": "design_sub",
            "sort_order": starter["sort"],
            "webViewLink": matched.get('webViewLink', '')
        })

    # 5. Include any custom folders created inside the design
    known_ids = {n['id'] for n in folder_nodes}
    for ex in existing:
        if ex['id'] not in known_ids:
            folder_nodes.append({
                "id": ex['id'],
                "gdrive_folder_id": ex['id'],
                "name": ex['name'],
                "parent_id": design_folder_id,
                "type": "custom",
                "sort_order": 99,
                "webViewLink": ex.get('webViewLink', '')
            })

    return folder_nodes


def ensure_project_drive_tree(
    client_name: str, 
    project_name: str, 
    design_fees: Optional[List[Dict[str, Any]]] = None,
    orders: Optional[List[Dict[str, Any]]] = None,
    client_folder_id: Optional[str] = None,
    parent_for_project: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Ensures Client folder, Project folder, standard project subfolders,
    Designs folder with active design packages, and Orders folder with active orders.
    Correctly establishes parent_id relationships so it renders properly in both
    Project-scoped view (where project node has parent_id=None) and
    Client-scoped view (where project node has parent_id=client_folder_id).
    """
    drive_service = get_drive_service()
    clean_client = (client_name or "General Clients").strip()
    clean_project = (project_name or "General Project").strip()

    # 1. Ensure Client Folder & Project Folder
    if not client_folder_id:
        client_folder = get_or_create_drive_folder(drive_service, clean_client, ROOT_DRIVE_FOLDER_ID)
        client_folder_id = client_folder['id']
    else:
        client_folder = {'id': client_folder_id, 'name': clean_client}

    project_folder = get_or_create_drive_folder(drive_service, clean_project, client_folder_id)
    project_folder_id = project_folder['id']

    # 2. Existing immediate children of Project
    proj_children = get_subfolders(drive_service, project_folder_id)
    proj_children_by_name = {f['name'].lower().strip(): f for f in proj_children}

    # 3. Initialize nodes with Project Folder itself
    folder_nodes = [
        {
            "id": project_folder_id,
            "gdrive_folder_id": project_folder_id,
            "name": project_folder['name'],
            "parent_id": parent_for_project,
            "project_gdrive_id": project_folder_id,
            "type": "project_folder",
            "sort_order": 0,
            "webViewLink": project_folder.get('webViewLink', '')
        }
    ]

    # 4. Standard Project-Level Folders (Drawings, Specs, Photos)
    for starter in PROJECT_STANDARD_FOLDERS:
        s_name = starter["name"]
        match_key = s_name.lower().strip()
        matched = proj_children_by_name.get(match_key)
        if not matched:
            stripped = re.sub(r'^\d+\s*-\s*', '', match_key)
            for ex_name, ex_f in proj_children_by_name.items():
                if stripped in ex_name or ex_name in stripped:
                    matched = ex_f
                    break

        if not matched:
            matched = get_or_create_drive_folder(drive_service, s_name, project_folder_id)
            proj_children_by_name[match_key] = matched

        folder_nodes.append({
            "id": matched['id'],
            "gdrive_folder_id": matched['id'],
            "name": matched['name'],
            "parent_id": project_folder_id,
            "project_gdrive_id": project_folder_id,
            "type": "project_standard",
            "sort_order": starter["sort"],
            "webViewLink": matched.get('webViewLink', '')
        })

    # 5. Ensure "Designs" Parent Folder
    designs_root = proj_children_by_name.get("designs")
    if not designs_root:
        designs_root = get_or_create_drive_folder(drive_service, "Designs", project_folder_id)
        proj_children_by_name["designs"] = designs_root

    designs_root_id = designs_root['id']
    folder_nodes.append({
        "id": designs_root_id,
        "gdrive_folder_id": designs_root_id,
        "name": "📁 Designs",
        "parent_id": project_folder_id,
        "project_gdrive_id": project_folder_id,
        "type": "design_root",
        "sort_order": 4,
        "webViewLink": designs_root.get('webViewLink', '')
    })

    # Subfolders under Designs
    existing_designs = get_subfolders(drive_service, designs_root_id)
    existing_designs_by_name = {f['name'].lower().strip(): f for f in existing_designs}

    if design_fees:
        for df in design_fees:
            fee_ref = df.get("fee_ref") or f"DF-{df.get('id', '')}"
            df_name = df.get("name") or "Design Package"
            target_name = f"{fee_ref} - {df_name}".strip()
            df_key = target_name.lower().strip()
            df_matched = existing_designs_by_name.get(df_key)
            if not df_matched:
                for ex_name, ex_f in existing_designs_by_name.items():
                    if fee_ref.lower() in ex_name:
                        df_matched = ex_f
                        break
            if not df_matched:
                df_matched = get_or_create_drive_folder(drive_service, target_name, designs_root_id)
                existing_designs_by_name[df_key] = df_matched

            df_id = df_matched['id']
            folder_nodes.append({
                "id": df_id,
                "gdrive_folder_id": df_id,
                "name": df_matched['name'],
                "parent_id": designs_root_id,
                "project_gdrive_id": project_folder_id,
                "type": "design_package",
                "sort_order": 10,
                "webViewLink": df_matched.get('webViewLink', '')
            })

            # Ensure 5 standard subfolders inside each design package (Drawings, Specs, Site Photos, Proposals, Moodboards)
            sub_of_df = get_subfolders(drive_service, df_id)
            sub_of_df_by_name = {sf['name'].lower().strip(): sf for sf in sub_of_df}
            for starter in DESIGN_STANDARD_SUBFOLDERS:
                ds_name = starter["name"]
                ds_key = ds_name.lower().strip()
                ds_match = sub_of_df_by_name.get(ds_key)
                if not ds_match:
                    stripped = re.sub(r'^\d+\s*-\s*', '', ds_key)
                    for ex_name, ex_f in sub_of_df_by_name.items():
                        if stripped in ex_name or ex_name in stripped:
                            ds_match = ex_f
                            break

                if not ds_match:
                    ds_match = get_or_create_drive_folder(drive_service, ds_name, df_id)
                    sub_of_df_by_name[ds_key] = ds_match

                folder_nodes.append({
                    "id": ds_match['id'],
                    "gdrive_folder_id": ds_match['id'],
                    "name": ds_match['name'],
                    "parent_id": df_id,
                    "project_gdrive_id": project_folder_id,
                    "type": "design_sub",
                    "sort_order": starter["sort"],
                    "webViewLink": ds_match.get('webViewLink', '')
                })

            # Include any custom folders under this design package
            known_sub_ids = {n['id'] for n in folder_nodes}
            for ex_sub in sub_of_df:
                if ex_sub['id'] not in known_sub_ids:
                    folder_nodes.append({
                        "id": ex_sub['id'],
                        "gdrive_folder_id": ex_sub['id'],
                        "name": ex_sub['name'],
                        "parent_id": df_id,
                        "project_gdrive_id": project_folder_id,
                        "type": "custom",
                        "sort_order": 99,
                        "webViewLink": ex_sub.get('webViewLink', '')
                    })

    # Include any custom folders under Designs
    known_design_ids = {n['id'] for n in folder_nodes}
    for ex in existing_designs:
        if ex['id'] not in known_design_ids:
            folder_nodes.append({
                "id": ex['id'],
                "gdrive_folder_id": ex['id'],
                "name": ex['name'],
                "parent_id": designs_root_id,
                "project_gdrive_id": project_folder_id,
                "type": "design_package",
                "sort_order": 20,
                "webViewLink": ex.get('webViewLink', '')
            })

    # 6. Ensure "Orders" Parent Folder
    orders_root = proj_children_by_name.get("orders")
    if not orders_root:
        orders_root = get_or_create_drive_folder(drive_service, "Orders", project_folder_id)
        proj_children_by_name["orders"] = orders_root

    orders_root_id = orders_root['id']
    folder_nodes.append({
        "id": orders_root_id,
        "gdrive_folder_id": orders_root_id,
        "name": "📁 Orders",
        "parent_id": project_folder_id,
        "project_gdrive_id": project_folder_id,
        "type": "orders_root",
        "sort_order": 5,
        "webViewLink": orders_root.get('webViewLink', '')
    })

    # Subfolders under Orders
    existing_orders = get_subfolders(drive_service, orders_root_id)
    existing_orders_by_name = {f['name'].lower().strip(): f for f in existing_orders}

    if orders:
        for ord_item in orders:
            po_num = ord_item.get("po_number") or f"ORD-{ord_item.get('id', '')}"
            supp_name = (ord_item.get("supplier_name") or ord_item.get("supplier") or "").strip()
            supp_suffix = f" - {supp_name}" if supp_name else ""
            ord_name = f"{po_num}{supp_suffix}".strip()
            ord_key = ord_name.lower().strip()
            
            ord_matched = existing_orders_by_name.get(ord_key)
            if not ord_matched:
                for ex_name, ex_f in existing_orders_by_name.items():
                    if po_num.lower() in ex_name:
                        ord_matched = ex_f
                        break
            if not ord_matched:
                ord_matched = get_or_create_drive_folder(drive_service, ord_name, orders_root_id)
                existing_orders_by_name[ord_key] = ord_matched

            ord_id = ord_matched['id']
            folder_nodes.append({
                "id": ord_id,
                "gdrive_folder_id": ord_id,
                "name": ord_matched['name'],
                "parent_id": orders_root_id,
                "project_gdrive_id": project_folder_id,
                "type": "order_folder",
                "sort_order": 15,
                "webViewLink": ord_matched.get('webViewLink', '')
            })

            # Ensure the 4 order subfolders under each order
            sub_of_order = get_subfolders(drive_service, ord_id)
            sub_of_order_by_name = {sf['name'].lower().strip(): sf for sf in sub_of_order}
            for starter in ORDER_STANDARD_SUBFOLDERS:
                os_name = starter["name"]
                os_key = os_name.lower().strip()
                os_match = sub_of_order_by_name.get(os_key)
                if not os_match:
                    os_match = get_or_create_drive_folder(drive_service, os_name, ord_id)
                    sub_of_order_by_name[os_key] = os_match

                folder_nodes.append({
                    "id": os_match['id'],
                    "gdrive_folder_id": os_match['id'],
                    "name": os_match['name'],
                    "parent_id": ord_id,
                    "project_gdrive_id": project_folder_id,
                    "type": "order_sub",
                    "sort_order": starter["sort"],
                    "webViewLink": os_match.get('webViewLink', '')
                })

    # Include any custom folders directly under Orders
    known_order_ids = {n['id'] for n in folder_nodes}
    for ex in existing_orders:
        if ex['id'] not in known_order_ids:
            folder_nodes.append({
                "id": ex['id'],
                "gdrive_folder_id": ex['id'],
                "name": ex['name'],
                "parent_id": orders_root_id,
                "project_gdrive_id": project_folder_id,
                "type": "order_folder",
                "sort_order": 30,
                "webViewLink": ex.get('webViewLink', '')
            })

    # Include any other custom folders directly under the Project
    known_all_ids = {n['id'] for n in folder_nodes}
    for custom_f in proj_children:
        if custom_f['id'] not in known_all_ids:
            folder_nodes.append({
                "id": custom_f['id'],
                "gdrive_folder_id": custom_f['id'],
                "name": custom_f['name'],
                "parent_id": project_folder_id,
                "project_gdrive_id": project_folder_id,
                "type": "custom",
                "sort_order": 99,
                "webViewLink": custom_f.get('webViewLink', '')
            })

    return folder_nodes


def get_master_drive_tree() -> List[Dict[str, Any]]:
    """
    Returns the complete directory tree starting from ROOT_DRIVE_FOLDER_ID.
    Fetches all folders with their parents in one optimized query.
    """
    drive_service = get_drive_service()
    query = "mimeType='application/vnd.google-apps.folder' and trashed=false"
    try:
        res = drive_service.files().list(
            q=query,
            fields="files(id, name, parents, webViewLink, createdTime)",
            pageSize=1000,
            supportsAllDrives=True,
            includeItemsFromAllDrives=True
        ).execute()
        all_folders = res.get('files', [])
        
        tree_nodes = []
        for f in all_folders:
            parents = f.get('parents', [])
            parent_id = parents[0] if parents else None
            is_root_child = parent_id == ROOT_DRIVE_FOLDER_ID
            
            tree_nodes.append({
                "id": f['id'],
                "gdrive_folder_id": f['id'],
                "name": f['name'],
                "parent_id": None if is_root_child else parent_id,
                "raw_parent_id": parent_id,
                "is_client_root": is_root_child,
                "webViewLink": f.get('webViewLink', '')
            })
        return tree_nodes
    except Exception as e:
        logger.error(f"Error fetching master drive tree: {e}")
        return []


def create_custom_folder(parent_folder_id: str, folder_name: str) -> Dict[str, Any]:
    """Creates a user-defined custom folder inside any existing Drive folder."""
    drive_service = get_drive_service()
    folder_metadata = {
        'name': folder_name.strip(),
        'mimeType': 'application/vnd.google-apps.folder',
        'parents': [parent_folder_id]
    }
    created = drive_service.files().create(
        body=folder_metadata,
        fields='id, name, webViewLink, parents',
        supportsAllDrives=True
    ).execute()
    return created


def rename_drive_item(item_id: str, new_name: str) -> Dict[str, Any]:
    """Renames any folder or file in Google Drive."""
    drive_service = get_drive_service()
    updated = drive_service.files().update(
        fileId=item_id,
        body={'name': new_name.strip()},
        fields='id, name, webViewLink',
        supportsAllDrives=True
    ).execute()
    return updated


def trash_drive_item(item_id: str) -> Dict[str, Any]:
    """Moves a file or folder to Google Drive Trash."""
    drive_service = get_drive_service()
    updated = drive_service.files().update(
        fileId=item_id,
        body={'trashed': True},
        fields='id, name, trashed',
        supportsAllDrives=True
    ).execute()
    return updated


def list_folder_files(folder_id: str) -> List[Dict[str, Any]]:
    """Lists all files (excluding subfolders) inside a Google Drive folder."""
    drive_service = get_drive_service()
    query = f"'{folder_id}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed=false"
    
    try:
        res = drive_service.files().list(
            q=query,
            fields="files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, thumbnailLink, iconLink)",
            orderBy="modifiedTime desc",
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
            pageSize=200
        ).execute()
        files = res.get('files', [])
        
        formatted = []
        for f in files:
            formatted.append({
                "id": f.get('id'),
                "name": f.get('name'),
                "mimeType": f.get('mimeType'),
                "sizeBytes": int(f.get('size', 0)) if f.get('size') else 0,
                "createdTime": f.get('createdTime'),
                "modifiedTime": f.get('modifiedTime'),
                "webViewLink": f.get('webViewLink'),
                "webContentLink": f.get('webContentLink'),
                "thumbnailLink": f.get('thumbnailLink'),
                "iconLink": f.get('iconLink')
            })
        return formatted
    except Exception as e:
        logger.error(f"Error listing files for folder {folder_id}: {e}")
        return []


def upload_file_to_drive(folder_id: str, file_bytes: bytes, filename: str, content_type: str) -> Dict[str, Any]:
    """Streams an uploaded file directly into Google Drive."""
    drive_service = get_drive_service()
    
    file_metadata = {
        'name': filename,
        'parents': [folder_id]
    }
    
    media = MediaIoBaseUpload(
        io.BytesIO(file_bytes),
        mimetype=content_type or 'application/octet-stream',
        resumable=True
    )
    
    created = drive_service.files().create(
        body=file_metadata,
        media_body=media,
        fields='id, name, mimeType, size, createdTime, webViewLink, webContentLink',
        supportsAllDrives=True
    ).execute()
    
    return {
        "id": created.get('id'),
        "name": created.get('name'),
        "mimeType": created.get('mimeType'),
        "sizeBytes": int(created.get('size', len(file_bytes))),
        "createdTime": created.get('createdTime'),
        "webViewLink": created.get('webViewLink'),
        "webContentLink": created.get('webContentLink')
    }
