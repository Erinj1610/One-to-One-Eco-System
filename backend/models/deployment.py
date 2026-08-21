from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database.cloud_sql import Base

class DeploymentRevision(Base):
    __tablename__ = "deployment_revisions"
    
    id = Column(Integer, primary_key=True, index=True)
    version_tag = Column(String, index=True, nullable=False) # e.g. "v1.5.0"
    release_name = Column(String, nullable=False)            # e.g. "Custom Order Naming & Drive Vault"
    release_notes = Column(String, nullable=True)            # Text description of updates
    environment = Column(String, default="production")        # "staging" or "production"
    commit_hash = Column(String, nullable=True)            # Git SHA
    cloud_run_revision = Column(String, nullable=True)     # e.g. "one-to-one-backend-00509-hq6"
    deployed_by = Column(String, nullable=True)            # Admin email
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active_prod = Column(Boolean, default=False)
