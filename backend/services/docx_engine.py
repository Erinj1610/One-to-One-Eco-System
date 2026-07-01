import os
import zipfile
import re
import tempfile
import logging
from services.google_doc_engine import get_google_services
from googleapiclient.http import MediaFileUpload

logger = logging.getLogger(__name__)

_word_app = None

def get_word_app():
    global _word_app
    try:
        import win32com.client
    except (ImportError, ModuleNotFoundError):
        logger.debug("win32com is not available (non-Windows platform).")
        return None

    if _word_app is not None:
        try:
            # Test if the application is still responsive and valid
            _word_app.Visible = False
            return _word_app
        except Exception:
            _word_app = None

    try:
        # Try to connect to an existing running Word instance
        _word_app = win32com.client.GetActiveObject("Word.Application")
    except Exception:
        try:
            # Start a new Word application instance
            _word_app = win32com.client.Dispatch("Word.Application")
        except Exception:
            _word_app = None

    if _word_app:
        try:
            _word_app.Visible = False
            _word_app.DisplayAlerts = False
        except Exception:
            pass
    return _word_app

def convert_docx_to_pdf_local(docx_path, pdf_path):
    """
    Attempts to convert docx to PDF locally using Microsoft Word via win32com.
    Reuses a cached Word instance for high performance.
    """
    try:
        import pythoncom
        pythoncom.CoInitialize()
    except (ImportError, ModuleNotFoundError):
        logger.error("pythoncom/win32com not available (likely non-Windows platform).")
        return False
        
    word = get_word_app()
    if not word:
        logger.error("Could not obtain a Word application instance.")
        return False
        
    try:
        # Word SaveAs PDF format code is 17
        doc = word.Documents.Open(docx_path)
        doc.SaveAs(pdf_path, FileFormat=17)
        doc.Close()
        logger.info(f"Local Word conversion successful: {pdf_path}")
        return True
    except Exception as e:
        logger.error(f"Local Word conversion failed: {e}")
        # Reset cached app in case it was closed/corrupted
        global _word_app
        _word_app = None
        return False

