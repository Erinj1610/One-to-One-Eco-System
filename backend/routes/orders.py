from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from database.cloud_sql import get_db
from models.orm_models import Order, OrderItem, Project, ProcurementAllocation
from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime, timezone
import json
import re
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class BulkDeleteOrdersSchema(BaseModel):
    po_numbers: List[str]

class BulkRelinkOrdersSchema(BaseModel):
    po_numbers: List[str]
    project_key: str

class BulkRenameOrdersSchema(BaseModel):
    po_numbers: List[str]
    new_quote_name: str

def generate_next_quote_id(db: Session, year: int = 2026) -> str:
    """
    Atomically computes the next available sequential quote number for the given year.
    Matches formats like Q-2026-0664, Q-2026-665, Q-2026-0042, etc.
    """
    from sqlalchemy import text
    query = text("SELECT po_number FROM orders WHERE po_number ~ :pattern")
    pattern = f"^Q-{year}-[0-9]+"
    rows = db.execute(query, {"pattern": pattern}).fetchall()
    
    max_num = 0
    for r in rows:
        val = str(r[0]).strip()
        m = re.search(rf"^Q-{year}-0*(\d+)", val)
        if m:
            try:
                num = int(m.group(1))
                if num > max_num:
                    max_num = num
            except ValueError:
                pass
                
    # If no quotes exist yet for this year, start at 1, else max_num + 1
    next_num = max_num + 1 if max_num > 0 else 1
    # Format with 4 digits e.g. Q-2026-0665
    return f"Q-{year}-{next_num:04d}"

@router.get("/next-quote-number")
def get_next_quote_number(db: Session = Depends(get_db)):
    from datetime import datetime
    year = datetime.now().year
    next_id = generate_next_quote_id(db, year)
    return {"next_po_id": next_id, "year": year}

@router.post("/bulk-delete")
def bulk_delete_orders(payload: BulkDeleteOrdersSchema, db: Session = Depends(get_db)):
    pos = payload.po_numbers
    if not pos:
        raise HTTPException(status_code=400, detail="No PO numbers provided")
    
    orders = db.query(Order).filter(Order.po_number.in_(pos)).all()
    if not orders:
        return {"message": "No matching orders found to delete"}
        
    try:
        db.query(OrderItem).filter(OrderItem.order_id.in_(pos)).delete(synchronize_session=False)
        for order in orders:
            db.delete(order)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Database constraint violation: {str(e)}")
        
    return {"message": f"Successfully deleted {len(orders)} orders and their items"}

@router.post("/bulk-relink")
def bulk_relink_orders(payload: BulkRelinkOrdersSchema, db: Session = Depends(get_db)):
    pos = payload.po_numbers
    if not pos:
        raise HTTPException(status_code=400, detail="No PO numbers provided")
        
    project = db.query(Project).filter(Project.project_key == payload.project_key).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    orders_to_move = db.query(Order).filter(Order.po_number.in_(pos)).all()
    
    # Move Google Drive folders atomically for each order whose project changed
    try:
        from services.google_drive_service import move_order_drive_folder
        all_projects = {p.id: p for p in db.query(Project).all()}
        all_projects_by_key = {p.project_key: p for p in all_projects.values()}
        
        for ord_item in orders_to_move:
            old_proj = all_projects.get(ord_item.project_id) or all_projects_by_key.get(ord_item.project_key)
            old_name = old_proj.name if old_proj else ""
            if old_proj and old_proj.id == project.id:
                continue
            try:
                move_order_drive_folder(
                    order_identifier=ord_item.po_number,
                    old_project_name=old_name,
                    new_project_name=project.name,
                    client_name=project.client_name or ""
                )
            except Exception as drive_err:
                print(f"Warning: Failed to move drive folder for order {ord_item.po_number}: {drive_err}")
    except Exception as general_drive_err:
        print(f"Drive move hook error: {general_drive_err}")

    try:
        db.query(Order).filter(Order.po_number.in_(pos)).update(
            {"project_key": project.project_key, "project_id": project.id},
            synchronize_session=False
        )
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Database update failed: {str(e)}")
        
    return {"message": f"Successfully linked {len(pos)} orders to project '{project.name}'"}

@router.post("/bulk-rename")
def bulk_rename_orders(payload: BulkRenameOrdersSchema, db: Session = Depends(get_db)):
    pos = payload.po_numbers
    if not pos:
        raise HTTPException(status_code=400, detail="No PO numbers provided")
        
    try:
        db.query(Order).filter(Order.po_number.in_(pos)).update(
            {"quote_name": payload.new_quote_name},
            synchronize_session=False
        )
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Database update failed: {str(e)}")
        
    return {"message": f"Successfully renamed {len(pos)} orders"}

@router.post("/{po_number}/sync-invoicing")
def sync_order_invoicing(po_number: str, db: Session = Depends(get_db)):
    """
    Synchronizes static OrderItem columns (invoice_qty, invoice_history, invoice_ref, invoice_date, invoice_value)
    strictly from active, deduplicated ProcurementAllocation records in Cloud SQL.
    If no active invoice allocations exist, static columns are reset to 0/empty.
    """
    items = db.query(OrderItem).filter(OrderItem.order_id == po_number).all()
    if not items:
        return {"status": "ok", "message": "No items found for order", "synced_count": 0}

    order_obj = db.query(Order).filter(Order.po_number == po_number).first()
    if not order_obj and po_number.isdigit():
        order_obj = db.query(Order).filter(Order.id == int(po_number)).first()

    valid_order_keys = {str(po_number).strip()}
    if order_obj:
        if order_obj.id is not None:
            valid_order_keys.add(str(order_obj.id))
        if order_obj.po_number:
            valid_order_keys.add(str(order_obj.po_number).strip())

    item_ids = [str(item.id) for item in items]
    raw_allocs = db.query(ProcurementAllocation).filter(
        ProcurementAllocation.allocation_type == "INVOICE",
        ProcurementAllocation.status == "Active"
    ).all()

    inv_allocs_by_item_id = {}
    inv_allocs_by_sku = {}
    for a in raw_allocs:
        if str(a.source_doc_no or "").upper().startswith(("CN-", "CR-")):
            continue
        if a.order_item_id and str(a.order_item_id) in item_ids:
            inv_allocs_by_item_id.setdefault(str(a.order_item_id), []).append(a)
        if a.sku:
            norm = re.sub(r'[^A-Za-z0-9]', '', str(a.sku)).upper()
            if norm:
                inv_allocs_by_sku.setdefault(norm, []).append(a)

    synced_count = 0
    for item in items:
        item_norm_skus = {re.sub(r'[^A-Za-z0-9]', '', str(s)).upper() for s in [item.code, item.one_one_code] if s}
        matched_allocs = list(inv_allocs_by_item_id.get(str(item.id), []))
        if not matched_allocs and item_norm_skus:
            for s in item_norm_skus:
                for a in inv_allocs_by_sku.get(s, []):
                    if (a.order_id and str(a.order_id) in valid_order_keys) or (a.order_item_id and str(a.order_item_id) == str(item.id)):
                        if a not in matched_allocs:
                            matched_allocs.append(a)

        unique_allocs = []
        seen_keys = set()
        for a in matched_allocs:
            k = (a.source_doc_no, a.source_line_id) if a.source_line_id is not None else (a.source_doc_no, a.sku, round(float(a.allocated_qty or 0.0), 4))
            if k not in seen_keys:
                seen_keys.add(k)
                unique_allocs.append(a)

        if unique_allocs:
            dyn_inv_hist = []
            dyn_inv_qty = 0
            dyn_inv_val = 0.0
            dyn_inv_refs = set()
            dyn_inv_date = None
            for a in unique_allocs:
                q_val = float(a.allocated_qty or 0.0)
                c_val = float(a.unit_cost or item.unit_retail or 0.0)
                dyn_inv_qty += int(round(q_val))
                dyn_inv_val += q_val * c_val
                if a.source_doc_no:
                    dyn_inv_refs.add(str(a.source_doc_no))
                if a.doc_date:
                    dyn_inv_date = str(a.doc_date).split("T")[0]
                dyn_inv_hist.append({
                    "id": a.source_doc_no,
                    "ref": a.source_doc_no,
                    "allocation_id": a.id,
                    "qty": q_val,
                    "unitPrice": c_val,
                    "total": round(q_val * c_val, 2),
                    "date": str(a.doc_date).split("T")[0] if a.doc_date else None,
                    "by": a.allocated_by_name or "Staff",
                    "type": "Invoice"
                })
            item.invoice_history = json.dumps(dyn_inv_hist)
            item.invoice_qty = dyn_inv_qty
            item.invoice_value = round(dyn_inv_val, 2)
            item.invoice_ref = "; ".join(sorted(dyn_inv_refs)) if dyn_inv_refs else None
            item.invoice_date = dyn_inv_date
        else:
            item.invoice_history = "[]"
            item.invoice_qty = 0
            item.invoice_value = 0.0
            item.invoice_ref = None
            item.invoice_date = None

        db.add(item)
        synced_count += 1

    db.commit()
    return {"status": "ok", "message": f"Successfully synced invoicing for {synced_count} items", "synced_count": synced_count}

