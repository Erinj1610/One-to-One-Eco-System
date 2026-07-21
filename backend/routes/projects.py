# Force rebuild of backend container - July 10 2026
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

class BulkDeleteProjectsSchema(BaseModel):
    project_keys: list[str]

@router.post("/bulk-delete")
def bulk_delete_projects(payload: BulkDeleteProjectsSchema, db: Session = Depends(get_db)):
    keys = payload.project_keys
    if not keys:
        raise HTTPException(status_code=400, detail="No project keys provided")
        
    projects = db.query(Project).filter(Project.project_key.in_(keys)).all()
    if not projects:
        return {"message": "No matching projects found to delete"}
        
    from models.orm_models import Order
    for project in projects:
        has_orders = db.query(Order).filter(Order.project_key == project.project_key).first() is not None
        has_design_fee = (project.design_fee and project.design_fee > 0) or any(getattr(project, s) for s in ["s1", "s2", "s3", "s4", "s5"])
        if has_orders or has_design_fee:
            raise HTTPException(
                status_code=400, 
                detail=f"Deletion blocked: Project '{project.name}' has active design fees or orders"
            )
        
    try:
        from models.orm_models import (
            OrderItem, ProjectFieldValue, ProjectPhase, 
            Proposal, BOQ, Invoice, Document, Quote, ProjectFolder
        )
        
        found_keys = [p.project_key for p in projects]
        found_ids = [p.id for p in projects]
        
        # 1. Cascade delete orders and items linked to these project keys (should be 0 since we blocked above, but keep for safety/completeness)
        db.query(OrderItem).filter(OrderItem.order_id.in_(
            db.query(Order.po_number).filter(Order.project_key.in_(found_keys))
        )).delete(synchronize_session=False)
        db.query(Order).filter(Order.project_key.in_(found_keys)).delete(synchronize_session=False)
            
        # 2. Deletes by project.id
        db.query(ProjectFieldValue).filter(ProjectFieldValue.project_id.in_(found_ids)).delete(synchronize_session=False)
        db.query(ProjectPhase).filter(ProjectPhase.project_id.in_(found_ids)).delete(synchronize_session=False)
        db.query(Proposal).filter(Proposal.project_id.in_(found_ids)).delete(synchronize_session=False)
        db.query(BOQ).filter(BOQ.project_id.in_(found_ids)).delete(synchronize_session=False)
        db.query(Document).filter(Document.project_id.in_(found_ids)).delete(synchronize_session=False)
        db.query(Quote).filter(Quote.project_id.in_(found_ids)).delete(synchronize_session=False)
        db.query(ProjectFolder).filter(ProjectFolder.project_id.in_(found_ids)).delete(synchronize_session=False)
        
        # Nullify project references on invoices
        db.query(Invoice).filter(Invoice.project_id.in_(found_ids)).update({"project_id": None}, synchronize_session=False)

        # 3. Delete project rows
        for project in projects:
            db.delete(project)
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Database constraint violation: {str(e)}")
        
    return {"message": f"Successfully deleted {len(projects)} projects and their dependencies"}

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

class ReconcileProjectSchema(BaseModel):
    project_key: str
    proj_name: str
    client_company: str
    orders: dict

