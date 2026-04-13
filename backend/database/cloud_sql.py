import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# ─── DATABASE CONFIGURATION ──────────────────────────────────────────────────
# We use an absolute path here to ensure the database works correctly 
# regardless of where the launcher is started from on Windows.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "local_ecosystem.db")

# For immediate local testing, we are using SQLite!
# To use Google Cloud SQL (Postgres), replace this with your Cloud SQL URL.
DATABASE_URL = f"sqlite:///{DB_PATH}"

print(f"--- Database connecting to: {DB_PATH} ---")

try:
    engine = create_engine(
        DATABASE_URL, 
        echo=False, 
        connect_args={"check_same_thread": False}
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()
except Exception as e:
    print(f"CRITICAL: Database connection failed. Error: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