class OrderItemSchema(BaseModel):
    id: str
    qty: int
    type: Optional[str] = None
    one_one_code: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    floor: Optional[str] = None
    area: Optional[str] = None
    dimming: Optional[str] = None
    brand: Optional[str] = None
    supplier: Optional[str] = None
    unit_cost: float = 0.0
    unit_trade: float = 0.0
    unit_retail: float = 0.0
    selection: Optional[str] = None
    stock_status: Optional[str] = None
    eta: Optional[str] = None
    po_ref: Optional[str] = None
    po_qty_ordered: int = 0
    po_eta: Optional[str] = None
    invoice_qty: int = 0
    po_supplier: Optional[str] = None
    po_date: Optional[str] = None
    received_qty: int = 0
    received_date: Optional[str] = None
    invoice_ref: Optional[str] = None
    invoice_date: Optional[str] = None
    invoice_value: float = 0.0
    delivery_qty: int = 0
    delivery_date: Optional[str] = None
    delivery_status: Optional[str] = None
    delivery_history: Optional[List[Any]] = []
    purchase_history: Optional[List[Any]] = []
    receiving_history: Optional[List[Any]] = []
    invoice_history: Optional[List[Any]] = []
    stock_on_hand: int = 0
    stock_available: Optional[float] = 0.0
    is_credit: Optional[bool] = False
    item_type: Optional[str] = "Hardware"
    sort_order: Optional[int] = 0


class OrderSchema(BaseModel):
    project_key: str
    po_number: str
    supplier_name: Optional[str] = None
    items_count: int = 0
    value: float = 0.0
    paid: float = 0.0
    outstanding: float = 0.0
    status: Optional[str] = "Pending"
    eta: Optional[str] = "—"

@router.get("/")
def list_orders(db: Session = Depends(get_db)):
    orders = db.query(Order).all()
    return orders

def find_order_by_identifier(identifier: str, db: Session):
    clean_id = str(identifier).strip()
    # Try exact po_number
    order = db.query(Order).filter(Order.po_number == clean_id).first()
    if order:
        return order
    # Try numeric ID if digits
    if clean_id.isdigit():
        order = db.query(Order).filter(Order.id == int(clean_id)).first()
        if order:
            return order
    # Try quote_name
    order = db.query(Order).filter(Order.quote_name == clean_id).first()
    return order

@router.get("/{po_number}")
def get_order(po_number: str, db: Session = Depends(get_db)):
    order = find_order_by_identifier(po_number, db)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

def apply_order_fields(order, order_data: dict, project_id=None, project_key=None):
    if project_id:
        order.project_id = project_id
    if project_key:
        order.project_key = project_key
    elif order_data.get("project_key"):
        order.project_key = order_data.get("project_key")

    order.supplier_name = order_data.get("supplier_name", order_data.get("supplier", order.supplier_name))
    order.items_count = int(order_data.get("items_count", order_data.get("items", order.items_count or 0)))
    order.value = float(order_data.get("value", order.value or 0.0))
    order.paid = float(order_data.get("paid", order.paid or 0.0))
    order.outstanding = float(order_data.get("outstanding", order.outstanding or 0.0))
    order.status = order_data.get("status") or order.status or "Pending"
    order.eta = order_data.get("eta") or order.eta or "—"
    
    if "quote_name" in order_data or "quoteName" in order_data:
        order.quote_name = order_data.get("quote_name") or order_data.get("quoteName")
    if "packingLists" in order_data: order.packing_lists = order_data.get("packingLists")
    if "deliveryNotes" in order_data: order.delivery_notes = order_data.get("deliveryNotes")
    if "purchaseOrders" in order_data: order.purchase_orders = order_data.get("purchaseOrders")
    if "goodsReceivedNotes" in order_data: order.goods_received_notes = order_data.get("goodsReceivedNotes")
    if "clientInvoices" in order_data: order.client_invoices = order_data.get("clientInvoices")
    if "takeoffData" in order_data or "takeoff_data" in order_data:
        order.takeoff_data = order_data.get("takeoffData") if "takeoffData" in order_data else order_data.get("takeoff_data")
    if "orderDate" in order_data: order.order_date = order_data.get("orderDate")
    if "quotationSentDate" in order_data: order.quotation_sent_date = order_data.get("quotationSentDate")
    if "pfDate" in order_data: order.pf_date = order_data.get("pfDate")
    if "vatPercentage" in order_data and order_data.get("vatPercentage") is not None:
        order.vat_percentage = float(order_data.get("vatPercentage"))
    elif "vat_percentage" in order_data and order_data.get("vat_percentage") is not None:
        order.vat_percentage = float(order_data.get("vat_percentage"))
    if "depositPercentage" in order_data and order_data.get("depositPercentage") is not None:
        order.deposit_percentage = float(order_data.get("depositPercentage"))
    elif "deposit_percentage" in order_data and order_data.get("deposit_percentage") is not None:
        order.deposit_percentage = float(order_data.get("deposit_percentage"))
    if "depositValue" in order_data and order_data.get("depositValue") is not None:
        order.deposit_value = float(order_data.get("depositValue"))
    elif "deposit_value" in order_data and order_data.get("deposit_value") is not None:
        order.deposit_value = float(order_data.get("deposit_value"))
    if "depositInvoiceSent" in order_data: order.deposit_invoice_sent = order_data.get("depositInvoiceSent")
    if "depositPaymentDate" in order_data: order.deposit_payment_date = order_data.get("depositPaymentDate")
    if "balanceValue" in order_data and order_data.get("balanceValue") is not None:
        order.balance_value = float(order_data.get("balanceValue"))
    elif "balance_value" in order_data and order_data.get("balance_value") is not None:
        order.balance_value = float(order_data.get("balance_value"))
    if "balancePaymentDate" in order_data: order.balance_payment_date = order_data.get("balancePaymentDate")

    # Order-specific client details & metadata overrides
    client_comp = order_data.get("clientCompany") if "clientCompany" in order_data else order_data.get("client_company")
    client_cont = order_data.get("clientContact") if "clientContact" in order_data else order_data.get("client_contact")
    client_ph = order_data.get("clientPhone") if "clientPhone" in order_data else order_data.get("client_phone")
    client_em = order_data.get("clientEmail") if "clientEmail" in order_data else order_data.get("client_email")
    client_gen = order_data.get("client") if "client" in order_data else (order_data.get("client_name") or client_comp or client_cont)

    if client_comp is not None: order.client_company = client_comp
    if client_cont is not None: order.client_contact = client_cont
    if client_ph is not None: order.client_phone = client_ph
    if client_em is not None: order.client_email = client_em
    if client_gen is not None:
        order.client = client_gen
        order.client_name = client_gen

    if "projectFullName" in order_data or "project_full_name" in order_data:
        order.project_full_name = order_data.get("projectFullName") or order_data.get("project_full_name")
    if "projectTier" in order_data or "project_tier" in order_data:
        order.project_tier = order_data.get("projectTier") or order_data.get("project_tier")
    if "projectSize" in order_data or "project_size" in order_data:
        order.project_size = order_data.get("projectSize") or order_data.get("project_size")
    if "electrician" in order_data: order.electrician = order_data.get("electrician")
    if "electricianPhone" in order_data or "electrician_phone" in order_data:
        order.electrician_phone = order_data.get("electricianPhone") or order_data.get("electrician_phone")
    if "contractor" in order_data: order.contractor = order_data.get("contractor")
    if "contractorPhone" in order_data or "contractor_phone" in order_data:
        order.contractor_phone = order_data.get("contractorPhone") or order_data.get("contractor_phone")
    if "interiorDesigner" in order_data or "interior_designer" in order_data:
        order.interior_designer = order_data.get("interiorDesigner") or order_data.get("interior_designer")
    if "interiorDesignerPhone" in order_data or "interior_designer_phone" in order_data:
        order.interior_designer_phone = order_data.get("interiorDesignerPhone") or order_data.get("interior_designer_phone")
    if "oneOneRep" in order_data or "one_one_rep" in order_data:
        order.one_one_rep = order_data.get("oneOneRep") or order_data.get("one_one_rep")
    if "pmName" in order_data or "pm_name" in order_data:
        order.pm_name = order_data.get("pmName") or order_data.get("pm_name")
    if "pmPhone" in order_data or "pm_phone" in order_data:
        order.pm_phone = order_data.get("pmPhone") or order_data.get("pm_phone")
    if "pmEmail" in order_data or "pm_email" in order_data:
        order.pm_email = order_data.get("pmEmail") or order_data.get("pm_email")
    if "deliveryAddress" in order_data or "delivery_address" in order_data:
        order.delivery_address = order_data.get("deliveryAddress") or order_data.get("delivery_address")
    if "billingDetails" in order_data or "billing_details" in order_data:
        order.billing_details = order_data.get("billingDetails") or order_data.get("billing_details")
    if "fileSource" in order_data or "file_source" in order_data:
        order.file_source = order_data.get("fileSource") or order_data.get("file_source")
    if "projectClass" in order_data or "project_class" in order_data:
        order.project_class = order_data.get("projectClass") or order_data.get("project_class")
    if "division" in order_data: order.division = order_data.get("division")
    if "pfNumber" in order_data or "pf_number" in order_data:
        order.pf_number = order_data.get("pfNumber") or order_data.get("pf_number")
    if "discount" in order_data and order_data.get("discount") is not None:
        order.discount = float(order_data.get("discount", 0.0))

