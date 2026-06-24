import os
import sys
import psycopg2

def purge_database():
    # Database connection URL
    # Try local env file first
    db_url = "postgresql://postgres:%40Erinj21610@34.42.254.202/One-to-One-Portal-Database"
    
    print("Connecting to PostgreSQL database...")
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cursor = conn.cursor()
        print("Connected successfully.")
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return

    # Tables to completely truncate/delete from
    # Order matters due to foreign key constraints
    tables_to_clear = [
        "time_logs",
        "wellbeing_checkins",
        "staff_self_assessments",
        "leave_requests",
        "leave_balances",
        "order_items",
        "order_documents",
        "orders",
        "payments",
        "invoices",
        "boq_items",
        "boqs",
        "quotes",
        "project_folders",
        "project_field_values",
        "project_phases",
        "projects",
        "proposals",
        "leads",
        "contacts",
        "clients",
        "suppliers",
        "products",
        "support_tickets",
        "documents"
    ]

    print("\n--- Purging Demo Data ---")
    
    # Clean up dependent tables first
    for table in tables_to_clear:
        try:
            # Check if table exists
            cursor.execute(f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '{table}');")
            exists = cursor.fetchone()[0]
            if exists:
                cursor.execute(f"DELETE FROM {table};")
                print(f"Cleared all records from table: {table}")
            else:
                print(f"Table does not exist (skipping): {table}")
        except Exception as table_err:
            print(f"Error clearing table {table}: {table_err}")

    # Special handling for users and employees:
    # Keep erin.jones@1-to-1.world and admin@onetoone.co.za
    print("\nCleaning up users and employees (preserving admin accounts)...")
    try:
        # Keep admin users
        keep_emails = ("erin.jones@1-to-1.world", "admin@onetoone.co.za", "erin@onetoone.co.za")
        
        # 1. Nullify manager IDs first to avoid fk violations
        cursor.execute("UPDATE employees SET manager_id = NULL;")
        
        # 2. Get list of user IDs to delete
        cursor.execute(f"SELECT id, email FROM users WHERE email NOT IN {keep_emails};")
        users_to_delete = cursor.fetchall()
        user_ids = [u[0] for u in users_to_delete]
        
        if user_ids:
            # Delete employees of these users
            cursor.execute(f"DELETE FROM employees WHERE user_id IN %s;", (tuple(user_ids),))
            print(f"Deleted demo employee records.")
            
            # Delete the users
            cursor.execute(f"DELETE FROM users WHERE id IN %s;", (tuple(user_ids),))
            print(f"Deleted demo user accounts: {[u[1] for u in users_to_delete]}")
        else:
            print("No demo users to delete.")
            
        # Clean up any employees not linked to remaining admin users
        cursor.execute("SELECT id FROM users WHERE email IN %s;", (keep_emails,))
        admin_user_ids = [u[0] for u in cursor.fetchall()]
        if admin_user_ids:
            cursor.execute("DELETE FROM employees WHERE user_id NOT IN %s OR user_id IS NULL;", (tuple(admin_user_ids),))
            print("Purged remaining non-admin employee profiles.")
            
    except Exception as user_clean_err:
        print(f"Error cleaning users/employees: {user_clean_err}")

    # Re-initialize standard settings or state if needed
    try:
        # Keep portal settings but clear layout preferences to force clean load
        cursor.execute("DELETE FROM portal_settings WHERE key IN ('projects', 'contacts', 'leads', 'invoices');")
        print("Reset workspace layouts to default.")
    except Exception as setting_err:
        print(f"Error resetting portal settings: {setting_err}")

    cursor.close()
    conn.close()
    print("\nPurge completed successfully. All demo data has been removed!")

if __name__ == "__main__":
    purge_database()
