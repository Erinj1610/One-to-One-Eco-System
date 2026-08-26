from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Any, Dict
from pydantic import BaseModel
from database.cloud_sql import get_db
from models.orm_models import Client
from datetime import datetime

router = APIRouter()

class ClientCreateSchema(BaseModel):
    name: str
    company: Optional[str] = None
    type: Optional[str] = "Private"
    email: Optional[str] = ""
    phone: Optional[str] = ""
    status: Optional[str] = "Active"
    statedGoal: Optional[str] = None
    stated_goal: Optional[str] = None
    nps: Optional[int] = None
    annualRevenue: Optional[float] = 0.0
    annual_revenue: Optional[float] = 0.0
    lifetimeRevenue: Optional[float] = 0.0
    lifetime_revenue: Optional[float] = 0.0
    totalValue: Optional[float] = None
    lastContactDate: Optional[str] = None
    last_contact_date: Optional[str] = None
    lastContactSummary: Optional[str] = None
    last_contact_summary: Optional[str] = None
    lastProjectDate: Optional[str] = None
    last_project_date: Optional[str] = None
    dateStarted: Optional[str] = None
    date_started: Optional[str] = None
    orderGapMonths: Optional[int] = None
    order_gap_months: Optional[int] = None
    avgPaymentDelayDays: Optional[int] = None
    avg_payment_delay_days: Optional[int] = None
    activities: Optional[List[Any]] = []

def serialize_client(c: Client) -> Dict[str, Any]:
    acts = c.activities if isinstance(c.activities, list) else []
    stated = c.stated_goal or ""
    ann_rev = float(c.annual_revenue or 0.0)
    lt_rev = float(c.lifetime_revenue or 0.0)
    lc_date = c.last_contact_date or ""
    lc_summary = c.last_contact_summary or ""
    lp_date = c.last_project_date or ""
    d_start = c.date_started or ""
    
    return {
        "id": c.id,
        "name": c.name or "",
        "company": c.company or c.name or "",
        "type": c.type or "Private",
        "email": c.email or "",
        "phone": c.phone or "",
        "status": c.status or "Active",
        "nps": c.nps,
        "statedGoal": stated,
        "stated_goal": stated,
        "annualRevenue": ann_rev,
        "annual_revenue": ann_rev,
        "lifetimeRevenue": lt_rev,
        "lifetime_revenue": lt_rev,
        "totalValue": lt_rev,
        "lastContactDate": lc_date,
        "last_contact_date": lc_date,
        "lastContactSummary": lc_summary,
        "last_contact_summary": lc_summary,
        "lastProjectDate": lp_date,
        "last_project_date": lp_date,
        "dateStarted": d_start,
        "date_started": d_start,
        "orderGapMonths": c.order_gap_months,
        "order_gap_months": c.order_gap_months,
        "avgPaymentDelayDays": c.avg_payment_delay_days,
        "avg_payment_delay_days": c.avg_payment_delay_days,
        "activities": acts
    }

@router.get("", response_model=List[Dict[str, Any]])
@router.get("/", response_model=List[Dict[str, Any]])
def get_clients(db: Session = Depends(get_db)):
    """Fetch all clients from Cloud SQL clients table."""
    clients = db.query(Client).order_by(Client.name.asc()).all()
    return [serialize_client(c) for c in clients]

@router.get("/{client_id}")
def get_client(client_id: str, db: Session = Depends(get_db)):
    """Fetch single client by ID or Name."""
    client = None
    if client_id.isdigit():
        client = db.query(Client).filter(Client.id == int(client_id)).first()
    if not client:
        client = db.query(Client).filter(Client.name.ilike(client_id)).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return serialize_client(client)