@router.post("/")
def create_order(order_data: dict, db: Session = Depends(get_db)):
    project_key = order_data.get("project_key")
    po_number = order_data.get("po_number")
    
    if not project_key or not po_number:
        raise HTTPException(status_code=400, detail="project_key and po_number are required")

    # Verify project exists
    project = db.query(Project).filter(Project.project_key == project_key).first()
    project_id = project.id if project else None

    # Check if existing po_number - if so, update gracefully (idempotent create)
    existing = db.query(Order).filter(Order.po_number == po_number).first()
    if existing:
        apply_order_fields(existing, order_data, project_id=project_id, project_key=project_key)
        db.commit()
        db.refresh(existing)
        return existing

    # Extract standard fields
    new_order = Order(
        po_number=po_number,
        project_id=project_id,
        project_key=project_key
    )
    apply_order_fields(new_order, order_data, project_id=project_id, project_key=project_key)
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    return new_order

@router.put("/{po_number}")
def update_order(po_number: str, order_data: dict, db: Session = Depends(get_db)):
    order = find_order_by_identifier(po_number, db)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    old_project_key = order.project_key
    old_project_id = order.project_id

    project_key = order_data.get("project_key")
    project_id = None
    project = None
    if project_key:
        order.project_key = project_key
        project = db.query(Project).filter(Project.project_key == project_key).first()
        project_id = project.id if project else None

    # Check if project shifted and move Drive folder atomically
    if project and (project_key != old_project_key or (old_project_id and project_id != old_project_id)):
        try:
            from services.google_drive_service import move_order_drive_folder
            old_proj = db.query(Project).filter(
                (Project.id == old_project_id) | (Project.project_key == old_project_key)
            ).first() if (old_project_id or old_project_key) else None
            old_name = old_proj.name if old_proj else ""
            move_order_drive_folder(
                order_identifier=po_number,
                old_project_name=old_name,
                new_project_name=project.name,
                client_name=project.client_name or ""
            )
        except Exception as drive_err:
            print(f"Warning: Failed to move drive folder during update_order for {po_number}: {drive_err}")

    apply_order_fields(order, order_data, project_id=project_id, project_key=project_key)
    db.commit()
    db.refresh(order)
    return order


@router.delete("/{po_number}")
def delete_order(po_number: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.po_number == po_number).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Cascade delete items first
    db.query(OrderItem).filter(OrderItem.order_id == po_number).delete()
    db.delete(order)
    db.commit()
    return {"message": "Order and its items deleted successfully"}

# --- Order Items Endpoints ---

