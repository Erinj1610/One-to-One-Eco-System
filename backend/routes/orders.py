from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.cloud_sql import get_db
from models.orm_models import Order, OrderItem, Project
from pydantic import BaseModel
from typing import Optional, List, Any
import json

router = APIRouter()

class BulkDeleteOrdersSchema(BaseModel):
    po_numbers: List[str]

class BulkRelinkOrdersSchema(BaseModel):
    po_numbers: List[str]
    project_key: str

class BulkRenameOrdersSchema(BaseModel):
    po_numbers: List[str]
    new_quote_name: str

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

@router.get("/{po_number}")
def get_order(po_number: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.po_number == po_number).first()
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
    if "orderDate" in order_data: order.order_date = order_data.get("orderDate")
    if "quotationSentDate" in order_data: order.quotation_sent_date = order_data.get("quotationSentDate")
    if "pfDate" in order_data: order.pf_date = order_data.get("pfDate")
    if "payments" in order_data: order.payments = order_data.get("payments")
    if "depositValue" in order_data and order_data.get("depositValue") is not None:
        order.deposit_value = float(order_data.get("depositValue"))
    if "depositInvoiceSent" in order_data: order.deposit_invoice_sent = order_data.get("depositInvoiceSent")
    if "depositPaymentDate" in order_data: order.deposit_payment_date = order_data.get("depositPaymentDate")
    if "balanceValue" in order_data and order_data.get("balanceValue") is not None:
        order.balance_value = float(order_data.get("balanceValue"))
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
    order = db.query(Order).filter(Order.po_number == po_number).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    project_key = order_data.get("project_key")
    project_id = None
    if project_key:
        order.project_key = project_key
        project = db.query(Project).filter(Project.project_key == project_key).first()
        project_id = project.id if project else None

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
    items = db.query(OrderItem).filter(OrderItem.order_id == po_number).all()
    res = []
    for item in items:
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
        item_dict = item.__dict__.copy()
        item_dict['delivery_history'] = del_hist
        item_dict['purchase_history'] = pur_hist
        item_dict['receiving_history'] = rec_hist
        item_dict['invoice_history'] = inv_hist
        if '_sa_instance_state' in item_dict:
            del item_dict['_sa_instance_state']
        res.append(item_dict)
    return res


@router.post("/{po_number}/items")
def create_order_item(po_number: str, item_data: OrderItemSchema, db: Session = Depends(get_db)):
    # Check if duplicate ID - if so, update gracefully (idempotent create)
    existing = db.query(OrderItem).filter(OrderItem.id == item_data.id).first()
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
        existing.invoice_qty = item_data.invoice_qty
        existing.po_supplier = item_data.po_supplier
        existing.po_date = item_data.po_date
        existing.received_qty = item_data.received_qty
        existing.received_date = item_data.received_date
        existing.invoice_ref = item_data.invoice_ref
        existing.invoice_date = item_data.invoice_date
        existing.invoice_value = item_data.invoice_value
        existing.delivery_qty = item_data.delivery_qty
        existing.delivery_date = item_data.delivery_date
        existing.delivery_status = item_data.delivery_status
        existing.delivery_history = json.dumps(item_data.delivery_history)
        existing.purchase_history = json.dumps(item_data.purchase_history)
        existing.receiving_history = json.dumps(item_data.receiving_history)
        existing.invoice_history = json.dumps(item_data.invoice_history)
        existing.stock_on_hand = item_data.stock_on_hand
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
        invoice_qty=item_data.invoice_qty,
        po_supplier=item_data.po_supplier,
        po_date=item_data.po_date,
        received_qty=item_data.received_qty,
        received_date=item_data.received_date,
        invoice_ref=item_data.invoice_ref,
        invoice_date=item_data.invoice_date,
        invoice_value=item_data.invoice_value,
        delivery_qty=item_data.delivery_qty,
        delivery_date=item_data.delivery_date,
        delivery_status=item_data.delivery_status,
        delivery_history=json.dumps(item_data.delivery_history),
        purchase_history=json.dumps(item_data.purchase_history),
        receiving_history=json.dumps(item_data.receiving_history),
        invoice_history=json.dumps(item_data.invoice_history),
        stock_on_hand=item_data.stock_on_hand,
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
    item.invoice_qty = item_data.invoice_qty
    item.po_supplier = item_data.po_supplier
    item.po_date = item_data.po_date
    item.received_qty = item_data.received_qty
    item.received_date = item_data.received_date
    item.invoice_ref = item_data.invoice_ref
    item.invoice_date = item_data.invoice_date
    item.invoice_value = item_data.invoice_value
    item.delivery_qty = item_data.delivery_qty
    item.delivery_date = item_data.delivery_date
    item.delivery_status = item_data.delivery_status
    item.delivery_history = json.dumps(item_data.delivery_history)
    item.purchase_history = json.dumps(item_data.purchase_history)
    item.receiving_history = json.dumps(item_data.receiving_history)
    item.invoice_history = json.dumps(item_data.invoice_history)
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
