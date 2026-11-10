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

    # Automatically add missing <field> declarations for any $F{...} referenced in expressions
    import re
    used_fields = set(re.findall(r"\$F\{([^\}]+)\}", content))
    declared_fields = set(re.findall(r'<field\s+name="([^"]+)"', content))
    missing_fields = sorted(list(used_fields - declared_fields))
    if missing_fields:
        field_xmls = []
        for mf in missing_fields:
            field_type = "java.lang.Integer" if "qty" in mf.lower() else ("java.lang.Double" if ("received" in mf.lower() or "backorder" in mf.lower()) else "java.lang.String")
            field_xmls.append(f'\t<field name="{mf}" class="{field_type}"/>')
        # Insert before first <group or <title or <band or <detail
        insert_marker = None
        for m in ['<group', '<title', '<detail', '<pageHeader']:
            if m in content:
                insert_marker = m
                break
        if insert_marker:
            content = content.replace(insert_marker, "\n".join(field_xmls) + "\n\t" + insert_marker, 1)

    # Standardize system fonts across the whole template to JVM core fonts (avoids JRFontNotFoundException on Linux)
    content = content.replace('fontName="Courier New"', 'fontName="Monospaced"')
    content = content.replace('fontName="Courier"', 'fontName="Monospaced"')
    content = content.replace('fontName="Arial"', 'fontName="SansSerif"')
    content = content.replace('fontName="Helvetica"', 'fontName="SansSerif"')
    content = content.replace('fontName="Times New Roman"', 'fontName="Serif"')

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

                    # In JasperReports 6.x schema, printWhenExpression is a child of reportElement!
                    for c in list(child):
                        if c.tag.endswith("printWhenExpression"):
                            child.remove(c)
                            c.tag = f"{ns_prefix}printWhenExpression"
                            rep_elem.append(c)
                            break

                    child.insert(0, rep_elem)

                    # Rename blankWhenNull to isBlankWhenNull on textField for JasperReports 6.x
                    if "blankWhenNull" in child.attrib:
                        child.attrib["isBlankWhenNull"] = child.attrib.pop("blankWhenNull")
                    if "textAdjust" in child.attrib:
                        adjust = child.attrib.pop("textAdjust")
                        if adjust == "StretchHeight":
                            child.attrib["isStretchWithOverflow"] = "true"

                    # Move textElement properties & paragraph
                    text_attribs = ["hTextAlign", "vTextAlign"]
                    has_text_props = any(a in child.attrib for a in text_attribs)
                    font_attribs = ["fontName", "fontSize", "bold", "italic", "underline"]
                    has_font_props = any(a in child.attrib for a in font_attribs)
                    
                    # Check for paragraph child in modern Studio 7
                    paragraph_child = None
                    for c in list(child):
                        if c.tag.endswith("paragraph"):
                            paragraph_child = c
                            child.remove(c)
                            break

                    if has_text_props or has_font_props or paragraph_child is not None:
                        txt_elem = ET.Element(f"{ns_prefix}textElement")
                        if "hTextAlign" in child.attrib:
                            txt_elem.attrib["textAlignment"] = child.attrib.pop("hTextAlign")
                        if "vTextAlign" in child.attrib:
                            txt_elem.attrib["verticalAlignment"] = child.attrib.pop("vTextAlign")

                        if has_font_props:
                            f_elem = ET.Element(f"{ns_prefix}font")
                            if "fontName" in child.attrib:
                                font_val = child.attrib.pop("fontName")
                                # Standard Java headless JVM font mappings (avoid JRFontNotFoundException)
                                if font_val in ["Courier New", "Courier", "monospace"]:
                                    font_val = "Monospaced"
                                elif font_val in ["Times New Roman", "Times", "serif"]:
                                    font_val = "Serif"
                                elif font_val in ["Arial", "Helvetica", "sans-serif"]:
                                    font_val = "SansSerif"
                                f_elem.attrib["fontName"] = font_val
                            if "fontSize" in child.attrib:
                                f_elem.attrib["size"] = str(int(float(child.attrib.pop("fontSize"))))
                            if "bold" in child.attrib:
                                f_elem.attrib["isBold"] = child.attrib.pop("bold")
                            if "italic" in child.attrib:
                                f_elem.attrib["isItalic"] = child.attrib.pop("italic")
                            if "underline" in child.attrib:
                                f_elem.attrib["isUnderline"] = child.attrib.pop("underline")
                            txt_elem.append(f_elem)

                        if paragraph_child is not None:
                            paragraph_child.tag = f"{ns_prefix}paragraph"
                            txt_elem.append(paragraph_child)

                        # In JasperReports schema, textElement MUST come BEFORE textFieldExpression / patternExpression
                        child.insert(1, txt_elem)

                    # Move expression to textFieldExpression or imageExpression
                    expr = None
                    for c in child:
                        if c.tag.endswith("expression"):
                            expr = c
                            break
                    if expr is not None:
                        if kind == "textField":
                            expr.tag = f"{ns_prefix}textFieldExpression"
                        elif kind == "image":
                            # If expression is empty string or empty quotes, drop the image element to avoid
                            # "The byte array is not a recognized imageformat" during PDF export
                            if not expr.text or expr.text.strip() in ['""', "''", 'null', '']:
                                parent.remove(child)
                                continue
                            expr.tag = f"{ns_prefix}imageExpression"

    # Wrap <pen> inside <graphicElement> for line, rectangle, ellipse, etc. in JasperReports 6.x
    for elem in tree.iter():
        tag_name = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
        if tag_name in ("line", "rectangle", "ellipse"):
            pen = None
            for c in list(elem):
                c_name = c.tag.split("}")[-1] if "}" in c.tag else c.tag
                if c_name == "pen":
                    pen = c
                    elem.remove(c)
                    break
            if pen is not None:
                # In JasperReports 6.x schema: graphicElement must contain pen
                graphic_elem = ET.Element(f"{ns_prefix}graphicElement")
                graphic_elem.append(pen)
                # graphicElement should be placed after reportElement if reportElement exists
                if len(elem) > 0 and (elem[0].tag.endswith("reportElement")):
                    elem.insert(1, graphic_elem)
                else:
                    elem.insert(0, graphic_elem)

    # In JasperReports 6.x schema, sections like <title>, <pageHeader>, <columnHeader>, <pageFooter>, <summary>
    # MUST contain a <band> child. Studio 7 placed elements and height directly on the section tag.
    band_container_tags = [
        "background", "title", "pageHeader", "columnHeader",
        "groupHeader", "groupFooter", "columnFooter", "pageFooter",
        "lastPageFooter", "summary", "noData"
    ]
    for parent in list(tree.iter()):
        for sec in list(parent):
            tag_name = sec.tag.split("}")[-1] if "}" in sec.tag else sec.tag
            if tag_name in band_container_tags:
                has_band = any((c.tag.split("}")[-1] if "}" in c.tag else c.tag) == "band" for c in sec)
                if not has_band:
                    # Move all children and band-related attributes into a <band> child
                    band = ET.Element(f"{ns_prefix}band")
                    for attr in ["height", "splitType"]:
                        if attr in sec.attrib:
                            band.attrib[attr] = sec.attrib.pop(attr)
                    for c in list(sec):
                        sec.remove(c)
                        band.append(c)
                    sec.append(band)

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
