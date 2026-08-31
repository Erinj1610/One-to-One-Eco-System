from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import sys
import asyncio

# Fix for "NotImplementedError" on Windows when using subprocesses (common with Google Auth)
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# Import routers
from routes.projects import router as projects_router
from routes.admin import router as admin_router
from routes.documents import router as documents_router
from routes.hr import router as hr_router
from routes.settings import router as settings_router
from routes.users import router as users_router
from routes.products import router as products_router, public_router as products_public_router
from routes.lookups import router as lookups_router
from routes.orders import router as orders_router
from routes.deployments import router as deployments_router
from routes.audit_comparison import router as audit_comparison_router
from routes.project_tickets import router as project_tickets_router
from routes.clients import router as clients_router
from routes.palladium import router as palladium_router, public_router as palladium_public_router
from routes.procurement import router as procurement_router, public_router as procurement_public_router
from routes.invoicing import router as invoicing_router, public_router as invoicing_public_router
import services.firebase_auth

app = FastAPI(title="One to One Eco System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ejportal.vercel.app",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_origin_regex="https://.*\\.vercel\\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Backend is running"}

import traceback
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_tb = traceback.format_exc()
    print(f"CRITICAL BACKEND ERROR: {error_tb}")
    response = JSONResponse(
        status_code=500,
        content={"detail": f"Backend Error: {str(exc)}", "trace": error_tb}
    )
    # Ensure CORS headers are attached to the error response
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

from services.firebase_auth import verify_firebase_token

app.include_router(projects_router, prefix="/api/projects", tags=["projects"], dependencies=[Depends(verify_firebase_token)])
app.include_router(orders_router, prefix="/api/orders", tags=["orders"], dependencies=[Depends(verify_firebase_token)])
app.include_router(admin_router, prefix="/admin", tags=["admin"], dependencies=[Depends(verify_firebase_token)])
app.include_router(documents_router, prefix="/api/documents", tags=["documents"], dependencies=[Depends(verify_firebase_token)])
app.include_router(hr_router, prefix="/api/hr", tags=["hr"], dependencies=[Depends(verify_firebase_token)])
app.include_router(settings_router, prefix="/api", tags=["settings"], dependencies=[Depends(verify_firebase_token)])
app.include_router(users_router, prefix="/admin/users", tags=["users"])
app.include_router(products_public_router, prefix="/api/products", tags=["products"])
app.include_router(products_router, prefix="/api/products", tags=["products"])
app.include_router(lookups_router, prefix="/api/lookups", tags=["lookups"])
app.include_router(deployments_router, prefix="/api/admin", tags=["deployments"])
app.include_router(audit_comparison_router, prefix="/api/admin", tags=["audit-comparison"])
app.include_router(project_tickets_router, prefix="/api/project-tickets", tags=["project-tickets"])
app.include_router(clients_router, prefix="/api/clients", tags=["clients"])
app.include_router(palladium_router, prefix="/api", tags=["palladium"])
app.include_router(palladium_public_router, prefix="/api", tags=["palladium"])
app.include_router(procurement_router, prefix="/api", tags=["procurement"])
app.include_router(procurement_public_router, prefix="/api", tags=["procurement"])
app.include_router(invoicing_router, prefix="/api", tags=["invoicing"])
app.include_router(invoicing_public_router, prefix="/api", tags=["invoicing"])

# Mount uploads static directory
from fastapi.staticfiles import StaticFiles
import os
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

