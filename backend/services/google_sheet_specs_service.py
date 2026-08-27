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

def generate_specs_master_sheet(db: Session, folder_id: str = ROOT_DRIVE_FOLDER_ID) -> dict:
    """
    Creates a new Google Spreadsheet inside Google Drive folder and populates all active SKUs.
    """
    sheets_service, drive_service = get_google_clients()

    # 1. Fetch all products from Cloud SQL
    products = db.query(Product).order_by(Product.sku.asc()).all()
    logger.info(f"Generating specs sheet for {len(products)} products...")

    # 2. Create Spreadsheet inside target Drive folder
    file_metadata = {
        'name': SHEET_TITLE,
        'mimeType': 'application/vnd.google-apps.spreadsheet',
        'parents': [folder_id]
    }
    file = drive_service.files().create(
        body=file_metadata, 
        supportsAllDrives=True, 
        fields='id, webViewLink'
    ).execute()
    
    spreadsheet_id = file.get('id')
    web_view_link = file.get('webViewLink') or f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/edit"

    # 3. Build data rows
    rows = [HEADERS]
    for p in products:
        rows.append([
            p.sku or "",
            p.name or "",
            p.category or "",
            p.family or "",
            p.image_url or "",
            p.technical_image_url or "",
            p.spec_sheet_url or "",
            str(getattr(p, 'wattage', '') or ''),
            str(getattr(p, 'lumens', '') or ''),
            str(getattr(p, 'cct', '') or ''),
            str(getattr(p, 'cri', '') or ''),
            str(getattr(p, 'beam_angle', '') or ''),
            str(getattr(p, 'ip_rating', '') or ''),
            str(getattr(p, 'dimming', '') or ''),
            str(getattr(p, 'cutout', '') or ''),
            str(getattr(p, 'dimensions', '') or ''),
            str(getattr(p, 'finish', '') or ''),
            str(getattr(p, 'material', '') or ''),
            str(getattr(p, 'linked_driver_sku', '') or ''),
            str(getattr(p, 'notes', '') or '')
        ])

    # 4. Insert data in chunks
    CHUNK_SIZE = 1500
    for i in range(0, len(rows), CHUNK_SIZE):
        chunk = rows[i:i + CHUNK_SIZE]
        start_row = i + 1
        end_row = i + len(chunk)
        range_name = f"Sheet1!A{start_row}:T{end_row}"
        
        sheets_service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=range_name,
            valueInputOption='RAW',
            body={'values': chunk}
        ).execute()

    # 5. Format Header (Freeze row 1, dark navy styling, auto-size)
    format_requests = [
        {
            "updateSheetProperties": {
                "properties": {
                    "sheetId": 0,
                    "gridProperties": {
                        "frozenRowCount": 1
                    }
                },
                "fields": "gridProperties.frozenRowCount"
            }
        },
        {
            "repeatCell": {
                "range": {
                    "sheetId": 0,
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
                    "sheetId": 0,
                    "dimension": "COLUMNS",
                    "startIndex": 0,
                    "endIndex": 20
                }
            }
        }
    ]

    try:
        sheets_service.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id,
            body={'requests': format_requests}
        ).execute()
    except Exception as fmt_err:
        logger.warning(f"Non-critical formatting notice: {fmt_err}")

    # 6. Save in portal_settings
    setting = db.query(PortalSetting).filter(PortalSetting.key == "google_sheet_product_specs").first()
    setting_val = {
        "spreadsheet_id": spreadsheet_id,
        "spreadsheet_url": web_view_link,
        "total_skus": len(products),
        "created_at": datetime.utcnow().isoformat(),
        "last_synced_at": datetime.utcnow().isoformat()
    }
    if setting:
        setting.value = setting_val
    else:
        setting = PortalSetting(key="google_sheet_product_specs", value=setting_val)
        db.add(setting)
    db.commit()

    return {
        "status": "success",
        "message": f"Successfully generated Master Product Specifications Google Sheet with {len(products)} SKUs!",
        "spreadsheet_id": spreadsheet_id,
        "spreadsheet_url": web_view_link,
        "total_skus": len(products)
    }

