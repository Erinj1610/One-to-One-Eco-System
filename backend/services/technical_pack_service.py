import os
import io
import json
import ssl
import base64
import logging
import urllib.parse
import urllib.request
from typing import Dict, Any, List, Optional
import google.auth
from google.auth.transport.requests import Request
from xhtml2pdf import pisa
import pymupdf
from PIL import Image

logger = logging.getLogger(__name__)

# SSL Context bypass for Windows Python OpenSSL certificate issues
_SSL_CTX = ssl.create_default_context()
_SSL_CTX.check_hostname = False
_SSL_CTX.verify_mode = ssl.CERT_NONE

PROJECT_ID = "one-to-one-portal-500205"
LOCATION = "us-central1"
# Upgraded to Gemini 2.5 Pro for deep visual layout reasoning & millimeter-accurate coordinate detection
MODEL_NAME = "gemini-2.5-pro"

def get_gcp_access_token() -> str:
    """Acquires a valid GCP OAuth access token across Cloud Run and local environments."""
    creds, project = google.auth.default(scopes=['https://www.googleapis.com/auth/cloud-platform'])
    
    # 1. Standard or session-based refresh
    try:
        if not creds.valid:
            import requests
            session = requests.Session()
            session.verify = False
            auth_req = Request(session=session)
            creds.refresh(auth_req)
        if creds.token:
            return creds.token
    except Exception as e:
        logger.warning(f"Standard session creds.refresh failed: {e}")

    # 2. Local Windows Python fallback if SSL issues prevent standard refresh
    token_url = 'https://oauth2.googleapis.com/token'
    client_id = getattr(creds, 'client_id', None)
    client_secret = getattr(creds, 'client_secret', None)
    refresh_token = getattr(creds, 'refresh_token', None)

    if refresh_token:
        data = urllib.parse.urlencode({
            'client_id': client_id or '',
            'client_secret': client_secret or '',
            'refresh_token': refresh_token,
            'grant_type': 'refresh_token'
        }).encode('utf-8')

        try:
            req = urllib.request.Request(token_url, data=data)
            with urllib.request.urlopen(req, context=_SSL_CTX, timeout=10) as resp:
                res = json.loads(resp.read().decode('utf-8'))
                if res.get('access_token'):
                    return res.get('access_token')
        except Exception as e:
            logger.warning(f"Direct token refresh via urllib failed: {e}")

    if hasattr(creds, 'token') and creds.token:
        return creds.token
    raise RuntimeError("Could not acquire valid GCP access token for Vertex AI")

def call_gemini_multimodal(prompt: str, pdf_bytes_list: Optional[List[bytes]] = None, model: str = MODEL_NAME) -> Dict[str, Any]:
    """Calls Gemini 2.5 Pro on Vertex AI with text and optional PDF attachments."""
    token = get_gcp_access_token()
    url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/{model}:generateContent"

    parts = [{"text": prompt}]
    if pdf_bytes_list:
        for p_bytes in pdf_bytes_list:
            pdf_b64 = base64.b64encode(p_bytes).decode('utf-8')
            parts.append({
                "inline_data": {
                    "mime_type": "application/pdf",
                    "data": pdf_b64
                }
            })

    payload = {
        "contents": [{"role": "user", "parts": parts}],
        "generation_config": {
            "response_mime_type": "application/json",
            "temperature": 0.2
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    )

    with urllib.request.urlopen(req, context=_SSL_CTX, timeout=90) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        cand = res.get('candidates', [{}])[0]
        text_resp = cand.get('content', {}).get('parts', [{}])[0].get('text', '{}')
        return json.loads(text_resp)

def crop_pdf_bounding_box(pdf_bytes: bytes, page_number: int, bbox_1000: List[int]) -> Optional[str]:
    """
    Renders the PDF page at 300 DPI, crops the bounding box [ymin, xmin, ymax, xmax] (0-1000 scale),
    and returns a base64 data URI string suitable for direct HTML rendering.
    """
    try:
        ymin, xmin, ymax, xmax = bbox_1000
        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        page_idx = max(0, min(page_number - 1, len(doc) - 1))
        page = doc[page_idx]

        # 300 DPI matrix (300 / 72 = 4.1666)
        zoom = 300 / 72
        mat = pymupdf.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)

        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        w, h = img.size

        # Clamp and scale coordinates
        left = max(0, int((xmin / 1000.0) * w))
        top = max(0, int((ymin / 1000.0) * h))
        right = min(w, int((xmax / 1000.0) * w))
        bottom = min(h, int((ymax / 1000.0) * h))

        if right <= left or bottom <= top:
            return None

        cropped = img.crop((left, top, right, bottom))
        
        # Save as optimized PNG in memory
        out_buf = io.BytesIO()
        cropped.save(out_buf, format="PNG", optimize=True)
        b64_str = base64.b64encode(out_buf.getvalue()).decode('utf-8')
        return f"data:image/png;base64,{b64_str}"
    except Exception as e:
        logger.warning(f"Failed to crop PDF bounding box: {e}")
        return None

