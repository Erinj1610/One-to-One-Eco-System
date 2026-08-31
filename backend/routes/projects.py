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
    name: Optional[str] = "New Project"
    project_key: Optional[str] = None
    client_name: Optional[str] = None
    pm_name: Optional[str] = None
    offering: Optional[str] = None
    sqm: Optional[str] = None
    status: Optional[str] = "On track"
    deadline: Optional[str] = "TBD"
    start_date: Optional[str] = None
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

DEFAULT_DESIGN_FEE_RATES = {
    "currency_rates": {
        "usdConv": 20.00
    },
    "phase_multipliers": {
        "schematicPercent": 0.80,
        "finalPercent": 0.65,
        "siteSupportPercent": 0.2272,
        "commissioningPercent": 0.1070
    },
    "area_rates": {
        "experiential_living": { "archFitting": 1050.00, "conceptLighting": 180.00 },
        "secondary_living": { "archFitting": 750.00, "conceptLighting": 105.00 },
        "non_experiential_living": { "archFitting": 300.00, "conceptLighting": 30.00 },
        "experiential_landscape": { "archFitting": 825.00, "conceptLighting": 140.00 },
        "secondary_landscape": { "archFitting": 525.00, "conceptLighting": 55.00 }
    },
    "default_discounts": {
        "designDiscountRate": 0.20,
        "archDiscountRate": 0.04
    },
    "signature_consultant_flat": {
        "siteSupport": 4000.00,
        "commissioning": 4000.00
    }
}

def get_active_global_design_rates(db: Session) -> dict:
    from models.orm_models import TemplateConfig
    config = db.query(TemplateConfig).filter(TemplateConfig.template_key == "DESIGN_FEE_RATES").first()
    if config and config.config_json:
        return config.config_json
    return DEFAULT_DESIGN_FEE_RATES

