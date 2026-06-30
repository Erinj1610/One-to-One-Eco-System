import os
import sys

backend_dir = r"c:\Users\erin\Desktop\One to One Eco System\backend"
sys.path.append(backend_dir)

from database.cloud_sql import SessionLocal
from models.orm_models import PortalSetting
from services.db_sync_service import sync_key_to_relational, run_migrations

def main():
    print("--- Starting database relational migration... ---")
    db = SessionLocal()
    try:
        # Run migrations to ensure columns exist
        print("Ensuring relational schema is up to date...")
        run_migrations(db)
        
        # Load and sync each key in portal_settings
        print("Syncing existing key-value pairs from portal_settings...")
        settings = db.query(PortalSetting).all()
        for setting in settings:
            print(f"Syncing key: {setting.key} ...")
            try:
                sync_key_to_relational(setting.key, setting.value, db)
                print(f"Success syncing: {setting.key}")
            except Exception as e:
                print(f"Failed to sync key '{setting.key}': {e}")
                
        print("--- Migration complete! ---")
    finally:
        db.close()

if __name__ == "__main__":
    main()