def analyze_fitting_with_supplier_docs(
    fitting_meta: Dict[str, Any],
    supplier_pdf_bytes_list: Optional[List[bytes]] = None
) -> Dict[str, Any]:
    """
    Analyzes supplier datasheets & installation manuals using Gemini 2.5 Pro.
    Detects spatial bounding boxes for hero fitting photos, CAD cut-out drawings, and step diagrams,
    and crops them automatically into high-resolution images.
    """
    type_code = fitting_meta.get("type_code", "A1")
    code = fitting_meta.get("code", "")
    description = fitting_meta.get("description", "")
    brand = fitting_meta.get("brand", "")
    driver_item = fitting_meta.get("driver_item", {})
    accessories = fitting_meta.get("accessories", [])

    prompt = f"""
You are an expert Architectural Lighting Technical Engineer at 'One to One Architectural Lighting'.
Your job is to analyze the attached supplier technical sheet and installation manual, combine it with the project's Bill of Quantities (BOQ) order specification, and return a clean, contractor-ready technical sheet specification in JSON.

### BOQ LINE ITEM CONTEXT:
- Type Code (Fitting Mark): {type_code}
- Product Code: {code}
- Product Description: {description}
- Brand: {brand}
- Associated Driver / Module / Lamp on this Order: {json.dumps(driver_item)}
- Associated Accessories on this Order: {json.dumps(accessories)}

### REQUIRED JSON OUTPUT STRUCTURE:
{{
  "type_code": "{type_code}",
  "range_name": "Copper Range",
  "installation_tag": "Easy Installation",
  "ratings": {{
    "cost": 1,        // 1 to 5 integer
    "quality": 3,     // 1 to 5 integer
    "size": 3,        // 1 to 5 integer
    "difficulty": 2,  // 1 to 5 integer
    "versatility": 4  // 1 to 5 integer
  }},
  "fitting": {{
    "description": "Short clean title (e.g. Downlight - Club Series TA5 Round GU10/Module IP20 Black/Black)"
  }},
  "details": {{
    "cut_out": "Cut-out diameter in mm with diameter symbol (e.g. Ø75mm or 'Surface Mount')",
    "ingress_protection": "IP20 / IP65 / etc.",
    "dimming_protocol": "e.g. Phase-Dim, 1-10V, DALI, or 'Lamp Dependent'",
    "driver": "Yes / No / Integrated",
    "light_source": "e.g. 8.3W Integrated LED / Module/GU10 + Conv. Kit",
    "cri": "e.g. 80 / 90 / 'Specified to Lamp'"
  }},
  "connection": {{
    "driver_location": "Remote Wired / External Driver / Integrated On-Off Driver / GU10 & Lampholder used",
    "fittings_per_driver": "e.g. 1 fitting per driver / 1 GU10 & Lampholder per Downlight",
    "connection_used": "Straight Connection / Parallel Connection / Series Connection / Direct 220-240VAC Connection",
    "max_length": "e.g. Max Run: Long Mains Runs (220-240VAC) or Max 15m (1.5mm² cable)"
  }},
  "accessories_summary": [
    "- Mounting Plate",
    "- Lampholder"
  ],
  "dimensions": {{
    "diameter_mm": "e.g. Ø85mm",
    "height_mm": "e.g. 72mm",
    "notes": "e.g. Height with GU10 is 100mm"
  }},
  "diagram_locations": {{
    "hero_image": {{"pdf_index": 0, "page": 1, "bbox": [ymin, xmin, ymax, xmax]}},
    "technical_drawing": {{"pdf_index": 0, "page": 1, "bbox": [ymin, xmin, ymax, xmax]}}
  }},
  "installation_steps": [
    {{
      "step_number": 1,
      "title": "Cut-out & Provisions",
      "instruction": "Adhere strictly to the cut-out diameter. Ensure ceiling depth is larger than the height of the installation.",
      "site_note": "Ceiling thickness must not exceed 20mm.",
      "diagram": {{"pdf_index": 0, "page": 1, "bbox": [ymin, xmin, ymax, xmax]}}
    }},
    {{
      "step_number": 2,
      "title": "Connections & Driver Wiring",
      "instruction": "Connect Live and Neutral AC mains to driver primary while mains power is switched off.",
      "site_note": "Twist outer frame in while holding spring wings down.",
      "diagram": {{"pdf_index": 0, "page": 2, "bbox": [ymin, xmin, ymax, xmax]}}
    }},
    {{
      "step_number": 3,
      "title": "Assembly & Frame Insertion",
      "instruction": "Insert frame into ceiling cut-out and twist clockwise until firmly seated. Insert module/lamp into position.",
      "site_note": "Ensure honeycomb accessory is seated before clipping module.",
      "diagram": {{"pdf_index": 0, "page": 2, "bbox": [ymin, xmin, ymax, xmax]}}
    }}
  ]
}}

Note on Bounding Boxes: Coordinates must be normalized integers from 0 to 1000 in format [ymin, xmin, ymax, xmax]. If no diagram is present for a step, set "diagram": null.
"""

    result = call_gemini_multimodal(prompt, supplier_pdf_bytes_list, model=MODEL_NAME)

    # Perform automated image crops if PDF bytes are supplied
    if supplier_pdf_bytes_list and len(supplier_pdf_bytes_list) > 0:
        diagram_locs = result.get("diagram_locations", {})
        
        # 1. Hero Image
        hero_meta = diagram_locs.get("hero_image")
        if hero_meta and hero_meta.get("bbox"):
            p_idx = hero_meta.get("pdf_index", 0)
            if p_idx < len(supplier_pdf_bytes_list):
                hero_crop = crop_pdf_bounding_box(
                    supplier_pdf_bytes_list[p_idx],
                    hero_meta.get("page", 1),
                    hero_meta.get("bbox")
                )
                if hero_crop:
                    result["hero_image_url"] = hero_crop

        # 2. Technical / CAD Cut-Out Drawing
        tech_meta = diagram_locs.get("technical_drawing")
        if tech_meta and tech_meta.get("bbox"):
            p_idx = tech_meta.get("pdf_index", 0)
            if p_idx < len(supplier_pdf_bytes_list):
                tech_crop = crop_pdf_bounding_box(
                    supplier_pdf_bytes_list[p_idx],
                    tech_meta.get("page", 1),
                    tech_meta.get("bbox")
                )
                if tech_crop:
                    result["technical_drawing_url"] = tech_crop

        # 3. Installation Step Diagrams
        for step in result.get("installation_steps", []):
            st_diag = step.get("diagram")
            if st_diag and st_diag.get("bbox"):
                p_idx = st_diag.get("pdf_index", 0)
                if p_idx < len(supplier_pdf_bytes_list):
                    st_crop = crop_pdf_bounding_box(
                        supplier_pdf_bytes_list[p_idx],
                        st_diag.get("page", 1),
                        st_diag.get("bbox")
                    )
                    if st_crop:
                        step["diagram_image_url"] = st_crop

    return result

