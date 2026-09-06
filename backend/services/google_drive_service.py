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

# 2-Tier Master Hierarchy Root Folder Names
PROJECTS_ROOT_NAME = "01 - PROJECTS"
CLIENTS_ROOT_NAME = "02 - CLIENTS"

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


def get_subfolders(drive_service, parent_id: str, include_shortcuts: bool = True) -> List[Dict[str, Any]]:
    """Returns all immediate subfolders (and optional shortcuts) under a parent folder."""
    clean_parent_id = parent_id.strip()
    try:
        f_meta = drive_service.files().get(
            fileId=clean_parent_id,
            fields='id, mimeType, shortcutDetails',
            supportsAllDrives=True
        ).execute()
        if f_meta.get('mimeType') == 'application/vnd.google-apps.shortcut':
            target_id = f_meta.get('shortcutDetails', {}).get('targetId')
            if target_id:
                clean_parent_id = target_id
    except Exception:
        pass

    if include_shortcuts:
        query = f"'{clean_parent_id}' in parents and (mimeType='application/vnd.google-apps.folder' or mimeType='application/vnd.google-apps.shortcut') and trashed=false"
    else:
        query = f"'{clean_parent_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"

    try:
        all_files = []
        page_token = None
        while True:
            params = {
                "q": query,
                "corpora": "drive",
                "driveId": ROOT_DRIVE_FOLDER_ID,
                "fields": "nextPageToken, files(id, name, mimeType, shortcutDetails, webViewLink, parents)",
                "supportsAllDrives": True,
                "includeItemsFromAllDrives": True,
                "pageSize": 200
            }
            if page_token:
                params["pageToken"] = page_token
            res = drive_service.files().list(**params).execute()
            all_files.extend(res.get('files', []))
            page_token = res.get('nextPageToken')
            if not page_token:
                break
        return all_files
    except Exception as e:
        logger.warning(f"Error listing subfolders under {clean_parent_id}: {e}")
        return []


