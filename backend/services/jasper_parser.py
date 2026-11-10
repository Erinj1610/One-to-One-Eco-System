import os
import xml.etree.ElementTree as ET
from typing import Dict, Any, List

NS = {'jr': 'http://jasperreports.sourceforge.net/jasperreports'}

def parse_jrxml_template(file_path: str) -> Dict[str, Any]:
    """
    Parses a JasperReports .jrxml file and returns a structured definition of:
    - Page sizes & margins
    - Parameters
    - Fields
    - Bands (title, group headers, detail columns, column headers, page footers)
    """
    if not os.path.exists(file_path):
        return {"error": f"Template not found at {file_path}"}

    tree = ET.parse(file_path)
    root = tree.getroot()

    # Determine namespace if any
    tag = root.tag
    ns = ""
    if tag.startswith("{"):
        ns = tag.split("}")[0] + "}"

    page_width = int(root.attrib.get("pageWidth", 595))
    page_height = int(root.attrib.get("pageHeight", 842))
    column_width = int(root.attrib.get("columnWidth", 555))
    left_margin = int(root.attrib.get("leftMargin", 20))
    right_margin = int(root.attrib.get("rightMargin", 20))
    top_margin = int(root.attrib.get("topMargin", 25))
    bottom_margin = int(root.attrib.get("bottomMargin", 25))

    parameters = {}
    for p in root.findall(f"{ns}parameter"):
        name = p.attrib.get("name")
        default_expr = p.find(f"{ns}defaultValueExpression")
        val = ""
        if default_expr is not None and default_expr.text:
            val = default_expr.text.strip().strip('"').replace('\\n', '\n')
        parameters[name] = val

    fields = [f.attrib.get("name") for f in root.findall(f"{ns}field")]

    # Extract Column Headers from GroupHeader or ColumnHeader
    columns = []
    # Check groupHeader staticTexts
    for st in root.findall(f".//{ns}groupHeader//{ns}staticText"):
        text_elem = st.find(f"{ns}text")
        rep_elem = st.find(f"{ns}reportElement")
        if text_elem is not None and rep_elem is not None:
            columns.append({
                "label": text_elem.text or "",
                "x": int(rep_elem.attrib.get("x", 0)),
                "y": int(rep_elem.attrib.get("y", 0)),
                "width": int(rep_elem.attrib.get("width", 50)),
                "height": int(rep_elem.attrib.get("height", 18)),
            })

    # Detail textFields and expressions
    detail_fields = []
    for tf in root.findall(f".//{ns}detail//{ns}textField"):
        expr = tf.find(f"{ns}textFieldExpression")
        rep = tf.find(f"{ns}reportElement")
        txt_elem = tf.find(f"{ns}textElement")
        font_elem = txt_elem.find(f"{ns}font") if txt_elem is not None else None

        detail_fields.append({
            "expression": expr.text if expr is not None else "",
            "x": int(rep.attrib.get("x", 0)) if rep is not None else 0,
            "y": int(rep.attrib.get("y", 0)) if rep is not None else 0,
            "width": int(rep.attrib.get("width", 50)) if rep is not None else 50,
            "height": int(rep.attrib.get("height", 18)) if rep is not None else 18,
            "forecolor": rep.attrib.get("forecolor", "#000000") if rep is not None else "#000000",
            "align": txt_elem.attrib.get("textAlignment", "left") if txt_elem is not None else "left",
            "isBold": font_elem.attrib.get("isBold") == "true" if font_elem is not None else False
        })

    return {
        "page": {
            "pageWidth": page_width,
            "pageHeight": page_height,
            "columnWidth": column_width,
            "leftMargin": left_margin,
            "rightMargin": right_margin,
            "topMargin": top_margin,
            "bottomMargin": bottom_margin
        },
        "parameters": parameters,
        "fields": fields,
        "columns": columns,
        "detailFields": detail_fields
    }

if __name__ == "__main__":
    import json
    data = parse_jrxml_template("jasper_templates/one_to_one_progress_report.jrxml")
    print(json.dumps(data, indent=2))