def build_technical_pack_html(pack_data: Dict[str, Any]) -> str:
    """
    Builds the clean, high-contrast Swiss-typography One to One Technical Pack HTML
    with Adaptive Layouts based on image presence.
    """
    project_name = pack_data.get("project_name", "One to One Project")
    fittings = pack_data.get("fittings", [])

    # Dynamic TOC page calculations
    current_page = 3
    toc_items = []
    for fit in fittings:
        inst_steps_count = len(fit.get("installation_steps", []))
        inst_pages = 2 if inst_steps_count > 3 else 1
        total_pages_for_fit = 1 + inst_pages + (1 if fit.get("accessories_summary") else 0)
        start_p = current_page
        end_p = current_page + total_pages_for_fit - 1
        page_range = f"Pg {start_p}-{end_p}" if start_p != end_p else f"Pg {start_p}"
        toc_items.append({
            "type_code": fit.get("type_code", "A1"),
            "range": page_range,
            "start_p": start_p
        })
        current_page = end_p + 1

    def render_dots(val: int):
        dots_html = ""
        for i in range(1, 6):
            color = "#1e293b" if i <= int(val or 1) else "#e2e8f0"
            dots_html += f'<span style="color:{color};font-size:12pt;">&bull; </span>'
        return dots_html

    html = f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
