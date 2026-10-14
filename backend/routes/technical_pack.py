import logging
import io
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from fastapi.responses import Response as FastAPIResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
import json

from database.cloud_sql import get_db
from models.orm_models import Order, OrderItem, Project
from services.technical_pack_service import (
    analyze_fitting_with_supplier_docs,
    render_technical_pack_pdf,
    build_technical_pack_html
)
from services.google_drive_service import (
    upload_file_to_drive,
    ensure_order_drive_tree
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/technical-pack", tags=["technical-pack"])

class GeneratePdfRequest(BaseModel):
    project_name: Optional[str] = "One to One Project"
    client_name: Optional[str] = ""
    order_id: Optional[str] = ""
    fittings: List[Dict[str, Any]] = []

class SaveToDriveRequest(BaseModel):
    order_id: str
    project_name: Optional[str] = ""
    client_name: Optional[str] = ""
    supplier_name: Optional[str] = ""
    pdf_payload: GeneratePdfRequest

@router.post("/analyze-fitting")
async def analyze_fitting_endpoint(
    fitting_meta_json: str = Form(...),
    files: List[UploadFile] = File(default=[])
):
    """
    Analyzes a luminaire mark (e.g. A1) and its accessories against uploaded supplier PDFs
    using Gemini 2.5 Flash on Vertex AI.
    """
    try:
        fitting_meta = json.loads(fitting_meta_json)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid fitting_meta JSON: {str(e)}")

    pdf_bytes_list = []
    for f in files:
        content = await f.read()
        if content:
            pdf_bytes_list.append(content)

    try:
        analyzed_data = analyze_fitting_with_supplier_docs(
            fitting_meta=fitting_meta,
            supplier_pdf_bytes_list=pdf_bytes_list if pdf_bytes_list else None
        )
        return {
            "success": True,
            "data": analyzed_data
        }
    except Exception as e:
        logger.error(f"Error analyzing fitting with AI: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

@router.post("/generate-pdf")
def generate_pdf_endpoint(payload: GeneratePdfRequest):
    """
    Renders the standardized One to One Technical Pack PDF from structured JSON.
    Returns binary PDF stream.
    """
    try:
        pack_dict = payload.model_dump()
        pdf_bytes = render_technical_pack_pdf(pack_dict)
        filename = f"Technical_Pack_{payload.order_id or 'Project'}.pdf".replace(" ", "_")
        return FastAPIResponse(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        logger.error(f"Failed to generate technical pack PDF: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

@router.post("/preview-html")
def preview_html_endpoint(payload: GeneratePdfRequest):
    """
    Renders the exact adaptive HTML layout for real-time split-screen visual preview.
    """
    try:
        pack_dict = payload.model_dump()
        html_content = build_technical_pack_html(pack_dict)
        return {"success": True, "html": html_content}
    except Exception as e:
        logger.error(f"Failed to render technical pack preview HTML: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"HTML preview failed: {str(e)}")

@router.post("/save-to-drive")
def save_to_drive_endpoint(
    payload: SaveToDriveRequest,
    db: Session = Depends(get_db)
):
    """
    Renders the Technical Pack PDF and uploads it directly to the Order's Google Drive folder.
    """
    try:
        pack_dict = payload.pdf_payload.model_dump()
        pdf_bytes = render_technical_pack_pdf(pack_dict)
        clean_order_id = payload.order_id.strip()

        # Resolve order tree
        folders = ensure_order_drive_tree(
            client_name=payload.client_name or "General Clients",
            project_name=payload.project_name or "General Project",
            order_identifier=clean_order_id,
            supplier_name=payload.supplier_name or "",
            order_name="",
            db=db
        )

        if not folders:
            raise HTTPException(status_code=404, detail="Could not find or create Google Drive folder for order")

        # Pick 'Documents' or '01 - BOQs & Quotations' or order root
        target_folder = None
        for f in folders:
            f_name = (f.get("name") or "").lower()
            if "document" in f_name or "latest" in f_name or "spec" in f_name:
                target_folder = f
                break
        if not target_folder:
            target_folder = folders[0]

        target_folder_id = target_folder.get("gdrive_folder_id") or target_folder.get("id")
        filename = f"Technical_Pack_{clean_order_id}.pdf".replace(" ", "_")

        uploaded = upload_file_to_drive(
            folder_id=target_folder_id,
            file_bytes=pdf_bytes,
            filename=filename,
            content_type="application/pdf"
        )

        return {
            "success": True,
            "message": f"Technical pack successfully saved to Google Drive in {target_folder.get('name')}",
            "file": uploaded
        }
    except Exception as e:
        logger.error(f"Error saving technical pack to Google Drive: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to save to Drive: {str(e)}")
