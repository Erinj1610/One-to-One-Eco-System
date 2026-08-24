from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.orm import Session
from database.cloud_sql import get_db
from models.orm_models import Order, Project, OrderItem
from typing import Optional, List, Dict, Any
import os
import re
import socket
import google.auth
from google.oauth2 import service_account
from googleapiclient.discovery import build

# Set HTTP socket timeout to 120s for large Google Sheets API transfers
socket.setdefaulttimeout(120)

ROOT_DRIVE_FOLDER_ID = "0AFF94SUUC_EQUk9PVA"

router = APIRouter()

def get_google_services():
    """Initializes Google Sheets and Drive API services using Cloud Run Compute Service Account."""
    scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
    creds, _ = google.auth.default(scopes=scopes)
    sheets_service = build('sheets', 'v4', credentials=creds)
    drive_service = build('drive', 'v3', credentials=creds)
    return sheets_service, drive_service

def extract_spreadsheet_id(url_or_id: str) -> str:
    """Extracts clean 44-char Spreadsheet ID from full Google Sheets URL or raw ID."""
    match = re.search(r"/d/([a-zA-Z0-9-_]+)", url_or_id)
    if match:
        return match.group(1)
    return url_or_id.strip()

def safe_float(val_str, default=0.0):
    if val_str is None:
        return default
    if isinstance(val_str, (int, float)):
        return float(val_str)
    clean = re.sub(r"[^\d.-]", "", str(val_str).replace(',', ''))
    try:
        return float(clean)
    except:
        return default

