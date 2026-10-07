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

logger = logging.getLogger(__name__)

# SSL Context bypass for Windows Python OpenSSL certificate issues
_SSL_CTX = ssl.create_default_context()
_SSL_CTX.check_hostname = False
_SSL_CTX.verify_mode = ssl.CERT_NONE

PROJECT_ID = "one-to-one-portal-500205"
LOCATION = "us-central1"
MODEL_NAME = "gemini-2.5-flash"

def get_gcp_access_token() -> str:
    """Acquires a valid GCP OAuth access token."""
    creds, project = google.auth.default(scopes=['https://www.googleapis.com/auth/cloud-platform'])
    
    # In Windows local dev, if credentials need refresh, do so with ssl bypass
    token_url = 'https://oauth2.googleapis.com/token'
    data = urllib.parse.urlencode({
        'client_id': getattr(creds, 'client_id', ''),
        'client_secret': getattr(creds, 'client_secret', ''),
        'refresh_token': getattr(creds, 'refresh_token', ''),
        'grant_type': 'refresh_token'
    }).encode('utf-8')

    try:
        req = urllib.request.Request(token_url, data=data)
        with urllib.request.urlopen(req, context=_SSL_CTX, timeout=10) as resp:
            res = json.loads(resp.read().decode('utf-8'))
            return res.get('access_token', '')
    except Exception as e:
        logger.warning(f"Direct token refresh via urllib failed, attempting creds.token: {e}")
        if hasattr(creds, 'token') and creds.token:
            return creds.token
        raise RuntimeError(f"Could not acquire GCP access token for Vertex AI: {e}")

def call_gemini_multimodal(prompt: str, pdf_bytes_list: Optional[List[bytes]] = None) -> Dict[str, Any]:
    """Calls Gemini 2.5 Flash on Vertex AI with text and optional PDF attachments."""
    token = get_gcp_access_token()
    url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/{MODEL_NAME}:generateContent"

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

    with urllib.request.urlopen(req, context=_SSL_CTX, timeout=60) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        cand = res.get('candidates', [{}])[0]
        text_resp = cand.get('content', {}).get('parts', [{}])[0].get('text', '{}')
        return json.loads(text_resp)

def analyze_fitting_with_supplier_docs(
    fitting_meta: Dict[str, Any],
    supplier_pdf_bytes_list: List[bytes]
) -> Dict[str, Any]:
    """
    Analyzes supplier datasheets & installation manuals in conjunction with BOQ fitting metadata.
    Calculates driver wiring, ratings, dimensions, cut-out, and step-by-step installation instructions.
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
  "range_name": "Copper Range", // Default to 'Copper Range' or appropriate range
  "installation_tag": "Easy Installation", // e.g. Easy Installation, Moderate Installation, Complex Installation
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
  "installation_steps": [
    {{
      "step_number": 1,
      "title": "Cut-out",
      "instruction": "Adhere to the cut-out as below. Ensure ceiling depth is larger than the height of the installation. The ceiling height must be 1-20mm.",
      "site_note": "Note, downlight cannot install correctly on a ceiling thickness above 20mm. Ceiling would need to be routed from inside."
    }},
    {{
      "step_number": 2,
      "title": "Connections",
      "instruction": "Connect the Live and Neutral of the AC Mains to the included driver primary terminals while mains power is switched off.",
      "site_note": "Twist the outer frame in while holding the spring wings down."
    }},
    {{
      "step_number": 3,
      "title": "Assembly & Inner Ring",
      "instruction": "Insert the frame into the ceiling cut-out and twist clockwise until firmly seated. Insert module/lamp into position.",
      "site_note": "Ensure honeycomb accessory is seated before clipping module into the frame."
    }}
  ]
}}

Analyze both the text and visual diagrams in the PDFs thoroughly to populate these values accurately.
"""

    return call_gemini_multimodal(prompt, supplier_pdf_bytes_list)

