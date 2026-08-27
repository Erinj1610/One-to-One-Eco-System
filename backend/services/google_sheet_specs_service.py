import logging
import re
import google.auth
from googleapiclient.discovery import build
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime

from models.orm_models import Product, PortalSetting

logger = logging.getLogger(__name__)

ROOT_DRIVE_FOLDER_ID = "0AFF94SUUC_EQUk9PVA"
SHEET_TITLE = "One to One - Product Specifications Master"

TAB_MASTER = "ITEM DATABASE"
TAB_INBOX = "NEW ITEMS"

SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
]

HEADERS = [
    "SKU",
    "Product Name / Description",
    "Category",
    "Family / Brand",
    "Product Photo URL",
    "Technical Drawing URL",
    "Spec Sheet PDF URL",
    "Wattage (W)",
    "Lumens (lm)",
    "Color Temp (CCT)",
    "CRI",
    "Beam Angle",
    "IP Rating",
    "Dimming Protocol",
    "Cutout (mm)",
    "Dimensions (mm)",
    "Finish / Color",
    "Material",
    "Linked Driver SKU",
    "Notes / Features"
]

def get_google_clients():
    creds, _ = google.auth.default(scopes=SCOPES)
    sheets_service = build('sheets', 'v4', credentials=creds)
    drive_service = build('drive', 'v3', credentials=creds)
    return sheets_service, drive_service

def extract_spreadsheet_id(url_or_id: str) -> str:
    if not url_or_id:
        return ""
    match = re.search(r"/d/([a-zA-Z0-9-_]+)", url_or_id)
    if match:
        return match.group(1)
    return url_or_id.strip()

def ensure_workbook_tabs(sheets_service, spreadsheet_id: str) -> dict:
    """
    Ensures 'ITEM DATABASE' and 'NEW ITEMS' tabs exist with proper headers and formatting.
    """
    ss = sheets_service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    existing_sheets = ss.get('sheets', [])
    sheet_map = {s['properties']['title']: s['properties']['sheetId'] for s in existing_sheets}
    
    requests = []

    # 1. Rename 'Sheet1' to 'ITEM DATABASE' if present
    if "Sheet1" in sheet_map and TAB_MASTER not in sheet_map:
        sheet1_id = sheet_map["Sheet1"]
        requests.append({
            "updateSheetProperties": {
                "properties": {
                    "sheetId": sheet1_id,
                    "title": TAB_MASTER
                },
                "fields": "title"
            }
        })
        sheet_map[TAB_MASTER] = sheet1_id
        del sheet_map["Sheet1"]

    # 2. Create 'NEW ITEMS' tab if not present
    if TAB_INBOX not in sheet_map:
        requests.append({
            "addSheet": {
                "properties": {
                    "title": TAB_INBOX,
                    "gridProperties": {
                        "rowCount": 500,
                        "columnCount": len(HEADERS),
                        "frozenRowCount": 1
                    }
                }
            }
        })

    if requests:
        res = sheets_service.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id,
            body={'requests': requests}
        ).execute()
        
        # Refresh sheet map after additions
        ss = sheets_service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        sheet_map = {s['properties']['title']: s['properties']['sheetId'] for s in ss.get('sheets', [])}

        # Initialize 'NEW ITEMS' header row & styling if it was just added
        inbox_sheet_id = sheet_map.get(TAB_INBOX)
        if inbox_sheet_id is not None:
            # Write Header
            sheets_service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"'{TAB_INBOX}'!A1:T1",
                valueInputOption='RAW',
                body={'values': [HEADERS]}
            ).execute()

            # Format Header (navy color, bold text)
            fmt_requests = [
                {
                    "repeatCell": {
                        "range": {
                            "sheetId": inbox_sheet_id,
                            "startRowIndex": 0,
                            "endRowIndex": 1
                        },
                        "cell": {
                            "userEnteredFormat": {
                                "backgroundColor": {
                                    "red": 0.117,
                                    "green": 0.160,
                                    "blue": 0.231
                                },
                                "textFormat": {
                                    "foregroundColor": {
                                        "red": 1.0,
                                        "green": 1.0,
                                        "blue": 1.0
                                    },
                                    "fontSize": 10,
                                    "bold": True
                                },
                                "horizontalAlignment": "LEFT"
                            }
                        },
                        "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
                    }
                },
                {
                    "autoResizeDimensions": {
                        "dimensions": {
                            "sheetId": inbox_sheet_id,
                            "dimension": "COLUMNS",
                            "startIndex": 0,
                            "endIndex": len(HEADERS)
                        }
                    }
                }
            ]
            try:
                sheets_service.spreadsheets().batchUpdate(
                    spreadsheetId=spreadsheet_id,
                    body={'requests': fmt_requests}
                ).execute()
            except Exception as fmt_err:
                logger.warning(f"Formatting notice on inbox sheet: {fmt_err}")

    return sheet_map

