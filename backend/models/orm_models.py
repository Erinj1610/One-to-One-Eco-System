from sqlalchemy import Column, Integer, String, Float, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
import enum
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database.cloud_sql import Base

# ... (rest of models)

class TemplateConfig(Base):
    __tablename__ = "template_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    template_key = Column(String, unique=True, index=True) # e.g., "DESIGN_FEE_PROPOSAL"
    config_json = Column(JSON, nullable=False) # Stores all visual/text settings


class FeeStatus(str, enum.Enum):
    unpaid = "unpaid"
    paid = "paid"

class KanbanState(str, enum.Enum):
    locked = "locked"
    unlocked = "unlocked"

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    design_fee_status = Column(Enum(FeeStatus), default=FeeStatus.unpaid)
    kanban_state = Column(Enum(KanbanState), default=KanbanState.locked)
    master_drive_folder = Column(String, nullable=True)
    
    # 1-to-Many Relationship: A project can have multiple Quotes
    quotes = relationship("Quote", back_populates="project")

class Quote(Base):
    __tablename__ = "quotes"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    phase_name = Column(String, nullable=False) # e.g., Phase 1 - Reception
    fulfillment_percentage = Column(Float, default=0.0)
    status = Column(String, default="draft")
    
    # Parent relationship
    project = relationship("Project", back_populates="quotes")
