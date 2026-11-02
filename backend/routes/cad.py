import os
import sys
import io
import json
import tempfile
import subprocess
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cad", tags=["CAD Ingestion"])

def get_cad_parser_command():
    base_dir = Path(__file__).resolve().parent.parent
    bin_dir = base_dir / "bin"
    
    if sys.platform.startswith("win"):
        # On Windows, prioritize the compiled dll via dotnet to bypass Defender executable locking
        rel_dll = base_dir / "cad_parser" / "bin" / "Release" / "net8.0" / "CadParser.dll"
        if rel_dll.exists():
            return ["dotnet", str(rel_dll)]
        dbg_dll = base_dir / "cad_parser" / "bin" / "Debug" / "net8.0" / "CadParser.dll"
        if dbg_dll.exists():
            return ["dotnet", str(dbg_dll)]
        win_exe = bin_dir / "cad-parser-win.exe"
        if win_exe.exists():
            return [str(win_exe)]
    else:
        linux_bin = bin_dir / "cad-parser-linux"
        if linux_bin.exists():
            try:
                # Ensure executable permissions in container
                os.chmod(linux_bin, 0o755)
            except Exception:
                pass
            return [str(linux_bin)]

    # Fallback to dotnet run if available
    csproj = base_dir / "cad_parser" / "CadParser.csproj"
    if csproj.exists():
        return ["dotnet", "run", "--project", str(csproj), "--"]

    raise HTTPException(
        status_code=500,
        detail="CAD parser binary not found and dotnet CLI unavailable."
    )

@router.post("/inspect")
async def inspect_cad_file(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".dwg"):
        raise HTTPException(status_code=400, detail="Only AutoCAD .dwg files are supported.")

    suffix = Path(file.filename).suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        while chunk := await file.read(1024 * 1024):
            tmp.write(chunk)

    try:
        cmd_prefix = get_cad_parser_command()
        cmd = cmd_prefix + ["inspect", tmp_path]
        logger.info(f"Running CAD inspect: {' '.join(cmd)}")
        
        env = os.environ.copy()
        env["DOTNET_gcServer"] = "0"
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=180,
            env=env
        )

        if proc.returncode != 0:
            logger.error(f"CAD inspect failed: {proc.stderr} | {proc.stdout}")
            try:
                err_data = json.loads(proc.stdout)
                detail = err_data.get("error", proc.stderr or "CAD inspection error")
            except Exception:
                detail = proc.stderr or proc.stdout or "CAD inspection failed"
            raise HTTPException(status_code=500, detail=detail)

        try:
            return json.loads(proc.stdout)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Invalid JSON response from CAD parser.")
    finally:
        if os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


@router.post("/parse")
async def parse_cad_file(
    file: UploadFile = File(...),
    engine: Optional[str] = Form("2.0"),
    lighting_layer: Optional[str] = Form(None),
    boundary_layer: Optional[str] = Form(None),
    default_floor: Optional[str] = Form("Ground Floor")
):
    if not file.filename.lower().endswith(".dwg"):
        raise HTTPException(status_code=400, detail="Only AutoCAD .dwg files are supported.")

    suffix = Path(file.filename).suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        while chunk := await file.read(1024 * 1024):
            tmp.write(chunk)

    try:
        cmd_prefix = get_cad_parser_command()
        cmd = cmd_prefix + ["parse", tmp_path]
        if engine:
            cmd.extend(["--engine", engine])
        if lighting_layer:
            cmd.extend(["--lighting-layer", lighting_layer])
        if boundary_layer:
            cmd.extend(["--boundary-layer", boundary_layer])
        if default_floor:
            cmd.extend(["--default-floor", default_floor])

        logger.info(f"Running CAD parse: {' '.join(cmd)}")
        
        env = os.environ.copy()
        env["DOTNET_gcServer"] = "0"
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=180,
            env=env
        )

        if proc.returncode != 0:
            logger.error(f"CAD parse failed: {proc.stderr} | {proc.stdout}")
            try:
                err_data = json.loads(proc.stdout)
                detail = err_data.get("error", proc.stderr or "CAD parsing error")
            except Exception:
                detail = proc.stderr or proc.stdout or "CAD parse failed"
            raise HTTPException(status_code=500, detail=detail)

        try:
            return json.loads(proc.stdout)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Invalid JSON response from CAD parser.")
    finally:
        if os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


