from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.cloud_sql import get_db
from models.orm_models import PortalSetting, SupportTicket
from pydantic import BaseModel
from typing import Optional, List, Any

router = APIRouter()

class SettingSave(BaseModel):
    value: Any

class TicketCreate(BaseModel):
    title: str
    description: Optional[str] = None
    urgency: Optional[str] = "Medium"
    category: Optional[str] = "Bug"
    raised_by: Optional[str] = None
    project_name: Optional[str] = None
    eta: Optional[str] = None
    image_url: Optional[str] = None
    attachments: Optional[List[str]] = None
    created_at: Optional[str] = None

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    urgency: Optional[str] = None
    category: Optional[str] = None
    raised_by: Optional[str] = None
    project_name: Optional[str] = None
    eta: Optional[str] = None
    image_url: Optional[str] = None
    attachments: Optional[List[str]] = None
    status: Optional[str] = None
    rating: Optional[Any] = None
    response_text: Optional[str] = None
    comments: Optional[List[Any]] = None
    new_comment: Optional[dict] = None

@router.get("/settings/{key}")
def get_setting(key: str, db: Session = Depends(get_db)):
    setting = db.query(PortalSetting).filter(PortalSetting.key == key).first()
    if not setting:
        return {"key": key, "value": None}
    return {"key": key, "value": setting.value}

@router.post("/settings/{key}")
def save_setting(key: str, data: SettingSave, db: Session = Depends(get_db)):
    setting = db.query(PortalSetting).filter(PortalSetting.key == key).first()
    if setting:
        setting.value = data.value
    else:
        setting = PortalSetting(key=key, value=data.value)
        db.add(setting)
    db.commit()
    
    # Synchronize setting value to relational SQL tables
    try:
        from services.db_sync_service import sync_key_to_relational
        sync_key_to_relational(key, data.value, db)
    except Exception as sync_err:
        print(f"Error during relational sync for key '{key}': {sync_err}")
        
    return {"status": "ok", "message": f"Setting '{key}' saved successfully"}


def _serialize_ticket(t: SupportTicket):
    attachments = t.attachments_json if isinstance(t.attachments_json, list) else []
    if t.image_url and t.image_url not in attachments:
        attachments = [t.image_url] + attachments
    comments = t.comments_json if isinstance(t.comments_json, list) else []
    
    return {
        "id": t.id,
        "title": t.title,
        "description": t.description or "",
        "status": t.status or "Open",
        "urgency": t.urgency or "Medium",
        "priority": t.urgency or "Medium",
        "category": t.category or "Bug",
        "cat": t.category or "Bug",
        "raised_by": t.raised_by or "Staff",
        "raised": t.raised_by or "Staff",
        "project_name": t.project_name,
        "eta": t.eta or "",
        "image_url": t.image_url,
        "images": attachments,
        "attachments": attachments,
        "rating": t.rating,
        "response_text": t.response_text or "",
        "adminNotes": t.response_text or "",
        "comments": comments,
        "developerComments": comments,
        "created_at": t.created_at or "",
        "date": t.created_at or "",
        "updated_at": t.updated_at or ""
    }


@router.get("/support/tickets")
@router.get("/tickets")
def list_tickets(db: Session = Depends(get_db)):
    tickets = db.query(SupportTicket).order_by(SupportTicket.id.desc()).all()
    return [_serialize_ticket(t) for t in tickets]


@router.post("/support/tickets")
@router.post("/tickets")
def create_ticket(ticket: TicketCreate, db: Session = Depends(get_db)):
    from datetime import datetime
    created_date = ticket.created_at or datetime.now().strftime("%d %b %Y")
    
    attachments = ticket.attachments or []
    if ticket.image_url and ticket.image_url not in attachments:
        attachments.insert(0, ticket.image_url)
    primary_img = ticket.image_url or (attachments[0] if attachments else None)

    new_ticket = SupportTicket(
        title=ticket.title,
        description=ticket.description or "",
        urgency=ticket.urgency or "Medium",
        category=ticket.category or "Bug",
        raised_by=ticket.raised_by or "Staff",
        project_name=ticket.project_name,
        eta=ticket.eta or "",
        image_url=primary_img,
        attachments_json=attachments,
        comments_json=[],
        created_at=created_date,
        status="Open"
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    return {"status": "ok", "message": "Ticket created successfully", "id": new_ticket.id, "ticket": _serialize_ticket(new_ticket)}


@router.put("/support/tickets/{ticket_id}")
@router.put("/tickets/{ticket_id}")
def update_ticket(ticket_id: int, ticket_data: TicketUpdate, db: Session = Depends(get_db)):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    if ticket_data.title is not None:
        ticket.title = ticket_data.title
    if ticket_data.description is not None:
        ticket.description = ticket_data.description
    if ticket_data.status is not None:
        ticket.status = ticket_data.status
    if ticket_data.urgency is not None:
        ticket.urgency = ticket_data.urgency
    if ticket_data.category is not None:
        ticket.category = ticket_data.category
    if ticket_data.raised_by is not None:
        ticket.raised_by = ticket_data.raised_by
    if ticket_data.project_name is not None:
        ticket.project_name = ticket_data.project_name
    if ticket_data.eta is not None:
        ticket.eta = ticket_data.eta
    if ticket_data.image_url is not None:
        ticket.image_url = ticket_data.image_url
    if ticket_data.attachments is not None:
        ticket.attachments_json = ticket_data.attachments
    if ticket_data.rating is not None:
        try:
            ticket.rating = int(ticket_data.rating)
        except Exception:
            ticket.rating = None
    if ticket_data.response_text is not None:
        ticket.response_text = ticket_data.response_text
        
    if ticket_data.comments is not None:
        ticket.comments_json = ticket_data.comments
    elif ticket_data.new_comment is not None:
        current_comments = ticket.comments_json if isinstance(ticket.comments_json, list) else []
        current_comments.append(ticket_data.new_comment)
        ticket.comments_json = current_comments
        
    from datetime import datetime
    ticket.updated_at = datetime.now().strftime("%d %b %Y, %H:%M")
    
    db.commit()
    db.refresh(ticket)
    return {"status": "ok", "message": "Ticket updated successfully", "ticket": _serialize_ticket(ticket)}


@router.delete("/support/tickets/{ticket_id}")
@router.delete("/tickets/{ticket_id}")
def delete_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    db.delete(ticket)
    db.commit()
    return {"status": "ok", "message": "Ticket deleted successfully"}
