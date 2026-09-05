import os
import sys
import json
import tempfile
import subprocess
import logging
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cad", tags=["CAD Ingestion"])

def get_cad_parser_command():
    base_dir = Path(__file__).resolve().parent.parent
    bin_dir = base_dir / "bin"
    
    if sys.platform.startswith("win"):
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
