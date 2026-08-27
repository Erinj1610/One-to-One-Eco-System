import sys
import os
import time

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.palladium_sync import sync_palladium_to_cloud_sql

if __name__ == '__main__':
    print("=== STARTING PALLADIUM ERP TO CLOUD SQL SYNCHRONIZATION ===")
    start = time.time()
    try:
        result = sync_palladium_to_cloud_sql()
        print(f"Status: {result.get('status')}")
        print(f"Message: {result.get('message')}")
        print(f"Total Scanned: {result.get('total_scanned')}")
        print(f"Updated: {result.get('updated_count')}")
        print(f"Created: {result.get('created_count')}")
        print(f"Duration: {result.get('duration_seconds')}s")
        print("=== PALLADIUM SYNC FINISHED SUCCESSFULLY ===")
    except Exception as e:
        print(f"ERROR DURING PALLADIUM SYNC: {e}")
        sys.exit(1)
