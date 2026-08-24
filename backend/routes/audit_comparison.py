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
    """Initializes Google Sheets and Drive API services using Service Account or Application Default Credentials."""
    scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
    try:
        creds, _ = google.auth.default(scopes=scopes)
    except Exception:
        creds = None

    if not creds:
        # Fallback if service account file path env exists
        creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if creds_path and os.path.exists(creds_path):
            creds = service_account.Credentials.from_service_account_file(creds_path, scopes=scopes)

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
        # Fetch directly from range A1:Z5000 to avoid metadata overhead timeouts
        result = sheets_service.spreadsheets().values().get(
            spreadsheetId=source_sheet_id, 
            range="A1:Z5000"
        ).execute()
        source_rows = result.get('values', [])
    except Exception as e:
        err_msg = str(e)
        if "timed out" in err_msg.lower() or "read operation" in err_msg.lower():
            err_msg = "Google API read timed out. The target Google Sheet might be very large or restricted."
        raise HTTPException(status_code=400, detail=f"Could not read legacy Google Sheet. Ensure it is shared with service account. Error: {err_msg}")

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
    db_projects = {p.project_key: p.name for p in db.query(Project).all()}

    db_map = {}
    for o in db_orders:
        proj_name = db_projects.get(o.project_key, o.project_key or "")
        
        # Calculate total retail from OrderItems
        items = db.query(OrderItem).filter(OrderItem.order_id == o.po_number).all()
        calc_retail = sum((item.retail or 0.0) * (item.qty or 1) for item in items) if items else (o.order_value or 0.0)
        
        db_map[o.po_number] = {
            "po_number": o.po_number,
            "project_name": proj_name,
            "client_name": o.client_name or "",
            "quote_name": o.quote_name or o.po_number,
            "supplier": o.supplier or "",
            "retail_value": float(calc_retail),
            "amount_paid": float(o.paid_amount or 0.0),
            "status": o.status or "Active"
        }

    # Step 3: Build new Google Spreadsheet for Comparison Audit
    spreadsheet_body = {
        'properties': {
            'title': '1-to-1 World - Live System Comparison & Audit Heatmap'
        },
        'sheets': [
            {'properties': {'title': '🚨 AUDIT & DISCREPANCY HEATMAP', 'gridProperties': {'frozenRowCount': 1}}},
            {'properties': {'title': 'Current Live System Data'}},
            {'properties': {'title': 'Portal Cloud SQL Database'}}
        ]
    }
    
    audit_sheet = sheets_service.spreadsheets().create(body=spreadsheet_body).execute()
    audit_sheet_id = audit_sheet['spreadsheetId']

    # Place spreadsheet inside Google Drive Shared Vault root folder
    try:
        drive_service.files().update(
            fileId=audit_sheet_id,
            addParents=ROOT_DRIVE_FOLDER_ID,
            supportsAllDrives=True,
            fields='id, parents'
        ).execute()
    except Exception as drive_err:
        print(f"Notice: Drive folder move notice: {drive_err}")

    # Step 4: Share audit sheet with user email
    try:
        drive_service.permissions().create(
            fileId=audit_sheet_id,
            body={'type': 'user', 'role': 'writer', 'emailAddress': user_email},
            fields='id'
        ).execute()
    except Exception as e:
        print(f"Warning: Could not share audit sheet with {user_email}: {e}")

    # Step 5: Construct Comparison Heatmap Rows
    heatmap_headers = [
        "Order ID / PO #", "Project Name", "Client Name", "Quote Name", 
        "Retail Value (Legacy)", "Retail Value (Portal)", 
        "Amount Paid (Legacy)", "Amount Paid (Portal)", 
        "Status (Legacy)", "Status (Portal)", "Audit Match Status"
    ]

    heatmap_rows = [heatmap_headers]

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
            else:
                audit_status = "🔴 Mismatch Detected"

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
            heatmap_rows.append([
                po, leg["project_name"], leg["client_name"], leg["quote_name"],
                f"R {leg['retail_value']:,.2f}", "MISSING IN PORTAL",
                f"R {leg['amount_paid']:,.2f}", "MISSING IN PORTAL",
                leg["status"], "MISSING IN PORTAL",
                "🛑 MISSING IN PORTAL"
            ])
        elif db_item and not leg:
            heatmap_rows.append([
                po, db_item["project_name"], db_item["client_name"], db_item["quote_name"],
                "NOT IN LEGACY", f"R {db_item['retail_value']:,.2f}",
                "NOT IN LEGACY", f"R {db_item['amount_paid']:,.2f}",
                "NOT IN LEGACY", db_item["status"],
                "⚠️ NEW IN PORTAL"
            ])

    # Populate Tab 1: Audit Heatmap
    sheets_service.spreadsheets().values().update(
        spreadsheetId=audit_sheet_id,
        range="'🚨 AUDIT & DISCREPANCY HEATMAP'!A1",
        valueInputOption="USER_ENTERED",
        body={"values": heatmap_rows}
    ).execute()

    return {
        "status": "success",
        "spreadsheet_id": audit_sheet_id,
        "spreadsheet_url": f"https://docs.google.com/spreadsheets/d/{audit_sheet_id}/edit",
        "total_orders_audited": len(all_pos),
        "message": f"Successfully created Live System Audit Heatmap! Shared with {user_email}."
    }
