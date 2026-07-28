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
    
    # 1. First Pass: Scan Column A to identify control rows
    # Expected Column A Markers:
    #   [FLOOR_HEADER]
    #   [AREA_HEADER]
    #   [TABLE_HEADER]
    #   [ITEM]
    #   [AREA_FOOTER]
    #   [FLOOR_FOOTER]
    
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

    has_tagged_loop = (
        floor_header_row is not None and 
        area_header_row is not None and 
        item_row is not None
    )
    
    if has_tagged_loop:
        # 2. Extract designs for fixed rows and control rows starting ONLY from Column B (index 2 onwards)
        def get_row_design(row_num):
            if row_num is None:
                return []
            cells = []
            for c in range(2, ws.max_column + 1):
                cell = ws.cell(row=row_num, column=c)
                cells.append({
                    "col": c, # Keep absolute column index (2, 3, 4...)
                    "value": cell.value,
                    "number_format": cell.number_format,
                    "font": copy.copy(cell.font) if cell.font else None,
                    "fill": copy.copy(cell.fill) if cell.fill else None,
                    "border": copy.copy(cell.border) if cell.border else None,
                    "alignment": copy.copy(cell.alignment) if cell.alignment else None
                })
            return cells

        fixed_row_designs = [get_row_design(r) for r in fixed_rows if r > loop_start_row]
        
        floor_header_design = get_row_design(floor_header_row)
        area_header_design = get_row_design(area_header_row)
        table_header_designs = [get_row_design(r) for r in table_header_rows]
        item_design = get_row_design(item_row)
        area_footer_design = get_row_design(area_footer_row) if area_footer_row else []
        floor_footer_design = get_row_design(floor_footer_row) if floor_footer_row else []
        
        floors = tokens.get("floors", [])
        
        # Calculate dynamic expanded rows count
        expanded_row_count = 0
        for f in floors:
            valid_areas = [a for a in f.get("areas", []) if len(a.get("items", [])) > 0]
            if not valid_areas:
                continue
            expanded_row_count += 1 # Floor Header
            for a in valid_areas:
                expanded_row_count += 1 # Area Header
                expanded_row_count += len(table_header_designs) # Table Header Rows
                expanded_row_count += len(a.get("items", [])) # Product Rows
                expanded_row_count += 1 # Area Subtotal Footer
            if floor_footer_design:
                expanded_row_count += 1 # Floor Footer
            
        original_height = (loop_end_row - loop_start_row) + 1
        diff_height = expanded_row_count - original_height
        
        # Determine insertion point right below the template loop block
        insertion_row = loop_end_row + 1

        # Shift fixed rows and everything below cleanly down
        if diff_height > 0:
            ws.insert_rows(insertion_row, amount=diff_height)
            
        # Clear everything from loop_start_row to bottom of sheet in Col B onwards
        for r in range(loop_start_row, ws.max_row + 1):
            for c in range(2, ws.max_column + 1):
                cell = ws.cell(row=r, column=c)
                if not isinstance(cell, MergedCell):
                    cell.value = None
            
        # Clean up any unwanted merged cells that openpyxl copied into the newly expanded row area
        merged_ranges_to_remove = []
        for merged_range in list(ws.merged_cells.ranges):
            if merged_range.min_row >= loop_start_row:
                merged_ranges_to_remove.append(merged_range)
                
        for m_range in merged_ranges_to_remove:
            try:
                ws.unmerge_cells(str(m_range))
            except Exception:
                pass
            
        curr_row = loop_start_row
        for f in floors:
            valid_areas = [a for a in f.get("areas", []) if len(a.get("items", [])) > 0]
            if not valid_areas:
                continue
                
            # 1. Output Floor Header Row (Col B onwards)
            for cell_def in floor_header_design:
                target_cell = ws.cell(row=curr_row, column=cell_def["col"])
                if isinstance(target_cell, MergedCell): continue
                if cell_def["font"]: target_cell.font = copy.copy(cell_def["font"])
                if cell_def["fill"]: target_cell.fill = copy.copy(cell_def["fill"])
                if cell_def["border"]: target_cell.border = copy.copy(cell_def["border"])
                if cell_def["alignment"]: target_cell.alignment = copy.copy(cell_def["alignment"])
                
                val_str = str(cell_def["value"] or '')
                val_str = val_str.replace("{{floor.name}}", f.get("name", ""))
                target_cell.value = val_str
            curr_row += 1
            
            for a in valid_areas:
                # 2. Output Area Header Row
                for cell_def in area_header_design:
                    target_cell = ws.cell(row=curr_row, column=cell_def["col"])
                    if isinstance(target_cell, MergedCell): continue
                    if cell_def["font"]: target_cell.font = copy.copy(cell_def["font"])
                    if cell_def["fill"]: target_cell.fill = copy.copy(cell_def["fill"])
                    if cell_def["border"]: target_cell.border = copy.copy(cell_def["border"])
                    if cell_def["alignment"]: target_cell.alignment = copy.copy(cell_def["alignment"])
                    
                    val_str = str(cell_def["value"] or '')
                    val_str = val_str.replace("{{area.name}}", a.get("name", ""))
                    target_cell.value = val_str
                curr_row += 1
                
                # 3. Output Table Header Rows (Qty, Made Code, Plan Code...)
                for header_row in table_header_designs:
                    for cell_def in header_row:
                        target_cell = ws.cell(row=curr_row, column=cell_def["col"])
                        if isinstance(target_cell, MergedCell): continue
                        if cell_def["font"]: target_cell.font = copy.copy(cell_def["font"])
                        if cell_def["fill"]: target_cell.fill = copy.copy(cell_def["fill"])
                        if cell_def["border"]: target_cell.border = copy.copy(cell_def["border"])
                        if cell_def["alignment"]: target_cell.alignment = copy.copy(cell_def["alignment"])
                        if cell_def["number_format"]: target_cell.number_format = cell_def["number_format"]
                        
                        target_cell.value = cell_def["value"]
                    curr_row += 1
                
                # 4. Output Item Rows
                for idx, item in enumerate(a.get("items", [])):
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
                    
                # 5. Output Area Footer / Subtotal
                def clean_price(val_in):
                    if not val_in: return 0.0
                    if isinstance(val_in, (int, float)): return float(val_in)
                    val_s = str(val_in).replace("R", "").replace(",", "").strip()
                    try:
                        return float(val_s)
                    except ValueError:
                        return 0.0
                        
                area_subtotal = sum(clean_price(item.get("totalRetail")) for item in a.get("items", []))
                for cell_def in area_footer_design:
                    target_cell = ws.cell(row=curr_row, column=cell_def["col"])
                    if isinstance(target_cell, MergedCell): continue
                    if cell_def["font"]: target_cell.font = copy.copy(cell_def["font"])
                    if cell_def["fill"]: target_cell.fill = copy.copy(cell_def["fill"])
                    if cell_def["border"]: target_cell.border = copy.copy(cell_def["border"])
                    if cell_def["alignment"]: target_cell.alignment = copy.copy(cell_def["alignment"])
                    
                    val_str = str(cell_def["value"] or '')
                    if "{{SUBTOTAL}}" in val_str:
                        target_cell.value = area_subtotal
                        target_cell.number_format = '"R"#,##0.00'
                    else:
                        target_cell.value = val_str
                curr_row += 1
                
            # 6. Output Floor Footer (Only if floor_footer_design is present)
            if floor_footer_design:
                for cell_def in floor_footer_design:
                    target_cell = ws.cell(row=curr_row, column=cell_def["col"])
                    if isinstance(target_cell, MergedCell): continue
                    if cell_def["font"]: target_cell.font = copy.copy(cell_def["font"])
                    if cell_def["fill"]: target_cell.fill = copy.copy(cell_def["fill"])
                    if cell_def["border"]: target_cell.border = copy.copy(cell_def["border"])
                    if cell_def["alignment"]: target_cell.alignment = copy.copy(cell_def["alignment"])
                    
                    val_str = str(cell_def["value"] or '')
                    target_cell.value = val_str
                curr_row += 1
                
        # 7. Output Fixed Static Rows below dynamic tables
        for row_design in fixed_row_designs:
            for cell_def in row_design:
                target_cell = ws.cell(row=curr_row, column=cell_def["col"])
                if isinstance(target_cell, MergedCell): continue
                if cell_def["font"]: target_cell.font = copy.copy(cell_def["font"])
                if cell_def["fill"]: target_cell.fill = copy.copy(cell_def["fill"])
                if cell_def["border"]: target_cell.border = copy.copy(cell_def["border"])
                if cell_def["alignment"]: target_cell.alignment = copy.copy(cell_def["alignment"])
                if cell_def["number_format"]: target_cell.number_format = cell_def["number_format"]
                
                target_cell.value = cell_def["value"]
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
            # Simple item collection logic
            loop_rows_data = []
            start_scan = loop_start_row + 1 if loop_start_row != loop_end_row else loop_start_row
            end_scan = loop_end_row if loop_start_row != loop_end_row else loop_end_row + 1
            for r in range(start_scan, end_scan):
                row_cells = []
                for c in range(2, ws.max_column + 1):
                    cell = ws.cell(row=r, column=c)
                    row_cells.append({
                        "col": c - 1,
                        "value": cell.value,
                        "number_format": cell.number_format,
                        "font": cell.font,
                        "fill": cell.fill,
                        "border": cell.border,
                        "alignment": cell.alignment
                    })
                loop_rows_data.append(row_cells)
                
            for r in range(loop_start_row, loop_end_row + 1):
                for c in range(2, ws.max_column + 1):
                    cell = ws.cell(row=r, column=c)
                    if not isinstance(cell, MergedCell):
                        cell.value = None
                        
            total_items = len(items)
            if total_items > 1:
                rows_to_insert = (total_items - 1) * len(loop_rows_data)
                ws.insert_rows(loop_end_row + 1, amount=rows_to_insert)
                
            curr_row = loop_start_row
            for idx, item in enumerate(items):
                for t_row_idx, t_row in enumerate(loop_rows_data):
                    for cell_def in t_row:
                        target_cell = ws.cell(row=curr_row, column=cell_def["col"] + 1)
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
                for k, v in tokens.items():
                    if not isinstance(v, (list, dict)):
                        val = val.replace("{{" + str(k) + "}}", str(v if v is not None else ''))
                        val = val.replace("{?" + str(k) + "?}", str(v if v is not None else ''))
                
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
                        cell.value = val
                except Exception:
                    cell.value = val

    # 3. Third Pass: Clear Column A text (control markers) so they are invisible, keeping layout columns untouched
    for r in range(1, ws.max_row + 1):
        cell_a = ws.cell(row=r, column=1)
        if not isinstance(cell_a, MergedCell):
            val_a = str(cell_a.value or '')
            if "[" in val_a and "]" in val_a:
                cell_a.value = None

    # Save to a temporary workbook
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
