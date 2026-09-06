import logging
import re
import google.auth
from googleapiclient.discovery import build
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
from typing import Any, Optional

from models.orm_models import Product, PortalSetting, ProductAccessory

logger = logging.getLogger(__name__)

ROOT_DRIVE_FOLDER_ID = "0AFF94SUUC_EQUk9PVA"
SHEET_TITLE = "One to One - Product Specifications Master"
DEFAULT_SPECS_SPREADSHEET_ID = "15A8TQ-BAXITQy7-BWfg6O8zeg71K3_lRITuWxIDYMYU"

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
    "FOH Codes",
    "Family",
    "Product Photo URL",
    "Technical Drawing URL",
    "Spec Sheet PDF URL",
    "Consignment",
    "Redlist",
    "First Fix",
    "Brand",
    "Local / Import",
    "Finish / Color",
    "Dimmable",
    "Dimming Protocol",
    "Driver Incl.",
    "Light Source Incl.",
    "Light Source Type",
    "Color Temp (CCT)",
    "Beam Angle",
    "CRI",
    "IP Rating",
    "Wattage (W)",
    "Lighting Type",
    "Cutout (mm)",
    "Client Description",
    "1-to-1 Code",
    "Wetworks",
    "Selection",
    "Linked Accessories / Drivers"
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

def parse_field(val: Any) -> Optional[str]:
    """Helper to parse sheet cell value. Treats NOT FOUND, None, null, empty strings as None."""
    if val is None:
        return None
    s = str(val).strip()
    if not s or s in ("NOT FOUND", "None", "null", "undefined", "—", "-"):
        return None
    return s

def product_to_row(p: Product) -> list:
    """Serializes a Product ORM instance to a 31-column sheet row matching HEADERS."""
    linked_acc_str = ""
    if hasattr(p, 'accessories') and p.accessories:
        acc_skus = [acc.accessory_product.sku for acc in p.accessories if acc.accessory_product and acc.accessory_product.sku]
        linked_acc_str = ", ".join(acc_skus)

    return [
        p.sku or "",
        p.name or "",
        p.category or "",
        p.foh_code_description or "",
        p.family or "",
        p.image_url or "",
        p.technical_image_url or "",
        p.qr_link or "",
        p.consignment or "",
        p.red_list or "",
        p.first_fix or "",
        p.brand or "",
        p.local_or_import or "",
        p.color or "",
        p.dimmable or "",
        p.dimming_protocol or "",
        p.driver_incl or "",
        p.light_source_incl or "",
        p.light_source_type or "",
        p.kelvin or "",
        p.beam_angle or "",
        p.cri or "",
        p.ip_rating or "",
        str(p.system_power) if (p.system_power is not None and p.system_power > 0) else "",
        p.lighting_type or "",
        p.cutout or "",
        p.client_description or "",
        p.one_to_one_code or "",
        getattr(p, 'wetworks', '') or "",
        p.selection or "",
        linked_acc_str
    ]

