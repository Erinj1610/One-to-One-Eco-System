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
        # Drop order_items and order_items_extended if they exist to refresh types and FKs
        db.execute(text("DROP TABLE IF EXISTS order_items CASCADE;"))
        db.execute(text("DROP TABLE IF EXISTS order_items_extended CASCADE;"))
        db.commit()

        db.execute(text("""
            CREATE TABLE order_items (
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
                stock_on_hand INTEGER
            );
        """))
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Migration warning (order_items recreation): {e}")

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

def sync_projects(projects_dict, db: Session):
    """
    Sync JSON projects dictionary to projects, orders, and order_items tables.
    """
    # 1. Clear existing items and orders linked to synced projects to prevent duplicates
    project_keys = list(projects_dict.keys())
    if not project_keys:
        return

    # Delete existing order items and orders for these project keys
    for p_key in project_keys:
        # Get order IDs
        orders = db.execute(text("SELECT po_number FROM orders WHERE project_key = :p_key"), {"p_key": p_key}).fetchall()
        po_numbers = [o[0] for o in orders if o[0]]
        if po_numbers:
            # Delete order items first
            db.execute(text("DELETE FROM order_items WHERE order_id IN :pos"), {"pos": tuple(po_numbers)})
            db.execute(text("DELETE FROM orders WHERE po_number IN :pos"), {"pos": tuple(po_numbers)})
        db.execute(text("DELETE FROM projects WHERE project_key = :p_key"), {"p_key": p_key})
    db.commit()

    # 2. Insert fresh relational records
    for p_key, p in projects_dict.items():
        client_name = p.get("client")
        client_id = None
        if client_name:
            c_res = db.execute(text("SELECT id FROM clients WHERE name = :name"), {"name": client_name}).first()
            if c_res:
                client_id = c_res[0]

        pm_name = p.get("pm")
        pm_id = None
        if pm_name:
            pm_res = db.execute(text("SELECT id FROM employees WHERE name = :name"), {"name": pm_name}).first()
            if pm_res:
                pm_id = pm_res[0]

        # Insert project
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
        """), {
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
            "target_margin": float(p.get("targetMargin", 0)),
            "actual_margin": float(p.get("actualMargin", 0)),
            "s1": p.get("s1", ""),
            "s2": p.get("s2", ""),
            "s3": p.get("s3", ""),
            "s4": p.get("s4", ""),
            "s5": p.get("s5", "")
        })
        
        # Get the inserted project ID
        p_res = db.execute(text("SELECT id FROM projects WHERE project_key = :p_key"), {"p_key": p_key}).first()
        proj_id = p_res[0] if p_res else None

        # Insert nested orders and items
        orders_list = p.get("orders", [])
        for order in orders_list:
            po_number = order.get("id")
            if not po_number:
                continue

            db.execute(text("""
                INSERT INTO orders (
                    project_id, project_key, po_number, supplier_name, 
                    items_count, value, paid, outstanding, status, eta
                ) VALUES (
                    :project_id, :project_key, :po_number, :supplier_name,
                    :items_count, :value, :paid, :outstanding, :status, :eta
                )
            """), {
                "project_id": proj_id,
                "project_key": p_key,
                "po_number": po_number,
                "supplier_name": order.get("supplier"),
                "items_count": int(order.get("items", 0)),
                "value": float(order.get("value", 0)),
                "paid": float(order.get("paid", 0)),
                "outstanding": float(order.get("outstanding", 0)),
                "status": order.get("status", "Pending"),
                "eta": order.get("eta", "—")
            })

            # Insert itemsList
            items = order.get("itemsList", [])
            for item in items:
                item_id = item.get("id")
                if not item_id:
                    continue

                db.execute(text("""
                    INSERT INTO order_items (
                        id, order_id, qty, type, one_one_code, code, description,
                        floor, area, dimming, brand, supplier, unit_cost, unit_trade,
                        unit_retail, selection, stock_status, eta, po_ref, po_qty_ordered,
                        po_eta, invoice_qty, po_supplier, po_date, received_qty, received_date,
                        invoice_ref, invoice_date, invoice_value, delivery_qty, delivery_date,
                        delivery_status, delivery_history, stock_on_hand
                    ) VALUES (
                        :id, :order_id, :qty, :type, :one_one_code, :code, :description,
                        :floor, :area, :dimming, :brand, :supplier, :unit_cost, :unit_trade,
                        :unit_retail, :selection, :stock_status, :eta, :po_ref, :po_qty_ordered,
                        :po_eta, :invoice_qty, :po_supplier, :po_date, :received_qty, :received_date,
                        :invoice_ref, :invoice_date, :invoice_value, :delivery_qty, :delivery_date,
                        :delivery_status, :delivery_history, :stock_on_hand
                    )
                """), {
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
                    "unit_cost": float(item.get("unitCost", 0)),
                    "unit_trade": float(item.get("unitTrade", 0)),
                    "unit_retail": float(item.get("unitRetail", 0)),
                    "selection": item.get("selection"),
                    "stock_status": item.get("stockStatus"),
                    "eta": item.get("eta"),
                    "po_ref": item.get("poRef"),
                    "po_qty_ordered": int(item.get("poQtyOrdered", 0)),
                    "po_eta": item.get("poEta"),
                    "invoice_qty": int(item.get("invoiceQty", 0)),
                    "po_supplier": item.get("poSupplier"),
                    "po_date": item.get("poDate"),
                    "received_qty": int(item.get("receivedQty", 0)),
                    "received_date": item.get("receivedDate"),
                    "invoice_ref": item.get("invoiceRef"),
                    "invoice_date": item.get("invoiceDate"),
                    "invoice_value": float(item.get("invoiceValue", 0)),
                    "delivery_qty": int(item.get("deliveryQty", 0)),
                    "delivery_date": item.get("deliveryDate"),
                    "delivery_status": item.get("deliveryStatus"),
                    "delivery_history": json.dumps(item.get("deliveryHistory", [])),
                    "stock_on_hand": int(item.get("stockOnHand", 0))
                })
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
            VALUES (NULL, :project_id, 'Product Supply', :status, :amount)
        """), {
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
