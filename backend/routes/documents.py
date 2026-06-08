import os
import json
import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database.cloud_sql import get_db
from models.orm_models import ProjectFolder, Project

router = APIRouter()

# Path to persist mocked Google Drive files
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOCK_DRIVE_PATH = os.path.join(BASE_DIR, "database", "mock_drive.json")

def load_mock_drive():
    if not os.path.exists(MOCK_DRIVE_PATH):
        # Seed initial mock files
        initial_files = [
            {
                "id": "mock-file-1",
                "name": "Concept Sketch Layout.pdf",
                "mimeType": "application/pdf",
                "sizeBytes": 4200000,
                "createdTime": "2026-05-15T14:30:00Z",
                "webViewLink": "https://docs.google.com/viewer?url=mock-concept-sketch",
                "parents": ["gdrive-fld-design-1"],
                "trashed": False
            },
            {
                "id": "mock-file-2",
                "name": "Supplier Invoice ELDC.pdf",
                "mimeType": "application/pdf",
                "sizeBytes": 1250000,
                "createdTime": "2026-05-20T10:15:00Z",
                "webViewLink": "https://docs.google.com/viewer?url=mock-supplier-invoice",
                "parents": ["gdrive-fld-supply-1"],
                "trashed": False
            },
            {
                "id": "mock-file-3",
                "name": "Lighting Spec sheet.xlsx",
                "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "sizeBytes": 850000,
                "createdTime": "2026-05-22T16:45:00Z",
                "webViewLink": "https://docs.google.com/viewer?url=mock-spec-sheet",
                "parents": ["gdrive-fld-design-1"],
                "trashed": False
            }
        ]
        save_mock_drive(initial_files)
        return initial_files
    try:
        with open(MOCK_DRIVE_PATH, "r") as f:
            return json.load(f)
    except Exception:
        return []

def save_mock_drive(data):
    os.makedirs(os.path.dirname(MOCK_DRIVE_PATH), exist_ok=True)
    with open(MOCK_DRIVE_PATH, "w") as f:
        json.dump(data, f, indent=2)

