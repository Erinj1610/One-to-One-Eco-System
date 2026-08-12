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

def merge_google_sheet(template_source, tokens, sheet_name=None, output_pdf_name="proposal.pdf", credentials_json=None):
    """
    1. Clones a Master Google Sheet Workbook template.
    2. Opens cloned spreadsheet and replaces {{TOKENS}} in the target sheet tab using Google Sheets API.
    3. Exports the target sheet tab as PDF via native Google Drive export URL (preserving 100% Google fonts, colors, and margins).
    4. Deletes the temporary Cloned Sheet.
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
        # Get parent folder to inherit quota
        parents = []
        try:
            file_info = drive_service.files().get(fileId=template_id, fields="parents").execute()
            parents = file_info.get("parents", [])
        except Exception:
            pass

        # 1. Access Master Sheet directly or clone without inheriting quota parents
        logger.info(f"Accessing Master Google Sheet template {template_id}...")
        
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

        # Clone without inheriting parents (creates in root of Service Account / User Drive)
        copy_metadata = {'name': f"TEMP_GEN_SHEET_{output_pdf_name}"}
        try:
            cloned_file = drive_service.files().copy(fileId=template_id, body=copy_metadata).execute()
            cloned_id = cloned_file.get('id')
        except Exception as copy_err:
            err_msg = str(copy_err)
            if "storageQuotaExceeded" in err_msg or "storage quota" in err_msg.lower():
                # Direct PDF Export fallback if Google Drive quota is exceeded
                logger.warn("Drive storage quota exceeded on copy. Exporting target tab directly from Master Sheet...")
                export_url = (
                    f"https://docs.google.com/spreadsheets/d/{template_id}/export?"
                    f"format=pdf&gid={target_gid}&portrait=true&size=A4&gridlines=false"
                    f"&fitw=true&scale=4"
                )
                import requests
                authed_session = google.auth.transport.requests.AuthorizedSession(creds)
                res = authed_session.get(export_url)
                if res.status_code == 200:
                    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
                    with open(tmp.name, 'wb') as f:
                        f.write(res.content)
                    return tmp.name
            raise copy_err

        # 3. Read values from target sheet and replace tokens
        tab_title = target_sheet['properties']['title']
        range_name = f"'{tab_title}'!A1:Z200"
        
        val_result = sheets_service.spreadsheets().values().get(
            spreadsheetId=cloned_id, range=range_name
        ).execute()
        
        rows = val_result.get('values', [])
        updated_rows = []
        has_changes = False

        for row in rows:
            new_row = []
            for cell in row:
                cell_str = str(cell)
                if "{{" in cell_str or "}}" in cell_str or "{?" in cell_str:
                    has_changes = True
                    for k, v in tokens.items():
                        if not isinstance(v, (list, dict)):
                            cell_str = cell_str.replace("{{" + str(k) + "}}", str(v if v is not None else ''))
                            cell_str = cell_str.replace("{?" + str(k) + "?}", str(v if v is not None else ''))
                    cell_str = re.sub(r'\{\{[^}]+\}\}', '', cell_str)
                new_row.append(cell_str)
            updated_rows.append(new_row)

        if has_changes and updated_rows:
            sheets_service.spreadsheets().values().update(
                spreadsheetId=cloned_id,
                range=range_name,
                valueInputOption='USER_ENTERED',
                body={'values': updated_rows}
            ).execute()

        # 4. Export specific sheet tab as PDF via Google Drive Export Media URL
        export_url = (
            f"https://docs.google.com/spreadsheets/d/{cloned_id}/export?"
            f"format=pdf&gid={target_gid}&portrait=true&size=A4&gridlines=false"
            f"&fitw=true&scale=4"
        )
        
        # Download PDF using authorized request session
        import requests
        authed_session = google.auth.transport.requests.AuthorizedSession(creds)
        res = authed_session.get(export_url)
        
        if res.status_code != 200:
            # Fallback to standard export media if export URL fails
            logger.warn(f"Native tab export returned {res.status_code}, falling back to export_media...")
            export_request = drive_service.files().export_media(fileId=cloned_id, mimeType='application/pdf')
            pdf_bytes = export_request.execute()
        else:
            pdf_bytes = res.content

        # Save to temp file
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        with open(tmp.name, 'wb') as f:
            f.write(pdf_bytes)

        # 5. Clean up temporary Google Sheet copy
        try:
            drive_service.files().delete(fileId=cloned_id).execute()
        except Exception:
            pass

        return tmp.name

    except Exception as e:
        logger.error(f"Google Sheet Merge Error: {e}")
        if 'cloned_id' in locals():
            try: drive_service.files().delete(fileId=cloned_id).execute()
            except: pass
        raise e
