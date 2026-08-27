import sys
from sqlalchemy import create_engine, MetaData, Table, text

prod_url = 'postgresql://postgres:%40Erinj21610@34.42.254.202/One-to-One-Portal-Database'
staging_url = 'postgresql://postgres:%40Erinj21610@34.42.254.202/one_to_one_staging_db'

prod_eng = create_engine(prod_url)
staging_eng = create_engine(staging_url)

prod_meta = MetaData()
prod_meta.reflect(bind=prod_eng)

staging_meta = MetaData()
staging_meta.reflect(bind=staging_eng)

# Order of table sync to respect foreign key constraints
tables_sync_order = [
    'users',
    'roles',
    'role_permissions',
    'suppliers',
    'clients',
    'employees',
    'leave_types',
    'leave_requests',
    'leave_balances',
    'staff_self_assessments',
    'pulse_surveys',
    'wellbeing_checkins',
    'lookup_values',
    'template_configs',
    'project_templates',
    'template_fields',
    'template_phases',
    'portal_settings',
    'contacts',
    'leads',
    'products',
    'product_accessories',
    'product_audit_logs',
    'product_files',
    'projects',
    'project_folders',
    'project_phases',
    'project_field_values',
    'project_tickets',
    'design_fees',
    'proposals',
    'quotes',
    'boqs',
    'boq_items',
    'invoices',
    'orders',
    'order_items',
    'order_documents',
    'payments',
    'time_logs',
    'support_tickets',
    'deployment_revisions'
]

print("--- STARTING PROD TO STAGING FULL SYNC ---")

with staging_eng.connect() as s_conn:
    # 1. Truncate staging tables in reverse order
    for t_name in reversed(tables_sync_order):
        if t_name in staging_meta.tables:
            try:
                s_conn.execute(text(f'TRUNCATE TABLE "{t_name}" CASCADE;'))
                s_conn.commit()
            except Exception as e:
                print(f"Warning truncating {t_name}: {e}")

    # 2. Copy each table data from Prod to Staging
    with prod_eng.connect() as p_conn:
        for t_name in tables_sync_order:
            if t_name not in prod_meta.tables or t_name not in staging_meta.tables:
                continue
            
            p_table = prod_meta.tables[t_name]
            s_table = staging_meta.tables[t_name]
            
            rows = p_conn.execute(p_table.select()).mappings().all()
            if not rows:
                continue
            
            data = [dict(r) for r in rows]
            
            # Special two-pass insert for self-referential project_folders table
            if t_name == 'project_folders':
                # Pass 1: Insert all folders with parent_id = None
                pass1_data = [{k: (None if k == 'parent_id' else v) for k, v in row.items()} for row in data]
                chunk_size = 500
                for i in range(0, len(pass1_data), chunk_size):
                    chunk = pass1_data[i:i+chunk_size]
                    s_conn.execute(s_table.insert(), chunk)
                    s_conn.commit()
                
                # Pass 2: Update parent_id for rows that have parents
                for row in data:
                    if row.get('parent_id') is not None:
                        s_conn.execute(
                            s_table.update().where(s_table.c.id == row['id']).values(parent_id=row['parent_id'])
                        )
                s_conn.commit()
                print(f"[OK] Synced {t_name}: {len(data)} rows (two-pass hierarchy)")
            else:
                chunk_size = 500
                for i in range(0, len(data), chunk_size):
                    chunk = data[i:i+chunk_size]
                    s_conn.execute(s_table.insert(), chunk)
                    s_conn.commit()
                
                print(f"[OK] Synced {t_name}: {len(data)} rows")

    # 3. Fix sequence IDs if postgres serials are used
    for t_name in tables_sync_order:
        if t_name in staging_meta.tables:
            try:
                s_conn.execute(text(f"""
                    SELECT setval(pg_get_serial_sequence('"{t_name}"', 'id'), 
                                  COALESCE((SELECT MAX(id) FROM "{t_name}"), 1), 
                                  true)
                    WHERE pg_get_serial_sequence('"{t_name}"', 'id') IS NOT NULL;
                """))
                s_conn.commit()
            except Exception:
                pass

print("\n--- FULL SYNC COMPLETED SUCCESSFULLY ---")
