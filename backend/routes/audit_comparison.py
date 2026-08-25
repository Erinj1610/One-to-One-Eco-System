from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.orm import Session
from database.cloud_sql import get_db
from models.orm_models import Order, Project, OrderItem
from typing import Optional, List, Dict, Any
import io
import os
import re
import socket
import datetime
import concurrent.futures
import google.auth
from google.oauth2 import service_account
from googleapiclient.discovery import build

# Set HTTP socket timeout
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

def safe_int(val, default=0):
    f = safe_float(val, default=float(default))
    return int(f)

def normalize_key(s: str) -> str:
    """Normalizes any string to alphanumeric-only lowercase for 100% collision-free matching."""
    if not s:
        return ""
    return re.sub(r'[^a-zA-Z0-9]', '', str(s)).lower()

def col_letter_to_index(col_letters: str) -> int:
    """Converts column letter (A, B, ..., Z, AA, AB, AC) to 0-indexed column integer."""
    col = 0
    for char in col_letters.strip().upper():
        col = col * 26 + (ord(char) - ord('A') + 1)
    return col - 1

def parse_excel_date(val: Any) -> str:
    """Parses Excel serial dates or datetime strings into standardized YYYY-MM-DD format."""
    if not val:
        return ""
    val_str = str(val).strip()
    if not val_str:
        return ""
    
    # Check if numeric Excel serial date (e.g., 45230)
    try:
        f = float(val_str)
        if f > 30000 and f < 70000:
            base = datetime.date(1899, 12, 30)
            return (base + datetime.timedelta(days=int(f))).isoformat()
    except Exception:
        pass

    # Standardize string date YYYY-MM-DD
    match_iso = re.search(r'(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})', val_str)
    if match_iso:
        return f"{match_iso.group(1)}-{int(match_iso.group(2)):02d}-{int(match_iso.group(3)):02d}"

    # Standardize string date DD/MM/YYYY or MM/DD/YYYY
    match_dmy = re.search(r'(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})', val_str)
    if match_dmy:
        return f"{match_dmy.group(3)}-{int(match_dmy.group(2)):02d}-{int(match_dmy.group(1)):02d}"

    return val_str

RECONCILIATION_COLUMNS = [
    "Project Key", "Project Name", "Client Company", "Order ID", "Quote Name",
    "Sales Rep", "Delivery Address", "Item ID", "Qty", "1:1 Code",
    "Item Code", "Description", "Unit Cost Ex VAT", "Unit Retail Price Ex VAT",
    "Brand", "Supplier", "Item Type", "Stock Status", "Stock on Hand",
    "Qty Ordered (PO)", "PO Supplier", "Date Ordered", "PO Reference", "Delivery ETA",
    "Qty REC", "Date REC", "GRN Reference", "Qty INV", "Invoice Reference", "Date INV",
    "Qty DEL", "Date DEL", "Delivery Reference", "Delivery Comments", "Sheet Order Status",
    "Deposit Value", "Deposit Invoice Sent", "Deposit Payment Date",
    "Balance Value", "Balance Payment Date", "Amount Paid"
]

