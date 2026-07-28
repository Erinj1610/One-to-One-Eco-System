import os
import re
import tempfile
import logging

logger = logging.getLogger(__name__)

_excel_app = None

def get_excel_app():
    global _excel_app
    try:
        import win32com.client
    except (ImportError, ModuleNotFoundError):
        logger.debug("win32com is not available (non-Windows platform).")
        return None

    if _excel_app is not None:
        try:
            _excel_app.Visible = False
            return _excel_app
        except Exception:
            _excel_app = None

    try:
        _excel_app = win32com.client.GetActiveObject("Excel.Application")
    except Exception:
        try:
            _excel_app = win32com.client.Dispatch("Excel.Application")
        except Exception:
            _excel_app = None

    if _excel_app:
        try:
            _excel_app.Visible = False
            _excel_app.DisplayAlerts = False
        except Exception:
            pass
    return _excel_app

def convert_xlsx_to_pdf_local(xlsx_path, pdf_path):
    """
    Converts XLSX to PDF locally using Excel via win32com.
    Reuses a cached Excel instance.
    """
    try:
        import pythoncom
        pythoncom.CoInitialize()
    except (ImportError, ModuleNotFoundError):
        logger.error("pythoncom/win32com not available (likely non-Windows platform).")
        return False
        
    excel = get_excel_app()
    if not excel:
        logger.error("Could not obtain an Excel application instance.")
        return False
        
    try:
        wb = excel.Workbooks.Open(os.path.abspath(xlsx_path))
        # Ensure column widths adjust to prevent visual clipping (which exports as ###)
        for ws in wb.Worksheets:
            try:
                ws.Columns.AutoFit()
            except Exception:
                pass
        wb.ExportAsFixedFormat(0, os.path.abspath(pdf_path))
        wb.Close(SaveChanges=False)
        logger.info(f"Local Excel conversion successful: {pdf_path}")
        return True
    except Exception as e:
        logger.error(f"Local Excel conversion failed: {e}")
        global _excel_app
        _excel_app = None
        return False

def convert_xlsx_to_pdf_libreoffice(xlsx_path, pdf_path):
    """
    Converts XLSX to PDF using headless LibreOffice (fallback).
    """
    import subprocess
    import shutil
    
    if not shutil.which("libreoffice"):
        logger.debug("LibreOffice is not installed on this system.")
        return False
        
    try:
        outdir = os.path.dirname(pdf_path)
        logger.info(f"Converting {xlsx_path} to PDF via LibreOffice headless...")
        
        cmd = [
            "libreoffice",
            "--headless",
            "-env:UserInstallation=file:///tmp/libreoffice",
            "--convert-to", "pdf",
            "--outdir", outdir,
            xlsx_path
        ]
        
        env = os.environ.copy()
        env["HOME"] = "/tmp"
        
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=30, env=env)
        if result.returncode != 0:
            logger.error(f"LibreOffice conversion failed: {result.stderr}")
            return False
            
        default_output_name = os.path.basename(xlsx_path).replace(".xlsx", ".pdf")
        generated_pdf_path = os.path.join(outdir, default_output_name)
        
        if os.path.exists(generated_pdf_path):
            if generated_pdf_path != pdf_path:
                shutil.move(generated_pdf_path, pdf_path)
            logger.info("LibreOffice Excel conversion successful.")
            return True
        return False
    except Exception as e:
        logger.error(f"LibreOffice Excel conversion crashed: {e}")
        return False

