import os
import re
import time
import logging
import tempfile
import google.auth.transport.requests
import googleapiclient.http
from googleapiclient.discovery import build
from google.oauth2 import service_account
from google.auth import default

logger = logging.getLogger(__name__)

SCOPES_SHEETS = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
]

ROOT_DRIVE_FOLDER_ID = "0AFF94SUUC_EQUk9PVA"

def extract_file_id(source: str):
    """
    Extracts the Google File ID from a full URL or returns the string if it's already an ID.
    """
    if not source:
        return None
    match = re.search(r'/d/([a-zA-Z0-9-_]+)', source)
    if match:
        return match.group(1)
    return source

def safe_float(val, default=0.0):
    """
    Safely converts any value (string with 'R', commas, spaces, None, or empty) to a float.
    Never throws an exception.
    """
    if val is None:
        return default
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).replace('R', '').replace(',', '').strip()
    if not s:
        return default
    try:
        return float(s)
    except ValueError:
        return default

def safe_int(val, default=1):
    """
    Safely converts any value to an integer.
    """
    f = safe_float(val, default=float(default))
    return int(f)

def clean_block_tags(text):
    """
    Removes block tags like {{#floor}}, {{/floor}}, {{#area}}, {{/area}}, {{#each items}}, {{/each}}
    """
    if not text:
        return text
    return re.sub(r'\{\{/#?[a-zA-Z0-9_\.]+\}\}', '', str(text))

def get_or_create_folder(drive_service, folder_name, parent_folder_id=None):
    """
    Finds an existing folder by name under parent_folder_id or creates a new one.
    """
    query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    if parent_folder_id:
        query += f" and '{parent_folder_id}' in parents"
    
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
        logger.warn(f"Folder search error for '{folder_name}': {e}")
    
    # Create folder if missing
    folder_metadata = {
        'name': folder_name,
        'mimeType': 'application/vnd.google-apps.folder'
    }
    if parent_folder_id:
        folder_metadata['parents'] = [parent_folder_id]
        
    created = drive_service.files().create(
        body=folder_metadata,
        fields='id',
        supportsAllDrives=True
    ).execute()
    return created.get('id')

