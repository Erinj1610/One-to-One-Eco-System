from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.cloud_sql import get_db
from models.orm_models import Project, Quote, FeeStatus, KanbanState
from pydantic import BaseModel

class QuoteCreate(BaseModel):
    phase_name: str

router = APIRouter()

from typing import Optional, Any

class ProjectSchema(BaseModel):
    name: str
    project_key: Optional[str] = None
    client_name: Optional[str] = None
    pm_name: Optional[str] = None
    offering: Optional[str] = None
    sqm: Optional[str] = None
    status: Optional[str] = "On track"
    deadline: Optional[str] = "TBD"
    complete_status: Optional[str] = "Ongoing"
    target_margin: float = 0.0
    actual_margin: float = 0.0
    s1: Optional[str] = ""
    s2: Optional[str] = ""
    s3: Optional[str] = ""
    s4: Optional[str] = ""
    s5: Optional[str] = ""

@router.post("/")
def create_project(project: ProjectSchema, db: Session = Depends(get_db)):
    # Generate project key if not provided
    p_key = project.project_key
    if not p_key:
        p_key = (project.name or 'new-project').lower().strip().replace(' ', '-')
    
    # Ensure uniqueness
    existing = db.query(Project).filter(Project.project_key == p_key).first()
    if existing:
        raise HTTPException(status_code=400, detail="Project with this key already exists")

    new_project = Project(
        name=project.name,
        project_key=p_key,
        client_name=project.client_name,
        pm_name=project.pm_name,
        offering=project.offering,
        sqm=project.sqm,
        status=project.status,
        deadline=project.deadline,
        complete_status=project.complete_status,
        target_margin=project.target_margin,
        actual_margin=project.actual_margin,
        s1=project.s1,
        s2=project.s2,
        s3=project.s3,
        s4=project.s4,
        s5=project.s5
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project

@router.put("/{project_key}")
def update_project_relational(project_key: str, project_data: ProjectSchema, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.project_key == project_key).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.name = project_data.name
    project.client_name = project_data.client_name
    project.pm_name = project_data.pm_name
    project.offering = project_data.offering
    project.sqm = project_data.sqm
    project.status = project_data.status
    project.deadline = project_data.deadline
    project.complete_status = project_data.complete_status
    project.target_margin = project_data.target_margin
    project.actual_margin = project_data.actual_margin
    project.s1 = project_data.s1
    project.s2 = project_data.s2
    project.s3 = project_data.s3
    project.s4 = project_data.s4
    project.s5 = project_data.s5

    db.commit()
    db.refresh(project)
    return project

@router.delete("/{project_key}")
def delete_project_relational(project_key: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.project_key == project_key).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Cascade delete orders and items linked to this project key
    from models.orm_models import Order, OrderItem
    orders = db.query(Order).filter(Order.project_key == project_key).all()
    po_numbers = [o.po_number for o in orders if o.po_number]
    if po_numbers:
        db.query(OrderItem).filter(OrderItem.order_id.in_(po_numbers)).delete(synchronize_session=False)
        db.query(Order).filter(Order.po_number.in_(po_numbers)).delete(synchronize_session=False)

    db.delete(project)
    db.commit()
    return {"message": "Project and its orders/items deleted successfully"}

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

@router.get("/all")
def list_all_projects_relational(db: Session = Depends(get_db)):
    import json
    from models.orm_models import Order, OrderItem
    try:
        projects = db.query(Project).all()
        orders = db.query(Order).all()
        order_items = db.query(OrderItem).all()

        # Group items by order ID
        items_by_order = {}
        for item in order_items:
            if not item.order_id:
                continue
            if item.order_id not in items_by_order:
                items_by_order[item.order_id] = []
            
            try:
                del_hist = json.loads(item.delivery_history) if item.delivery_history else []
            except Exception:
                del_hist = []

            items_by_order[item.order_id].append({
                "id": item.id,
                "qty": item.qty,
                "type": item.type,
                "oneOneCode": item.one_one_code,
                "code": item.code,
                "description": item.description,
                "floor": item.floor,
                "area": item.area,
                "dimming": item.dimming,
                "brand": item.brand,
                "supplier": item.supplier,
                "unitCost": item.unit_cost,
                "unitTrade": item.unit_trade,
                "unitRetail": item.unit_retail,
                "selection": item.selection,
                "stockStatus": item.stock_status,
                "eta": item.eta,
                "poRef": item.po_ref,
                "poQtyOrdered": item.po_qty_ordered,
                "poEta": item.po_eta,
                "invoiceQty": item.invoice_qty,
                "poSupplier": item.po_supplier,
                "poDate": item.po_date,
                "receivedQty": item.received_qty,
                "receivedDate": item.received_date,
                "invoiceRef": item.invoice_ref,
                "invoiceDate": item.invoice_date,
                "invoiceValue": item.invoice_value,
                "deliveryQty": item.delivery_qty,
                "deliveryDate": item.delivery_date,
                "deliveryStatus": item.delivery_status,
                "deliveryHistory": del_hist,
                "stockOnHand": item.stock_on_hand
            })

        # Group orders by project key
        orders_by_project = {}
        for order in orders:
            if not order.project_key:
                continue
            if order.project_key not in orders_by_project:
                orders_by_project[order.project_key] = []
            
            order_dict = {
                "id": order.po_number,
                "supplier": order.supplier_name,
                "items": order.items_count,
                "value": order.value,
                "paid": order.paid,
                "outstanding": order.outstanding,
                "status": order.status,
                "eta": order.eta,
                "itemsList": items_by_order.get(order.po_number, [])
            }
            if order.metadata and isinstance(order.metadata, dict):
                # Ensure the standard keys aren't overwritten by stale metadata values
                for k, v in order.metadata.items():
                    if k not in {"id", "supplier", "items", "value", "paid", "outstanding", "status", "eta", "itemsList"}:
                        order_dict[k] = v
            orders_by_project[order.project_key].append(order_dict)

        # Build projects dictionary
        projects_dict = {}
        import re
        for p in projects:
            p_key = p.project_key
            if not p_key:
                p_key = re.sub(r'[^a-z0-9\-]', '-', (p.name or '').lower())
                p_key = re.sub(r'-+', '-', p_key).strip('-')
                if not p_key:
                    p_key = f"p-{p.id}"
            projects_dict[p_key] = {
                "key": p_key,
                "name": p.name,
                "client": p.client_name,
                "pm": p.pm_name,
                "offering": p.offering,
                "sqm": p.sqm,
                "status": p.status,
                "deadline": p.deadline,
                "complete": p.complete_status,
                "targetMargin": p.target_margin,
                "actualMargin": p.actual_margin,
                "s1": p.s1 or "",
                "s2": p.s2 or "",
                "s3": p.s3 or "",
                "s4": p.s4 or "",
                "s5": p.s5 or "",
                "orders": orders_by_project.get(p_key, [])
            }
        return projects_dict
    except Exception as e:
        print(f"Error dynamically building projects dict: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class ProjectsSave(BaseModel):
    value: Any

@router.post("/save")
def save_all_projects_relational(data: ProjectsSave, db: Session = Depends(get_db)):
    try:
        from services.db_sync_service import sync_projects
        sync_projects(data.value, db)
        return {"status": "ok", "message": "Projects saved and synchronized directly to relational SQL tables."}
    except Exception as sync_err:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to sync projects: {sync_err}")