@router.post("/reconcile-project-bulk")
def reconcile_single_project_bulk(payload: ReconcileProjectSchema, db: Session = Depends(get_db)):
    from models.orm_models import Order, OrderItem, Project
    
    proj_key = payload.project_key
    proj_name = payload.proj_name
    client_company = payload.client_company
    orders_dict = payload.orders
        
    try:
        def safe_int(v):
            try:
                if v is None or v == "":
                    return 0
                val = int(float(v))
                if val > 2147483647:
                    return 2147483647
                if val < -2147483648:
                    return -2147483648
                return val
            except (ValueError, TypeError):
                return 0

        # 1. Resolve or Auto-create Project
        project = db.query(Project).filter(Project.project_key == proj_key).first()
        if not project:
            project = Project(
                name=proj_name,
                project_key=proj_key,
                client_name=client_company,
                status="On track",
                complete_status="Ongoing"
            )
            db.add(project)
            db.flush() # Populate project.id
        elif client_company and client_company != "—" and not project.client_name:
            project.client_name = client_company

        # 1b. Auto-create or link Client entity in clients table
        if client_company and client_company != "—":
            from models.orm_models import Client
            existing_client = db.query(Client).filter(Client.company == client_company).first()
            if not existing_client:
                existing_client = db.query(Client).filter(Client.name == client_company).first()
            if not existing_client:
                new_client = Client(
                    name=client_company,
                    company=client_company,
                    status="Active",
                    lifetime_revenue=0.0
                )
                db.add(new_client)
                db.flush()
            # 2. Reset/Wipe existing Order items and document relationships in PostgreSQL
            db.query(OrderItem).filter(OrderItem.order_id == order_id).delete(synchronize_session=False)
            db.query(Order).filter(Order.po_number == order_id).delete(synchronize_session=False)
            db.flush()
            
            # 3. Create clean Order row
            db_order = Order(
                project_id=project.id,
                project_key=proj_key,
                po_number=order_id,
                supplier_name=order.get("supplier", "Multiple Suppliers"),
                items_count=len(order.get("itemsList", [])),
                value=float(order.get("value", 0.0)),
                paid=float(order.get("paid", 0.0)),
                outstanding=float(order.get("outstanding", 0.0)),
                status=order.get("status", "Processing"),
                eta=order.get("eta", "—"),
                quote_name=order.get("quote_name", "General Spec"),
                packing_lists=order.get("packingLists", []),
                delivery_notes=order.get("deliveryNotes", []),
                purchase_orders=order.get("purchaseOrders", []),
                goods_received_notes=order.get("goodsReceivedNotes", []),
                client_invoices=order.get("clientInvoices", []),
                order_date=order.get("orderDate"),
                quotation_sent_date=order.get("quotationSentDate"),
                pf_date=order.get("pfDate"),
                payments=order.get("payments", []),
                deposit_value=float(order.get("depositValue")) if order.get("depositValue") is not None else None,
                deposit_invoice_sent=order.get("depositInvoiceSent"),
                deposit_payment_date=order.get("depositPaymentDate"),
                balance_value=float(order.get("balanceValue")) if order.get("balanceValue") is not None else None,
                balance_payment_date=order.get("balancePaymentDate")
            )
            db.add(db_order)
            
            # 4. Create clean OrderItem rows in batch
            for item in order.get("itemsList", []):
                db_item = OrderItem(
                    id=item.get("id"),
                    order_id=order_id,
                    qty=safe_int(item.get("qty", 0)),
                    type=item.get("type"),
                    one_one_code=item.get("oneOneCode"),
                    code=item.get("code"),
                    description=item.get("description"),
                    floor=item.get("floor"),
                    area=item.get("area"),
                    dimming=item.get("dimming"),
                    brand=item.get("brand"),
                    supplier=item.get("supplier"),
                    unit_cost=float(item.get("unitCost", 0.0)),
                    unit_trade=float(item.get("unitTrade", 0.0)),
                    unit_retail=float(item.get("unitRetail", 0.0)),
                    selection=item.get("selection"),
                    stock_status=item.get("stockStatus"),
                    eta=item.get("eta"),
                    po_ref=item.get("poRef"),
                    po_qty_ordered=safe_int(item.get("poQtyOrdered", 0)),
                    po_eta=item.get("poEta"),
                    invoice_qty=safe_int(item.get("invoiceQty", 0)),
                    po_supplier=item.get("poSupplier"),
                    po_date=item.get("poDate"),
                    received_qty=safe_int(item.get("receivedQty", 0)),
                    received_date=item.get("receivedDate"),
                    invoice_ref=item.get("invoiceRef"),
                    invoice_date=item.get("invoiceDate"),
                    invoice_value=float(item.get("invoiceValue", 0.0)),
                    delivery_qty=safe_int(item.get("deliveryQty", 0)),
                    delivery_date=item.get("deliveryDate"),
                    delivery_status=item.get("deliveryStatus", "Pending"),
                    delivery_history=item.get("deliveryHistory", []),
                    purchase_history=item.get("purchaseHistory", []),
                    receiving_history=item.get("receivingHistory", []),
                    invoice_history=item.get("invoiceHistory", []),
                    stock_on_hand=safe_int(item.get("stockOnHand", 0)),
                    is_credit=bool(item.get("isCredit", False)),
                    item_type=item.get("itemType", "Hardware")
                )
                db.add(db_item)
                
        db.commit()
        return {"success": True, "message": f"Project '{proj_name}' bulk sync completed successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database transaction error for project {proj_name}: {str(e)}")


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

    from models.orm_models import Order
    has_orders = db.query(Order).filter(Order.project_key == project.project_key).first() is not None
    has_design_fee = (project.design_fee and project.design_fee > 0) or any(getattr(project, s) for s in ["s1", "s2", "s3", "s4", "s5"])
    if has_orders or has_design_fee:
        raise HTTPException(
            status_code=400, 
            detail=f"Deletion blocked: Project '{project.name}' has active design fees or orders"
        )

    try:
        from models.orm_models import (
            OrderItem, ProjectFieldValue, ProjectPhase, 
            Proposal, BOQ, Invoice, Document, Quote, ProjectFolder
        )
        
        # 1. Cascade delete orders (safety fallback)
        db.query(OrderItem).filter(OrderItem.order_id.in_(
            db.query(Order.po_number).filter(Order.project_key == project_key)
        )).delete(synchronize_session=False)
        db.query(Order).filter(Order.project_key == project_key).delete(synchronize_session=False)
            
        # 2. Deletes by project.id
        db.query(ProjectFieldValue).filter(ProjectFieldValue.project_id == project.id).delete(synchronize_session=False)
        db.query(ProjectPhase).filter(ProjectPhase.project_id == project.id).delete(synchronize_session=False)
        db.query(Proposal).filter(Proposal.project_id == project.id).delete(synchronize_session=False)
        db.query(BOQ).filter(BOQ.project_id == project.id).delete(synchronize_session=False)
        db.query(Document).filter(Document.project_id == project.id).delete(synchronize_session=False)
        db.query(Quote).filter(Quote.project_id == project.id).delete(synchronize_session=False)
        db.query(ProjectFolder).filter(ProjectFolder.project_id == project.id).delete(synchronize_session=False)
        
        # Nullify project references on invoices
        db.query(Invoice).filter(Invoice.project_id == project.id).update({"project_id": None}, synchronize_session=False)

        # 3. Delete project row itself
        db.delete(project)
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Database constraint violation: {str(e)}")

    return {"message": "Project and its dependent records deleted successfully"}

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
            
            def parse_history(h_val):
                if h_val is None:
                    return []
                if isinstance(h_val, (list, dict)):
                    return h_val
                try:
                    import json
                    return json.loads(h_val)
                except Exception:
                    return []

            del_hist = parse_history(item.delivery_history)
            pur_hist = parse_history(item.purchase_history)
            rec_hist = parse_history(item.receiving_history)
            inv_hist = parse_history(item.invoice_history)


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
                "is_credit": bool(item.is_credit),
                "itemType": item.item_type or "Hardware",
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
                "purchaseHistory": pur_hist,
                "receivingHistory": rec_hist,
                "invoiceHistory": inv_hist,
                "stockOnHand": item.stock_on_hand
            })


        # Group orders by project key
        orders_by_project = {}
        for order in orders:
            if not order.project_key:
                continue
            if order.project_key not in orders_by_project:
                orders_by_project[order.project_key] = []
            
            order_items_list = items_by_order.get(order.po_number, [])
            
            def safe_num(v, default=0.0):
                try:
                    if v is None:
                        return default
                    if isinstance(v, str):
                        v = v.replace("R", "").replace(",", "").strip()
                        if not v or v == "—":
                            return default
                    return float(v)
                except (ValueError, TypeError):
                    return default

            total_cost_value = sum((int(safe_num(item.get("qty"), 0)) * safe_num(item.get("unitCost"), 0.0)) for item in order_items_list)

            try:
                packing_lists_parsed = json.loads(order.packing_lists) if isinstance(order.packing_lists, str) else (order.packing_lists or [])
            except Exception:
                packing_lists_parsed = []

            try:
                delivery_notes_parsed = json.loads(order.delivery_notes) if isinstance(order.delivery_notes, str) else (order.delivery_notes or [])
            except Exception:
                delivery_notes_parsed = []

            try:
                purchase_orders_parsed = json.loads(order.purchase_orders) if isinstance(order.purchase_orders, str) else (order.purchase_orders or [])
            except Exception:
                purchase_orders_parsed = []

            try:
                goods_received_notes_parsed = json.loads(order.goods_received_notes) if isinstance(order.goods_received_notes, str) else (order.goods_received_notes or [])
            except Exception:
                goods_received_notes_parsed = []

            try:
                client_invoices_parsed = json.loads(order.client_invoices) if isinstance(order.client_invoices, str) else (order.client_invoices or [])
            except Exception:
                client_invoices_parsed = []

            order_dict = {
                "id": order.po_number,
                "supplier": order.supplier_name,
                "items": order.items_count,
                "value": order.value,
                "costValue": total_cost_value,
                "paid": order.paid,
                "outstanding": order.outstanding,
                "status": order.status,
                "eta": order.eta,
                "quote_name": order.quote_name or "General Spec",
                "itemsList": order_items_list,
                "packingLists": packing_lists_parsed,
                "deliveryNotes": delivery_notes_parsed,
                "purchaseOrders": purchase_orders_parsed,
                "goodsReceivedNotes": goods_received_notes_parsed,
                "clientInvoices": client_invoices_parsed,
                "orderDate": order.order_date,
                "quotationSentDate": order.quotation_sent_date,
                "pfDate": order.pf_date,
                "payments": json.loads(order.payments) if isinstance(order.payments, str) else (order.payments or []),
                "depositValue": order.deposit_value,
                "depositInvoiceSent": order.deposit_invoice_sent,
                "depositPaymentDate": order.deposit_payment_date,
                "balanceValue": order.balance_value,
                "balancePaymentDate": order.balance_payment_date
            }
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
                "start": p.start_date,
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



