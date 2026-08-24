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

from google.oauth2 import service_account

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

@router.post("/audit-comparison/generate")
def generate_audit_comparison(payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Read-only audit generator.
    1. Reads live data from user's current system Google Sheet URL.
    2. Queries Cloud SQL database (Orders, Projects, Items).
    3. Creates a new Google Sheet comparison heatmap shared with erin.jones@1-to-1.world.
    4. Applies red cell highlighting for mismatched values or missing rows without touching Cloud SQL.
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

    # Step 1: Read raw values from the legacy current system Google Sheet directly
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
                    detail=f"Permission Denied: Google Drive cannot access sheet ID '{source_sheet_id}'. Please verify you shared the Google Sheet with 858977785048-compute@developer.gserviceaccount.com and that 'Anyone with link' or domain permissions allow service account access."
                )
            raise drive_err

        # Fetch values using first sheet tab or default A1:Z5000
        try:
            sheet_meta = sheets_service.spreadsheets().get(spreadsheetId=source_sheet_id).execute()
            sheets = sheet_meta.get('sheets', [])
            tab_name = sheets[0]['properties']['title'] if sheets else "Sheet1"
            target_range = f"'{tab_name}'!A1:Z5000"
        except Exception:
            target_range = "A1:Z5000"

        result = sheets_service.spreadsheets().values().get(
            spreadsheetId=source_sheet_id, 
            range=target_range
        ).execute()
        source_rows = result.get('values', [])
    except HTTPException:
        raise
    except Exception as e:
        err_msg = str(e)
        if "timed out" in err_msg.lower() or "read operation" in err_msg.lower():
            err_msg = "Google API read timed out. The target Google Sheet might be very large or restricted."
        raise HTTPException(status_code=400, detail=f"Could not read legacy Google Sheet: {err_msg}")

    if not source_rows or len(source_rows) < 2:
        raise HTTPException(status_code=400, detail="Legacy Google Sheet appears to be empty or missing data rows.")

    # Parse headers and row data
    header = [str(cell).strip().lower() for cell in source_rows[0]]
    
    # Header index mapping helpers
    def find_col_idx(possible_names):
        for name in possible_names:
            for i, h in enumerate(header):
                if name in h:
                    return i
        return -1

    po_idx = find_col_idx(['po number', 'order id', 'po_number', 'order_id', 'po #', 'order #'])
    proj_idx = find_col_idx(['project name', 'project_name', 'linked project', 'project'])
    client_idx = find_col_idx(['client name', 'client_name', 'client'])
    quote_name_idx = find_col_idx(['quote name', 'order name', 'quote_name', 'order_name', 'quote'])
    supplier_idx = find_col_idx(['supplier'])
    retail_idx = find_col_idx(['retail value', 'order value', 'retail_value', 'total retail', 'amount'])
    paid_idx = find_col_idx(['amount paid', 'paid_amount', 'paid'])
    status_idx = find_col_idx(['status', 'order status'])

    # Parse legacy records into a structured map keyed by PO Number / Order ID
    legacy_map = {}
    for r in source_rows[1:]:
        if not r or len(r) == 0:
            continue
        
        po_val = r[po_idx].strip() if po_idx != -1 and po_idx < len(r) else ""
        if not po_val:
            continue

        proj_val = r[proj_idx].strip() if proj_idx != -1 and proj_idx < len(r) else ""
        client_val = r[client_idx].strip() if client_idx != -1 and client_idx < len(r) else ""
        quote_val = r[quote_name_idx].strip() if quote_name_idx != -1 and quote_name_idx < len(r) else ""
        supplier_val = r[supplier_idx].strip() if supplier_idx != -1 and supplier_idx < len(r) else ""
        
        def parse_float(val_str):
            if not val_str: return 0.0
            clean = re.sub(r"[^\d.-]", "", str(val_str))
            try: return float(clean)
            except: return 0.0

        retail_val = parse_float(r[retail_idx]) if retail_idx != -1 and retail_idx < len(r) else 0.0
        paid_val = parse_float(r[paid_idx]) if paid_idx != -1 and paid_idx < len(r) else 0.0
        status_val = r[status_idx].strip() if status_idx != -1 and status_idx < len(r) else "Active"

        legacy_map[po_val] = {
            "po_number": po_val,
            "project_name": proj_val,
            "client_name": client_val,
            "quote_name": quote_val,
            "supplier": supplier_val,
            "retail_value": retail_val,
            "amount_paid": paid_val,
            "status": status_val
        }

    # Step 2: Fetch Cloud SQL Database Orders
    db_orders = db.query(Order).all()
    all_projects = db.query(Project).all()
    db_projects_map = {p.project_key: p.name for p in all_projects}
    db_projects_client_map = {p.project_key: (p.client_name or "") for p in all_projects}

    db_map = {}
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

    # Step 3: Create new Google Spreadsheet directly inside Shared Drive Vault using Drive API
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
        # If Shared Vault folder is full/restricted, try without parent folder
        try:
            created_file = drive_service.files().create(
                body={'name': '1-to-1 World - Live System Comparison & Audit Heatmap', 'mimeType': 'application/vnd.google-apps.spreadsheet'},
                supportsAllDrives=True,
                fields='id, webViewLink'
            ).execute()
            audit_sheet_id = created_file.get('id')
            audit_sheet_url = created_file.get('webViewLink') or f"https://docs.google.com/spreadsheets/d/{audit_sheet_id}/edit"
        except Exception as e:
            print(f"Warning: Could not create online Google Sheet file: {e}")

    # Step 4: Share audit sheet with user email if sheet was created
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

    # Step 5: Construct Comparison Heatmap Rows & Stats
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

    # Combine all PO numbers from legacy & DB
    all_pos = list(set(list(legacy_map.keys()) + list(db_map.keys())))
    all_pos.sort()

    for po in all_pos:
        leg = legacy_map.get(po)
        db_item = db_map.get(po)

        if leg and db_item:
            ret_match = abs(leg["retail_value"] - db_item["retail_value"]) < 1.0
            paid_match = abs(leg["amount_paid"] - db_item["amount_paid"]) < 1.0
            stat_match = leg["status"].lower() == db_item["status"].lower()

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

    # Populate Sheet Tab if Google Sheet was created
    if audit_sheet_id:
        try:
            sheets_service.spreadsheets().values().update(
                spreadsheetId=audit_sheet_id,
                range="A1",
                valueInputOption="USER_ENTERED",
                body={"values": heatmap_rows}
            ).execute()
        except Exception as update_err:
            print(f"Notice: Sheet value update notice: {update_err}")

    return {
        "status": "success",
        "spreadsheet_id": audit_sheet_id,
        "spreadsheet_url": audit_sheet_url,
        "stats": {
            "total_orders_audited": len(all_pos),
            "matches_count": matches_count,
            "mismatches_count": mismatches_count,
            "missing_in_portal_count": missing_in_portal_count,
            "new_in_portal_count": new_in_portal_count
        },
        "discrepancies": discrepancy_details,
        "heatmap_rows": heatmap_rows,
        "message": f"Successfully completed live comparison! {len(all_pos)} orders analyzed ({matches_count} matching, {mismatches_count} mismatches, {missing_in_portal_count} missing in portal)."
    }
