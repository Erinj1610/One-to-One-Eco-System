from fastapi import APIRouter, Request, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse
import os
import shutil

router = APIRouter()

# Base path for all system templates
TEMPLATES_BASE_DIR = os.path.join(os.path.dirname(__file__), '..', 'templates')

def get_template_path(doc_type: str):
    return os.path.abspath(os.path.join(TEMPLATES_BASE_DIR, doc_type, 'template.docx'))

@router.get("/templates/{doc_type}/download")
async def download_template(doc_type: str):
    """
    Downloads the current .docx template for the specified document type.
    """
    path = get_template_path(doc_type)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Template for {doc_type} not found")
    
    return FileResponse(
        path, 
        media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        filename=f"{doc_type.lower()}_template.docx"
    )

@router.post("/templates/{doc_type}/upload")
async def upload_template(doc_type: str, file: UploadFile = File(...)):
    """
    Uploads a new .docx template for a specific document type.
    """
    if not file.filename.lower().endswith('.docx'):
        raise HTTPException(status_code=400, detail="Only .docx files are allowed")
    
    path = get_template_path(doc_type)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {"message": f"Template for {doc_type} uploaded successfully"}

from models.orm_models import TemplateConfig
from database.cloud_sql import get_db
from sqlalchemy.orm import Session
from fastapi import Depends

# --- TEMPLATE CONFIGURATION ENDPOINTS (NO-CODE) ---

@router.get("/configs/{template_key}")
async def get_template_config(template_key: str, db: Session = Depends(get_db)):
    """
    Returns the visual/text configuration for a specific template.
    """
    config = db.query(TemplateConfig).filter(TemplateConfig.template_key == template_key).first()
    if not config:
        # Provide clean, professional defaults if nothing exists
        return {
            "template_key": template_key,
            "config_json": {
                "company_name": "ONE TO ONE LIGHTING",
                "tagline": "Premium Lighting Design & Solutions",
                "address": "123 Solar Street, Cape Town, 8001",
                "contact": "+27 21 000 0000 | hello@onetoone.co.za",
                "terms": "1. This proposal is valid for 30 days from date of issue.\n2. 50% deposit is required before concept design begins.\n3. All designs remain the property of One to One Lighting until full payment.",
                "footer": "One to One Lighting Design | Confidential Proposal",
                "color_theme": "#10b981"
            }
        }
    return config

@router.post("/configs/{template_key}")
async def save_template_config(template_key: str, request: Request, db: Session = Depends(get_db)):
    """
    Saves visual/text configuration for a specific template.
    """
    data = await request.json()
    config = db.query(TemplateConfig).filter(TemplateConfig.template_key == template_key).first()
    
    if config:
        config.config_json = data
    else:
        config = TemplateConfig(template_key=template_key, config_json=data)
        db.add(config)
    
    db.commit()
    return {"message": "Design settings saved successfully"}


@router.get("/templates/{doc_type}/metadata")
async def get_template_metadata(doc_type: str):
    """
    Returns metadata about specified template.
    """
    path = get_template_path(doc_type)
    if not os.path.exists(path):
        return {"exists": False}
    
    stats = os.stat(path)
    return {
        "exists": True,
        "size": stats.st_size,
        "last_modified": stats.st_mtime
    }


from services.google_doc_engine import merge_google_doc
import tempfile

from fastapi import Body

@router.post("/generate/{doc_type}")
def generate_document(doc_type: str, data: dict = Body(...), db: Session = Depends(get_db)):
    """
    High-Fidelity Document Generator (Google Docs API Bridge).
    """
    print(f"DEBUG: Generating {doc_type} with tokens: {list(data.keys())}")
    
    # Fetch template settings to get the linked Google Doc ID and Credentials
    config = db.query(TemplateConfig).filter(TemplateConfig.template_key == doc_type).first()
    if not config or "google_doc_id" not in config.config_json:
        print(f"DEBUG: No template config found for {doc_type}")
        raise HTTPException(status_code=400, detail=f"No Google Doc template linked for {doc_type}")

    google_doc_id = config.config_json["google_doc_id"]
    print(f"DEBUG: Using Google Doc ID: {google_doc_id}")
    
    # Extract credentials if provided manually in the Hub
    custom_creds = config.config_json.get("google_credentials_json")
    if custom_creds:
        print("DEBUG: Private Service Account JSON detected. Attempting to parse...")
        if isinstance(custom_creds, str):
            import json
            try:
                custom_creds = json.loads(custom_creds)
                print("DEBUG: JSON credentials parsed successfully.")
            except Exception as j_err:
                print(f"DEBUG: JSON parse error: {j_err}")
                custom_creds = None
    else:
        print("DEBUG: No manual JSON credentials found. Falling back to Application Default.")

    try:
        # Perform the merge using our professional service (Sync)
        pdf_path = merge_google_doc(
            google_doc_id, 
            data, 
            f"{doc_type.lower()}.pdf", 
            credentials_json=custom_creds
        )
        print(f"DEBUG: Generation successful! PDF path: {pdf_path}")

        # Handle naming convention
        filename = f"Proposal_{doc_type.lower()}.pdf"
        naming_conv = config.config_json.get("naming_convention")
        if naming_conv:
            # Simple replacement for the filename
            temp_name = naming_conv
            for k, v in data.items():
                temp_name = temp_name.replace("{{" + k + "}}", str(v))
            
            # Clean filename (remove problematic chars)
            import re
            filename = re.sub(r'[\\/*?:"<>|]', "", temp_name)
            if not filename.lower().endswith(".pdf"):
                filename += ".pdf"

        return FileResponse(
            pdf_path, 
            media_type='application/pdf', 
            filename=filename
        )
            
    except Exception as e:
        error_str = str(e)
        print(f"Error generating {doc_type}: {error_str}")
        
        # User-Friendly Error Mapping
        if "403" in error_str or "forbidden" in error_str.lower():
            friendly_detail = "Permission Denied: Please ensure the Google Doc is SHARED with your service account email as a 'Viewer'."
        elif "404" in error_str or "not found" in error_str.lower():
            friendly_detail = "Document Not Found: Please verify the Google Doc ID/URL in the Branding Hub."
        elif "API has not been used" in error_str:
            friendly_detail = "API Not Enabled: Please ensure Google Docs and Google Drive APIs are ENABLED in your GCP Console."
        else:
            friendly_detail = f"Google Docs Error: {error_str}"

        raise HTTPException(status_code=500, detail=friendly_detail)