@router.post("/audit-comparison/generate")
def generate_audit_comparison(payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Read-only audit generator.
    1. Reads live data from user's current system Google Sheet (supporting multi-tab workbook and flat tables).
    2. Queries Cloud SQL database (Orders, Projects, Items).
    3. Creates a new Google Sheet comparison workbook with 3 tabs:
       - Tab 1: 🚨 AUDIT & DISCREPANCY HEATMAP (with red cell highlighting)
       - Tab 2: Current Live System Data
       - Tab 3: Portal Cloud SQL Database
    4. Shares sheet with user and returns structured datasets for instant Excel download.
    """
    raw_sheet_input = payload.get("current_system_sheet_url")
    user_email = payload.get("user_email", "erin.jones@1-to-1.world").strip()

    if not raw_sheet_input:
        raise HTTPException(status_code=400, detail="Please provide a valid Google Sheet URL or ID.")

    source_sheet_id = extract_spreadsheet_id(raw_sheet_input)

    try:
        sheets_service, drive_service = get_google_services()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize Google API service: {str(e)}")

    # Step 1: Read raw values from the legacy current system Google Sheet
    try:
        # First verify Drive permission access with supportsAllDrives=True
        try:
            drive_file = drive_service.files().get(
                fileId=source_sheet_id, 
                fields="id, name", 
                supportsAllDrives=True
            ).execute()
        except Exception as drive_err:
            err_str = str(drive_err)
            if "403" in err_str or "permission" in err_str.lower():
                raise HTTPException(
                    status_code=403,
                    detail=f"Permission Denied: Google Drive cannot access sheet ID '{source_sheet_id}'. Please verify you shared the Google Sheet with 858977785048-compute@developer.gserviceaccount.com."
                )
            raise drive_err

        # Fetch spreadsheet metadata to inspect all tabs
        sheet_meta = sheets_service.spreadsheets().get(spreadsheetId=source_sheet_id).execute()
        all_sheets = sheet_meta.get('sheets', [])
        if not all_sheets:
            raise HTTPException(status_code=400, detail="Provided Google Sheet contains no worksheets.")

    except HTTPException:
        raise
    except Exception as e:
        err_msg = str(e)
        if "timed out" in err_msg.lower() or "read operation" in err_msg.lower():
            err_msg = "Google API read timed out. The target Google Sheet might be very large or restricted."
        raise HTTPException(status_code=400, detail=f"Could not read legacy Google Sheet: {err_msg}")

    # Determine if this is a Multi-Tab workbook (Sales Tracker format) or Single Flat Table
    legacy_map = {}
    legacy_tab_rows = [
        ["Order ID / PO #", "Project Name", "Client Name", "Quote Name", "Supplier", "Retail Value", "Amount Paid", "Status", "Source Tab"]
    ]

    skip_tab_names = {'template', 'control', 'summary', 'instructions', 'readme', 'master'}
    order_tabs = [s['properties']['title'] for s in all_sheets if s['properties']['title'].strip().lower() not in skip_tab_names]

    if len(order_tabs) >= 1 and any(s['properties']['title'].strip().lower() == 'template' for s in all_sheets):
        # MULTI-TAB WORKBOOK EXTRACTION (Matches Sales Tracker template extraction engine)
        # Fetch all tab data in batch
        batch_ranges = [f"'{title}'!A1:Z100" for title in order_tabs]
        batch_res = sheets_service.spreadsheets().values().batchGet(
            spreadsheetId=source_sheet_id,
            ranges=batch_ranges
        ).execute()
        value_ranges = batch_res.get('valueRanges', [])

        for vr in value_ranges:
            # Extract tab name from range (e.g. "'1 Stern Close'!A1:Z100")
            range_str = vr.get('range', '')
            matched_tab = ""
            for ot in order_tabs:
                if ot in range_str:
                    matched_tab = ot
                    break
            if not matched_tab:
                matched_tab = order_tabs[0] if order_tabs else "Order"

            grid = vr.get('values', [])
            if not grid or len(grid) < 3:
                continue

            def get_cell(row_idx, col_idx):
                if row_idx < len(grid) and col_idx < len(grid[row_idx]):
                    return str(grid[row_idx][col_idx]).strip()
                return ""

            client_company = get_cell(1, 3) # D2 (index 1, 3)
            order_name = get_cell(2, 3) or matched_tab # D3 (index 2, 3)
            project_name = get_cell(4, 5) or get_cell(4, 3) or 'General Project' # F5 (index 4, 5)
            order_status = get_cell(97, 6) or get_cell(97, 3) or "Active" # G98 (index 97, 6)

            # Sum items across rows 9 to 89 (indices 8 to 88)
            total_retail = 0.0
            main_supplier = ""
            for r_idx in range(8, min(len(grid), 89)):
                row = grid[r_idx]
                qty = safe_float(row[1] if len(row) > 1 else 0)
                if qty <= 0:
                    continue
                unit_retail = safe_float(row[5] if len(row) > 5 else 0)
                supplier = str(row[12] if len(row) > 12 else '').strip()
                if supplier and not main_supplier:
                    main_supplier = supplier
                total_retail += qty * unit_retail

            # Payments
            deposit_val = safe_float(get_cell(94, 6) or get_cell(94, 3)) # G95 (index 94, 6)
            balance_val = safe_float(get_cell(95, 6) or get_cell(95, 3)) # G96 (index 95, 6)
            deposit_date = get_cell(94, 3) # D95
            balance_date = get_cell(95, 3) # D96

            amount_paid = 0.0
            if deposit_date or deposit_val > 0:
                amount_paid += deposit_val
            if balance_date or balance_val > 0:
                amount_paid += balance_val

            safe_order_ref = re.sub(r'[^a-zA-Z0-9]', '-', order_name).lower().strip('-')
            
            record = {
                "po_number": safe_order_ref,
                "project_name": project_name,
                "client_name": client_company,
                "quote_name": order_name,
                "supplier": main_supplier,
                "retail_value": total_retail,
                "amount_paid": amount_paid,
                "status": order_status,
                "source_tab": matched_tab
            }

            # Map under slug, original order name, and tab title for seamless lookup
            legacy_map[safe_order_ref] = record
            legacy_map[order_name.lower().strip()] = record
            legacy_map[matched_tab.lower().strip()] = record

            legacy_tab_rows.append([
                safe_order_ref, project_name, client_company, order_name,
                main_supplier, f"R {total_retail:,.2f}", f"R {amount_paid:,.2f}", order_status, matched_tab
            ])

    else:
        # SINGLE FLAT TABLE EXTRACTION
        target_tab = order_tabs[0] if order_tabs else all_sheets[0]['properties']['title']
        res = sheets_service.spreadsheets().values().get(
            spreadsheetId=source_sheet_id,
            range=f"'{target_tab}'!A1:Z5000"
        ).execute()
        source_rows = res.get('values', [])
        if not source_rows or len(source_rows) < 2:
            raise HTTPException(status_code=400, detail="Google Sheet data table appears to be empty.")

        header = [str(c).strip().lower() for c in source_rows[0]]
        def find_col_idx(possible_names):
            for name in possible_names:
                for i, h in enumerate(header):
                    if name in h: return i
            return -1

        po_idx = find_col_idx(['order id', 'po number', 'po_number', 'order_id', 'po #', 'order #'])
        proj_idx = find_col_idx(['project name', 'project_name', 'project key', 'project'])
        client_idx = find_col_idx(['client company', 'client name', 'client_name', 'client'])
        quote_name_idx = find_col_idx(['quote name', 'order name', 'quote_name', 'order_name', 'quote'])
        supplier_idx = find_col_idx(['supplier', 'brand'])
        retail_idx = find_col_idx(['retail value', 'unit retail price', 'retail_value', 'total retail', 'amount'])
        paid_idx = find_col_idx(['amount paid', 'paid_amount', 'paid'])
        status_idx = find_col_idx(['sheet order status', 'order status', 'status'])

        for r in source_rows[1:]:
            if not r: continue
            raw_po = r[po_idx].strip() if po_idx != -1 and po_idx < len(r) else ""
            if not raw_po: continue
            
            proj_val = r[proj_idx].strip() if proj_idx != -1 and proj_idx < len(r) else ""
            client_val = r[client_idx].strip() if client_idx != -1 and client_idx < len(r) else ""
            quote_val = r[quote_name_idx].strip() if quote_name_idx != -1 and quote_name_idx < len(r) else raw_po
            supplier_val = r[supplier_idx].strip() if supplier_idx != -1 and supplier_idx < len(r) else ""
            retail_val = safe_float(r[retail_idx] if retail_idx != -1 and retail_idx < len(r) else 0)
            paid_val = safe_float(r[paid_idx] if paid_idx != -1 and paid_idx < len(r) else 0)
            status_val = r[status_idx].strip() if status_idx != -1 and status_idx < len(r) else "Active"

            safe_po = re.sub(r'[^a-zA-Z0-9]', '-', raw_po).lower().strip('-')

            record = {
                "po_number": safe_po,
                "project_name": proj_val,
                "client_name": client_val,
                "quote_name": quote_val,
                "supplier": supplier_val,
                "retail_value": retail_val,
                "amount_paid": paid_val,
                "status": status_val,
                "source_tab": target_tab
            }
            legacy_map[safe_po] = record
            legacy_map[raw_po.lower().strip()] = record
            legacy_tab_rows.append([
                safe_po, proj_val, client_val, quote_val,
                supplier_val, f"R {retail_val:,.2f}", f"R {paid_val:,.2f}", status_val, target_tab
            ])

    # Step 2: Fetch Cloud SQL Database Orders
    db_orders = db.query(Order).all()
    all_projects = db.query(Project).all()
    db_projects_map = {p.project_key: p.name for p in all_projects}
    db_projects_client_map = {p.project_key: (p.client_name or "") for p in all_projects}

    db_map = {}
    portal_tab_rows = [
        ["Order ID / PO #", "Project Name", "Client Name", "Quote Name", "Supplier", "Retail Value", "Amount Paid", "Status"]
    ]

    for o in db_orders:
        proj_name = db_projects_map.get(o.project_key, o.project_key or "")
        client_name = getattr(o, 'client_name', None) or db_projects_client_map.get(o.project_key, "")
        supplier_name = getattr(o, 'supplier_name', None) or getattr(o, 'supplier', None) or ""
        paid_val = getattr(o, 'paid', None) or getattr(o, 'paid_amount', None) or 0.0
        
        # Calculate total retail from OrderItems
        items = db.query(OrderItem).filter(OrderItem.order_id == o.po_number).all()
        calc_retail = sum((getattr(item, 'unit_retail', 0.0) or 0.0) * (item.qty or 1) for item in items) if items else (getattr(o, 'value', 0.0) or getattr(o, 'order_value', 0.0) or 0.0)
        
        db_map[o.po_number] = {
            "po_number": o.po_number,
            "project_name": proj_name,
            "client_name": client_name,
            "quote_name": getattr(o, 'quote_name', None) or o.po_number,
            "supplier": supplier_name,
            "retail_value": float(calc_retail),
            "amount_paid": float(paid_val),
            "status": getattr(o, 'status', None) or "Active"
        }

        portal_tab_rows.append([
            o.po_number, proj_name, client_name, getattr(o, 'quote_name', None) or o.po_number,
            supplier_name, f"R {float(calc_retail):,.2f}", f"R {float(paid_val):,.2f}", getattr(o, 'status', None) or "Active"
        ])

    # Step 3: Construct Comparison Heatmap (Tab 1)
    heatmap_headers = [
        "Order ID / PO #", "Project Name", "Client Name", "Quote Name", 
        "Retail Value (Legacy)", "Retail Value (Portal)", 
        "Amount Paid (Legacy)", "Amount Paid (Portal)", 
        "Status (Legacy)", "Status (Portal)", "Audit Match Status"
    ]
    heatmap_rows = [heatmap_headers]

    matches_count = 0
    mismatches_count = 0
    missing_in_portal_count = 0
    new_in_portal_count = 0
    discrepancy_details = []

    # Get distinct list of all unique POs
    all_pos_keys = set()
    for k, v in legacy_map.items():
        all_pos_keys.add(v["po_number"])
    for k in db_map.keys():
        all_pos_keys.add(k)

    sorted_pos = sorted(list(all_pos_keys))

    for po in sorted_pos:
        # Resolve legacy item
        leg = legacy_map.get(po) or legacy_map.get(po.lower().strip())
        db_item = db_map.get(po) or db_map.get(re.sub(r'[^a-zA-Z0-9]', '-', po).lower().strip('-'))

        if leg and db_item:
            ret_match = abs(leg["retail_value"] - db_item["retail_value"]) < 1.0
            paid_match = abs(leg["amount_paid"] - db_item["amount_paid"]) < 1.0
            stat_match = leg["status"].lower().strip() == db_item["status"].lower().strip()

            if ret_match and paid_match and stat_match:
                audit_status = "🟢 100% Match"
                matches_count += 1
            else:
                audit_status = "🔴 Mismatch Detected"
                mismatches_count += 1
                discrepancy_details.append({
                    "po": po,
                    "type": "MISMATCH",
                    "legacy_retail": leg["retail_value"],
                    "portal_retail": db_item["retail_value"],
                    "legacy_paid": leg["amount_paid"],
                    "portal_paid": db_item["amount_paid"],
                    "legacy_status": leg["status"],
                    "portal_status": db_item["status"]
                })

            heatmap_rows.append([
                po,
                leg["project_name"] or db_item["project_name"],
                leg["client_name"] or db_item["client_name"],
                leg["quote_name"] or db_item["quote_name"],
                f"R {leg['retail_value']:,.2f}",
                f"R {db_item['retail_value']:,.2f}",
                f"R {leg['amount_paid']:,.2f}",
                f"R {db_item['amount_paid']:,.2f}",
                leg["status"],
                db_item["status"],
                audit_status
            ])
        elif leg and not db_item:
            missing_in_portal_count += 1
            discrepancy_details.append({
                "po": po,
                "type": "MISSING_IN_PORTAL",
                "legacy_retail": leg["retail_value"],
                "portal_retail": 0.0,
                "legacy_paid": leg["amount_paid"],
                "portal_paid": 0.0,
                "legacy_status": leg["status"],
                "portal_status": "MISSING"
            })
            heatmap_rows.append([
                po, leg["project_name"], leg["client_name"], leg["quote_name"],
                f"R {leg['retail_value']:,.2f}", "MISSING IN PORTAL",
                f"R {leg['amount_paid']:,.2f}", "MISSING IN PORTAL",
                leg["status"], "MISSING IN PORTAL",
                "🛑 MISSING IN PORTAL"
            ])
        elif db_item and not leg:
            new_in_portal_count += 1
            heatmap_rows.append([
                po, db_item["project_name"], db_item["client_name"], db_item["quote_name"],
                "NOT IN LEGACY", f"R {db_item['retail_value']:,.2f}",
                "NOT IN LEGACY", f"R {db_item['amount_paid']:,.2f}",
                "NOT IN LEGACY", db_item["status"],
                "⚠️ NEW IN PORTAL"
            ])

    # Step 4: Create new Google Spreadsheet inside Shared Drive Vault using Drive API
    audit_sheet_id = None
    audit_sheet_url = None
    try:
        file_metadata = {
            'name': '1-to-1 World - Live System Comparison & Audit Heatmap',
            'mimeType': 'application/vnd.google-apps.spreadsheet',
            'parents': [ROOT_DRIVE_FOLDER_ID]
        }
        created_file = drive_service.files().create(
            body=file_metadata,
            supportsAllDrives=True,
            fields='id, webViewLink'
        ).execute()
        audit_sheet_id = created_file.get('id')
        audit_sheet_url = created_file.get('webViewLink') or f"https://docs.google.com/spreadsheets/d/{audit_sheet_id}/edit"
    except Exception as create_err:
        print(f"Notice: Direct Drive Vault sheet creation fallback: {create_err}")
        try:
            created_file = drive_service.files().create(
                body={'name': '1-to-1 World - Live System Comparison & Audit Heatmap', 'mimeType': 'application/vnd.google-apps.spreadsheet'},
                supportsAllDrives=True,
                fields='id, webViewLink'
            ).execute()
            audit_sheet_id = created_file.get('id')
            audit_sheet_url = created_file.get('webViewLink') or f"https://docs.google.com/spreadsheets/d/{audit_sheet_id}/edit"
        except Exception as e:
            print(f"Warning: Could not create Google Sheet file: {e}")

    # Step 5: Share audit sheet with user email
    if audit_sheet_id:
        try:
            drive_service.permissions().create(
                fileId=audit_sheet_id,
                body={'type': 'user', 'role': 'writer', 'emailAddress': user_email},
                supportsAllDrives=True,
                fields='id'
            ).execute()
        except Exception as e:
            print(f"Notice: Google Drive share notice: {e}")

    # Step 6: Create 3 Tabs & Populate Data in Google Sheet
    if audit_sheet_id:
        try:
            # 1. Fetch created sheet properties to get initial sheetId
            meta = sheets_service.spreadsheets().get(spreadsheetId=audit_sheet_id).execute()
            initial_sheet_id = meta.get('sheets', [{}])[0].get('properties', {}).get('sheetId', 0)

            # 2. Add the 3 tabs and delete initial sheet
            requests = [
                {
                    'addSheet': {
                        'properties': {
                            'sheetId': 101,
                            'title': '🚨 AUDIT & DISCREPANCY HEATMAP',
                            'gridProperties': {'frozenRowCount': 1}
                        }
                    }
                },
                {
                    'addSheet': {
                        'properties': {
                            'sheetId': 102,
                            'title': 'Current Live System Data',
                            'gridProperties': {'frozenRowCount': 1}
                        }
                    }
                },
                {
                    'addSheet': {
                        'properties': {
                            'sheetId': 103,
                            'title': 'Portal Cloud SQL Database',
                            'gridProperties': {'frozenRowCount': 1}
                        }
                    }
                }
            ]

            if initial_sheet_id not in [101, 102, 103]:
                requests.append({'deleteSheet': {'sheetId': initial_sheet_id}})

            sheets_service.spreadsheets().batchUpdate(
                spreadsheetId=audit_sheet_id,
                body={'requests': requests}
            ).execute()

            # 3. Populate all 3 tabs in parallel batch update
            data_payload = [
                {
                    'range': "'🚨 AUDIT & DISCREPANCY HEATMAP'!A1",
                    'values': heatmap_rows
                },
                {
                    'range': "'Current Live System Data'!A1",
                    'values': legacy_tab_rows
                },
                {
                    'range': "'Portal Cloud SQL Database'!A1",
                    'values': portal_tab_rows
                }
            ]

            sheets_service.spreadsheets().values().batchUpdate(
                spreadsheetId=audit_sheet_id,
                body={'valueInputOption': 'USER_ENTERED', 'data': data_payload}
            ).execute()

            # 4. Add red highlighting conditional formatting rule on Tab 1
            cond_requests = [
                {
                    'addConditionalFormatRule': {
                        'rule': {
                            'ranges': [{
                                'sheetId': 101,
                                'startRowIndex': 1,
                                'endRowIndex': len(heatmap_rows),
                                'startColumnIndex': 0,
                                'endColumnIndex': 11
                            }],
                            'booleanRule': {
                                'condition': {
                                    'type': 'TEXT_CONTAINS',
                                    'values': [{'userEnteredValue': 'Mismatch'}]
                                },
                                'format': {
                                    'backgroundColor': {'red': 1.0, 'green': 0.88, 'blue': 0.88},
                                    'textFormat': {'foregroundColor': {'red': 0.86, 'green': 0.15, 'blue': 0.15}, 'bold': True}
                                }
                            }
                        },
                        'index': 0
                    }
                },
                {
                    'addConditionalFormatRule': {
                        'rule': {
                            'ranges': [{
                                'sheetId': 101,
                                'startRowIndex': 1,
                                'endRowIndex': len(heatmap_rows),
                                'startColumnIndex': 0,
                                'endColumnIndex': 11
                            }],
                            'booleanRule': {
                                'condition': {
                                    'type': 'TEXT_CONTAINS',
                                    'values': [{'userEnteredValue': 'MISSING IN PORTAL'}]
                                },
                                'format': {
                                    'backgroundColor': {'red': 0.99, 'green': 0.80, 'blue': 0.80},
                                    'textFormat': {'foregroundColor': {'red': 0.75, 'green': 0.10, 'blue': 0.10}, 'bold': True}
                                }
                            }
                        },
                        'index': 1
                    }
                }
            ]

            sheets_service.spreadsheets().batchUpdate(
                spreadsheetId=audit_sheet_id,
                body={'requests': cond_requests}
            ).execute()

        except Exception as sheet_err:
            print(f"Notice: Google Sheet tab batch update notice: {sheet_err}")

    return {
        "status": "success",
        "spreadsheet_id": audit_sheet_id,
        "spreadsheet_url": audit_sheet_url,
        "stats": {
            "total_orders_audited": len(sorted_pos),
            "matches_count": matches_count,
            "mismatches_count": mismatches_count,
            "missing_in_portal_count": missing_in_portal_count,
            "new_in_portal_count": new_in_portal_count
        },
        "discrepancies": discrepancy_details,
        "heatmap_rows": heatmap_rows,
        "legacy_rows": legacy_tab_rows,
        "portal_rows": portal_tab_rows,
        "message": f"Successfully completed live comparison! {len(sorted_pos)} orders analyzed ({matches_count} matching, {mismatches_count} mismatches, {missing_in_portal_count} missing in portal)."
    }
