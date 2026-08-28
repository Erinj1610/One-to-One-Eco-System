import os
import time
import logging
import threading
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from sqlalchemy.orm import Session
from database.cloud_sql import SessionLocal
from models.orm_models import Product, PortalSetting
from services.palladium_sync import sync_palladium_to_cloud_sql
from services.google_sheet_specs_service import sync_specs_from_sheet

logger = logging.getLogger("master_sync")
logger.setLevel(logging.INFO)

# Global synchronization lock to prevent duplicate concurrent runs
_sync_lock = threading.Lock()
_last_sync_info = {
    "is_syncing": False,
    "last_synced_at": None,
    "last_status": "Idle",
    "last_erp_count": 0,
    "last_sheet_count": 0,
    "last_error": None,
    "next_sync_timestamp": None
}
_scheduler_started = False
SYNC_INTERVAL_SECONDS = 900  # 15 minutes


def execute_master_sync(db_session: Optional[Session] = None) -> Dict[str, Any]:
    """
    Executes a unified, complete master synchronization:
      1. Reads 100% read-only ERP data from Palladium MS SQL (costs, retail prices, stock on hand, suppliers).
      2. Reads 30-column architectural specifications, images, CAD drawings, wetworks, and 1-to-1 codes from Google Sheets.
      3. Reconciles both sources into the central Cloud SQL PostgreSQL database.
    """
    global _last_sync_info

    if not _sync_lock.acquire(blocking=False):
        return {
            "status": "in_progress",
            "message": "A synchronization is already running in the background. Please wait for it to finish.",
            "synced_at": _last_sync_info.get("last_synced_at")
        }

    start_time = time.time()
    db = db_session if db_session else SessionLocal()
    should_close = db_session is None

    _last_sync_info["is_syncing"] = True
    _last_sync_info["last_status"] = "Syncing..."
    _last_sync_info["last_error"] = None

    erp_result = {"status": "skipped", "synced_count": 0}
    sheet_result = {"status": "skipped", "updated_count": 0}

    try:
        # 1. Synchronize Palladium ERP
        logger.info("[MasterSync] Step 1/2: Starting Palladium ERP synchronization...")
        try:
            erp_result = sync_palladium_to_cloud_sql(db_session=db)
            logger.info(f"[MasterSync] Step 1 Complete: Synced {erp_result.get('synced_count', 0)} ERP items.")
        except Exception as erp_err:
            logger.error(f"[MasterSync] Palladium ERP sync error: {erp_err}")
            erp_result = {"status": "error", "error": str(erp_err), "synced_count": 0}

        # 2. Synchronize Google Sheet Specifications (30 Columns)
        logger.info("[MasterSync] Step 2/2: Starting Google Sheets 30-column specifications sync...")
        try:
            sheet_result = sync_specs_from_sheet(db=db)
            logger.info(f"[MasterSync] Step 2 Complete: Synced {sheet_result.get('updated_count', 0)} product specifications.")
        except Exception as sheet_err:
            logger.error(f"[MasterSync] Google Sheet specs sync error: {sheet_err}")
            sheet_result = {"status": "error", "error": str(sheet_err), "updated_count": 0}

        duration = round(time.time() - start_time, 2)
        now_iso = datetime.now(timezone.utc).isoformat()

        # Update PortalSetting
        try:
            setting = db.query(PortalSetting).filter(PortalSetting.key == "master_sync_status").first()
            if not setting:
                setting = PortalSetting(key="master_sync_status", value={})
                db.add(setting)
            setting.value = {
                "last_synced_at": now_iso,
                "erp_synced_count": erp_result.get("synced_count", 0),
                "sheet_updated_count": sheet_result.get("updated_count", 0),
                "duration_seconds": duration,
                "status": "success" if erp_result.get("status") == "success" or sheet_result.get("status") == "success" else "partial_error"
            }
            db.commit()
        except Exception as sett_err:
            logger.warning(f"[MasterSync] Could not save setting: {sett_err}")

        _last_sync_info["is_syncing"] = False
        _last_sync_info["last_synced_at"] = now_iso
        _last_sync_info["last_status"] = "Success"
        _last_sync_info["last_erp_count"] = erp_result.get("synced_count", 0)
        _last_sync_info["last_sheet_count"] = sheet_result.get("updated_count", 0)
        _last_sync_info["next_sync_timestamp"] = time.time() + SYNC_INTERVAL_SECONDS

        msg = (
            f"Master sync finished in {duration}s. "
            f"Palladium ERP: {erp_result.get('synced_count', 0)} items synced. "
            f"Google Sheet Specs: {sheet_result.get('updated_count', 0)} products updated."
        )
        logger.info(f"[MasterSync] {msg}")

        return {
            "status": "success",
            "message": msg,
            "duration_seconds": duration,
            "synced_at": now_iso,
            "erp": erp_result,
            "sheet": sheet_result,
            "next_sync_in_seconds": SYNC_INTERVAL_SECONDS
        }

    except Exception as ex:
        logger.error(f"[MasterSync] Critical failure during master sync: {ex}")
        _last_sync_info["is_syncing"] = False
        _last_sync_info["last_status"] = "Error"
        _last_sync_info["last_error"] = str(ex)
        raise ex
    finally:
        _sync_lock.release()
        if should_close:
            db.close()