def sync_specs_from_sheet(db: Session, spreadsheet_id: str = None) -> dict:
    """
    Pulls specification & image data STRICTLY from the 'ITEM DATABASE' tab.
    If fields in the sheet are blank, the database values will be set to blank/None.
    """
    if not spreadsheet_id:
        setting = db.query(PortalSetting).filter(PortalSetting.key == "google_sheet_product_specs").first()
        if setting and setting.value and isinstance(setting.value, dict):
            spreadsheet_id = setting.value.get("spreadsheet_id")

    if not spreadsheet_id:
        raise ValueError("Google Sheet ID is not configured. Please generate or link the Master Specifications Google Sheet first.")

    clean_id = extract_spreadsheet_id(spreadsheet_id)
    sheets_service, _ = get_google_clients()

    # Ensure tabs exist and are cleanly named
    sheet_map = ensure_workbook_tabs(sheets_service, clean_id)
    target_tab = TAB_MASTER if TAB_MASTER in sheet_map else "Sheet1"

    # Read strictly from the curated Master tab
    res = sheets_service.spreadsheets().values().get(
        spreadsheetId=clean_id,
        range=f"'{target_tab}'!A2:T"
    ).execute()
    
    rows = res.get('values', [])
    if not rows:
        return {"status": "success", "message": f"Tab '{target_tab}' is empty (no data rows).", "updated_count": 0}

    # 1. Fetch all products into an in-memory dictionary for O(1) instant lookup
    all_products = {p.sku.strip().upper(): p for p in db.query(Product).all() if p.sku}
    logger.info(f"Loaded {len(all_products)} products into memory for instant sheet sync.")

    for r in rows:
        if not r or not r[0]:
            continue
        sku = str(r[0]).strip()
        if not sku:
            continue

        prod = all_products.get(sku.upper())
        if not prod:
            continue

        # Extract values — if cell is missing/blank, value is None
        name_desc = str(r[1]).strip() if len(r) > 1 and r[1] and str(r[1]).strip() else None
        category = str(r[2]).strip() if len(r) > 2 and r[2] and str(r[2]).strip() else None
        family_brand = str(r[3]).strip() if len(r) > 3 and r[3] and str(r[3]).strip() else None
        photo_url = str(r[4]).strip() if len(r) > 4 and r[4] and str(r[4]).strip() else None
        tech_image_url = str(r[5]).strip() if len(r) > 5 and r[5] and str(r[5]).strip() else None
        wattage_str = str(r[7]).strip() if len(r) > 7 and r[7] and str(r[7]).strip() else None
        cct = str(r[9]).strip() if len(r) > 9 and r[9] and str(r[9]).strip() else None
        cri = str(r[10]).strip() if len(r) > 10 and r[10] and str(r[10]).strip() else None
        beam_angle = str(r[11]).strip() if len(r) > 11 and r[11] and str(r[11]).strip() else None
        ip_rating = str(r[12]).strip() if len(r) > 12 and r[12] and str(r[12]).strip() else None
        dimming = str(r[13]).strip() if len(r) > 13 and r[13] and str(r[13]).strip() else None
        cutout = str(r[14]).strip() if len(r) > 14 and r[14] and str(r[14]).strip() else None
        finish = str(r[16]).strip() if len(r) > 16 and r[16] and str(r[16]).strip() else None
        driver_spec = str(r[18]).strip() if len(r) > 18 and r[18] and str(r[18]).strip() else None

        prod.image_url = photo_url
        prod.technical_image_url = tech_image_url
        
        if category: prod.category = category
        if family_brand: 
            prod.family = family_brand
            prod.brand = family_brand
        
        if wattage_str:
            try:
                clean_w = re.sub(r"[^\d.-]", "", wattage_str)
                prod.system_power = float(clean_w) if clean_w else 0.0
            except:
                prod.system_power = 0.0
        else:
            prod.system_power = 0.0

        prod.kelvin = cct
        prod.cri = cri
        prod.beam_angle = beam_angle
        prod.ip_rating = ip_rating
        prod.dimming_protocol = dimming
        prod.cutout = cutout
        prod.color = finish
        prod.driver_spec = driver_spec
        
        updated_count += 1

    # Update last sync timestamp in settings
    setting = db.query(PortalSetting).filter(PortalSetting.key == "google_sheet_product_specs").first()
    if setting and setting.value and isinstance(setting.value, dict):
        setting.value = {
            **setting.value,
            "last_synced_at": now.isoformat(),
            "last_synced_count": updated_count,
            "synced_tab": target_tab
        }
    db.commit()

    return {
        "status": "success",
        "message": f"Successfully synchronized specifications strictly from '{target_tab}' for {updated_count} products. Blank fields set to blank.",
        "updated_count": updated_count,
        "tab_read": target_tab,
        "synced_at": now.isoformat()
    }