def sync_specs_from_sheet(db: Session, spreadsheet_id: str = None) -> dict:
    """
    Pulls specification & image data from the Google Sheet and updates Cloud SQL products matching by SKU.
    """
    if not spreadsheet_id:
        setting = db.query(PortalSetting).filter(PortalSetting.key == "google_sheet_product_specs").first()
        if setting and setting.value and isinstance(setting.value, dict):
            spreadsheet_id = setting.value.get("spreadsheet_id")

    if not spreadsheet_id:
        raise ValueError("Google Sheet ID is not configured. Please generate or link the Master Specifications Google Sheet first.")

    clean_id = extract_spreadsheet_id(spreadsheet_id)
    sheets_service, _ = get_google_clients()

    # Read Sheet1!A1:T
    res = sheets_service.spreadsheets().values().get(
        spreadsheetId=clean_id,
        range="Sheet1!A2:T"
    ).execute()
    
    rows = res.get('values', [])
    if not rows:
        return {"status": "success", "message": "Google Sheet is empty (no data rows).", "updated_count": 0}

    updated_count = 0
    now = datetime.utcnow()

    for r in rows:
        if not r or not r[0]:
            continue
        sku = str(r[0]).strip()
        if not sku:
            continue

        # Extract values
        photo_url = str(r[4]).strip() if len(r) > 4 and r[4] else None
        tech_image_url = str(r[5]).strip() if len(r) > 5 and r[5] else None
        spec_pdf_url = str(r[6]).strip() if len(r) > 6 and r[6] else None
        wattage = str(r[7]).strip() if len(r) > 7 and r[7] else None
        lumens = str(r[8]).strip() if len(r) > 8 and r[8] else None
        cct = str(r[9]).strip() if len(r) > 9 and r[9] else None
        cri = str(r[10]).strip() if len(r) > 10 and r[10] else None
        beam_angle = str(r[11]).strip() if len(r) > 11 and r[11] else None
        ip_rating = str(r[12]).strip() if len(r) > 12 and r[12] else None
        dimming = str(r[13]).strip() if len(r) > 13 and r[13] else None
        cutout = str(r[14]).strip() if len(r) > 14 and r[14] else None
        dimensions = str(r[15]).strip() if len(r) > 15 and r[15] else None
        finish = str(r[16]).strip() if len(r) > 16 and r[16] else None
        material = str(r[17]).strip() if len(r) > 17 and r[17] else None
        linked_driver = str(r[18]).strip() if len(r) > 18 and r[18] else None

        prod = db.query(Product).filter(Product.sku == sku).first()
        if prod:
            if photo_url is not None: prod.image_url = photo_url
            if tech_image_url is not None: prod.technical_image_url = tech_image_url
            if spec_pdf_url is not None: prod.spec_sheet_url = spec_pdf_url
            if wattage is not None and hasattr(prod, 'wattage'): prod.wattage = wattage
            if lumens is not None and hasattr(prod, 'lumens'): prod.lumens = lumens
            if cct is not None and hasattr(prod, 'cct'): prod.cct = cct
            if cri is not None and hasattr(prod, 'cri'): prod.cri = cri
            if beam_angle is not None and hasattr(prod, 'beam_angle'): prod.beam_angle = beam_angle
            if ip_rating is not None and hasattr(prod, 'ip_rating'): prod.ip_rating = ip_rating
            if dimming is not None and hasattr(prod, 'dimming'): prod.dimming = dimming
            if cutout is not None and hasattr(prod, 'cutout'): prod.cutout = cutout
            if dimensions is not None and hasattr(prod, 'dimensions'): prod.dimensions = dimensions
            if finish is not None and hasattr(prod, 'finish'): prod.finish = finish
            if material is not None and hasattr(prod, 'material'): prod.material = material
            if linked_driver is not None and hasattr(prod, 'linked_driver_sku'): prod.linked_driver_sku = linked_driver
            
            updated_count += 1

    # Update last sync timestamp in settings
    setting = db.query(PortalSetting).filter(PortalSetting.key == "google_sheet_product_specs").first()
    if setting and setting.value and isinstance(setting.value, dict):
        setting.value = {
            **setting.value,
            "last_synced_at": now.isoformat(),
            "last_synced_count": updated_count
        }
    db.commit()

    return {
        "status": "success",
        "message": f"Successfully synchronized specifications and images for {updated_count} products from Google Sheets!",
        "updated_count": updated_count,
        "synced_at": now.isoformat()
    }
