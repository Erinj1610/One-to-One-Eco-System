import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# ─── DATABASE CONFIGURATION ──────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "local_ecosystem.db")

import urllib.parse

def clean_database_url(url):
    if not url.startswith("postgresql"):
        return url
    # If already URL-encoded or a Cloud SQL Unix socket connection, return as-is
    if "%" in url or "cloudsql" in url:
        return url
    try:
        prefix, rest = url.split("://", 1)
        if "/" in rest:
            auth_host, dbname = rest.rsplit("/", 1)
        else:
            auth_host = rest
            dbname = ""
        
        if "@" in auth_host:
            auth, host = auth_host.rsplit("@", 1)
        else:
            auth = auth_host
            host = ""
            
        if ":" in auth:
            user, password = auth.split(":", 1)
            encoded_password = urllib.parse.quote_plus(password)
            auth = f"{user}:{encoded_password}"
            
        return f"{prefix}://{auth}@{host}/{dbname}"
    except Exception:
        return url


# Load .env file if it exists in the backend directory
ENV_PATH = os.path.join(BASE_DIR, ".env")
if os.path.exists(ENV_PATH):
    with open(ENV_PATH, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ.setdefault(key.strip(), val.strip())


# Read connection string from environment variables for Cloud SQL (PostgreSQL),
# otherwise fall back to local SQLite.
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")
DATABASE_URL = clean_database_url(DATABASE_URL)

print(f"--- Database connecting to {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else 'SQLite'}... ---")



try:
    # Disable check_same_thread for non-sqlite systems
    if DATABASE_URL.startswith("sqlite"):
        engine = create_engine(
            DATABASE_URL, 
            echo=False, 
            connect_args={"check_same_thread": False}
        )
    else:
        engine = create_engine(
            DATABASE_URL, 
            echo=False
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