@router.get("/{po_number}/items")
def get_order_items(po_number: str, db: Session = Depends(get_db)):
    from models.orm_models import Product
    items = db.query(OrderItem).filter(OrderItem.order_id == po_number).order_by(OrderItem.sort_order.asc(), OrderItem.id.asc()).all()
    
    # Pre-fetch matching products in memory for O(1) specification enrichment
    prods_by_sku = {}
    prods_by_1to1 = {}
    prods = db.query(Product).all()
    for p in prods:
        if p.sku:
            prods_by_sku[p.sku.strip().upper()] = p
        if p.one_to_one_code:
            prods_by_1to1[p.one_to_one_code.strip().upper()] = p

    # Pre-fetch order details and active invoice allocations for this order to derive live authentic invoice status
    order_obj = db.query(Order).filter(Order.po_number == po_number).first()
    if not order_obj and po_number.isdigit():
        order_obj = db.query(Order).filter(Order.id == int(po_number)).first()

    valid_order_keys = {str(po_number).strip()}
    if order_obj:
        if order_obj.id is not None:
            valid_order_keys.add(str(order_obj.id))
        if order_obj.po_number:
            valid_order_keys.add(str(order_obj.po_number).strip())

    item_ids = [str(item.id) for item in items]
    raw_allocs = db.query(ProcurementAllocation).filter(
        ProcurementAllocation.status == "Active"
    ).all()

    inv_allocs_by_item_id = {}
    inv_allocs_by_sku = {}
    po_allocs_by_item_id = {}
    po_allocs_by_sku = {}
    grn_allocs_by_item_id = {}
    grn_allocs_by_sku = {}

    for a in raw_allocs:
        a_type = (a.allocation_type or "").upper().strip()
        norm = re.sub(r'[^A-Za-z0-9]', '', str(a.sku or "")).upper()

        if a_type == "INVOICE":
            if a.order_item_id and str(a.order_item_id) in item_ids:
                inv_allocs_by_item_id.setdefault(str(a.order_item_id), []).append(a)
            if norm:
                inv_allocs_by_sku.setdefault(norm, []).append(a)
        elif a_type == "PO":
            if a.order_item_id and str(a.order_item_id) in item_ids:
                po_allocs_by_item_id.setdefault(str(a.order_item_id), []).append(a)
            if norm:
                po_allocs_by_sku.setdefault(norm, []).append(a)
        elif a_type == "GRN":
            if a.order_item_id and str(a.order_item_id) in item_ids:
                grn_allocs_by_item_id.setdefault(str(a.order_item_id), []).append(a)
            if norm:
                grn_allocs_by_sku.setdefault(norm, []).append(a)

    res = []
    for item in items:
        def parse_history(h_val):
            if h_val is None:
                return []
            raw = h_val
            if isinstance(h_val, str):
                try:
                    import json
                    raw = json.loads(h_val)
                except Exception:
                    return []
            if isinstance(raw, list):
                return [elem for elem in raw if isinstance(elem, dict)]
            elif isinstance(raw, dict):
                return [raw]
            return []

        del_hist = parse_history(item.delivery_history)
        pur_hist = parse_history(item.purchase_history)
        rec_hist = parse_history(item.receiving_history)

        item_norm_skus = {re.sub(r'[^A-Za-z0-9]', '', str(s)).upper() for s in [item.code, item.one_one_code] if s}

        # 1. Dynamically compute authentic PO allocations from ProcurementAllocation
        matched_po_allocs = list(po_allocs_by_item_id.get(str(item.id), []))
        if not matched_po_allocs and item_norm_skus:
            for s in item_norm_skus:
                for a in po_allocs_by_sku.get(s, []):
                    if (a.order_id and str(a.order_id) in valid_order_keys) or (a.order_item_id and str(a.order_item_id) == str(item.id)):
                        if a not in matched_po_allocs:
                            matched_po_allocs.append(a)

        unique_po_allocs = []
        seen_po_keys = set()
        for a in matched_po_allocs:
            k = (a.source_doc_no, a.source_line_id) if a.source_line_id is not None else (a.source_doc_no, a.sku, round(float(a.allocated_qty or 0.0), 4))
            if k not in seen_po_keys:
                seen_po_keys.add(k)
                unique_po_allocs.append(a)

        if unique_po_allocs:
            dyn_pur_hist = []
            dyn_po_qty = 0
            dyn_po_refs = set()
            dyn_po_date = None
            dyn_po_supplier = None
            dyn_po_eta = None
            for a in unique_po_allocs:
                q_val = float(a.allocated_qty or 0.0)
                c_val = float(a.unit_cost or item.unit_cost or 0.0)
                dyn_po_qty += int(round(q_val))
                if a.source_doc_no:
                    dyn_po_refs.add(str(a.source_doc_no))
                if a.doc_date:
                    dyn_po_date = str(a.doc_date).split("T")[0]
                if a.vendor_name:
                    dyn_po_supplier = a.vendor_name
                if a.eta:
                    dyn_po_eta = str(a.eta)
                dyn_pur_hist.append({
                    "id": a.source_doc_no,
                    "ref": a.source_doc_no,
                    "allocation_id": a.id,
                    "qty": q_val,
                    "unitCost": c_val,
                    "total": round(q_val * c_val, 2),
                    "date": str(a.doc_date).split("T")[0] if a.doc_date else None,
                    "supplier": a.vendor_name,
                    "by": a.allocated_by_name or "Staff",
                    "type": "PO"
                })
            calc_pur_hist = dyn_pur_hist
            calc_po_qty = dyn_po_qty
            calc_po_ref = "; ".join(sorted(dyn_po_refs)) if dyn_po_refs else None
            calc_po_date = dyn_po_date or item.po_date
            calc_po_supplier = dyn_po_supplier or item.po_supplier
            calc_po_eta = dyn_po_eta or item.po_eta
        else:
            calc_pur_hist = []
            calc_po_qty = 0
            calc_po_ref = None
            calc_po_date = None
            calc_po_supplier = None
            calc_po_eta = None

        # Check legacy PO placeholder in static purchase_history
        legacy_po_entry = next((h for h in pur_hist if str(h.get("ref") or h.get("id") or "").strip() == "[LEGACY]"), None)
        if legacy_po_entry:
            req_q = int(item.qty or 0)
            needed_legacy_po = max(0, req_q - calc_po_qty)
            if needed_legacy_po > 0:
                legacy_floated_po = dict(legacy_po_entry)
                legacy_floated_po["qty"] = needed_legacy_po
                calc_pur_hist.append(legacy_floated_po)
                calc_po_qty += needed_legacy_po
                all_po_refs = [calc_po_ref] if calc_po_ref else []
                if "[LEGACY]" not in all_po_refs:
                    all_po_refs.append("[LEGACY]")
                calc_po_ref = "; ".join(all_po_refs)

        # 2. Dynamically compute authentic GRN allocations from ProcurementAllocation
        matched_grn_allocs = list(grn_allocs_by_item_id.get(str(item.id), []))
        if not matched_grn_allocs and item_norm_skus:
            for s in item_norm_skus:
                for a in grn_allocs_by_sku.get(s, []):
                    if (a.order_id and str(a.order_id) in valid_order_keys) or (a.order_item_id and str(a.order_item_id) == str(item.id)):
                        if a not in matched_grn_allocs:
                            matched_grn_allocs.append(a)

        unique_grn_allocs = []
        seen_grn_keys = set()
        for a in matched_grn_allocs:
            k = (a.source_doc_no, a.source_line_id) if a.source_line_id is not None else (a.source_doc_no, a.sku, round(float(a.allocated_qty or 0.0), 4))
            if k not in seen_grn_keys:
                seen_grn_keys.add(k)
                unique_grn_allocs.append(a)

        if unique_grn_allocs:
            dyn_rec_hist = []
            dyn_rec_qty = 0
            dyn_rec_refs = set()
            dyn_rec_date = None
            for a in unique_grn_allocs:
                q_val = float(a.allocated_qty or 0.0)
                dyn_rec_qty += int(round(q_val))
                if a.source_doc_no:
                    dyn_rec_refs.add(str(a.source_doc_no))
                if a.doc_date:
                    dyn_rec_date = str(a.doc_date).split("T")[0]
                dyn_rec_hist.append({
                    "id": a.source_doc_no,
                    "ref": a.source_doc_no,
                    "allocation_id": a.id,
                    "qty": q_val,
                    "date": str(a.doc_date).split("T")[0] if a.doc_date else None,
                    "by": a.allocated_by_name or "Staff",
                    "type": "GRN"
                })
            calc_rec_hist = dyn_rec_hist
            calc_rec_qty = dyn_rec_qty
            calc_rec_ref = "; ".join(sorted(dyn_rec_refs)) if dyn_rec_refs else None
            calc_rec_date = dyn_rec_date or item.received_date
        else:
            calc_rec_hist = []
            calc_rec_qty = 0
            calc_rec_ref = None
            calc_rec_date = None

        # Check legacy GRN placeholder in static receiving_history
        legacy_rec_entry = next((h for h in rec_hist if str(h.get("ref") or h.get("id") or "").strip() == "[LEGACY]"), None)
        if legacy_rec_entry:
            req_q = int(item.qty or 0)
            needed_legacy_rec = max(0, req_q - calc_rec_qty)
            if needed_legacy_rec > 0:
                legacy_floated_rec = dict(legacy_rec_entry)
                legacy_floated_rec["qty"] = needed_legacy_rec
                calc_rec_hist.append(legacy_floated_rec)
                calc_rec_qty += needed_legacy_rec
                all_rec_refs = [calc_rec_ref] if calc_rec_ref else []
                if "[LEGACY]" not in all_rec_refs:
                    all_rec_refs.append("[LEGACY]")
                calc_rec_ref = "; ".join(all_rec_refs)

        # 3. Dynamically compute authentic invoice allocations from ProcurementAllocation
        matched_allocs = list(inv_allocs_by_item_id.get(str(item.id), []))
        if not matched_allocs and item_norm_skus:
            for s in item_norm_skus:
                for a in inv_allocs_by_sku.get(s, []):
                    if (a.order_id and str(a.order_id) in valid_order_keys) or (a.order_item_id and str(a.order_item_id) == str(item.id)):
                        if a not in matched_allocs:
                            matched_allocs.append(a)

        # Deduplicate allocations by document and line ID (or doc, sku, qty)
        unique_allocs = []
        seen_keys = set()
        for a in matched_allocs:
            k = (a.source_doc_no, a.source_line_id) if a.source_line_id is not None else (a.source_doc_no, a.sku, round(float(a.allocated_qty or 0.0), 4))
            if k not in seen_keys:
                seen_keys.add(k)
                unique_allocs.append(a)

        if unique_allocs:
            dyn_inv_hist = []
            dyn_inv_qty = 0
            dyn_inv_val = 0.0
            dyn_inv_refs = set()
            dyn_inv_date = None
            for a in unique_allocs:
                raw_q = float(a.allocated_qty or 0.0)
                is_cn = str(a.source_doc_no or '').upper().startswith(('CN-', 'CR-'))
                # Credit notes represent negative quantity/value adjustments
                effective_q = -abs(raw_q) if is_cn else abs(raw_q)
                c_val = float(a.unit_cost or item.unit_retail or 0.0)
                dyn_inv_qty += effective_q
                dyn_inv_val += effective_q * c_val
                if a.source_doc_no:
                    dyn_inv_refs.add(str(a.source_doc_no))
                if a.doc_date:
                    dyn_inv_date = str(a.doc_date).split("T")[0]
                dyn_inv_hist.append({
                    "id": a.source_doc_no,
                    "ref": a.source_doc_no,
                    "allocation_id": a.id,
                    "qty": effective_q,
                    "unitPrice": c_val,
                    "total": round(effective_q * c_val, 2),
                    "date": str(a.doc_date).split("T")[0] if a.doc_date else None,
                    "by": a.allocated_by_name or "Staff",
                    "type": "Credit Note" if is_cn else "Invoice"
                })
            calc_inv_hist = dyn_inv_hist
            calc_inv_qty = max(0, int(round(dyn_inv_qty)))
            calc_inv_val = max(0.0, round(dyn_inv_val, 2))
            calc_inv_ref = "; ".join(sorted(dyn_inv_refs)) if dyn_inv_refs else None
            calc_inv_date = dyn_inv_date
        else:
            calc_inv_hist = []
            calc_inv_qty = 0
            calc_inv_val = 0.0
            calc_inv_ref = None
            calc_inv_date = None

        # Check if item has a [LEGACY] baseline invoice placeholder
        raw_inv_h = parse_history(item.invoice_history)
        legacy_inv_entry = next((h for h in raw_inv_h if str(h.get("ref") or h.get("id") or "").strip() == "[LEGACY]"), None)

        if legacy_inv_entry:
            # Dynamically balance legacy placeholder so live allocations + legacy = needed balance
            req_q = int(item.qty or 0)
            needed_legacy_qty = max(0, req_q - calc_inv_qty)
            if needed_legacy_qty > 0:
                unit_ret = float(item.unit_retail or 0.0)
                legacy_floated = dict(legacy_inv_entry)
                legacy_floated["qty"] = needed_legacy_qty
                legacy_floated["total"] = round(needed_legacy_qty * unit_ret, 2)
                calc_inv_hist.append(legacy_floated)
                calc_inv_qty += needed_legacy_qty
                calc_inv_val = round(calc_inv_val + (needed_legacy_qty * unit_ret), 2)
                
                # Dual reference: live Palladium refs + [LEGACY]
                all_refs = [calc_inv_ref] if calc_inv_ref else []
                if "[LEGACY]" not in all_refs:
                    all_refs.append("[LEGACY]")
                calc_inv_ref = "; ".join(all_refs)

        # Auto-heal static OrderItem row if Cloud SQL contains stale values
        needs_heal = False
        if (item.invoice_qty or 0) != calc_inv_qty or (item.invoice_ref or None) != calc_inv_ref or round(float(item.invoice_value or 0.0), 2) != calc_inv_val:
            item.invoice_qty = calc_inv_qty
            item.invoice_value = calc_inv_val
            item.invoice_ref = calc_inv_ref
            item.invoice_date = calc_inv_date or item.invoice_date
            item.invoice_history = json.dumps(calc_inv_hist)
            needs_heal = True

        if (item.po_qty_ordered or 0) != calc_po_qty or (item.po_ref or None) != calc_po_ref:
            item.po_qty_ordered = calc_po_qty
            item.po_ref = calc_po_ref
            item.po_date = calc_po_date
            item.po_supplier = calc_po_supplier
            item.po_eta = calc_po_eta
            item.purchase_history = json.dumps(calc_pur_hist)
            needs_heal = True

        if (item.received_qty or 0) != calc_rec_qty or (item.received_date or None) != calc_rec_date:
            item.received_qty = calc_rec_qty
            item.received_date = calc_rec_date
            item.receiving_history = json.dumps(calc_rec_hist)
            needs_heal = True

        if needs_heal:
            db.add(item)

        item_dict = item.__dict__.copy()
        item_dict['delivery_history'] = del_hist
        item_dict['purchase_history'] = calc_pur_hist
        item_dict['po_qty_ordered'] = calc_po_qty
        item_dict['po_ref'] = calc_po_ref
        item_dict['po_date'] = calc_po_date
        item_dict['po_supplier'] = calc_po_supplier
        item_dict['po_eta'] = calc_po_eta

        item_dict['receiving_history'] = calc_rec_hist
        item_dict['received_qty'] = calc_rec_qty
        item_dict['received_ref'] = calc_rec_ref
        item_dict['received_date'] = calc_rec_date

        item_dict['invoice_history'] = calc_inv_hist
        item_dict['invoice_qty'] = calc_inv_qty
        item_dict['invoice_value'] = calc_inv_val
        item_dict['invoice_ref'] = calc_inv_ref
        item_dict['invoice_date'] = calc_inv_date
        if '_sa_instance_state' in item_dict:
            del item_dict['_sa_instance_state']

        # Match product specifications from Google Sheet / Palladium sync
        prod = None
        if item.code and item.code.strip().upper() in prods_by_sku:
            prod = prods_by_sku[item.code.strip().upper()]
        elif item.one_one_code and item.one_one_code.strip().upper() in prods_by_1to1:
            prod = prods_by_1to1[item.one_one_code.strip().upper()]

        if prod:
            item_dict['image_url'] = prod.image_url or item_dict.get('image_url')
            item_dict['technical_image_url'] = prod.technical_image_url
            item_dict['spec_sheet_url'] = prod.qr_link
            item_dict['foh_code_description'] = prod.foh_code_description
            item_dict['wetworks'] = getattr(prod, 'wetworks', None)
            item_dict['system_power'] = prod.system_power
            item_dict['kelvin'] = prod.kelvin
            item_dict['cri'] = prod.cri
            item_dict['ip_rating'] = prod.ip_rating
            item_dict['beam_angle'] = prod.beam_angle
            item_dict['dimming_protocol'] = prod.dimming_protocol
            item_dict['cutout'] = prod.cutout
            item_dict['product_family'] = prod.family
            item_dict['product_category'] = prod.category
            item_dict['consignment'] = prod.consignment
            item_dict['red_list'] = prod.red_list
            item_dict['first_fix'] = prod.first_fix
            item_dict['local_or_import'] = prod.local_or_import
            if item.stock_available is None:
                item_dict['stock_available'] = getattr(prod, 'stock_available', None) if getattr(prod, 'stock_available', None) is not None else (getattr(prod, 'stock_on_hand', None) if getattr(prod, 'stock_on_hand', None) is not None else prod.stock_level or 0)
            item_dict['stockAvailable'] = item_dict['stock_available']

            if item.stock_on_hand is None:
                item_dict['stock_on_hand'] = getattr(prod, 'stock_on_hand', None) if getattr(prod, 'stock_on_hand', None) is not None else (prod.stock_level or 0)
            item_dict['stockOnHand'] = item_dict['stock_on_hand']
            if not item_dict.get('one_one_code') and prod.one_to_one_code:
                item_dict['one_one_code'] = prod.one_to_one_code

        res.append(item_dict)
    
    try:
        db.commit()
    except Exception:
        db.rollback()
    return res


