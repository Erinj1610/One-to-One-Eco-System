import os
import json
import tempfile
import logging
import re
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

def normalize_jrxml_for_engine(source_jrxml_path: str) -> str:
    """
    Jaspersoft Studio 7+ introduces <element kind="..."> and omits XML namespace attributes,
    or adds attributes like uuid without the standard JasperReports schema definition.
    This normalizes the JRXML into standard JasperReports 6.x XML so jasperreports-6.20 engine
    compiles and renders it seamlessly.
    """
    with open(source_jrxml_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Ensure root has standard Jasper schema declarations
    if '<jasperReport' in content and 'xmlns="http://jasperreports.sourceforge.net/jasperreports"' not in content:
        content = content.replace(
            '<jasperReport',
            '<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"'
        )

    # Convert Studio 7 <element kind="staticText" ...> to <staticText><reportElement .../>
    # If the user saved in Studio 7 format:
    tree = ET.fromstring(content)
    
    # Check if modern Studio 7 elements exist
    has_modern_elements = len(tree.findall(".//element")) > 0

    if has_modern_elements:
        # Transform modern <element kind="X"> to classic <X><reportElement>
        def transform_element(elem):
            kind = elem.attrib.get("kind")
            if not kind:
                return
            elem.tag = kind
            # Create reportElement child
            rep_elem = ET.Element("reportElement")
            rep_attribs = ["x", "y", "width", "height", "uuid", "forecolor", "backcolor", "mode", "key"]
            for a in rep_attribs:
                if a in elem.attrib:
                    rep_elem.attrib[a] = elem.attrib.pop(a)
            elem.insert(0, rep_elem)
            elem.attrib.pop("kind", None)

            # Move textElement properties
            text_attribs = ["hTextAlign", "vTextAlign"]
            has_text_props = any(a in elem.attrib for a in text_attribs)
            font_attribs = ["fontName", "fontSize", "bold", "italic", "underline"]
            has_font_props = any(a in elem.attrib for a in font_attribs)

            if has_text_props or has_font_props:
                txt_elem = ET.Element("textElement")
                if "hTextAlign" in elem.attrib:
                    txt_elem.attrib["textAlignment"] = elem.attrib.pop("hTextAlign")
                if "vTextAlign" in elem.attrib:
                    txt_elem.attrib["verticalAlignment"] = elem.attrib.pop("vTextAlign")

                if has_font_props:
                    f_elem = ET.Element("font")
                    if "fontName" in elem.attrib:
                        f_elem.attrib["fontName"] = elem.attrib.pop("fontName")
                    if "fontSize" in elem.attrib:
                        f_elem.attrib["size"] = str(int(float(elem.attrib.pop("fontSize"))))
                    if "bold" in elem.attrib:
                        f_elem.attrib["isBold"] = elem.attrib.pop("bold")
                    if "italic" in elem.attrib:
                        f_elem.attrib["isItalic"] = elem.attrib.pop("italic")
                    if "underline" in elem.attrib:
                        f_elem.attrib["isUnderline"] = elem.attrib.pop("underline")
                    txt_elem.append(f_elem)

                elem.append(txt_elem)

            # Move expression to textFieldExpression
            expr = elem.find("expression")
            if expr is not None and kind == "textField":
                expr.tag = "textFieldExpression"

        for parent in tree.iter():
            for child in list(parent):
                if child.tag == "element":
                    transform_element(child)

        # Output normalized XML
        fd, temp_norm = tempfile.mkstemp(suffix=".jrxml")
        os.close(fd)
        ET.ElementTree(tree).write(temp_norm, encoding="utf-8", xml_declaration=True)
        return temp_norm

    fd, temp_norm = tempfile.mkstemp(suffix=".jrxml")
    os.close(fd)
    with open(temp_norm, 'w', encoding='utf-8') as f:
        f.write(content)
    return temp_norm


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

    normalized_jrxml = normalize_jrxml_for_engine(jrxml_path)

    if not output_pdf_path:
        fd, output_pdf_path = tempfile.mkstemp(suffix=".pdf")
        os.close(fd)

    output_base = output_pdf_path
    if output_base.lower().endswith(".pdf"):
        output_base = output_base[:-4]

    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
        temp_data_file = f.name

    try:
        jasper = PyReportJasper()
        config_kwargs = {
            "input_file": normalized_jrxml,
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
        if os.path.exists(normalized_jrxml) and normalized_jrxml != jrxml_path:
            try:
                os.remove(normalized_jrxml)
            except Exception:
                pass
