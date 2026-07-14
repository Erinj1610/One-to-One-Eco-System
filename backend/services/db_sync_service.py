import json
from sqlalchemy import text
from sqlalchemy.orm import Session

def run_migrations(db: Session):
    """
    Ensure the relational tables have the required columns for full operational sync.
    """
    # 1. Alter projects table to add needed columns
    proj_columns = [
        ("project_key", "VARCHAR"),
        ("client_name", "VARCHAR"),
        ("pm_name", "VARCHAR"),
        ("target_margin", "FLOAT"),
        ("actual_margin", "FLOAT"),
        ("offering", "VARCHAR"),
        ("sqm", "VARCHAR"),
        ("status", "VARCHAR"),
        ("deadline", "VARCHAR"),
        ("days_left", "VARCHAR"),
        ("complete_status", "VARCHAR"),
        ("s1", "VARCHAR"),
        ("s2", "VARCHAR"),
        ("s3", "VARCHAR"),
        ("s4", "VARCHAR"),
        ("s5", "VARCHAR")
    ]
    for col_name, col_type in proj_columns:
        try:
            db.execute(text(f"ALTER TABLE projects ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Migration warning (projects.{col_name}): {e}")

    # 2. Recreate order_items table with expanded columns matching spreadsheet items list
    try:
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS order_items (
                id VARCHAR PRIMARY KEY,
                order_id VARCHAR,
                qty INTEGER,
                type VARCHAR,
                one_one_code VARCHAR,
                code VARCHAR,
                description TEXT,
                floor VARCHAR,
                area VARCHAR,
                dimming VARCHAR,
                brand VARCHAR,
                supplier VARCHAR,
                unit_cost FLOAT,
                unit_trade FLOAT,
                unit_retail FLOAT,
                selection VARCHAR,
                stock_status VARCHAR,
                eta VARCHAR,
                po_ref VARCHAR,
                po_qty_ordered INTEGER,
                po_eta VARCHAR,
                invoice_qty INTEGER,
                po_supplier VARCHAR,
                po_date VARCHAR,
                received_qty INTEGER,
                received_date VARCHAR,
                invoice_ref VARCHAR,
                invoice_date VARCHAR,
                invoice_value FLOAT,
                delivery_qty INTEGER,
                delivery_date VARCHAR,
                delivery_status VARCHAR,
                delivery_history JSON,
                stock_on_hand INTEGER,
                is_credit BOOLEAN DEFAULT 0
            );
        """))
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Migration warning (order_items recreation): {e}")

    try:
        from sqlalchemy import inspect
        inspector = inspect(db.bind)
        cols = [c['name'] for c in inspector.get_columns('order_items')]
        if 'is_credit' not in cols:
            db.execute(text("ALTER TABLE order_items ADD COLUMN is_credit BOOLEAN DEFAULT FALSE;"))
            db.commit()
            print("Successfully migrated: ensured is_credit column exists on order_items table.")
    except Exception as e:
        db.rollback()
        print(f"Migration warning (order_items.is_credit alter): {e}")

    # 3. Alter orders table to support po_number, etc.
    order_columns = [
        ("po_number", "VARCHAR UNIQUE"),
        ("supplier_name", "VARCHAR"),
        ("items_count", "INTEGER"),
        ("value", "FLOAT"),
        ("paid", "FLOAT"),
        ("outstanding", "FLOAT"),
        ("status", "VARCHAR"),
        ("eta", "VARCHAR"),
        ("project_key", "VARCHAR")
    ]
    for col_name, col_type in order_columns:
        try:
            db.execute(text(f"ALTER TABLE orders ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Migration warning (orders.{col_name}): {e}")

    # 4. Alter clients table to support type, last_project_date, etc.
    client_columns = [
        ("type", "VARCHAR"),
        ("last_project_date", "VARCHAR"),
        ("last_contact_date", "VARCHAR"),
        ("last_contact_summary", "VARCHAR"),
        ("stated_goal", "VARCHAR"),
        ("annual_revenue", "FLOAT"),
        ("order_gap_months", "INTEGER"),
        ("date_started", "VARCHAR"),
        ("avg_payment_delay_days", "INTEGER")
    ]
    for col_name, col_type in client_columns:
        try:
            db.execute(text(f"ALTER TABLE clients ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Migration warning (clients.{col_name}): {e}")

def sync_contacts(contacts_list, db: Session):
    """
    Sync JSON contacts to clients and contacts tables.
    """
    for c in contacts_list:
        client_name = c.get("name") or c.get("company")
        if not client_name:
            continue
        # Check client
        res = db.execute(text("SELECT id FROM clients WHERE name = :name"), {"name": client_name}).first()
        if res:
            client_id = res[0]
            db.execute(text("""
                UPDATE clients SET 
                    company = :company, email = :email, phone = :phone, 
                    status = :status, nps = :nps, lifetime_revenue = :lifetime_revenue,
                    type = :type, last_project_date = :last_project_date,
                    last_contact_date = :last_contact_date, last_contact_summary = :last_contact_summary,
                    stated_goal = :stated_goal, annual_revenue = :annual_revenue,
                    order_gap_months = :order_gap_months, date_started = :date_started,
                    avg_payment_delay_days = :avg_payment_delay_days
                WHERE id = :id
            """), {
                "id": client_id,
                "company": c.get("company"),
                "email": c.get("email"),
                "phone": c.get("phone"),
                "status": c.get("status", "Active"),
                "nps": c.get("nps"),
                "lifetime_revenue": c.get("lifetimeRevenue", 0),
                "type": c.get("type"),
                "last_project_date": c.get("lastProjectDate"),
                "last_contact_date": c.get("lastContactDate"),
                "last_contact_summary": c.get("lastContactSummary"),
                "stated_goal": c.get("statedGoal"),
                "annual_revenue": float(c.get("annualRevenue", 0) or 0),
                "order_gap_months": c.get("orderGapMonths"),
                "date_started": c.get("dateStarted"),
                "avg_payment_delay_days": c.get("avgPaymentDelayDays")
            })
        else:
            db.execute(text("""
                INSERT INTO clients (
                    name, company, email, phone, status, nps, lifetime_revenue,
                    type, last_project_date, last_contact_date, last_contact_summary,
                    stated_goal, annual_revenue, order_gap_months, date_started,
                    avg_payment_delay_days
                ) VALUES (
                    :name, :company, :email, :phone, :status, :nps, :lifetime_revenue,
                    :type, :last_project_date, :last_contact_date, :last_contact_summary,
                    :stated_goal, :annual_revenue, :order_gap_months, :date_started,
                    :avg_payment_delay_days
                )
            """), {
                "name": client_name,
                "company": c.get("company"),
                "email": c.get("email"),
                "phone": c.get("phone"),
                "status": c.get("status", "Active"),
                "nps": c.get("nps"),
                "lifetime_revenue": c.get("lifetimeRevenue", 0),
                "type": c.get("type"),
                "last_project_date": c.get("lastProjectDate"),
                "last_contact_date": c.get("lastContactDate"),
                "last_contact_summary": c.get("lastContactSummary"),
                "stated_goal": c.get("statedGoal"),
                "annual_revenue": float(c.get("annualRevenue", 0) or 0),
                "order_gap_months": c.get("orderGapMonths"),
                "date_started": c.get("dateStarted"),
                "avg_payment_delay_days": c.get("avgPaymentDelayDays")
            })
    db.commit()

def sync_project_managers(pm_list, db: Session):
    """
    Sync JSON project managers to employees table.
    """
    for pm in pm_list:
        name = pm.get("name")
        if not name:
            continue
        res = db.execute(text("SELECT id FROM employees WHERE name = :name"), {"name": name}).first()
        if not res:
            db.execute(text("""
                INSERT INTO employees (name, role, department, start_date)
                VALUES (:name, 'Project Manager', 'Design', NULL)
            """), {"name": name})
    db.commit()

def bulk_insert_rows(table_name, rows, db):
    if not rows:
        return
    columns = list(rows[0].keys())
    col_str = ", ".join(columns)
    
    val_clauses = []
    params = {}
    for idx, row in enumerate(rows):
        row_clauses = []
        for col in columns:
            param_key = f"{col}_{idx}"
            row_clauses.append(f":{param_key}")
            params[param_key] = row[col]
        val_clauses.append(f"({', '.join(row_clauses)})")
        
    query_str = f"INSERT INTO {table_name} ({col_str}) VALUES {', '.join(val_clauses)}"
    db.execute(text(query_str), params)

def sync_projects(projects_dict, db: Session):
    """
    Sync JSON projects dictionary to projects, orders, and order_items tables.
    """
    # 1. Clear existing items and orders linked to synced projects to prevent duplicates
    project_keys = list(projects_dict.keys())
    if not project_keys:
        return

    # Delete existing order items and orders for these project keys in bulk
    orders = db.execute(text("SELECT po_number FROM orders WHERE project_key IN :keys"), {"keys": tuple(project_keys)}).fetchall()
    po_numbers = [o[0] for o in orders if o[0]]
    if po_numbers:
        # Delete order items first
        db.execute(text("DELETE FROM order_items WHERE order_id IN :pos"), {"pos": tuple(po_numbers)})
        db.execute(text("DELETE FROM orders WHERE po_number IN :pos"), {"pos": tuple(po_numbers)})
    db.commit()

    # Pre-fetch clients and employees to prevent N+1 queries
    clients = db.execute(text("SELECT id, name FROM clients")).fetchall()
    client_map = {row[1]: row[0] for row in clients if row[1]}

    employees = db.execute(text("SELECT id, name FROM employees")).fetchall()
    employee_map = {row[1]: row[0] for row in employees if row[1]}

    # Check which projects exist already
    existing_p_keys = {row[0] for row in db.execute(text("SELECT project_key FROM projects WHERE project_key IN :keys"), {"keys": tuple(project_keys)}).fetchall()}

    projects_to_insert = []
    projects_to_update = []

    # 2. Prepare bulk insert/update of projects
    for p_key, p in projects_dict.items():
        client_name = p.get("client")
        client_id = client_map.get(client_name) if client_name else None

        pm_name = p.get("pm")
        pm_id = employee_map.get(pm_name) if pm_name else None

        proj_params = {
            "name": p.get("name", p_key),
            "project_key": p_key,
            "client_id": client_id,
            "client_name": client_name,
            "pm_id": pm_id,
            "pm_name": pm_name,
            "offering": p.get("offering"),
            "sqm": str(p.get("sqm", "0")),
            "status": p.get("status", "On track"),
            "deadline": p.get("deadline", "TBD"),
            "complete_status": p.get("complete", "Ongoing"),
            "target_margin": float(p.get("targetMargin", 0) or 0),
            "actual_margin": float(p.get("actualMargin", 0) or 0),
            "s1": p.get("s1", ""),
            "s2": p.get("s2", ""),
            "s3": p.get("s3", ""),
            "s4": p.get("s4", ""),
            "s5": p.get("s5", "")
        }

        if p_key in existing_p_keys:
            projects_to_update.append(proj_params)
        else:
            projects_to_insert.append(proj_params)

    # Perform projects insertion/updates
    if projects_to_insert:
        db.execute(text("""
            INSERT INTO projects (
                name, project_key, client_id, client_name, pm_id, pm_name, 
                offering, sqm, status, deadline, complete_status,
                target_margin, actual_margin, s1, s2, s3, s4, s5
            ) VALUES (
                :name, :project_key, :client_id, :client_name, :pm_id, :pm_name,
                :offering, :sqm, :status, :deadline, :complete_status,
                :target_margin, :actual_margin, :s1, :s2, :s3, :s4, :s5
            )
        """), projects_to_insert)

    if projects_to_update:
        db.execute(text("""
            UPDATE projects SET
                name = :name,
                client_id = :client_id,
                client_name = :client_name,
                pm_id = :pm_id,
                pm_name = :pm_name,
                offering = :offering,
                sqm = :sqm,
                status = :status,
                deadline = :deadline,
                complete_status = :complete_status,
                target_margin = :target_margin,
                actual_margin = :actual_margin,
                s1 = :s1,
                s2 = :s2,
                s3 = :s3,
                s4 = :s4,
                s5 = :s5
            WHERE project_key = :project_key
        """), projects_to_update)

    db.commit()

    # Re-query projects map to get IDs for nested orders
    proj_db_map = {row[1]: row[0] for row in db.execute(text("SELECT id, project_key FROM projects WHERE project_key IN :keys"), {"keys": tuple(project_keys)}).fetchall()}

    orders_to_insert = []
    order_items_to_insert = []

    # 3. Build orders and items lists
    for p_key, p in projects_dict.items():
        proj_id = proj_db_map.get(p_key)
        orders_list = p.get("orders", [])
        
        for order in orders_list:
            po_number = order.get("id")
            if not po_number:
                continue

            orders_to_insert.append({
                "project_id": proj_id,
                "project_key": p_key,
                "po_number": po_number,
                "supplier_name": order.get("supplier"),
                "items_count": int(order.get("items", 0)),
                "value": float(order.get("value", 0) or 0),
                "paid": float(order.get("paid", 0) or 0),
                "outstanding": float(order.get("outstanding", 0) or 0),
                "status": order.get("status", "Pending"),
                "eta": order.get("eta", "—")
            })

            items = order.get("itemsList", [])
            for item in items:
                item_id = item.get("id")
                if not item_id:
                    continue

                order_items_to_insert.append({
                    "id": item_id,
                    "order_id": po_number,
                    "qty": int(item.get("qty", 0)),
                    "type": item.get("type"),
                    "one_one_code": item.get("oneOneCode"),
                    "code": item.get("code"),
                    "description": item.get("description"),
                    "floor": item.get("floor"),
                    "area": item.get("area"),
                    "dimming": item.get("dimming"),
                    "brand": item.get("brand"),
                    "supplier": item.get("supplier"),
                    "unit_cost": float(item.get("unitCost", 0) or 0),
                    "unit_trade": float(item.get("unitTrade", 0) or 0),
                    "unit_retail": float(item.get("unitRetail", 0) or 0),
                    "selection": item.get("selection"),
                    "stock_status": item.get("stockStatus"),
                    "eta": item.get("eta"),
                    "po_ref": item.get("po_ref") or item.get("poRef"), # support both naming styles
                    "po_qty_ordered": int(item.get("po_qty_ordered") or item.get("poQtyOrdered") or 0),
                    "po_eta": item.get("po_eta") or item.get("poEta"),
                    "invoice_qty": int(item.get("invoice_qty") or item.get("invoiceQty") or 0),
                    "po_supplier": item.get("po_supplier") or item.get("poSupplier"),
                    "po_date": item.get("po_date") or item.get("poDate"),
                    "received_qty": int(item.get("received_qty") or item.get("receivedQty") or 0),
                    "received_date": item.get("received_date") or item.get("receivedDate"),
                    "invoice_ref": item.get("invoice_ref") or item.get("invoiceRef"),
                    "invoice_date": item.get("invoice_date") or item.get("invoiceDate"),
                    "invoice_value": float(item.get("invoice_value") or item.get("invoiceValue") or 0),
                    "delivery_qty": int(item.get("deliveryQty", 0)),
                    "delivery_date": item.get("deliveryDate"),
                    "delivery_status": item.get("deliveryStatus"),
                    "delivery_history": json.dumps(item.get("deliveryHistory", [])),
                    "stock_on_hand": int(item.get("stockOnHand", 0))
                })

    # Bulk insert orders using optimized multi-row insert helper
    if orders_to_insert:
        bulk_insert_rows("orders", orders_to_insert, db)

    # Bulk insert order items using optimized multi-row insert helper in chunks of 500
    if order_items_to_insert:
        CHUNK_SIZE = 500
        for i in range(0, len(order_items_to_insert), CHUNK_SIZE):
            chunk = order_items_to_insert[i:i + CHUNK_SIZE]
            bulk_insert_rows("order_items", chunk, db)
            db.commit()

    db.commit()


def sync_invoices(invoices_list, db: Session):
    """
    Sync JSON invoices to invoices table.
    """
    db.execute(text("DELETE FROM invoices"))
    db.commit()

    for inv in invoices_list:
        project_name = inv.get("project")
        
        proj_id = None
        if project_name:
            p_res = db.execute(text("SELECT id FROM projects WHERE name = :name"), {"name": project_name}).first()
            if p_res:
                proj_id = p_res[0]

        amount_str = inv.get("amount", "0")
        amount_val = 0.0
        try:
            amount_val = float(amount_str.replace("R", "").replace(",", "").strip())
        except Exception:
            pass

        db.execute(text("""
            INSERT INTO invoices (id, project_id, invoice_type, status, amount)
            VALUES (:id, :project_id, 'Product Supply', :status, :amount)
        """), {
            "id": inv.get("id"),
            "project_id": proj_id,
            "status": inv.get("status", "Draft"),
            "amount": amount_val
        })
    db.commit()

def sync_key_to_relational(key: str, value, db: Session):
    """
    Route synchronization depending on which setting key is saved.
    """
    run_migrations(db)
    
    if key == "contacts":
        sync_contacts(value, db)
    elif key == "projectManagers":
        sync_project_managers(value, db)
    elif key == "projects":
        sync_projects(value, db)
    elif key == "invoices":
        sync_invoices(value, db)