@page {{
    size: a4 portrait;
    margin: 14mm 16mm 14mm 16mm;
}}
body {{
    font-family: Helvetica, Arial, sans-serif;
    color: #0f172a;
    line-height: 1.35;
    margin: 0;
    padding: 0;
}}
.page-break {{
    page-break-before: always;
}}
.cover-page {{
    text-align: left;
    padding-top: 60px;
}}
.cover-logo {{
    font-size: 38pt;
    font-weight: bold;
    line-height: 1.0;
    margin-bottom: 15px;
}}
.cover-subtitle {{
    font-size: 11pt;
    font-weight: bold;
    letter-spacing: 2px;
    color: #475569;
    margin-bottom: 60px;
}}
.cover-title {{
    font-size: 26pt;
    font-weight: bold;
    margin-bottom: 180px;
}}
.cover-project {{
    font-size: 16pt;
    font-weight: bold;
}}
.toc-title {{
    font-size: 28pt;
    font-weight: bold;
    margin-bottom: 30px;
}}
.header-badge {{
    padding: 3px 8px;
    background-color: #10b981;
    color: #ffffff;
    font-weight: bold;
    font-size: 9.5pt;
    margin-bottom: 8px;
}}
.section-title {{
    font-size: 10.5pt;
    font-weight: bold;
    text-transform: uppercase;
    border-bottom: 1px solid #0f172a;
    padding-bottom: 2px;
    margin-top: 10px;
    margin-bottom: 6px;
}}
.spec-table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
}}
.spec-table td {{
    padding: 3px 4px;
    border-bottom: 1px solid #f1f5f9;
}}
.spec-table td.label {{
    color: #475569;
    font-weight: bold;
    width: 45%;
}}
.spec-table td.val {{
    color: #0f172a;
    font-weight: bold;
}}
.connection-box {{
    border: 1px solid #0f172a;
    padding: 8px 10px;
    font-size: 8.5pt;
    background-color: #f8fafc;
}}
.connection-box ul {{
    margin: 4px 0 0 14px;
    padding: 0;
}}
.connection-box li {{
    margin-bottom: 2px;
}}
.step-card {{
    border: 1px solid #e2e8f0;
    padding: 10px 12px;
    margin-bottom: 10px;
    background-color: #ffffff;
}}
.step-number {{
    background-color: #0f172a;
    color: #ffffff;
    font-weight: bold;
    padding: 2px 7px;
    border-radius: 50%;
    font-size: 9pt;
    margin-right: 8px;
}}
</style>
</head>
<body>

<!-- 1. COVER PAGE -->
<div class="cover-page">
    <div class="cover-logo">&bull;ONE TO<br>&bull;ONE</div>
    <div class="cover-subtitle">BY MARTIN D&Ouml;LLER</div>
    <div class="cover-title">Technical Pack</div>
    <div class="cover-project">Project: {project_name}</div>
</div>

<!-- 2. TABLE OF CONTENTS -->
<div class="page-break"></div>
<div>
    <div class="toc-title">Contents</div>
    <div style="border-top: 1px solid #0f172a; margin-top: 15px; padding-top: 10px;">
"""

    for item in toc_items:
        html += f"""
        <div style="font-size: 11pt; font-weight: bold; margin-bottom: 10px; display: flex; justify-content: space-between;">
            <span>&bull; {item['type_code']}</span>
            <span style="color: #64748b;">{item['range']}</span>
        </div>
        """

    html += """
    </div>
