import os
from googleapiclient.discovery import build
from google.oauth2 import service_account
from google.auth import default
import google.auth.transport.requests
import tempfile
import logging

logger = logging.getLogger(__name__)

# Scopes required for Drive and Docs operations
SCOPES = [
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive'
]

def get_google_services(credentials_json=None):
    """
    Initializes Google Drive and Docs services.
    If credentials_json (dict) is provided, it uses it directly.
    Otherwise, falls back to Application Default Credentials.
    """
    try:
        if credentials_json:
            logger.info("Using provided service account credentials.")
            creds = service_account.Credentials.from_service_account_info(
                credentials_json, scopes=SCOPES
            )
        else:
            logger.info("Using Application Default Credentials.")
            creds, project = default(scopes=SCOPES)
        
        drive_service = build('drive', 'v3', credentials=creds)
        docs_service = build('docs', 'v1', credentials=creds)
        return drive_service, docs_service
    except Exception as e:
        logger.error(f"Failed to initialize Google Services: {e}")
        raise e

import re

def extract_file_id(source: str):
    """
    Extracts the Google File ID from a full URL or returns the string if it's already an ID.
    Supports docs.google.com/document/d/ID/... and docs.google.com/spreadsheets/d/ID/...
    """
    if not source: return None
    # Look for the pattern /d/[ID]/
    match = re.search(r'/d/([a-zA-Z0-9-_]+)', source)
    if match:
        return match.group(1)
    return source # Assume it's already an ID

def merge_google_doc(template_source, tokens, output_pdf_name, credentials_json=None):
    """
    1. Clones a Google Doc template.
    2. Replaces {{TOKENS}} with data.
    3. Exports as PDF.
    4. Deletes the temporary Cloned Doc.
    """
    drive_service, docs_service = get_google_services(credentials_json)
    template_id = extract_file_id(template_source)
    
    try:
        # Get parents of the template to inherit storage quota from the shared folder
        try:
            file_info = drive_service.files().get(fileId=template_id, fields="parents").execute()
            parents = file_info.get("parents", [])
        except Exception as pe:
            logger.warn(f"Failed to fetch parents for template {template_id}: {pe}")
            parents = []

        # If no parent folders, look for any folder shared with the Service Account to inherit quota
        if not parents:
            try:
                folder_results = drive_service.files().list(
                    q="mimeType='application/vnd.google-apps.folder' and trashed=false",
                    fields="files(id, name)",
                    pageSize=5
                ).execute()
                files_list = folder_results.get('files', [])
                if files_list:
                    parents = [files_list[0]['id']]
                    logger.info(f"Quota Fallback: Using discovered parent folder '{files_list[0]['name']}' ({parents[0]})")
            except Exception as fe:
                logger.warn(f"Failed to query shared folders fallback: {fe}")

        # 1. Clone the template
        logger.info(f"Cloning template {template_id}...")
        copy_metadata = {
            'name': f"TEMP_GEN_{output_pdf_name}"
        }
        if parents:
            copy_metadata['parents'] = parents
            
        cloned_file = drive_service.files().copy(fileId=template_id, body=copy_metadata).execute()
        cloned_id = cloned_file.get('id')
        
        # 2. Build BatchUpdate requests for token replacement
        requests = []
        for key, value in tokens.items():
            # Standard pattern: {{TOKEN}}
            requests.append({
                'replaceAllText': {
                    'containsText': {
                        'text': '{{' + key + '}}',
                        'matchCase': False
                    },
                    'replaceText': str(value)
                }
            })
        
        if requests:
            logger.info(f"Applying {len(requests)} updates to doc {cloned_id}...")
            docs_service.documents().batchUpdate(documentId=cloned_id, body={'requests': requests}).execute()
        
        # 3. Export to PDF
        logger.info(f"Exporting {cloned_id} to PDF...")
        export_request = drive_service.files().export_media(fileId=cloned_id, mimeType='application/pdf')
        
        # Save to a temporary file
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        with open(tmp.name, 'wb') as f:
            f.write(export_request.execute())
        
        # 4. Cleanup the cloned Google Doc (important to keep Drive clean)
        drive_service.files().delete(fileId=cloned_id).execute()
        
        return tmp.name
        
    except Exception as e:
        logger.error(f"Google Doc Merge Error: {e}")
        # Attempt to cleanup if we have a cloned ID
        if 'cloned_id' in locals():
            try: drive_service.files().delete(fileId=cloned_id).execute()
            except: pass
        raise e

import threading
folder_lock = threading.Lock()