@router.post("/{po_number}/items/batch")
def create_order_items_batch(po_number: str, items_data: List[OrderItemSchema], db: Session = Depends(get_db)):
    """
    High-performance batch upsert for order line items in a single database transaction.
    Replaces 300+ individual HTTP calls with 1 fast call.
    """
    if not items_data:
        return {"status": "ok", "saved_count": 0}

    incoming_ids = [str(it.id) for it in items_data if it.id]
    
    # Prune any items belonging to this order that were deleted from the UI
    if incoming_ids:
        db.query(OrderItem).filter(
            (OrderItem.order_id == po_number) | (OrderItem.order_id == po_number.strip()),
            ~OrderItem.id.in_(incoming_ids)
        ).delete(synchronize_session=False)

    existing_records = {it.id: it for it in db.query(OrderItem).filter(OrderItem.id.in_(incoming_ids)).all()}

    # Query active allocations for these items to avoid stale frontend snapshots overwriting dynamic values
    raw_active_inv = db.query(ProcurementAllocation).filter(
        ProcurementAllocation.allocation_type == "INVOICE",
        ProcurementAllocation.status == "Active"
    ).all()
    active_inv_by_item = {}
    for a in raw_active_inv:
        if str(a.source_doc_no or "").upper().startswith(("CN-", "CR-")):
            continue
        if a.order_item_id:
            active_inv_by_item.setdefault(str(a.order_item_id), []).append(a)

    for item_data in items_data:
        str_id = str(item_data.id)
        has_active_allocs = str_id in active_inv_by_item and len(active_inv_by_item[str_id]) > 0

        # Check if incoming item has a [LEGACY] baseline invoice placeholder
        incoming_inv_h = item_data.invoice_history if isinstance(item_data.invoice_history, list) else []
        has_legacy_inv = any(str(h.get("ref") or h.get("id") or "").strip() == "[LEGACY]" for h in incoming_inv_h if isinstance(h, dict))

        if str_id in existing_records:
            existing = existing_records[str_id]
            existing.order_id = po_number
            existing.qty = item_data.qty
            existing.type = item_data.type
            existing.one_one_code = item_data.one_one_code
            existing.code = item_data.code
            existing.description = item_data.description
            existing.floor = item_data.floor
            existing.area = item_data.area
            existing.dimming = item_data.dimming
            existing.brand = item_data.brand
            existing.supplier = item_data.supplier
            existing.unit_cost = item_data.unit_cost
            existing.unit_trade = item_data.unit_trade
            existing.unit_retail = item_data.unit_retail
            existing.selection = item_data.selection
            existing.stock_status = item_data.stock_status
            existing.eta = item_data.eta
            existing.po_ref = item_data.po_ref
            existing.po_qty_ordered = item_data.po_qty_ordered
            existing.po_eta = item_data.po_eta
            existing.po_supplier = item_data.po_supplier
            existing.po_date = item_data.po_date
            existing.received_qty = item_data.received_qty
            existing.received_date = item_data.received_date
            existing.delivery_qty = item_data.delivery_qty
            existing.delivery_date = item_data.delivery_date
            existing.delivery_status = item_data.delivery_status
            existing.delivery_history = json.dumps(item_data.delivery_history) if item_data.delivery_history else "[]"
            existing.purchase_history = json.dumps(item_data.purchase_history) if item_data.purchase_history else "[]"
            existing.receiving_history = json.dumps(item_data.receiving_history) if item_data.receiving_history else "[]"
            
            # If item has active invoice allocations or has a [LEGACY] baseline, save it. Otherwise reset unallocated values.
            if not has_active_allocs and not has_legacy_inv:
                existing.invoice_qty = 0
                existing.invoice_ref = None
                existing.invoice_date = None
                existing.invoice_value = 0.0
                existing.invoice_history = "[]"
            else:
                existing.invoice_qty = item_data.invoice_qty
                existing.invoice_ref = item_data.invoice_ref
                existing.invoice_date = item_data.invoice_date
                existing.invoice_value = item_data.invoice_value
                existing.invoice_history = json.dumps(item_data.invoice_history) if item_data.invoice_history else "[]"

            existing.stock_on_hand = item_data.stock_on_hand
            existing.stock_available = item_data.stock_available
            existing.is_credit = item_data.is_credit
            existing.item_type = item_data.item_type
            existing.sort_order = item_data.sort_order
        else:
            allow_inv = has_active_allocs or has_legacy_inv
            inv_qty_to_set = item_data.invoice_qty if allow_inv else 0
            inv_ref_to_set = item_data.invoice_ref if allow_inv else None
            inv_date_to_set = item_data.invoice_date if allow_inv else None
            inv_val_to_set = item_data.invoice_value if allow_inv else 0.0
            inv_hist_to_set = json.dumps(item_data.invoice_history) if (allow_inv and item_data.invoice_history) else "[]"

            new_item = OrderItem(
                id=str_id,
                order_id=po_number,
                qty=item_data.qty,
                type=item_data.type,
                one_one_code=item_data.one_one_code,
                code=item_data.code,
                description=item_data.description,
                floor=item_data.floor,
                area=item_data.area,
                dimming=item_data.dimming,
                brand=item_data.brand,
                supplier=item_data.supplier,
                unit_cost=item_data.unit_cost,
                unit_trade=item_data.unit_trade,
                unit_retail=item_data.unit_retail,
                selection=item_data.selection,
                stock_status=item_data.stock_status,
                eta=item_data.eta,
                po_ref=item_data.po_ref,
                po_qty_ordered=item_data.po_qty_ordered,
                po_eta=item_data.po_eta,
                invoice_qty=inv_qty_to_set,
                po_supplier=item_data.po_supplier,
                po_date=item_data.po_date,
                received_qty=item_data.received_qty,
                received_date=item_data.received_date,
                invoice_ref=inv_ref_to_set,
                invoice_date=inv_date_to_set,
                invoice_value=inv_val_to_set,
                delivery_qty=item_data.delivery_qty,
                delivery_date=item_data.delivery_date,
                delivery_status=item_data.delivery_status,
                delivery_history=json.dumps(item_data.delivery_history) if item_data.delivery_history else "[]",
                purchase_history=json.dumps(item_data.purchase_history) if item_data.purchase_history else "[]",
                receiving_history=json.dumps(item_data.receiving_history) if item_data.receiving_history else "[]",
                invoice_history=inv_hist_to_set,
                stock_on_hand=item_data.stock_on_hand,
                stock_available=item_data.stock_available,
                is_credit=item_data.is_credit,
                item_type=item_data.item_type,
                sort_order=item_data.sort_order
            )
            db.add(new_item)

    db.commit()
    return {"status": "ok", "saved_count": len(items_data)}


