from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database.cloud_sql import get_db
from models.orm_models import ProjectTicket, Project
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

router = APIRouter()

class ProjectTicketCreate(BaseModel):
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    client_name: Optional[str] = None
    pm_name: Optional[str] = None
    stage: Optional[str] = "Stage 5: Installation & Snagging"
    title: str
    description: Optional[str] = None
    ticket_type: Optional[str] = "Site Snag / Defect"
    priority: Optional[str] = "Medium"
    status: Optional[str] = "Open"
    location_area: Optional[str] = None
    fitting_code: Optional[str] = None
    cost_impact: Optional[float] = 0.0
    schedule_impact_days: Optional[int] = 0
    raised_by: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    attachments: Optional[List[str]] = None
    created_at: Optional[str] = None

class ProjectTicketUpdate(BaseModel):
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    client_name: Optional[str] = None
    pm_name: Optional[str] = None
    stage: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    ticket_type: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    location_area: Optional[str] = None
    fitting_code: Optional[str] = None
    cost_impact: Optional[float] = None
    schedule_impact_days: Optional[int] = None
    raised_by: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    resolved_date: Optional[str] = None
    resolution_notes: Optional[str] = None
    attachments: Optional[List[str]] = None
    comments: Optional[List[Any]] = None
    new_comment: Optional[dict] = None

def _serialize_project_ticket(t: ProjectTicket):
    attachments = t.attachments_json if isinstance(t.attachments_json, list) else []
    comments = t.comments_json if isinstance(t.comments_json, list) else []
    
    return {
        "id": t.id,
        "ticket_number": t.ticket_number or f"PM-TKT-{str(t.id).padStart(3, '0') if hasattr(str(t.id), 'padStart') else str(t.id).zfill(3)}",
        "project_id": t.project_id,
        "project_name": t.project_name or "General",
        "client_name": t.client_name or "",
        "pm_name": t.pm_name or "Unassigned",
        "stage": t.stage or "Stage 5: Installation & Snagging",
        "title": t.title,
        "description": t.description or "",
        "ticket_type": t.ticket_type or "Site Snag / Defect",
        "category": t.ticket_type or "Site Snag / Defect",
        "priority": t.priority or "Medium",
        "urgency": t.priority or "Medium",
        "status": t.status or "Open",
        "location_area": t.location_area or "",
        "fitting_code": t.fitting_code or "",
        "cost_impact": float(t.cost_impact or 0.0),
        "schedule_impact_days": int(t.schedule_impact_days or 0),
        "raised_by": t.raised_by or "Staff",
        "assigned_to": t.assigned_to or "",
        "due_date": t.due_date or "",
        "resolved_date": t.resolved_date or "",
        "resolution_notes": t.resolution_notes or "",
        "attachments": attachments,
        "images": attachments,
        "comments": comments,
        "created_at": t.created_at or "",
        "updated_at": t.updated_at or ""
    }

@router.get("")
@router.get("/")
def list_project_tickets(
    project_id: Optional[int] = None,
    project_name: Optional[str] = None,
    pm_name: Optional[str] = None,
    stage: Optional[str] = None,
    status: Optional[str] = None,
    ticket_type: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ProjectTicket)
    
    if project_id is not None:
        query = query.filter(ProjectTicket.project_id == project_id)
    if project_name:
        query = query.filter(ProjectTicket.project_name == project_name)
    if pm_name:
        query = query.filter(ProjectTicket.pm_name == pm_name)
    if stage:
        query = query.filter(ProjectTicket.stage == stage)
    if status and status != 'All':
        query = query.filter(ProjectTicket.status == status)
    if ticket_type and ticket_type != 'All':
        query = query.filter(ProjectTicket.ticket_type == ticket_type)
    if priority and priority != 'All':
        query = query.filter(ProjectTicket.priority == priority)
        
    tickets = query.order_by(ProjectTicket.id.desc()).all()
    return [_serialize_project_ticket(t) for t in tickets]

