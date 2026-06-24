import sys
import os
from sqlalchemy import create_engine, MetaData, text, Integer
from sqlalchemy.orm import sessionmaker

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.cloud_sql import Base, DB_PATH, clean_database_url
# Import models to ensure they are registered on Base
import models.orm_models

def migrate():
    # Retrieve target database URL from env
    target_url = os.getenv("DATABASE_URL")
    if target_url:
        target_url = clean_database_url(target_url)

    if not target_url:
        print("ERROR: DATABASE_URL environment variable is not set.")
        print("Please set it, e.g.:")
        print("Windows (cmd): set DATABASE_URL=postgresql://user:pass@ip/dbname")
        print("Windows (PowerShell): $env:DATABASE_URL=\"postgresql://user:pass@ip/dbname\"")
        return

    # SQLite source engine
    source_url = f"sqlite:///{DB_PATH}"
    print(f"Connecting to source SQLite database: {source_url}")
    source_engine = create_engine(source_url)

    # Postgres target engine
    print(f"Connecting to target PostgreSQL database...")
    # Hide password from logs if present
    masked_url = target_url
    if "@" in target_url:
        parts = target_url.split("@")
        cred_parts = parts[0].split("://")
        if len(cred_parts) > 1 and ":" in cred_parts[1]:
            user = cred_parts[1].split(":")[0]
            masked_url = f"{cred_parts[0]}://{user}:*****@{parts[1]}"
    print(f"Target database URL: {masked_url}")
    
    target_engine = create_engine(target_url)

    # 1. Create tables on target database
    print("\nCreating tables on target PostgreSQL database if they do not exist...")
    Base.metadata.create_all(target_engine)
    print("Table structures initialized successfully.")

    # 2. Start migration table-by-table in dependency order
    print("\nStarting data migration...")
    
    # We use connection context managers
    with source_engine.connect() as source_conn, target_engine.connect() as target_conn:
        for table in Base.metadata.sorted_tables:
            print(f"Migrating table: {table.name}...")
            
            # Fetch all rows from sqlite table
            rows = source_conn.execute(table.select()).fetchall()
            if not rows:
                print(f"  -> No data found in {table.name}. Skipping.")
                continue
                
            print(f"  -> Found {len(rows)} rows to migrate.")
            
            # Clear target table first to avoid duplicate primary keys if run multiple times
            # Use text to execute clean TRUNCATE CASCADE if supported or standard DELETE
            try:
                target_conn.execute(text(f"TRUNCATE TABLE {table.name} RESTART IDENTITY CASCADE;"))
            except Exception:
                target_conn.execute(text(f"DELETE FROM {table.name};"))
            target_conn.commit()

            # Insert rows into target database
            # SQLAlchemy Table object allows inserting dicts directly
            # Convert row objects to dicts
            insert_data = [dict(row._mapping) for row in rows]
            
            # Execute insert
            target_conn.execute(table.insert(), insert_data)
            target_conn.commit()
            print(f"  -> Successfully migrated {len(insert_data)} rows to {table.name}.")

        # 3. Reset primary key sequences for PostgreSQL
        print("\nResetting primary key sequences for PostgreSQL...")
        for table in Base.metadata.sorted_tables:
            # Check if there is an integer 'id' column
            if 'id' in table.columns and isinstance(table.columns['id'].type, Integer):
                # Retrieve current max ID to reset the sequence correctly
                res = target_conn.execute(text(f"SELECT MAX(id) FROM {table.name};")).fetchone()
                max_id = res[0] if res and res[0] is not None else 0
                
                # PostgreSQL sequence name for standard serial columns is typically {tablename}_{columnname}_seq
                seq_name = f"{table.name}_id_seq"
                
                try:
                    # Set sequence next value to max_id + 1
                    # COALESCE ensures we start at 1 if max_id is 0
                    next_val = max(1, max_id)
                    is_called = "true" if max_id > 0 else "false"
                    target_conn.execute(text(f"SELECT setval(pg_get_serial_sequence('{table.name}', 'id'), {next_val}, {is_called});"))
                    target_conn.commit()
                    print(f"  -> Reset sequence for {table.name} to {next_val} (is_called={is_called})")
                except Exception as seq_err:
                    print(f"  -> Warning: Could not reset sequence for {table.name}: {seq_err}")

    print("\nDatabase migration completed successfully!")

if __name__ == "__main__":
    migrate()