class CountUpPdfExportRequest(BaseModel):
    orderId: Optional[str] = ""
    projectName: Optional[str] = "One to One Lighting Project"
    clientName: Optional[str] = ""
    date: Optional[str] = ""
    rows: List[Dict[str, Any]] = []
    summary: Optional[Dict[str, Any]] = {}


def generate_countup_pdf_html(order_id: str, project_name: str, client_name: str, date_str: str, rows: List[Dict[str, Any]], summary: Dict[str, Any]) -> str:
    total_qty = summary.get("totalQty", 0)
    total_fittings = summary.get("totalFittings", 0)
    total_led_m = summary.get("totalLedMeters", 0)
    total_track_m = summary.get("totalTrackMeters", 0)
    unique_tags_count = summary.get("uniqueTagsCount", 0)
    total_rooms_count = summary.get("totalRoomsCount", 0)

    rows_html = ""
    for idx, r in enumerate(rows, 1):
        bg_class = "row-even" if idx % 2 == 0 else "row-odd"
        tag = (r.get("tag") or "").strip().upper()
        ff = r.get("firstFix") or "No"
        ff_html = "<span style='color: #b45309; font-weight: bold;'>Yes (FF)</span>" if ff in ["Yes", "Yes (FF)"] else "<span style='color: #64748b;'>No</span>"
        
        item_type = r.get("itemType") or "fixture"
        type_badge = "Fitting"
        if item_type == "linear_led":
            type_badge = "Linear LED"
        elif item_type == "track_system":
            type_badge = "Track System"
        
        qty_str = f"{r.get('qty', 1)} {r.get('unit', 'pcs')}"
        mapping = r.get("catalogSku") or r.get("catalogName") or "-"
        notes = r.get("notes") or "-"

        rows_html += f"""
        <tr class="{bg_class}">
            <td align="center" style="color: #64748b;">{idx}</td>
            <td style="font-family: Courier, monospace; font-weight: bold; color: #1d4ed8;">{tag}</td>
            <td>{type_badge}</td>
            <td align="center">{ff_html}</td>
            <td>{r.get('floor') or '-'}</td>
            <td><strong>{r.get('area') or '-'}</strong></td>
            <td align="center"><strong>{qty_str}</strong></td>
            <td style="color: #334155;">{notes}</td>
            <td style="color: #475569;">{mapping}</td>
        </tr>
        """

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @page {{
    size: a4 landscape;
    margin: 10mm 12mm 12mm 12mm;
  }}
  body {{
    font-family: Helvetica, Arial, sans-serif;
    color: #0f172a;
    font-size: 8.5pt;
    line-height: 1.3;
  }}
  .brand-bar {{
    width: 100%;
    border-bottom: 2pt solid #2563eb;
    padding-bottom: 6px;
    margin-bottom: 8px;
  }}
  .title {{
    font-size: 15pt;
    font-weight: bold;
    color: #1e3a8a;
  }}
  .subtitle {{
    font-size: 8.5pt;
    color: #475569;
  }}
  .kpi-table {{
    width: 100%;
    margin-bottom: 8px;
    background-color: #f8fafc;
    border: 0.5pt solid #cbd5e1;
  }}
  .kpi-cell {{
    padding: 6px 10px;
    border-right: 0.5pt solid #e2e8f0;
  }}
  .kpi-label {{
    font-size: 7.5pt;
    color: #64748b;
    text-transform: uppercase;
    font-weight: bold;
  }}
  .kpi-val {{
    font-size: 10pt;
    font-weight: bold;
    color: #0f172a;
    margin-top: 1px;
  }}
  .data-table {{
    width: 100%;
    border-collapse: collapse;
  }}
  .data-table th {{
    background-color: #1e293b;
    color: #ffffff;
    font-size: 8pt;
    font-weight: bold;
    text-transform: uppercase;
    padding: 6px 6px;
    border: 0.5pt solid #0f172a;
  }}
  .data-table td {{
    padding: 4px 6px;
    font-size: 8pt;
    border: 0.5pt solid #e2e8f0;
  }}
  .row-even {{
    background-color: #ffffff;
  }}
  .row-odd {{
    background-color: #f8fafc;
  }}
  .footer-tbl {{
    width: 100%;
    margin-top: 10px;
    font-size: 7.5pt;
    color: #64748b;
    border-top: 0.5pt solid #cbd5e1;
    padding-top: 4px;
  }}
