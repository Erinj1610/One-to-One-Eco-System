import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from sqlalchemy import text, inspect
from database.cloud_sql import engine

def run_migration():
    print("Connecting to database via engine...")
    with engine.connect() as conn:
        inspector = inspect(engine)
        
        # 1. Orders table -> vat_percentage
        order_cols = [c['name'] for c in inspector.get_columns('orders')]
        if 'vat_percentage' not in order_cols:
            print("Adding 'vat_percentage' column to 'orders' table...")
            conn.execute(text("ALTER TABLE orders ADD COLUMN vat_percentage FLOAT DEFAULT 15.0;"))
            conn.commit()
            print("Successfully added 'vat_percentage' to 'orders'.")
        else:
            print("'vat_percentage' column already exists on 'orders'.")
            
        # 2. Order items table -> stock_available
        item_cols = [c['name'] for c in inspector.get_columns('order_items')]
        if 'stock_available' not in item_cols:
            print("Adding 'stock_available' column to 'order_items' table...")
            conn.execute(text("ALTER TABLE order_items ADD COLUMN stock_available FLOAT DEFAULT 0.0;"))
            conn.commit()
            print("Successfully added 'stock_available' to 'order_items'.")
        else:
            print("'stock_available' column already exists on 'order_items'.")

    print("Migration finished successfully.")

if __name__ == "__main__":
    run_migration()