def get_master_sync_status(db: Optional[Session] = None) -> Dict[str, Any]:
    """
    Returns the real-time status of both upstream synchronization feeds and the 15-minute timer.
    """
    close_db = False
    if not db:
        db = SessionLocal()
        close_db = True

    try:
        total_products = db.query(Product).count()
        synced_products = db.query(Product).filter(Product.palladium_last_synced_at.isnot(None)).count()
        
        last_sync_record = db.query(Product.palladium_last_synced_at)\
            .filter(Product.palladium_last_synced_at.isnot(None))\
            .order_by(Product.palladium_last_synced_at.desc())\
            .first()
            
        last_synced_at = last_sync_record[0].isoformat() if last_sync_record and last_sync_record[0] else _last_sync_info.get("last_synced_at")

        now_ts = time.time()
        next_sync_ts = _last_sync_info.get("next_sync_timestamp")
        remaining_seconds = max(0, int(next_sync_ts - now_ts)) if next_sync_ts else SYNC_INTERVAL_SECONDS

        return {
            "status": "connected",
            "is_syncing": _last_sync_info.get("is_syncing", False),
            "sync_interval_minutes": SYNC_INTERVAL_SECONDS // 60,
            "next_sync_in_seconds": remaining_seconds,
            "last_synced_at": last_synced_at,
            "last_erp_count": _last_sync_info.get("last_erp_count", 0),
            "last_sheet_count": _last_sync_info.get("last_sheet_count", 0),
            "total_products": total_products,
            "synced_products": synced_products,
            "scheduler_active": _scheduler_started
        }
    finally:
        if close_db:
            db.close()


def _background_scheduler_loop():
    """
    Background worker thread loop that wakes up every 15 minutes to run master sync.
    """
    logger.info("[MasterSyncScheduler] 15-minute background synchronization worker daemon started.")
    # Initial startup delay so the app finishes initialization
    time.sleep(10)

    while True:
        try:
            logger.info("[MasterSyncScheduler] Periodic 15-minute synchronization cycle triggering now...")
            execute_master_sync()
        except Exception as cycle_err:
            logger.error(f"[MasterSyncScheduler] Cycle failed with error: {cycle_err}")

        # Sleep for 15 minutes before the next cycle
        _last_sync_info["next_sync_timestamp"] = time.time() + SYNC_INTERVAL_SECONDS
        for _ in range(SYNC_INTERVAL_SECONDS):
            time.sleep(1)


def start_15min_sync_scheduler():
    """
    Spawns the background scheduler thread if not already running.
    """
    global _scheduler_started
    if _scheduler_started:
        return
    _scheduler_started = True
    t = threading.Thread(target=_background_scheduler_loop, daemon=True, name="MasterSyncScheduler")
    t.start()
    logger.info("[MasterSyncScheduler] Daemon thread successfully launched.")