def ensure_workbook_tabs(sheets_service, spreadsheet_id: str) -> dict:
    """
    Ensures 'ITEM DATABASE' and 'NEW ITEMS' tabs exist with proper 30-column headers and formatting.
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
        sheets_service.spreadsheets().batchUpdate(
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
                range=f"'{TAB_INBOX}'!A1:AE1",
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

    # 3. Automatically add Column AE (Column 31: "Linked Accessories / Drivers") if missing
    for tab_name in [TAB_MASTER, TAB_INBOX]:
        if tab_name in sheet_map:
            try:
                hdr_res = sheets_service.spreadsheets().values().get(
                    spreadsheetId=spreadsheet_id,
                    range=f"'{tab_name}'!AE1"
                ).execute()
                ae_val = hdr_res.get('values', [])
                if not ae_val or not ae_val[0] or not ae_val[0][0]:
                    # Update AE1 with header
                    sheets_service.spreadsheets().values().update(
                        spreadsheetId=spreadsheet_id,
                        range=f"'{tab_name}'!AE1",
                        valueInputOption='RAW',
                        body={'values': [["Linked Accessories / Drivers"]]}
                    ).execute()
                    
                    # Style AE1 with navy background & bold white text
                    t_id = sheet_map[tab_name]
                    sheets_service.spreadsheets().batchUpdate(
                        spreadsheetId=spreadsheet_id,
                        body={'requests': [{
                            "repeatCell": {
                                "range": {
                                    "sheetId": t_id,
                                    "startRowIndex": 0,
                                    "endRowIndex": 1,
                                    "startColumnIndex": 30,
                                    "endColumnIndex": 31
                                },
                                "cell": {
                                    "userEnteredFormat": {
                                        "backgroundColor": {"red": 0.117, "green": 0.160, "blue": 0.231},
                                        "textFormat": {"foregroundColor": {"red": 1.0, "green": 1.0, "blue": 1.0}, "fontSize": 10, "bold": True},
                                        "horizontalAlignment": "LEFT"
                                    }
                                },
                                "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
                            }
                        }]}
                    ).execute()
            except Exception as ae_err:
                logger.warning(f"Notice: Could not auto-add Column AE to tab '{tab_name}': {ae_err}")

    return sheet_map

def generate_specs_master_sheet(db: Session, spreadsheet_id: str = None) -> dict:
    """
    Creates or populates the Google Sheet with all products from Cloud SQL using the 30-column format.
    """
    if not spreadsheet_id:
        setting = db.query(PortalSetting).filter(PortalSetting.key == "google_sheet_product_specs").first()
        if setting and setting.value and isinstance(setting.value, dict):
            spreadsheet_id = setting.value.get("spreadsheet_id")

    clean_id = extract_spreadsheet_id(spreadsheet_id) if spreadsheet_id else ""
    sheets_service, drive_service = get_google_clients()

    if not clean_id:
        # Create a new spreadsheet in Drive
        file_meta = {
            'name': SHEET_TITLE,
            'mimeType': 'application/vnd.google-apps.spreadsheet',
            'parents': [ROOT_DRIVE_FOLDER_ID]
        }
        created = drive_service.files().create(
            body=file_meta,
            supportsAllDrives=True,
            fields='id, webViewLink'
        ).execute()
        clean_id = created.get('id')
        spreadsheet_url = created.get('webViewLink') or f"https://docs.google.com/spreadsheets/d/{clean_id}/edit"
    else:
        spreadsheet_url = f"https://docs.google.com/spreadsheets/d/{clean_id}/edit"

    sheet_map = ensure_workbook_tabs(sheets_service, clean_id)
    target_tab = TAB_MASTER if TAB_MASTER in sheet_map else "Sheet1"

    # Fetch all products from Cloud SQL
    all_products = db.query(Product).order_by(Product.sku.asc()).all()
    rows = [HEADERS] + [product_to_row(p) for p in all_products if p.sku]

    # Write data to ITEM DATABASE
    sheets_service.spreadsheets().values().update(
        spreadsheetId=clean_id,
        range=f"'{target_tab}'!A1:AE",
        valueInputOption='RAW',
        body={'values': rows}
    ).execute()

    # Format master tab header
    master_sheet_id = sheet_map.get(target_tab, 0)
    fmt_requests = [
        {
            "repeatCell": {
                "range": {
                    "sheetId": master_sheet_id,
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
        }
    ]
    try:
        sheets_service.spreadsheets().batchUpdate(
            spreadsheetId=clean_id,
            body={'requests': fmt_requests}
        ).execute()
    except Exception as err:
        logger.warning(f"Formatting notice: {err}")

    now = datetime.utcnow()
    setting = db.query(PortalSetting).filter(PortalSetting.key == "google_sheet_product_specs").first()
    if not setting:
        setting = PortalSetting(key="google_sheet_product_specs", value={})
        db.add(setting)

    setting.value = {
        "spreadsheet_id": clean_id,
        "spreadsheet_url": spreadsheet_url,
        "total_skus": len(all_products),
        "created_at": now.isoformat(),
        "last_synced_at": now.isoformat(),
        "last_synced_count": len(all_products),
        "synced_tab": target_tab
    }
    db.commit()

    return {
        "status": "success",
        "message": f"Successfully generated Master Specifications Sheet with {len(all_products)} products.",
        "spreadsheet_id": clean_id,
        "spreadsheet_url": spreadsheet_url,
        "total_skus": len(all_products),
        "synced_at": now.isoformat()
    }

def sync_specs_from_sheet(db: Session, spreadsheet_id: str = None) -> dict:
    """
    Pulls specification & image data STRICTLY from the 'ITEM DATABASE' tab (30 columns).
    If fields in the sheet are blank or NOT FOUND, valid non-empty updates are applied cleanly.
    """
    if not spreadsheet_id:
        setting = db.query(PortalSetting).filter(PortalSetting.key == "google_sheet_product_specs").first()
        if setting and setting.value and isinstance(setting.value, dict):
            spreadsheet_id = setting.value.get("spreadsheet_id")

    if not spreadsheet_id:
        spreadsheet_id = DEFAULT_SPECS_SPREADSHEET_ID

    clean_id = extract_spreadsheet_id(spreadsheet_id)
    sheets_service, _ = get_google_clients()

    # Ensure tabs exist and are cleanly named
    sheet_map = ensure_workbook_tabs(sheets_service, clean_id)
    target_tab = TAB_MASTER if TAB_MASTER in sheet_map else "Sheet1"

    # Read strictly from the curated Master tab (columns A through AE)
    res = sheets_service.spreadsheets().values().get(
        spreadsheetId=clean_id,
        range=f"'{target_tab}'!A2:AE"
    ).execute()
    
    rows = res.get('values', [])
    if not rows:
        return {"status": "success", "message": f"Tab '{target_tab}' is empty (no data rows).", "updated_count": 0}

    # 1. Fetch all products into an in-memory dictionary for O(1) instant lookup
    all_products = {p.sku.strip().upper(): p for p in db.query(Product).all() if p.sku}
    logger.info(f"Loaded {len(all_products)} products into memory for instant sheet sync.")

    updated_count = 0
    now = datetime.utcnow()

    for r in rows:
        if not r or not r[0]:
            continue
        sku = str(r[0]).strip()
        if not sku:
            continue

        prod = all_products.get(sku.upper())
        if not prod:
            continue

        # Extract values according to the 31-column specification
        name_desc = parse_field(r[1]) if len(r) > 1 else None
        category = parse_field(r[2]) if len(r) > 2 else None
        foh_codes = parse_field(r[3]) if len(r) > 3 else None
        family = parse_field(r[4]) if len(r) > 4 else None
        photo_url = parse_field(r[5]) if len(r) > 5 else None
        tech_image_url = parse_field(r[6]) if len(r) > 6 else None
        spec_pdf_url = parse_field(r[7]) if len(r) > 7 else None
        consignment = parse_field(r[8]) if len(r) > 8 else None
        redlist = parse_field(r[9]) if len(r) > 9 else None
        first_fix = parse_field(r[10]) if len(r) > 10 else None
        brand = parse_field(r[11]) if len(r) > 11 else None
        local_import = parse_field(r[12]) if len(r) > 12 else None
        color = parse_field(r[13]) if len(r) > 13 else None
        dimmable = parse_field(r[14]) if len(r) > 14 else None
        dimming_protocol = parse_field(r[15]) if len(r) > 15 else None
        driver_incl = parse_field(r[16]) if len(r) > 16 else None
        light_source_incl = parse_field(r[17]) if len(r) > 17 else None
        light_source_type = parse_field(r[18]) if len(r) > 18 else None
        kelvin = parse_field(r[19]) if len(r) > 19 else None
        beam_angle = parse_field(r[20]) if len(r) > 20 else None
        cri = parse_field(r[21]) if len(r) > 21 else None
        ip_rating = parse_field(r[22]) if len(r) > 22 else None
        wattage_str = parse_field(r[23]) if len(r) > 23 else None
        lighting_type = parse_field(r[24]) if len(r) > 24 else None
        cutout = parse_field(r[25]) if len(r) > 25 else None
        client_desc = parse_field(r[26]) if len(r) > 26 else None
        one_to_one_code = parse_field(r[27]) if len(r) > 27 else None
        wetworks = parse_field(r[28]) if len(r) > 28 else None
        selection = parse_field(r[29]) if len(r) > 29 else None
        linked_acc_str = parse_field(r[30]) if len(r) > 30 else None

        # Apply updates to product ORM model (Palladium ERP is master for name/description)
        if name_desc is not None and not prod.name: prod.name = name_desc
        if category is not None: prod.category = category
        if foh_codes is not None: prod.foh_code_description = foh_codes
        if family is not None: prod.family = family
        if photo_url is not None: prod.image_url = photo_url
        if tech_image_url is not None: prod.technical_image_url = tech_image_url
        if spec_pdf_url is not None: prod.qr_link = spec_pdf_url
        if consignment is not None: prod.consignment = consignment
        if redlist is not None: prod.red_list = redlist
        if first_fix is not None: prod.first_fix = first_fix
        if brand is not None: prod.brand = brand
        if local_import is not None: prod.local_or_import = local_import
        if color is not None: prod.color = color
        if dimmable is not None: prod.dimmable = dimmable
        if dimming_protocol is not None: prod.dimming_protocol = dimming_protocol
        if driver_incl is not None: prod.driver_incl = driver_incl
        if light_source_incl is not None: prod.light_source_incl = light_source_incl
        if light_source_type is not None: prod.light_source_type = light_source_type
        if kelvin is not None: prod.kelvin = kelvin
        if beam_angle is not None: prod.beam_angle = beam_angle
        if cri is not None: prod.cri = cri
        if ip_rating is not None: prod.ip_rating = ip_rating
        if wattage_str is not None:
            clean_w = re.sub(r"[^\d.-]", "", wattage_str)
            try:
                prod.system_power = float(clean_w) if clean_w else 0.0
            except:
                prod.system_power = 0.0
        if lighting_type is not None: prod.lighting_type = lighting_type
        if cutout is not None: prod.cutout = cutout
        if client_desc is not None: prod.client_description = client_desc
        if one_to_one_code is not None: prod.one_to_one_code = one_to_one_code
        if wetworks is not None: prod.wetworks = wetworks
        if selection is not None: prod.selection = selection

        # Synchronize Linked Drivers & Accessories from Column AE
        if linked_acc_str is not None:
            raw_skus = [s.strip() for s in re.split(r'[,;\n]', linked_acc_str) if s.strip()]
            target_accessory_links = []
            for raw_s in raw_skus:
                clean_sku = re.sub(r'^(Driver|Bezel|Mounting Kit|Accessory|Trim):\s*', '', raw_s, flags=re.IGNORECASE).strip()
                matched_acc = all_products.get(clean_sku.upper())
                if matched_acc and matched_acc.id != prod.id:
                    name_cat = f"{matched_acc.category or ''} {matched_acc.name or ''}".lower()
                    if any(k in name_cat for k in ['driver', 'power supply', 'gear', 'ballast']):
                        rel_type = "Required Driver"
                    elif any(k in name_cat for k in ['bezel', 'trim', 'frame']):
                        rel_type = "Optional Bezel / Trim"
                    elif any(k in name_cat for k in ['mount', 'plaster', 'box', 'kit', 'ring']):
                        rel_type = "Mounting Kit / Plaster Ring"
                    elif any(k in name_cat for k in ['emerg']):
                        rel_type = "Emergency Battery Pack"
                    else:
                        rel_type = "Compatible Accessory"
                    target_accessory_links.append((matched_acc.id, rel_type))

            # Query existing links for this parent product
            existing_links = db.query(ProductAccessory).filter(ProductAccessory.parent_product_id == prod.id).all()
            existing_acc_map = {a.accessory_product_id: a for a in existing_links}
            target_ids_set = {tid for tid, _ in target_accessory_links}

            # Unlink accessories that were removed from the cell
            for acc_id, link_obj in existing_acc_map.items():
                if acc_id not in target_ids_set:
                    db.delete(link_obj)

            # Insert new or update relationship type
            for acc_id, rel_type in target_accessory_links:
                if acc_id in existing_acc_map:
                    existing_acc_map[acc_id].relationship_type = rel_type
                else:
                    new_link = ProductAccessory(
                        parent_product_id=prod.id,
                        accessory_product_id=acc_id,
                        relationship_type=rel_type
                    )
                    db.add(new_link)

        updated_count += 1

    # Update last sync timestamp in settings
    setting = db.query(PortalSetting).filter(PortalSetting.key == "google_sheet_product_specs").first()
    if not setting:
        setting = PortalSetting(key="google_sheet_product_specs", value={})
        db.add(setting)
    
    prev_val = setting.value if (setting.value and isinstance(setting.value, dict)) else {}
    setting.value = {
        **prev_val,
        "spreadsheet_id": clean_id,
        "spreadsheet_url": f"https://docs.google.com/spreadsheets/d/{clean_id}/edit",
        "last_synced_at": now.isoformat(),
        "last_synced_count": updated_count,
        "synced_tab": target_tab
    }
    db.commit()

    return {
        "status": "success",
        "message": f"Successfully synchronized 30-column specifications strictly from '{target_tab}' for {updated_count} products.",
        "updated_count": updated_count,
        "tab_read": target_tab,
        "synced_at": now.isoformat()
    }

def sync_new_items_to_inbox(db: Session, spreadsheet_id: str = None) -> dict:
    """
    Finds all active SKUs in the database/Palladium that do NOT exist in 'ITEM DATABASE'
    or 'NEW ITEMS', and appends them cleanly to the 'NEW ITEMS' tab inbox with 30 columns.
    """
    if not spreadsheet_id:
        setting = db.query(PortalSetting).filter(PortalSetting.key == "google_sheet_product_specs").first()
        if setting and setting.value and isinstance(setting.value, dict):
            spreadsheet_id = setting.value.get("spreadsheet_id")

    if not spreadsheet_id:
        spreadsheet_id = DEFAULT_SPECS_SPREADSHEET_ID

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
            new_rows_to_append.append(product_to_row(p))
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
        range=f"'{TAB_INBOX}'!A:AE",
        valueInputOption='RAW',
        insertDataOption='INSERT_ROWS',
        body={'values': new_rows_to_append}
    ).execute()

    return {
        "status": "success",
        "message": f"Successfully routed {len(new_rows_to_append)} new products to the '{TAB_INBOX}' staging tab!",
        "new_items_added": len(new_rows_to_append)
    }
