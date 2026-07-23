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
        # xlTypePDF = 0
        wb = excel.Workbooks.Open(os.path.abspath(xlsx_path))
        # ExportAsFixedFormat(Type, Filename, Quality, IncludeDocProperties, IgnorePrintAreas, From, To, OpenAfterPublish)
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
    handles row expansion for {{#each items}} ... {{/each}}, and exports to PDF.
    """
    logger.info(f"Merging XLSX template: {template_path}")
    import openpyxl
    
    wb = openpyxl.load_workbook(template_path)
    ws = wb.active
    
    items = tokens.get("items", [])
    
    # 1. First Pass: Find the repeating list boundaries
    loop_start_row = None
    loop_end_row = None
    loop_template_cells = []
    
    # Locate row index containing {{#each items}} and {{/each}}
    for r in range(1, ws.max_row + 1):
        for c in range(1, ws.max_column + 1):
            val = str(ws.cell(row=r, column=c).value or '')
            if "{{#each items}}" in val:
                loop_start_row = r
            if "{{/each}}" in val:
                loop_end_row = r
                
    if loop_start_row is not None and loop_end_row is not None:
        # Capture layout style, formulas, and cells format from the templates row(s) between start and end tags
        template_rows_count = (loop_end_row - loop_start_row) - 1
        
        # Read cell tokens for the rows in the loop
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
            
        # Clear loop tag rows and loop rows content
        for r in range(loop_start_row, loop_end_row + 1):
            for c in range(1, ws.max_column + 1):
                ws.cell(row=r, column=c).value = None
                
        # Insert rows based on items length
        total_items = len(items)
        needed_rows = total_items * len(loop_rows_data)
        
        # If we need to expand or shrink the template rows space
        # We shift down everything below loop_end_row
        if total_items > 1:
            rows_to_insert = (total_items - 1) * len(loop_rows_data)
            ws.insert_rows(loop_end_row, amount=rows_to_insert)
            
        # Fill in the looped data
        curr_row = loop_start_row
        for idx, item in enumerate(items):
            for t_row_idx, t_row in enumerate(loop_rows_data):
                for cell_def in t_row:
                    target_cell = ws.cell(row=curr_row, column=cell_def["col"])
                    
                    # Copy styling
                    if cell_def["font"]: target_cell.font = cell_def["font"]
                    if cell_def["fill"]: target_cell.fill = cell_def["fill"]
                    if cell_def["border"]: target_cell.border = cell_def["border"]
                    if cell_def["alignment"]: target_cell.alignment = cell_def["alignment"]
                    if cell_def["number_format"]: target_cell.number_format = cell_def["number_format"]
                    
                    # Process placeholders in the text value
                    val_str = str(cell_def["value"] or '')
                    if val_str:
                        # Substitute fields
                        val_str = val_str.replace("{{index}}", str(idx + 1))
                        for k, v in item.items():
                            val_str = val_str.replace("{{" + str(k) + "}}", str(v if v is not None else ''))
                            
                        # Try to cast to float/int if it's purely numerical after substitution to preserve excel calculations
                        try:
                            if val_str.strip().startswith('R '):
                                clean_val = val_str.replace('R ', '').replace(',', '').strip()
                                target_cell.value = float(clean_val)
                            else:
                                if '.' in val_str:
                                    target_cell.value = float(val_str)
                                else:
                                    target_cell.value = int(val_str)
                        except ValueError:
                            target_cell.value = val_str
                    else:
                        target_cell.value = None
                curr_row += 1
    
    # 2. Second Pass: Find and replace single global variables
    for r in range(1, ws.max_row + 1):
        for c in range(1, ws.max_column + 1):
            cell = ws.cell(row=r, column=c)
            val = str(cell.value or '')
            if val and "{{" in val and "}}" in val:
                for k, v in tokens.items():
                    if not isinstance(v, (list, dict)):
                        val = val.replace("{{" + str(k) + "}}", str(v if v is not None else ''))
                
                # Check if cell can be cast to float to keep calculations intact
                try:
                    if val.strip().startswith('R '):
                        clean_val = val.replace('R ', '').replace(',', '').strip()
                        cell.value = float(clean_val)
                    else:
                        if '.' in val:
                            cell.value = float(val)
                        else:
                            cell.value = int(val)
                except ValueError:
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
