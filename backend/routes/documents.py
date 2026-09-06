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
    ensure_client_folder,
    get_master_drive_tree,
    create_custom_folder,
    rename_drive_item,
    trash_drive_item,
    list_folder_files,
    upload_file_to_drive,
    get_drive_service,
    get_subfolders
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
            project_name = project.name
            client_name = project.client_name or "General Clients"

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


# --- 3. Get Folder Tree Scoped to a Client ---
@router.get("/client/{client_id}/folders")
def get_client_folders(client_id: str, db: Session = Depends(get_db)):
    """
    Returns Google Drive folders scoped to a Client.
    Auto-creates the client folder if missing and lists its project subfolders.
    """
    clean_id = (client_id or "").strip()
    if not clean_id:
        return []

    client = None
    if clean_id.isdigit():
        client = db.query(Client).filter(Client.id == int(clean_id)).first()
    if not client:
        client = db.query(Client).filter(func.lower(Client.name) == clean_id.lower()).first()

    client_name = client.name if client else clean_id

    try:
        client_f = ensure_client_folder(client_name)
        drive_service = get_drive_service()
        
        # Get immediate project subfolders
        proj_folders = get_subfolders(drive_service, client_f['id'])
        
        nodes = [
            {
                "id": client_f['id'],
                "gdrive_folder_id": client_f['id'],
                "name": client_f['name'],
                "parent_id": None,
                "type": "client_root",
                "sort_order": 0,
                "webViewLink": client_f.get('webViewLink', '')
            }
        ]
        
        for pf in proj_folders:
            nodes.append({
                "id": pf['id'],
                "gdrive_folder_id": pf['id'],
                "name": pf['name'],
                "parent_id": client_f['id'],
                "type": "project_folder",
                "sort_order": 1,
                "webViewLink": pf.get('webViewLink', '')
            })
            
            # Subfolders of each project
            sub_of_proj = get_subfolders(drive_service, pf['id'])
            for sf in sub_of_proj:
                nodes.append({
                    "id": sf['id'],
                    "gdrive_folder_id": sf['id'],
                    "name": sf['name'],
                    "parent_id": pf['id'],
                    "type": "project_sub",
                    "sort_order": 2,
                    "webViewLink": sf.get('webViewLink', '')
                })

        return nodes
    except Exception as e:
        logger.error(f"Error ensuring client folder tree for {clean_id}: {e}", exc_info=True)
        return []


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
        client_name = project.client_name or "General Clients"
        project_name = project.name
        
        # Fetch related design fees
        dfs = db.query(DesignFee).filter(
            or_(DesignFee.project_id == project.id, DesignFee.project_key == project.project_key)
        ).all()
        design_fee_list = [
            {"id": d.id, "fee_ref": d.fee_ref, "name": d.name}
            for d in dfs
        ]

        # Fetch related orders
        ords = db.query(Order).filter(
            or_(Order.project_id == project.id, Order.project_key == project.project_key)
        ).all()
        order_list = [
            {"id": o.id, "po_number": o.po_number, "supplier_name": o.supplier_name}
            for o in ords
        ]
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
            orders=order_list
        )

        # Update master_drive_folder if not set
        if project and not project.master_drive_folder and folders:
            first_project_gdrive_id = folders[0].get("project_gdrive_id")
            if first_project_gdrive_id:
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