def build_technical_pack_html(pack_data: Dict[str, Any]) -> str:
    """
    Builds the clean, high-contrast, Swiss-typography One to One Technical Pack HTML
    matching 'Our Technical Pack.pdf' and 'Our Technical Sheet.pdf'.
    """
    project_name = pack_data.get("project_name", "One to One Project")
    fittings = pack_data.get("fittings", [])

    # Calculate page numbers for Table of Contents
    # Cover is Page 1, Contents is Page 2.
    current_page = 3
    toc_items = []
    for fit in fittings:
        inst_steps_count = len(fit.get("installation_steps", []))
        # Front page (1 pg) + Installation pages (1-2 pgs) + Accessories (1 pg)
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

    # Render dot rating helper
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
    margin-top: 12px;
    margin-bottom: 6px;
}}
.spec-table {{
    width: 100%;
    margin-bottom: 10px;
}}
.spec-table td {{
    padding: 3px 4px;
    font-size: 8.5pt;
    vertical-align: top;
}}
.spec-table td.label {{
    width: 38%;
    font-weight: bold;
    color: #334155;
}}
.spec-table td.val {{
    width: 62%;
    color: #0f172a;
}}
.connection-box {{
    border: 1px solid #0f172a;
    padding: 8px 10px;
    background-color: #f8fafc;
    font-size: 8.5pt;
    margin-bottom: 10px;
}}
.connection-box ul {{
    margin: 4px 0 0 14px;
    padding: 0;
}}
.step-card {{
    border: 1px solid #e2e8f0;
    padding: 8px 10px;
    margin-bottom: 10px;
    background-color: #ffffff;
}}
.step-badge {{
    font-weight: bold;
    font-size: 10pt;
    color: #0f172a;
    margin-right: 6px;
}}
</style>
</head>
<body>

<!-- 1. COVER PAGE -->
<div class="cover-page">
    <div class="cover-logo">
        &bull; ONE TO<br>&bull; ONE
    </div>
    <div class="cover-subtitle">
        BY MARTIN DOLLER
    </div>
    <div class="cover-title">
        Technical Pack
    </div>
    <div class="cover-project">
        Project: {project_name}
    </div>
</div>

<!-- 2. TABLE OF CONTENTS -->
<div class="page-break"></div>
<div>
    <div class="toc-title">Contents</div>
    <div style="width: 80%; margin-top: 30px;">