@router.post("/audit-comparison/get-tabs")
def get_audit_tabs(payload: dict = Body(...)):
    """
    Step 1 of real-time audit:
    Fetches the metadata of the Google Sheet and identifies all order/project tabs strictly appearing AFTER 'Template'.
    Returns total count and list of tab names for live progress reporting.
    """
    raw_sheet_input = payload.get("current_system_sheet_url")
    if not raw_sheet_input:
        raise HTTPException(status_code=400, detail="Please provide a valid Google Sheet URL or ID.")

    source_sheet_id = extract_spreadsheet_id(raw_sheet_input)

    try:
        sheets_service, drive_service = get_google_services()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize Google API service: {str(e)}")

    try:
        # Pre-check drive access
        try:
            drive_service.files().get(
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

        # Fetch spreadsheet tab list
        meta = sheets_service.spreadsheets().get(
            spreadsheetId=source_sheet_id,
            fields="sheets(properties(sheetId,title,index))"
        ).execute()

        all_sheets = meta.get('sheets', [])
        if not all_sheets:
            raise HTTPException(status_code=400, detail="Provided Google Sheet contains no worksheets.")

        found_template = False
        target_sheets = []
        for s in all_sheets:
            title = s.get('properties', {}).get('title', '').strip()
            if title.lower() == 'template':
                found_template = True
                continue
            if found_template:
                target_sheets.append(title)

        if not target_sheets:
            skip_names = {'template', 'control', 'summary', 'instructions', 'readme', 'master'}
            target_sheets = [s.get('properties', {}).get('title', '').strip() for s in all_sheets if s.get('properties', {}).get('title', '').strip().lower() not in skip_names]

        return {
            "status": "success",
            "spreadsheet_id": source_sheet_id,
            "total_tabs": len(target_sheets),
            "tabs": target_sheets
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read spreadsheet metadata: {str(e)}")

@router.post("/audit-comparison/extract-tab-batch")
def extract_audit_tab_batch(payload: dict = Body(...)):
    """
    Step 2 of real-time audit:
    Extracts a batch of 5-8 sheet tabs in parallel, parsing rows 9-89 with exact 41 columns.
    Enables live percentage updates on the frontend.
    """
    raw_sheet_input = payload.get("current_system_sheet_url")
    tab_names = payload.get("tab_names", [])

    if not raw_sheet_input or not tab_names:
        return {"status": "success", "flat_rows": []}

    source_sheet_id = extract_spreadsheet_id(raw_sheet_input)

    try:
        sheets_service, drive_service = get_google_services()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize Google API service: {str(e)}")

    def escape_range(name: str) -> str:
        clean = name.replace("'", "''")
        return f"'{clean}'!A1:AC98"

    ranges = [escape_range(t) for t in tab_names]

    try:
        batch_res = sheets_service.spreadsheets().values().batchGet(
            spreadsheetId=source_sheet_id,
            ranges=ranges,
            valueRenderOption='FORMATTED_VALUE'
        ).execute()
        value_ranges = batch_res.get('valueRanges', [])
    except Exception:
        # Fallback to individual gets if one range fails
        value_ranges = []
        for t in tab_names:
            try:
                res = sheets_service.spreadsheets().values().get(
                    spreadsheetId=source_sheet_id,
                    range=escape_range(t),
                    valueRenderOption='FORMATTED_VALUE'
                ).execute()
                value_ranges.append(res)
            except Exception as single_err:
                print(f"Skipping tab '{t}': {single_err}")

    batch_flat_rows = []

    for idx, vr in enumerate(value_ranges):
        sheet_name = tab_names[idx] if idx < len(tab_names) else "Order"
        grid = vr.get('values', [])
        if not grid or len(grid) < 2:
            continue

        def get_val(cell_ref: str) -> str:
            m = re.match(r'([A-Za-z]+)(\d+)', cell_ref.strip())
            if not m:
                return ""
            col_idx = col_letter_to_index(m.group(1))
            row_idx = int(m.group(2)) - 1
            if row_idx < len(grid) and col_idx < len(grid[row_idx]):
                return str(grid[row_idx][col_idx]).strip()
            return ""

        def get_row_val(col_letter: str, row_num: int) -> Any:
            col_idx = col_letter_to_index(col_letter)
            row_idx = row_num - 1
            if row_idx < len(grid) and col_idx < len(grid[row_idx]):
                return grid[row_idx][col_idx]
            return None

        client_company = get_val('D2')
        order_name = get_val('D3') or sheet_name
        project_f5 = get_val('F5') or 'General Project'
        delivery_address = get_val('D6')
        sales_rep = get_val('F1')
        order_status_g98 = get_val('G98') or "Processing"

        safe_order_ref = re.sub(r'[^a-zA-Z0-9]', '-', order_name).lower()

        deposit_invoice_sent = get_val('D90') or 'No'
        deposit_payment_date = parse_excel_date(get_val('D95'))
        balance_payment_date = parse_excel_date(get_val('D96'))
        deposit_value = safe_float(get_val('G95'))
        balance_value = safe_float(get_val('G96'))

        amount_paid = 0.0
        if deposit_payment_date or deposit_value > 0:
            amount_paid += deposit_value
        if balance_payment_date or balance_value > 0:
            amount_paid += balance_value

        # Parse rows 9 to 89
        for r in range(9, 90):
            qty_raw = get_row_val('B', r)
            qty = safe_int(qty_raw)
            if qty <= 0:
                continue

            one_one_code = str(get_row_val('C', r) or '').strip()
            item_code = str(get_row_val('D', r) or '').strip()
            description = str(get_row_val('E', r) or '').strip()
            unit_retail = safe_float(get_row_val('F', r))
            unit_cost = safe_float(get_row_val('I', r))
            brand = str(get_row_val('L', r) or '').strip()
            supplier = str(get_row_val('M', r) or '').strip()
            product_type = str(get_row_val('N', r) or '').strip() or "Hardware"

            po_ref_from_sheet = str(get_row_val('Q', r) or '').strip()
            po_supplier = str(get_row_val('R', r) or supplier or 'Warehouse Inventory').strip()
            date_ordered_raw = get_row_val('S', r)
            date_ordered = parse_excel_date(date_ordered_raw)
            eta_raw = get_row_val('T', r)
            eta = parse_excel_date(eta_raw)

            date_rec_raw = get_row_val('U', r)
            date_rec = parse_excel_date(date_rec_raw)
            qty_rec = safe_int(get_row_val('V', r))

            qty_inv = safe_int(get_row_val('Y', r))
            invoice_ref = str(get_row_val('Z', r) or '').strip()
            date_inv_raw = get_row_val('AA', r)
            date_inv = parse_excel_date(date_inv_raw)

            delivery_comments = str(get_row_val('AC', r) or '').strip()

            po_ref = po_ref_from_sheet
            if not po_ref and date_ordered:
                clean_date = re.sub(r'[^0-9]', '', date_ordered)
                clean_supp = re.sub(r'[^a-zA-Z0-9]', '', po_supplier)[:8].lower()
                po_ref = f"PO-{safe_order_ref}-{clean_supp}-{clean_date}"

            grn_ref = ""
            if date_rec and qty_rec > 0:
                clean_date = re.sub(r'[^0-9]', '', date_rec)
                grn_ref = f"GRN-{safe_order_ref}-{clean_date}"

            inv_ref_value = invoice_ref
            if not inv_ref_value and date_inv and qty_inv > 0:
                clean_date = re.sub(r'[^0-9]', '', date_inv)
                inv_ref_value = f"INV-{safe_order_ref}-{clean_date}"

            delivery_ref = f"DEL-{safe_order_ref}" if delivery_comments else ""
            temp_item_id = f"ITEM-{safe_order_ref}-{one_one_code or item_code or 'FITTING'}-{r}"

            batch_flat_rows.append({
                "Project Key": re.sub(r'[^a-zA-Z0-9]', '-', project_f5).lower(),
                "Project Name": project_f5,
                "Client Company": client_company,
                "Order ID": safe_order_ref,
                "Quote Name": order_name,
                "Sales Rep": sales_rep,
                "Delivery Address": delivery_address,
                "Item ID": temp_item_id,
                "Qty": qty,
                "1:1 Code": one_one_code,
                "Item Code": item_code,
                "Description": description,
                "Unit Cost Ex VAT": unit_cost,
                "Unit Retail Price Ex VAT": unit_retail,
                "Brand": brand,
                "Supplier": supplier,
                "Item Type": product_type,
                "Stock Status": "",
                "Stock on Hand": "",
                "Qty Ordered (PO)": "",
                "PO Supplier": po_supplier,
                "Date Ordered": date_ordered,
                "PO Reference": po_ref,
                "Delivery ETA": eta,
                "Qty REC": qty_rec if qty_rec > 0 else "",
                "Date REC": date_rec,
                "GRN Reference": grn_ref,
                "Qty INV": qty_inv if qty_inv > 0 else "",
                "Invoice Reference": inv_ref_value,
                "Date INV": date_inv,
                "Qty DEL": "",
                "Date DEL": "",
                "Delivery Reference": delivery_ref,
                "Delivery Comments": delivery_comments,
                "Sheet Order Status": order_status_g98,
                "Deposit Value": deposit_value,
                "Deposit Invoice Sent": deposit_invoice_sent,
                "Deposit Payment Date": deposit_payment_date,
                "Balance Value": balance_value,
                "Balance Payment Date": balance_payment_date,
                "Amount Paid": amount_paid
            })

    return {
        "status": "success",
        "processed_tabs": len(tab_names),
        "flat_rows": batch_flat_rows
    }

@router.post("/audit-comparison/finalize")
def finalize_audit_comparison(payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Step 3 of real-time audit:
    Receives all extracted legacy rows from the client.
    Queries Cloud SQL database, cross-references each order, creates the 3-tab Google Spreadsheet,
    applies red discrepancy formatting, and returns the full audit result payload.
    """
    legacy_flat_rows = payload.get("legacy_rows", [])
    user_email = payload.get("user_email", "erin.jones@1-to-1.world").strip()

    try:
        sheets_service, drive_service = get_google_services()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize Google API service: {str(e)}")

    # Fetch Cloud SQL Database items in identical 41-column format
    db_orders = db.query(Order).all()
    all_projects = db.query(Project).all()
    db_projects_map = {p.project_key: p.name for p in all_projects}
    db_projects_client_map = {p.project_key: (p.client_name or "") for p in all_projects}
    db_projects_pm_map = {p.project_key: (p.pm_name or "Dani") for p in all_projects}
    db_projects_status_map = {p.project_key: (p.complete_status or p.status or "Ongoing") for p in all_projects}
    db_projects_delivery_map = {p.project_key: (getattr(p, 'delivery_address', None) or getattr(p, 'start_date', None) or "7 RAVENSCRAIG ROAD, WOODSTOCK, CAPE TOWN, 7941") for p in all_projects}

    portal_flat_rows = []
    for o in db_orders:
        proj_name = db_projects_map.get(o.project_key, o.project_key or "General Project")
        client_name = getattr(o, 'client_name', None) or db_projects_client_map.get(o.project_key, "")
        sales_rep = getattr(o, 'pm_name', None) or db_projects_pm_map.get(o.project_key, "Dani") or "Dani"
        delivery_address = getattr(o, 'delivery_address', None) or getattr(o, 'notes', None) or db_projects_delivery_map.get(o.project_key, "") or "7 RAVENSCRAIG ROAD, WOODSTOCK, CAPE TOWN, 7941"
        order_status = getattr(o, 'status', None) or db_projects_status_map.get(o.project_key, "Processing") or "Processing"

        items = db.query(OrderItem).filter(OrderItem.order_id == o.po_number).all()

        if items:
            for item in items:
                po_supplier_val = getattr(item, 'po_supplier', None) or getattr(item, 'supplier', None) or getattr(o, 'supplier_name', None) or getattr(o, 'supplier', "") or ""
                date_ordered_val = getattr(item, 'po_date', None) or getattr(o, 'order_date', None) or getattr(o, 'quotation_sent_date', "") or ""
                po_ref_val = getattr(item, 'po_ref', None) or o.po_number or ""
                delivery_eta_val = getattr(item, 'eta', None) or getattr(item, 'po_eta', None) or getattr(o, 'eta', None) or getattr(o, 'expected_delivery_date', "") or ""

                portal_flat_rows.append({
                    "Project Key": o.project_key or "",
                    "Project Name": proj_name,
                    "Client Company": client_name,
                    "Order ID": o.po_number or "",
                    "Quote Name": getattr(o, 'quote_name', None) or o.po_number or "",
                    "Sales Rep": sales_rep,
                    "Delivery Address": delivery_address,
                    "Item ID": str(item.id or ""),
                    "Qty": item.qty or 0,
                    "1:1 Code": getattr(item, 'one_one_code', None) or "",
                    "Item Code": getattr(item, 'code', None) or "",
                    "Description": getattr(item, 'description', None) or "",
                    "Unit Cost Ex VAT": getattr(item, 'unit_cost', 0.0) or 0.0,
                    "Unit Retail Price Ex VAT": getattr(item, 'unit_retail', 0.0) or 0.0,
                    "Brand": getattr(item, 'brand', None) or "",
                    "Supplier": getattr(item, 'supplier', None) or getattr(o, 'supplier_name', "") or "",
                    "Item Type": getattr(item, 'type', None) or "Hardware",
                    "Stock Status": getattr(item, 'stock_status', None) or "",
                    "Stock on Hand": 0,
                    "Qty Ordered (PO)": getattr(item, 'po_qty_ordered', 0) or 0,
                    "PO Supplier": po_supplier_val,
                    "Date Ordered": date_ordered_val,
                    "PO Reference": po_ref_val,
                    "Delivery ETA": delivery_eta_val,
                    "Qty REC": getattr(item, 'received_qty', 0) or 0,
                    "Date REC": getattr(item, 'received_date', None) or "",
                    "GRN Reference": "",
                    "Qty INV": getattr(item, 'invoice_qty', 0) or 0,
                    "Invoice Reference": getattr(item, 'invoice_ref', None) or "",
                    "Date INV": getattr(item, 'invoice_date', None) or "",
                    "Qty DEL": getattr(item, 'delivery_qty', 0) or 0,
                    "Date DEL": getattr(item, 'delivery_date', None) or "",
                    "Delivery Reference": getattr(item, 'delivery_status', None) or "",
                    "Delivery Comments": "",
                    "Sheet Order Status": order_status,
                    "Deposit Value": getattr(o, 'deposit_value', 0.0) or 0.0,
                    "Deposit Invoice Sent": getattr(o, 'deposit_invoice_sent', None) or "No",
                    "Deposit Payment Date": getattr(o, 'deposit_payment_date', None) or "",
                    "Balance Value": getattr(o, 'balance_value', 0.0) or 0.0,
                    "Balance Payment Date": getattr(o, 'balance_payment_date', None) or "",
                    "Amount Paid": getattr(o, 'paid', 0.0) or getattr(o, 'paid_amount', 0.0) or 0.0
                })
        else:
            portal_flat_rows.append({
                "Project Key": o.project_key or "",
                "Project Name": proj_name,
                "Client Company": client_name,
                "Order ID": o.po_number or "",
                "Quote Name": getattr(o, 'quote_name', None) or o.po_number or "",
                "Sales Rep": sales_rep,
                "Delivery Address": delivery_address,
                "Item ID": f"ORDER-{o.po_number}",
                "Qty": 1,
                "1:1 Code": "",
                "Item Code": "",
                "Description": getattr(o, 'quote_name', None) or o.po_number or "General Order",
                "Unit Cost Ex VAT": 0.0,
                "Unit Retail Price Ex VAT": getattr(o, 'value', 0.0) or 0.0,
                "Brand": "",
                "Supplier": getattr(o, 'supplier_name', None) or getattr(o, 'supplier', None) or "",
                "Item Type": "Order",
                "Stock Status": "",
                "Stock on Hand": 0,
                "Qty Ordered (PO)": 0,
                "PO Supplier": getattr(o, 'supplier_name', None) or getattr(o, 'supplier', None) or "",
                "Date Ordered": getattr(o, 'order_date', None) or getattr(o, 'quotation_sent_date', None) or "",
                "PO Reference": o.po_number or "",
                "Delivery ETA": getattr(o, 'eta', None) or getattr(o, 'expected_delivery_date', None) or "",
                "Qty REC": 0,
                "Date REC": "",
                "GRN Reference": "",
                "Qty INV": 0,
                "Invoice Reference": "",
                "Date INV": "",
                "Qty DEL": 0,
                "Date DEL": "",
                "Delivery Reference": "",
                "Delivery Comments": "",
                "Sheet Order Status": order_status,
                "Deposit Value": getattr(o, 'deposit_value', 0.0) or 0.0,
                "Deposit Invoice Sent": getattr(o, 'deposit_invoice_sent', None) or "No",
                "Deposit Payment Date": getattr(o, 'deposit_payment_date', None) or "",
                "Balance Value": getattr(o, 'balance_value', 0.0) or 0.0,
                "Balance Payment Date": getattr(o, 'balance_payment_date', None) or "",
                "Amount Paid": getattr(o, 'paid', 0.0) or getattr(o, 'paid_amount', 0.0) or 0.0
            })

    # Construct Tab 1 Comparison Heatmap with Normalized Collision-Free Key Matching
    legacy_order_items: Dict[str, List[dict]] = {}
    for r in legacy_flat_rows:
        nkey = normalize_key(r.get("Order ID")) or normalize_key(r.get("Quote Name"))
        if not nkey: continue
        legacy_order_items.setdefault(nkey, []).append(r)

    portal_order_items: Dict[str, List[dict]] = {}
    for r in portal_flat_rows:
        nkey = normalize_key(r.get("Order ID")) or normalize_key(r.get("Quote Name"))
        if not nkey: continue
        portal_order_items.setdefault(nkey, []).append(r)

    all_keys = sorted(list(set(list(legacy_order_items.keys()) + list(portal_order_items.keys()))))

    # Heatmap Headers with Audit Status + all 41 reconciliation columns
    heatmap_headers = ["Audit Status"] + RECONCILIATION_COLUMNS
    heatmap_rows = [heatmap_headers]

    matches_count = 0
    mismatches_count = 0
    missing_in_portal_count = 0
    new_in_portal_count = 0
    discrepancy_details = []
    red_cell_coordinates = []  # list of (row_idx, col_idx) for Google Sheet formatting

    def are_values_equal(col_name: str, val1: Any, val2: Any) -> bool:
        # Exclude columns requested by user or that are system-generated
        EXCLUDED_DIFF_COLUMNS = {
            "Item ID",
            "Item Type",
            "Stock Status",
            "Stock on Hand",
            "Qty Ordered (PO)",
            "Qty DEL",
            "Date DEL",
            "Delivery Reference",
            "Delivery Comments",
            "Sheet Order Status"
        }
        if col_name in EXCLUDED_DIFF_COLUMNS:
            return True

        v1_str = str(val1).strip() if val1 is not None else ""
        v2_str = str(val2).strip() if val2 is not None else ""

        # Treat blank, empty string, None, "—", "null" as equivalent
        if v1_str in {"", "—", "None", "null", "undefined"} and v2_str in {"", "—", "None", "null", "undefined"}:
            return True

        # Numeric columns (treat blank vs 0 as equal, tolerance 0.05)
        if col_name in {"Qty", "Unit Cost Ex VAT", "Unit Retail Price Ex VAT", "Stock on Hand", "Qty Ordered (PO)", "Qty REC", "Qty INV", "Qty DEL", "Deposit Value", "Balance Value", "Amount Paid"}:
            n1 = safe_float(val1)
            n2 = safe_float(val2)
            return abs(n1 - n2) < 0.05

        # Date columns
        if "Date" in col_name or col_name in {"Delivery ETA", "Date Ordered", "Date REC", "Date INV", "Date DEL", "Deposit Payment Date", "Balance Payment Date"}:
            d1 = parse_excel_date(val1)
            d2 = parse_excel_date(val2)
            if not d1 and not d2:
                return True
            return d1 == d2

        # Status & Stage matching (normalize synonyms)
        if col_name in {"Sheet Order Status", "Stock Status"}:
            norm1 = re.sub(r'[^a-z0-9]', '', v1_str.lower())
            norm2 = re.sub(r'[^a-z0-9]', '', v2_str.lower())
            if norm1 == norm2:
                return True
            active_synonyms = {"processing", "ongoing", "active", "ontrack", "inproduction", "inprogress", "stage1", "stage2", "stage3", "stage4", "stage5"}
            if norm1 in active_synonyms and norm2 in active_synonyms:
                return True
            complete_synonyms = {"complete", "completed", "delivered", "done"}
            if norm1 in complete_synonyms and norm2 in complete_synonyms:
                return True
            pending_synonyms = {"pending", "draft", "awaitingdeposit", "quoted"}
            if norm1 in pending_synonyms and norm2 in pending_synonyms:
                return True

        # Delivery Address matching
        if col_name == "Delivery Address":
            if not v1_str or not v2_str:
                return True
            if "ravenscraig" in v1_str.lower() or "ravenscraig" in v2_str.lower():
                return True

        # Sales Rep matching
        if col_name == "Sales Rep":
            if not v1_str or not v2_str:
                return True
            if normalize_key(v1_str) in normalize_key(v2_str) or normalize_key(v2_str) in normalize_key(v1_str):
                return True

        # Text columns: normalize whitespace, hyphens, and casing
        s1 = normalize_key(v1_str)
        s2 = normalize_key(v2_str)
        return s1 == s2

    for nkey in all_keys:
        legs = legacy_order_items.get(nkey, [])
        ports = portal_order_items.get(nkey, [])

        display_oid = (legs[0].get("Order ID") if legs else None) or (ports[0].get("Order ID") if ports else None) or nkey

        if legs and not ports:
            missing_in_portal_count += 1
            discrepancy_details.append({
                "order_id": display_oid,
                "type": "MISSING_IN_PORTAL"
            })
            for l_item in legs:
                row_idx = len(heatmap_rows)
                row_vals = ["🛑 MISSING IN PORTAL"] + [l_item.get(c, "") for c in RECONCILIATION_COLUMNS]
                heatmap_rows.append(row_vals)
                for c_i in range(len(row_vals)):
                    red_cell_coordinates.append((row_idx, c_i))
            continue

        if ports and not legs:
            new_in_portal_count += 1
            continue

        # Both exist: smart item matching by 1:1 Code, Item Code, or Description
        matched_portal_indices = set()
        order_has_mismatch = False

        for l_item in legs:
            l_code1 = normalize_key(l_item.get("1:1 Code"))
            l_code2 = normalize_key(l_item.get("Item Code"))
            l_desc = normalize_key(l_item.get("Description"))

            best_p_item = None
            best_p_idx = None

            # 1. Exact match on 1:1 Code or Item Code
            for p_idx, p_item in enumerate(ports):
                if p_idx in matched_portal_indices:
                    continue
                p_code1 = normalize_key(p_item.get("1:1 Code"))
                p_code2 = normalize_key(p_item.get("Item Code"))
                if (l_code1 and l_code1 == p_code1) or (l_code2 and l_code2 == p_code2):
                    best_p_item = p_item
                    best_p_idx = p_idx
                    break

            # 2. Match on description if code didn't match
            if best_p_idx is None and l_desc:
                for p_idx, p_item in enumerate(ports):
                    if p_idx in matched_portal_indices:
                        continue
                    p_desc = normalize_key(p_item.get("Description"))
                    if l_desc == p_desc:
                        best_p_item = p_item
                        best_p_idx = p_idx
                        break

            # 3. Positional fallback
            if best_p_idx is None:
                unmatched = [idx for idx in range(len(ports)) if idx not in matched_portal_indices]
                if unmatched:
                    best_p_idx = unmatched[0]
                    best_p_item = ports[best_p_idx]

            if best_p_idx is not None:
                matched_portal_indices.add(best_p_idx)
                p_item = best_p_item
            else:
                p_item = None

            if p_item:
                diff_cols = []
                diff_names = []
                for c_idx, col_name in enumerate(RECONCILIATION_COLUMNS):
                    v1 = l_item.get(col_name, "")
                    v2 = p_item.get(col_name, "")
                    if not are_values_equal(col_name, v1, v2):
                        diff_cols.append(c_idx + 1)  # offset by 1 for Status column
                        diff_names.append(col_name)

                if diff_cols:
                    order_has_mismatch = True
                    diff_summary = f"🔴 MISMATCH ({', '.join(diff_names[:3])})"
                    
                    row_idx = len(heatmap_rows)
                    heatmap_rows.append([diff_summary] + [l_item.get(c, "") for c in RECONCILIATION_COLUMNS])

                    # Mark exact diff coordinates in red
                    for diff_c in diff_cols:
                        red_cell_coordinates.append((row_idx, diff_c))
                    red_cell_coordinates.append((row_idx, 0))

            else:
                # Extra item in live system that portal doesn't have
                order_has_mismatch = True
                row_idx = len(heatmap_rows)
                row_vals = ["🛑 ITEM MISSING IN PORTAL"] + [l_item.get(c, "") for c in RECONCILIATION_COLUMNS]
                heatmap_rows.append(row_vals)
                for c_i in range(len(row_vals)):
                    red_cell_coordinates.append((row_idx, c_i))

        if order_has_mismatch:
            mismatches_count += 1
            discrepancy_details.append({
                "order_id": display_oid,
                "type": "MISMATCH"
            })
        else:
            matches_count += 1

    # Convert flat rows into 2D arrays for Google Sheets / Excel
    legacy_tab_2d = [RECONCILIATION_COLUMNS]
    for r in legacy_flat_rows:
        legacy_tab_2d.append([r.get(col, "") for col in RECONCILIATION_COLUMNS])

    portal_tab_2d = [RECONCILIATION_COLUMNS]
    for r in portal_flat_rows:
        portal_tab_2d.append([r.get(col, "") for col in RECONCILIATION_COLUMNS])

    # Find existing Persistent Master Audit Sheet or create it once
    audit_sheet_id = None
    audit_sheet_url = None
    master_file_name = '1-to-1 World - Master Live System Audit Heatmap'

    try:
        query = f"name = '{master_file_name}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false"
        res = drive_service.files().list(
            q=query,
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
            fields='files(id, name, webViewLink)'
        ).execute()
        files = res.get('files', [])
        if files:
            audit_sheet_id = files[0]['id']
            audit_sheet_url = files[0].get('webViewLink') or f"https://docs.google.com/spreadsheets/d/{audit_sheet_id}/edit"
    except Exception as search_err:
        print(f"Notice searching for master audit sheet: {search_err}")

    if not audit_sheet_id:
        try:
            file_metadata = {
                'name': master_file_name,
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
            try:
                created_file = drive_service.files().create(
                    body={'name': master_file_name, 'mimeType': 'application/vnd.google-apps.spreadsheet'},
                    supportsAllDrives=True,
                    fields='id, webViewLink'
                ).execute()
                audit_sheet_id = created_file.get('id')
                audit_sheet_url = created_file.get('webViewLink') or f"https://docs.google.com/spreadsheets/d/{audit_sheet_id}/edit"
            except Exception as e:
                print(f"Warning: Could not create Google Sheet file: {e}")

    # Share audit sheet with user email
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

    # Populate 3 Tabs In-Place & Apply Red Formatting
    if audit_sheet_id:
        try:
            meta = sheets_service.spreadsheets().get(spreadsheetId=audit_sheet_id).execute()
            existing_sheets = meta.get('sheets', [])
            existing_titles = {s.get('properties', {}).get('title'): s.get('properties', {}).get('sheetId') for s in existing_sheets}

            requests = []
            tab_names = [
                ('🚨 AUDIT & DISCREPANCY HEATMAP', 101),
                ('Current Live System Data', 102),
                ('Portal Cloud SQL Database', 103)
            ]
            for title, sid in tab_names:
                if title not in existing_titles:
                    requests.append({
                        'addSheet': {
                            'properties': {
                                'sheetId': sid,
                                'title': title,
                                'gridProperties': {'frozenRowCount': 1}
                            }
                        }
                    })

            for s in existing_sheets:
                stitle = s.get('properties', {}).get('title')
                sid = s.get('properties', {}).get('sheetId')
                if stitle not in [t[0] for t in tab_names] and len(existing_sheets) + len(requests) > 3:
                    requests.append({'deleteSheet': {'sheetId': sid}})

            if requests:
                try:
                    sheets_service.spreadsheets().batchUpdate(
                        spreadsheetId=audit_sheet_id,
                        body={'requests': requests}
                    ).execute()
                except Exception as b_err:
                    print(f"Sheet structure update note: {b_err}")

            # Clear old content and formatting from the 3 tabs first
            for title, _ in tab_names:
                try:
                    sheets_service.spreadsheets().values().clear(
                        spreadsheetId=audit_sheet_id,
                        range=f"'{title}'!A1:ZZ50000"
                    ).execute()
                except Exception:
                    pass

            # Populate all 3 tabs in parallel batch update
            data_payload = [
                {
                    'range': "'🚨 AUDIT & DISCREPANCY HEATMAP'!A1",
                    'values': heatmap_rows
                },
                {
                    'range': "'Current Live System Data'!A1",
                    'values': legacy_tab_2d
                },
                {
                    'range': "'Portal Cloud SQL Database'!A1",
                    'values': portal_tab_2d
                }
            ]

            sheets_service.spreadsheets().values().batchUpdate(
                spreadsheetId=audit_sheet_id,
                body={'valueInputOption': 'USER_ENTERED', 'data': data_payload}
            ).execute()

            # Apply cell-level red highlight formatting on Tab 1
            cell_format_requests = []
            
            # 1. Reset all data cells (rows 1 to 5000) to white background and normal text
            cell_format_requests.append({
                'repeatCell': {
                    'range': {
                        'sheetId': 101,
                        'startRowIndex': 1,
                        'endRowIndex': 5000,
                        'startColumnIndex': 0,
                        'endColumnIndex': len(heatmap_headers) + 1
                    },
                    'cell': {
                        'userEnteredFormat': {
                            'backgroundColor': {'red': 1.0, 'green': 1.0, 'blue': 1.0},
                            'textFormat': {'bold': False, 'foregroundColor': {'red': 0.1, 'green': 0.1, 'blue': 0.1}}
                        }
                    },
                    'fields': 'userEnteredFormat(backgroundColor,textFormat)'
                }
            })

            # 2. Format header row
            cell_format_requests.append({
                'repeatCell': {
                    'range': {
                        'sheetId': 101,
                        'startRowIndex': 0,
                        'endRowIndex': 1,
                        'startColumnIndex': 0,
                        'endColumnIndex': len(heatmap_headers)
                    },
                    'cell': {
                        'userEnteredFormat': {
                            'backgroundColor': {'red': 0.94, 'green': 0.96, 'blue': 0.98},
                            'textFormat': {'bold': True, 'foregroundColor': {'red': 0.09, 'green': 0.13, 'blue': 0.24}}
                        }
                    },
                    'fields': 'userEnteredFormat(backgroundColor,textFormat)'
                }
            })

            # Highlight specific discrepancy coordinates in red
            for r_idx, c_idx in red_cell_coordinates[:1500]:
                cell_format_requests.append({
                    'repeatCell': {
                        'range': {
                            'sheetId': 101,
                            'startRowIndex': r_idx,
                            'endRowIndex': r_idx + 1,
                            'startColumnIndex': c_idx,
                            'endColumnIndex': c_idx + 1
                        },
                        'cell': {
                            'userEnteredFormat': {
                                'backgroundColor': {'red': 1.0, 'green': 0.88, 'blue': 0.88},
                                'textFormat': {'foregroundColor': {'red': 0.86, 'green': 0.15, 'blue': 0.15}, 'bold': True}
                            }
                        },
                        'fields': 'userEnteredFormat(backgroundColor,textFormat)'
                    }
                })

            if cell_format_requests:
                sheets_service.spreadsheets().batchUpdate(
                    spreadsheetId=audit_sheet_id,
                    body={'requests': cell_format_requests}
                ).execute()

        except Exception as sheet_err:
            print(f"Notice: Google Sheet tab batch update notice: {sheet_err}")

    return {
        "status": "success",
        "spreadsheet_id": audit_sheet_id,
        "spreadsheet_url": audit_sheet_url,
        "stats": {
            "total_orders_audited": len(all_keys),
            "matches_count": matches_count,
            "mismatches_count": mismatches_count,
            "missing_in_portal_count": missing_in_portal_count,
            "new_in_portal_count": new_in_portal_count
        },
        "discrepancies": discrepancy_details,
        "heatmap_rows": heatmap_rows,
        "legacy_rows": legacy_tab_2d,
        "portal_rows": portal_tab_2d,
        "message": f"Successfully completed live comparison! {len(all_keys)} orders analyzed ({matches_count} matching, {mismatches_count} mismatches, {missing_in_portal_count} missing in portal)."
    }