def init_db():
    from database.cloud_sql import engine, Base, SessionLocal
    from models.orm_models import Project, ProjectFolder, Product, ProductFile, Supplier, LookupValue, PalladiumPOLine, PalladiumGRNLine, ProcurementAllocation
    try:
        Base.metadata.create_all(bind=engine)
        
        # Run migration to add disabled column if it doesn't exist
        from sqlalchemy import text, inspect
        try:
            with engine.connect() as conn:
                inspector = inspect(engine)
                user_cols = [c['name'] for c in inspector.get_columns('users')]
                if 'disabled' not in user_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN disabled BOOLEAN DEFAULT FALSE;"))
                    conn.commit()
                print("Database migration: ensured 'disabled' column exists on 'users' table.")
                
                # Migrate orders table to ensure quote_name exists, migrate metadata, then drop order_metadata
                try:
                    order_cols = [c['name'] for c in inspector.get_columns('orders')]
                    if 'quote_name' not in order_cols:
                        conn.execute(text("ALTER TABLE orders ADD COLUMN quote_name VARCHAR DEFAULT 'General Spec';"))
                        conn.commit()
                        
                        # Migrate values from order_metadata JSON column if it exists in the table
                        if 'order_metadata' in order_cols:
                            db_type = engine.name
                            if db_type == 'sqlite':
                                conn.execute(text("""
                                    UPDATE orders 
                                    SET quote_name = COALESCE(
                                        json_extract(order_metadata, '$.quoteName'),
                                        json_extract(order_metadata, '$.quote_name'),
                                        'General Spec'
                                    );
                                """))
                            else:
                                conn.execute(text("""
                                    UPDATE orders 
                                    SET quote_name = COALESCE(
                                        order_metadata->>'quoteName',
                                        order_metadata->>'quote_name',
                                        'General Spec'
                                    );
                                """))
                            conn.commit()
                        print("Database migration: created 'quote_name' column and migrated metadata.")
                    
                    # Ensure design_fees table exists
                    try:
                        tables = inspector.get_table_names()
                        if 'design_fees' not in tables:
                            from models.orm_models import DesignFee
                            DesignFee.__table__.create(bind=engine, checkfirst=True)
                            print("Database migration: created 'design_fees' table.")
                    except Exception as df_err:
                        print(f"Design fee table migration notice: {df_err}")

                    # Ensure clients table has activities column
                    try:
                        if 'clients' in inspector.get_table_names():
                            client_cols = [c['name'] for c in inspector.get_columns('clients')]
                            if 'activities' not in client_cols:
                                conn.execute(text("ALTER TABLE clients ADD COLUMN activities JSON DEFAULT '[]';"))
                                conn.commit()
                                print("Database migration: created 'activities' column on 'clients' table.")
                    except Exception as cl_err:
                        print(f"Clients table migration notice: {cl_err}")
                    
                    # Drop order_metadata column if it exists
                    order_cols_refresh = [c['name'] for c in inspector.get_columns('orders')]
                    if 'order_metadata' in order_cols_refresh:
                        db_type = engine.name
                        if db_type != 'sqlite':
                            conn.execute(text("ALTER TABLE orders DROP COLUMN order_metadata;"))
                            conn.commit()
                            print("Database migration: dropped redundant 'order_metadata' column.")
                except Exception as alter_err:
                    print(f"Database migration quote_name (info/critical): {alter_err}")
                
                # Migrate template_configs table to ensure docx_binary exists
                try:
                    db_type = engine.name
                    if db_type == 'sqlite':
                        conn.execute(text("ALTER TABLE template_configs ADD COLUMN docx_binary BLOB;"))
                    else:
                        conn.execute(text("ALTER TABLE template_configs ADD COLUMN IF NOT EXISTS docx_binary BYTEA;"))
                    conn.commit()
                    print("Database migration: ensured 'docx_binary' column exists on 'template_configs' table.")
                except Exception as alter_err:
                    print(f"Database migration (non-critical info): {alter_err}")
                
                # Migrate template_configs table to ensure html_content exists
                try:
                    db_type = engine.name
                    if db_type == 'sqlite':
                        conn.execute(text("ALTER TABLE template_configs ADD COLUMN html_content TEXT;"))
                    else:
                        conn.execute(text("ALTER TABLE template_configs ADD COLUMN IF NOT EXISTS html_content TEXT;"))
                    conn.commit()
                    print("Database migration: ensured 'html_content' column exists on 'template_configs' table.")
                except Exception as alter_err:
                    print(f"Database migration (non-critical info): {alter_err}")
                
                # Migrate template_configs table to ensure xlsx_binary exists
                try:
                    db_type = engine.name
                    if db_type == 'sqlite':
                        conn.execute(text("ALTER TABLE template_configs ADD COLUMN xlsx_binary BLOB;"))
                    else:
                        conn.execute(text("ALTER TABLE template_configs ADD COLUMN IF NOT EXISTS xlsx_binary BYTEA;"))
                    conn.commit()
                    print("Database migration: ensured 'xlsx_binary' column exists on 'template_configs' table.")
                except Exception as alter_err:
                    print(f"Database migration xlsx_binary (non-critical info): {alter_err}")
                
                # Migrate order_items table to ensure is_credit and sort_order exist
                try:
                    order_item_cols = [c['name'] for c in inspector.get_columns('order_items')]
                    if 'is_credit' not in order_item_cols:
                        try:
                            conn.execute(text("ALTER TABLE order_items ADD COLUMN is_credit BOOLEAN DEFAULT FALSE;"))
                            conn.commit()
                        except Exception: pass
                    if 'sort_order' not in order_item_cols:
                        try:
                            conn.execute(text("ALTER TABLE order_items ADD COLUMN sort_order INTEGER DEFAULT 0;"))
                            conn.commit()
                        except Exception: pass
                except Exception as alter_err:
                    print(f"Database migration order_items columns (info/critical): {alter_err}")
                
                # Migrate projects table to ensure design_fee_rates_snapshot and design_fee_rates_original exist safely
                try:
                    project_cols = [c['name'] for c in inspector.get_columns('projects')]
                    if 'design_fee_rates_snapshot' not in project_cols:
                        conn.execute(text("ALTER TABLE projects ADD COLUMN design_fee_rates_snapshot JSON;"))
                        conn.commit()
                        print("Database migration: ensured 'design_fee_rates_snapshot' column exists on 'projects' table.")
                    if 'design_fee_rates_original' not in project_cols:
                        conn.execute(text("ALTER TABLE projects ADD COLUMN design_fee_rates_original JSON;"))
                        conn.commit()
                        print("Database migration: ensured 'design_fee_rates_original' column exists on 'projects' table.")
                except Exception as proj_alter_err:
                    print(f"Database migration projects columns (info): {proj_alter_err}")
                
                # Migrate orders table to ensure pm_name and deposit_percentage exist
                try:
                    order_cols = [c['name'] for c in inspector.get_columns('orders')]
                    if 'pm_name' not in order_cols:
                        conn.execute(text("ALTER TABLE orders ADD COLUMN pm_name VARCHAR;"))
                        conn.commit()
                        print("Database migration: ensured 'pm_name' column exists on 'orders' table.")
                    if 'deposit_percentage' not in order_cols:
                        conn.execute(text("ALTER TABLE orders ADD COLUMN deposit_percentage FLOAT;"))
                        conn.commit()
                        print("Database migration: ensured 'deposit_percentage' column exists on 'orders' table.")
                except Exception as alter_err:
                    print(f"Database migration orders columns (info/critical): {alter_err}")

                # Migrate products table to ensure is_active exists
                try:
                    product_cols = [c['name'] for c in inspector.get_columns('products')]
                    if 'is_active' not in product_cols:
                        conn.execute(text("ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT TRUE;"))
                        conn.commit()
                        print("Database migration: ensured 'is_active' column exists on 'products' table.")
                except Exception as alter_err:
                    print(f"Database migration is_active (info): {alter_err}")
                
                # Ensure product_audit_logs table exists with ON DELETE RESTRICT constraint
                try:
                    if 'product_audit_logs' not in inspector.get_table_names():
                        db_type = engine.name
                        if db_type == 'sqlite':
                            conn.execute(text("""
                                CREATE TABLE product_audit_logs (
                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
                                    sku VARCHAR NOT NULL,
                                    field_changed VARCHAR NOT NULL,
                                    old_value TEXT,
                                    new_value TEXT,
                                    updated_by_user_id INTEGER,
                                    updated_by_name VARCHAR,
                                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                                );
                            """))
                        else:
                            conn.execute(text("""
                                CREATE TABLE IF NOT EXISTS product_audit_logs (
                                    id SERIAL PRIMARY KEY,
                                    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
                                    sku VARCHAR(255) NOT NULL,
                                    field_changed VARCHAR(100) NOT NULL,
                                    old_value TEXT,
                                    new_value TEXT,
                                    updated_by_user_id INTEGER,
                                    updated_by_name VARCHAR(255),
                                    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                                );
                            """))
                        conn.commit()
                        print("Database migration: created 'product_audit_logs' table with ON DELETE RESTRICT.")
                except Exception as audit_err:
                    print(f"Database migration product_audit_logs (info): {audit_err}")

                # Ensure product_accessories table exists
                try:
                    if 'product_accessories' not in inspector.get_table_names():
                        db_type = engine.name
                        if db_type == 'sqlite':
                            conn.execute(text("""
                                CREATE TABLE product_accessories (
                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                    parent_product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                                    accessory_product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                                    relationship_type VARCHAR DEFAULT 'Required Driver',
                                    notes TEXT
                                );
                            """))
                        else:
                            conn.execute(text("""
                                CREATE TABLE IF NOT EXISTS product_accessories (
                                    id SERIAL PRIMARY KEY,
                                    parent_product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                                    accessory_product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                                    relationship_type VARCHAR(100) DEFAULT 'Required Driver',
                                    notes TEXT
                                );
                            """))
                        conn.commit()
                        print("Database migration: created 'product_accessories' table.")
                except Exception as acc_err:
                    print(f"Database migration product_accessories (info): {acc_err}")
                
                # Migrate products table
                inspector = inspect(engine)
                existing_cols = [c["name"] for c in inspector.get_columns("products")]
                new_cols = [
                    ("family", "VARCHAR"),
                    ("category", "VARCHAR"),
                    ("reorder_level", "INTEGER DEFAULT 100"),
                    ("lead_time", "VARCHAR"),
                    ("origin", "VARCHAR"),
                    ("color", "VARCHAR"),
                    ("dimmable", "VARCHAR"),
                    ("dimming_protocol", "VARCHAR"),
                    ("driver_incl", "VARCHAR"),
                    ("light_source_incl", "VARCHAR"),
                    ("light_source_type", "VARCHAR"),
                    ("kelvin", "VARCHAR"),
                    ("beam_angle", "VARCHAR"),
                    ("cri", "VARCHAR"),
                    ("ip_rating", "VARCHAR"),
                    ("system_power", "FLOAT DEFAULT 0.0"),
                    ("lighting_type", "VARCHAR"),
                    ("cutout", "VARCHAR"),
                    ("driver_spec", "VARCHAR"),
                    ("one_to_one_code", "VARCHAR"),
                    ("foh_code_description", "VARCHAR"),
                    ("client_description", "VARCHAR"),
                    ("fitting_type", "VARCHAR"),
                    ("consignment", "VARCHAR"),
                    ("selection", "VARCHAR"),
                    ("first_fix", "VARCHAR"),
                    ("red_list", "VARCHAR"),
                    ("markup", "VARCHAR"),
                    ("recommended_retail_price", "FLOAT DEFAULT 0.0"),
                    ("internal_cost", "FLOAT DEFAULT 0.0"),
                    ("supplier_name", "VARCHAR"),
                    ("local_or_import", "VARCHAR"),
                    ("driver_location", "VARCHAR"),
                    ("fittings_per_driver", "VARCHAR"),
                    ("driver_connection_type", "VARCHAR"),
                    ("driver_max_cable", "VARCHAR"),
                    ("qr", "VARCHAR"),
                    ("qr_link", "VARCHAR"),
                    ("client_code", "VARCHAR"),
                    ("image_url", "VARCHAR"),
                    ("technical_image_url", "VARCHAR"),
                    ("spec_sheet_url", "VARCHAR"),
                    ("wetworks", "TEXT")
                ]
                for col_name, col_type in new_cols:
                    if col_name not in existing_cols:
                        conn.execute(text(f"ALTER TABLE products ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                        conn.commit()
                        print(f"Database migration: added column {col_name} to 'products' table.")

                # Migrate order_items table
                try:
                    if 'order_items' in inspector.get_table_names():
                        order_item_cols = [c["name"] for c in inspector.get_columns("order_items")]
                        order_item_new_cols = [
                            ("wetworks", "TEXT"),
                            ("foh_code_description", "TEXT"),
                            ("client_description", "TEXT"),
                            ("one_to_one_code", "VARCHAR"),
                            ("selection", "VARCHAR"),
                            ("technical_image_url", "TEXT"),
                            ("spec_sheet_url", "TEXT")
                        ]
                        for oi_col_name, oi_col_type in order_item_new_cols:
                            if oi_col_name not in order_item_cols:
                                conn.execute(text(f"ALTER TABLE order_items ADD COLUMN IF NOT EXISTS {oi_col_name} {oi_col_type};"))
                                conn.commit()
                                print(f"Database migration: added column {oi_col_name} to 'order_items' table.")
                except Exception as oi_err:
                    print(f"Database migration order_items (info): {oi_err}")

                # Migrate support_tickets table to ensure extended fields exist
                try:
                    if 'support_tickets' in inspector.get_table_names():
                        ticket_cols = [c["name"] for c in inspector.get_columns("support_tickets")]
                        ticket_new_cols = [
                            ("category", "VARCHAR DEFAULT 'Bug'"),
                            ("raised_by", "VARCHAR"),
                            ("eta", "VARCHAR"),
                            ("project_name", "VARCHAR"),
                            ("attachments_json", "JSON"),
                            ("comments_json", "JSON"),
                            ("updated_at", "VARCHAR")
                        ]
                        for t_col_name, t_col_type in ticket_new_cols:
                            if t_col_name not in ticket_cols:
                                conn.execute(text(f"ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS {t_col_name} {t_col_type};"))
                                conn.commit()
                                print(f"Database migration: added column {t_col_name} to 'support_tickets' table.")
                except Exception as t_err:
                    print(f"Database migration support_tickets (info): {t_err}")
        except Exception as migration_err:
            print(f"Warning: Migration failed: {migration_err}")

        
        # Seed default project folders if none exist for each project
        db = SessionLocal()
        try:
            defaults = [
                {"id": 1, "name": "Upper Primrose"},
                {"id": 2, "name": "Villa Z"},
                {"id": 3, "name": "Tambor 9"},
                {"id": 4, "name": "Singita Elela"}
            ]
            for p_def in defaults:
                proj = db.query(Project).filter(Project.id == p_def["id"]).first()
                if not proj:
                    new_p = Project(id=p_def["id"], name=p_def["name"])
                    db.add(new_p)
                    db.commit()
            
            from sqlalchemy import func
            folder_counts = {row[0]: row[1] for row in db.query(ProjectFolder.project_id, func.count(ProjectFolder.id)).group_by(ProjectFolder.project_id).all()}
            
            projects = db.query(Project).all()
            for project in projects:
                folder_count = folder_counts.get(project.id, 0)
                if folder_count == 0:
                    fld_design = ProjectFolder(
                        project_id=project.id,
                        gdrive_folder_id=f"gdrive-fld-design-{project.id}",
                        parent_id=None,
                        sort_order=1,
                        name="Stage 2: Design Files"
                    )
                    fld_supply = ProjectFolder(
                        project_id=project.id,
                        gdrive_folder_id=f"gdrive-fld-supply-{project.id}",
                        parent_id=None,
                        sort_order=2,
                        name="Stage 3: Product Supply"
                    )
                    db.add(fld_design)
                    db.add(fld_supply)
                    db.commit()
                    
                    # Add sub-folder under Design Files
                    fld_cad = ProjectFolder(
                        project_id=project.id,
                        gdrive_folder_id=f"gdrive-fld-cad-{project.id}",
                        parent_id=fld_design.id,
                        sort_order=1,
                        name="CAD Layouts"
                    )
                    db.add(fld_cad)
                    
            # Seed default suppliers if none exist
            supplier_count = db.query(Supplier).count()
            if supplier_count == 0:
                seed_suppliers = [
                    {"id": 1, "name": "ELDC Lighting Distribution", "contact_details": "Alex Venter (Technical Procurement Lead)"},
                    {"id": 2, "name": "Delta Light", "contact_details": "Corporate Sales"},
                    {"id": 3, "name": "Supplier Corporate Business Park, JHB", "contact_details": "Account Team"}
                ]
                for s_data in seed_suppliers:
                    db_s = Supplier(**s_data)
                    db.add(db_s)
                db.commit()
                print("Database seeded with default suppliers.")

            # Seed default products if none exist
            product_count = db.query(Product).count()
            if product_count == 0:
                seed_products = [
                    {
                        "sku": "28402 9240 FW",
                        "name": "Downlight - Entero RD-S 14W 2700K 30° IP20 White",
                        "family": "Entero RD-S",
                        "category": "Downlight",
                        "brand": "Delta Light",
                        "cost_price": 2416.37,
                        "retail_price": 3835.50,
                        "trade_price": 3451.95,
                        "stock_level": 100,
                        "reorder_level": 100,
                        "lead_time": "6-8 Weeks",
                        "origin": "Import",
                        "color": "White",
                        "dimmable": "Yes",
                        "dimming_protocol": "Driver Dependent",
                        "driver_incl": "No",
                        "light_source_incl": "Yes",
                        "light_source_type": "LED",
                        "kelvin": "2700K",
                        "beam_angle": "30°",
                        "cri": "90",
                        "ip_rating": "IP20",
                        "system_power": 14.0,
                        "lighting_type": "Architectural",
                        "cutout": "Ø76mm",
                        "driver_spec": "- External or Remote Driver (Check Driver Wetworks)\n- 1 Fitting per Driver\n- Direct Connection\n- Max Distance(Driver>Fitting): 1m away using 0.5mm cable"
                    },
                    {
                        "sku": "28402 9240 B",
                        "name": "Downlight - Entero RD-S 14W 2700K 30° IP20 Black",
                        "family": "Entero RD-S",
                        "category": "Downlight",
                        "brand": "Delta Light",
                        "cost_price": 2416.37,
                        "retail_price": 3835.50,
                        "trade_price": 3451.95,
                        "stock_level": 85,
                        "reorder_level": 100,
                        "lead_time": "6-8 Weeks",
                        "origin": "Import",
                        "color": "Black",
                        "dimmable": "Yes",
                        "dimming_protocol": "Driver Dependent",
                        "driver_incl": "No",
                        "light_source_incl": "Yes",
                        "light_source_type": "LED",
                        "kelvin": "2700K",
                        "beam_angle": "30°",
                        "cri": "90",
                        "ip_rating": "IP20",
                        "system_power": 14.0,
                        "lighting_type": "Architectural",
                        "cutout": "Ø76mm",
                        "driver_spec": "- External or Remote Driver (Check Driver Wetworks)\n- 1 Fitting per Driver\n- Direct Connection\n- Max Distance(Driver>Fitting): 1m away using 0.5mm cable"
                    }
                ]
                for p_data in seed_products:
                    db_p = Product(**p_data)
                    db.add(db_p)
                print("Database seeded with default lighting products.")

            # Seed default lookup values if none exist
            lookup_count = db.query(LookupValue).count()
            if lookup_count == 0:
                default_lookups = [
                    # client_type
                    {"category": "client_type", "label": "Architect", "value": "Architect", "sort_order": 1, "metadata_json": {"color": "info"}},
                    {"category": "client_type", "label": "Developer", "value": "Developer", "sort_order": 2, "metadata_json": {"color": "success"}},
                    {"category": "client_type", "label": "Interior", "value": "Interior", "sort_order": 3, "metadata_json": {"color": "warning"}},
                    {"category": "client_type", "label": "Private", "value": "Private", "sort_order": 4, "metadata_json": {"color": "default"}},
                    # loss_reason
                    {"category": "loss_reason", "label": "Price too high", "value": "Price too high", "sort_order": 1, "metadata_json": None},
                    {"category": "loss_reason", "label": "Competitor selected", "value": "Competitor selected", "sort_order": 2, "metadata_json": None},
                    {"category": "loss_reason", "label": "Project cancelled", "value": "Project cancelled", "sort_order": 3, "metadata_json": None},
                    {"category": "loss_reason", "label": "No response", "value": "No response", "sort_order": 4, "metadata_json": None},
                    {"category": "loss_reason", "label": "Other", "value": "Other", "sort_order": 5, "metadata_json": None},
                    # project_status
                    {"category": "project_status", "label": "On track", "value": "On track", "sort_order": 1, "metadata_json": {"color": "success"}},
                    {"category": "project_status", "label": "Delayed", "value": "Delayed", "sort_order": 2, "metadata_json": {"color": "warning"}},
                    {"category": "project_status", "label": "At risk", "value": "At risk", "sort_order": 3, "metadata_json": {"color": "danger"}},
                    {"category": "project_status", "label": "Completed", "value": "Completed", "sort_order": 4, "metadata_json": {"color": "info"}},
                    # delay_reason
                    {"category": "delay_reason", "label": "Client approval delay", "value": "Client approval delay", "sort_order": 1, "metadata_json": None},
                    {"category": "delay_reason", "label": "Supply chain delay", "value": "Supply chain delay", "sort_order": 2, "metadata_json": None},
                    {"category": "delay_reason", "label": "Site condition", "value": "Site condition", "sort_order": 3, "metadata_json": None},
                    {"category": "delay_reason", "label": "Budget constraint", "value": "Budget constraint", "sort_order": 4, "metadata_json": None},
                    {"category": "delay_reason", "label": "Other", "value": "Other", "sort_order": 5, "metadata_json": None},
                ]
                for l_data in default_lookups:
                    db_l = LookupValue(**l_data)
                    db.add(db_l)
                db.commit()
                print("Database seeded with default lookup values.")

            # Seed default project tickets if none exist
            from models.orm_models import ProjectTicket
            ticket_count = db.query(ProjectTicket).count()
            if ticket_count == 0:
                sample_project_tickets = [
                    {
                        "ticket_number": "PM-TKT-001",
                        "project_id": 2,
                        "project_name": "Villa Z",
                        "client_name": "Marco Esteves",
                        "pm_name": "Dani",
                        "stage": "Stage 5: Installation & Snagging",
                        "title": "Master suite en-suite ceiling cutout misalignment",
                        "description": "The ceiling drywall cutout for the Entero RD-S downlight in the master bathroom was drilled 50mm too close to the shower glass partition. Requires ceiling patch and re-cut before final skim coat.",
                        "ticket_type": "Site Snag / Defect",
                        "priority": "High",
                        "status": "In progress",
                        "location_area": "Master Bathroom - Zone 2",
                        "fitting_code": "DL-01 Downlight",
                        "cost_impact": 1200.0,
                        "schedule_impact_days": 2,
                        "raised_by": "Dani",
                        "assigned_to": "Drywall Contractor",
                        "due_date": "2026-06-05",
                        "attachments_json": [],
                        "comments_json": [
                            {"sender": "Dani", "text": "Contractor notified on site. Awaiting re-skim confirmation.", "date": "24 May 2026"}
                        ],
                        "created_at": "24 May 2026",
                        "updated_at": "24 May 2026"
                    },
                    {
                        "ticket_number": "PM-TKT-002",
                        "project_id": 1,
                        "project_name": "Upper Primrose",
                        "client_name": "Sarah Venter",
                        "pm_name": "Martin",
                        "stage": "Stage 3: Detail Design",
                        "title": "Kitchen island joinery profile dimming driver RFI",
                        "description": "Joinery sub-contractor requesting clarification on remote driver location and maximum secondary cable run distance for the recessed LED profile underneath the marble countertop.",
                        "ticket_type": "RFI / Site Query",
                        "priority": "Medium",
                        "status": "Open",
                        "location_area": "Kitchen Island Joinery",
                        "fitting_code": "STR-02 LED Strip",
                        "cost_impact": 0.0,
                        "schedule_impact_days": 0,
                        "raised_by": "Martin",
                        "assigned_to": "Electrical Lead",
                        "due_date": "2026-06-10",
                        "attachments_json": [],
                        "comments_json": [],
                        "created_at": "22 May 2026",
                        "updated_at": "22 May 2026"
                    },
                    {
                        "ticket_number": "PM-TKT-003",
                        "project_id": 3,
                        "project_name": "Tambor 9",
                        "client_name": "Liezel du Toit",
                        "pm_name": "Alex",
                        "stage": "Stage 2: Schematic Design",
                        "title": "Living room chandelier drop height client variation",
                        "description": "Client requested increasing the overall feature pendant drop from 1800mm to 2400mm due to double-volume ceiling height revision on the latest architectural drawings.",
                        "ticket_type": "Design Revision",
                        "priority": "Critical",
                        "status": "Awaiting Sign-off",
                        "location_area": "Double Volume Living Room",
                        "fitting_code": "CH-01 Feature Pendant",
                        "cost_impact": 4500.0,
                        "schedule_impact_days": 3,
                        "raised_by": "Alex",
                        "assigned_to": "Dani",
                        "due_date": "2026-05-30",
                        "attachments_json": [],
                        "comments_json": [
                            {"sender": "Alex", "text": "Revised suspension cable quote requested from supplier.", "date": "20 May 2026"}
                        ],
                        "created_at": "20 May 2026",
                        "updated_at": "20 May 2026"
                    },
                    {
                        "ticket_number": "PM-TKT-004",
                        "project_id": 4,
                        "project_name": "Singita Elela",
                        "client_name": "Thabo Khumalo",
                        "pm_name": "Merlyn",
                        "stage": "Stage 4: Procurement",
                        "title": "Outdoor pathway IP67 bollard supplier lead time hold",
                        "description": "Supplier confirmed an 8-week manufacturing lead time on custom dark bronze bollards. Need PM approval to expedite air freight or specify local alternative to avoid delaying Phase 1 landscaping handover.",
                        "ticket_type": "Procurement Delay",
                        "priority": "High",
                        "status": "Open",
                        "location_area": "External Boardwalk Pathway",
                        "fitting_code": "BL-04 IP67 Bollard",
                        "cost_impact": 0.0,
                        "schedule_impact_days": 14,
                        "raised_by": "Merlyn",
                        "assigned_to": "Procurement Team",
                        "due_date": "2026-06-01",
                        "attachments_json": [],
                        "comments_json": [],
                        "created_at": "18 May 2026",
                        "updated_at": "18 May 2026"
                    }
                ]
                for t_data in sample_project_tickets:
                    db_t = ProjectTicket(**t_data)
                    db.add(db_t)
                db.commit()
                print("Database seeded with default project tickets.")

            print("Database initialized & seeded with default folders.")
        except Exception as seed_err:
            print(f"Seeding error: {seed_err}")
        finally:
            db.close()
    except Exception as e:
        print(f"DB Init Error: {e}")

@app.on_event("startup")
async def startup_event():
    import threading
    threading.Thread(target=init_db, daemon=True).start()
    try:
        from services.master_sync_service import start_15min_sync_scheduler
        start_15min_sync_scheduler()
    except Exception as sched_err:
        print(f"Failed to start 15-min sync scheduler: {sched_err}")

if __name__ == "__main__":
    # optimized for Windows auto-reload
    uvicorn.run(
        "main:app", 
        host="127.0.0.1", 
        port=8000, 
        reload=True,
        reload_dirs=["."], 
        reload_excludes=[".venv", "venv", "node_modules", "__pycache__"]
    )
