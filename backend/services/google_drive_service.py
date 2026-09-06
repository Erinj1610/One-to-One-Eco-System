import os
import io
import re
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

# 7 Standard Foundational Starter Folders
DEFAULT_PROJECT_STARTER_FOLDERS = [
    {"sort": 1, "name": "01 - Design & Design Fees"},
    {"sort": 2, "name": "02 - CAD, Layouts & Drawings"},
    {"sort": 3, "name": "03 - Specifications & Cut Sheets"},
    {"sort": 4, "name": "04 - Orders, Quotes & BOQs"},
    {"sort": 5, "name": "05 - Logistics & Deliveries"},
    {"sort": 6, "name": "06 - Invoices & Financials"},
    {"sort": 7, "name": "07 - Site Photos & Snags"},
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


def get_or_create_drive_folder(drive_service, folder_name: str, parent_folder_id: Optional[str] = None) -> Dict[str, Any]:
    """Finds an existing folder by name under parent_folder_id or creates a new one in Shared Drive."""
    sanitized_name = folder_name.replace("'", "\\'")
    query = f"name='{sanitized_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    if parent_folder_id:
        query += f" and '{parent_folder_id}' in parents"

    try:
        res = drive_service.files().list(
            q=query,
            fields="files(id, name, webViewLink)",
            supportsAllDrives=True,
            includeItemsFromAllDrives=True
        ).execute()
        files = res.get('files', [])
        if files:
            return files[0]
    except Exception as e:
        logger.warning(f"Error searching for Drive folder '{folder_name}': {e}")

    # Create new folder if not found
    folder_metadata = {
        'name': folder_name,
        'mimeType': 'application/vnd.google-apps.folder'
    }
    if parent_folder_id:
        folder_metadata['parents'] = [parent_folder_id]

    try:
        created = drive_service.files().create(
            body=folder_metadata,
            fields='id, name, webViewLink',
            supportsAllDrives=True
        ).execute()
        return created
    except Exception as e:
        logger.error(f"Failed to create Drive folder '{folder_name}': {e}")
        raise


def ensure_project_drive_tree(client_name: str, project_name: str) -> List[Dict[str, Any]]:
    """
    Ensures Client folder, Project folder, and the 7 foundational starter folders
    exist under the Shared Drive root. Returns the full list of folders for the project.
    """
    clean_client = (client_name or "General Clients").strip()
    clean_project = (project_name or "General Project").strip()

    drive_service = get_drive_service()

    # 1. Ensure Client Folder
    client_folder = get_or_create_drive_folder(drive_service, clean_client, ROOT_DRIVE_FOLDER_ID)
    client_folder_id = client_folder['id']

    # 2. Ensure Project Folder
    project_folder = get_or_create_drive_folder(drive_service, clean_project, client_folder_id)
    project_folder_id = project_folder['id']

    # 3. Query existing subfolders under this Project folder
    query = f"'{project_folder_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
    try:
        existing_res = drive_service.files().list(
            q=query,
            fields="files(id, name, webViewLink)",
            supportsAllDrives=True,
            includeItemsFromAllDrives=True
        ).execute()
        existing_folders = existing_res.get('files', [])
    except Exception as e:
        logger.warning(f"Error listing project subfolders: {e}")
        existing_folders = []

    existing_by_name = {f['name'].lower().strip(): f for f in existing_folders}

    # 4. Create missing foundational starter folders
    folder_nodes = []
    for starter in DEFAULT_PROJECT_STARTER_FOLDERS:
        s_name = starter["name"]
        match_key = s_name.lower().strip()
        
        # Check if an equivalent folder already exists (e.g. "01 - Design & Design Fees" or "Design & Design Fees")
        matched = existing_by_name.get(match_key)
        if not matched:
            # Check without number prefix
            stripped_key = re.sub(r'^\d+\s*-\s*', '', match_key)
            for ex_name, ex_f in existing_by_name.items():
                if stripped_key in ex_name or ex_name in stripped_key:
                    matched = ex_f
                    break

        if not matched:
            matched = get_or_create_drive_folder(drive_service, s_name, project_folder_id)
            existing_by_name[match_key] = matched

        folder_nodes.append({
            "id": matched['id'],
            "gdrive_folder_id": matched['id'],
            "name": matched['name'],
            "parent_id": None, # Direct child of project root
            "project_gdrive_id": project_folder_id,
            "sort_order": starter["sort"],
            "webViewLink": matched.get('webViewLink', '')
        })

    # 5. Also include any custom folders created by the user under this project
    existing_ids = {n['id'] for n in folder_nodes}
    for custom_f in existing_folders:
        if custom_f['id'] not in existing_ids:
            folder_nodes.append({
                "id": custom_f['id'],
                "gdrive_folder_id": custom_f['id'],
                "name": custom_f['name'],
                "parent_id": None,
                "project_gdrive_id": project_folder_id,
                "sort_order": 99,
                "webViewLink": custom_f.get('webViewLink', '')
            })

    # 6. Also check for 1-level nested subfolders within these folders
    for parent_node in list(folder_nodes):
        try:
            sub_q = f"'{parent_node['id']}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
            sub_res = drive_service.files().list(
                q=sub_q,
                fields="files(id, name, webViewLink)",
                supportsAllDrives=True,
                includeItemsFromAllDrives=True
            ).execute()
            for sub_f in sub_res.get('files', []):
                folder_nodes.append({
                    "id": sub_f['id'],
                    "gdrive_folder_id": sub_f['id'],
                    "name": sub_f['name'],
                    "parent_id": parent_node['id'],
                    "project_gdrive_id": project_folder_id,
                    "sort_order": 50,
                    "webViewLink": sub_f.get('webViewLink', '')
                })
        except Exception as sub_err:
            logger.warning(f"Error fetching subfolders for {parent_node['name']}: {sub_err}")

    return folder_nodes


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
            includeItemsFromAllDrives=True
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
