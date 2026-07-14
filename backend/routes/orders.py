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
    stock_on_hand: int = 0
    is_credit: Optional[bool] = False
    item_type: Optional[str] = "Hardware"

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

@router.post("/")
def create_order(order_data: dict, db: Session = Depends(get_db)):
    project_key = order_data.get("project_key")
    po_number = order_data.get("po_number")
    
    if not project_key or not po_number:
        raise HTTPException(status_code=400, detail="project_key and po_number are required")

    # Verify project exists
    project = db.query(Project).filter(Project.project_key == project_key).first()
    project_id = project.id if project else None

    # Check if duplicate po_number
    existing = db.query(Order).filter(Order.po_number == po_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Order with this PO number already exists")

    # Extract standard fields
    new_order = Order(
        project_id=project_id,
        project_key=project_key,
        po_number=po_number,
        supplier_name=order_data.get("supplier_name"),
        items_count=int(order_data.get("items_count", 0)),
        value=float(order_data.get("value", 0.0)),
        paid=float(order_data.get("paid", 0.0)),
        outstanding=float(order_data.get("outstanding", 0.0)),
        status=order_data.get("status", "Pending"),
        eta=order_data.get("eta", "—"),
        quote_name=order_data.get("quote_name", "General Spec")
    )
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
    if project_key:
        order.project_key = project_key
        project = db.query(Project).filter(Project.project_key == project_key).first()
        order.project_id = project.id if project else None

    order.supplier_name = order_data.get("supplier_name")
    order.items_count = int(order_data.get("items_count", 0))
    order.value = float(order_data.get("value", 0.0))
    order.paid = float(order_data.get("paid", 0.0))
    order.outstanding = float(order_data.get("outstanding", 0.0))
    order.status = order_data.get("status", "Pending")
    order.eta = order_data.get("eta", "—")
    if "quote_name" in order_data:
        order.quote_name = order_data.get("quote_name")
    
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
    # Parse delivery history
    res = []
    for item in items:
        try:
            del_hist = json.loads(item.delivery_history) if item.delivery_history else []
        except Exception:
            del_hist = []
        item_dict = item.__dict__.copy()
        item_dict['delivery_history'] = del_hist
        if '_sa_instance_state' in item_dict:
            del item_dict['_sa_instance_state']
        res.append(item_dict)
    return res

@router.post("/{po_number}/items")
def create_order_item(po_number: str, item_data: OrderItemSchema, db: Session = Depends(get_db)):
    # Check if duplicate ID
    existing = db.query(OrderItem).filter(OrderItem.id == item_data.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Item with this ID already exists")

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
        stock_on_hand=item_data.stock_on_hand,
        is_credit=item_data.is_credit,
        item_type=item_data.item_type
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
    item.stock_on_hand = item_data.stock_on_hand
    item.is_credit = item_data.is_credit
    item.item_type = item_data.item_type
    
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
