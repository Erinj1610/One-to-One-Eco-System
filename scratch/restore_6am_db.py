import sys, os
sys.path.append(r'c:\Users\erin\Desktop\One to One Eco System\backend')
from database.cloud_sql import SessionLocal
from sqlalchemy import text
from services.db_sync_service import sync_projects

db = SessionLocal()
print("--- STARTING EXACT DATABASE RESTORE TO 6AM SNAPSHOT ---")

# 1. Clear relational tables completely
db.execute(text("DELETE FROM order_items"))
db.execute(text("DELETE FROM orders"))
db.execute(text("DELETE FROM design_fees"))
db.execute(text("DELETE FROM project_folders"))
db.execute(text("DELETE FROM projects"))
db.commit()

# 2. Get 6am snapshot from portal_settings
res = db.execute(text("SELECT value FROM portal_settings WHERE key = 'projects'")).first()
snapshot = res[0] if res else {}

# 3. Sync clean 6am projects snapshot directly to relational tables
sync_projects(snapshot, db)

p_count = db.execute(text("SELECT COUNT(*) FROM projects")).scalar()
o_count = db.execute(text("SELECT COUNT(*) FROM orders")).scalar()
df_count = db.execute(text("SELECT COUNT(*) FROM design_fees")).scalar()

print(f"DATABASE RESTORE COMPLETE! Verified State: Projects={p_count}, Orders={o_count}, DesignFees={df_count}")
db.close()