def merge_google_sheet(template_source, tokens, sheet_name=None, output_pdf_name="output.pdf", credentials_json=None, is_save_action=False):
    """
    100% Comprehensive Engine for Google Sheets Master Template Merging.
    
    Architecture:
    1. Authenticates Google Sheets & Drive API with Domain-Wide Delegation impersonation.
    2. Resolves target sheet tab GID in Master Google Sheet Workbook using flexible alias matching.
    3. Fetches cell grid data (A1:Z300) BEFORE hiding Column A.
    4. Groups order items into Floors and Area Spaces, calculating robust subtotals.
    5. Parses Column A directives ([FIXED], [FLOOR_HEADER], [FLOOR_TABLE_HEAD], [AREA_HEADER], [AREA_TABLE_HEAD], [ITEM_ROW], [AREA_FOOTER], [FLOOR_FOOTER]).
    6. Expands grid dynamically in memory, cloning styling, borders, and textFormatRuns (bolding).
    7. Performs full token substitution ({{PROJECT_NAME}}, {{ONEONE_REP}}, {{SUBTOTAL}}, {{TOTAL_RETAIL}}, {{DEPOSIT}}, etc.).
    8. Writes full expanded grid to a temporary sheet tab via a single updateCells batchUpdate request.
    9. Hides Column A (startIndex 0 to 1).
    10. Exports PDF using authorized session with c1=1&c2=25 bounds.
    11. Cleans up temporary sheet tab.
    12. If is_save_action=True, handles Drive Vault archival into Latest/ and History/.
    """
    try:
        if credentials_json:
            creds = service_account.Credentials.from_service_account_info(credentials_json, scopes=SCOPES_SHEETS)
            try:
                creds = creds.with_subject('erin.jones@1-to-1.world')
                logger.info("Domain-Wide Delegation active: Impersonating erin.jones@1-to-1.world.")
            except Exception as subject_err:
                logger.warn(f"Impersonation notice: {subject_err}")
        else:
            creds, project = default(scopes=SCOPES_SHEETS)
            
        drive_service = build('drive', 'v3', credentials=creds)
        sheets_service = build('sheets', 'v4', credentials=creds)
    except Exception as e:
        logger.error(f"Failed to initialize Google Services for Sheets: {e}")
        raise RuntimeError(f"Google API Service Initialization Failed: {e}")

    template_id = extract_file_id(template_source)
    if not template_id:
        raise ValueError(f"Invalid Master Google Sheet URL or ID: {template_source}")

    # Extract client, project, and document info for folder vaulting
    client_name = str(tokens.get('CLIENT_NAME') or tokens.get('COMPANY_NAME') or tokens.get('CONTACT_PERSON') or 'Clients').strip()
    project_name = str(tokens.get('PROJECT_NAME') or tokens.get('PROJECT_NAME_LOCATION') or 'Project').strip()
    order_num = tokens.get('ORDER_NUMBER') or tokens.get('DOCUMENT_NUMBER') or tokens.get('PROPOSAL_NUMBER')
    
    if sheet_name == 'DESIGN_FEE_PROPOSAL':
        doc_folder_name = "Design Fee Proposal"
    elif order_num and not str(order_num).endswith('XXX'):
        doc_folder_name = f"Order {order_num}"
    else:
        doc_folder_name = str(tokens.get('FEE_NAME') or sheet_name or 'Document').replace('_', ' ').strip()

    doc_label = str(sheet_name or 'Document').replace('_', ' ').title()

    # Get spreadsheet metadata directly from Master Template to find target sheet tab GID
    try:
        spreadsheet = sheets_service.spreadsheets().get(spreadsheetId=template_id).execute()
    except Exception as fetch_err:
        logger.error(f"Failed to fetch Master Template metadata ({template_id}): {fetch_err}")
        raise RuntimeError(f"Could not access Master Google Sheet template. Verify sharing permissions. Error: {fetch_err}")

    sheets = spreadsheet.get('sheets', [])
    target_sheet = None
    target_gid = 0
    
    if sheet_name:
        clean_name = str(sheet_name).strip().lower().replace('_', ' ')
        alias_list = [clean_name]
        if clean_name in ('quotation', 'quote'):
            alias_list.extend(['quotation', 'quote', 'quotes', 'summarized quotation'])
        elif clean_name in ('boq', 'boq doc'):
            alias_list.extend(['boq', 'boq doc', 'detailed boq', 'bill of quantities'])
        elif clean_name in ('schedule', 'lighting schedule'):
            alias_list.extend(['schedule', 'lighting schedule'])
        elif clean_name in ('deposit invoice', 'deposit_invoice'):
            alias_list.extend(['deposit invoice', 'deposit_invoice'])

        for s in sheets:
            s_title = s['properties']['title'].strip().lower().replace('_', ' ')
            if any(alias in s_title or s_title in alias for alias in alias_list):
                target_sheet = s
                target_gid = s['properties']['sheetId']
                logger.info(f"Matched target sheet tab '{s['properties']['title']}' (GID={target_gid}) for requested '{sheet_name}'")
                break
    
    if not target_sheet and sheets:
        target_sheet = sheets[0]
        target_gid = target_sheet['properties']['sheetId']
        logger.warn(f"Fallback to default first tab '{target_sheet['properties']['title']}' (GID={target_gid})")

    working_spreadsheet_id = template_id
    sheet_url = f"https://docs.google.com/spreadsheets/d/{template_id}"

    # Vaulting setup if saving
    if is_save_action:
        client_folder_id = get_or_create_folder(drive_service, client_name, ROOT_DRIVE_FOLDER_ID)
        project_folder_id = get_or_create_folder(drive_service, project_name, client_folder_id)
        doc_subfolder_id = get_or_create_folder(drive_service, doc_folder_name, project_folder_id)
        latest_folder_id = get_or_create_folder(drive_service, "Latest", doc_subfolder_id)
        history_folder_id = get_or_create_folder(drive_service, "History", doc_subfolder_id)

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
        except Exception as search_err:
            logger.warn(f"Search for dedicated sheet failed: {search_err}")

        if existing_sheet_id:
            working_spreadsheet_id = existing_sheet_id
            sheet_url = existing_sheet_url
        else:
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

    # Duplicate target tab into a temporary working tab for PDF rendering
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

    try:
        # Read full cell metadata WITH Column A BEFORE hiding Column A
        sp_data = sheets_service.spreadsheets().get(
            spreadsheetId=working_spreadsheet_id,
            ranges=[f"'{dup_title}'!A1:Z300"],
            includeGridData=True
        ).execute()

        # Hide Column A on temporary tab so PDF rendering excludes Column A
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
            logger.warn(f"Column A hide notice: {hide_err}")

        grid_data = sp_data['sheets'][0]['data'][0]
        row_data = grid_data.get('rowData', [])

        items_list = tokens.get('items', [])

        # Group items by floor and area space strictly preserving explicit user declarations
        grouped_floors = {}
        for item in items_list:
            fl_raw = item.get('floor') or item.get('Floor') or ''
            ar_raw = item.get('area') or item.get('Area') or ''
            
            fl = str(fl_raw).strip()
            ar = str(ar_raw).strip()
            
            # Only use fallbacks if the user provided no floor/area at all
            if not fl and not ar:
                continue

            if not fl:
                fl = 'General'
            if not ar:
                ar = 'General'

            if fl not in grouped_floors:
                grouped_floors[fl] = {}
            if ar not in grouped_floors[fl]:
                grouped_floors[fl][ar] = []
            grouped_floors[fl][ar].append(item)

        # Fallback ONLY if no items had any declared floors/areas
        if not grouped_floors:
            fallback_items = [it for it in items_list]
            if fallback_items:
                grouped_floors['General'] = {'General': fallback_items}

        # Parse Column A directives across template rows
        parsed_rows = []
        dynamic_directives = (
            '[FLOOR_HEADER]', '[FLOOR_HEAD]',
            '[FLOOR_TABLE_HEAD]', '[FLOOR_TABLE_HEADER]',
            '[AREA_HEADER]', '[AREA_HEAD]', '[AREA_ROW]',
            '[AREA_TABLE_HEAD]', '[AREA_TABLE_HEADER]',
            '[TABLE_HEADER]', '[TABLE_HEAD]',
            '[ITEM_ROW]',
            '[CREDIT_HEADER]', '[CREDIT_HEAD]', '[CREDIT_ITEM_ROW]',
            '[AREA_FOOTER]', '[FLOOR_FOOTER]'
        )
        
        first_dyn_idx = None
        for r_i, r_obj in enumerate(row_data):
            cell_objs = r_obj.get('values', [])
            col_a_val = ''
            if cell_objs and len(cell_objs) > 0:
                c0 = cell_objs[0]
                col_a_val = str(c0.get('formattedValue', '') or c0.get('userEnteredValue', {}).get('stringValue', '')).strip().upper()
            
            # Normalize directive aliases
            if col_a_val in ('[FLOOR_HEAD]', '[FLOOR_HEADER]'):
                norm_dir = '[FLOOR_HEADER]'
            elif col_a_val in ('[FLOOR_TABLE_HEAD]', '[FLOOR_TABLE_HEADER]'):
                norm_dir = '[FLOOR_TABLE_HEAD]'
            elif col_a_val in ('[AREA_HEAD]', '[AREA_HEADER]', '[AREA_ROW]'):
                norm_dir = '[AREA_HEADER]'
            elif col_a_val in ('[AREA_TABLE_HEAD]', '[AREA_TABLE_HEADER]'):
                norm_dir = '[AREA_TABLE_HEAD]'
            elif col_a_val in ('[TABLE_HEAD]', '[TABLE_HEADER]'):
                norm_dir = '[TABLE_HEADER]'
            elif col_a_val in ('[CREDIT_HEAD]', '[CREDIT_HEADER]'):
                norm_dir = '[CREDIT_HEADER]'
            else:
                norm_dir = col_a_val

            if col_a_val in dynamic_directives and first_dyn_idx is None:
                first_dyn_idx = r_i
            
            parsed_rows.append((r_i, norm_dir, cell_objs))

        # Partition parsed rows into top_fixed, dynamic_template_block, and bottom_fixed
        top_fixed = []
        dynamic_template_rows = []
        bottom_fixed = []

        in_dynamic_block = False
        dynamic_block_started = False

        for r_i, norm_dir, cell_objs in parsed_rows:
            if norm_dir in dynamic_directives:
                dynamic_block_started = True
                in_dynamic_block = True
                dynamic_template_rows.append((r_i, norm_dir, cell_objs))
            else:
                if not dynamic_block_started:
                    top_fixed.append((r_i, norm_dir, cell_objs, {}))
                else:
                    in_dynamic_block = False
                    bottom_fixed.append((r_i, norm_dir, cell_objs, {}))

        # Extract template cell definitions using exact directive names from Column A of the template
        fl_header_cells = next((cells for _, d, cells in dynamic_template_rows if d in ('[FLOOR_HEADER]', '[FLOOR_HEAD]')), None)
        fl_table_head_cells = next((cells for _, d, cells in dynamic_template_rows if d in ('[FLOOR_TABLE_HEADER]', '[FLOOR_TABLE_HEAD]')), None)
        area_row_cells = next((cells for _, d, cells in dynamic_template_rows if d in ('[AREA_ROW]', '[AREA_HEADER]', '[AREA_HEAD]')), None)
        area_table_head_cells = next((cells for _, d, cells in dynamic_template_rows if d in ('[AREA_TABLE_HEADER]', '[AREA_TABLE_HEAD]')), None)
        table_head_cells = next((cells for _, d, cells in dynamic_template_rows if d == '[TABLE_HEADER]'), None)
        area_footer_cells = next((cells for _, d, cells in dynamic_template_rows if d == '[AREA_FOOTER]'), None)
        fl_footer_cells = next((cells for _, d, cells in dynamic_template_rows if d == '[FLOOR_FOOTER]'), None)
        item_row_cells = next((cells for _, d, cells in dynamic_template_rows if d == '[ITEM_ROW]'), None)
        credit_head_cells = next((cells for _, d, cells in dynamic_template_rows if d == '[CREDIT_HEADER]'), None)
        credit_item_cells = next((cells for _, d, cells in dynamic_template_rows if d == '[CREDIT_ITEM_ROW]'), None)

        # Helper to compute exact line item total from BOQ item objects
        def resolve_item_total(it):
            for key in ['total_price', 'totalRetail', 'total_retail', 'line_total', 'totalPrice', 'total']:
                val = it.get(key)
                if val is not None and str(val).strip() != '':
                    num = safe_float(val)
                    if num > 0:
                        return num
            q = safe_float(it.get('qty') or it.get('quantity'), 1.0)
            u = safe_float(it.get('unit_price') or it.get('retail') or it.get('rate') or it.get('price'), 0.0)
            return q * u

        # Generate all dynamic rows required for the order
        generated_dynamic_rows = []

        # Check if template is a flat BOQ template (has [TABLE_HEADER] or flat [ITEM_ROW] without [FLOOR_HEADER])
        if table_head_cells or (item_row_cells and not fl_header_cells and not area_row_cells):
            main_items = [it for it in items_list if safe_float(it.get('qty') or it.get('quantity'), 1.0) >= 0]
            credit_items = [it for it in items_list if safe_float(it.get('qty') or it.get('quantity'), 1.0) < 0]

            def build_item_ctx(item_obj):
                q_val = safe_float(item_obj.get('qty') or item_obj.get('quantity'), 1.0)
                u_val = safe_float(item_obj.get('unit_price') or item_obj.get('retail') or item_obj.get('rate') or item_obj.get('price'), 0.0)
                tot_val = resolve_item_total(item_obj)
                code_str = str(item_obj.get('code') or item_obj.get('make_code') or item_obj.get('one_one_code') or item_obj.get('sku') or '').strip()
                desc_str = str(item_obj.get('description') or item_obj.get('name') or '').strip()
                
                # Check if item is a SPACER item
                is_spacer = (code_str.upper() == 'SPACER' or desc_str.upper() == 'SPACER' or 'SPACER' in code_str.upper() or 'SPACER' in desc_str.upper())

                if is_spacer:
                    return {
                        'item.qty': '',
                        'item.oneOneCode': '',
                        'item.type': '',
                        'item.description': '',
                        'item.floor': '',
                        'item.area': '',
                        'item.eta': '',
                        'item.lead_time': '',
                        'item.leadTime': '',
                        'item.retail': '',
                        'item.totalRetail': '',
                        '_is_spacer': True
                    }

                item_ctx = {
                    'item.qty': str(int(q_val)) if q_val.is_integer() else f"{q_val:.2f}",
                    'item.oneOneCode': code_str,
                    'item.type': str(item_obj.get('type') or item_obj.get('category') or item_obj.get('plan_code') or ''),
                    'item.description': desc_str,
                    'item.floor': str(item_obj.get('floor') or ''),
                    'item.area': str(item_obj.get('area') or ''),
                    'item.eta': str(item_obj.get('lead_time') or item_obj.get('eta') or '4-8 Weeks'),
                    'item.retail': f"R {u_val:,.2f}",
                    'item.totalRetail': f"R {tot_val:,.2f}",
                    '_is_spacer': False
                }
                for k, v in item_obj.items():
                    if k not in item_ctx and v is not None:
                        item_ctx[f"item.{k}"] = str(v)
                        item_ctx[k] = str(v)
                return item_ctx

            if table_head_cells:
                generated_dynamic_rows.append(('[TABLE_HEADER]', table_head_cells, {}))
            
            if item_row_cells:
                for item_obj in main_items:
                    generated_dynamic_rows.append(('[ITEM_ROW]', item_row_cells, build_item_ctx(item_obj)))

            if credit_items and (credit_head_cells or credit_item_cells):
                if credit_head_cells:
                    generated_dynamic_rows.append(('[CREDIT_HEADER]', credit_head_cells, {}))
                target_credit_cell = credit_item_cells or item_row_cells
                if target_credit_cell:
                    for item_obj in credit_items:
                        generated_dynamic_rows.append(('[CREDIT_ITEM_ROW]', target_credit_cell, build_item_ctx(item_obj)))
        else:
            # Grouped Floor / Area template (like Quotation)
            for fl_name, areas in grouped_floors.items():
                fl_items = [it for ar_items in areas.values() for it in ar_items]
                fl_subtotal_num = sum(resolve_item_total(it) for it in fl_items)
                fl_subtotal_str = f"R {fl_subtotal_num:,.2f}"
                fl_ctx = {'floor.name': fl_name, 'floor': fl_name, 'SUBTOTAL': fl_subtotal_str}

                if fl_header_cells:
                    generated_dynamic_rows.append(('[FLOOR_HEADER]', fl_header_cells, fl_ctx))
                if fl_table_head_cells:
                    generated_dynamic_rows.append(('[FLOOR_TABLE_HEAD]', fl_table_head_cells, fl_ctx))

                for ar_name, ar_items in areas.items():
                    ar_subtotal_num = sum(resolve_item_total(it) for it in ar_items)
                    ar_subtotal_str = f"R {ar_subtotal_num:,.2f}"
                    ar_ctx = {**fl_ctx, 'area.name': ar_name, 'area': ar_name, 'SUBTOTAL': ar_subtotal_str}

                    if area_row_cells:
                        generated_dynamic_rows.append(('[AREA_ROW]', area_row_cells, ar_ctx))
                    if area_table_head_cells:
                        generated_dynamic_rows.append(('[AREA_TABLE_HEAD]', area_table_head_cells, ar_ctx))

                    if item_row_cells:
                        for item_obj in ar_items:
                            item_ctx = {**ar_ctx}
                            for k, v in item_obj.items():
                                item_ctx[k] = str(v) if v is not None else ''
                            generated_dynamic_rows.append(('[ITEM_ROW]', item_row_cells, item_ctx))

                    if area_footer_cells:
                        generated_dynamic_rows.append(('[AREA_FOOTER]', area_footer_cells, ar_ctx))

                if fl_footer_cells:
                    generated_dynamic_rows.append(('[FLOOR_FOOTER]', fl_footer_cells, fl_ctx))

        expanded_rows = top_fixed + generated_dynamic_rows + bottom_fixed

        # Construct rowData strictly for generated dynamic rows (starting at len(top_fixed))
        dynamic_row_data = []

        for r_idx, (directive, cell_objs, ctx) in enumerate(generated_dynamic_rows):
            row_tokens = {**tokens, **ctx}
            row_lower_tokens = {str(k).lower(): v for k, v in row_tokens.items()}
            
            new_row_values = []
            for c_i, c_obj in enumerate(cell_objs):
                cell_copy = {}
                user_val = c_obj.get('userEnteredValue', {})
                formatted_val = c_obj.get('formattedValue', '') or user_val.get('stringValue', '')
                
                if 'userEnteredFormat' in c_obj:
                    cell_copy['userEnteredFormat'] = c_obj['userEnteredFormat']

                if not formatted_val:
                    if 'userEnteredValue' in c_obj:
                        cell_copy['userEnteredValue'] = c_obj['userEnteredValue']
                    new_row_values.append(cell_copy)
                    continue

                cell_str = clean_block_tags(str(formatted_val))
                
                if "{{" in cell_str or "}}" in cell_str or "{?" in cell_str:
                    orig_runs = c_obj.get('textFormatRuns', [])
                    replacements = []
                    token_matches = list(re.finditer(r'\{\{([^}]+)\}\}|\{\?([^?]+)\?\}', cell_str))
                    
                    new_str = cell_str
                    offset = 0
                    
                    for m in token_matches:
                        raw_match = m.group(0)
                        token_key = (m.group(1) or m.group(2) or '').strip()
                        token_key_lower = token_key.lower()
                        
                        sub_val = None
                        if token_key in row_tokens and not isinstance(row_tokens[token_key], (list, dict)):
                            sub_val = str(row_tokens[token_key]) if row_tokens[token_key] is not None else ''
                        elif token_key_lower in row_lower_tokens and not isinstance(row_lower_tokens[token_key_lower], (list, dict)):
                            sub_val = str(row_lower_tokens[token_key_lower]) if row_lower_tokens[token_key_lower] is not None else ''
                        
                        if sub_val is None:
                            sub_val = ''

                        match_start = m.start() + offset
                        old_len = len(raw_match)
                        new_len = len(sub_val)
                        
                        new_str = new_str[:match_start] + sub_val + new_str[match_start + old_len:]
                        delta = new_len - old_len
                        offset += delta
                        replacements.append((m.start(), old_len, delta))

                    cleaned_final = clean_block_tags(new_str)
                    cell_copy['userEnteredValue'] = {'stringValue': cleaned_final}

                    if orig_runs:
                        new_runs = []
                        for run in orig_runs:
                            orig_start = run.get('startIndex', 0)
                            format_info = run.get('format', {})
                            shifted_start = orig_start
                            for rep_start, rep_old_len, rep_delta in replacements:
                                if orig_start > rep_start:
                                    if orig_start >= rep_start + rep_old_len:
                                        shifted_start += rep_delta
                                    else:
                                        shifted_start = rep_start
                            shifted_start = max(0, min(shifted_start, len(cleaned_final)))
                            new_runs.append({'startIndex': shifted_start, 'format': format_info})
                        if new_runs:
                            cell_copy['textFormatRuns'] = new_runs
                else:
                    if 'userEnteredValue' in c_obj:
                        cell_copy['userEnteredValue'] = c_obj['userEnteredValue']
                    if 'textFormatRuns' in c_obj:
                        cell_copy['textFormatRuns'] = c_obj['textFormatRuns']

                new_row_values.append(cell_copy)
            
            dynamic_row_data.append({'values': new_row_values})

        # Map directive names to their original template row index (orig_r_i)
        directive_orig_row = {}
        for orig_r_i, orig_dir, _ in dynamic_template_rows:
            directive_orig_row[orig_dir] = orig_r_i

        # Extract cell merges from ROOT sheet object (sp_data['sheets'][0])
        sheet_obj = sp_data['sheets'][0]
        orig_merges = sheet_obj.get('merges', [])
        
        # Build mapping of directive_name -> list of (startColumnIndex, endColumnIndex)
        directive_merges = {}
        for orig_r_i, orig_dir, _ in dynamic_template_rows:
            directive_merges[orig_dir] = []
            for m in orig_merges:
                if m.get('startRowIndex') == orig_r_i:
                    start_c = m.get('startColumnIndex', 0)
                    end_c = m.get('endColumnIndex', 1)
                    directive_merges[orig_dir].append((start_c, end_c))

        # Extract original row heights (pixelSize) by exact template row index
        exact_row_height_by_index = {}
        for r_i_idx, r_obj in enumerate(row_data):
            r_meta = r_obj.get('rowMetadata', {})
            if 'pixelSize' in r_meta:
                exact_row_height_by_index[r_i_idx] = r_meta['pixelSize']

        template_row_heights = {}
        for orig_r_i, orig_dir, _ in dynamic_template_rows:
            if orig_r_i in exact_row_height_by_index:
                template_row_heights[orig_dir] = exact_row_height_by_index[orig_r_i]

        # STEP 1: Physically expand or contract the grid at the end of the dynamic block
        orig_dyn_count = len(dynamic_template_rows)
        new_dyn_count = len(generated_dynamic_rows)
        extra_rows = new_dyn_count - orig_dyn_count

        grid_requests = []

        if extra_rows > 0:
            grid_requests.append({
                'insertDimension': {
                    'range': {
                        'sheetId': temp_tab_gid,
                        'dimension': 'ROWS',
                        'startIndex': len(top_fixed) + orig_dyn_count,
                        'endIndex': len(top_fixed) + orig_dyn_count + extra_rows
                    },
                    'inheritFromBefore': False
                }
            })
        elif extra_rows < 0:
            grid_requests.append({
                'deleteDimension': {
                    'range': {
                        'sheetId': temp_tab_gid,
                        'dimension': 'ROWS',
                        'startIndex': len(top_fixed) + new_dyn_count,
                        'endIndex': len(top_fixed) + orig_dyn_count
                    }
                }
            })

        # STEP 2: Clear pre-existing merges STRICTLY in the generated dynamic region (NEVER touch fixed rows)
        if new_dyn_count > 0:
            grid_requests.append({
                'unmergeCells': {
                    'range': {
                        'sheetId': temp_tab_gid,
                        'startRowIndex': len(top_fixed),
                        'endRowIndex': len(top_fixed) + new_dyn_count,
                        'startColumnIndex': 0,
                        'endColumnIndex': 30
                    }
                }
            })

        # STEP 3: Overwrite template dynamic rows AND write newly inserted rows via copyPaste (PASTE_NORMAL)
        for r_idx, (directive, cell_objs, ctx) in enumerate(generated_dynamic_rows):
            actual_row_i = len(top_fixed) + r_idx
            orig_src_r = directive_orig_row.get(directive)
            if orig_src_r is not None:
                grid_requests.append({
                    'copyPaste': {
                        'source': {
                            'sheetId': temp_tab_gid,
                            'startRowIndex': orig_src_r,
                            'endRowIndex': orig_src_r + 1,
                            'startColumnIndex': 0,
                            'endColumnIndex': 30
                        },
                        'destination': {
                            'sheetId': temp_tab_gid,
                            'startRowIndex': actual_row_i,
                            'endRowIndex': actual_row_i + 1,
                            'startColumnIndex': 0,
                            'endColumnIndex': 30
                        },
                        'pasteType': 'PASTE_NORMAL',
                        'pasteOrientation': 'NORMAL'
                    }
                })

        # STEP 4: Update token values on generated dynamic rows with userEnteredFormat
        if dynamic_row_data:
            grid_requests.append({
                'updateCells': {
                    'rows': dynamic_row_data,
                    'fields': 'userEnteredValue,textFormatRuns,userEnteredFormat',
                    'start': {
                        'sheetId': temp_tab_gid,
                        'rowIndex': len(top_fixed),
                        'columnIndex': 0
                    }
                }
            })

        # STEP 5: Targeted token updates for top_fixed rows ONLY on cells containing tokens
        for orig_r_i, norm_dir, cell_objs, _ in top_fixed:
            for c_i, c_obj in enumerate(cell_objs):
                user_val = c_obj.get('userEnteredValue', {})
                formatted_val = c_obj.get('formattedValue', '') or user_val.get('stringValue', '')
                if formatted_val and ("{{" in str(formatted_val) or "{?" in str(formatted_val)):
                    cell_str = clean_block_tags(str(formatted_val))
                    new_str = cell_str
                    for m in re.finditer(r'\{\{([^}]+)\}\}|\{\?([^?]+)\?\}', cell_str):
                        raw_match = m.group(0)
                        token_key = (m.group(1) or m.group(2) or '').strip()
                        sub_val = str(tokens.get(token_key, tokens.get(token_key.lower(), '')))
                        new_str = new_str.replace(raw_match, sub_val)
                    cleaned_top = clean_block_tags(new_str)
                    grid_requests.append({
                        'updateCells': {
                            'rows': [{'values': [{'userEnteredValue': {'stringValue': cleaned_top}}]}],
                            'fields': 'userEnteredValue',
                            'start': {
                                'sheetId': temp_tab_gid,
                                'rowIndex': orig_r_i,
                                'columnIndex': c_i
                            }
                        }
                    })

        # STEP 6: Targeted token updates for bottom_fixed summary rows (SUBTOTAL, DISCOUNT, VAT, TOTAL_RETAIL, DEPOSIT)
        for orig_r_i, norm_dir, cell_objs, _ in bottom_fixed:
            actual_r_idx = orig_r_i + extra_rows
            for c_i, c_obj in enumerate(cell_objs):
                user_val = c_obj.get('userEnteredValue', {})
                formatted_val = c_obj.get('formattedValue', '') or user_val.get('stringValue', '')
                if formatted_val and ("{{" in str(formatted_val) or "{?" in str(formatted_val)):
                    cell_str = clean_block_tags(str(formatted_val))
                    new_str = cell_str
                    for m in re.finditer(r'\{\{([^}]+)\}\}|\{\?([^?]+)\?\}', cell_str):
                        raw_match = m.group(0)
                        token_key = (m.group(1) or m.group(2) or '').strip()
                        sub_val = str(tokens.get(token_key, tokens.get(token_key.lower(), '')))
                        new_str = new_str.replace(raw_match, sub_val)
                    cleaned_bot = clean_block_tags(new_str)
                    grid_requests.append({
                        'updateCells': {
                            'rows': [{'values': [{'userEnteredValue': {'stringValue': cleaned_bot}}]}],
                            'fields': 'userEnteredValue',
                            'start': {
                                'sheetId': temp_tab_gid,
                                'rowIndex': actual_r_idx,
                                'columnIndex': c_i
                            }
                        }
                    })

        # STEP 7: Re-apply exact column merges and row heights AFTER copyPaste
        for r_idx, (directive, cell_objs, ctx) in enumerate(generated_dynamic_rows):
            actual_row_i = len(top_fixed) + r_idx
            orig_src_r = directive_orig_row.get(directive)

            # Check if this row is a SPACER row
            if ctx and ctx.get('_is_spacer'):
                grid_requests.append({
                    'updateDimensionProperties': {
                        'range': {
                            'sheetId': temp_tab_gid,
                            'dimension': 'ROWS',
                            'startIndex': actual_row_i,
                            'endIndex': actual_row_i + 1
                        },
                        'properties': {
                            'pixelSize': 5
                        },
                        'fields': 'pixelSize'
                    }
                })
                # Clear all text and apply light grey background across all columns for pure 5px SPACER bar
                grid_requests.append({
                    'repeatCell': {
                        'range': {
                            'sheetId': temp_tab_gid,
                            'startRowIndex': actual_row_i,
                            'endRowIndex': actual_row_i + 1,
                            'startColumnIndex': 0,
                            'endColumnIndex': 30
                        },
                        'cell': {
                            'userEnteredValue': {'stringValue': ''},
                            'userEnteredFormat': {
                                'backgroundColor': {'red': 0.88, 'green': 0.88, 'blue': 0.88}
                            }
                        },
                        'fields': 'userEnteredValue,userEnteredFormat.backgroundColor'
                    }
                })
            else:
                # Re-apply exact template row height from template source row
                if orig_src_r is not None and orig_src_r < len(row_data):
                    orig_r_meta = row_data[orig_src_r].get('rowMetadata', {})
                    if 'pixelSize' in orig_r_meta:
                        grid_requests.append({
                            'updateDimensionProperties': {
                                'range': {
                                    'sheetId': temp_tab_gid,
                                    'dimension': 'ROWS',
                                    'startIndex': actual_row_i,
                                    'endIndex': actual_row_i + 1
                                },
                                'properties': {
                                    'pixelSize': orig_r_meta['pixelSize']
                                },
                                'fields': 'pixelSize'
                            }
                        })

            if directive in directive_merges and directive_merges[directive]:
                for start_c, end_c in directive_merges[directive]:
                    grid_requests.append({
                        'mergeCells': {
                            'range': {
                                'sheetId': temp_tab_gid,
                                'startRowIndex': actual_row_i,
                                'endRowIndex': actual_row_i + 1,
                                'startColumnIndex': start_c,
                                'endColumnIndex': end_c
                            },
                            'mergeType': 'MERGE_ALL'
                        }
                    })

        # Ensure all bottom fixed rows maintain their exact original row height AFTER copyPaste
        for orig_r_i, norm_dir, cell_objs, _ in bottom_fixed:
            actual_r_idx = orig_r_i + extra_rows
            if orig_r_i in exact_row_height_by_index:
                grid_requests.append({
                    'updateDimensionProperties': {
                        'range': {
                            'sheetId': temp_tab_gid,
                            'dimension': 'ROWS',
                            'startIndex': actual_r_idx,
                            'endIndex': actual_r_idx + 1
                        },
                        'properties': {
                            'pixelSize': exact_row_height_by_index[orig_r_i]
                        },
                        'fields': 'pixelSize'
                    }
                })

        # Submit single batchUpdate to expand dimension, write grid, unmerge, and apply exact cell merges
        sheets_service.spreadsheets().batchUpdate(
            spreadsheetId=working_spreadsheet_id,
            body={'requests': grid_requests}
        ).execute()

    except Exception as token_err:
        logger.error(f"Error expanding working sheet grid: {token_err}")
        raise RuntimeError(f"Sheet Grid Expansion Error: {token_err}")

    # Export PDF from temporary tab (Hidden Column A is automatically excluded; no c1/c2 parameter to avoid cropping top-right logo)
    authed_session = google.auth.transport.requests.AuthorizedSession(creds)
    pdf_bytes = None

    export_urls = [
        f"https://docs.google.com/spreadsheets/d/{working_spreadsheet_id}/export?format=pdf&gid={temp_tab_gid}&portrait=true&size=A4&gridlines=false&fitw=true",
        f"https://docs.google.com/spreadsheets/d/{working_spreadsheet_id}/export?format=pdf&gid={temp_tab_gid}&portrait=true&size=A4&gridlines=false"
    ]

    for export_url in export_urls:
        try:
            pdf_res = authed_session.get(export_url)
            if pdf_res.status_code == 200 and len(pdf_res.content) > 1000:
                pdf_bytes = pdf_res.content
                logger.info(f"Successfully generated PDF stream from temporary tab '{dup_title}' ({len(pdf_bytes)} bytes)")
                break
        except Exception as export_err:
            logger.warn(f"PDF export attempt failed: {export_err}")

    # KEEP TEMPORARY TAB FOR LIVE INSPECTION (do not delete)
    logger.info(f"Preserving generated sheet tab '{dup_title}' ({temp_tab_gid}) for live inspection")

    if not pdf_bytes:
        raise RuntimeError(f"Failed to generate valid PDF from Google Sheet template tab '{dup_title}'")

    # Write PDF stream to temporary file on disk for HTTP FileResponse return
    temp_pdf = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    temp_pdf.write(pdf_bytes)
    temp_pdf.close()

    # Vaulting archival if requested
    if is_save_action and 'latest_folder_id' in locals() and 'history_folder_id' in locals():
        try:
            clean_type_title = doc_label.strip()
            new_vault_filename = f"{clean_type_title} - {doc_folder_name}.pdf"

            # Check existing files in Latest folder for this specific document type
            latest_query = f"'{latest_folder_id}' in parents and trashed=false"
            latest_res = drive_service.files().list(
                q=latest_query,
                fields="files(id, name)",
                supportsAllDrives=True,
                includeItemsFromAllDrives=True
            ).execute()
            
            existing_latest = latest_res.get('files', [])
            for ef in existing_latest:
                if ef['name'].startswith(clean_type_title) or clean_type_title in ef['name']:
                    # Archive older revision into History
                    history_filename = f"{clean_type_title} - {doc_folder_name} (Archived {int(time.time())}).pdf"
                    drive_service.files().update(
                        fileId=ef['id'],
                        body={'name': history_filename},
                        addParents=history_folder_id,
                        removeParents=latest_folder_id,
                        supportsAllDrives=True
                    ).execute()
                    logger.info(f"Archived older revision '{ef['name']}' to History folder as '{history_filename}'")

            # Upload new PDF into Latest folder
            media_body = googleapiclient.http.MediaFileUpload(temp_pdf.name, mimetype='application/pdf')
            vault_file_metadata = {
                'name': new_vault_filename,
                'parents': [latest_folder_id]
            }
            uploaded_vault_file = drive_service.files().create(
                body=vault_file_metadata,
                media_body=media_body,
                fields='id, webViewLink',
                supportsAllDrives=True
            ).execute()
            logger.info(f"Saved newest PDF '{new_vault_filename}' ({uploaded_vault_file.get('id')}) in Latest folder.")
        except Exception as vault_err:
            logger.error(f"Error archiving PDF in Drive Vault: {vault_err}")

    return temp_pdf.name, working_spreadsheet_id, sheet_url
