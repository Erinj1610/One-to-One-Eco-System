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

ROOT_DRIVE_FOLDER_ID = "1Y3R2fnGWYRBESuNlfoek4jvaV1XiqRIf"

def get_or_create_folder(drive_service, folder_name, parent_id):
    """
    Finds a folder by name inside parent_id or creates a new one.
    """
    clean_name = str(folder_name).strip() if folder_name else "General"
    safe_name = clean_name.replace("'", "\\'")
    query = f"mimeType='application/vnd.google-apps.folder' and name='{safe_name}' and '{parent_id}' in parents and trashed=false"
    try:
        res = drive_service.files().list(q=query, fields="files(id, name)", supportsAllDrives=True).execute()
        files = res.get('files', [])
        if files:
            return files[0]['id']
    except Exception as e:
        logger.warn(f"Folder search error for {clean_name}: {e}")

    # Create folder
    folder_metadata = {
        'name': clean_name,
        'mimeType': 'application/vnd.google-apps.folder',
        'parents': [parent_id]
    }
    try:
        created = drive_service.files().create(body=folder_metadata, fields='id', supportsAllDrives=True).execute()
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
        # Extract Client & Project details for folder structure
        client_name = str(tokens.get('COMPANY_NAME') or tokens.get('CLIENT_NAME') or tokens.get('CONTACT_PERSON') or 'Clients').strip()
        project_name = str(tokens.get('PROJECT_NAME') or tokens.get('FEE_NAME') or 'Projects').strip()
        doc_label = str(sheet_name or 'Document').replace('_', ' ').title()

        # Build folder path: Root > Client Folder > Project Folder
        client_folder_id = get_or_create_folder(drive_service, client_name, ROOT_DRIVE_FOLDER_ID)
        project_folder_id = get_or_create_folder(drive_service, project_name, client_folder_id)

        logger.info(f"Target Google Drive Folder: Client='{client_name}', Project='{project_name}' (ID: {project_folder_id})")

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

        # Copy Master Sheet directly into Project folder
        import time
        file_title = f"{doc_label} - {project_name} - {time.strftime('%Y-%m-%d')}"
        copy_metadata = {
            'name': file_title,
            'parents': [project_folder_id]
        }

        try:
            cloned_file = drive_service.files().copy(fileId=template_id, body=copy_metadata, supportsAllDrives=True, fields="id, webViewLink").execute()
            cloned_id = cloned_file.get('id')
            sheet_url = cloned_file.get('webViewLink')
        except Exception as copy_err:
            logger.warn(f"Drive copy directly to folder failed ({copy_err}). Creating clean project sheet in folder via Sheets API...")
            # Create a new spreadsheet resource inside the target project folder
            new_sheet_body = {
                'properties': {'title': file_title}
            }
            created_sheet = sheets_service.spreadsheets().create(body=new_sheet_body, fields="spreadsheetId").execute()
            cloned_id = created_sheet.get('spreadsheetId')
            
            # Move created spreadsheet into the target project folder
            try:
                file_parents = drive_service.files().get(fileId=cloned_id, fields="parents", supportsAllDrives=True).execute()
                previous_parents = ",".join(file_parents.get('parents', []))
                drive_service.files().update(
                    fileId=cloned_id,
                    addParents=project_folder_id,
                    removeParents=previous_parents,
                    fields='id, parents, webViewLink',
                    supportsAllDrives=True
                ).execute()
            except Exception as move_err:
                logger.warn(f"Failed to move created sheet to project folder: {move_err}")

            # Copy target sheet tab from Master template into the newly created project spreadsheet
            copy_sheet_req = {
                'destinationSpreadsheetId': cloned_id
            }
            copied_tab = sheets_service.spreadsheets().sheets().copyTo(
                spreadsheetId=template_id,
                sheetId=target_gid,
                body=copy_sheet_req
            ).execute()

            target_gid = copied_tab.get('sheetId')
            target_sheet = {'properties': {'title': copied_tab.get('title'), 'sheetId': target_gid}}
            sheet_url = f"https://docs.google.com/spreadsheets/d/{cloned_id}/edit#gid={target_gid}"

        working_spreadsheet_id = cloned_id
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
        export_url = (
            f"https://docs.google.com/spreadsheets/d/{working_spreadsheet_id}/export?"
            f"format=pdf&gid={working_gid}&portrait=true&size=A4&gridlines=false"
            f"&fitw=true&fctr=false&attachment=false&c1=1&c2=25"
        )
        
        # Download PDF using authorized request session
        import requests
        authed_session = google.auth.transport.requests.AuthorizedSession(creds)
        res = authed_session.get(export_url)
        
        if res.status_code != 200:
            logger.warn(f"Native tab export returned {res.status_code}, falling back to export_media...")
            export_request = drive_service.files().export_media(fileId=working_spreadsheet_id, mimeType='application/pdf')
            pdf_bytes = export_request.execute()
        else:
            pdf_bytes = res.content

        # Save to temp file
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        with open(tmp.name, 'wb') as f:
            f.write(pdf_bytes)

        # 5. Retain permanent project Google Sheet on Drive (Do not delete)
        logger.info(f"Permanent Google Sheet saved: '{file_title}' (URL: {sheet_url})")

        return tmp.name, working_spreadsheet_id, sheet_url

    except Exception as e:
        logger.error(f"Google Sheet Merge Error: {e}")
        if 'cloned_id' in locals():
            try: drive_service.files().delete(fileId=cloned_id).execute()
            except: pass
        raise e