</div>
"""

    # 3. FITTING PAGES
    for fit in fittings:
        type_code = fit.get("type_code", "A1")
        range_name = fit.get("range_name", "Copper Range")
        tag = fit.get("installation_tag", "Easy Installation")
        ratings = fit.get("ratings", {})
        fitting_desc = fit.get("fitting", {}).get("description") or fit.get("product_name", "")
        details = fit.get("details") or fit.get("specifications", {})
        conn = fit.get("connection") or fit.get("electrical", {})
        acc_list = fit.get("accessories_summary", [])
        dims = fit.get("dimensions", {})
        steps = fit.get("installation_steps", [])

        # Extracted Imagery
        hero_img = fit.get("hero_image_url")
        tech_img = fit.get("technical_drawing_url")

        # FRONT TECHNICAL PAGE
        html += f"""
<div class="page-break"></div>
<div>
    <table style="width:100%; border-collapse:collapse; margin-bottom:8px;">
        <tr>
            <td style="width:60%; vertical-align:top;">
                <h1 style="font-size: 22pt; font-weight:900; margin:0 0 2px 0;">&bull; {type_code}</h1>
                <div style="font-size:10.5pt; font-weight:700; color:#475569; margin-bottom:6px;">&bull; {range_name}</div>
                <div class="header-badge">{tag}</div>
                
                <div style="margin-top: 6px;">
                    <table style="font-size:8pt; color:#334155;">
                        <tr><td style="padding:1px 6px 1px 0;">Cost:</td><td>{render_dots(ratings.get('cost', 1))}</td></tr>
                        <tr><td style="padding:1px 6px 1px 0;">Quality:</td><td>{render_dots(ratings.get('quality', 3))}</td></tr>
                        <tr><td style="padding:1px 6px 1px 0;">Size:</td><td>{render_dots(ratings.get('size', 3))}</td></tr>
                        <tr><td style="padding:1px 6px 1px 0;">Difficulty:</td><td>{render_dots(ratings.get('difficulty', 2))}</td></tr>
                        <tr><td style="padding:1px 6px 1px 0;">Versatility:</td><td>{render_dots(ratings.get('versatility', 4))}</td></tr>
                    </table>
                </div>
            </td>
            <td style="width:40%; text-align:right; vertical-align:middle;">
        """

        # Adaptive Hero Image container: renders photo if present, otherwise clean vector badge
        if hero_img:
            html += f'<img src="{hero_img}" style="max-height:120px; max-width:180px; object-fit:contain; border:1px solid #e2e8f0; padding:4px;" />'
        else:
            html += f'<div style="border:1.5px dashed #cbd5e1; padding:18px 12px; text-align:center; font-size:9pt; font-weight:700; color:#64748b; background:#f8fafc;">LUMINAIRE {type_code}</div>'

        html += f"""
            </td>
        </tr>
    </table>

    <div class="section-title">Fitting Description</div>
    <div style="font-size:9.5pt; font-weight:600; margin-bottom:8px;">{fitting_desc}</div>

    <table style="width:100%;">
        <tr>
            <td style="width:50%; vertical-align:top; padding-right:10px;">
                <div class="section-title">Details</div>
                <table class="spec-table">
                    <tr><td class="label">Cut-Out:</td><td class="val">{details.get('cut_out') or details.get('cutout_mm', '—')}</td></tr>
                    <tr><td class="label">Ingress Protection:</td><td class="val">{details.get('ingress_protection') or details.get('ip_rating', 'IP20')}</td></tr>
                    <tr><td class="label">Dimming Protocol:</td><td class="val">{details.get('dimming_protocol') or details.get('dimming', 'On-Off')}</td></tr>
                    <tr><td class="label">Driver:</td><td class="val">{details.get('driver', 'Yes')}</td></tr>
                    <tr><td class="label">Light Source:</td><td class="val">{details.get('light_source') or details.get('wattage', '—')}</td></tr>
                    <tr><td class="label">CRI:</td><td class="val">{details.get('cri', '80')}</td></tr>
                </table>
            </td>
            <td style="width:50%; vertical-align:top; padding-left:10px;">
                <div class="section-title">Connection & Wiring</div>
                <div class="connection-box">
                    <strong>Connection Rules:</strong>
                    <ul>
                        <li>{conn.get('driver_location', 'Remote Wired')}</li>
                        <li>{conn.get('fittings_per_driver', '1 fitting per driver')}</li>
                        <li>{conn.get('connection_used', 'Straight Connection')}</li>
                        <li>{conn.get('max_length', 'Long Mains Runs')}</li>
                    </ul>
                </div>
            </td>
        </tr>
    </table>

    <table style="width:100%; margin-top:6px;">
        <tr>
            <td style="width:50%; vertical-align:top; padding-right:10px;">
                <div class="section-title">Accessories Included</div>
                <ul style="font-size:8.5pt; margin:4px 0 0 14px; padding:0; color:#334155;">
        """

        for acc in acc_list:
            html += f"<li>{acc}</li>"

        html += f"""
                </ul>
            </td>
            <td style="width:50%; vertical-align:top; padding-left:10px;">
                <div class="section-title">Dimensions & CAD Cut-Out</div>
                <table style="width:100%;">
                    <tr>
                        <td style="vertical-align:middle; font-size:8.5pt; color:#334155;">
                            Diameter: <strong>{dims.get('diameter_mm') or details.get('cut_out', '—')}</strong><br>
                            Height: <strong>{dims.get('height_mm', '—')}</strong><br>
                            <em>{dims.get('notes', '')}</em>
                        </td>
                        <td style="text-align:right; vertical-align:middle;">
        """

        # Adaptive Technical Drawing container
        if tech_img:
            html += f'<img src="{tech_img}" style="max-height:85px; max-width:130px; object-fit:contain; border:1px solid #e2e8f0; padding:2px;" />'

        html += f"""
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <div style="margin-top:24px; border-top:1.5px solid #0f172a; padding-top:6px; font-size:8.5pt; font-weight:800; display:flex; justify-content:space-between;">
        <span>THE VAULT: Technical</span>
        <span style="font-size:7.5pt; font-weight:500; color:#64748b;">One To One &bull; Project: {project_name}</span>
    </div>
