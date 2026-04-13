from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.cloud_sql import get_db
from models.orm_models import Project, Quote, FeeStatus, KanbanState
from pydantic import BaseModel

router = APIRouter()

class ProjectCreate(BaseModel):
    name: str

class QuoteCreate(BaseModel):
    phase_name: str

@router.post("/", response_model=dict)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    new_project = Project(name=project.name)
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return {"message": "Project created successfully", "id": new_project.id}

@router.get("/")
def list_projects(db: Session = Depends(get_db)):
    try:
        projects = db.query(Project).all()
        return [{"id": p.id, "name": p.name, "fee_status": p.design_fee_status, "kanban_state": p.kanban_state} for p in projects]
    except Exception as e:
        return {"error": "Database error", "details": str(e)}

@router.put("/{project_id}/fee")
def update_master_fee(project_id: int, status: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if status == "paid":
        project.design_fee_status = FeeStatus.paid
        project.kanban_state = KanbanState.unlocked
    elif status == "unpaid":
        project.design_fee_status = FeeStatus.unpaid
        project.kanban_state = KanbanState.locked
        
    db.commit()
    db.refresh(project)
    return {"message": "Design fee and Kanban status updated", "fee_status": project.design_fee_status, "kanban_state": project.kanban_state}

@router.post("/{project_id}/quotes")
def create_quote(project_id: int, quote: QuoteCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    new_quote = Quote(project_id=project_id, phase_name=quote.phase_name)
    db.add(new_quote)
    db.commit()
    db.refresh(new_quote)
    return {"message": "Quote created successfully", "id": new_quote.id}

@router.get("/{project_id}/quotes")
def list_quotes(project_id: int, db: Session = Depends(get_db)):
    quotes = db.query(Quote).filter(Quote.project_id == project_id).all()
    return [{"id": q.id, "phase_name": q.phase_name, "fulfillment": q.fulfillment_percentage, "status": q.status} for q in quotes]
