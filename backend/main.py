from fastapi import FastAPI, Depends
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
import services.firebase_auth

app = FastAPI(title="One to One Eco System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Backend is running"}

from services.firebase_auth import verify_firebase_token

app.include_router(projects_router, prefix="/api/projects", tags=["projects"], dependencies=[Depends(verify_firebase_token)])
app.include_router(admin_router, prefix="/admin", tags=["admin"], dependencies=[Depends(verify_firebase_token)])
app.include_router(documents_router, prefix="/api/documents", tags=["documents"], dependencies=[Depends(verify_firebase_token)])
app.include_router(hr_router, prefix="/api/hr", tags=["hr"], dependencies=[Depends(verify_firebase_token)])
app.include_router(settings_router, prefix="/api", tags=["settings"], dependencies=[Depends(verify_firebase_token)])
app.include_router(users_router, prefix="/admin/users", tags=["users"])
app.include_router(products_router, prefix="/api/products", tags=["products"])
app.include_router(products_public_router, prefix="/api/products", tags=["products"])
app.include_router(lookups_router, prefix="/api/lookups", tags=["lookups"])

# Mount uploads static directory
from fastapi.staticfiles import StaticFiles
import os
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

def init_db():
    from database.cloud_sql import engine, Base, SessionLocal
    from models.orm_models import Project, ProjectFolder, Product, ProductFile, Supplier, LookupValue
    try:
        Base.metadata.create_all(bind=engine)
        
        # Run migration to add disabled column if it doesn't exist
        from sqlalchemy import text, inspect
        try:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled BOOLEAN DEFAULT FALSE;"))
                conn.commit()
                print("Database migration: ensured 'disabled' column exists on 'users' table.")
                
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
                    ("qr", "VARCHAR"),
                    ("qr_link", "VARCHAR"),
                    ("client_code", "VARCHAR")
                ]
                for col_name, col_type in new_cols:
                    if col_name not in existing_cols:
                        conn.execute(text(f"ALTER TABLE products ADD COLUMN {col_name} {col_type};"))
                        conn.commit()
                        print(f"Database migration: added column {col_name} to 'products' table.")
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
            
            projects = db.query(Project).all()
            for project in projects:
                folder_count = db.query(ProjectFolder).filter(ProjectFolder.project_id == project.id).count()
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

            print("Database initialized & seeded with default folders.")
        except Exception as seed_err:
            print(f"Seeding error: {seed_err}")
        finally:
            db.close()
    except Exception as e:
        print(f"DB Init Error: {e}")

if __name__ == "__main__":
    init_db()
    # optimized for Windows auto-reload
    uvicorn.run(
        "main:app", 
        host="127.0.0.1", 
        port=8000, 
        reload=True,
        reload_dirs=["."], 
        reload_excludes=[".venv", "venv", "node_modules", "__pycache__"]
    )
else:
    # If imported by uvicorn CLI, still init DB
    init_db()