def merge_xlsx_template(template_path, tokens, output_pdf_path):
    """
    Reads an .xlsx template, fills placeholders dynamically using openpyxl,
    handles nested floor/area groupings and row expansion, and exports to PDF.
    """
    logger.info(f"Merging XLSX template: {template_path}")
    import openpyxl
    import copy
    from openpyxl.cell.cell import MergedCell
    
    wb = openpyxl.load_workbook(template_path)
    ws = wb.active
    
    # 1. Flatten the floor > area hierarchical tokens if present
    # Hierarchical template structure:
    # {{#floor}}
    #   Floor: {{floor.name}}
    #   {{#area}}
    #     Area: {{area.name}}
    #     {{qty}} {{item.oneToOneCode}} ...
    #   {{/area}}
    # {{/floor}}
    
    # Locate outer loop start/end (floor level) and inner loop start/end (area level)
    floor_start = None
    floor_end = None
    area_start = None
    area_end = None
    
    for r in range(1, ws.max_row + 1):
        for c in range(1, ws.max_column + 1):
            cell = ws.cell(row=r, column=c)
            if isinstance(cell, MergedCell):
                continue
            val = str(cell.value or '')
            if "{{#floor}}" in val:
                floor_start = r
            if "{{/floor}}" in val:
                floor_end = r
            if "{{#area}}" in val:
                area_start = r
            if "{{/area}}" in val:
                area_end = r

    # Determine if we have floor-area nested structure or flat items structure
    has_hierarchical = (floor_start is not None and floor_end is not None)
    
    if has_hierarchical:
        # Hierarchical Grouping Logic
        floors = tokens.get("floors", [])
        
        # Read the design rows within the template
        # floor_start -> header row
        # area_start -> subheader row
        # row between area_start and area_end -> product item row
        # area_end -> subtotal/close row
        # floor_end -> footer close row
        
        template_layout = []
        for r in range(floor_start, floor_end + 1):
            row_cells = []
            for c in range(1, ws.max_column + 1):
                cell = ws.cell(row=r, column=c)
                row_cells.append({
                    "col": c,
                    "value": cell.value,
                    "number_format": cell.number_format,
                    "font": cell.font,
                    "fill": cell.fill,
                    "border": cell.border,
                    "alignment": cell.alignment
                })
            template_layout.append(row_cells)
            
        # Clear the original template block lines
        for r in range(floor_start, floor_end + 1):
            for c in range(1, ws.max_column + 1):
                cell = ws.cell(row=r, column=c)
                if not isinstance(cell, MergedCell):
                    cell.value = None
                    
        # Extract row designs from layout dynamically based on content tags
        floor_header_row_design = template_layout[0]
        area_header_row_design = template_layout[area_start - floor_start]
        
        # Find which template row design corresponds to the item description row,
        # the area footer subtotal row, and the floor footer row
        item_row_design = None
        area_footer_row_design = None
        floor_footer_row_design = template_layout[-1]
        
        for idx, r_data in enumerate(template_layout):
            row_idx = floor_start + idx
            # Scan values in this row
            has_item_var = False
            has_area_close = False
            for cell_def in r_data:
                cell_val = str(cell_def["value"] or '')
                if "{{item." in cell_val or "{{index}}" in cell_val or "{{qty}}" in cell_val:
                    has_item_var = True
                if "{{/area}}" in cell_val:
                    has_area_close = True
            
            if has_item_var:
                item_row_design = r_data
            elif has_area_close:
                area_footer_row_design = r_data
                
        # Fallbacks if markers aren't explicitly matched
        if not item_row_design:
            item_row_design = template_layout[(area_start - floor_start) + 2] if (area_start - floor_start) + 2 < len(template_layout) else template_layout[(area_start - floor_start) + 1]
        if not area_footer_row_design:
            area_footer_row_design = template_layout[area_end - floor_start]
        
        # Estimate expanded rows to shift sheet contents down below floor_end
        expanded_row_count = 0
        for f in floors:
            valid_areas = [a for a in f.get("areas", []) if len(a.get("items", [])) > 0]
            if not valid_areas:
                continue
            expanded_row_count += 1 # Floor Header
            for a in valid_areas:
                expanded_row_count += 1 # Area Header
                expanded_row_count += len(a.get("items", [])) # Product rows
                expanded_row_count += 1 # Area Subtotal Footer
            expanded_row_count += 1 # Floor Footer
            
        original_height = (floor_end - floor_start) + 1
        diff_height = expanded_row_count - original_height
        if diff_height > 0:
            ws.insert_rows(floor_end + 1, amount=diff_height)
            
        curr_row = floor_start
        for f in floors:
            valid_areas = [a for a in f.get("areas", []) if len(a.get("items", [])) > 0]
            if not valid_areas:
                continue
                
            # 1. Output Floor Header Row
            for cell_def in floor_header_row_design:
                target_cell = ws.cell(row=curr_row, column=cell_def["col"])
                if isinstance(target_cell, MergedCell): continue
                if cell_def["font"]: target_cell.font = copy.copy(cell_def["font"])
                if cell_def["fill"]: target_cell.fill = copy.copy(cell_def["fill"])
                if cell_def["border"]: target_cell.border = copy.copy(cell_def["border"])
                if cell_def["alignment"]: target_cell.alignment = copy.copy(cell_def["alignment"])
                
                val_str = str(cell_def["value"] or '')
                val_str = val_str.replace("{{#floor}}", "").replace("{{floor.name}}", f.get("name", ""))
                target_cell.value = val_str
            curr_row += 1
            
            for a in valid_areas:
                # 2. Output Area Header Row
                for cell_def in area_header_row_design:
                    target_cell = ws.cell(row=curr_row, column=cell_def["col"])
                    if isinstance(target_cell, MergedCell): continue
                    if cell_def["font"]: target_cell.font = copy.copy(cell_def["font"])
                    if cell_def["fill"]: target_cell.fill = copy.copy(cell_def["fill"])
                    if cell_def["border"]: target_cell.border = copy.copy(cell_def["border"])
                    if cell_def["alignment"]: target_cell.alignment = copy.copy(cell_def["alignment"])
                    
                    val_str = str(cell_def["value"] or '')
                    val_str = val_str.replace("{{#area}}", "").replace("{{area.name}}", a.get("name", ""))
                    target_cell.value = val_str
                curr_row += 1
                
                # 3. Output Item Rows
                for idx, item in enumerate(a.get("items", [])):
                    for cell_def in item_row_design:
                        target_cell = ws.cell(row=curr_row, column=cell_def["col"])
                        if isinstance(target_cell, MergedCell): continue
                        if cell_def["font"]: target_cell.font = copy.copy(cell_def["font"])
                        if cell_def["fill"]: target_cell.fill = copy.copy(cell_def["fill"])
                        if cell_def["border"]: target_cell.border = copy.copy(cell_def["border"])
                        if cell_def["alignment"]: target_cell.alignment = copy.copy(cell_def["alignment"])
                        if cell_def["number_format"]: target_cell.number_format = cell_def["number_format"]
                        
                        val_str = str(cell_def["value"] or '')
                        if val_str:
                            val_str = val_str.replace("{{index}}", str(idx + 1))
                            for k, v in item.items():
                                val_str = val_str.replace("{{item." + str(k) + "}}", str(v if v is not None else ''))
                                val_str = val_str.replace("{{" + str(k) + "}}", str(v if v is not None else ''))
                                
                            try:
                                stripped_val = val_str.strip()
                                if stripped_val.startswith('R '):
                                    clean_val = stripped_val.replace('R ', '').replace(',', '').strip()
                                    if re.match(r'^-?\d+(?:\.\d+)?$', clean_val):
                                        target_cell.value = float(clean_val)
                                    else:
                                        target_cell.value = val_str
                                elif re.match(r'^-?\d+(?:\.\d+)?$', stripped_val):
                                    if '.' in stripped_val:
                                        target_cell.value = float(stripped_val)
                                    else:
                                        target_cell.value = int(stripped_val)
                                else:
                                    target_cell.value = val_str
                            except Exception:
                                target_cell.value = val_str
                        else:
                            target_cell.value = None
                    curr_row += 1
                    
                # 4. Output Area Footer / Subtotal
                # Clean monetary values (e.g. "R 15.79" or with commas) before parsing to float
                def clean_price(val_in):
                    if not val_in: return 0.0
                    if isinstance(val_in, (int, float)): return float(val_in)
                    val_s = str(val_in).replace("R", "").replace(",", "").strip()
                    try:
                        return float(val_s)
                    except ValueError:
                        return 0.0
                area_subtotal = sum(clean_price(item.get("totalRetail")) for item in a.get("items", []))
                for cell_def in area_footer_row_design:
                    target_cell = ws.cell(row=curr_row, column=cell_def["col"])
                    if isinstance(target_cell, MergedCell): continue
                    if cell_def["font"]: target_cell.font = copy.copy(cell_def["font"])
                    if cell_def["fill"]: target_cell.fill = copy.copy(cell_def["fill"])
                    if cell_def["border"]: target_cell.border = copy.copy(cell_def["border"])
                    if cell_def["alignment"]: target_cell.alignment = copy.copy(cell_def["alignment"])
                    
                    val_str = str(cell_def["value"] or '')
                    val_str = val_str.replace("{{/area}}", "")
                    if "{{SUBTOTAL}}" in val_str:
                        target_cell.value = area_subtotal
                        target_cell.number_format = '"R"#,##0.00'
                    else:
                        target_cell.value = val_str
                curr_row += 1
                
            # 5. Output Floor Footer
            for cell_def in floor_footer_row_design:
                target_cell = ws.cell(row=curr_row, column=cell_def["col"])
                if isinstance(target_cell, MergedCell): continue
                if cell_def["font"]: target_cell.font = copy.copy(cell_def["font"])
                if cell_def["fill"]: target_cell.fill = copy.copy(cell_def["fill"])
                if cell_def["border"]: target_cell.border = copy.copy(cell_def["border"])
                if cell_def["alignment"]: target_cell.alignment = copy.copy(cell_def["alignment"])
                
                val_str = str(cell_def["value"] or '')
                val_str = val_str.replace("{{/floor}}", "")
                target_cell.value = val_str
            curr_row += 1
            
    else:
        # Standard Flat Loop Logic (Fall back if no floor/area loop structure exists)
        items = tokens.get("items", [])
        loop_start_row = None
        loop_end_row = None
        
        for r in range(1, ws.max_row + 1):
            for c in range(1, ws.max_column + 1):
                cell = ws.cell(row=r, column=c)
                if isinstance(cell, MergedCell):
                    continue
                val = str(cell.value or '')
                if "{{#each items}}" in val:
                    loop_start_row = r
                if "{{/each}}" in val:
                    loop_end_row = r
                    
        if loop_start_row is not None and loop_end_row is not None:
            loop_rows_data = []
            for r in range(loop_start_row + 1, loop_end_row):
                row_cells = []
                for c in range(1, ws.max_column + 1):
                    cell = ws.cell(row=r, column=c)
                    row_cells.append({
                        "col": c,
                        "value": cell.value,
                        "number_format": cell.number_format,
                        "font": cell.font,
                        "fill": cell.fill,
                        "border": cell.border,
                        "alignment": cell.alignment
                    })
                loop_rows_data.append(row_cells)
                
            for r in range(loop_start_row, loop_end_row + 1):
                for c in range(1, ws.max_column + 1):
                    cell = ws.cell(row=r, column=c)
                    if not isinstance(cell, MergedCell):
                        cell.value = None
                        
            total_items = len(items)
            if total_items > 1:
                rows_to_insert = (total_items - 1) * len(loop_rows_data)
                ws.insert_rows(loop_end_row, amount=rows_to_insert)
                
            curr_row = loop_start_row
            for idx, item in enumerate(items):
                for t_row_idx, t_row in enumerate(loop_rows_data):
                    for cell_def in t_row:
                        target_cell = ws.cell(row=curr_row, column=cell_def["col"])
                        if isinstance(target_cell, MergedCell):
                            continue
                        
                        if cell_def["font"]: target_cell.font = copy.copy(cell_def["font"])
                        if cell_def["fill"]: target_cell.fill = copy.copy(cell_def["fill"])
                        if cell_def["border"]: target_cell.border = copy.copy(cell_def["border"])
                        if cell_def["alignment"]: target_cell.alignment = copy.copy(cell_def["alignment"])
                        if cell_def["number_format"]: target_cell.number_format = cell_def["number_format"]
                        
                        val_str = str(cell_def["value"] or '')
                        if val_str:
                            val_str = val_str.replace("{{index}}", str(idx + 1))
                            for k, v in item.items():
                                val_str = val_str.replace("{{item." + str(k) + "}}", str(v if v is not None else ''))
                                val_str = val_str.replace("{{" + str(k) + "}}", str(v if v is not None else ''))
                                
                            try:
                                stripped_val = val_str.strip()
                                if stripped_val.startswith('R '):
                                    clean_val = stripped_val.replace('R ', '').replace(',', '').strip()
                                    if re.match(r'^-?\d+(?:\.\d+)?$', clean_val):
                                        target_cell.value = float(clean_val)
                                    else:
                                        target_cell.value = val_str
                                elif re.match(r'^-?\d+(?:\.\d+)?$', stripped_val):
                                    if '.' in stripped_val:
                                        target_cell.value = float(stripped_val)
                                    else:
                                        target_cell.value = int(stripped_val)
                                else:
                                    target_cell.value = val_str
                            except Exception:
                                target_cell.value = val_str
                        else:
                            target_cell.value = None
                    curr_row += 1
    
    # 2. Second Pass: Find and replace single global variables
    for r in range(1, ws.max_row + 1):
        for c in range(1, ws.max_column + 1):
            cell = ws.cell(row=r, column=c)
            if isinstance(cell, MergedCell):
                continue
            val = str(cell.value or '')
            if val and ("{?" in val or "{{" in val):
                for k, v in tokens.items():
                    if not isinstance(v, (list, dict)):
                        val = val.replace("{{" + str(k) + "}}", str(v if v is not None else ''))
                        val = val.replace("{?" + str(k) + "?}", str(v if v is not None else ''))
                
                # Check if cell can be cast to float to keep calculations intact
                try:
                    # Strict match for numeric characters before casting
                    stripped_val = val.strip()
                    if stripped_val.startswith('R '):
                        clean_val = stripped_val.replace('R ', '').replace(',', '').strip()
                        if re.match(r'^-?\d+(?:\.\d+)?$', clean_val):
                            cell.value = float(clean_val)
                        else:
                            cell.value = val
                    elif re.match(r'^-?\d+(?:\.\d+)?$', stripped_val):
                        if '.' in stripped_val:
                            cell.value = float(stripped_val)
                        else:
                            cell.value = int(stripped_val)
                    else:
                        cell.value = val
                except Exception:
                    cell.value = val

    # Save to a temporary workbook
    temp_xlsx = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx")
    temp_xlsx_path = temp_xlsx.name
    temp_xlsx.close()
    
    wb.save(temp_xlsx_path)
    
    # 3. Export XLSX workbook to PDF
    success = convert_xlsx_to_pdf_local(temp_xlsx_path, output_pdf_path)
    if not success:
        success = convert_xlsx_to_pdf_libreoffice(temp_xlsx_path, output_pdf_path)
        
    try:
        os.remove(temp_xlsx_path)
    except Exception:
        pass
        
    return success