def get_subfolders_batch(
    drive_service, 
    parent_ids: List[str], 
    include_shortcuts: bool = True
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Fetches immediate subfolders for MULTIPLE parent IDs in a single batched Drive API query.
    Returns a mapping of { parent_id: [child_folder_dict, ...] }.
    Reduces 20+ sequential API calls down to 1 call.
    """
    clean_ids = list({pid.strip() for pid in parent_ids if pid and pid.strip()})
    if not clean_ids:
        return {}

    result_by_parent: Dict[str, List[Dict[str, Any]]] = {pid: [] for pid in clean_ids}
    chunk_size = 25

    for i in range(0, len(clean_ids), chunk_size):
        chunk = clean_ids[i:i + chunk_size]
        parents_clause = " or ".join([f"'{pid}' in parents" for pid in chunk])
        if include_shortcuts:
            query = f"({parents_clause}) and (mimeType='application/vnd.google-apps.folder' or mimeType='application/vnd.google-apps.shortcut') and trashed=false"
        else:
            query = f"({parents_clause}) and mimeType='application/vnd.google-apps.folder' and trashed=false"

        try:
            page_token = None
            while True:
                params = {
                    "q": query,
                    "corpora": "drive",
                    "driveId": ROOT_DRIVE_FOLDER_ID,
                    "supportsAllDrives": True,
                    "includeItemsFromAllDrives": True,
                    "fields": "nextPageToken, files(id, name, mimeType, shortcutDetails, webViewLink, parents)",
                    "pageSize": 500
                }
                if page_token:
                    params["pageToken"] = page_token
                res = drive_service.files().list(**params).execute()
                files = res.get('files', [])
                for f in files:
                    for p in f.get('parents', []):
                        if p in result_by_parent:
                            result_by_parent[p].append(f)
                page_token = res.get('nextPageToken')
                if not page_token:
                    break
        except Exception as e:
            logger.warning(f"Batch subfolder query error: {e}")
            for pid in chunk:
                result_by_parent[pid] = get_subfolders(drive_service, pid, include_shortcuts=include_shortcuts)

    return result_by_parent


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
            corpora='drive',
            driveId=ROOT_DRIVE_FOLDER_ID,
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
        existing_subfolders = get_subfolders(drive_service, parent_folder_id, include_shortcuts=False)
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
            # Significant substring match
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


def get_or_create_root_containers(drive_service) -> tuple[Dict[str, Any], Dict[str, Any]]:
    """Ensures '01 - PROJECTS' and '02 - CLIENTS' exist directly under ROOT_DRIVE_FOLDER_ID."""
    projects_root = get_or_create_drive_folder(
        drive_service,
        PROJECTS_ROOT_NAME,
        ROOT_DRIVE_FOLDER_ID,
        fuzzy_threshold=0.95
    )
    clients_root = get_or_create_drive_folder(
        drive_service,
        CLIENTS_ROOT_NAME,
        ROOT_DRIVE_FOLDER_ID,
        fuzzy_threshold=0.95
    )
    return projects_root, clients_root


def create_drive_shortcut(
    drive_service,
    shortcut_name: str,
    target_folder_id: str,
    parent_folder_id: str
) -> Dict[str, Any]:
    """
    Creates a Google Drive shortcut under parent_folder_id pointing to target_folder_id.
    If a shortcut pointing to target_folder_id or with the same name already exists in parent_folder_id, returns it.
    """
    clean_name = shortcut_name.strip()
    sanitized_name = clean_name.replace("'", "\\'")

    try:
        query = f"'{parent_folder_id}' in parents and trashed=false and (name='{sanitized_name}' or mimeType='application/vnd.google-apps.shortcut')"
        res = drive_service.files().list(
            q=query,
            corpora='drive',
            driveId=ROOT_DRIVE_FOLDER_ID,
            fields="files(id, name, mimeType, shortcutDetails, webViewLink, parents)",
            supportsAllDrives=True,
            includeItemsFromAllDrives=True
        ).execute()
        existing = res.get('files', [])
        for ex in existing:
            if ex.get('mimeType') == 'application/vnd.google-apps.shortcut':
                target = ex.get('shortcutDetails', {}).get('targetId')
                if target == target_folder_id:
                    logger.info(f"Shortcut '{clean_name}' -> {target_folder_id} already exists ({ex.get('id')})")
                    return ex
            if ex.get('name', '').lower() == clean_name.lower():
                logger.info(f"Item '{clean_name}' already exists in parent {parent_folder_id}")
                return ex
    except Exception as e:
        logger.warning(f"Error querying existing shortcuts under {parent_folder_id}: {e}")

    shortcut_metadata = {
        'name': clean_name,
        'mimeType': 'application/vnd.google-apps.shortcut',
        'shortcutDetails': {
            'targetId': target_folder_id
        },
        'parents': [parent_folder_id]
    }
    try:
        created = drive_service.files().create(
            body=shortcut_metadata,
            fields='id, name, mimeType, shortcutDetails, webViewLink, parents',
            supportsAllDrives=True
        ).execute()
        logger.info(f"Created Google Drive shortcut '{clean_name}' -> {target_folder_id} in {parent_folder_id}")
        return created
    except Exception as e:
        logger.error(f"Failed to create shortcut '{clean_name}': {e}")
        return {}


def move_drive_item(drive_service, file_id: str, new_parent_id: str) -> Dict[str, Any]:
    """Moves a file or folder to a new parent folder in Google Drive."""
    try:
        file = drive_service.files().get(
            fileId=file_id,
            fields='id, name, parents',
            supportsAllDrives=True
        ).execute()

        current_parents = file.get('parents', [])
        if new_parent_id in current_parents and len(current_parents) == 1:
            logger.info(f"Item {file_id} already in parent {new_parent_id}")
            return file

        previous_parents = ",".join(current_parents)
        updated = drive_service.files().update(
            fileId=file_id,
            addParents=new_parent_id,
            removeParents=previous_parents,
            fields='id, name, parents, webViewLink',
            supportsAllDrives=True
        ).execute()
        logger.info(f"Moved item '{file.get('name')}' ({file_id}) from [{previous_parents}] to {new_parent_id}")
        return updated
    except Exception as e:
        logger.error(f"Failed to move item {file_id} to parent {new_parent_id}: {e}")
        raise


def ensure_client_folder(client_name: str) -> Dict[str, Any]:
    """Ensures a Client folder exists under '02 - CLIENTS' in the Shared Drive."""
    drive_service = get_drive_service()
    clean_client = (client_name or "General Clients").strip()
    _, clients_root = get_or_create_root_containers(drive_service)
    return get_or_create_drive_folder(drive_service, clean_client, clients_root['id'])


def ensure_order_drive_tree(
    client_name: str, 
    project_name: str, 
    order_identifier: str, 
    supplier_name: str = ""
) -> List[Dict[str, Any]]:
    """
    Ensures the path down to a specific Order:
    01 - PROJECTS -> [Project] -> Orders -> [Order Ref / PO]
    Plus ensures the 4 standard order subfolders (BOQs, POs, Logistics, Invoices).
    Also ensures client folder in 02 - CLIENTS has a shortcut pointing to this project.
    Returns all folder nodes scoped to this order.
    """
    drive_service = get_drive_service()
    projects_root, clients_root = get_or_create_root_containers(drive_service)
    
    clean_client = (client_name or "General Clients").strip()
    clean_project = (project_name or "General Project").strip()
    
    supplier_part = f" - {supplier_name.strip()}" if supplier_name and supplier_name.strip() else ""
    order_folder_name = f"{order_identifier.strip()}{supplier_part}"

    # 1. Ensure Project in 01 - PROJECTS & Orders parent folder
    project_folder = get_or_create_drive_folder(drive_service, clean_project, projects_root['id'])
    project_folder_id = project_folder['id']
    orders_root = get_or_create_drive_folder(drive_service, "Orders", project_folder_id)
    
    # 2. Ensure shortcut in 02 - CLIENTS / [Client]
    if clean_client and clean_client.lower() != "general clients":
        try:
            client_folder = get_or_create_drive_folder(drive_service, clean_client, clients_root['id'])
            create_drive_shortcut(drive_service, clean_project, project_folder_id, client_folder['id'])
        except Exception as e:
            logger.warning(f"Could not create client shortcut for order {order_identifier}: {e}")

    # 3. Ensure Order Folder
    order_folder = get_or_create_drive_folder(drive_service, order_folder_name, orders_root['id'])
    order_folder_id = order_folder['id']

    # 4. Query existing subfolders in this Order
    existing = get_subfolders(drive_service, order_folder_id, include_shortcuts=False)
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

    # 5. Ensure 4 standard order subfolders
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

    # 6. Include any custom folders created inside the order
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
    01 - PROJECTS -> [Project] -> Designs -> [Fee Ref - Design Name]
    Plus ensures the 5 standard design subfolders (Drawings, Specs, Site Photos, Proposals, Moodboards).
    Also ensures client folder in 02 - CLIENTS has a shortcut pointing to this project.
    Returns all folder nodes scoped to this design package.
    """
    drive_service = get_drive_service()
    projects_root, clients_root = get_or_create_root_containers(drive_service)

    clean_client = (client_name or "General Clients").strip()
    clean_project = (project_name or "General Project").strip()
    
    name_part = f" - {design_name.strip()}" if design_name and design_name.strip() else ""
    design_folder_name = f"{fee_ref.strip()}{name_part}"

    # 1. Ensure Project in 01 - PROJECTS & Designs parent folder
    project_folder = get_or_create_drive_folder(drive_service, clean_project, projects_root['id'])
    project_folder_id = project_folder['id']
    designs_root = get_or_create_drive_folder(drive_service, "Designs", project_folder_id)
    
    # 2. Ensure shortcut in 02 - CLIENTS / [Client]
    if clean_client and clean_client.lower() != "general clients":
        try:
            client_folder = get_or_create_drive_folder(drive_service, clean_client, clients_root['id'])
            create_drive_shortcut(drive_service, clean_project, project_folder_id, client_folder['id'])
        except Exception as e:
            logger.warning(f"Could not create client shortcut for design {fee_ref}: {e}")

    # 3. Ensure Design Folder
    design_folder = get_or_create_drive_folder(drive_service, design_folder_name, designs_root['id'])
    design_folder_id = design_folder['id']

    # 4. Query existing subfolders in this Design
    existing = get_subfolders(drive_service, design_folder_id, include_shortcuts=False)
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

    # 5. Ensure 5 standard design subfolders (Drawings, Specs, Site Photos, Proposals, Moodboards)
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

    # 6. Include any custom folders created inside the design
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
    Ensures:
    1. Project folder in '01 - PROJECTS'.
    2. Native Drive shortcut in '02 - CLIENTS / [client_name]' pointing to the project.
    3. Standard project subfolders (01 - Drawings, 02 - Specs, 03 - Site Photos).
    4. Designs folder with active design packages (and 5 standard subfolders each).
    5. Orders folder with active orders (and 4 standard subfolders each).
    Correctly establishes parent_id relationships so it renders properly in both
    Project-scoped view (where project node has parent_id=None) and
    Client-scoped view (where project node has parent_id=client_folder_id).
    """
    drive_service = get_drive_service()
    projects_root, clients_root = get_or_create_root_containers(drive_service)

    clean_client = (client_name or "General Clients").strip()
    clean_project = (project_name or "General Project").strip()

    # 1. Project lives in 01 - PROJECTS
    project_folder = get_or_create_drive_folder(drive_service, clean_project, projects_root['id'])
    project_folder_id = project_folder['id']

    # 2. Client shortcut in 02 - CLIENTS
    if clean_client and clean_client.lower() != "general clients":
        if not client_folder_id:
            client_folder = get_or_create_drive_folder(drive_service, clean_client, clients_root['id'])
            client_folder_id = client_folder['id']
        create_drive_shortcut(drive_service, clean_project, project_folder_id, client_folder_id)

    # 3. Existing immediate children of Project
    proj_children = get_subfolders(drive_service, project_folder_id, include_shortcuts=False)
    proj_children_by_name = {f['name'].lower().strip(): f for f in proj_children}

    # 4. Initialize nodes with Project Folder itself
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

    # 5. Standard Project-Level Folders (Drawings, Specs, Photos)
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

    # 6. Ensure "Designs" Parent Folder
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
    existing_designs = get_subfolders(drive_service, designs_root_id, include_shortcuts=False)
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

            # Ensure 5 standard subfolders inside each design package
            sub_of_df = get_subfolders(drive_service, df_id, include_shortcuts=False)
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

    # Include custom folders directly under Designs
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

    # 7. Ensure "Orders" Parent Folder
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
    existing_orders = get_subfolders(drive_service, orders_root_id, include_shortcuts=False)
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

            # Ensure 4 standard subfolders under each order
            sub_of_order = get_subfolders(drive_service, ord_id, include_shortcuts=False)
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

    # Include custom folders directly under Orders
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
    Includes folders and native Drive shortcuts with target resolution.
    Root containers '01 - PROJECTS' and '02 - CLIENTS' appear as top-level roots.
    """
    drive_service = get_drive_service()
    query = "(mimeType='application/vnd.google-apps.folder' or mimeType='application/vnd.google-apps.shortcut') and trashed=false"
    try:
        all_items = []
        page_token = None
        while True:
            params = {
                "q": query,
                "corpora": "drive",
                "driveId": ROOT_DRIVE_FOLDER_ID,
                "fields": "nextPageToken, files(id, name, mimeType, parents, shortcutDetails, webViewLink, createdTime)",
                "pageSize": 1000,
                "supportsAllDrives": True,
                "includeItemsFromAllDrives": True
            }
            if page_token:
                params["pageToken"] = page_token
            res = drive_service.files().list(**params).execute()
            all_items.extend(res.get('files', []))
            page_token = res.get('nextPageToken')
            if not page_token:
                break
        
        tree_nodes = []
        for f in all_items:
            parents = f.get('parents', [])
            parent_id = parents[0] if parents else None
            is_root_child = parent_id == ROOT_DRIVE_FOLDER_ID
            is_shortcut = f.get('mimeType') == 'application/vnd.google-apps.shortcut'
            target_id = f.get('shortcutDetails', {}).get('targetId') if is_shortcut else None
            
            tree_nodes.append({
                "id": f['id'],
                "gdrive_folder_id": target_id or f['id'],
                "real_item_id": f['id'],
                "name": f['name'],
                "parent_id": None if is_root_child else parent_id,
                "raw_parent_id": parent_id,
                "is_client_root": is_root_child,
                "is_shortcut": is_shortcut,
                "target_id": target_id,
                "webViewLink": f.get('webViewLink', '')
            })
        return tree_nodes
    except Exception as e:
        logger.error(f"Error fetching master drive tree: {e}")
        return []


def migrate_drive_to_2_tier(db: Optional[Any] = None) -> Dict[str, Any]:
    """
    Executes the 2-Tier Master Hierarchy migration on Google Drive:
    1. Ensures '01 - PROJECTS' and '02 - CLIENTS' at Shared Drive Root.
    2. Identifies and cleans up existing folders:
       - Moves project folders (Reyburn, Cooper, Spike Lights Project, Montjane, Swanepoel) to '01 - PROJECTS'.
       - Resolves nested duplicate: renames nested Wynand (Project 1638) to 'Spike Lights Project', moves to '01 - PROJECTS'.
       - Moves client folders (Wynand Wilsenach Architects, etc.) to '02 - CLIENTS'.
       - Creates native Drive shortcuts in '02 - CLIENTS / [Client]' pointing to each respective project.
    3. Updates Cloud SQL database Project.master_drive_folder pointers.
    Returns detailed migration summary report.
    """
    drive_service = get_drive_service()
    projects_root, clients_root = get_or_create_root_containers(drive_service)
    projects_root_id = projects_root['id']
    clients_root_id = clients_root['id']

    report: Dict[str, Any] = {
        "status": "success",
        "projects_root_id": projects_root_id,
        "clients_root_id": clients_root_id,
        "moved_projects": [],
        "moved_clients": [],
        "renamed": [],
        "shortcuts_created": [],
        "db_updates": [],
        "errors": []
    }

    try:
        # 1. Fetch immediate items under ROOT_DRIVE_FOLDER_ID
        res = drive_service.files().list(
            q=f"'{ROOT_DRIVE_FOLDER_ID}' in parents and trashed=false",
            corpora='drive',
            driveId=ROOT_DRIVE_FOLDER_ID,
            fields="files(id, name, mimeType, parents, webViewLink)",
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
            pageSize=100
        ).execute()
        root_items = res.get('files', [])

        for item in root_items:
            item_id = item['id']
            item_name = item['name'].strip()
            mime_type = item.get('mimeType')

            # Skip root containers and non-folder items (e.g. root spreadsheets)
            if item_id in (projects_root_id, clients_root_id):
                continue
            if mime_type != 'application/vnd.google-apps.folder':
                continue
            if item_name.lower() in [PROJECTS_ROOT_NAME.lower(), CLIENTS_ROOT_NAME.lower()]:
                continue

            item_norm = normalize_name(item_name)

            # A. Wynand Client Folder (handle nested projects inside it)
            if item_norm in ["wynandwilsenacharchitects", "wynandwilsenachtarchitects"]:
                client_folder_id = item_id
                logger.info(f"Processing client folder '{item_name}' ({client_folder_id})")

                # Inspect subfolders inside Wynand
                wynand_subs = get_subfolders(drive_service, client_folder_id, include_shortcuts=False)
                for sub in wynand_subs:
                    sub_id = sub['id']
                    sub_name = sub['name'].strip()
                    sub_norm = normalize_name(sub_name)

                    # Nested duplicate Wynand (Project 1638) -> rename to Spike Lights Project and move to 01 - PROJECTS
                    if sub_norm in ["wynandwilsenacharchitects", "wynandwilsenachtarchitects"]:
                        try:
                            rename_drive_item(sub_id, "Spike Lights Project")
                            report["renamed"].append(f"Renamed nested folder {sub_id} from '{sub_name}' to 'Spike Lights Project'")
                            move_drive_item(drive_service, sub_id, projects_root_id)
                            report["moved_projects"].append(f"Spike Lights Project ({sub_id}) moved to {PROJECTS_ROOT_NAME}")
                            create_drive_shortcut(drive_service, "Spike Lights Project", sub_id, client_folder_id)
                            report["shortcuts_created"].append(f"Shortcut 'Spike Lights Project' -> {sub_id} in {item_name}")
                        except Exception as e:
                            report["errors"].append(f"Error migrating nested duplicate {sub_id}: {e}")

                    # Reyburn, Cooper or other projects inside Wynand
                    else:
                        try:
                            move_drive_item(drive_service, sub_id, projects_root_id)
                            report["moved_projects"].append(f"{sub_name} ({sub_id}) moved to {PROJECTS_ROOT_NAME}")
                            create_drive_shortcut(drive_service, sub_name, sub_id, client_folder_id)
                            report["shortcuts_created"].append(f"Shortcut '{sub_name}' -> {sub_id} in {item_name}")
                        except Exception as e:
                            report["errors"].append(f"Error moving project {sub_id} ({sub_name}): {e}")

                # Move client folder into 02 - CLIENTS
                try:
                    move_drive_item(drive_service, client_folder_id, clients_root_id)
                    report["moved_clients"].append(f"{item_name} ({client_folder_id}) moved to {CLIENTS_ROOT_NAME}")
                except Exception as e:
                    report["errors"].append(f"Error moving client folder {client_folder_id}: {e}")

            # B. Other Root Folders (Montjane, Swanepoel, General Clients, etc.)
            else:
                # Determine if project or client
                known_project_names = ["montjane", "swanepoel", "reyburn", "cooper", "spikelightsproject"]
                is_known_project = item_norm in known_project_names

                if is_known_project:
                    try:
                        move_drive_item(drive_service, item_id, projects_root_id)
                        report["moved_projects"].append(f"{item_name} ({item_id}) moved to {PROJECTS_ROOT_NAME}")
                    except Exception as e:
                        report["errors"].append(f"Error moving project {item_name} ({item_id}): {e}")
                elif "client" in item_norm or item_norm in ["generalclients"]:
                    try:
                        move_drive_item(drive_service, item_id, clients_root_id)
                        report["moved_clients"].append(f"{item_name} ({item_id}) moved to {CLIENTS_ROOT_NAME}")
                    except Exception as e:
                        report["errors"].append(f"Error moving client folder {item_name} ({item_id}): {e}")
                else:
                    # Default heuristic: check if it has 'Orders' or 'Designs' subfolder -> it's a project!
                    subs = get_subfolders(drive_service, item_id, include_shortcuts=False)
                    has_proj_sub = any(s['name'].lower() in ["orders", "designs", "01 - drawings & cad"] for s in subs)
                    if has_proj_sub:
                        try:
                            move_drive_item(drive_service, item_id, projects_root_id)
                            report["moved_projects"].append(f"{item_name} ({item_id}) moved to {PROJECTS_ROOT_NAME}")
                        except Exception as e:
                            report["errors"].append(f"Error moving project {item_name} ({item_id}): {e}")
                    else:
                        try:
                            move_drive_item(drive_service, item_id, clients_root_id)
                            report["moved_clients"].append(f"{item_name} ({item_id}) moved to {CLIENTS_ROOT_NAME}")
                        except Exception as e:
                            report["errors"].append(f"Error moving folder {item_name} ({item_id}): {e}")

        # 1b. Inspect all client folders inside '02 - CLIENTS' to ensure nested physical projects are moved to '01 - PROJECTS'
        client_folders_in_clients_root = get_subfolders(drive_service, clients_root_id, include_shortcuts=False)
        for cf in client_folders_in_clients_root:
            cf_id = cf['id']
            cf_name = cf['name'].strip()
            
            # Fetch physical subfolders inside this client folder (ignoring shortcuts)
            cf_subs = get_subfolders(drive_service, cf_id, include_shortcuts=False)
            for sub in cf_subs:
                sub_id = sub['id']
                sub_name = sub['name'].strip()
                sub_norm = normalize_name(sub_name)

                # Skip root containers if somehow nested
                if sub_id in (projects_root_id, clients_root_id):
                    continue

                # Nested duplicate Wynand (Project 1638) -> rename to Spike Lights Project and move to 01 - PROJECTS
                if sub_norm in ["wynandwilsenacharchitects", "wynandwilsenachtarchitects"]:
                    try:
                        rename_drive_item(sub_id, "Spike Lights Project")
                        report["renamed"].append(f"Renamed nested folder {sub_id} from '{sub_name}' to 'Spike Lights Project'")
                        move_drive_item(drive_service, sub_id, projects_root_id)
                        report["moved_projects"].append(f"Spike Lights Project ({sub_id}) moved to {PROJECTS_ROOT_NAME}")
                        create_drive_shortcut(drive_service, "Spike Lights Project", sub_id, cf_id)
                        report["shortcuts_created"].append(f"Shortcut 'Spike Lights Project' -> {sub_id} in {cf_name}")
                    except Exception as e:
                        report["errors"].append(f"Error migrating nested duplicate {sub_id}: {e}")
                else:
                    # Move physical project folder to 01 - PROJECTS
                    try:
                        move_drive_item(drive_service, sub_id, projects_root_id)
                        report["moved_projects"].append(f"{sub_name} ({sub_id}) moved to {PROJECTS_ROOT_NAME}")
                        create_drive_shortcut(drive_service, sub_name, sub_id, cf_id)
                        report["shortcuts_created"].append(f"Shortcut '{sub_name}' -> {sub_id} in {cf_name}")
                    except Exception as e:
                        report["errors"].append(f"Error moving project {sub_id} ({sub_name}) to {PROJECTS_ROOT_NAME}: {e}")

        # 2. Sync Cloud SQL Database pointers
        close_session = False
        db_sess = db
        if db_sess is None:
            try:
                from database.cloud_sql import SessionLocal
                db_sess = SessionLocal()
                close_session = True
            except Exception as e:
                logger.warning(f"Could not initialize DB session for Drive sync: {e}")

        if db_sess is not None:
            try:
                from models.orm_models import Project
                
                # Fetch all current folders in 01 - PROJECTS
                proj_folders = get_subfolders(drive_service, projects_root_id, include_shortcuts=False)
                proj_folders_by_norm = {normalize_name(pf['name']): pf for pf in proj_folders}

                all_db_projects = db_sess.query(Project).all()
                for p in all_db_projects:
                    # Check if project is 1638 (previously named Wynand Wilsenacht Architects)
                    if p.id == 1638:
                        if normalize_name(p.name) in ["wynandwilsenacharchitects", "wynandwilsenachtarchitects"]:
                            p.name = "Spike Lights Project"
                            report["db_updates"].append("Updated Project 1638 name to 'Spike Lights Project'")
                        spike_pf = proj_folders_by_norm.get("spikelightsproject")
                        if spike_pf:
                            p.master_drive_folder = spike_pf['id']
                            report["db_updates"].append(f"Linked Project 1638 master_drive_folder -> {spike_pf['id']}")
                        continue

                    # Match by normalized name
                    p_norm = normalize_name(p.name)
                    matched_pf = proj_folders_by_norm.get(p_norm)
                    if not matched_pf:
                        # Substring match
                        for k, v in proj_folders_by_norm.items():
                            if (len(p_norm) >= 4 and p_norm in k) or (len(k) >= 4 and k in p_norm):
                                matched_pf = v
                                break
                    
                    if matched_pf and p.master_drive_folder != matched_pf['id']:
                        p.master_drive_folder = matched_pf['id']
                        report["db_updates"].append(f"Linked Project {p.id} ('{p.name}') master_drive_folder -> {matched_pf['id']}")

                # Also ensure shortcuts exist for all clients whose projects are in 01 - PROJECTS
                client_folders = get_subfolders(drive_service, clients_root_id, include_shortcuts=False)
                client_folders_by_norm = {normalize_name(cf['name']): cf for cf in client_folders}

                for p in all_db_projects:
                    if p.client_name and p.master_drive_folder:
                        c_norm = normalize_name(p.client_name)
                        matched_cf = client_folders_by_norm.get(c_norm)
                        if matched_cf:
                            create_drive_shortcut(drive_service, p.name, p.master_drive_folder, matched_cf['id'])

                db_sess.commit()
                report["db_sync_status"] = "completed"
            except Exception as e:
                if db_sess:
                    db_sess.rollback()
                logger.error(f"Error syncing Cloud SQL database during migration: {e}")
                report["errors"].append(f"DB sync error: {e}")
            finally:
                if close_session and db_sess:
                    db_sess.close()

    except Exception as e:
        logger.error(f"Failed to migrate Drive to 2-tier: {e}", exc_info=True)
        report["status"] = "failed"
        report["error"] = str(e)

    return report


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
    """Lists all files (excluding subfolders and shortcuts) inside a Google Drive folder."""
    drive_service = get_drive_service()
    clean_folder_id = folder_id.strip()

    # If folder_id is a shortcut, resolve to its actual target folder ID
    try:
        f_meta = drive_service.files().get(
            fileId=clean_folder_id,
            fields='id, mimeType, shortcutDetails',
            supportsAllDrives=True
        ).execute()
        if f_meta.get('mimeType') == 'application/vnd.google-apps.shortcut':
            target_id = f_meta.get('shortcutDetails', {}).get('targetId')
            if target_id:
                clean_folder_id = target_id
    except Exception:
        pass

    query = f"'{clean_folder_id}' in parents and mimeType != 'application/vnd.google-apps.folder' and mimeType != 'application/vnd.google-apps.shortcut' and trashed=false"
    
    try:
        res = drive_service.files().list(
            q=query,
            corpora='drive',
            driveId=ROOT_DRIVE_FOLDER_ID,
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
        logger.error(f"Error listing files for folder {clean_folder_id}: {e}")
        return []


def upload_file_to_drive(folder_id: str, file_bytes: bytes, filename: str, content_type: str) -> Dict[str, Any]:
    """Streams an uploaded file directly into Google Drive, resolving shortcuts if necessary."""
    drive_service = get_drive_service()
    clean_folder_id = folder_id.strip()

    # If target is a shortcut, resolve to targetId
    try:
        f_meta = drive_service.files().get(
            fileId=clean_folder_id,
            fields='id, mimeType, shortcutDetails',
            supportsAllDrives=True
        ).execute()
        if f_meta.get('mimeType') == 'application/vnd.google-apps.shortcut':
            target_id = f_meta.get('shortcutDetails', {}).get('targetId')
            if target_id:
                clean_folder_id = target_id
    except Exception:
        pass
    
    file_metadata = {
        'name': filename,
        'parents': [clean_folder_id]
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
