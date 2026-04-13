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

def init_db():
    from database.cloud_sql import engine, Base
    try:
        from models.orm_models import Project, Quote, TemplateConfig
        Base.metadata.create_all(bind=engine)
        print("Database initialized successfully.")
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
