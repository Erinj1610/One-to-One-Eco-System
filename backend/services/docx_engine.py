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
    import win32com.client
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
    import pythoncom
    pythoncom.CoInitialize()
    
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
                    if item.filename == 'word/document.xml':
                        # Find table rows <w:tr> containing placeholders
                        tr_pattern = re.compile(r'(<w:tr\b[^>]*>.*?</w:tr>)', re.DOTALL)
                        
                        payments_list = tokens.get("payments", [])
                        if not isinstance(payments_list, list):
                            payments_list = []
                            
                        def replace_row(match):
                            row_xml = match.group(1)
                            # Check if it contains item placeholder (supporting optional whitespace)
                            if 'item.' in row_xml and items_list:
                                repeated_rows = []
                                for idx, list_item in enumerate(items_list):
                                    row_copy = row_xml
                                    # Replace item.index with optional whitespace
                                    row_copy = re.sub(r'{{\s*item\.index\s*}}', str(idx + 1), row_copy, flags=re.IGNORECASE)
                                    
                                    # Replace item placeholders with optional whitespace
                                    for item_key, item_val in list_item.items():
                                        pattern = r'{{\s*item\.' + re.escape(item_key) + r'\s*}}'
                                        row_copy = re.sub(pattern, str(item_val), row_copy, flags=re.IGNORECASE)
                                    
                                    repeated_rows.append(row_copy)
                                return "".join(repeated_rows)
                            elif 'payment.' in row_xml and payments_list:
                                repeated_rows = []
                                for idx, list_payment in enumerate(payments_list):
                                    row_copy = row_xml
                                    # Replace payment.index with optional whitespace
                                    row_copy = re.sub(r'{{\s*payment\.index\s*}}', str(idx + 1), row_copy, flags=re.IGNORECASE)
                                    
                                    # Replace payment placeholders with optional whitespace
                                    for pay_key, pay_val in list_payment.items():
                                        pattern = r'{{\s*payment\.' + re.escape(pay_key) + r'\s*}}'
                                        row_copy = re.sub(pattern, str(pay_val), row_copy, flags=re.IGNORECASE)
                                    
                                    repeated_rows.append(row_copy)
                                return "".join(repeated_rows)
                            return row_xml
                        
                        xml_content = tr_pattern.sub(replace_row, xml_content)
                    
                    # Global token replacement with optional whitespace support
                    for key, val in tokens.items():
                        if key != "items" and key != "payments":
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