def get_or_create_folder(drive_service, folder_name, parent_id):
    """
    Finds a folder by name inside parent_id or creates a new one inside Shared Drive.
    Thread-safe to prevent parallel duplicate folder creation.
    """
    clean_name = str(folder_name).strip() if folder_name else "General"
    safe_name = clean_name.replace("'", "\\'")
    query = f"mimeType='application/vnd.google-apps.folder' and name='{safe_name}' and '{parent_id}' in parents and trashed=false"
    
    with folder_lock:
        try:
            res = drive_service.files().list(
                q=query,
                fields="files(id, name)",
                supportsAllDrives=True,
                includeItemsFromAllDrives=True
            ).execute()
            files = res.get('files', [])
            if files:
                return files[0]['id']
        except Exception as e:
            logger.warn(f"Folder search error for {clean_name}: {e}")

        # Create folder inside Shared Drive
        folder_metadata = {
            'name': clean_name,
            'mimeType': 'application/vnd.google-apps.folder',
            'parents': [parent_id]
        }
        try:
            created = drive_service.files().create(
                body=folder_metadata,
                fields='id',
                supportsAllDrives=True
            ).execute()
            return created.get('id') or parent_id
        except Exception as e:
            logger.error(f"Failed to create folder '{clean_name}': {e}")
            return parent_id

