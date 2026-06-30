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
    image_url: Optional[str] = None
    created_at: Optional[str] = None

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    rating: Optional[str] = None
    response_text: Optional[str] = None

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


@router.get("/support/tickets")
def list_tickets(db: Session = Depends(get_db)):
    tickets = db.query(SupportTicket).order_by(SupportTicket.id.desc()).all()
    return [
        {
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "status": t.status,
            "urgency": t.urgency,
            "image_url": t.image_url,
            "rating": t.rating,
            "response_text": t.response_text,
            "created_at": t.created_at
        } for t in tickets
    ]

@router.post("/support/tickets")
def create_ticket(ticket: TicketCreate, db: Session = Depends(get_db)):
    new_ticket = SupportTicket(
        title=ticket.title,
        description=ticket.description,
        urgency=ticket.urgency,
        image_url=ticket.image_url,
        created_at=ticket.created_at,
        status="Pending"
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    return {"status": "ok", "message": "Ticket created successfully", "id": new_ticket.id}

@router.put("/support/tickets/{ticket_id}")
def update_ticket(ticket_id: int, ticket_data: TicketUpdate, db: Session = Depends(get_db)):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    if ticket_data.status is not None:
        ticket.status = ticket_data.status
    if ticket_data.rating is not None:
        try:
            ticket.rating = int(ticket_data.rating)
        except Exception:
            ticket.rating = None
    if ticket_data.response_text is not None:
        ticket.response_text = ticket_data.response_text
        
    db.commit()
    return {"status": "ok", "message": "Ticket updated successfully"}