</style>
</head>
<body>
  <table class="brand-bar">
    <tr>
      <td>
        <div class="title">ONE TO ONE ECO SYSTEM &bull; ROOM-BY-ROOM COUNT-UP</div>
        <div class="subtitle">Lighting Fixture Schedule &amp; Spatial Takeoff Extraction</div>
      </td>
      <td align="right">
        <div style="font-size: 9pt; font-weight: bold; color: #0f172a;">Order Ref: {order_id or 'TAKEOFF-DRAFT'}</div>
        <div style="font-size: 8pt; color: #64748b;">Generated: {date_str}</div>
      </td>
    </tr>
  </table>

  <table class="kpi-table">
    <tr>
      <td class="kpi-cell"><div class="kpi-label">Project</div><div class="kpi-val">{project_name or 'General Project'}</div></td>
      <td class="kpi-cell"><div class="kpi-label">Total Fittings</div><div class="kpi-val">{total_fittings} pcs</div></td>
      <td class="kpi-cell"><div class="kpi-label">Linear LED</div><div class="kpi-val">{total_led_m} m</div></td>
      <td class="kpi-cell"><div class="kpi-label">Track Runs</div><div class="kpi-val">{total_track_m} m</div></td>
      <td class="kpi-cell"><div class="kpi-label">Unique Tags</div><div class="kpi-val">{unique_tags_count} Tags</div></td>
      <td class="kpi-cell"><div class="kpi-label">Rooms Covered</div><div class="kpi-val">{total_rooms_count} Rooms</div></td>
    </tr>
  </table>

  <table class="data-table">
    <thead>
      <tr>
        <th width="4%">#</th>
        <th width="9%">Tag</th>
        <th width="10%">Type</th>
        <th width="8%">First Fix</th>
        <th width="13%">Floor</th>
        <th width="18%">Room / Area</th>
        <th width="9%">Qty / Length</th>
        <th width="17%">Mounting &amp; Notes</th>
        <th width="12%">Catalog Mapping</th>
      </tr>
    </thead>
    <tbody>
      {rows_html}
    </tbody>
  </table>

  <table class="footer-tbl">
    <tr>
      <td>One to One Eco System &bull; Takeoff &amp; Specification Engine &bull; Confidential</td>
      <td align="right">Page <pdf:pagenumber> of <pdf:pagecount></td>
    </tr>
  </table>
</body>
</html>"""
    return html


@router.post("/export-countup-pdf")
async def export_countup_pdf(req: CountUpPdfExportRequest):
    try:
        from xhtml2pdf import pisa
        html = generate_countup_pdf_html(
            order_id=req.orderId or "",
            project_name=req.projectName or "General Project",
            client_name=req.clientName or "",
            date_str=req.date or "N/A",
            rows=req.rows,
            summary=req.summary or {}
        )
        buf = io.BytesIO()
        pisa_status = pisa.CreatePDF(html, dest=buf)
        if pisa_status.err:
            raise HTTPException(status_code=500, detail=f"PDF rendering error: {pisa_status.err}")
        
        pdf_bytes = buf.getvalue()
        clean_name = (req.orderId or req.projectName or "Takeoff").replace(" ", "_").replace("/", "-")
        filename = f"Takeoff_Room_CountUp_{clean_name}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        logger.error(f"Error generating countup PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))