</div>

<!-- INSTALLATION SECTION -->
<div class="page-break"></div>
<div>
    <h1 style="font-size: 19pt; font-weight:900; margin:0 0 2px 0;">&bull; {type_code} Installation Instructions</h1>
    <div style="font-size:9.5pt; font-weight:700; color:#475569; margin-bottom:12px;">&bull; {range_name} &bull; Step-by-Step Guide</div>

    <div style="margin-top:12px;">
"""

        for st in steps:
            s_num = st.get("step_number", 1)
            s_title = st.get("title", f"Step {s_num}")
            s_inst = st.get("instruction", "")
            s_note = st.get("site_note", "")
            s_img = st.get("diagram_image_url")

            html += f"""
        <div class="step-card">
            <table style="width:100%;">
                <tr>
                    <td style="vertical-align:top;">
                        <div style="display:flex; align-items:center; margin-bottom:4px;">
                            <span class="step-number">{s_num}</span>
                            <strong style="font-size:10pt; color:#0f172a;">{s_title}</strong>
                        </div>
                        <p style="font-size:9pt; margin:0 0 4px 0; color:#334155; line-height:1.35;">{s_inst}</p>
                        {f'<div style="font-size:8pt; font-weight:600; color:#0369a1; background:#f0f9ff; padding:3px 6px; border-radius:3px; border-left:3px solid #0284c7;">💡 Site Note: {s_note}</div>' if s_note else ''}
                    </td>
                    """

            if s_img:
                html += f"""
                    <td style="width:120px; text-align:right; vertical-align:middle; padding-left:10px;">
                        <img src="{s_img}" style="max-height:85px; max-width:115px; object-fit:contain; border:1px solid #e2e8f0; padding:2px;" />
                    </td>
                """

            html += f"""
                </tr>
            </table>
        </div>
            """

        html += f"""
    </div>

    <div style="margin-top:24px; border-top:1.5px solid #0f172a; padding-top:6px; font-size:8.5pt; font-weight:800; display:flex; justify-content:space-between;">
        <span>THE VAULT: Installation</span>
        <span style="font-size:7.5pt; font-weight:500; color:#64748b;">One To One &bull; Fitting {type_code}</span>
    </div>
</div>
        """

    html += """
</body>
</html>
"""
    return html

def render_technical_pack_pdf(pack_data: Dict[str, Any]) -> bytes:
    """Renders the HTML layout into a PDF binary using xhtml2pdf."""
    html_content = build_technical_pack_html(pack_data)
    out = io.BytesIO()
    pisa_status = pisa.CreatePDF(html_content, dest=out)
    if pisa_status.err:
        logger.error(f"xhtml2pdf error occurred: {pisa_status.err}")
        raise RuntimeError("Failed to render technical pack PDF.")
    return out.getvalue()