def sync_new_items_to_inbox(db: Session, spreadsheet_id: str = None) -> dict:
    """
    Finds all active SKUs in the database/Palladium that do NOT exist in 'ITEM DATABASE'
    or 'NEW ITEMS', and appends them cleanly to the 'NEW ITEMS' tab inbox.
    """
    if not spreadsheet_id:
        setting = db.query(PortalSetting).filter(PortalSetting.key == "google_sheet_product_specs").first()
        if setting and setting.value and isinstance(setting.value, dict):
            spreadsheet_id = setting.value.get("spreadsheet_id")

    if not spreadsheet_id:
        return {"status": "error", "message": "Google Sheet ID not configured"}

    clean_id = extract_spreadsheet_id(spreadsheet_id)
    sheets_service, _ = get_google_clients()

    # 1. Ensure tabs exist
    sheet_map = ensure_workbook_tabs(sheets_service, clean_id)
    master_tab = TAB_MASTER if TAB_MASTER in sheet_map else "Sheet1"

    # 2. Read existing SKUs from ITEM DATABASE
    existing_skus = set()
    try:
        res_m = sheets_service.spreadsheets().values().get(
            spreadsheetId=clean_id,
            range=f"'{master_tab}'!A2:A"
        ).execute()
        for row in res_m.get('values', []):
            if row and row[0]:
                existing_skus.add(str(row[0]).strip().upper())
    except Exception as e:
        logger.warning(f"Could not read master tab SKUs: {e}")

    # 3. Read existing SKUs from NEW ITEMS inbox
    try:
        res_i = sheets_service.spreadsheets().values().get(
            spreadsheetId=clean_id,
            range=f"'{TAB_INBOX}'!A2:A"
        ).execute()
        for row in res_i.get('values', []):
            if row and row[0]:
                existing_skus.add(str(row[0]).strip().upper())
    except Exception as e:
        logger.warning(f"Could not read inbox tab SKUs: {e}")

    # 4. Find products in Database not in either tab
    db_products = db.query(Product).order_by(Product.sku.asc()).all()
    new_rows_to_append = []
    
    for p in db_products:
        if not p.sku:
            continue
        clean_sku = str(p.sku).strip().upper()
        if clean_sku not in existing_skus:
            new_rows_to_append.append([
                p.sku or "",
                p.name or "",
                p.category or "",
                p.family or "",
                "", # Photo URL
                "", # Technical Drawing URL
                "", # Spec Sheet PDF URL
                "", # Wattage
                "", # Lumens
                "", # CCT
                "", # CRI
                "", # Beam Angle
                "", # IP Rating
                "", # Dimming
                "", # Cutout
                "", # Dimensions
                "", # Finish
                "", # Material
                "", # Linked Driver
                ""  # Notes
            ])
            existing_skus.add(clean_sku)

    if not new_rows_to_append:
        return {
            "status": "success",
            "message": "All database/Palladium products are already present in ITEM DATABASE or NEW ITEMS. No new items found.",
            "new_items_added": 0
        }

    # 5. Append new items to 'NEW ITEMS' tab
    sheets_service.spreadsheets().values().append(
        spreadsheetId=clean_id,
        range=f"'{TAB_INBOX}'!A:T",
        valueInputOption='RAW',
        insertDataOption='INSERT_ROWS',
        body={'values': new_rows_to_append}
    ).execute()

    return {
        "status": "success",
        "message": f"Successfully routed {len(new_rows_to_append)} new products to the '{TAB_INBOX}' staging tab!",
        "new_items_added": len(new_rows_to_append)
    }
