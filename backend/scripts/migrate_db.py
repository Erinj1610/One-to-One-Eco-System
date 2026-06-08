import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "local_ecosystem.db")

print(f"Connecting to database at {DB_PATH} for migration...")
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# 1. Get current columns in projects
cursor.execute("PRAGMA table_info(projects)")
columns = [row[1] for row in cursor.fetchall()]

# 2. Add missing columns if they don't exist
expected_columns = {
    "client_id": "INTEGER",
    "pm_id": "INTEGER",
    "template_id": "INTEGER",
    "offering": "VARCHAR",
    "sqm": "VARCHAR",
    "start_date": "VARCHAR",
    "deadline": "VARCHAR",
    "status": "VARCHAR DEFAULT 'On track'",
    "delay_reason": "VARCHAR",
    "complete_status": "VARCHAR DEFAULT 'Ongoing'",
    "design_fee": "FLOAT DEFAULT 0.0",
    "outstanding_amount": "FLOAT DEFAULT 0.0"
}

for col, col_type in expected_columns.items():
    if col not in columns:
        print(f"Adding missing column: {col} ({col_type})")
        try:
            cursor.execute(f"ALTER TABLE projects ADD COLUMN {col} {col_type}")
            conn.commit()
        except Exception as e:
            print(f"Error adding {col}: {e}")

print("Migration completed successfully.")
conn.close()
