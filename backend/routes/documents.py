import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.cloud_sql import get_db
from models.orm_models import Project
from services.google_drive_service import (
    ensure_project_drive_tree,
    create_custom_folder,
    rename_drive_item,
    trash_drive_item,
    list_folder_files,
    upload_file_to_drive,
    get_drive_service
)

logger = logging.getLogger(__name__)

router = APIRouter()


class CreateFolderRequest(BaseModel):
    parent_folder_id: str
    name: str


class RenameFolderRequest(BaseModel):
    name: str


# --- 1. Get Folder Tree for a Project ---
@router.get("/{project_id}/folders")
def get_project_folders(project_id: str, db: Session = Depends(get_db)):
    """
    Returns the Google Drive folder tree for a project.
    Resolves project by integer ID, project_key, or name.
    Ensures standard starter folders exist in Google Drive.
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
    else:
        # Graceful fallback: never crash!
        client_name = "General Clients"
        project_name = clean_id.replace('-', ' ').replace('_', ' ').title()

    try:
        folders = ensure_project_drive_tree(client_name, project_name)

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
        # Return empty list instead of 500/404 so frontend never crashes
        return []


# --- 2. List Files Inside a Google Drive Folder ---
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


# --- 3. Upload File Directly into a Google Drive Folder ---
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


# --- 4. Create Custom User Folder ---
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
            "sort_order": 99,
            "webViewLink": created.get("webViewLink", "")
        }
    except Exception as e:
        logger.error(f"Failed to create folder: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create folder: {str(e)}")


# --- 5. Rename Folder ---
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


# --- 6. Trash Folder ---
@router.delete("/folders/{folder_id}")
def trash_folder(folder_id: str):
    """Moves a folder to Google Drive trash."""
    try:
        trashed = trash_drive_item(folder_id)
        return {"message": "Folder moved to trash successfully", "folder": trashed}
    except Exception as e:
        logger.error(f"Failed to trash folder: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to trash folder: {str(e)}")


# --- 7. Trash File ---
@router.delete("/files/{gdrive_file_id}")
def trash_file(gdrive_file_id: str):
    """Moves a file to Google Drive trash."""
    try:
        trashed = trash_drive_item(gdrive_file_id)
        return {"message": "File moved to trash successfully", "file": trashed}
    except Exception as e:
        logger.error(f"Failed to trash file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to trash file: {str(e)}")


# --- 8. Stream File for In-Portal PDF Preview ---
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
