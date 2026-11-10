import os
import json
import tempfile
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

def compile_and_render_jasper_report(
    jrxml_path: str,
    data: List[Dict[str, Any]],
    parameters: Optional[Dict[str, Any]] = None,
    output_pdf_path: Optional[str] = None
) -> str:
    """
    Takes an actual JasperReports .jrxml template file and dynamic data,
    and uses the JasperReports compilation engine to generate an authentic PDF.
    """
    from pyreportjasper import PyReportJasper

    if not os.path.exists(jrxml_path):
        raise FileNotFoundError(f"Jasper template not found at {jrxml_path}")

    if not output_pdf_path:
        fd, output_pdf_path = tempfile.mkstemp(suffix=".pdf")
        os.close(fd)

    # Base name without .pdf extension because pyreportjasper appends extension
    output_base = output_pdf_path
    if output_base.lower().endswith(".pdf"):
        output_base = output_base[:-4]

    # Write data payload to temp JSON file for Jasper engine
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
        temp_data_file = f.name

    try:
        jasper = PyReportJasper()
        config_kwargs = {
            "input_file": jrxml_path,
            "output_file": output_base,
            "output_formats": ["pdf"],
            "db_connection": {
                "data_file": temp_data_file,
                "driver": "json",
                "json_query": ""
            }
        }
        if parameters:
            config_kwargs["parameters"] = parameters

        jasper.config(**config_kwargs)
        jasper.process_report()

        actual_output = output_base + ".pdf"
        if os.path.exists(actual_output):
            return actual_output
        elif os.path.exists(output_pdf_path):
            return output_pdf_path
        else:
            raise RuntimeError(f"Jasper failed to generate output PDF at {output_base}.pdf")
    finally:
        if os.path.exists(temp_data_file):
            try:
                os.remove(temp_data_file)
            except Exception:
                pass
