import os
import time
import logging
from typing import Dict, Any, List
from sqlalchemy import create_engine, MetaData, Table, text
from database.cloud_sql import clean_database_url

logger = logging.getLogger("db_sync")

# Canonical order of tables to respect foreign keys during truncation & copy
TABLES_SYNC_ORDER = [
    'roles',
    'users',
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
    'procurement_allocations',
    'order_payment_allocations',
    'palladium_po_lines',
    'palladium_grn_lines',
    'palladium_invoice_lines',
    'palladium_payments'
]

def get_connection_urls() -> tuple[str, str]:
    """
    Resolves Production and Staging Cloud SQL URLs across Cloud Run (Unix socket)
    and external environments.
    """
    # Cloud Run Unix socket URLs
    socket_prod = "postgresql+psycopg2://postgres:%40Erinj21610@/One-to-One-Portal-Database?host=/cloudsql/one-to-one-portal-500205:us-central1:one-to-one-portal"
    socket_staging = "postgresql+psycopg2://postgres:%40Erinj21610@/one_to_one_staging_db?host=/cloudsql/one-to-one-portal-500205:us-central1:one-to-one-portal"

    # Public IP fallbacks
    ip_prod = "postgresql://postgres:%40Erinj21610@34.42.254.202/One-to-One-Portal-Database"
    ip_staging = "postgresql://postgres:%40Erinj21610@34.42.254.202/one_to_one_staging_db"

    # If running inside Cloud Run or Cloud SQL socket exists
    if os.path.exists("/cloudsql/one-to-one-portal-500205:us-central1:one-to-one-portal"):
        return socket_prod, socket_staging
    
    # Check if DATABASE_URL in env contains socket
    curr_env = os.getenv("DATABASE_URL", "")
    if "cloudsql" in curr_env:
        return socket_prod, socket_staging
        
    return clean_database_url(ip_prod), clean_database_url(ip_staging)


def clone_prod_db_to_staging() -> Dict[str, Any]:
    """
    Clones live Production database tables into the Staging database safely:
    1. Connects to both Prod and Staging inside Google Cloud SQL.
    2. Truncates Staging tables in reverse FK order.
    3. Bulk-copies all rows from Prod to Staging.
    4. Handles self-referential hierarchies (project_folders).
    5. Resets all PostgreSQL sequence IDs in Staging.
    """
    start_time = time.time()
    prod_url, staging_url = get_connection_urls()

    logger.info("Connecting to Cloud SQL instances for database replication...")
    prod_eng = create_engine(prod_url, pool_pre_ping=True)
    staging_eng = create_engine(staging_url, pool_pre_ping=True)

    prod_meta = MetaData()
    prod_meta.reflect(bind=prod_eng)

    staging_meta = MetaData()
    staging_meta.reflect(bind=staging_eng)

    tables_copied = []
    total_rows = 0

    with staging_eng.connect() as s_conn:
        # 1. Truncate staging tables in reverse FK order
        for t_name in reversed(TABLES_SYNC_ORDER):
            if t_name in staging_meta.tables:
                try:
                    s_conn.execute(text(f'TRUNCATE TABLE "{t_name}" CASCADE;'))
                    s_conn.commit()
                except Exception as tr_err:
                    logger.warning(f"Notice truncating {t_name}: {tr_err}")

        # 2. Copy each table from Prod to Staging
        with prod_eng.connect() as p_conn:
            for t_name in TABLES_SYNC_ORDER:
                if t_name not in prod_meta.tables or t_name not in staging_meta.tables:
                    continue

                p_table = prod_meta.tables[t_name]
                s_table = staging_meta.tables[t_name]

                rows = p_conn.execute(p_table.select()).mappings().all()
                if not rows:
                    continue

                data = [dict(r) for r in rows]

                # Self-referential hierarchy handling for project_folders
                if t_name == 'project_folders':
                    pass1_data = [{k: (None if k == 'parent_id' else v) for k, v in row.items()} for row in data]
                    chunk_size = 500
                    for i in range(0, len(pass1_data), chunk_size):
                        chunk = pass1_data[i:i+chunk_size]
                        s_conn.execute(s_table.insert(), chunk)
                        s_conn.commit()

                    for row in data:
                        if row.get('parent_id') is not None:
                            s_conn.execute(
                                s_table.update().where(s_table.c.id == row['id']).values(parent_id=row['parent_id'])
                            )
                    s_conn.commit()
                else:
                    chunk_size = 500
                    for i in range(0, len(data), chunk_size):
                        chunk = data[i:i+chunk_size]
                        s_conn.execute(s_table.insert(), chunk)
                        s_conn.commit()

                tables_copied.append({"table": t_name, "rows": len(data)})
                total_rows += len(data)

        # 3. Reset all PostgreSQL sequences in Staging
        seqs = s_conn.execute(text("""
            SELECT 
                table_name, 
                column_name, 
                column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND column_default LIKE 'nextval%'
        """)).fetchall()

        for tbl, col, default_val in seqs:
            try:
                seq_name = default_val.split("'")[1]
                max_id = s_conn.execute(text(f'SELECT COALESCE(MAX("{col}"), 0) FROM "{tbl}"')).scalar()
                target_val = max(1, max_id)
                s_conn.execute(text(f"SELECT setval('{seq_name}', {target_val}, true)"))
            except Exception as seq_err:
                logger.warning(f"Sequence reset notice for {tbl}.{col}: {seq_err}")
        s_conn.commit()

    duration = round(time.time() - start_time, 2)
    return {
        "status": "success",
        "message": f"Successfully cloned Production database into Staging! Replicated {total_rows} rows across {len(tables_copied)} tables in {duration}s.",
        "duration_seconds": duration,
        "tables_copied_count": len(tables_copied),
        "total_rows_replicated": total_rows,
        "details": tables_copied
    }
