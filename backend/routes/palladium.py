import logging
from typing import Optional, Dict, Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.cloud_sql import get_db
from models.orm_models import Product
from services.palladium_sync import sync_palladium_to_cloud_sql
from services.firebase_auth import verify_firebase_token

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(verify_firebase_token)])
public_router = APIRouter()

@public_router.get("/palladium/status")
@router.get("/palladium/status")
def get_palladium_status(db: Session = Depends(get_db)):
    """
    Returns live Palladium synchronization status and metrics.
    """
    try:
        total_products = db.query(Product).count()
        synced_products = db.query(Product).filter(Product.palladium_last_synced_at.isnot(None)).count()
        products_with_stock = db.query(Product).filter(Product.stock_on_hand > 0).count()
        products_with_price = db.query(Product).filter(Product.retail_price > 0).count()
        
        last_sync_record = db.query(Product.palladium_last_synced_at)\
            .filter(Product.palladium_last_synced_at.isnot(None))\
            .order_by(Product.palladium_last_synced_at.desc())\
            .first()
            
        last_synced_at = last_sync_record[0].isoformat() if last_sync_record and last_sync_record[0] else None

        return {
            "status": "connected",
            "erp_source": "Palladium Accounting (Kerridge MS SQL)",
            "database": "paldbOnetoOneLive",
            "total_products": total_products,
            "synced_products": synced_products,
            "products_with_stock": products_with_stock,
            "products_with_price": products_with_price,
            "last_synced_at": last_synced_at
        }
    except Exception as e:
        logger.error(f"Failed to fetch Palladium status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@public_router.post("/palladium/sync")
@router.post("/palladium/sync")
def trigger_palladium_sync(db: Session = Depends(get_db)):
    """
    Triggers an immediate 100% read-only synchronization from Palladium into Cloud SQL.
    """
    try:
        result = sync_palladium_to_cloud_sql(db_session=db)
        return result
    except Exception as e:
        logger.error(f"Failed to trigger Palladium sync: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@public_router.get("/palladium/products/{sku:path}/stock-history")
@router.get("/palladium/products/{sku:path}/stock-history")
def get_palladium_product_stock_history(sku: str):
    """
    Returns live chronological stock movement transactions and balance history for a product from Palladium ERP.
    """
    try:
        import pymssql
        conn = pymssql.connect(
            server='palladiumacc-db03.kerridgecs.online',
            port=61025,
            user='OnetoOne',
            password='onetoone_20260223_!@#',
            database='paldbOnetoOneLive'
        )
        cursor = conn.cursor(as_dict=True)

        cursor.execute("""
            -- 1. Purchase Invoices / Goods In
            SELECT 
                h.dteJournalDate AS trans_date,
                'Goods Receipt' AS trans_type,
                h.strInvPDocID AS doc_number,
                COALESCE(h.strVendName, 'Supplier') AS reference,
                CAST(d.decStockQty AS float) AS qty_change,
                COALESCE(h.strUserName, 'System') AS handled_by
            FROM tblInvoiceDocPDT d
            JOIN tblInvoiceDocP h ON d.strInvPDocID = h.strInvPDocID
            WHERE d.strPartNumber = %s AND d.decStockQty != 0

            UNION ALL

            -- 2. Sales Invoices / Credit Notes
            SELECT 
                h.dteJournalDate AS trans_date,
                'Sales Invoice' AS trans_type,
                h.strInvDocID AS doc_number,
                COALESCE(h.strCustName, 'Customer') AS reference,
                CAST(-1 * d.decQty AS float) AS qty_change,
                COALESCE(h.strUserName, 'System') AS handled_by
            FROM tblInvoiceDocDT d
            JOIN tblInvoiceDoc h ON d.strInvDocID = h.strInvDocID
            WHERE d.strPartNumber = %s AND d.decQty != 0

            UNION ALL

            -- 3. Stock Adjustments & Counts
            SELECT 
                h.dteJournalDate AS trans_date,
                'Stock Adjustment' AS trans_type,
                h.strAdjDocID AS doc_number,
                COALESCE(h.strComment, 'Stock Adjustment') AS reference,
                CAST(d.decQty AS float) AS qty_change,
                COALESCE(h.strUserName, 'System') AS handled_by
            FROM tblInvAdjDocDT d
            JOIN tblInvAdjDoc h ON d.strAdjDocID = h.strAdjDocID
            WHERE d.strPartNumber = %s AND d.decQty != 0

            UNION ALL

            -- 4. Goods Received Vouchers
            SELECT 
                h.dteJournalDate AS trans_date,
                'Goods Receipt (GRV)' AS trans_type,
                h.strOrdPGDocID AS doc_number,
                COALESCE(h.strVendName, 'Supplier') AS reference,
                CAST(d.decStockQty AS float) AS qty_change,
                COALESCE(h.strUserName, 'System') AS handled_by
            FROM tblOrderDocPGDT d
            JOIN tblOrderDocPG h ON d.strOrdPGDocID = h.strOrdPGDocID
            WHERE d.strPartNumber = %s AND d.decStockQty != 0

            ORDER BY trans_date ASC;
        """, (sku, sku, sku, sku))

        rows = cursor.fetchall()
        conn.close()

        running_bal = 0.0
        transactions = []
        chart_points = []

        for r in rows:
            qty = r['qty_change']
            running_bal += qty
            d_str = r['trans_date'].strftime('%d %b %Y') if r['trans_date'] else 'N/A'
            transactions.append({
                "date": d_str,
                "trans_date": r['trans_date'].isoformat() if r['trans_date'] else None,
                "type": r['trans_type'],
                "doc_number": r['doc_number'],
                "reference": r['reference'],
                "qty": qty,
                "qty_display": f"+{int(qty)}" if qty > 0 and qty.is_integer() else f"{int(qty)}" if qty.is_integer() else f"{qty:+.2f}",
                "balance": int(running_bal) if running_bal.is_integer() else round(running_bal, 2),
                "handled_by": r['handled_by']
            })
            chart_points.append({
                "date": d_str,
                "balance": int(running_bal) if running_bal.is_integer() else round(running_bal, 2)
            })

        return {
            "sku": sku,
            "total_transactions": len(transactions),
            "running_balance": running_bal,
            "transactions": list(reversed(transactions)),
            "chart_points": chart_points
        }
    except Exception as e:
        logger.error(f"Failed to fetch stock history for {sku}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