@router.post("/")
def create_project(project: ProjectSchema, db: Session = Depends(get_db)):
    # Generate project key if not provided
    p_key = project.project_key
    if not p_key:
        p_key = (project.name or 'new-project').lower().strip().replace(' ', '-')
    
    # Ensure uniqueness or update existing record
    existing = db.query(Project).filter(Project.project_key == p_key).first()
    if existing:
        existing.name = project.name or existing.name
        if project.client_name is not None: existing.client_name = project.client_name
        if project.pm_name is not None: existing.pm_name = project.pm_name
        if project.offering is not None: existing.offering = project.offering
        if project.sqm is not None: existing.sqm = project.sqm
        if project.status is not None: existing.status = project.status
        if project.deadline is not None: existing.deadline = project.deadline
        if project.start_date is not None: existing.start_date = project.start_date
        if project.complete_status is not None: existing.complete_status = project.complete_status
        if project.target_margin: existing.target_margin = project.target_margin
        if project.actual_margin: existing.actual_margin = project.actual_margin
        if project.s1: existing.s1 = project.s1
        if project.s2: existing.s2 = project.s2
        if project.s3: existing.s3 = project.s3
        if project.s4: existing.s4 = project.s4
        if project.s5: existing.s5 = project.s5
        db.commit()
        db.refresh(existing)
        return existing

    active_rates = get_active_global_design_rates(db)

    new_project = Project(
        name=project.name or "New Project",
        project_key=p_key,
        client_name=project.client_name,
        pm_name=project.pm_name,
        offering=project.offering,
        sqm=project.sqm,
        status=project.status or "On track",
        deadline=project.deadline or "TBD",
        start_date=project.start_date or "",
        complete_status=project.complete_status or "Ongoing",
        target_margin=project.target_margin or 39.0,
        actual_margin=project.actual_margin or 39.0,
        s1=project.s1 or "",
        s2=project.s2 or "",
        s3=project.s3 or "",
        s4=project.s4 or "",
        s5=project.s5 or "",
        design_fee_rates_snapshot=active_rates,
        design_fee_rates_original=active_rates
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project

@router.post("/{project_id}/resync-design-rates")
def resync_project_design_rates(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    active_rates = get_active_global_design_rates(db)
    project.design_fee_rates_snapshot = active_rates
    db.commit()
    db.refresh(project)
    return {"message": "Project design fee rates resynced to latest global settings", "rates": project.design_fee_rates_snapshot}

@router.post("/{project_id}/revert-design-rates")
def revert_project_design_rates(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.design_fee_rates_original:
        project.design_fee_rates_snapshot = project.design_fee_rates_original
    else:
        project.design_fee_rates_snapshot = get_active_global_design_rates(db)
        
    db.commit()
    db.refresh(project)
    return {"message": "Project design fee rates reverted to original creation snapshot", "rates": project.design_fee_rates_snapshot}

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

        # 1a. Extract PM / Sales Rep from order batch and attach directly to project.pm_name
        first_order = next(iter(orders_dict.values()), {}) if orders_dict else {}
        extracted_pm = first_order.get("pmName") or first_order.get("salesRep") or first_order.get("pm")
        if extracted_pm and extracted_pm != "—" and extracted_pm != "Select Project Manager...":
            project.pm_name = extracted_pm

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

        for order_id, order in orders_dict.items():
            pm_candidate = order.get("pmName") or order.get("pm") or order.get("salesRep")
            if pm_candidate and pm_candidate != "—" and pm_candidate != "Select Project Manager...":
                try:
                    from sqlalchemy import text
                    res = db.execute(text("SELECT id FROM employees WHERE name = :name"), {"name": pm_candidate}).first()
                    if not res:
                        db.execute(text("""
                            INSERT INTO employees (name, role, department)
                            VALUES (:name, 'Project Manager', 'Design')
                        """), {"name": pm_candidate})
                        db.flush()
                except Exception:
                    pass

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
                deposit_percentage=float(order.get("depositPercentage")) if order.get("depositPercentage") is not None else (float(order.get("deposit_percentage")) if order.get("deposit_percentage") is not None else None),
                deposit_value=float(order.get("depositValue")) if order.get("depositValue") is not None else (float(order.get("deposit_value")) if order.get("deposit_value") is not None else None),
                deposit_invoice_sent=order.get("depositInvoiceSent"),
                deposit_payment_date=order.get("depositPaymentDate"),
                balance_value=float(order.get("balanceValue")) if order.get("balanceValue") is not None else None,
                balance_payment_date=order.get("balancePaymentDate")
            )
            db.add(db_order)
            
            # 4. Create clean OrderItem rows in batch (excluding obsolete manual credits, as all credits come from Palladium ERP)
            for item in order.get("itemsList", []):
                raw_item_qty = safe_int(item.get("qty", 0))
                is_credit_val = bool(item.get("isCredit") or item.get("is_credit") or raw_item_qty < 0 or item.get("type") in ("Credit", "Credit Note", "Custom Credit") or str(item.get("id", "")).startswith("C-"))
                if is_credit_val:
                    continue

                db_item = OrderItem(
                    id=item.get("id"),
                    order_id=order_id,
                    qty=raw_item_qty,
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
                    is_credit=False,
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
    if not project and project_data.project_key:
        project = db.query(Project).filter(Project.project_key == project_data.project_key).first()
    if not project:
        project = db.query(Project).filter(Project.name == project_key).first()
    if not project and project_data.name:
        project = db.query(Project).filter(Project.name == project_data.name).first()
    if not project:
        normalized_name = project_key.replace('-', ' ')
        project = db.query(Project).filter(Project.name.ilike(normalized_name)).first()

    if not project:
        active_rates = get_active_global_design_rates(db)
        project = Project(
            name=project_data.name or "New Project",
            project_key=project_data.project_key or project_key,
            client_name=project_data.client_name,
            pm_name=project_data.pm_name,
            offering=project_data.offering,
            sqm=project_data.sqm,
            status=project_data.status or "On track",
            deadline=project_data.deadline or "TBD",
            complete_status=project_data.complete_status or "Ongoing",
            target_margin=project_data.target_margin or 39.0,
            actual_margin=project_data.actual_margin or 39.0,
            s1=project_data.s1,
            s2=project_data.s2,
            s3=project_data.s3,
            s4=project_data.s4,
            s5=project_data.s5,
            design_fee_rates_snapshot=active_rates,
            design_fee_rates_original=active_rates
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        return project

    # If project key changed (e.g. from draft key to final project name key)
    if project_data.project_key and project_data.project_key != project.project_key:
        new_key = project_data.project_key
        existing_other = db.query(Project).filter(Project.project_key == new_key, Project.id != project.id).first()
        if not existing_other:
            old_pk = project.project_key
            project.project_key = new_key
            from models.orm_models import Order, DesignFee
            db.query(Order).filter(Order.project_key == old_pk).update({"project_key": new_key, "project_name": project_data.name}, synchronize_session=False)
            db.query(DesignFee).filter(DesignFee.project_key == old_pk).update({"project_key": new_key}, synchronize_session=False)

    project.name = project_data.name
    project.client_name = project_data.client_name
    project.pm_name = project_data.pm_name
    project.offering = project_data.offering
    project.sqm = project_data.sqm
    project.status = project_data.status
    project.deadline = project_data.deadline
    if project_data.start_date:
        project.start_date = project_data.start_date
    project.complete_status = project_data.complete_status
    project.target_margin = project_data.target_margin
    project.actual_margin = project_data.actual_margin
    project.s1 = project_data.s1
    project.s2 = project_data.s2
    project.s3 = project_data.s3
    project.s4 = project_data.s4
    project.s5 = project_data.s5

    # Also update or insert matching records in the design_fees table
    import json
    from models.orm_models import DesignFee

    for s_val in [project_data.s1, project_data.s2, project_data.s3, project_data.s4, project_data.s5]:
        if s_val and isinstance(s_val, str) and s_val.strip() and s_val != "null":
            try:
                f_data = json.loads(s_val)
                fee_ref = f_data.get("id")
                if fee_ref:
                    existing_fee = db.query(DesignFee).filter(DesignFee.fee_ref == fee_ref).first()
                    if existing_fee:
                        existing_fee.name = f_data.get("name", existing_fee.name)
                        existing_fee.sqm = float(f_data.get("sqm", existing_fee.sqm or 1000))
                        existing_fee.landscape_sqm = float(f_data.get("landscapeSqm", existing_fee.landscape_sqm or 500))
                        existing_fee.fee_type = f_data.get("proposalType", existing_fee.fee_type or "Signature")
                        existing_fee.flat_base_fee = float(f_data.get("flatBaseFee", existing_fee.flat_base_fee or 50000))
                        existing_fee.fee_value = float(f_data.get("feeValue", existing_fee.fee_value or 0))
                        existing_fee.paid = float(f_data.get("paid", existing_fee.paid or 0))
                        existing_fee.outstanding = float(f_data.get("outstanding", existing_fee.outstanding or 0))
                        existing_fee.margin = float(f_data.get("margin", existing_fee.margin or 18))
                        existing_fee.status = f_data.get("status", existing_fee.status or "Draft")
                        existing_fee.fee_json = f_data
                    else:
                        new_fee = DesignFee(
                            fee_ref=fee_ref,
                            project_id=project.id,
                            project_key=project_key,
                            name=f_data.get("name", "Design Fee"),
                            sqm=float(f_data.get("sqm", 1000)),
                            landscape_sqm=float(f_data.get("landscapeSqm", 500)),
                            fee_type=f_data.get("proposalType", "Signature"),
                            flat_base_fee=float(f_data.get("flatBaseFee", 50000)),
                            fee_value=float(f_data.get("feeValue", 0)),
                            paid=float(f_data.get("paid", 0)),
                            outstanding=float(f_data.get("outstanding", 0)),
                            margin=float(f_data.get("margin", 18)),
                            status=f_data.get("status", "Draft"),
                            creation_date=f_data.get("dateCreated"),
                            fee_json=f_data
                        )
                        db.add(new_fee)
            except Exception as e:
                print(f"Error syncing DesignFee row: {e}")

    db.commit()
    db.refresh(project)
    return {"status": "ok", "message": f"Project '{project_key}' updated successfully"}

@router.post("/{project_key}/design-fee")
def create_project_design_fee(project_key: str, fee_data: dict, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.project_key == project_key).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    import json
    from models.orm_models import DesignFee

    fee_ref = fee_data.get("id", "DF-101")
    new_fee = DesignFee(
        fee_ref=fee_ref,
        project_id=project.id,
        project_key=project_key,
        name=fee_data.get("name", "Design Fee"),
        sqm=float(fee_data.get("sqm", 1000)),
        fee_value=float(fee_data.get("feeValue", 0)),
        paid=float(fee_data.get("paid", 0)),
        outstanding=float(fee_data.get("outstanding", 0)),
        margin=float(fee_data.get("margin", 18)),
        status=fee_data.get("status", "Draft"),
        creation_date=fee_data.get("date"),
        fee_json=fee_data
    )
    db.add(new_fee)
    
    # Also update s1..s5 columns on project for backwards compatibility
    cols = [project.s1, project.s2, project.s3, project.s4, project.s5]
    for idx in range(5):
        if not cols[idx] or cols[idx] == "null" or cols[idx] == "":
            col_name = f"s{idx+1}"
            setattr(project, col_name, json.dumps(fee_data))
            break

    db.commit()
    db.refresh(new_fee)
    return {"status": "ok", "message": f"Design fee '{fee_ref}' created in database", "id": new_fee.id}

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
    from models.orm_models import Order, OrderItem, ProcurementAllocation
    try:
        projects = db.query(Project).all()
        orders = db.query(Order).all()
        order_items = db.query(OrderItem).all()

        # Pre-load active procurement allocations for live PO & GRN document mapping
        active_allocations = db.query(ProcurementAllocation).filter(ProcurementAllocation.status == "Active").all()
        alloc_by_order_id = {}
        alloc_by_item_id = {}
        alloc_by_proj_id = {}
        for a in active_allocations:
            if a.order_id:
                alloc_by_order_id.setdefault(a.order_id, []).append(a)
            if a.order_item_id:
                alloc_by_item_id.setdefault(str(a.order_item_id), []).append(a)
            if a.project_id:
                alloc_by_proj_id.setdefault(a.project_id, []).append(a)

        # Group items by order ID (excluding obsolete manual credits)
        items_by_order = {}
        for item in order_items:
            if not item.order_id:
                continue
            if item.is_credit or (item.id and str(item.id).startswith("C-")) or (item.qty is not None and item.qty < 0):
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
                "sortOrder": getattr(item, 'sort_order', 0) if getattr(item, 'sort_order', None) is not None else 0,
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
            order_items_list.sort(key=lambda x: x.get("sortOrder") if isinstance(x.get("sortOrder"), (int, float)) else 0)
            
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

            # Dynamically assemble live allocated POs and GRNs from ProcurementAllocation
            order_item_ids = {str(item.get("id")) for item in order_items_list if item.get("id")}
            seen_alloc_ids = set()
            order_allocs = []

            # 1. Match allocations by items present in this order
            for it_id in order_item_ids:
                for a in alloc_by_item_id.get(it_id, []):
                    if a.id not in seen_alloc_ids:
                        seen_alloc_ids.add(a.id)
                        order_allocs.append(a)

            # 2. Match allocations directly assigned to this order ID
            for a in alloc_by_order_id.get(order.id, []):
                if a.id not in seen_alloc_ids:
                    seen_alloc_ids.add(a.id)
                    order_allocs.append(a)

            # 3. Project-level fallback if order has no direct items linked
            if not order_allocs and order.project_id:
                for a in alloc_by_proj_id.get(order.project_id, []):
                    if a.id not in seen_alloc_ids:
                        seen_alloc_ids.add(a.id)
                        order_allocs.append(a)

            po_groups = {}
            grn_groups = {}
            inv_groups = {}
            for a in order_allocs:
                if a.allocation_type == 'PO':
                    po_groups.setdefault(a.source_doc_no, []).append(a)
                elif a.allocation_type == 'GRN':
                    grn_groups.setdefault(a.source_doc_no, []).append(a)
                elif a.allocation_type == 'INVOICE':
                    inv_groups.setdefault(a.source_doc_no, []).append(a)

            purchase_orders_parsed = []
            for doc_no, doc_items in po_groups.items():
                first_a = doc_items[0]
                doc_date_str = first_a.doc_date or (first_a.allocated_at.strftime("%Y-%m-%d") if first_a.allocated_at else None)
                purchase_orders_parsed.append({
                    "id": doc_no,
                    "date": doc_date_str,
                    "supplier": first_a.vendor_name or order.supplier_name or "Palladium ERP",
                    "notes": first_a.notes or "Allocated from Palladium ERP",
                    "allocated_by": first_a.allocated_by_name,
                    "items": [
                        {
                            "code": a.fitting_code or a.sku,
                            "description": a.sku,
                            "qtyAction": a.allocated_qty,
                            "unitCost": a.unit_cost
                        }
                        for a in doc_items
                    ]
                })

            goods_received_notes_parsed = []
            for doc_no, doc_items in grn_groups.items():
                first_a = doc_items[0]
                doc_date_str = first_a.doc_date or (first_a.allocated_at.strftime("%Y-%m-%d") if first_a.allocated_at else None)
                goods_received_notes_parsed.append({
                    "id": doc_no,
                    "date": doc_date_str,
                    "supplier": first_a.vendor_name or order.supplier_name or "Palladium ERP",
                    "notes": first_a.notes or "Allocated from Palladium ERP",
                    "allocated_by": first_a.allocated_by_name,
                    "items": [
                        {
                            "code": a.fitting_code or a.sku,
                            "description": a.sku,
                            "qtyAction": a.allocated_qty,
                            "unitCost": a.unit_cost
                        }
                        for a in doc_items
                    ]
                })

            dynamic_client_invoices = []
            for doc_no, doc_items in inv_groups.items():
                first_a = doc_items[0]
                doc_date_str = first_a.doc_date or (first_a.allocated_at.strftime("%Y-%m-%d") if first_a.allocated_at else None)
                is_credit_doc = str(doc_no).upper().startswith(("CN-", "CR-"))
                inv_total_val = sum(float((a.allocated_qty or 0) * (a.unit_cost or 0)) for a in doc_items) * (-1.0 if is_credit_doc else 1.0)
                dynamic_client_invoices.append({
                    "id": doc_no,
                    "doc_type": "Credit Note" if is_credit_doc else "Invoice",
                    "is_credit": is_credit_doc,
                    "date": doc_date_str,
                    "totalValue": inv_total_val,
                    "value": inv_total_val,
                    "amount": inv_total_val,
                    "notes": first_a.notes or ("Credit Note allocated from Palladium ERP" if is_credit_doc else "Allocated from Palladium ERP"),
                    "allocated_by": first_a.allocated_by_name,
                    "items": [
                        {
                            "code": a.fitting_code or a.sku,
                            "description": a.sku,
                            "qtyAction": -abs(a.allocated_qty) if is_credit_doc else a.allocated_qty,
                            "unitPrice": a.unit_cost,
                            "total": float((a.allocated_qty or 0) * (a.unit_cost or 0)) * (-1.0 if is_credit_doc else 1.0)
                        }
                        for a in doc_items
                    ]
                })

            credit_notes_parsed = [inv for inv in dynamic_client_invoices if inv.get("is_credit")]
            client_invoices_parsed = [inv for inv in dynamic_client_invoices if not inv.get("is_credit")]

            # Client Invoices and Credit Notes are strictly dynamic from authentic Palladium ERP allocations

            try:
                payments_parsed = json.loads(order.payments) if isinstance(order.payments, str) and order.payments.strip() else (order.payments or [])
            except Exception:
                payments_parsed = []

            order_dict = {
                "id": order.po_number,
                "dbId": order.id,
                "projectId": order.project_id,
                "projectKey": order.project_key,
                "poNumber": order.po_number,
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
                "creditNotes": credit_notes_parsed,
                "orderDate": order.order_date,
                "quotationSentDate": order.quotation_sent_date,
                "pfDate": order.pf_date,
                "payments": payments_parsed,
                "depositPercentage": order.deposit_percentage,
                "depositValue": order.deposit_value,
                "depositInvoiceSent": order.deposit_invoice_sent,
                "depositPaymentDate": order.deposit_payment_date,
                "balanceValue": order.balance_value,
                "balancePaymentDate": order.balance_payment_date,
                "clientCompany": order.client_company,
                "clientContact": order.client_contact,
                "clientPhone": order.client_phone,
                "clientEmail": order.client_email,
                "client": order.client or order.client_name or order.client_company or order.client_contact,
                "client_name": order.client_name or order.client or order.client_company or order.client_contact,
                "projectFullName": order.project_full_name,
                "projectTier": order.project_tier,
                "projectSize": order.project_size,
                "electrician": order.electrician,
                "electricianPhone": order.electrician_phone,
                "contractor": order.contractor,
                "contractorPhone": order.contractor_phone,
                "interiorDesigner": order.interior_designer,
                "interiorDesignerPhone": order.interior_designer_phone,
                "oneOneRep": order.one_one_rep,
                "pmName": order.pm_name,
                "pmPhone": order.pm_phone,
                "pmEmail": order.pm_email,
                "deliveryAddress": order.delivery_address,
                "billingDetails": order.billing_details,
                "fileSource": order.file_source,
                "projectClass": order.project_class,
                "division": order.division,
                "pfNumber": order.pf_number,
                "discount": order.discount or 0.0
            }
            orders_by_project[order.project_key].append(order_dict)


        # Pre-fetch all design fees grouped by project_key and project_id
        from models.orm_models import DesignFee
        design_fees_raw = db.query(DesignFee).all()
        fees_by_project = {}
        for df in design_fees_raw:
            p_ref = df.project_key
            if not p_ref and df.project_id:
                p_ref = str(df.project_id)
            if p_ref:
                if p_ref not in fees_by_project:
                    fees_by_project[p_ref] = []
                # Construct fee object from DB row
                fee_dict = df.fee_json if isinstance(df.fee_json, dict) else {}
                if not fee_dict:
                    fee_dict = {
                        "id": df.fee_ref,
                        "name": df.name,
                        "sqm": df.sqm,
                        "feeValue": df.fee_value,
                        "paid": df.paid,
                        "outstanding": df.outstanding,
                        "margin": df.margin,
                        "status": df.status,
                        "date": df.creation_date
                    }
                fees_by_project[p_ref].append(fee_dict)

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
            # Calculate dynamic project status based on orders
            proj_orders = orders_by_project.get(p_key, [])
            computed_status = 'Pending'
            if proj_orders:
                statuses = [o.get("status") or "Pending" for o in proj_orders]
                all_complete = all(s == 'Complete' for s in statuses)
                all_draft = all(s == 'Draft' for s in statuses)
                has_ongoing = any(s == 'Ongoing' or s == 'Complete' for s in statuses)
                has_pending = any(s == 'Pending' for s in statuses)

                if all_complete:
                    computed_status = 'Complete'
                elif has_ongoing:
                    computed_status = 'Ongoing'
                elif has_pending:
                    computed_status = 'Pending'
                elif all_draft:
                    computed_status = 'Draft'

            # Fetch design fees from s1..s5 columns or fallback to relational_fees table
            s_fees = []
            for col in [p.s1, p.s2, p.s3, p.s4, p.s5]:
                if col and isinstance(col, str) and col.strip() and col != "null":
                    try:
                        s_fees.append(json.loads(col))
                    except Exception:
                        pass

            relational_fees = s_fees if s_fees else (fees_by_project.get(p_key, []) or fees_by_project.get(str(p.id), []))

            projects_dict[p_key] = {
                "id": p.id,
                "key": p_key,
                "name": p.name,
                "client": p.client_name,
                "pm": p.pm_name,
                "offering": p.offering,
                "sqm": p.sqm,
                "status": computed_status,
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
                "designFees": relational_fees,
                "orders": proj_orders
            }

        # Ensure all client-direct and unmapped order groups are included in projects_dict
        for p_key, p_orders in orders_by_project.items():
            if p_key not in projects_dict:
                c_name = "Direct Client"
                p_name = p_key
                pm_name = "Martin Döller"
                for o in p_orders:
                    if o.get("client") or o.get("clientCompany") or o.get("clientContact"):
                        c_name = o.get("client") or o.get("clientCompany") or o.get("clientContact")
                    if o.get("projectFullName"):
                        p_name = o.get("projectFullName")
                    if o.get("pmName"):
                        pm_name = o.get("pmName")

                projects_dict[p_key] = {
                    "id": None,
                    "key": p_key,
                    "name": p_name if p_name != p_key else (f"{c_name} (Direct)" if p_key.startswith("client-") else p_key),
                    "client": c_name,
                    "pm": pm_name,
                    "projectType": "Client-Direct" if p_key.startswith("client-") or "direct" in p_key.lower() else "Standard",
                    "offering": "Signature",
                    "sqm": "—",
                    "status": "Ongoing",
                    "deadline": "TBD",
                    "start": p_orders[0].get("orderDate") if p_orders and p_orders[0].get("orderDate") else "2026-01-01",
                    "complete": "Ongoing",
                    "targetMargin": 18.0,
                    "actualMargin": 18.0,
                    "s1": "",
                    "s2": "",
                    "s3": "",
                    "s4": "",
                    "s5": "",
                    "designFees": fees_by_project.get(p_key, []),
                    "orders": p_orders
                }

        return projects_dict
    except Exception as e:
        print(f"Error dynamically building projects dict: {e}")
        raise HTTPException(status_code=500, detail=str(e))