# --- 1. Get Folder Tree for a Project ---
@router.get("/{project_id}/folders")
def get_project_folders(project_id: str, db: Session = Depends(get_db)):
    key_map = {
        "upper": 1,
        "villa": 2,
        "tambor": 3,
        "singita": 4
    }
    try:
        resolved_id = int(project_id)
    except ValueError:
        resolved_id = key_map.get(project_id.lower(), 1)

    # Verify project exists
    project = db.query(Project).filter(Project.id == resolved_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    folders = db.query(ProjectFolder).filter(ProjectFolder.project_id == resolved_id).order_by(ProjectFolder.sort_order).all()
    
    # Return flat list, frontend will build the nested tree
    return [
        {
            "id": f.id,
            "project_id": f.project_id,
            "gdrive_folder_id": f.gdrive_folder_id,
            "parent_id": f.parent_id,
            "sort_order": f.sort_order,
            "name": f.name
        }
        for f in folders
    ]

# --- 2. Lazy load files inside a Google Drive Folder ---
@router.get("/folders/{gdrive_folder_id}/files")
def get_folder_files(gdrive_folder_id: str):
    # Here we mock files list from Google Drive
    all_files = load_mock_drive()
    # Filter files that belong to this folder and are not trashed
    folder_files = [
        f for f in all_files 
        if gdrive_folder_id in f.get("parents", []) and not f.get("trashed", False)
    ]
    
    # If no files exist in this folder, let's auto-seed a few mock ones so the user has something to see!
    if not folder_files:
        is_design = "design" in gdrive_folder_id.lower()
        is_cad = "cad" in gdrive_folder_id.lower()
        
        seeded_files = []
        if is_cad:
            seeded_files = [
                {
                    "id": f"mock-file-cad-1-{gdrive_folder_id}",
                    "name": "Electrical Layout Refined.dwg",
                    "mimeType": "application/acad",
                    "sizeBytes": 5200000,
                    "createdTime": datetime.datetime.utcnow().isoformat() + "Z",
                    "webViewLink": "https://docs.google.com/viewer?url=mock-electrical-layout",
                    "parents": [gdrive_folder_id],
                    "trashed": False
                },
                {
                    "id": f"mock-file-cad-2-{gdrive_folder_id}",
                    "name": "Ceiling Detail Section.pdf",
                    "mimeType": "application/pdf",
                    "sizeBytes": 1400000,
                    "createdTime": datetime.datetime.utcnow().isoformat() + "Z",
                    "webViewLink": "https://docs.google.com/viewer?url=mock-ceiling-detail",
                    "parents": [gdrive_folder_id],
                    "trashed": False
                }
            ]
        elif is_design:
            seeded_files = [
                {
                    "id": f"mock-file-design-1-{gdrive_folder_id}",
                    "name": "Lighting Concept Moodboard.pdf",
                    "mimeType": "application/pdf",
                    "sizeBytes": 8900000,
                    "createdTime": datetime.datetime.utcnow().isoformat() + "Z",
                    "webViewLink": "https://docs.google.com/viewer?url=mock-moodboard",
                    "parents": [gdrive_folder_id],
                    "trashed": False
                },
                {
                    "id": f"mock-file-design-2-{gdrive_folder_id}",
                    "name": "Design Proposal Review.pdf",
                    "mimeType": "application/pdf",
                    "sizeBytes": 2200000,
                    "createdTime": datetime.datetime.utcnow().isoformat() + "Z",
                    "webViewLink": "https://docs.google.com/viewer?url=mock-proposal",
                    "parents": [gdrive_folder_id],
                    "trashed": False
                }
            ]
        else: # supply or fallback
            seeded_files = [
                {
                    "id": f"mock-file-supply-1-{gdrive_folder_id}",
                    "name": "Product Order List.xlsx",
                    "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "sizeBytes": 1100000,
                    "createdTime": datetime.datetime.utcnow().isoformat() + "Z",
                    "webViewLink": "https://docs.google.com/viewer?url=mock-order-list",
                    "parents": [gdrive_folder_id],
                    "trashed": False
                },
                {
                    "id": f"mock-file-supply-2-{gdrive_folder_id}",
                    "name": "Supplier Invoice ELDC.pdf",
                    "mimeType": "application/pdf",
                    "sizeBytes": 1250000,
                    "createdTime": datetime.datetime.utcnow().isoformat() + "Z",
                    "webViewLink": "https://docs.google.com/viewer?url=mock-supplier-invoice",
                    "parents": [gdrive_folder_id],
                    "trashed": False
                }
            ]
            
        all_files.extend(seeded_files)
        save_mock_drive(all_files)
        folder_files = seeded_files
        
    return folder_files

# --- 3. Upload a file directly into a Google Drive Folder ---
@router.post("/folders/{gdrive_folder_id}/upload")
async def upload_file_to_folder(
    gdrive_folder_id: str, 
    file: UploadFile = File(...)
):
    try:
        contents = await file.read()
        size_bytes = len(contents)
        
        # In a real environment, we'd do:
        # drive_service, _ = get_google_services()
        # media = MediaIoBaseUpload(io.BytesIO(contents), mimetype=file.content_type)
        # file_metadata = {'name': file.filename, 'parents': [gdrive_folder_id]}
        # drive_service.files().create(body=file_metadata, media_body=media, fields='id, name, webViewLink').execute()
        
        # Save to mock drive
        all_files = load_mock_drive()
        file_id = f"mock-file-{uuid.uuid4()}"
        new_file = {
            "id": file_id,
            "name": file.filename,
            "mimeType": file.content_type or "application/octet-stream",
            "sizeBytes": size_bytes,
            "createdTime": datetime.datetime.utcnow().isoformat() + "Z",
            "webViewLink": f"https://docs.google.com/viewer?url=mock-uploaded-{file_id}",
            "parents": [gdrive_folder_id],
            "trashed": False
        }
        
        all_files.append(new_file)
        save_mock_drive(all_files)
        
        return {"message": "File uploaded successfully", "file": new_file}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# --- 4. Move a file to Google Drive Trash (instead of permanent delete) ---
@router.delete("/files/{gdrive_file_id}")
def trash_file(gdrive_file_id: str):
    # In a real environment, we'd do:
    # drive_service, _ = get_google_services()
    # drive_service.files().update(fileId=gdrive_file_id, body={'trashed': True}).execute()
    
    all_files = load_mock_drive()
    file_found = False
    for f in all_files:
        if f.get("id") == gdrive_file_id:
            f["trashed"] = True
            file_found = True
            break
            
    if not file_found:
        raise HTTPException(status_code=404, detail="File not found")
        
    save_mock_drive(all_files)
    return {"message": "File moved to trash successfully"}
