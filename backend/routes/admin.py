from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Depends, Response
from fastapi.responses import FileResponse, JSONResponse
import os
import shutil
from database.cloud_sql import get_db
from sqlalchemy.orm import Session
from models.orm_models import TemplateConfig

router = APIRouter()

# Base path for all system templates
TEMPLATES_BASE_DIR = os.path.join(os.path.dirname(__file__), '..', 'templates')

def get_template_path(doc_type: str):
    return os.path.abspath(os.path.join(TEMPLATES_BASE_DIR, doc_type, 'template.docx'))

@router.get("/templates/{doc_type}/download")
async def download_template(doc_type: str, db: Session = Depends(get_db)):
    """
    Downloads the current .docx template for the specified document type.
    First checks the database. If not found, falls back to the filesystem.
    If filesystem doesn't exist, it auto-initializes it with a starter template from DESIGN_FEE_PROPOSAL.
    """
    # 1. Check database first
    config = db.query(TemplateConfig).filter(TemplateConfig.template_key == doc_type).first()
    if config and config.docx_binary:
        return Response(
            content=config.docx_binary,
            media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            headers={"Content-Disposition": f"attachment; filename={doc_type.lower()}_template.docx"}
        )

    # 2. Fall back to local file
    path = get_template_path(doc_type)
    if not os.path.exists(path):
        starter_path = get_template_path("DESIGN_FEE_PROPOSAL")
        if os.path.exists(starter_path):
            os.makedirs(os.path.dirname(path), exist_ok=True)
            shutil.copyfile(starter_path, path)
            print(f"DEBUG: Auto-initialized template for {doc_type} from DESIGN_FEE_PROPOSAL")
        else:
            raise HTTPException(status_code=404, detail=f"Template for {doc_type} not found and starter template is missing")
    
    return FileResponse(
        path, 
        media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        filename=f"{doc_type.lower()}_template.docx"
    )

@router.post("/templates/{doc_type}/upload")
async def upload_template(doc_type: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Uploads a new .docx template for a specific document type and stores it in the database.
    """
    if not file.filename.lower().endswith('.docx'):
        raise HTTPException(status_code=400, detail="Only .docx files are allowed")
    
    contents = await file.read()
    
    config = db.query(TemplateConfig).filter(TemplateConfig.template_key == doc_type).first()
    if config:
        config.docx_binary = contents
    else:
        config = TemplateConfig(template_key=doc_type, docx_binary=contents, config_json={})
        db.add(config)
    
    db.commit()
    return {"message": f"Template for {doc_type} uploaded successfully to database"}

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
async def get_template_metadata(doc_type: str, db: Session = Depends(get_db)):
    """
    Returns metadata about specified template.
    """
    # 1. Check database first
    config = db.query(TemplateConfig).filter(TemplateConfig.template_key == doc_type).first()
    if config and config.docx_binary:
        return {
            "exists": True,
            "size": len(config.docx_binary),
            "last_modified": None
        }
        
    # 2. Fall back to local file
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
def generate_document(doc_type: str, page: int = None, data: dict = Body(...), db: Session = Depends(get_db)):
    """
    High-Fidelity Document Generator (Google Docs API Bridge).
    """
    print(f"DEBUG: Generating {doc_type} with tokens: {list(data.keys())} for page: {page}")
    
    # Check if a direct docx template exists (either in DB or on disk)
    from services.docx_engine import merge_docx_template
    
    config = db.query(TemplateConfig).filter(TemplateConfig.template_key == doc_type).first()
    
    custom_template_temp_path = None
    temp_dir = None
    docx_template_path = None
    
    if config and config.docx_binary:
        print(f"DEBUG: Using custom template from database for {doc_type}")
        temp_dir = tempfile.mkdtemp()
        custom_template_temp_path = os.path.join(temp_dir, "db_template.docx")
        with open(custom_template_temp_path, "wb") as f:
            f.write(config.docx_binary)
        docx_template_path = custom_template_temp_path
    else:
        disk_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'templates', doc_type, 'template.docx'))
        if os.path.exists(disk_path):
            docx_template_path = disk_path
    
    if docx_template_path:
        print(f"DEBUG: Found direct docx template at {docx_template_path}. Using docx_engine...")
        custom_creds = None
        if config:
            custom_creds = config.config_json.get("google_credentials_json")
            if custom_creds and isinstance(custom_creds, str):
                import json
                try:
                    custom_creds = json.loads(custom_creds)
                except Exception as j_err:
                    print(f"DEBUG: JSON credentials load error: {j_err}")
                    custom_creds = None
                    
        try:
            pdf_path = merge_docx_template(
                docx_template_path,
                data,
                f"{doc_type.lower()}.pdf",
                credentials_json=custom_creds
            )
            print(f"DEBUG: Generation successful from docx! PDF path: {pdf_path}")
            
            if page is not None:
                import pypdf
                try:
                    reader = pypdf.PdfReader(pdf_path)
                    total_pages = len(reader.pages)
                    idx = max(0, min(page - 1, total_pages - 1))
                    
                    writer = pypdf.PdfWriter()
                    writer.add_page(reader.pages[idx])
                    
                    single_page_pdf = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
                    single_page_pdf_path = single_page_pdf.name
                    single_page_pdf.close()
                    
                    with open(single_page_pdf_path, "wb") as f:
                        writer.write(f)
                    
                    # Remove original full PDF
                    try:
                        os.remove(pdf_path)
                    except Exception:
                        pass
                    pdf_path = single_page_pdf_path
                    print(f"DEBUG: Successfully extracted page {page} to {pdf_path}")
                except Exception as pypdf_err:
                    print(f"Error extracting page {page} with pypdf: {pypdf_err}")

            
            filename = f"Document_{doc_type.lower()}.pdf"
            if config:
                naming_conv = config.config_json.get("naming_convention")
                if naming_conv:
                    temp_name = naming_conv
                    for k, v in data.items():
                        temp_name = temp_name.replace("{{" + k + "}}", str(v))
                    import re
                    filename = re.sub(r'[\\/*?:"<>|]', "", temp_name)
                    if not filename.lower().endswith(".pdf"):
                        filename += ".pdf"
                        
            return FileResponse(
                pdf_path,
                media_type='application/pdf',
                filename=filename
            )
        except Exception as docx_err:
            print(f"Error generating {doc_type} via docx: {docx_err}")
            raise HTTPException(status_code=500, detail=f"Word Template Conversion Error: {docx_err}")
        finally:
            # Clean up the custom template temp files if they were written
            if custom_template_temp_path and os.path.exists(custom_template_temp_path):
                try:
                    os.remove(custom_template_temp_path)
                except Exception:
                    pass
            if temp_dir and os.path.exists(temp_dir):
                try:
                    os.rmdir(temp_dir)
                except Exception:
                    pass

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