def merge_google_sheet(template_source, tokens, sheet_name=None, output_pdf_name="proposal.pdf", credentials_json=None, is_save_action=False):
    """
    Hybrid Dedicated Template + PDF Revision Vault System:
    1. Locates/Creates Root > Client > Project > Order/Design Fee Folder.
    2. Ensures subfolders 'Latest' and 'History' exist.
    3. Manages dedicated frozen template copy '[Template] {doc_folder_name}'.
    4. Updates values dynamically on target standalone sheet.
    5. On Save: Moves previous PDF from Latest to History (timestamped) and saves new PDF to Latest.
    6. On Preview: Returns PDF stream read-only without modifying Google Drive files/revisions.
    """
    SCOPES_SHEETS = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
    
    try:
        if credentials_json:
            creds = service_account.Credentials.from_service_account_info(credentials_json, scopes=SCOPES_SHEETS)
            try:
                creds = creds.with_subject('erin.jones@1-to-1.world')
                logger.info("Domain-Wide Delegation active: Impersonating erin.jones@1-to-1.world for Drive & Sheets operations.")
            except Exception as subject_err:
                logger.warn(f"Subject impersonation warning: {subject_err}")
        else:
            creds, project = default(scopes=SCOPES_SHEETS)
            
        drive_service = build('drive', 'v3', credentials=creds)
        sheets_service = build('sheets', 'v4', credentials=creds)
    except Exception as e:
        logger.error(f"Failed to initialize Google Services for Sheets: {e}")
        raise e

    template_id = extract_file_id(template_source)
    if not template_id:
        raise ValueError("Invalid Master Google Sheet URL or ID")

    try:
        # Extract Client, Project, and Document details for folder hierarchy
        client_name = str(tokens.get('CLIENT_NAME') or tokens.get('COMPANY_NAME') or tokens.get('CONTACT_PERSON') or 'Clients').strip()
        project_name = str(tokens.get('PROJECT_NAME') or tokens.get('PROJECT_NAME_LOCATION') or 'Project').strip()
        
        # Calculate subfolder name (e.g. "Design Fee Proposal" or "Order Q-2026-0576")
        order_num = tokens.get('ORDER_NUMBER') or tokens.get('DOCUMENT_NUMBER') or tokens.get('PROPOSAL_NUMBER')
        if sheet_name == 'DESIGN_FEE_PROPOSAL':
            doc_folder_name = "Design Fee Proposal"
        elif order_num and not str(order_num).endswith('XXX'):
            doc_folder_name = f"Order {order_num}"
        else:
            doc_folder_name = str(tokens.get('FEE_NAME') or sheet_name or 'Document').replace('_', ' ').strip()

        doc_label = str(sheet_name or 'Document').replace('_', ' ').title()

        # Get spreadsheet metadata directly from Master Template to find target sheet tab GID
        spreadsheet = sheets_service.spreadsheets().get(spreadsheetId=template_id).execute()
        sheets = spreadsheet.get('sheets', [])
        
        target_sheet = None
        target_gid = 0
        if sheet_name:
            clean_name = str(sheet_name).strip().lower().replace('_', ' ')
            for s in sheets:
                s_title = s['properties']['title'].strip().lower().replace('_', ' ')
                if clean_name in s_title or s_title in clean_name:
                    target_sheet = s
                    target_gid = s['properties']['sheetId']
                    break
        
        if not target_sheet and sheets:
            target_sheet = sheets[0]
            target_gid = target_sheet['properties']['sheetId']

        working_spreadsheet_id = template_id
        sheet_url = f"https://docs.google.com/spreadsheets/d/{template_id}"

        # Lazy Drive Initialization: Create folders and dedicated template copy ONLY on SAVE action!
        if is_save_action:
            # Build folder path: Root > Client > Project > Document/Order Folder
            client_folder_id = get_or_create_folder(drive_service, client_name, ROOT_DRIVE_FOLDER_ID)
            project_folder_id = get_or_create_folder(drive_service, project_name, client_folder_id)
            doc_subfolder_id = get_or_create_folder(drive_service, doc_folder_name, project_folder_id)

            # Build Vault Subfolders: Latest & History
            latest_folder_id = get_or_create_folder(drive_service, "Latest", doc_subfolder_id)
            history_folder_id = get_or_create_folder(drive_service, "History", doc_subfolder_id)

            logger.info(f"Target Google Drive Folder Path: Root > Client='{client_name}' > Project='{project_name}' > DocFolder='{doc_folder_name}' ({doc_subfolder_id})")

            # Check if a dedicated frozen template sheet already exists for this order/design fee
            template_file_title = f"[Template] {doc_label} - {doc_folder_name}"
            existing_sheet_id = None
            existing_sheet_url = None

            try:
                query = f"mimeType='application/vnd.google-apps.spreadsheet' and '{doc_subfolder_id}' in parents and trashed=false"
                existing_res = drive_service.files().list(
                    q=query,
                    fields="files(id, webViewLink, name)",
                    supportsAllDrives=True,
                    includeItemsFromAllDrives=True
                ).execute()
                existing_files = existing_res.get('files', [])
                for ef in existing_files:
                    if ef.get('name') == template_file_title or template_file_title in ef.get('name', ''):
                        existing_sheet_id = ef['id']
                        existing_sheet_url = ef.get('webViewLink')
                        break
                if not existing_sheet_id and existing_files:
                    existing_sheet_id = existing_files[0]['id']
                    existing_sheet_url = existing_files[0].get('webViewLink')

                if existing_sheet_id:
                    logger.info(f"Found dedicated frozen template sheet '{template_file_title}' ({existing_sheet_id}).")
            except Exception as search_err:
                logger.warn(f"Search for dedicated sheet in subfolder {doc_subfolder_id} failed: {search_err}")

            if existing_sheet_id:
                working_spreadsheet_id = existing_sheet_id
                sheet_url = existing_sheet_url
            else:
                # Copy current Master Google Sheet directly into target Shared Drive subfolder as pristine frozen template
                copy_body = {
                    'name': template_file_title,
                    'parents': [doc_subfolder_id]
                }
                
                copied_file = drive_service.files().copy(
                    fileId=template_id,
                    body=copy_body,
                    fields='id, webViewLink',
                    supportsAllDrives=True
                ).execute()

                working_spreadsheet_id = copied_file.get('id')
                sheet_url = copied_file.get('webViewLink')
                logger.info(f"Created new dedicated frozen template sheet '{template_file_title}' ({working_spreadsheet_id}) inside Shared Drive subfolder {doc_subfolder_id}")

        import time
        working_gid = target_gid
        working_title = target_sheet['properties']['title']

        # Duplicate target tab into a temporary working tab inside the dedicated template file
        dup_title = f"PDF_Render_{int(time.time() * 1000)}"
        dup_res = sheets_service.spreadsheets().batchUpdate(
            spreadsheetId=working_spreadsheet_id,
            body={
                'requests': [{
                    'duplicateSheet': {
                        'sourceSheetId': target_gid,
                        'newSheetName': dup_title
                    }
                }]
            }
        ).execute()
        
        temp_tab_gid = dup_res['replies'][0]['duplicateSheet']['properties']['sheetId']

        # Hide column A (dimensionIndex 0) on the temporary working tab
        try:
            sheets_service.spreadsheets().batchUpdate(
                spreadsheetId=working_spreadsheet_id,
                body={
                    'requests': [{
                        'updateDimensionProperties': {
                            'range': {
                                'sheetId': temp_tab_gid,
                                'dimension': 'COLUMNS',
                                'startIndex': 0,
                                'endIndex': 1
                            },
                            'properties': {
                                'hiddenByUser': True
                            },
                            'fields': 'hiddenByUser'
                        }
                    }]
                }
            ).execute()
        except Exception as hide_err:
            logger.warn(f"Could not hide Column A via batchUpdate: {hide_err}")
        
        # Read full cell metadata with rich text formatting runs from temporary tab
        try:
            sp_data = sheets_service.spreadsheets().get(
                spreadsheetId=working_spreadsheet_id,
                ranges=[f"'{dup_title}'!A1:Z300"],
                includeGridData=True
            ).execute()
            
            grid_data = sp_data['sheets'][0]['data'][0]
            row_data = grid_data.get('rowData', [])
            
            import re
            lower_tokens = {str(k).lower(): v for k, v in tokens.items()}
            update_cell_requests = []

            for r_i, r_obj in enumerate(row_data):
                cell_objs = r_obj.get('values', [])
                for c_i, c_obj in enumerate(cell_objs):
                    user_val = c_obj.get('userEnteredValue', {})
                    formatted_val = c_obj.get('formattedValue', '') or user_val.get('stringValue', '')
                    if not formatted_val:
                        continue
                    
                    cell_str = str(formatted_val)
                    if "{{" in cell_str or "}}" in cell_str or "{?" in cell_str:
                        # Extract original rich text formatting runs
                        orig_runs = c_obj.get('textFormatRuns', [])
                        
                        # Track character index replacements for accurate format run shifting
                        replacements = []
                        
                        # Find all token occurrences and their ranges in original cell string
                        token_matches = list(re.finditer(r'\{\{([^}]+)\}\}|\{\?([^?]+)\?\}', cell_str))
                        
                        new_str = cell_str
                        offset = 0
                        
                        for m in token_matches:
                            raw_match = m.group(0)
                            token_key = (m.group(1) or m.group(2) or '').strip()
                            token_key_lower = token_key.lower()
                            
                            sub_val = ''
                            if token_key in tokens and not isinstance(tokens[token_key], (list, dict)):
                                sub_val = str(tokens[token_key]) if tokens[token_key] is not None else ''
                            elif token_key_lower in lower_tokens and not isinstance(lower_tokens[token_key_lower], (list, dict)):
                                sub_val = str(lower_tokens[token_key_lower]) if lower_tokens[token_key_lower] is not None else ''
                            
                            match_start = m.start() + offset
                            old_len = len(raw_match)
                            new_len = len(sub_val)
                            
                            new_str = new_str[:match_start] + sub_val + new_str[match_start + old_len:]
                            delta = new_len - old_len
                            offset += delta
                            replacements.append((m.start(), old_len, delta))

                        # Build adjusted rich text format runs
                        new_cell_data = {
                            'userEnteredValue': {'stringValue': new_str}
                        }

                        if orig_runs:
                            new_runs = []
                            for run in orig_runs:
                                orig_start = run.get('startIndex', 0)
                                format_info = run.get('format', {})
                                
                                # Shift startIndex based on cumulative character deltas preceding orig_start
                                shifted_start = orig_start
                                for rep_start, rep_old_len, rep_delta in replacements:
                                    if orig_start > rep_start:
                                        if orig_start >= rep_start + rep_old_len:
                                            shifted_start += rep_delta
                                        else:
                                            # If run started inside the token, align to replacement start
                                            shifted_start = rep_start
                                
                                shifted_start = max(0, min(shifted_start, len(new_str)))
                                new_runs.append({'startIndex': shifted_start, 'format': format_info})
                            
                            if new_runs:
                                new_cell_data['textFormatRuns'] = new_runs

                        # Preserve overall cell formatting
                        if 'userEnteredFormat' in c_obj:
                            new_cell_data['userEnteredFormat'] = c_obj['userEnteredFormat']

                        update_cell_requests.append({
                            'updateCells': {
                                'rows': [{
                                    'values': [new_cell_data]
                                }],
                                'fields': 'userEnteredValue,textFormatRuns,userEnteredFormat',
                                'start': {
                                    'sheetId': temp_tab_gid,
                                    'rowIndex': r_i,
                                    'columnIndex': c_i
                                }
                            }
                        })

            if update_cell_requests:
                logger.info(f"Submitting {len(update_cell_requests)} rich-text bold-preserving cell updates to temporary tab '{dup_title}'...")
                sheets_service.spreadsheets().batchUpdate(
                    spreadsheetId=working_spreadsheet_id,
                    body={'requests': update_cell_requests}
                ).execute()
        except Exception as token_err:
            logger.error(f"Error updating rich text cell tokens in temporary working tab: {token_err}")

        # Render PDF stream from the temporary tab
        authed_session = google.auth.transport.requests.AuthorizedSession(creds)
        pdf_bytes = None

        export_urls = [
            f"https://docs.google.com/spreadsheets/d/{working_spreadsheet_id}/export?format=pdf&gid={temp_tab_gid}&portrait=true&size=A4&gridlines=false&fitw=true&c1=1&c2=25",
            f"https://docs.google.com/spreadsheets/d/{working_spreadsheet_id}/pdf?gid={temp_tab_gid}&portrait=true&size=A4&gridlines=false&fitw=true&c1=1&c2=25"
        ]
        for url in export_urls:
            try:
                res = authed_session.get(url)
                if res.status_code == 200 and res.content and len(res.content) > 1000:
                    logger.info(f"Successfully exported PDF from temporary working tab via {url}")
                    pdf_bytes = res.content
                    break
            except Exception as url_err:
                logger.warn(f"Failed fetching PDF export URL: {url_err}")

        if not pdf_bytes:
            export_req = drive_service.files().export_media(fileId=working_spreadsheet_id, mimeType='application/pdf')
            pdf_bytes = export_req.execute()

        # Delete temporary tab so dedicated template sheet remains 100% pristine with raw variables!
        try:
            sheets_service.spreadsheets().batchUpdate(
                spreadsheetId=working_spreadsheet_id,
                body={'requests': [{'deleteSheet': {'sheetId': temp_tab_gid}}]}
            ).execute()
            logger.info(f"Cleaned up temporary tab '{dup_title}', leaving dedicated template pristine.")
        except Exception as del_err:
            logger.warn(f"Failed to delete temp tab: {del_err}")

        # Save to local temp file for UI preview/return
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        with open(tmp.name, 'wb') as f:
            f.write(pdf_bytes)

        # Execute PDF Revision Vault Management ONLY when is_save_action is True
        if is_save_action:
            try:
                # 1. Search for existing PDFs in Latest/
                latest_query = f"'{latest_folder_id}' in parents and mimeType='application/pdf' and trashed=false"
                latest_res = drive_service.files().list(
                    q=latest_query,
                    fields="files(id, name, parents)",
                    supportsAllDrives=True,
                    includeItemsFromAllDrives=True
                ).execute()
                existing_latest_files = latest_res.get('files', [])

                rev_count = len(existing_latest_files) + 1
                
                # Check history folder to compute exact revision number
                history_query = f"'{history_folder_id}' in parents and mimeType='application/pdf' and trashed=false"
                history_res = drive_service.files().list(
                    q=history_query,
                    fields="files(id, name)",
                    supportsAllDrives=True,
                    includeItemsFromAllDrives=True
                ).execute()
                hist_files = history_res.get('files', [])
                total_revisions = len(existing_latest_files) + len(hist_files) + 1

                # Move previous PDF from Latest to History with timestamped name
                for old_f in existing_latest_files:
                    old_id = old_f['id']
                    timestamp_str = time.strftime('%Y-%m-%d %H-%M')
                    archive_name = f"{doc_label} - {doc_folder_name} - Rev {total_revisions - 1} ({timestamp_str}).pdf"
                    
                    drive_service.files().update(
                        fileId=old_id,
                        addParents=history_folder_id,
                        removeParents=latest_folder_id,
                        body={'name': archive_name},
                        fields='id, parents, name',
                        supportsAllDrives=True
                    ).execute()
                    logger.info(f"Moved previous revision '{archive_name}' to History folder.")

                # Save new PDF into Latest/
                new_pdf_name = f"{doc_label} - {doc_folder_name} - Rev {total_revisions}.pdf"
                pdf_metadata = {
                    'name': new_pdf_name,
                    'mimeType': 'application/pdf',
                    'parents': [latest_folder_id]
                }
                
                from googleapiclient.http import MediaFileUpload
                media = MediaFileUpload(tmp.name, mimetype='application/pdf')
                uploaded_pdf = drive_service.files().create(
                    body=pdf_metadata,
                    media_body=media,
                    fields='id, webViewLink',
                    supportsAllDrives=True
                ).execute()
                logger.info(f"Saved new PDF '{new_pdf_name}' ({uploaded_pdf.get('id')}) into Latest folder.")
            except Exception as vault_err:
                logger.error(f"Error managing PDF Vault in Google Drive: {vault_err}")

        logger.info(f"Google Sheet PDF operation complete: '{doc_folder_name}' (SaveAction: {is_save_action})")
        return tmp.name, working_spreadsheet_id, sheet_url

    except Exception as e:
        logger.error(f"Google Sheet Merge Error: {e}")
        raise e