@router.get("/{ticket_id}")
def get_project_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(ProjectTicket).filter(ProjectTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Project ticket not found")
    return _serialize_project_ticket(ticket)

@router.post("")
@router.post("/")
def create_project_ticket(data: ProjectTicketCreate, db: Session = Depends(get_db)):
    # Auto-resolve client_name or pm_name from project if not provided
    project_name = data.project_name
    client_name = data.client_name
    pm_name = data.pm_name

    if data.project_id and (not project_name or not client_name or not pm_name):
        proj = db.query(Project).filter(Project.id == data.project_id).first()
        if proj:
            project_name = project_name or proj.name
            client_name = client_name or proj.client_name
            pm_name = pm_name or proj.pm_name

    created_date = data.created_at or datetime.now().strftime("%d %b %Y")
    
    # Calculate next ticket number
    count = db.query(ProjectTicket).count() + 1
    ticket_num = f"PM-TKT-{str(count).zfill(3)}"

    new_ticket = ProjectTicket(
        ticket_number=ticket_num,
        project_id=data.project_id,
        project_name=project_name or "General",
        client_name=client_name or "",
        pm_name=pm_name or "Unassigned",
        stage=data.stage or "Stage 5: Installation & Snagging",
        title=data.title,
        description=data.description or "",
        ticket_type=data.ticket_type or "Site Snag / Defect",
        priority=data.priority or "Medium",
        status=data.status or "Open",
        location_area=data.location_area or "",
        fitting_code=data.fitting_code or "",
        cost_impact=float(data.cost_impact or 0.0),
        schedule_impact_days=int(data.schedule_impact_days or 0),
        raised_by=data.raised_by or "Staff",
        assigned_to=data.assigned_to or "",
        due_date=data.due_date or "",
        resolved_date=None,
        resolution_notes="",
        attachments_json=data.attachments or [],
        comments_json=[],
        created_at=created_date,
        updated_at=created_date
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)

    # Ensure ticket_number includes actual ID
    if not new_ticket.ticket_number or new_ticket.ticket_number == "PM-TKT-001":
        new_ticket.ticket_number = f"PM-TKT-{str(new_ticket.id).zfill(3)}"
        db.commit()
        db.refresh(new_ticket)

    return {
        "status": "ok",
        "message": "Project ticket created successfully",
        "id": new_ticket.id,
        "ticket": _serialize_project_ticket(new_ticket)
    }

@router.put("/{ticket_id}")
def update_project_ticket(ticket_id: int, data: ProjectTicketUpdate, db: Session = Depends(get_db)):
    ticket = db.query(ProjectTicket).filter(ProjectTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Project ticket not found")

    if data.project_id is not None:
        ticket.project_id = data.project_id
    if data.project_name is not None:
        ticket.project_name = data.project_name
    if data.client_name is not None:
        ticket.client_name = data.client_name
    if data.pm_name is not None:
        ticket.pm_name = data.pm_name
    if data.stage is not None:
        ticket.stage = data.stage
    if data.title is not None:
        ticket.title = data.title
    if data.description is not None:
        ticket.description = data.description
    if data.ticket_type is not None:
        ticket.ticket_type = data.ticket_type
    if data.priority is not None:
        ticket.priority = data.priority
    if data.status is not None:
        ticket.status = data.status
        if data.status in ["Resolved", "Closed"] and not ticket.resolved_date:
            ticket.resolved_date = datetime.now().strftime("%d %b %Y")
        elif data.status not in ["Resolved", "Closed"]:
            ticket.resolved_date = None
    if data.location_area is not None:
        ticket.location_area = data.location_area
    if data.fitting_code is not None:
        ticket.fitting_code = data.fitting_code
    if data.cost_impact is not None:
        ticket.cost_impact = float(data.cost_impact)
    if data.schedule_impact_days is not None:
        ticket.schedule_impact_days = int(data.schedule_impact_days)
    if data.raised_by is not None:
        ticket.raised_by = data.raised_by
    if data.assigned_to is not None:
        ticket.assigned_to = data.assigned_to
    if data.due_date is not None:
        ticket.due_date = data.due_date
    if data.resolved_date is not None:
        ticket.resolved_date = data.resolved_date
    if data.resolution_notes is not None:
        ticket.resolution_notes = data.resolution_notes
    if data.attachments is not None:
        ticket.attachments_json = data.attachments

    if data.comments is not None:
        ticket.comments_json = data.comments
    elif data.new_comment is not None:
        current_comments = ticket.comments_json if isinstance(ticket.comments_json, list) else []
        current_comments.append(data.new_comment)
        ticket.comments_json = current_comments

    ticket.updated_at = datetime.now().strftime("%d %b %Y, %H:%M")
    db.commit()
    db.refresh(ticket)
    return {
        "status": "ok",
        "message": "Project ticket updated successfully",
        "ticket": _serialize_project_ticket(ticket)
    }

@router.delete("/{ticket_id}")
def delete_project_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(ProjectTicket).filter(ProjectTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Project ticket not found")

    db.delete(ticket)
    db.commit()
    return {"status": "ok", "message": "Project ticket deleted successfully"}
