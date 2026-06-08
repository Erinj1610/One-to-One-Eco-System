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

app.include_router(projects_router, prefix="/api/projects", tags=["projects"])
app.include_router(admin_router, prefix="/admin", tags=["admin"])
app.include_router(documents_router, prefix="/api/documents", tags=["documents"])

def init_db():
    from database.cloud_sql import engine, Base, SessionLocal
    try:
        from models.orm_models import Project, Quote, TemplateConfig, ProjectFolder
        Base.metadata.create_all(bind=engine)
        
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
                    db.commit()
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
