import sys
import os
import time
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

import pymssql
from sqlalchemy.orm import Session
from sqlalchemy import text

from database.cloud_sql import SessionLocal, get_db
from models.orm_models import Product, PalladiumPOLine, PalladiumGRNLine, PalladiumInvoiceLine

logger = logging.getLogger(__name__)

PALLADIUM_CONFIG = {
    "server": os.getenv("PALLADIUM_SERVER", "palladiumacc-db03.kerridgecs.online"),
    "port": int(os.getenv("PALLADIUM_PORT", "61025")),
    "user": os.getenv("PALLADIUM_USER", "OnetoOne"),
    "password": os.getenv("PALLADIUM_PASSWORD", "onetoone_20260223_!@#"),
    "database": os.getenv("PALLADIUM_DATABASE", "paldbOnetoOneLive")
}

def sync_palladium_to_cloud_sql(db_session: Optional[Session] = None) -> Dict[str, Any]:
    """
    Executes a 100% read-only synchronization from Palladium ERP (MS SQL Server)
    into the Portal's Google Cloud SQL Database (PostgreSQL).
    
    1. Reads tblInv (Items), tblInvPrice (Regular Selling Prices), and tblInvExt (Stock per Location).
    2. Reconciles and upserts into the 'products' table.
    3. Preserves all portal-specific lighting design specs and files.
    """
    start_time = time.time()
    db = db_session if db_session else SessionLocal()
    should_close_db = db_session is None

    try:
        # 1. Connect to Palladium MS SQL Server (Read-Only)
        logger.info(f"Connecting read-only to Palladium MS SQL ({PALLADIUM_CONFIG['server']}:{PALLADIUM_CONFIG['port']})...")
        p_conn = pymssql.connect(
            server=PALLADIUM_CONFIG['server'],
            port=PALLADIUM_CONFIG['port'],
            user=PALLADIUM_CONFIG['user'],
            password=PALLADIUM_CONFIG['password'],
            database=PALLADIUM_CONFIG['database']
        )
        p_cursor = p_conn.cursor(as_dict=True)

        # 2. Fetch inventory items and prices
        p_cursor.execute("""
            SELECT 
                i.strPartNumber AS sku,
                i.strDesc AS name,
                i.strCategory AS category,
                i.strSubCategory AS family,
                i.strBuyUnit AS buy_unit,
                i.strSellUnit AS sell_unit,
                i.strUnitOfMeasure AS unit_of_measure,
                i.bitInactive AS is_inactive,
                i.decLastPPUnit AS last_cost,
                i.decStandardCost AS standard_cost,
                i.decSumOnHand AS sum_on_hand,
                i.decSumAvail AS sum_avail,
                i.decSumAlloc AS sum_alloc,
                i.decSumOnOrder AS sum_on_order,
                i.decOrderLeadTime AS lead_time_days,
                i.dteRowUpdated AS row_updated,
                p.decSelling AS selling_price,
                p.decEstLocalCost AS price_est_cost
            FROM tblInv i
            LEFT JOIN tblInvPrice p 
                ON i.strPartNumber = p.strPartNumber 
                AND p.strPricelist = 'REGULAR'
        """)
        palladium_items = p_cursor.fetchall()

        # 3. Fetch bin-level stock breakdown (tblInvExtBin + tblInvLocBin)
        p_cursor.execute("""
            SELECT 
                b.strPartNumber AS sku,
                b.strLocName AS loc_name,
                COALESCE(lb.strBinCode, 'DEFAULT') AS bin_code,
                COALESCE(lb.strDescription, 'Default Bin') AS bin_desc,
                b.decOnHand AS on_hand,
                b.decAvail AS avail,
                b.decAlloc AS alloc
            FROM tblInvExtBin b
            LEFT JOIN tblInvLocBin lb ON b.lngBinID = lb.lngID
            WHERE b.decOnHand > 0 OR b.decAvail > 0 OR b.decAlloc > 0
            ORDER BY b.strPartNumber, b.strLocName, lb.strBinCode;
        """)
        bin_rows = p_cursor.fetchall()

        # Location-level stock fallback (tblInvExt)
        p_cursor.execute("""
            SELECT 
                strPartNumber AS sku, 
                strLocName AS loc, 
                decOnHand AS on_hand, 
                decAvail AS avail, 
                decAlloc AS alloc
            FROM tblInvExt
            WHERE decOnHand > 0 OR decAvail > 0 OR decAlloc > 0
        """)
        loc_rows = p_cursor.fetchall()

        # 4. Fetch vendor/supplier links
        p_cursor.execute("""
            SELECT 
                iv.strPartNumber AS sku,
                iv.strVendName AS vendor_number,
                COALESCE(v.strVendDesc, iv.strVendName) AS vendor_name,
                iv.strItemCode AS vendor_item_code,
                iv.strItemDesc AS vendor_item_desc,
                iv.intWarrantyDays AS warranty_days,
                iv.decPrice AS vendor_price,
                CAST(1.0000 AS decimal(18,4)) AS exchange_rate,
                iv.decLocalPrice AS local_price,
                iv.decDiscPerc AS discount_pct,
                iv.decLandedCostFactor AS landed_cost_factor_pct,
                CAST((iv.decLocalPrice * (1.0 + (COALESCE(iv.decLandedCostFactor, 0.0) / 100.0))) AS decimal(18,2)) AS estimated_landed,
                iv.bitPreferred AS is_preferred
            FROM tblInvVend iv
            LEFT JOIN tblVendors v ON iv.strVendName = v.strVendName
            ORDER BY iv.strPartNumber, iv.bitPreferred DESC;
        """)
        vend_rows = p_cursor.fetchall()
        p_conn.close()

        # Group location and bin breakdown by SKU as an Array
        loc_map = {}
        for br in bin_rows:
            sku = str(br['sku']).strip()
            if sku not in loc_map:
                loc_map[sku] = []
            loc_map[sku].append({
                "location": str(br['loc_name']).strip(),
                "bin_code": str(br['bin_code']).strip(),
                "bin_desc": str(br['bin_desc']).strip(),
                "on_hand": float(br['on_hand'] or 0.0),
                "avail": float(br['avail'] or 0.0),
                "alloc": float(br['alloc'] or 0.0)
            })

        for lr in loc_rows:
            sku = str(lr['sku']).strip()
            if sku not in loc_map:
                loc_map[sku] = []
                loc_map[sku].append({
                    "location": str(lr['loc']).strip(),
                    "bin_code": "DEFAULT",
                    "bin_desc": "Main Location",
                    "on_hand": float(lr['on_hand'] or 0.0),
                    "avail": float(lr['avail'] or 0.0),
                    "alloc": float(lr['alloc'] or 0.0)
                })

        # Map list of vendors with complete 12 columns by SKU
        vend_map = {}
        for vr in vend_rows:
            sku = str(vr['sku']).strip()
            if sku not in vend_map:
                vend_map[sku] = []
            vend_map[sku].append({
                "vendor_number": str(vr.get('vendor_number') or '').strip(),
                "vendor_name": str(vr.get('vendor_name') or '').strip(),
                "vendor_item_code": str(vr.get('vendor_item_code') or '').strip(),
                "vendor_item_desc": str(vr.get('vendor_item_desc') or '').strip(),
                "warranty_days": int(vr.get('warranty_days') or 0),
                "vendor_price": float(vr.get('vendor_price') or 0.0),
                "exchange_rate": float(vr.get('exchange_rate') or 1.0),
                "local_price": float(vr.get('local_price') or 0.0),
                "discount_pct": float(vr.get('discount_pct') or 0.0),
                "landed_cost_factor_pct": float(vr.get('landed_cost_factor_pct') or 0.0),
                "estimated_landed": float(vr.get('estimated_landed') or 0.0),
                "is_preferred": bool(vr.get('is_preferred'))
            })

        # 5. Fetch existing products from Portal Cloud SQL for matching
        existing_products = {p.sku.strip(): p for p in db.query(Product).all() if p.sku}
        now_dt = datetime.now(timezone.utc)

        updated_count = 0
        created_count = 0

        for item in palladium_items:
            raw_sku = item.get('sku')
            if not raw_sku:
                continue
            sku = str(raw_sku).strip()

            name = str(item.get('name') or sku).strip()
            category = str(item.get('category') or '').strip() or None
            family = str(item.get('family') or '').strip() or None

            cost_val = float(item.get('price_est_cost') or item.get('last_cost') or item.get('standard_cost') or 0.0)
            selling_val = float(item.get('selling_price') or 0.0)

            sum_avail = float(item.get('sum_avail') or 0.0)
            sum_on_hand = float(item.get('sum_on_hand') or 0.0)
            sum_alloc = float(item.get('sum_alloc') or 0.0)
            sum_on_order = float(item.get('sum_on_order') or 0.0)

            is_active = not bool(item.get('is_inactive'))
            uom = str(item.get('sell_unit') or item.get('unit_of_measure') or 'EA').strip()
            lead_days = item.get('lead_time_days')
            lead_str = f"{int(lead_days)} days" if lead_days and float(lead_days) > 0 else None
            loc_json = loc_map.get(sku)
            vend_list = vend_map.get(sku) or []
            primary_vendor = vend_list[0]['vendor_name'] if len(vend_list) > 0 else None

            if sku in existing_products:
                prod = existing_products[sku]
                prod.name = name
                if category:
                    prod.category = category
                if family:
                    prod.family = family
                prod.supplier_name = primary_vendor
                prod.supplier_details_json = vend_list
                prod.cost_price = cost_val
                prod.retail_price = selling_val
                prod.trade_price = selling_val
                prod.stock_level = int(sum_avail)
                prod.stock_available = sum_avail
                prod.stock_on_hand = sum_on_hand
                prod.stock_allocated = sum_alloc
                prod.stock_on_order = sum_on_order
                prod.is_active = is_active
                prod.unit_of_measure = uom
                if lead_str:
                    prod.lead_time = lead_str
                if loc_json:
                    prod.stock_locations_json = loc_json
                prod.palladium_last_synced_at = now_dt
                updated_count += 1
            else:
                new_prod = Product(
                    sku=sku,
                    name=name,
                    category=category,
                    family=family,
                    supplier_name=primary_vendor,
                    supplier_details_json=vend_list,
                    cost_price=cost_val,
                    retail_price=selling_val,
                    trade_price=selling_val,
                    stock_level=int(sum_avail),
                    stock_available=sum_avail,
                    stock_on_hand=sum_on_hand,
                    stock_allocated=sum_alloc,
                    stock_on_order=sum_on_order,
                    is_active=is_active,
                    unit_of_measure=uom,
                    lead_time=lead_str,
                    stock_locations_json=loc_json,
                    palladium_last_synced_at=now_dt
                )
                db.add(new_prod)
                existing_products[sku] = new_prod
                created_count += 1

        db.commit()

        duration = round(time.time() - start_time, 2)
        logger.info(f"Palladium Sync completed in {duration}s: {updated_count} updated, {created_count} created.")

        return {
            "status": "success",
            "message": f"Successfully synced {len(palladium_items)} items from Palladium ({updated_count} updated, {created_count} new) in {duration}s",
            "total_scanned": len(palladium_items),
            "updated_count": updated_count,
            "created_count": created_count,
            "duration_seconds": duration,
            "synced_at": now_dt.isoformat()
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Palladium Sync Error: {e}", exc_info=True)
        raise RuntimeError(f"Palladium Synchronization Failed: {e}")
    finally:
        if should_close_db:
            db.close()


def sync_palladium_purchase_orders(db_session: Optional[Session] = None) -> Dict[str, Any]:
    """
    100% read-only synchronization of Purchase Orders from Palladium ERP (biPurchaseOrders)
    into Cloud SQL (palladium_po_lines).
    """
    start_time = time.time()
    db = db_session if db_session else SessionLocal()
    should_close_db = db_session is None

    try:
        p_conn = pymssql.connect(
            server=PALLADIUM_CONFIG['server'],
            port=PALLADIUM_CONFIG['port'],
            user=PALLADIUM_CONFIG['user'],
            password=PALLADIUM_CONFIG['password'],
            database=PALLADIUM_CONFIG['database'],
            timeout=25
        )
        p_cursor = p_conn.cursor(as_dict=True)

        p_cursor.execute("""
            SELECT 
                [Document #] AS document_no,
                [Vendor Name] AS vendor_name,
                [Item Code] AS item_code,
                [Item Description (Line)] AS item_description,
                [Item Unit] AS item_unit,
                [Original Order Qty] AS order_qty,
                [Open Order Qty] AS open_qty,
                [Shipped Order Qty] AS shipped_qty,
                [Last Unit Cost] AS unit_cost,
                [Original Order Value] AS total_value_excl,
                [Currency Code] AS currency_code,
                [Exchange Rate] AS exchange_rate,
                [Transaction Date] AS transaction_date,
                [Order Required Date] AS order_required_date,
                [Status] AS status,
                [Customer Name] AS customer_name,
                [Copied From Document] AS copied_from_document
            FROM biPurchaseOrders
        """)
        po_rows = p_cursor.fetchall()
        p_conn.close()

        db.query(PalladiumPOLine).delete()
        now_dt = datetime.now(timezone.utc)

        po_objects = []
        for r in po_rows:
            doc_no = str(r.get("document_no") or "").strip()
            item_code = str(r.get("item_code") or "").strip()
            if not doc_no or not item_code:
                continue

            po_obj = PalladiumPOLine(
                document_no=doc_no,
                vendor_name=str(r.get("vendor_name") or "").strip() or None,
                item_code=item_code,
                item_description=str(r.get("item_description") or "").strip() or None,
                item_unit=str(r.get("item_unit") or "").strip() or "EA",
                order_qty=float(r.get("order_qty") or 0.0),
                open_qty=float(r.get("open_qty") or 0.0),
                shipped_qty=float(r.get("shipped_qty") or 0.0),
                unit_cost=float(r.get("unit_cost") or 0.0),
                total_value_excl=float(r.get("total_value_excl") or 0.0),
                currency_code=str(r.get("currency_code") or "ZAR").strip(),
                exchange_rate=float(r.get("exchange_rate") or 1.0),
                transaction_date=r.get("transaction_date"),
                order_required_date=r.get("order_required_date"),
                status=str(r.get("status") or "Open").strip(),
                customer_name=str(r.get("customer_name") or "").strip() or None,
                copied_from_document=str(r.get("copied_from_document") or "").strip() or None,
                last_synced_at=now_dt
            )
            po_objects.append(po_obj)

        db.bulk_save_objects(po_objects)
        db.commit()

        duration = round(time.time() - start_time, 2)
        logger.info(f"Synced {len(po_objects)} PO lines from Palladium in {duration}s.")
        return {
            "status": "success",
            "po_lines_synced": len(po_objects),
            "duration_seconds": duration
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to sync POs from Palladium: {e}")
        return {"status": "error", "error": str(e), "po_lines_synced": 0}
    finally:
        if should_close_db:
            db.close()


def sync_palladium_goods_received(db_session: Optional[Session] = None) -> Dict[str, Any]:
    """
    100% read-only synchronization of Goods Received / Purchase Invoices from Palladium ERP (biPurchaseInvoice)
    into Cloud SQL (palladium_grn_lines).
    """
    start_time = time.time()
    db = db_session if db_session else SessionLocal()
    should_close_db = db_session is None

    try:
        p_conn = pymssql.connect(
            server=PALLADIUM_CONFIG['server'],
            port=PALLADIUM_CONFIG['port'],
            user=PALLADIUM_CONFIG['user'],
            password=PALLADIUM_CONFIG['password'],
            database=PALLADIUM_CONFIG['database'],
            timeout=25
        )
        p_cursor = p_conn.cursor(as_dict=True)

        p_cursor.execute("""
            SELECT 
                [Document #] AS document_no,
                [Vendor Name] AS vendor_name,
                [Item Code] AS item_code,
                [Item Description (Line)] AS item_description,
                [Item Unit] AS item_unit,
                [Original Invoice Qty] AS received_qty,
                [Last Unit Cost] AS unit_cost,
                [Line Tot Excl] AS line_total_excl,
                [Line Tot Incl] AS line_total_incl,
                [Transaction Date] AS transaction_date,
                [Location] AS location,
                [Currency Code] AS currency_code
            FROM biPurchaseInvoice
        """)
        grn_rows = p_cursor.fetchall()
        p_conn.close()

        db.query(PalladiumGRNLine).delete()
        now_dt = datetime.now(timezone.utc)

        grn_objects = []
        for r in grn_rows:
            doc_no = str(r.get("document_no") or "").strip()
            item_code = str(r.get("item_code") or "").strip()
            if not doc_no or not item_code:
                continue

            grn_obj = PalladiumGRNLine(
                document_no=doc_no,
                vendor_name=str(r.get("vendor_name") or "").strip() or None,
                item_code=item_code,
                item_description=str(r.get("item_description") or "").strip() or None,
                item_unit=str(r.get("item_unit") or "").strip() or "EA",
                received_qty=float(r.get("received_qty") or 0.0),
                unit_cost=float(r.get("unit_cost") or 0.0),
                line_total_excl=float(r.get("line_total_excl") or 0.0),
                line_total_incl=float(r.get("line_total_incl") or 0.0),
                transaction_date=r.get("transaction_date"),
                location=str(r.get("location") or "").strip() or None,
                currency_code=str(r.get("currency_code") or "ZAR").strip(),
                last_synced_at=now_dt
            )
            grn_objects.append(grn_obj)

        db.bulk_save_objects(grn_objects)
        db.commit()

        duration = round(time.time() - start_time, 2)
        logger.info(f"Synced {len(grn_objects)} GRN lines from Palladium in {duration}s.")
        return {
            "status": "success",
            "grn_lines_synced": len(grn_objects),
            "duration_seconds": duration
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to sync GRNs from Palladium: {e}")
        return {"status": "error", "error": str(e), "grn_lines_synced": 0}
    finally:
        if should_close_db:
            db.close()


def sync_palladium_sales_invoices(db_session: Optional[Session] = None) -> Dict[str, Any]:
    """
    100% read-only synchronization of Sales Invoices and Credit Notes from Palladium ERP (biSalesAnalysis)
    into Cloud SQL (palladium_invoice_lines).
    """
    start_time = time.time()
    db = db_session if db_session else SessionLocal()
    should_close_db = db_session is None

    try:
        p_conn = pymssql.connect(
            server=PALLADIUM_CONFIG['server'],
            port=PALLADIUM_CONFIG['port'],
            user=PALLADIUM_CONFIG['user'],
            password=PALLADIUM_CONFIG['password'],
            database=PALLADIUM_CONFIG['database'],
            timeout=35
        )
        p_cursor = p_conn.cursor(as_dict=True)

        p_cursor.execute("""
            SELECT 
                [Document #] AS document_no,
                [Customer Code] AS customer_code,
                [Customer Name] AS customer_name,
                [Reference] AS reference,
                [Item Code] AS item_code,
                [Item Description (Line)] AS item_description,
                [Item Location] AS item_unit,
                [Qty] AS qty,
                [Unit Price Excl] AS unit_price_excl,
                [Unit Price Incl] AS unit_price_incl,
                [Line Total Excl] AS line_total_excl,
                [Line Total Incl] AS line_total_incl,
                [Document Total] AS document_total,
                [Transaction Date] AS transaction_date,
                [Currency Code] AS currency_code,
                [Sales Rep] AS sales_rep
            FROM biSalesAnalysis
            ORDER BY [Transaction Date] DESC
        """)
        inv_rows = p_cursor.fetchall()
        p_conn.close()

        db.query(PalladiumInvoiceLine).delete()
        now_dt = datetime.now(timezone.utc)

        inv_objects = []
        for r in inv_rows:
            doc_no = str(r.get("document_no") or "").strip()
            item_code = str(r.get("item_code") or "").strip()
            if not doc_no or not item_code:
                continue

            inv_obj = PalladiumInvoiceLine(
                document_no=doc_no,
                customer_code=str(r.get("customer_code") or "").strip() or None,
                customer_name=str(r.get("customer_name") or "").strip() or None,
                reference=str(r.get("reference") or "").strip() or None,
                item_code=item_code,
                item_description=str(r.get("item_description") or "").strip() or None,
                item_unit=str(r.get("item_unit") or "").strip() or "EA",
                qty=float(r.get("qty") or 0.0),
                unit_price_excl=float(r.get("unit_price_excl") or 0.0),
                unit_price_incl=float(r.get("unit_price_incl") or 0.0),
                line_total_excl=float(r.get("line_total_excl") or 0.0),
                line_total_incl=float(r.get("line_total_incl") or 0.0),
                document_total=float(r.get("document_total") or 0.0),
                transaction_date=r.get("transaction_date"),
                currency_code=str(r.get("currency_code") or "ZAR").strip(),
                sales_rep=str(r.get("sales_rep") or "").strip() or None,
                last_synced_at=now_dt
            )
            inv_objects.append(inv_obj)

        db.bulk_save_objects(inv_objects)
        db.commit()

        duration = round(time.time() - start_time, 2)
        logger.info(f"Synced {len(inv_objects)} Invoice lines from Palladium in {duration}s.")
        return {
            "status": "success",
            "invoice_lines_synced": len(inv_objects),
            "duration_seconds": duration
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to sync Invoices from Palladium: {e}")
        return {"status": "error", "error": str(e), "invoice_lines_synced": 0}
    finally:
        if should_close_db:
            db.close()
