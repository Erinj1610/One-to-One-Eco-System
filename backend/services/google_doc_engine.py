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

ROOT_DRIVE_FOLDER_ID = "0AFF94SUUC_EQUk9PVA"

def get_or_create_folder(drive_service, folder_name, parent_id):
    """
    Finds a folder by name inside parent_id or creates a new one inside Shared Drive.
    """
    clean_name = str(folder_name).strip() if folder_name else "General"
    safe_name = clean_name.replace("'", "\\'")
    query = f"mimeType='application/vnd.google-apps.folder' and name='{safe_name}' and '{parent_id}' in parents and trashed=false"
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
        return created.get('id')
    except Exception as e:
        logger.error(f"Failed to create folder '{clean_name}': {e}")
        return parent_id

def merge_google_sheet(template_source, tokens, sheet_name=None, output_pdf_name="proposal.pdf", credentials_json=None):
    """
    1. Locates/Creates Client Folder > Project Folder under Root Drive Folder.
    2. Copies Master Google Sheet Workbook into the Project Folder.
    3. Replaces {{TOKENS}} in the target sheet tab using Google Sheets API.
    4. Hides Column A ([FIXED]).
    5. Exports the target sheet tab as PDF and retains the permanent live Google Sheet.
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
        # Extract Client, Project, and Document details for 3-tier folder structure
        client_name = str(tokens.get('CLIENT_NAME') or tokens.get('COMPANY_NAME') or tokens.get('CONTACT_PERSON') or 'Clients').strip()
        project_name = str(tokens.get('PROJECT_NAME') or tokens.get('PROJECT_NAME_LOCATION') or 'Project').strip()
        doc_folder_name = str(tokens.get('FEE_NAME') or sheet_name or 'Design Fee').replace('_', ' ').strip()
        doc_label = str(sheet_name or 'Document').replace('_', ' ').title()

        # Build folder path: Root > Client > Project > Order/Design Fee Folder
        client_folder_id = get_or_create_folder(drive_service, client_name, ROOT_DRIVE_FOLDER_ID)
        project_folder_id = get_or_create_folder(drive_service, project_name, client_folder_id)
        doc_subfolder_id = get_or_create_folder(drive_service, doc_folder_name, project_folder_id)

        logger.info(f"Target Google Drive Folder Path: Root > Client='{client_name}' > Project='{project_name}' > DocFolder='{doc_folder_name}' ({doc_subfolder_id})")

        # Get spreadsheet metadata directly to find target sheet tab GID
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

        # Check if a standalone Google Sheet file already exists for this order/design fee in the subfolder
        import time
        file_title = f"{doc_label} - {doc_folder_name}"
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
            if existing_files:
                existing_sheet_id = existing_files[0]['id']
                existing_sheet_url = existing_files[0].get('webViewLink')
                logger.info(f"Found existing isolated Google Sheet '{existing_files[0]['name']}' ({existing_sheet_id}) in subfolder {doc_subfolder_id}. Re-syncing data into existing file...")
        except Exception as search_err:
            logger.warn(f"Search for existing sheet in subfolder {doc_subfolder_id} failed: {search_err}")

        if existing_sheet_id:
            working_spreadsheet_id = existing_sheet_id
            sheet_url = existing_sheet_url
        else:
            # First time creation: Copy current Master Google Sheet directly into target Shared Drive subfolder
            full_file_title = f"{file_title} - {time.strftime('%Y-%m-%d')}"
            copy_body = {
                'name': full_file_title,
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
            logger.info(f"Created new isolated Google Sheet '{full_file_title}' ({working_spreadsheet_id}) inside Shared Drive subfolder {doc_subfolder_id}")

        working_gid = target_gid
        working_title = target_sheet['properties']['title']

        # 3. Hide Column A in working Google Sheet and perform token substitution
        range_name = f"'{working_title}'!A1:Z300"
        
        # Hide column A (dimensionIndex 0) on the target working tab
        try:
            sheets_service.spreadsheets().batchUpdate(
                spreadsheetId=working_spreadsheet_id,
                body={
                    'requests': [{
                        'updateDimensionProperties': {
                            'range': {
                                'sheetId': working_gid,
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
        
        try:
            val_result = sheets_service.spreadsheets().values().get(
                spreadsheetId=working_spreadsheet_id, range=range_name
            ).execute()
            
            rows = val_result.get('values', [])
            updated_rows = []
            has_changes = False

            # Case-insensitive mapping for token lookup
            lower_tokens = {str(k).lower(): v for k, v in tokens.items()}

            for row in rows:
                new_row = []
                for cell in row:
                    cell_str = str(cell)
                    if "{{" in cell_str or "}}" in cell_str or "{?" in cell_str:
                        has_changes = True
                        # First pass: exact token matches
                        for k, v in tokens.items():
                            if not isinstance(v, (list, dict)):
                                val_to_sub = str(v) if v is not None else ''
                                cell_str = cell_str.replace("{{" + str(k) + "}}", val_to_sub)
                                cell_str = cell_str.replace("{?" + str(k) + "?}", val_to_sub)
                        
                        # Second pass: regex case-insensitive token replacement
                        def token_replacer(match):
                            t_name = match.group(1).strip().lower()
                            if t_name in lower_tokens and not isinstance(lower_tokens[t_name], (list, dict)):
                                return str(lower_tokens[t_name])
                            return ''

                        cell_str = re.sub(r'\{\{([^}]+)\}\}', token_replacer, cell_str)
                        cell_str = re.sub(r'\{\?([^?]+)\?\}', token_replacer, cell_str)

                    new_row.append(cell_str)
                updated_rows.append(new_row)

            if has_changes and updated_rows:
                logger.info(f"Submitting {len(updated_rows)} token-replaced rows to working Google Sheet...")
                sheets_service.spreadsheets().values().update(
                    spreadsheetId=working_spreadsheet_id,
                    range=range_name,
                    valueInputOption='USER_ENTERED',
                    body={'values': updated_rows}
                ).execute()
        except Exception as token_err:
            logger.error(f"Error updating cell tokens in working Google Sheet: {token_err}")

        # 4. Export target tab as full-width PDF starting from Column B (c1=1, excluding Column A)
        authed_session = google.auth.transport.requests.AuthorizedSession(creds)
        pdf_bytes = None

        export_urls = [
            f"https://docs.google.com/spreadsheets/d/{working_spreadsheet_id}/export?format=pdf&gid={working_gid}&portrait=true&size=A4&gridlines=false&fitw=true&c1=1&c2=25",
            f"https://docs.google.com/spreadsheets/d/{working_spreadsheet_id}/pdf?gid={working_gid}&portrait=true&size=A4&gridlines=false&fitw=true&c1=1&c2=25"
        ]
        for url in export_urls:
            try:
                res = authed_session.get(url)
                if res.status_code == 200 and res.content and len(res.content) > 1000:
                    logger.info(f"Successfully exported PDF from working tab via {url}")
                    pdf_bytes = res.content
                    break
                else:
                    logger.warn(f"Export URL returned status {res.status_code}")
            except Exception as url_err:
                logger.warn(f"Failed fetching PDF export URL: {url_err}")

        # Fallback to export_media if URL export failed
        if not pdf_bytes:
            try:
                logger.info(f"Attempting drive_service export_media for {working_spreadsheet_id}...")
                export_req = drive_service.files().export_media(fileId=working_spreadsheet_id, mimeType='application/pdf')
                pdf_bytes = export_req.execute()
            except Exception as drive_exp_err:
                logger.error(f"drive_service.files().export_media failed: {drive_exp_err}")

        # Save to temp file
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        with open(tmp.name, 'wb') as f:
            f.write(pdf_bytes)

        # 5. Retain permanent project Google Sheet on Drive or cleanup temp tab if fallback was used
        if 'temp_tab_gid' in locals() and temp_tab_gid:
            try:
                sheets_service.spreadsheets().batchUpdate(
                    spreadsheetId=template_id,
                    body={'requests': [{'deleteSheet': {'sheetId': temp_tab_gid}}]}
                ).execute()
            except Exception as del_err:
                logger.warn(f"Failed to cleanup temp tab: {del_err}")

        logger.info(f"Google Sheet PDF generated successfully: '{file_title}' (URL: {sheet_url})")

        return tmp.name, working_spreadsheet_id, sheet_url

    except Exception as e:
        logger.error(f"Google Sheet Merge Error: {e}")
        if 'cloned_id' in locals() and cloned_id:
            try: drive_service.files().delete(fileId=cloned_id).execute()
            except: pass
        raise e
