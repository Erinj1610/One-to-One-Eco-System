import os
import json
import tempfile
import logging
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

def normalize_jrxml_for_engine(source_jrxml_path: str) -> str:
    """
    Jaspersoft Studio 7+ introduces <element kind="..."> without XML namespace attributes,
    or with modern element tags.
    This normalizes the JRXML into standard JasperReports 6.x XML so the Jasper compilation
    engine compiles and renders it into authentic PDF.
    """
    with open(source_jrxml_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Ensure root has standard Jasper schema declarations
    if '<jasperReport' in content and 'xmlns="http://jasperreports.sourceforge.net/jasperreports"' not in content:
        content = content.replace(
            '<jasperReport',
            '<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"'
        )

    tree = ET.fromstring(content)

    # Namespace handling
    ns_prefix = ""
    if tree.tag.startswith("{"):
        ns_prefix = tree.tag.split("}")[0] + "}"

    # Rename <description> inside <field> to <fieldDescription>
    for f in tree.iter():
        if f.tag.endswith("field"):
            for child in f:
                if child.tag.endswith("description"):
                    child.tag = f"{ns_prefix}fieldDescription"

    # Rename <expression> inside <group> to <groupExpression>
    for g in tree.iter():
        if g.tag.endswith("group") and not g.tag.endswith("groupHeader") and not g.tag.endswith("groupFooter"):
            for child in g:
                if child.tag.endswith("expression"):
                    child.tag = f"{ns_prefix}groupExpression"

    # Check if modern Studio 7 elements exist using universal wildcard {* }
    modern_elements = [e for e in tree.iter() if e.tag.endswith("element") and "kind" in e.attrib]

    if modern_elements:
        for parent in list(tree.iter()):
            for child in list(parent):
                if child.tag.endswith("element") and "kind" in child.attrib:
                    kind = child.attrib.pop("kind")
                    child.tag = f"{ns_prefix}{kind}"

                    # Create reportElement child
                    rep_elem = ET.Element(f"{ns_prefix}reportElement")
                    rep_attribs = ["x", "y", "width", "height", "uuid", "forecolor", "backcolor", "mode", "key"]
                    for a in rep_attribs:
                        if a in child.attrib:
                            rep_elem.attrib[a] = child.attrib.pop(a)
                    child.insert(0, rep_elem)

                    # Move textElement properties
                    text_attribs = ["hTextAlign", "vTextAlign"]
                    has_text_props = any(a in child.attrib for a in text_attribs)
                    font_attribs = ["fontName", "fontSize", "bold", "italic", "underline"]
                    has_font_props = any(a in child.attrib for a in font_attribs)

                    if has_text_props or has_font_props:
                        txt_elem = ET.Element(f"{ns_prefix}textElement")
                        if "hTextAlign" in child.attrib:
                            txt_elem.attrib["textAlignment"] = child.attrib.pop("hTextAlign")
                        if "vTextAlign" in child.attrib:
                            txt_elem.attrib["verticalAlignment"] = child.attrib.pop("vTextAlign")

                        if has_font_props:
                            f_elem = ET.Element(f"{ns_prefix}font")
                            if "fontName" in child.attrib:
                                f_elem.attrib["fontName"] = child.attrib.pop("fontName")
                            if "fontSize" in child.attrib:
                                f_elem.attrib["size"] = str(int(float(child.attrib.pop("fontSize"))))
                            if "bold" in child.attrib:
                                f_elem.attrib["isBold"] = child.attrib.pop("bold")
                            if "italic" in child.attrib:
                                f_elem.attrib["isItalic"] = child.attrib.pop("italic")
                            if "underline" in child.attrib:
                                f_elem.attrib["isUnderline"] = child.attrib.pop("underline")
                            txt_elem.append(f_elem)

                        child.append(txt_elem)

                    # Move expression to textFieldExpression
                    expr = None
                    for c in child:
                        if c.tag.endswith("expression"):
                            expr = c
                            break
                    if expr is not None and kind == "textField":
                        expr.tag = f"{ns_prefix}textFieldExpression"

    fd, temp_norm = tempfile.mkstemp(suffix=".jrxml")
    os.close(fd)
    ET.ElementTree(tree).write(temp_norm, encoding="utf-8", xml_declaration=True)
    return temp_norm


def compile_and_render_jasper_report(
    jrxml_path: str,
    data: List[Dict[str, Any]],
    parameters: Optional[Dict[str, Any]] = None,
    output_pdf_path: Optional[str] = None
) -> str:
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