def convert_docx_to_pdf_libreoffice(docx_path, pdf_path):
    """
    Converts docx to PDF using headless LibreOffice (available in Docker/Linux containers).
    Requires HOME env variable to point to a writable directory like /tmp in serverless environments.
    """
    import subprocess
    import shutil
    
    # Check if libreoffice is available
    if not shutil.which("libreoffice"):
        logger.debug("LibreOffice is not installed on this system.")
        return False
        
    try:
        outdir = os.path.dirname(pdf_path)
        logger.info(f"Converting {docx_path} to PDF via LibreOffice headless...")
        
        # Command: libreoffice --headless --convert-to pdf --outdir [outdir] [docx_path]
        cmd = [
            "libreoffice",
            "--headless",
            "--convert-to", "pdf",
            "--outdir", outdir,
            docx_path
        ]
        
        # Set HOME=/tmp to give LibreOffice a writable profile directory
        env = os.environ.copy()
        env["HOME"] = "/tmp"
        
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=30, env=env)
        if result.returncode != 0:
            logger.error(f"LibreOffice conversion failed (code {result.returncode}): {result.stderr}\nStdout: {result.stdout}")
            return False
            
        # LibreOffice names the output file same as docx but with .pdf extension in outdir
        default_output_name = os.path.basename(docx_path).replace(".docx", ".pdf")
        generated_pdf_path = os.path.join(outdir, default_output_name)
        
        if os.path.exists(generated_pdf_path):
            if generated_pdf_path != pdf_path:
                shutil.move(generated_pdf_path, pdf_path)
            logger.info("LibreOffice conversion successful.")
            return True
        else:
            logger.error(f"LibreOffice ran but the output PDF file was not found. Outdir: {outdir}, Default output: {default_output_name}, Stdout: {result.stdout}, Stderr: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"LibreOffice conversion crashed: {e}")
        return False

def clean_docx_xml(xml_content):
    """
    Cleans up Microsoft Word XML run-split templates where placeholder braces
    e.g. {{ PROJECT_NAME }} are split by internal run formatting tags.
    """
    # 1. Join curly braces that got split: { <tags> { -> {{
    xml_content = re.sub(r'\{\s*(<[^>]+>\s*)*\{', '{{', xml_content)
    # 2. Join curly braces that got split: } <tags> } -> }}
    xml_content = re.sub(r'\}\s*(<[^>]+>\s*)*\}', '}}', xml_content)
    
    # 3. Strip internal XML formatting tags inside curly braces
    def strip_tags_inside_braces(match):
        inside = match.group(0)
        # Strip all XML tags
        cleaned = re.sub(r'<[^>]+>', '', inside)
        return cleaned
        
    xml_content = re.sub(r'(\{\{[^}]+\}\})', strip_tags_inside_braces, xml_content)
    return xml_content

def merge_docx_template(template_path, tokens, output_pdf_name, credentials_json=None):
    """
    Reads a .docx template from disk, performs placeholder replacement
    (including table row repetition for list items), converts it to a PDF
    locally (if on Windows) or uploads to Google Drive as fallback, and returns the PDF path.
    """
    logger.info(f"Merging docx template: {template_path}")
    
    # 1. Unzip .docx and read/modify the XML components
    temp_dir = tempfile.mkdtemp()
    temp_docx_path = os.path.join(temp_dir, "merged.docx")
    
    # Extract items array if provided (usually lists of fixtures/BOQ lines)
    items_list = tokens.get("items", [])
    if not isinstance(items_list, list):
        items_list = []
        
    with zipfile.ZipFile(template_path, 'r') as zin:
        with zipfile.ZipFile(temp_docx_path, 'w', zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                
                # We process XML files (main doc, headers, footers)
                if item.filename.endswith('.xml'):
                    xml_content = data.decode('utf-8', errors='ignore')
                    xml_content = clean_docx_xml(xml_content)
                    
                    # Special processing for document.xml (repeating table rows)
                    # Double Nested Block loops parser for custom Word Layouts (Floors & Areas grouping)
                    # Syntax: {{#floor}} ... {{/floor}} and inside: {{#area}} ... {{/area}}
                    if item.filename == 'word/document.xml':
                        floors_data = tokens.get("floors", [])
                        
                        # 1. First Parse Floor Block loops
                        # Standard Word paragraphs containing tags may have XML tags split between braces, but clean_docx_xml cleans it.
                        # Look for paragraphs or runs with {{#floor}} ... {{/floor}}
                        # Because Word XML structure spans across paragraph runs, we search for block regexes.
                        # We use a pattern to match everything between the floor tags
                        floor_block_pattern = re.compile(r'({{\s*#floor\s*}}.*?{{\s*/floor\s*}})', re.DOTALL | re.IGNORECASE)
                        
                        def replace_floor_block(floor_match):
                            block_template = floor_match.group(1)
                            # Strip tags to get clean template
                            clean_template = re.sub(r'{{\s*#floor\s*}}', '', block_template, flags=re.IGNORECASE)
                            clean_template = re.sub(r'{{\s*/floor\s*}}', '', clean_template, flags=re.IGNORECASE)
                            
                            expanded_floors = []
                            for f_idx, floor_obj in enumerate(floors_data):
                                f_xml = clean_template
                                # Substitute floor variables
                                f_xml = re.sub(r'{{\s*floor\.name\s*}}', str(floor_obj.get("name", "")), f_xml, flags=re.IGNORECASE)
                                
                                # Now process sub-loop for Areas inside this Floor
                                areas_data = floor_obj.get("areas", [])
                                area_block_pattern = re.compile(r'({{\s*#area\s*}}.*?{{\s*/area\s*}})', re.DOTALL | re.IGNORECASE)
                                
                                def replace_area_block(area_match):
                                    area_template = area_match.group(1)
                                    clean_area_temp = re.sub(r'{{\s*#area\s*}}', '', area_template, flags=re.IGNORECASE)
                                    clean_area_temp = re.sub(r'{{\s*/area\s*}}', '', clean_area_temp, flags=re.IGNORECASE)
                                    
                                    expanded_areas = []
                                    for a_idx, area_obj in enumerate(areas_data):
                                        a_xml = clean_area_temp
                                        a_xml = re.sub(r'{{\s*area\.name\s*}}', str(area_obj.get("name", "")), a_xml, flags=re.IGNORECASE)
                                        
                                        # Within this Area, repeat the table rows matching item.* placeholders
                                        items_data = area_obj.get("items", [])
                                        tr_pattern = re.compile(r'(<w:tr\b[^>]*>.*?</w:tr>)', re.DOTALL)
                                        
                                        def replace_item_row(row_match):
                                            row_xml = row_match.group(1)
                                            if 'item.' in row_xml and items_data:
                                                repeated_rows = []
                                                for idx, list_item in enumerate(items_data):
                                                    row_copy = row_xml
                                                    row_copy = re.sub(r'{{\s*item\.index\s*}}', str(idx + 1), row_copy, flags=re.IGNORECASE)
                                                    for item_key, item_val in list_item.items():
                                                        pattern = r'{{\s*item\.' + re.escape(item_key) + r'\s*}}'
                                                        row_copy = re.sub(pattern, str(item_val), row_copy, flags=re.IGNORECASE)
                                                    repeated_rows.append(row_copy)
                                                return "".join(repeated_rows)
                                            return row_xml
                                            
                                        a_xml = tr_pattern.sub(replace_item_row, a_xml)
                                        expanded_areas.append(a_xml)
                                    return "".join(expanded_areas)
                                    
                                f_xml = area_block_pattern.sub(replace_area_block, f_xml)
                                expanded_floors.append(f_xml)
                            return "".join(expanded_floors)
                            
                        xml_content = floor_block_pattern.sub(replace_floor_block, xml_content)
                        
                        # 2. Fallback / Flat Table Repeater (if flat template remains or flat payment list is used)
                        tr_pattern = re.compile(r'(<w:tr\b[^>]*>.*?</w:tr>)', re.DOTALL)
                        payments_list = tokens.get("payments", [])
                        if not isinstance(payments_list, list):
                            payments_list = []
                            
                        def replace_flat_row(match):
                            row_xml = match.group(1)
                            # Fallback item parser for non-nested flat list templates
                            if 'item.' in row_xml and items_list and '#floor' not in xml_content:
                                repeated_rows = []
                                last_floor = None
                                last_area = None
                                for idx, list_item in enumerate(items_list):
                                    current_floor = list_item.get('floor', '').strip()
                                    current_area = list_item.get('area', '').strip()
                                    
                                    if current_floor and current_floor != last_floor:
                                        last_floor = current_floor
                                        last_area = None
                                        floor_row = row_xml
                                        for key in list_item.keys():
                                            floor_row = re.sub(r'{{\s*item\.' + re.escape(key) + r'\s*}}', '', floor_row, flags=re.IGNORECASE)
                                        floor_row = re.sub(r'{{\s*item\.description\s*}}', f"<w:r><w:rPr><w:b/><w:sz w:val=\"24\"/><w:color w:val=\"000000\"/></w:rPr><w:t>{current_floor.upper()} FLOOR</w:t></w:r>", floor_row, flags=re.IGNORECASE)
                                        floor_row = re.sub(r'{{\s*item\.index\s*}}', '', floor_row, flags=re.IGNORECASE)
                                        floor_row = floor_row.replace('<w:tc>', '<w:tc><w:tcPr><w:shd w:fill=\"F1F5F9\"/></w:tcPr>')
                                        repeated_rows.append(floor_row)
                                        
                                    if current_area and current_area != last_area:
                                        last_area = current_area
                                        area_row = row_xml
                                        for key in list_item.keys():
                                            area_row = re.sub(r'{{\s*item\.' + re.escape(key) + r'\s*}}', '', area_row, flags=re.IGNORECASE)
                                        area_row = re.sub(r'{{\s*item\.description\s*}}', f"<w:r><w:rPr><w:b/><w:sz w:val=\"20\"/><w:color w:val=\"475569\"/></w:rPr><w:t>  ↳ Area: {current_area}</w:t></w:r>", area_row, flags=re.IGNORECASE)
                                        area_row = re.sub(r'{{\s*item\.index\s*}}', '', area_row, flags=re.IGNORECASE)
                                        area_row = area_row.replace('<w:tc>', '<w:tc><w:tcPr><w:shd w:fill=\"F8FAFC\"/></w:tcPr>')
                                        repeated_rows.append(area_row)
                                        
                                    row_copy = row_xml
                                    row_copy = re.sub(r'{{\s*item\.index\s*}}', str(idx + 1), row_copy, flags=re.IGNORECASE)
                                    for item_key, item_val in list_item.items():
                                        pattern = r'{{\s*item\.' + re.escape(item_key) + r'\s*}}'
                                        row_copy = re.sub(pattern, str(item_val), row_copy, flags=re.IGNORECASE)
                                    repeated_rows.append(row_copy)
                                return "".join(repeated_rows)
                            elif 'payment.' in row_xml and payments_list:
                                repeated_rows = []
                                for idx, list_payment in enumerate(payments_list):
                                    row_copy = row_xml
                                    row_copy = re.sub(r'{{\s*payment\.index\s*}}', str(idx + 1), row_copy, flags=re.IGNORECASE)
                                    for pay_key, pay_val in list_payment.items():
                                        pattern = r'{{\s*payment\.' + re.escape(pay_key) + r'\s*}}'
                                        row_copy = re.sub(pattern, str(pay_val), row_copy, flags=re.IGNORECASE)
                                    repeated_rows.append(row_copy)
                                return "".join(repeated_rows)
                            return row_xml
                            
                        xml_content = tr_pattern.sub(replace_row if 'replace_row' in locals() else replace_flat_row, xml_content)
                        
                    # Global token replacement with optional whitespace support
                    for key, val in tokens.items():
                        if key not in ["items", "payments", "floors"]:
                            pattern = r'{{\s*' + re.escape(str(key)) + r'\s*}}'
                            xml_content = re.sub(pattern, str(val), xml_content, flags=re.IGNORECASE)
                            
                    data = xml_content.encode('utf-8')
                zout.writestr(item, data)
                
    # 2. Try Local Word conversion first (on Windows)
    local_pdf = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    local_pdf.close() # Close so Microsoft Word can overwrite it
    
    logger.info("Attempting local Word to PDF conversion...")
    if convert_docx_to_pdf_local(temp_docx_path, local_pdf.name):
        try:
            if os.path.exists(temp_docx_path):
                os.remove(temp_docx_path)
            if os.path.exists(temp_dir):
                os.rmdir(temp_dir)
        except Exception as e:
            logger.warn(f"Failed to delete temp local docx files: {e}")
        return local_pdf.name

    # 2b. Try LibreOffice conversion (on Linux/Docker)
    logger.info("Attempting LibreOffice to PDF conversion...")
    if convert_docx_to_pdf_libreoffice(temp_docx_path, local_pdf.name):
        try:
            if os.path.exists(temp_docx_path):
                os.remove(temp_docx_path)
            if os.path.exists(temp_dir):
                os.rmdir(temp_dir)
        except Exception as e:
            logger.warn(f"Failed to delete temp local docx files: {e}")
        return local_pdf.name

    # 3. Fallback: Upload the merged .docx file to Google Drive and convert to PDF
    logger.info("Local conversion failed or unavailable. Falling back to Google Drive...")
    drive_service, _ = get_google_services(credentials_json)
    
    cloned_file_id = None
    try:
        logger.info("Uploading temporary docx to Google Drive for PDF conversion...")
        file_metadata = {
            'name': f"TEMP_GEN_{output_pdf_name.replace('.pdf', '')}",
            'mimeType': 'application/vnd.google-apps.document' # Injects conversion to Google Docs format
        }
        media = MediaFileUpload(
            temp_docx_path,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            resumable=True
        )
        
        uploaded_file = drive_service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id'
        ).execute()
        
        cloned_file_id = uploaded_file.get('id')
        logger.info(f"Drive file created: {cloned_file_id}. Exporting to PDF...")
        
        # 4. Export Google Doc file to PDF
        export_request = drive_service.files().export_media(fileId=cloned_file_id, mimeType='application/pdf')
        
        tmp_pdf = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        with open(tmp_pdf.name, 'wb') as f:
            f.write(export_request.execute())
            
        logger.info(f"PDF exported successfully to: {tmp_pdf.name}")
        return tmp_pdf.name
        
    finally:
        # 5. Clean up temporary files on disk and Google Drive
        try:
            if os.path.exists(temp_docx_path):
                os.remove(temp_docx_path)
            if os.path.exists(temp_dir):
                os.rmdir(temp_dir)
        except Exception as e:
            logger.warn(f"Failed to delete temp local docx files: {e}")
            
        if cloned_file_id:
            try:
                logger.info(f"Deleting temp Drive file {cloned_file_id}...")
                drive_service.files().delete(fileId=cloned_file_id).execute()
            except Exception as e:
                logger.error(f"Failed to delete temp Drive file: {e}")