@router.post("", response_model=Dict[str, Any])
@router.post("/", response_model=Dict[str, Any])
def create_client(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    """Create a new client in Cloud SQL."""
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Client name is required")
    
    # Check if client already exists with same name
    existing = db.query(Client).filter(Client.name.ilike(name)).first()
    if existing:
        # Update existing
        target = existing
    else:
        target = Client(name=name)
        db.add(target)
    
    if "company" in payload:
        target.company = payload.get("company") or name
    if "type" in payload:
        target.type = payload.get("type") or "Private"
    if "email" in payload:
        target.email = payload.get("email")
    if "phone" in payload:
        target.phone = payload.get("phone")
    if "status" in payload:
        target.status = payload.get("status") or "Active"
    if "nps" in payload:
        target.nps = int(payload["nps"]) if payload.get("nps") is not None and str(payload["nps"]).isdigit() else None
    if "statedGoal" in payload or "stated_goal" in payload:
        target.stated_goal = payload.get("statedGoal") or payload.get("stated_goal")
    if "annualRevenue" in payload or "annual_revenue" in payload:
        target.annual_revenue = float(payload.get("annualRevenue") or payload.get("annual_revenue") or 0.0)
    if "lifetimeRevenue" in payload or "lifetime_revenue" in payload or "totalValue" in payload:
        target.lifetime_revenue = float(payload.get("lifetimeRevenue") or payload.get("lifetime_revenue") or payload.get("totalValue") or 0.0)
    if "lastContactDate" in payload or "last_contact_date" in payload:
        target.last_contact_date = payload.get("lastContactDate") or payload.get("last_contact_date")
    if "lastContactSummary" in payload or "last_contact_summary" in payload:
        target.last_contact_summary = payload.get("lastContactSummary") or payload.get("last_contact_summary")
    if "lastProjectDate" in payload or "last_project_date" in payload:
        target.last_project_date = payload.get("lastProjectDate") or payload.get("last_project_date")
    if "dateStarted" in payload or "date_started" in payload:
        target.date_started = payload.get("dateStarted") or payload.get("date_started")
    if "activities" in payload:
        target.activities = payload.get("activities") or []

    db.commit()
    db.refresh(target)
    return serialize_client(target)

@router.put("/{client_id}", response_model=Dict[str, Any])
def update_client(client_id: str, payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    """Update an existing client profile in Cloud SQL."""
    client = None
    if client_id.isdigit():
        client = db.query(Client).filter(Client.id == int(client_id)).first()
    
    # Check if client_id was passed as name or dyn- slug
    if not client and client_id.startswith(("dyn-", "new-")):
        raw_slug = client_id.replace("dyn-", "").replace("new-", "").replace("-", " ").strip()
        client = db.query(Client).filter(Client.name.ilike(f"%{raw_slug}%")).first()

    if not client:
        client = db.query(Client).filter(Client.name.ilike(client_id.strip())).first()

    if not client and payload.get("name"):
        client = db.query(Client).filter(Client.name.ilike(payload.get("name").strip())).first()
    
    if not client:
        # If still not found, create new client record
        name = (payload.get("name") or client_id).strip()
        client = Client(name=name)
        db.add(client)

    old_name = client.name
    new_name = (payload.get("name") or "").strip()

    if new_name:
        client.name = new_name

    if "company" in payload:
        client.company = payload.get("company") or client.name
    if "type" in payload:
        client.type = payload.get("type")
    if "email" in payload:
        client.email = payload.get("email")
    if "phone" in payload:
        client.phone = payload.get("phone")
    if "status" in payload:
        client.status = payload.get("status")
    if "nps" in payload:
        try:
            client.nps = int(payload["nps"]) if payload.get("nps") is not None and str(payload["nps"]).strip() != "" else None
        except Exception:
            client.nps = None
    if "statedGoal" in payload or "stated_goal" in payload:
        client.stated_goal = payload.get("statedGoal") if "statedGoal" in payload else payload.get("stated_goal")
    if "annualRevenue" in payload or "annual_revenue" in payload:
        val = payload.get("annualRevenue") if "annualRevenue" in payload else payload.get("annual_revenue")
        try:
            client.annual_revenue = float(val or 0.0)
        except Exception:
            pass
    if "lifetimeRevenue" in payload or "lifetime_revenue" in payload or "totalValue" in payload:
        val = payload.get("lifetimeRevenue") or payload.get("lifetime_revenue") or payload.get("totalValue")
        try:
            client.lifetime_revenue = float(val or 0.0)
        except Exception:
            pass
    if "lastContactDate" in payload or "last_contact_date" in payload:
        client.last_contact_date = payload.get("lastContactDate") if "lastContactDate" in payload else payload.get("last_contact_date")
    if "lastContactSummary" in payload or "last_contact_summary" in payload:
        client.last_contact_summary = payload.get("lastContactSummary") if "lastContactSummary" in payload else payload.get("last_contact_summary")
    if "lastProjectDate" in payload or "last_project_date" in payload:
        client.last_project_date = payload.get("lastProjectDate") if "lastProjectDate" in payload else payload.get("last_project_date")
    if "dateStarted" in payload or "date_started" in payload:
        client.date_started = payload.get("dateStarted") if "dateStarted" in payload else payload.get("date_started")
    if "orderGapMonths" in payload or "order_gap_months" in payload:
        val = payload.get("orderGapMonths") if "orderGapMonths" in payload else payload.get("order_gap_months")
        try:
            client.order_gap_months = int(val) if val is not None else None
        except Exception:
            pass
    if "avgPaymentDelayDays" in payload or "avg_payment_delay_days" in payload:
        val = payload.get("avgPaymentDelayDays") if "avgPaymentDelayDays" in payload else payload.get("avg_payment_delay_days")
        try:
            client.avg_payment_delay_days = int(val) if val is not None else None
        except Exception:
            pass
    if "activities" in payload:
        client.activities = payload.get("activities") or []

    db.commit()
    db.refresh(client)
    return serialize_client(client)

@router.post("/{client_id}/activities", response_model=Dict[str, Any])
def add_client_activity(client_id: str, payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    """Append a new CRM activity to the client and update last contact summary."""
    client = None
    if client_id.isdigit():
        client = db.query(Client).filter(Client.id == int(client_id)).first()
    if not client:
        client = db.query(Client).filter(Client.name.ilike(client_id)).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    acts = list(client.activities) if isinstance(client.activities, list) else []
    new_act = {
        "id": int(datetime.utcnow().timestamp() * 1000),
        "type": payload.get("type") or "Note",
        "date": payload.get("date") or datetime.utcnow().strftime("%Y-%m-%d"),
        "text": payload.get("text") or "",
        "createdBy": payload.get("createdBy") or "User"
    }
    acts.append(new_act)
    client.activities = acts
    client.last_contact_date = new_act["date"]
    client.last_contact_summary = new_act["text"]
    
    db.commit()
    db.refresh(client)
    return serialize_client(client)

@router.delete("/{client_id}")
def delete_client(client_id: str, db: Session = Depends(get_db)):
    """Delete client from Cloud SQL."""
    client = None
    if client_id.isdigit():
        client = db.query(Client).filter(Client.id == int(client_id)).first()
    if not client:
        client = db.query(Client).filter(Client.name.ilike(client_id)).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    db.delete(client)
    db.commit()
    return {"status": "success", "message": f"Client {client_id} deleted successfully"}