@router.post("/{po_number}/items")
def create_order_item(po_number: str, item_data: OrderItemSchema, db: Session = Depends(get_db)):
    # Check if duplicate ID - if so, update gracefully (idempotent create)
    existing = db.query(OrderItem).filter(OrderItem.id == item_data.id).first()
    # Check if this item has active invoice allocations
    has_active_allocs = db.query(ProcurementAllocation).filter(
        ProcurementAllocation.allocation_type == "INVOICE",
        ProcurementAllocation.order_item_id == str(item_data.id),
        ProcurementAllocation.status == "Active"
    ).first() is not None

    # Check if incoming item has a [LEGACY] baseline invoice placeholder
    incoming_inv_h = item_data.invoice_history if isinstance(item_data.invoice_history, list) else []
    has_legacy_inv = any(str(h.get("ref") or h.get("id") or "").strip() == "[LEGACY]" for h in incoming_inv_h if isinstance(h, dict))
    allow_inv = has_active_allocs or has_legacy_inv

    if existing:
        existing.order_id = po_number
        existing.qty = item_data.qty
        existing.type = item_data.type
        existing.one_one_code = item_data.one_one_code
        existing.code = item_data.code
        existing.description = item_data.description
        existing.floor = item_data.floor
        existing.area = item_data.area
        existing.dimming = item_data.dimming
        existing.brand = item_data.brand
        existing.supplier = item_data.supplier
        existing.unit_cost = item_data.unit_cost
        existing.unit_trade = item_data.unit_trade
        existing.unit_retail = item_data.unit_retail
        existing.selection = item_data.selection
        existing.stock_status = item_data.stock_status
        existing.eta = item_data.eta
        existing.po_ref = item_data.po_ref
        existing.po_qty_ordered = item_data.po_qty_ordered
        existing.po_eta = item_data.po_eta
        if not allow_inv:
            existing.invoice_qty = 0
            existing.invoice_ref = None
            existing.invoice_date = None
            existing.invoice_value = 0.0
            existing.invoice_history = "[]"
        else:
            existing.invoice_qty = item_data.invoice_qty
            existing.invoice_ref = item_data.invoice_ref
            existing.invoice_date = item_data.invoice_date
            existing.invoice_value = item_data.invoice_value
            existing.invoice_history = json.dumps(item_data.invoice_history) if item_data.invoice_history else "[]"
        existing.po_supplier = item_data.po_supplier
        existing.po_date = item_data.po_date
        existing.received_qty = item_data.received_qty
        existing.received_date = item_data.received_date
        existing.delivery_qty = item_data.delivery_qty
        existing.delivery_date = item_data.delivery_date
        existing.delivery_status = item_data.delivery_status
        existing.delivery_history = json.dumps(item_data.delivery_history)
        existing.purchase_history = json.dumps(item_data.purchase_history)
        existing.receiving_history = json.dumps(item_data.receiving_history)
        existing.stock_on_hand = item_data.stock_on_hand
        existing.stock_available = item_data.stock_available
        existing.is_credit = item_data.is_credit
        existing.item_type = item_data.item_type
        existing.sort_order = item_data.sort_order
        db.commit()
        db.refresh(existing)
        return existing

    new_item = OrderItem(
        id=item_data.id,
        order_id=po_number,
        qty=item_data.qty,
        type=item_data.type,
        one_one_code=item_data.one_one_code,
        code=item_data.code,
        description=item_data.description,
        floor=item_data.floor,
        area=item_data.area,
        dimming=item_data.dimming,
        brand=item_data.brand,
        supplier=item_data.supplier,
        unit_cost=item_data.unit_cost,
        unit_trade=item_data.unit_trade,
        unit_retail=item_data.unit_retail,
        selection=item_data.selection,
        stock_status=item_data.stock_status,
        eta=item_data.eta,
        po_ref=item_data.po_ref,
        po_qty_ordered=item_data.po_qty_ordered,
        po_eta=item_data.po_eta,
        invoice_qty=item_data.invoice_qty if allow_inv else 0,
        po_supplier=item_data.po_supplier,
        po_date=item_data.po_date,
        received_qty=item_data.received_qty,
        received_date=item_data.received_date,
        invoice_ref=item_data.invoice_ref if allow_inv else None,
        invoice_date=item_data.invoice_date if allow_inv else None,
        invoice_value=item_data.invoice_value if allow_inv else 0.0,
        delivery_qty=item_data.delivery_qty,
        delivery_date=item_data.delivery_date,
        delivery_status=item_data.delivery_status,
        delivery_history=json.dumps(item_data.delivery_history),
        purchase_history=json.dumps(item_data.purchase_history),
        receiving_history=json.dumps(item_data.receiving_history),
        invoice_history=json.dumps(item_data.invoice_history) if (allow_inv and item_data.invoice_history) else "[]",
        stock_on_hand=item_data.stock_on_hand,
        stock_available=item_data.stock_available,
        is_credit=item_data.is_credit,
        item_type=item_data.item_type,
        sort_order=item_data.sort_order
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.put("/items/{item_id}")
def update_order_item(item_id: str, item_data: OrderItemSchema, db: Session = Depends(get_db)):
    item = db.query(OrderItem).filter(OrderItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    item.qty = item_data.qty
    item.type = item_data.type
    item.one_one_code = item_data.one_one_code
    item.code = item_data.code
    item.description = item_data.description
    item.floor = item_data.floor
    item.area = item_data.area
    item.dimming = item_data.dimming
    item.brand = item_data.brand
    item.supplier = item_data.supplier
    item.unit_cost = item_data.unit_cost
    item.unit_trade = item_data.unit_trade
    item.unit_retail = item_data.unit_retail
    item.selection = item_data.selection
    item.stock_status = item_data.stock_status
    item.eta = item_data.eta
    item.po_ref = item_data.po_ref
    item.po_qty_ordered = item_data.po_qty_ordered
    item.po_eta = item_data.po_eta
    # Protect invoice metrics against stale frontend snapshots
    has_active_allocs = db.query(ProcurementAllocation).filter(
        ProcurementAllocation.allocation_type == "INVOICE",
        ProcurementAllocation.order_item_id == str(item.id),
        ProcurementAllocation.status == "Active"
    ).first() is not None

    incoming_inv_h = item_data.invoice_history if isinstance(item_data.invoice_history, list) else []
    has_legacy_inv = any(str(h.get("ref") or h.get("id") or "").strip() == "[LEGACY]" for h in incoming_inv_h if isinstance(h, dict))
    allow_inv = has_active_allocs or has_legacy_inv

    if not allow_inv:
        item.invoice_qty = 0
        item.invoice_ref = None
        item.invoice_date = None
        item.invoice_value = 0.0
        item.invoice_history = "[]"
    else:
        item.invoice_qty = item_data.invoice_qty
        item.invoice_ref = item_data.invoice_ref
        item.invoice_date = item_data.invoice_date
        item.invoice_value = item_data.invoice_value
        item.invoice_history = json.dumps(item_data.invoice_history) if item_data.invoice_history else "[]"

    item.po_supplier = item_data.po_supplier
    item.po_date = item_data.po_date
    item.received_qty = item_data.received_qty
    item.received_date = item_data.received_date
    item.delivery_qty = item_data.delivery_qty
    item.delivery_date = item_data.delivery_date
    item.delivery_status = item_data.delivery_status
    item.delivery_history = json.dumps(item_data.delivery_history)
    item.purchase_history = json.dumps(item_data.purchase_history)
    item.receiving_history = json.dumps(item_data.receiving_history)
    item.stock_on_hand = item_data.stock_on_hand
    item.is_credit = item_data.is_credit
    item.item_type = item_data.item_type
    item.sort_order = item_data.sort_order

    
    db.commit()
    db.refresh(item)
    return item

@router.delete("/items/{item_id}")
def delete_order_item(item_id: str, db: Session = Depends(get_db)):
    item = db.query(OrderItem).filter(OrderItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(item)
    db.commit()
    return {"message": "Item deleted successfully"}

@router.put("/{po_number}/rename")
def rename_order(po_number: str, new_po_number: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.po_number == po_number).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Check if duplicate new_po_number
    existing = db.query(Order).filter(Order.po_number == new_po_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Order with this new PO number already exists")
        
    order.po_number = new_po_number
    
    # Update order_id for all linked items in the database
    db.query(OrderItem).filter(OrderItem.order_id == po_number).update({"order_id": new_po_number}, synchronize_session=False)
    
    db.commit()
    db.refresh(order)
    return order


@router.post("/{po_number}/legacy-baseline")
def apply_order_legacy_baseline(
    po_number: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    1-Click dynamic baseline for historical/legacy order items.
    Balances whatever is unfulfilled for PO, GRN, and/or Invoicing.
    Preserves existing live Palladium ERP records and clearly tags reference as [LEGACY].
    """
    try:
        item_ids = payload.get("item_ids") or []
        scope = str(payload.get("scope") or "ALL").strip().upper() # "ALL", "PO", "GRN", "INVOICE", "PROC" (PO+GRN)
        created_by = str(payload.get("created_by") or "Staff").strip()

        if not item_ids:
            raise HTTPException(status_code=400, detail="No item_ids provided.")

        order_obj = db.query(Order).filter(Order.po_number == po_number).first()
        if not order_obj and po_number.isdigit():
            order_obj = db.query(Order).filter(Order.id == int(po_number)).first()

        items = db.query(OrderItem).filter(OrderItem.id.in_([str(i) for i in item_ids])).all()
        if not items:
            raise HTTPException(status_code=404, detail="No matching order items found.")

        now_dt = datetime.now(timezone.utc)
        today_str = now_dt.strftime("%Y-%m-%d")
        updated_count = 0

        for it in items:
            req_qty = int(it.qty or 0)
            if req_qty <= 0:
                continue

            st_status = str(it.stock_status or "").strip()
            st_on_hand = int(it.stock_on_hand or 0)

            # Helper for JSON history arrays
            def get_hist(h_val):
                if not h_val:
                    return []
                raw = h_val
                if isinstance(h_val, str):
                    try:
                        raw = json.loads(h_val)
                    except Exception:
                        return []
                if isinstance(raw, list):
                    return [elem for elem in raw if isinstance(elem, dict)]
                elif isinstance(raw, dict):
                    return [raw]
                return []

            # 1. PO Scope
            if scope in ("ALL", "PO", "PROC"):
                # Real un-ordered balance: if All Stock on Hand, need = 0. If Partial Stock on Hand, subtract on hand.
                if st_status == "All Stock on Hand":
                    needed_po = 0
                elif st_status == "Partial Stock on Hand":
                    needed_po = max(0, req_qty - st_on_hand - int(it.po_qty_ordered or 0))
                else:
                    needed_po = max(0, req_qty - int(it.po_qty_ordered or 0))

                p_hist = get_hist(it.purchase_history)
                # Remove prior legacy entry if present so we re-float cleanly
                p_hist = [h for h in p_hist if str(h.get("ref") or h.get("id") or "").strip() != "[LEGACY]"]

                if needed_po > 0:
                    p_hist.append({
                        "id": "[LEGACY]",
                        "ref": "[LEGACY]",
                        "qty": needed_po,
                        "cost": float(it.unit_cost or 0.0),
                        "supplier": it.po_supplier or "Legacy",
                        "date": it.po_date or today_str,
                        "by": created_by,
                        "type": "PO"
                    })

                it.purchase_history = json.dumps(p_hist)
                it.po_qty_ordered = int(sum(float(h.get("qty") or 0) for h in p_hist))
                po_refs = sorted(set(str(h.get("ref")).strip() for h in p_hist if h.get("ref")))
                it.po_ref = "; ".join(po_refs) if po_refs else None

            # 2. GRN Scope
            if scope in ("ALL", "GRN", "PROC"):
                needed_grn = max(0, req_qty - int(it.received_qty or 0))
                r_hist = get_hist(it.receiving_history)
                r_hist = [h for h in r_hist if str(h.get("ref") or h.get("id") or "").strip() != "[LEGACY]"]

                if needed_grn > 0:
                    r_hist.append({
                        "id": "[LEGACY]",
                        "ref": "[LEGACY]",
                        "qty": needed_grn,
                        "date": it.received_date or today_str,
                        "by": created_by,
                        "type": "GRN"
                    })

                it.receiving_history = json.dumps(r_hist)
                it.received_qty = int(sum(float(h.get("qty") or 0) for h in r_hist))

            # 3. Invoice Scope
            if scope in ("ALL", "INVOICE"):
                needed_inv = max(0, req_qty - int(it.invoice_qty or 0))
                inv_hist = get_hist(it.invoice_history)
                inv_hist = [h for h in inv_hist if str(h.get("ref") or h.get("id") or "").strip() != "[LEGACY]"]

                if needed_inv > 0:
                    unit_ret = float(it.unit_retail or 0.0)
                    inv_hist.append({
                        "id": "[LEGACY]",
                        "ref": "[LEGACY]",
                        "qty": needed_inv,
                        "unitPrice": unit_ret,
                        "total": round(needed_inv * unit_ret, 2),
                        "date": it.invoice_date or today_str,
                        "by": created_by,
                        "type": "Invoice"
                    })

                it.invoice_history = json.dumps(inv_hist)
                it.invoice_qty = int(sum(float(h.get("qty") or 0) for h in inv_hist))
                it.invoice_value = round(sum(float(h.get("total") or (float(h.get("qty") or 0) * float(h.get("unitPrice") or 0))) for h in inv_hist), 2)
                inv_refs = sorted(set(str(h.get("ref")).strip() for h in inv_hist if h.get("ref")))
                it.invoice_ref = "; ".join(inv_refs) if inv_refs else None

            updated_count += 1

        db.commit()
        logger.info(f"Applied Legacy Baseline ({scope}) to {updated_count} items on order {po_number} by {created_by}.")
        return {
            "status": "success",
            "message": f"Successfully applied Legacy Baseline to {updated_count} item(s).",
            "updated_count": updated_count,
            "scope": scope
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error applying legacy baseline on order {po_number}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{po_number}/legacy-baseline")
def clear_order_legacy_baseline(
    po_number: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Clears any [LEGACY] baseline placeholder tags from selected items,
    safely rolling them back strictly to live Palladium-only metrics.
    """
    try:
        item_ids = payload.get("item_ids") or []
        if not item_ids:
            raise HTTPException(status_code=400, detail="No item_ids provided.")

        items = db.query(OrderItem).filter(OrderItem.id.in_([str(i) for i in item_ids])).all()
        if not items:
            raise HTTPException(status_code=404, detail="No matching order items found.")

        cleared_count = 0
        for it in items:
            def clean_hist(h_val):
                if not h_val:
                    return []
                raw = h_val
                if isinstance(h_val, str):
                    try:
                        raw = json.loads(h_val)
                    except Exception:
                        return []
                if isinstance(raw, list):
                    return [h for h in raw if isinstance(h, dict) and str(h.get("ref") or h.get("id") or "").strip() != "[LEGACY]"]
                elif isinstance(raw, dict):
                    return [raw] if str(raw.get("ref") or raw.get("id") or "").strip() != "[LEGACY]" else []
                return []

            # PO
            p_hist = clean_hist(it.purchase_history)
            it.purchase_history = json.dumps(p_hist)
            it.po_qty_ordered = int(sum(float(h.get("qty") or 0) for h in p_hist))
            po_refs = sorted(set(str(h.get("ref")).strip() for h in p_hist if h.get("ref")))
            it.po_ref = "; ".join(po_refs) if po_refs else None

            # GRN
            r_hist = clean_hist(it.receiving_history)
            it.receiving_history = json.dumps(r_hist)
            it.received_qty = int(sum(float(h.get("qty") or 0) for h in r_hist))

            # Invoice
            inv_hist = clean_hist(it.invoice_history)
            it.invoice_history = json.dumps(inv_hist)
            it.invoice_qty = int(sum(float(h.get("qty") or 0) for h in inv_hist))
            it.invoice_value = round(sum(float(h.get("total") or (float(h.get("qty") or 0) * float(h.get("unitPrice") or 0))) for h in inv_hist), 2)
            inv_refs = sorted(set(str(h.get("ref")).strip() for h in inv_hist if h.get("ref")))
            it.invoice_ref = "; ".join(inv_refs) if inv_refs else None

            cleared_count += 1

        db.commit()
        logger.info(f"Cleared Legacy Baseline from {cleared_count} items on order {po_number}.")
        return {
            "status": "success",
            "message": f"Successfully cleared Legacy Baseline from {cleared_count} item(s).",
            "cleared_count": cleared_count
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error clearing legacy baseline on order {po_number}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# trigger redeploy