"""

    for item in toc_items:
        html += f"""
        <table style="width:100%; border-bottom:1px dotted #cbd5e1; margin-bottom: 10px; font-size:13pt;">
            <tr>
                <td style="font-weight:800; text-align:left;">• {item['type_code']}</td>
                <td style="text-align:right; font-weight:700; color:#475569;">{item['range']}</td>
            </tr>
        </table>
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
        fitting_desc = fit.get("fitting", {}).get("description", "")
        details = fit.get("details", {})
        conn = fit.get("connection", {})
        acc_list = fit.get("accessories_summary", [])
        dims = fit.get("dimensions", {})
        steps = fit.get("installation_steps", [])

        # FRONT TECHNICAL PAGE
        html += f"""
<div class="page-break"></div>
<div>
    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
            <h1 style="font-size: 24pt; font-weight:900; margin:0 0 2px 0;">● {type_code}</h1>
            <div style="font-size:11pt; font-weight:700; color:#475569; margin-bottom:8px;">● {range_name}</div>
            <div class="header-badge">{tag}</div>
            
            <div style="margin-top: 8px;">
                <table style="font-size:8pt; color:#334155;">
                    <tr><td style="padding:1px 6px 1px 0;">Cost:</td><td>{render_dots(ratings.get('cost', 1))}</td></tr>
                    <tr><td style="padding:1px 6px 1px 0;">Quality:</td><td>{render_dots(ratings.get('quality', 3))}</td></tr>
                    <tr><td style="padding:1px 6px 1px 0;">Size:</td><td>{render_dots(ratings.get('size', 3))}</td></tr>
                    <tr><td style="padding:1px 6px 1px 0;">Difficulty:</td><td>{render_dots(ratings.get('difficulty', 2))}</td></tr>
                    <tr><td style="padding:1px 6px 1px 0;">Versatility:</td><td>{render_dots(ratings.get('versatility', 4))}</td></tr>
                </table>
            </div>
        </div>
    </div>

    <div class="section-title">Fitting Description</div>
    <div style="font-size:10pt; font-weight:600; margin-bottom:12px;">{fitting_desc}</div>

    <table style="width:100%;">
        <tr>
            <td style="width:50%; vertical-align:top; padding-right:12px;">
                <div class="section-title">Details</div>
                <table class="spec-table">
                    <tr><td class="label">Cut-Out:</td><td class="val">{details.get('cut_out', '—')}</td></tr>
                    <tr><td class="label">Ingress Protection:</td><td class="val">{details.get('ingress_protection', 'IP20')}</td></tr>
                    <tr><td class="label">Dimming Protocol:</td><td class="val">{details.get('dimming_protocol', 'On-Off')}</td></tr>
                    <tr><td class="label">Driver:</td><td class="val">{details.get('driver', 'Yes')}</td></tr>
                    <tr><td class="label">Light Source:</td><td class="val">{details.get('light_source', '—')}</td></tr>
                    <tr><td class="label">CRI:</td><td class="val">{details.get('cri', '80')}</td></tr>
                </table>
            </td>
            <td style="width:50%; vertical-align:top; padding-left:12px;">
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

    <table style="width:100%; margin-top:8px;">
        <tr>
            <td style="width:50%; vertical-align:top; padding-right:12px;">
                <div class="section-title">Accessories Included</div>
                <ul style="font-size:9pt; margin:4px 0 0 16px; padding:0; color:#334155;">
        """

        for acc in acc_list:
            html += f"<li>{acc}</li>"

        html += f"""
                </ul>
            </td>
            <td style="width:50%; vertical-align:top; padding-left:12px;">
                <div class="section-title">Dimensions</div>
                <div style="font-size:9pt; color:#334155;">
                    Diameter: <strong>{dims.get('diameter_mm', '—')}</strong><br>
                    Height: <strong>{dims.get('height_mm', '—')}</strong><br>
                    <em>{dims.get('notes', '')}</em>
                </div>
            </td>
        </tr>
    </table>

    <div style="margin-top:30px; border-top:1.5px solid #0f172a; padding-top:6px; font-size:9pt; font-weight:800; display:flex; justify-content:space-between;">
        <span>THE VAULT: Technical</span>
        <span style="font-size:7.5pt; font-weight:500; color:#64748b;">One To One • Project: {project_name}</span>
    </div>
</div>

<!-- INSTALLATION SECTION -->
<div class="page-break"></div>
<div>
    <h1 style="font-size: 20pt; font-weight:900; margin:0 0 2px 0;">● {type_code} Installation Instructions</h1>
    <div style="font-size:10pt; font-weight:700; color:#475569; margin-bottom:14px;">● {range_name} • Step-by-Step Guide</div>

    <div style="margin-top:16px;">
"""

        for st in steps:
            s_num = st.get("step_number", 1)
            s_title = st.get("title", f"Step {s_num}")
            s_inst = st.get("instruction", "")
            s_note = st.get("site_note", "")

            html += f"""
        <div class="step-card">
            <div style="display:flex; align-items:center; margin-bottom:6px;">
                <span class="step-number">{s_num}</span>
                <strong style="font-size:11pt; color:#0f172a;">{s_title}</strong>
            </div>
            <p style="font-size:9.5pt; margin:0 0 6px 0; color:#334155; line-height:1.4;">{s_inst}</p>
            {f'<div style="font-size:8.5pt; font-weight:600; color:#0369a1; background:#f0f9ff; padding:4px 8px; border-radius:4px; border-left:3px solid #0284c7;">💡 Site Note: {s_note}</div>' if s_note else ''}
        </div>
            """

        html += f"""
    </div>

    <div style="margin-top:30px; border-top:1.5px solid #0f172a; padding-top:6px; font-size:9pt; font-weight:800; display:flex; justify-content:space-between;">
        <span>THE VAULT: Installation</span>
        <span style="font-size:7.5pt; font-weight:500; color:#64748b;">One To One • Fitting {type_code}</span>
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
