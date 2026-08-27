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
        logger.error(f"Manual Palladium sync failed: {e}")
        raise HTTPException(status_code=500, detail=f"Palladium Sync Error: {e}")
