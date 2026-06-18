import os
import zipfile
import re
import tempfile
import logging
from services.google_doc_engine import get_google_services
from googleapiclient.http import MediaFileUpload

logger = logging.getLogger(__name__)

def merge_docx_template(template_path, tokens, output_pdf_name, credentials_json=None):
    """
    Reads a .docx template from disk, performs placeholder replacement
    (including table row repetition for list items), uploads the resulting
    document to Google Drive to convert it to a PDF, and downloads the PDF.
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
                    
                    # Special processing for document.xml (repeating table rows)
                    if item.filename == 'word/document.xml' and items_list:
                        # Find table rows <w:tr> containing item placeholders
                        tr_pattern = re.compile(r'(<w:tr\b[^>]*>.*?</w:tr>)', re.DOTALL)
                        
                        def replace_row(match):
                            row_xml = match.group(1)
                            # If it contains item placeholder, repeat it!
                            if '{{item.' in row_xml:
                                repeated_rows = []
                                for idx, list_item in enumerate(items_list):
                                    row_copy = row_xml
                                    # Always replace a 1-based index placeholder if needed
                                    row_copy = row_copy.replace('{{item.index}}', str(idx + 1))
                                    
                                    # Replace item placeholders
                                    for item_key, item_val in list_item.items():
                                        placeholder = '{{item.' + item_key + '}}'
                                        row_copy = row_copy.replace(placeholder, str(item_val))
                                    
                                    repeated_rows.append(row_copy)
                                return "".join(repeated_rows)
                            return row_xml
                        
                        xml_content = tr_pattern.sub(replace_row, xml_content)
                    
                    # Global token replacement
                    for key, val in tokens.items():
                        if key != "items":
                            placeholder = '{{' + str(key) + '}}'
                            xml_content = xml_content.replace(placeholder, str(val))
                            
                    data = xml_content.encode('utf-8')
                
                zout.writestr(item, data)
                
    # 2. Upload the merged .docx file to Google Drive and convert to PDF
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
        
        # 3. Export Google Doc file to PDF
        export_request = drive_service.files().export_media(fileId=cloned_file_id, mimeType='application/pdf')
        
        tmp_pdf = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        with open(tmp_pdf.name, 'wb') as f:
            f.write(export_request.execute())
            
        logger.info(f"PDF exported successfully to: {tmp_pdf.name}")
        return tmp_pdf.name
        
    finally:
        # 4. Clean up temporary files on disk and Google Drive
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
