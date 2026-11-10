import os
import xml.etree.ElementTree as ET
from typing import Dict, Any, List

def parse_jrxml_template(file_path: str) -> Dict[str, Any]:
    """
    Parses a JasperReports .jrxml file supporting both:
    1. Classic JasperReports (<staticText>, <textField>, <reportElement>)
    2. Jaspersoft Studio 7+ (<element kind="staticText">, <element kind="textField">)
    """
    if not os.path.exists(file_path):
        return {"error": f"Template not found at {file_path}"}

    tree = ET.parse(file_path)
    root = tree.getroot()

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

    # Extract Title Elements (like logo, main heading, date)
    title_texts = []
    # Check title band
    title_band = root.find(f".//{ns}title")
    if title_band is not None:
        for elem in title_band.iter():
            # Check for staticText / text
            if elem.tag.endswith("text") and elem.text:
                title_texts.append(elem.text.strip())

    # Extract Column Headers (both modern <element kind="staticText"> and classic <staticText>)
    columns = []
    
    # Modern Jasper 7: <element kind="staticText" x="..." width="..."> <text>...</text> </element>
    for elem in root.findall(f".//{ns}groupHeader//{ns}element[@kind='staticText']") + root.findall(f".//{ns}columnHeader//{ns}element[@kind='staticText']"):
        text_elem = elem.find(f"{ns}text")
        if text_elem is not None and text_elem.text:
            columns.append({
                "label": text_elem.text.strip(),
                "x": int(elem.attrib.get("x", 0)),
                "y": int(elem.attrib.get("y", 0)),
                "width": int(elem.attrib.get("width", 50)),
                "height": int(elem.attrib.get("height", 18)),
            })

    # Classic Jasper: <staticText> <reportElement x="..." width="..."/> <text>...</text> </staticText>
    if not columns:
        for st in root.findall(f".//{ns}groupHeader//{ns}staticText") + root.findall(f".//{ns}columnHeader//{ns}staticText"):
            text_elem = st.find(f"{ns}text")
            rep_elem = st.find(f"{ns}reportElement")
            if text_elem is not None and rep_elem is not None:
                columns.append({
                    "label": text_elem.text.strip() if text_elem.text else "",
                    "x": int(rep_elem.attrib.get("x", 0)),
                    "y": int(rep_elem.attrib.get("y", 0)),
                    "width": int(rep_elem.attrib.get("width", 50)),
                    "height": int(rep_elem.attrib.get("height", 18)),
                })

    # Extract Detail Fields
    detail_fields = []
    # Modern Jasper 7: <element kind="textField" ...> <expression>...</expression> </element>
    for elem in root.findall(f".//{ns}detail//{ns}element[@kind='textField']"):
        expr = elem.find(f"{ns}expression")
        detail_fields.append({
            "expression": expr.text if expr is not None and expr.text else "",
            "x": int(elem.attrib.get("x", 0)),
            "y": int(elem.attrib.get("y", 0)),
            "width": int(elem.attrib.get("width", 50)),
            "height": int(elem.attrib.get("height", 18)),
            "forecolor": elem.attrib.get("forecolor", "#000000"),
            "align": elem.attrib.get("hTextAlign", "Left"),
            "isBold": elem.attrib.get("bold") == "true"
        })

    # Classic Jasper: <textField> <reportElement .../> <textFieldExpression>...</textFieldExpression> </textField>
    if not detail_fields:
        for tf in root.findall(f".//{ns}detail//{ns}textField"):
            expr = tf.find(f"{ns}textFieldExpression")
            rep = tf.find(f"{ns}reportElement")
            txt_elem = tf.find(f"{ns}textElement")
            font_elem = txt_elem.find(f"{ns}font") if txt_elem is not None else None

            detail_fields.append({
                "expression": expr.text if expr is not None and expr.text else "",
                "x": int(rep.attrib.get("x", 0)) if rep is not None else 0,
                "y": int(rep.attrib.get("y", 0)) if rep is not None else 0,
                "width": int(rep.attrib.get("width", 50)) if rep is not None else 50,
                "height": int(rep.attrib.get("height", 18)) if rep is not None else 18,
                "forecolor": rep.attrib.get("forecolor", "#000000") if rep is not None else "#000000",
                "align": txt_elem.attrib.get("textAlignment", "Left") if txt_elem is not None else "Left",
                "isBold": font_elem.attrib.get("isBold") == "true" if font_elem is not None else False
            })

    # Sort columns by their horizontal X position so they appear in exact visual order
    columns.sort(key=lambda c: c["x"])
    detail_fields.sort(key=lambda d: d["x"])

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
        "titleTexts": title_texts,
        "columns": columns,
        "detailFields": detail_fields
    }

if __name__ == "__main__":
    import json
    data = parse_jrxml_template("jasper_templates/one_to_one_progress_report.jrxml")
    print(json.dumps(data, indent=2))
