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

def merge_xlsx_template(template_path: str, tokens: dict, output_pdf_path: str = None, output_xlsx_path: str = None) -> bool:
    """
    High-fidelity Excel template merger with 0-call delete_rows.
    Merges dynamic tokens into an .xlsx template and converts to PDF or exports populated .xlsx.
    """
    logger.info(f"Merging XLSX template: {template_path}")
    import openpyxl
    import copy
    from openpyxl.cell.cell import MergedCell
    
    if not os.path.exists(template_path):
        print(f"Error: Excel template missing at {template_path}")
        return False
        
    try:
        wb = openpyxl.load_workbook(template_path)
        ws = wb.active
    except Exception as e:
        print(f"Error loading Excel template: {e}")
        return False
    
    floor_header_row = None
    area_header_row = None
    table_header_rows = []
    item_row = None
    area_footer_row = None
    floor_footer_row = None
    
    # 1. First Pass: Scan Column A (or cell values) to identify control rows
    floor_header_row = None
    area_header_row = None
    table_header_rows = []
    item_row = None
    area_footer_row = None
    floor_footer_row = None
    fixed_rows = []
    
    loop_start_row = None
    loop_end_row = None
    curr_row = 1
    
    for r in range(1, ws.max_row + 1):
        cell_a_val = str(ws.cell(row=r, column=1).value or '').strip()
        
        if "[FIXED]" in cell_a_val:
            fixed_rows.append(r)
            continue
            
        # Check Column A tags
        if "[FLOOR_HEADER]" in cell_a_val or "{{#floor}}" in cell_a_val:
            floor_header_row = r
            if loop_start_row is None: loop_start_row = r
        elif "[AREA_HEADER]" in cell_a_val or "{{#area}}" in cell_a_val:
            area_header_row = r
        elif "[TABLE_HEADER]" in cell_a_val:
            table_header_rows.append(r)
        elif "[ITEM]" in cell_a_val or "{{item." in cell_a_val:
            if item_row is None:
                item_row = r
        elif "[AREA_FOOTER]" in cell_a_val or "{{/area}}" in cell_a_val:
            area_footer_row = r
        elif "[FLOOR_FOOTER]" in cell_a_val or "{{/floor}}" in cell_a_val:
            floor_footer_row = r
            loop_end_row = r

    # Set loop_end_row as the max row index among all found control tags
    tagged_rows = [r for r in [floor_header_row, area_header_row, item_row, area_footer_row, floor_footer_row] + table_header_rows if r is not None]
    if tagged_rows:
        loop_end_row = max(tagged_rows)

    has_tagged_loop = (item_row is not None)
    
    if has_tagged_loop:
        # Extract row designs starting from Column A (Col 1 to Max Column)
        def get_row_design(row_num):
            if row_num is None: return []
            cells = []
            for c in range(1, ws.max_column + 1):
                cell = ws.cell(row=row_num, column=c)
                cells.append({
                    "col": c,
                    "value": cell.value,
                    "number_format": cell.number_format,
                    "font": copy.copy(cell.font) if cell.font else None,
                    "fill": copy.copy(cell.fill) if cell.fill else None,
                    "border": copy.copy(cell.border) if cell.border else None,
                    "alignment": copy.copy(cell.alignment) if cell.alignment else None
                })
            return cells

        floor_header_design = get_row_design(floor_header_row)
        area_header_design = get_row_design(area_header_row)
        table_header_designs = [get_row_design(r) for r in table_header_rows]
        item_design = get_row_design(item_row)
        area_footer_design = get_row_design(area_footer_row) if area_footer_row else []
        floor_footer_design = get_row_design(floor_footer_row) if floor_footer_row else []

        # Find merged cell definitions in item_row / control rows
        item_merges = []
        for m in list(ws.merged_cells.ranges):
            if m.min_row == item_row:
                item_merges.append((m.min_col, m.max_col))

        # Record original row heights of template control rows
        row_heights = {}
        for r_idx, r_num in [("floor_header", floor_header_row), ("area_header", area_header_row), ("item", item_row), ("area_footer", area_footer_row), ("floor_footer", floor_footer_row)]:
            if r_num and ws.row_dimensions[r_num].height:
                row_heights[r_idx] = ws.row_dimensions[r_num].height
                
        table_header_heights = [ws.row_dimensions[r].height for r in table_header_rows if ws.row_dimensions[r].height]

        control_rows = list(filter(None, [floor_header_row, area_header_row, item_row, area_footer_row, floor_footer_row] + table_header_rows))
        min_ctrl_row = min(control_rows)
        max_ctrl_row = max(control_rows)
        ctrl_height = max_ctrl_row - min_ctrl_row + 1

        # 1. Unmerge any ranges inside the original placeholder block
        for m in list(ws.merged_cells.ranges):
            if m.min_row >= min_ctrl_row and m.max_row <= max_ctrl_row:
                try: ws.unmerge_cells(str(m))
                except Exception: pass

        # Helper to safely delete a row and shift all lower row_dimensions heights & merged ranges up
        def delete_row_and_shift_dimensions(target_row):
            max_r = ws.max_row + 15
            saved_heights = {}
            for r in range(target_row + 1, max_r + 1):
                if r in ws.row_dimensions:
                    saved_heights[r] = ws.row_dimensions[r].height

            # Shift merged cell ranges that start below target_row UP by 1 row
            existing_merges = list(ws.merged_cells.ranges)
            for m in existing_merges:
                if m.min_row > target_row:
                    try: ws.unmerge_cells(str(m))
                    except Exception: pass
                    new_min = m.min_row - 1
                    new_max = m.max_row - 1
                    try: ws.merge_cells(start_row=new_min, start_column=m.min_col, end_row=new_max, end_column=m.max_col)
                    except Exception: pass

            ws.delete_rows(target_row, 1)

            # Shift saved heights up by -1
            for r in range(target_row, max_r):
                next_r = r + 1
                if next_r in saved_heights:
                    ws.row_dimensions[r].height = saved_heights[next_r]
                elif r in ws.row_dimensions:
                    ws.row_dimensions[r].height = None

        # Helper to safely insert a row and shift all lower row_dimensions heights & merged ranges down
        def insert_row_and_shift_dimensions(target_row, new_height=None):
            # Save heights of rows from target_row downwards before inserting
            max_r = ws.max_row + 15
            saved_heights = {}
            for r in range(target_row, max_r + 1):
                if r in ws.row_dimensions:
                    saved_heights[r] = ws.row_dimensions[r].height
                    
            # Shift merged cell ranges that start at or below target_row DOWN by 1 row
            existing_merges = list(ws.merged_cells.ranges)
            for m in existing_merges:
                if m.min_row >= target_row:
                    try: ws.unmerge_cells(str(m))
                    except Exception: pass
                    new_min = m.min_row + 1
                    new_max = m.max_row + 1
                    try: ws.merge_cells(start_row=new_min, start_column=m.min_col, end_row=new_max, end_column=m.max_col)
                    except Exception: pass

            ws.insert_rows(target_row, 1)

            # Shift saved heights down by +1
            for r in range(max_r, target_row, -1):
                prev_r = r - 1
                if prev_r in saved_heights:
                    ws.row_dimensions[r].height = saved_heights[prev_r]
                elif r in ws.row_dimensions:
                    ws.row_dimensions[r].height = None

            if new_height:
                ws.row_dimensions[target_row].height = new_height
            elif target_row in ws.row_dimensions:
                ws.row_dimensions[target_row].height = None

        def apply_design(target_row, design_list, value_replacements=None, row_height=None):
            # Insert a brand-new blank row at target_row, shifting all lower fixed rows & heights down by 1 row
            insert_row_and_shift_dimensions(target_row, row_height)
            
            # Clean openpyxl auto-merged ranges created on newly inserted row (unmerge any range intersecting target_row)
            for m in list(ws.merged_cells.ranges):
                if m.min_row <= target_row <= m.max_row:
                    try: ws.unmerge_cells(str(m))
                    except Exception: pass

            for cell_def in design_list:
                col_idx = cell_def["col"]
                target_cell = ws.cell(row=target_row, column=col_idx)
                if isinstance(target_cell, MergedCell): continue
                
                if cell_def["font"]: target_cell.font = copy.copy(cell_def["font"])
                if cell_def["fill"]: target_cell.fill = copy.copy(cell_def["fill"])
                if cell_def["border"]: target_cell.border = copy.copy(cell_def["border"])
                if cell_def["alignment"]: target_cell.alignment = copy.copy(cell_def["alignment"])
                if cell_def["number_format"]: target_cell.number_format = cell_def["number_format"]
                
                val = cell_def["value"]
                if value_replacements and val:
                    val_str = str(val)
                    for k, v in value_replacements.items():
                        val_str = val_str.replace(k, str(v if v is not None else ''))
                    
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
                    target_cell.value = val
                    
            return target_row

        # 2. Delete the entire placeholder block from bottom to top so we start with a clean insertion point
        for r in range(max_ctrl_row, min_ctrl_row - 1, -1):
            try: delete_row_and_shift_dimensions(r)
            except Exception: pass

        floors = tokens.get("floors", [])
        curr_row = min_ctrl_row

        for f in floors:
            valid_areas = [a for a in f.get("areas", []) if len(a.get("items", [])) > 0]
            if not valid_areas: continue

            # 1. Insert Floor Header (if present)
            if floor_header_design:
                apply_design(curr_row, floor_header_design, {"{{floor.name}}": f.get("name", "")}, row_heights.get("floor_header"))
                curr_row += 1

            for a in valid_areas:
                # 2. Insert Area Header (if present)
                if area_header_design:
                    apply_design(curr_row, area_header_design, {"{{area.name}}": a.get("name", "")}, row_heights.get("area_header"))
                    curr_row += 1

                # 3. Insert Table Headers
                for h_idx, h_design in enumerate(table_header_designs):
                    h_height = table_header_heights[h_idx] if h_idx < len(table_header_heights) else None
                    apply_design(curr_row, h_design, None, h_height)
                    curr_row += 1

                # 4. Insert Items
                for idx, item in enumerate(a.get("items", [])):
                    repls = {"{{index}}": str(idx + 1)}
                    for k, v in item.items():
                        repls["{{item." + str(k) + "}}"] = v
                        repls["{{" + str(k) + "}}"] = v
                        
                    apply_design(curr_row, item_design, repls, row_heights.get("item"))
                    
                    # Re-apply item merged cells if template item row had merges
                    for min_c, max_c in item_merges:
                        try: ws.merge_cells(start_row=curr_row, start_column=min_c, end_row=curr_row, end_column=max_c)
                        except Exception: pass
                        
                    curr_row += 1

                # 5. Insert Area Footer / Subtotal (if present)
                if area_footer_design:
                    def clean_price(val_in):
                        if not val_in: return 0.0
                        if isinstance(val_in, (int, float)): return float(val_in)
                        val_s = str(val_in).replace("R", "").replace(",", "").strip()
                        try: return float(val_s)
                        except ValueError: return 0.0

                    area_subtotal = sum(clean_price(item.get("totalRetail")) for item in a.get("items", []))
                    
                    subtotal_repls = {"{{SUBTOTAL}}": area_subtotal}
                    apply_design(curr_row, area_footer_design, subtotal_repls, row_heights.get("area_footer"))
                    
                    # Format subtotal cell value if formula was used
                    for cell_def in area_footer_design:
                        if "{{SUBTOTAL}}" in str(cell_def["value"] or ''):
                            tc = ws.cell(row=curr_row, column=cell_def["col"])
                            tc.value = area_subtotal
                            tc.number_format = '"R"#,##0.00'
                            
                    curr_row += 1

            # 6. Insert Floor Footer (if present)
            if floor_footer_design:
                apply_design(curr_row, floor_footer_design, None, row_heights.get("floor_footer"))
                curr_row += 1
            
    else:
        # Standard Flat Loop Fallback Logic
        items = tokens.get("items", [])
        loop_start_row = None
        loop_end_row = None
        
        for r in range(1, ws.max_row + 1):
            cell_a_val = str(ws.cell(row=r, column=1).value or '').strip()
            if cell_a_val == "[ITEM]":
                loop_start_row = r
                loop_end_row = r
                break
                
        # If no tags, fall back to old text-token-matching search
        if loop_start_row is None:
            for r in range(1, ws.max_row + 1):
                for c in range(1, ws.max_column + 1):
                    cell = ws.cell(row=r, column=c)
                    if isinstance(cell, MergedCell): continue
                    val = str(cell.value or '')
                    if "{{#each items}}" in val:
                        loop_start_row = r
                    if "{{/each}}" in val:
                        loop_end_row = r
                        
        if loop_start_row is not None and loop_end_row is not None:
            # 1. Unmerge any ranges inside the loop block
            for m in list(ws.merged_cells.ranges):
                if m.min_row >= loop_start_row and m.max_row <= loop_end_row:
                    try: ws.unmerge_cells(str(m))
                    except Exception: pass

            # 2. Extract item template row design (the row inside the loop block containing tokens)
            template_item_row = loop_start_row + 1 if loop_start_row != loop_end_row else loop_start_row
            item_row_height = ws.row_dimensions[template_item_row].height

            item_design = []
            for c in range(1, ws.max_column + 1):
                cell = ws.cell(row=template_item_row, column=c)
                item_design.append({
                    "col": c,
                    "value": cell.value,
                    "number_format": cell.number_format,
                    "font": copy.copy(cell.font) if cell.font else None,
                    "fill": copy.copy(cell.fill) if cell.fill else None,
                    "border": copy.copy(cell.border) if cell.border else None,
                    "alignment": copy.copy(cell.alignment) if cell.alignment else None
                })

            # 3. Delete original loop placeholder block ({{#each items}} to {{/each}}) from bottom to top
            for r in range(loop_end_row, loop_start_row - 1, -1):
                try: ws.delete_rows(r, 1)
                except Exception: pass

            # 4. Insert each dynamic item cleanly into a new row
            curr_row = loop_start_row
            for idx, item in enumerate(items):
                ws.insert_rows(curr_row, 1)
                if item_row_height:
                    ws.row_dimensions[curr_row].height = item_row_height

                for cell_def in item_design:
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
    
    # 2. Second Pass: Find and replace single global variables in other rows (Col 1 to Max Column)
    for r in range(1, ws.max_row + 1):
        for c in range(1, ws.max_column + 1):
            cell = ws.cell(row=r, column=c)
            if isinstance(cell, MergedCell): continue
            val = str(cell.value or '')
            if val and ("{?" in val or "{{" in val):
                # Clean block tags from text
                val = val.replace("{{#floor}}", "").replace("{{#area}}", "").replace("{{/area}}", "").replace("{{/floor}}", "").strip()
                
                for k, v in tokens.items():
                    if not isinstance(v, (list, dict)):
                        val = val.replace("{{" + str(k) + "}}", str(v if v is not None else ''))
                        val = val.replace("{?" + str(k) + "?}", str(v if v is not None else ''))
                
                # Remove any leftover unhandled mustache tokens
                val = re.sub(r'\{\{[^}]+\}\}', '', val).strip()
                
                try:
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
                        cell.value = val if val != "" else None
                except Exception:
                    cell.value = val if val != "" else None

    # 3. Third Pass: Clear Column A text (control markers) so they are invisible, keeping layout columns untouched
    for r in range(1, ws.max_row + 1):
        cell_a = ws.cell(row=r, column=1)
        if not isinstance(cell_a, MergedCell):
            val_a = str(cell_a.value or '')
            if "[" in val_a and "]" in val_a:
                cell_a.value = None

    # If direct XLSX output is requested, save and return directly
    if output_xlsx_path:
        wb.save(output_xlsx_path)
        return True

    # Save to a temporary workbook for PDF conversion
    temp_xlsx = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx")
    temp_xlsx_path = temp_xlsx.name
    temp_xlsx.close()
    
    wb.save(temp_xlsx_path)
    
    # 4. Export XLSX workbook to PDF
    success = convert_xlsx_to_pdf_local(temp_xlsx_path, output_pdf_path)
    if not success:
        success = convert_xlsx_to_pdf_libreoffice(temp_xlsx_path, output_pdf_path)
        
    try:
        os.remove(temp_xlsx_path)
    except Exception:
        pass
        
    return success
