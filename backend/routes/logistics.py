from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import json
import re

from database.cloud_sql import get_db
from models.orm_models import (
    Project,
    Order,
    OrderItem,
    Product,
    PortalSetting,
    LogisticsPackingList,
    LogisticsPackingListItem,
    LogisticsDeliveryNote,
    LogisticsDeliveryNoteItem,
    LogisticsLabelTemplate,
)

router = APIRouter()
public_router = APIRouter()


# ─── PYDANTIC SCHEMAS ────────────────────────────────────────────────────────

class PackingListItemInput(BaseModel):
    order_item_id: Optional[int] = None
    parent_item_id: Optional[int] = None
    parent_fitting_code: Optional[str] = None
    one_one_code: Optional[str] = None
    plan_code: Optional[str] = None
    supplier_code: Optional[str] = None
    description: Optional[str] = None
    floor: Optional[str] = None
    area: Optional[str] = None
    material_colour: Optional[str] = None
    first_fix: Optional[str] = "No"
    red_list: Optional[str] = "No"
    qty_ordered: Optional[int] = 0
    qty_packed: int = 0
    qty_backorder: Optional[int] = 0
    box_number: str = "Box 1"
    is_accessory: Optional[bool] = False
    notes: Optional[str] = None


class PackingListCreateInput(BaseModel):
    project_key: Optional[str] = None
    order_id: Any  # Can be integer order.id or string order.po_number
    notes: Optional[str] = None
    created_by: Optional[str] = "Warehouse Team"
    items: List[PackingListItemInput]


class PackingListUpdateInput(BaseModel):
    notes: Optional[str] = None
    status: Optional[str] = None
    items: Optional[List[PackingListItemInput]] = None


class DeliveryNoteItemInput(BaseModel):
    packing_list_id: Optional[int] = None
    packing_list_number: Optional[str] = None
    order_item_id: Optional[int] = None
    parent_item_id: Optional[int] = None
    parent_fitting_code: Optional[str] = None
    one_one_code: Optional[str] = None
    plan_code: Optional[str] = None
    supplier_code: Optional[str] = None
    description: Optional[str] = None
    floor: Optional[str] = None
    area: Optional[str] = None
    material_colour: Optional[str] = None
    first_fix: Optional[str] = "No"
    red_list: Optional[str] = "No"
    box_number: Optional[str] = "Box 1"
    qty_ordered: Optional[int] = 0
    qty_delivered: int = 0
    qty_remaining: Optional[int] = 0
    backorder_eta: Optional[str] = None
    is_accessory: Optional[bool] = False


class DeliveryNoteCreateInput(BaseModel):
    project_key: Optional[str] = None
    order_id: Any
    source_packing_lists: Optional[List[str]] = []  # e.g. ["PL-2026-0001"]
    delivery_type: Optional[str] = "Full"           # "Full" or "Partial"
    dispatch_method: Optional[str] = "Internal Driver"
    carrier_driver: Optional[str] = None
    vehicle_reg: Optional[str] = None
    tracking_number: Optional[str] = None
    delivery_address: Optional[str] = None
    site_contact_name: Optional[str] = None
    site_contact_phone: Optional[str] = None
    site_instructions: Optional[str] = None
    received_by: Optional[str] = None
    notes: Optional[str] = None
    dispatched_by: Optional[str] = "Logistics Team"
    backorder_etas: Optional[Dict[str, str]] = {}   # order_item_id or code -> ETA string
    items: Optional[List[DeliveryNoteItemInput]] = None  # Used for Quick Direct DN or explicit override


class DeliveryNoteStatusInput(BaseModel):
    status: Optional[str] = None
    dispatch_method: Optional[str] = None
    carrier_driver: Optional[str] = None
    vehicle_reg: Optional[str] = None
    tracking_number: Optional[str] = None
    delivery_address: Optional[str] = None
    site_contact_name: Optional[str] = None
    site_contact_phone: Optional[str] = None
    site_instructions: Optional[str] = None
    received_by: Optional[str] = None
    notes: Optional[str] = None


class DeliveryNotePodInput(BaseModel):
    pod_file_url: str
    pod_file_name: Optional[str] = "Signed_POD.pdf"
    received_by: Optional[str] = None
    mark_delivered: Optional[bool] = True


class DeliveryNoteVoidInput(BaseModel):
    voided_by: Optional[str] = "Logistics Admin"
    void_reason: Optional[str] = "Cancelled / Voided via Logistics Portal"


class LabelTemplatesSaveInput(BaseModel):
    templates: List[Dict[str, Any]]
    updated_by: Optional[str] = "Admin"


# ─── HELPERS & SYNCHRONIZATION ENGINE ────────────────────────────────────────

def _resolve_order(db: Session, order_ref: Any, project_key: Optional[str] = None) -> Optional[Order]:
    if order_ref is None:
        return None
    ref_str = str(order_ref).strip()
    order_obj = None
    if ref_str.isdigit():
        order_obj = db.query(Order).filter(Order.id == int(ref_str)).first()
    if not order_obj:
        q = db.query(Order).filter(Order.po_number == ref_str)
        if project_key:
            proj_match = q.filter(Order.project_key == project_key).first()
            if proj_match:
                return proj_match
        order_obj = q.first()
    return order_obj


def _next_document_number(db: Session, prefix: str = "PL") -> str:
    year = datetime.now(timezone.utc).year
    pattern = f"{prefix}-{year}-"
    max_seq = 0

    if prefix == "PL":
        existing = db.query(LogisticsPackingList.document_number).filter(
            LogisticsPackingList.document_number.like(f"{prefix}-%")
        ).all()
    else:
        existing = db.query(LogisticsDeliveryNote.document_number).filter(
            LogisticsDeliveryNote.document_number.like(f"{prefix}-%")
        ).all()

    for (doc_no,) in existing:
        if not doc_no:
            continue
        m = re.search(r"(\d+)$", str(doc_no))
        if m:
            val = int(m.group(1))
            if val > max_seq:
                max_seq = val

    return f"{pattern}{str(max_seq + 1).zfill(4)}"


def _serialize_pl_for_order_json(pl: LogisticsPackingList) -> Dict[str, Any]:
    """Formats a LogisticsPackingList into the JSON structure expected by Orders/SalesTracker/LogisticsPage."""
    date_str = pl.created_at.strftime("%d %b %Y") if pl.created_at else datetime.now(timezone.utc).strftime("%d %b %Y")
    items_serialized = []
    for it in pl.items:
        items_serialized.append({
            "id": it.id,
            "order_item_id": it.order_item_id,
            "parent_item_id": it.parent_item_id,
            "parent_fitting_code": it.parent_fitting_code,
            "code": it.one_one_code or it.supplier_code or "",
            "one_one_code": it.one_one_code or it.supplier_code or "",
            "plan_code": it.plan_code or "",
            "supplier_code": it.supplier_code or it.one_one_code or "",
            "description": it.description or "",
            "name": it.description or "",
            "floor": it.floor or "",
            "area": it.area or "",
            "location": f"{it.floor} - {it.area}".strip(" -") if (it.floor or it.area) else "",
            "material_colour": it.material_colour or "",
            "first_fix": it.first_fix or "No",
            "red_list": it.red_list or "No",
            "qty_ordered": int(it.qty_ordered or 0),
            "qty_packed": int(it.qty_packed or 0),
            "qty_backorder": int(it.qty_backorder or 0),
            "box": it.box_number or "Box 1",
            "box_number": it.box_number or "Box 1",
            "is_accessory": bool(it.is_accessory),
            "notes": it.notes or "",
        })
    return {
        "id": pl.document_number,
        "db_id": pl.id,
        "document_number": pl.document_number,
        "date": date_str,
        "created_at": pl.created_at.isoformat() if pl.created_at else None,
        "status": pl.status or "Pending Dispatch",
        "boxes": int(pl.total_boxes or 1),
        "total_boxes": int(pl.total_boxes or 1),
        "total_items": int(pl.total_items or 0),
        "notes": pl.notes or "",
        "delivery_note_id": pl.delivery_note_id,
        "delivery_note_number": pl.delivery_note_number,
        "by": pl.created_by or "Warehouse Team",
        "created_by": pl.created_by or "Warehouse Team",
        "items": items_serialized,
    }


def _serialize_dn_for_order_json(dn: LogisticsDeliveryNote) -> Dict[str, Any]:
    """Formats a LogisticsDeliveryNote into the JSON structure expected by Orders/SalesTracker/LogisticsPage."""
    date_str = dn.dispatched_at.strftime("%d %b %Y") if dn.dispatched_at else datetime.now(timezone.utc).strftime("%d %b %Y")
    items_serialized = []
    for it in dn.items:
        items_serialized.append({
            "id": it.id,
            "order_item_id": it.order_item_id,
            "packing_list_id": it.packing_list_id,
            "packing_list_number": it.packing_list_number,
            "parent_item_id": it.parent_item_id,
            "parent_fitting_code": it.parent_fitting_code,
            "code": it.one_one_code or it.supplier_code or "",
            "one_one_code": it.one_one_code or it.supplier_code or "",
            "plan_code": it.plan_code or "",
            "supplier_code": it.supplier_code or it.one_one_code or "",
            "description": it.description or "",
            "name": it.description or "",
            "floor": it.floor or "",
            "area": it.area or "",
            "location": f"{it.floor} - {it.area}".strip(" -") if (it.floor or it.area) else "",
            "material_colour": it.material_colour or "",
            "first_fix": it.first_fix or "No",
            "red_list": it.red_list or "No",
            "box": it.box_number or "Box 1",
            "box_number": it.box_number or "Box 1",
            "qty_ordered": int(it.qty_ordered or 0),
            "qty_delivered": int(it.qty_delivered or 0),
            "qty_remaining": int(it.qty_remaining or 0),
            "backorder_eta": it.backorder_eta or "",
            "is_accessory": bool(it.is_accessory),
        })
    return {
        "id": dn.document_number,
        "db_id": dn.id,
        "document_number": dn.document_number,
        "date": date_str,
        "dispatched_at": dn.dispatched_at.isoformat() if dn.dispatched_at else None,
        "status": dn.status or "Dispatched",
        "type": dn.delivery_type or "Full",
        "delivery_type": dn.delivery_type or "Full",
        "source_packing_lists": dn.source_packing_lists or [],
        "dispatch_method": dn.dispatch_method or "Internal Driver",
        "carrier": dn.carrier_driver or "Internal Driver",
        "carrier_driver": dn.carrier_driver or "",
        "vehicle_reg": dn.vehicle_reg or "",
        "tracking": dn.tracking_number or "",
        "tracking_number": dn.tracking_number or "",
        "delivery_address": dn.delivery_address or "",
        "site_contact_name": dn.site_contact_name or "",
        "site_contact_phone": dn.site_contact_phone or "",
        "site_instructions": dn.site_instructions or "",
        "received_by": dn.received_by or "",
        "received_at": dn.received_at.isoformat() if dn.received_at else None,
        "pod_received": bool(dn.pod_received),
        "pod_file_url": dn.pod_file_url or "",
        "pod_file_name": dn.pod_file_name or "",
        "outstanding_snapshot": dn.outstanding_snapshot or [],
        "notes": dn.notes or "",
        "by": dn.dispatched_by or "Logistics Team",
        "dispatched_by": dn.dispatched_by or "Logistics Team",
        "voided_at": dn.voided_at.isoformat() if dn.voided_at else None,
        "voided_by": dn.voided_by or "",
        "void_reason": dn.void_reason or "",
        "items": items_serialized,
    }


def ensure_legacy_logistics_migrated(db: Session):
    """
    One-time/idempotent backfill that migrates any legacy JSON Order.packing_lists and Order.delivery_notes
    into the relational LogisticsPackingList and LogisticsDeliveryNote tables so zero data is ever lost.
    """
    orders = db.query(Order).all()
    existing_pls = {r[0] for r in db.query(LogisticsPackingList.document_number).all() if r[0]}
    existing_dns = {r[0] for r in db.query(LogisticsDeliveryNote.document_number).all() if r[0]}
    migrated_any = False

    for ord_obj in orders:
        proj = db.query(Project).filter(Project.key == ord_obj.project_key).first() if ord_obj.project_key else None
        order_items = db.query(OrderItem).filter(OrderItem.order_id.in_([ord_obj.po_number, str(ord_obj.id)])).all()

        # 1. Migrate legacy Packing Lists
        raw_pls = ord_obj.packing_lists
        if isinstance(raw_pls, str):
            try:
                raw_pls = json.loads(raw_pls)
            except Exception:
                raw_pls = []
        if isinstance(raw_pls, list):
            for pl_json in raw_pls:
                if not isinstance(pl_json, dict):
                    continue
                doc_no = pl_json.get("id") or pl_json.get("document_number")
                if not doc_no or doc_no in existing_pls:
                    continue
                existing_pls.add(doc_no)
                pl_items_raw = pl_json.get("items") or []
                total_packed = sum(int(i.get("qty_packed") or 0) for i in pl_items_raw if isinstance(i, dict))
                pl_rec = LogisticsPackingList(
                    document_number=doc_no,
                    project_id=proj.id if proj else ord_obj.project_id,
                    project_key=ord_obj.project_key,
                    order_id=ord_obj.id,
                    order_po_number=ord_obj.po_number,
                    status=pl_json.get("status") or "Pending Dispatch",
                    total_boxes=int(pl_json.get("boxes") or pl_json.get("total_boxes") or 1),
                    total_items=total_packed,
                    notes=pl_json.get("notes") or "",
                    created_by=pl_json.get("by") or pl_json.get("created_by") or "Warehouse Team",
                )
                db.add(pl_rec)
                db.flush()

                for it_j in pl_items_raw:
                    if not isinstance(it_j, dict):
                        continue
                    code_val = it_j.get("code") or it_j.get("one_one_code") or ""
                    matched_oi = next(
                        (oi for oi in order_items if (oi.one_one_code and oi.one_one_code == code_val) or (oi.code and oi.code == code_val)),
                        None
                    )
                    pl_item = LogisticsPackingListItem(
                        packing_list_id=pl_rec.id,
                        order_item_id=matched_oi.id if matched_oi else it_j.get("order_item_id"),
                        one_one_code=code_val,
                        plan_code=it_j.get("plan_code") or (matched_oi.type if matched_oi else ""),
                        supplier_code=it_j.get("supplier_code") or (matched_oi.code if matched_oi else code_val),
                        description=it_j.get("description") or it_j.get("name") or (matched_oi.description if matched_oi else ""),
                        floor=it_j.get("floor") or (matched_oi.floor if matched_oi else ""),
                        area=it_j.get("area") or it_j.get("location") or (matched_oi.area if matched_oi else ""),
                        material_colour=it_j.get("material_colour") or "",
                        first_fix=it_j.get("first_fix") or "No",
                        red_list=it_j.get("red_list") or "No",
                        qty_ordered=int(it_j.get("qty_ordered") or (matched_oi.qty if matched_oi else 0) or 0),
                        qty_packed=int(it_j.get("qty_packed") or 0),
                        qty_backorder=int(it_j.get("qty_backorder") or 0),
                        box_number=str(it_j.get("box") or it_j.get("box_number") or "Box 1"),
                    )
                    db.add(pl_item)
                migrated_any = True

        # 2. Migrate legacy Delivery Notes
        raw_dns = ord_obj.delivery_notes
        if isinstance(raw_dns, str):
            try:
                raw_dns = json.loads(raw_dns)
            except Exception:
                raw_dns = []
        if isinstance(raw_dns, list):
            for dn_json in raw_dns:
                if not isinstance(dn_json, dict):
                    continue
                doc_no = dn_json.get("id") or dn_json.get("document_number")
                if not doc_no or doc_no in existing_dns:
                    continue
                existing_dns.add(doc_no)
                dn_items_raw = dn_json.get("items") or []
                dn_rec = LogisticsDeliveryNote(
                    document_number=doc_no,
                    project_id=proj.id if proj else ord_obj.project_id,
                    project_key=ord_obj.project_key,
                    order_id=ord_obj.id,
                    order_po_number=ord_obj.po_number,
                    status=dn_json.get("status") or "Delivered",
                    delivery_type=dn_json.get("type") or dn_json.get("delivery_type") or "Full",
                    source_packing_lists=dn_json.get("source_packing_lists") or [],
                    dispatch_method=dn_json.get("dispatch_method") or "Internal Driver",
                    carrier_driver=dn_json.get("carrier") or dn_json.get("carrier_driver") or "Internal Driver",
                    vehicle_reg=dn_json.get("vehicle_reg") or "",
                    tracking_number=dn_json.get("tracking") or dn_json.get("tracking_number") or "",
                    delivery_address=dn_json.get("delivery_address") or "",
                    site_contact_name=dn_json.get("site_contact_name") or "",
                    site_contact_phone=dn_json.get("site_contact_phone") or "",
                    site_instructions=dn_json.get("site_instructions") or "",
                    received_by=dn_json.get("received_by") or "",
                    pod_received=bool(dn_json.get("pod_received", dn_json.get("status") == "Delivered")),
                    notes=dn_json.get("notes") or "",
                    dispatched_by=dn_json.get("by") or dn_json.get("dispatched_by") or "Logistics Team",
                )
                db.add(dn_rec)
                db.flush()

                for it_j in dn_items_raw:
                    if not isinstance(it_j, dict):
                        continue
                    code_val = it_j.get("code") or it_j.get("one_one_code") or ""
                    matched_oi = next(
                        (oi for oi in order_items if (oi.one_one_code and oi.one_one_code == code_val) or (oi.code and oi.code == code_val)),
                        None
                    )
                    dn_item = LogisticsDeliveryNoteItem(
                        delivery_note_id=dn_rec.id,
                        order_item_id=matched_oi.id if matched_oi else it_j.get("order_item_id"),
                        one_one_code=code_val,
                        plan_code=it_j.get("plan_code") or (matched_oi.type if matched_oi else ""),
                        supplier_code=it_j.get("supplier_code") or (matched_oi.code if matched_oi else code_val),
                        description=it_j.get("description") or it_j.get("name") or (matched_oi.description if matched_oi else ""),
                        floor=it_j.get("floor") or (matched_oi.floor if matched_oi else ""),
                        area=it_j.get("area") or it_j.get("location") or (matched_oi.area if matched_oi else ""),
                        material_colour=it_j.get("material_colour") or "",
                        first_fix=it_j.get("first_fix") or "No",
                        red_list=it_j.get("red_list") or "No",
                        box_number=str(it_j.get("box") or it_j.get("box_number") or "Box 1"),
                        qty_ordered=int(it_j.get("qty_ordered") or (matched_oi.qty if matched_oi else 0) or 0),
                        qty_delivered=int(it_j.get("qty_delivered") or 0),
                        qty_remaining=int(it_j.get("qty_remaining") or 0),
                    )
                    db.add(dn_item)
                migrated_any = True

    if migrated_any:
        db.commit()


def recalc_order_item_logistics(db: Session, order_obj: Order):
    """
    Authoritatively recalculates:
      1. Order.packing_lists and Order.delivery_notes JSON arrays from relational tables
      2. Each OrderItem's delivery_qty, delivery_date, delivery_status, and delivery_history
         strictly from active (non-Cancelled) LogisticsDeliveryNotes.
    """
    if not order_obj:
        return

    pls = db.query(LogisticsPackingList).filter(
        LogisticsPackingList.order_id == order_obj.id,
        LogisticsPackingList.status != "Cancelled"
    ).order_by(LogisticsPackingList.created_at.desc()).all()

    all_dns = db.query(LogisticsDeliveryNote).filter(
        LogisticsDeliveryNote.order_id == order_obj.id
    ).order_by(LogisticsDeliveryNote.dispatched_at.desc()).all()

    active_dns = [d for d in all_dns if (d.status or "").lower() not in ("cancelled", "voided")]

    # Sync JSON columns on Order so /api/projects/all and SalesTracker are 100% up to date
    order_obj.packing_lists = [_serialize_pl_for_order_json(pl) for pl in pls]
    order_obj.delivery_notes = [_serialize_dn_for_order_json(dn) for dn in all_dns]
    flag_modified(order_obj, "packing_lists")
    flag_modified(order_obj, "delivery_notes")

    # Fetch all OrderItems for this order
    order_keys = [k for k in [order_obj.po_number, str(order_obj.id)] if k]
    order_items = db.query(OrderItem).filter(OrderItem.order_id.in_(order_keys)).all()

    for oi in order_items:
        total_deliv_qty = 0
        latest_deliv_date = None
        deliv_hist = []

        for dn in reversed(active_dns):  # chronological order for history
            dn_date_str = dn.dispatched_at.strftime("%d %b %Y") if dn.dispatched_at else datetime.now(timezone.utc).strftime("%d %b %Y")
            matched_dn_qty = 0
            for dn_it in dn.items:
                is_match = False
                if dn_it.order_item_id and int(dn_it.order_item_id) == int(oi.id):
                    is_match = True
                elif not dn_it.order_item_id:
                    oi_codes = {str(c).strip().upper() for c in [oi.one_one_code, oi.code] if c}
                    dn_codes = {str(c).strip().upper() for c in [dn_it.one_one_code, dn_it.supplier_code] if c}
                    if oi_codes and dn_codes and (oi_codes & dn_codes):
                        # Also match floor/area if present to avoid cross-room collisions
                        if not dn_it.area or not oi.area or dn_it.area.strip().lower() == oi.area.strip().lower():
                            is_match = True

                if is_match and int(dn_it.qty_delivered or 0) > 0:
                    matched_dn_qty += int(dn_it.qty_delivered or 0)

            if matched_dn_qty > 0:
                total_deliv_qty += matched_dn_qty
                latest_deliv_date = dn_date_str
                deliv_hist.append({
                    "id": dn.document_number,
                    "ref": dn.document_number,
                    "qty": matched_dn_qty,
                    "date": dn_date_str,
                    "carrier": dn.carrier_driver or dn.dispatch_method or "Internal Driver",
                    "tracking": dn.tracking_number or "",
                    "received_by": dn.received_by or "",
                    "status": dn.status or "Dispatched",
                    "pod_received": bool(dn.pod_received),
                    "by": dn.dispatched_by or "Logistics Team",
                })

        oi.delivery_qty = total_deliv_qty
        oi.delivery_date = latest_deliv_date
        oi.delivery_history = deliv_hist
        flag_modified(oi, "delivery_history")

        ordered_qty = int(oi.qty or 0)
        if total_deliv_qty <= 0:
            oi.delivery_status = "Pending"
        elif total_deliv_qty >= ordered_qty and ordered_qty > 0:
            oi.delivery_status = "Delivered"
        else:
            oi.delivery_status = "Partial"

    # Update top-level Order status if all items are delivered
    if order_items:
        all_delivered = all(int(oi.delivery_qty or 0) >= int(oi.qty or 0) for oi in order_items if int(oi.qty or 0) > 0)
        any_delivered = any(int(oi.delivery_qty or 0) > 0 for oi in order_items)
        if all_delivered and active_dns:
            order_obj.status = "Delivered"
        elif any_delivered and order_obj.status == "Delivered":
            order_obj.status = "Partially Delivered"
        elif not any_delivered and order_obj.status in ("Delivered", "Partially Delivered"):
            order_obj.status = "In Progress"


# ─── API ENDPOINTS ───────────────────────────────────────────────────────────

@public_router.get("/logistics/order-items/{order_ref}")
@router.get("/logistics/order-items/{order_ref}")
def get_enriched_order_items_for_logistics(
    order_ref: str,
    project_key: Optional[str] = Query(None),
    exclude_pl_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns all OrderItems for an Order enriched with Product catalog metadata:
    - one_one_code, plan_code, supplier_code, description
    - floor, area
    - material_colour, first_fix, red_list
    - qty_ordered, qty_already_packed, qty_already_delivered, remaining_to_pack
    """
    ensure_legacy_logistics_migrated(db)
    order_obj = _resolve_order(db, order_ref, project_key)
    if not order_obj:
        raise HTTPException(status_code=404, detail=f"Order '{order_ref}' not found")

    order_keys = [k for k in [order_obj.po_number, str(order_obj.id)] if k]
    order_items = db.query(OrderItem).filter(OrderItem.order_id.in_(order_keys)).order_by(OrderItem.sort_order.asc(), OrderItem.id.asc()).all()

    # Load product catalog lookup for enrichment
    products = db.query(Product).all()
    prod_by_code = {}
    for p in products:
        if p.one_one_code:
            prod_by_code[p.one_one_code.strip().upper()] = p
        if p.supplier_code:
            prod_by_code[p.supplier_code.strip().upper()] = p

    # Calculate already packed quantities across active Packing Lists for this order
    active_pls = db.query(LogisticsPackingList).filter(
        LogisticsPackingList.order_id == order_obj.id,
        LogisticsPackingList.status != "Cancelled"
    ).all()

    packed_by_item_id: Dict[int, int] = {}
    for pl in active_pls:
        if exclude_pl_id and pl.id == exclude_pl_id:
            continue
        for pl_it in pl.items:
            if pl_it.order_item_id:
                packed_by_item_id[int(pl_it.order_item_id)] = packed_by_item_id.get(int(pl_it.order_item_id), 0) + int(pl_it.qty_packed or 0)

    # Also extract Project / Client site delivery contact details for DN pre-fill
    proj = db.query(Project).filter(Project.key == order_obj.project_key).first() if order_obj.project_key else None
    proj_meta = (proj.project_metadata if proj and isinstance(proj.project_metadata, dict) else {}) or {}

    enriched_items = []
    floors_set = set()
    areas_set = set()

    for oi in order_items:
        if oi.is_credit:
            continue
        one_one = (oi.one_one_code or oi.code or "").strip()
        supp_code = (oi.code or oi.one_one_code or "").strip()
        prod = prod_by_code.get(one_one.upper()) or prod_by_code.get(supp_code.upper())

        if prod and prod.supplier_code:
            supp_code = prod.supplier_code

        material_colour = ""
        if prod and prod.color:
            material_colour = prod.color
        elif oi.selection:
            material_colour = oi.selection
        elif oi.dimming and oi.dimming not in ("None", "N/A"):
            material_colour = oi.dimming

        first_fix = "No"
        if prod and prod.first_fix:
            ff_val = str(prod.first_fix).strip().lower()
            first_fix = "Yes" if ff_val in ("yes", "true", "1", "y") else "No"

        red_list = "No"
        if prod and prod.red_list:
            rl_val = str(prod.red_list).strip().lower()
            red_list = "Yes" if rl_val in ("yes", "true", "1", "y") else "No"

        floor_val = (oi.floor or "").strip()
        area_val = (oi.area or "").strip()
        if floor_val:
            floors_set.add(floor_val)
        if area_val:
            areas_set.add(area_val)

        qty_ordered = int(oi.qty or 0)
        qty_packed_prev = int(packed_by_item_id.get(oi.id, 0))
        qty_delivered = int(oi.delivery_qty or 0)
        remaining_to_pack = max(0, qty_ordered - qty_packed_prev)
        remaining_to_deliver = max(0, qty_ordered - qty_delivered)

        # Heuristic for whether an item is likely an accessory/lamp/driver/track component
        desc_lower = (oi.description or "").lower()
        cat_lower = ((prod.category if prod else "") or (oi.item_type or "")).lower()
        is_accessory_candidate = any(
            kw in desc_lower or kw in cat_lower
            for kw in ("driver", "lamp", "bulb", "gu10", "accessory", "connector", "power", "honeycomb", "louvre", "clip", "end cap", "profile", "strip", "psu")
        )

        enriched_items.append({
            "order_item_id": oi.id,
            "one_one_code": one_one,
            "plan_code": (oi.type or "").strip(),
            "supplier_code": supp_code,
            "description": oi.description or (prod.name if prod else "") or "",
            "floor": floor_val,
            "area": area_val,
            "material_colour": material_colour,
            "first_fix": first_fix,
            "red_list": red_list,
            "qty_ordered": qty_ordered,
            "qty_received_grn": int(oi.received_qty or 0),
            "qty_already_packed": qty_packed_prev,
            "qty_already_delivered": qty_delivered,
            "remaining_to_pack": remaining_to_pack,
            "remaining_to_deliver": remaining_to_deliver,
            "eta": oi.po_eta or oi.eta or "",
            "is_accessory_candidate": is_accessory_candidate,
        })

    return {
        "order_id": order_obj.id,
        "order_po_number": order_obj.po_number,
        "quote_name": order_obj.quote_name or order_obj.po_number,
        "project_key": order_obj.project_key,
        "project_name": proj.name if proj else order_obj.project_key,
        "client_name": (proj.client if proj else None) or order_obj.client_ref or "",
        "site_address": proj_meta.get("site_address") or proj_meta.get("address") or (proj.location if proj else "") or "",
        "site_contact_name": proj_meta.get("site_contact") or (proj.client if proj else "") or "",
        "site_contact_phone": proj_meta.get("site_phone") or (proj.phone if proj else "") or "",
        "floors": sorted(floors_set),
        "areas": sorted(areas_set),
        "items": enriched_items,
    }


@public_router.get("/logistics/documents")
@router.get("/logistics/documents")
def list_logistics_documents(
    project_key: Optional[str] = Query(None),
    doc_type: Optional[str] = Query(None),  # "Packing List" or "Delivery Note"
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Returns all relational Packing Lists and Delivery Notes with project & order metadata."""
    ensure_legacy_logistics_migrated(db)

    projects_map = {p.key: p for p in db.query(Project).all() if p.key}
    orders_map = {o.id: o for o in db.query(Order).all()}

    documents = []

    if not doc_type or doc_type in ("ALL", "Packing List", "PL"):
        q_pl = db.query(LogisticsPackingList)
        if project_key and project_key != "ALL":
            q_pl = q_pl.filter(LogisticsPackingList.project_key == project_key)
        if status and status != "ALL":
            q_pl = q_pl.filter(LogisticsPackingList.status == status)
        for pl in q_pl.order_by(LogisticsPackingList.created_at.desc()).all():
            proj = projects_map.get(pl.project_key)
            ord_obj = orders_map.get(pl.order_id)
            serialized = _serialize_pl_for_order_json(pl)
            serialized.update({
                "docType": "Packing List",
                "projectKey": pl.project_key,
                "projectName": proj.name if proj else pl.project_key,
                "clientName": (proj.client if proj else None) or (ord_obj.client_ref if ord_obj else "") or "",
                "orderId": pl.order_po_number or (ord_obj.po_number if ord_obj else str(pl.order_id)),
                "orderDbId": pl.order_id,
                "orderName": (ord_obj.quote_name if ord_obj else None) or pl.order_po_number,
                "totalQty": sum(int(i.qty_packed or 0) for i in pl.items),
            })
            documents.append(serialized)

    if not doc_type or doc_type in ("ALL", "Delivery Note", "DN"):
        q_dn = db.query(LogisticsDeliveryNote)
        if project_key and project_key != "ALL":
            q_dn = q_dn.filter(LogisticsDeliveryNote.project_key == project_key)
        if status and status != "ALL":
            q_dn = q_dn.filter(LogisticsDeliveryNote.status == status)
        for dn in q_dn.order_by(LogisticsDeliveryNote.dispatched_at.desc()).all():
            proj = projects_map.get(dn.project_key)
            ord_obj = orders_map.get(dn.order_id)
            serialized = _serialize_dn_for_order_json(dn)
            serialized.update({
                "docType": "Delivery Note",
                "projectKey": dn.project_key,
                "projectName": proj.name if proj else dn.project_key,
                "clientName": (proj.client if proj else None) or (ord_obj.client_ref if ord_obj else "") or "",
                "orderId": dn.order_po_number or (ord_obj.po_number if ord_obj else str(dn.order_id)),
                "orderDbId": dn.order_id,
                "orderName": (ord_obj.quote_name if ord_obj else None) or dn.order_po_number,
                "totalQty": sum(int(i.qty_delivered or 0) for i in dn.items),
            })
            documents.append(serialized)

    return {"documents": documents, "count": len(documents)}


@router.post("/logistics/packing-list")
def create_packing_list(payload: PackingListCreateInput, db: Session = Depends(get_db)):
    ensure_legacy_logistics_migrated(db)
    order_obj = _resolve_order(db, payload.order_id, payload.project_key)
    if not order_obj:
        raise HTTPException(status_code=404, detail=f"Order '{payload.order_id}' not found")

    active_items = [it for it in payload.items if int(it.qty_packed or 0) > 0]
    if not active_items:
        raise HTTPException(status_code=400, detail="Packing List must contain at least one item with Packed Qty > 0")

    doc_no = _next_document_number(db, "PL")
    unique_boxes = {str(it.box_number or "Box 1").strip() for it in active_items}
    total_packed_units = sum(int(it.qty_packed or 0) for it in active_items)

    proj = db.query(Project).filter(Project.key == (payload.project_key or order_obj.project_key)).first()

    pl_rec = LogisticsPackingList(
        document_number=doc_no,
        project_id=proj.id if proj else order_obj.project_id,
        project_key=order_obj.project_key,
        order_id=order_obj.id,
        order_po_number=order_obj.po_number,
        status="Pending Dispatch",
        total_boxes=max(1, len(unique_boxes)),
        total_items=total_packed_units,
        notes=payload.notes or "",
        created_by=payload.created_by or "Warehouse Team",
    )
    db.add(pl_rec)
    db.flush()

    for it in active_items:
        pl_item = LogisticsPackingListItem(
            packing_list_id=pl_rec.id,
            order_item_id=it.order_item_id,
            parent_item_id=it.parent_item_id,
            parent_fitting_code=it.parent_fitting_code,
            one_one_code=it.one_one_code or it.supplier_code or "",
            plan_code=it.plan_code or "",
            supplier_code=it.supplier_code or it.one_one_code or "",
            description=it.description or "",
            floor=it.floor or "",
            area=it.area or "",
            material_colour=it.material_colour or "",
            first_fix=it.first_fix or "No",
            red_list=it.red_list or "No",
            qty_ordered=int(it.qty_ordered or 0),
            qty_packed=int(it.qty_packed or 0),
            qty_backorder=max(0, int(it.qty_backorder if it.qty_backorder is not None else (int(it.qty_ordered or 0) - int(it.qty_packed or 0)))),
            box_number=str(it.box_number or "Box 1").strip(),
            is_accessory=bool(it.is_accessory or it.parent_item_id),
            notes=it.notes or "",
        )
        db.add(pl_item)

    db.flush()
    recalc_order_item_logistics(db, order_obj)
    db.commit()
    db.refresh(pl_rec)

    return {
        "status": "ok",
        "message": f"Packing List {doc_no} created",
        "packing_list": _serialize_pl_for_order_json(pl_rec),
    }


@router.put("/logistics/packing-list/{pl_ref}")
def update_packing_list(pl_ref: str, payload: PackingListUpdateInput, db: Session = Depends(get_db)):
    pl_rec = None
    if str(pl_ref).isdigit():
        pl_rec = db.query(LogisticsPackingList).filter(LogisticsPackingList.id == int(pl_ref)).first()
    if not pl_rec:
        pl_rec = db.query(LogisticsPackingList).filter(LogisticsPackingList.document_number == str(pl_ref)).first()
    if not pl_rec:
        raise HTTPException(status_code=404, detail=f"Packing List '{pl_ref}' not found")

    if payload.notes is not None:
        pl_rec.notes = payload.notes
    if payload.status is not None:
        pl_rec.status = payload.status

    if payload.items is not None:
        active_items = [it for it in payload.items if int(it.qty_packed or 0) > 0]
        if not active_items:
            raise HTTPException(status_code=400, detail="Packing List must contain at least one item with Packed Qty > 0")

        db.query(LogisticsPackingListItem).filter(LogisticsPackingListItem.packing_list_id == pl_rec.id).delete()
        db.flush()

        unique_boxes = {str(it.box_number or "Box 1").strip() for it in active_items}
        pl_rec.total_boxes = max(1, len(unique_boxes))
        pl_rec.total_items = sum(int(it.qty_packed or 0) for it in active_items)

        for it in active_items:
            pl_item = LogisticsPackingListItem(
                packing_list_id=pl_rec.id,
                order_item_id=it.order_item_id,
                parent_item_id=it.parent_item_id,
                parent_fitting_code=it.parent_fitting_code,
                one_one_code=it.one_one_code or it.supplier_code or "",
                plan_code=it.plan_code or "",
                supplier_code=it.supplier_code or it.one_one_code or "",
                description=it.description or "",
                floor=it.floor or "",
                area=it.area or "",
                material_colour=it.material_colour or "",
                first_fix=it.first_fix or "No",
                red_list=it.red_list or "No",
                qty_ordered=int(it.qty_ordered or 0),
                qty_packed=int(it.qty_packed or 0),
                qty_backorder=max(0, int(it.qty_backorder if it.qty_backorder is not None else (int(it.qty_ordered or 0) - int(it.qty_packed or 0)))),
                box_number=str(it.box_number or "Box 1").strip(),
                is_accessory=bool(it.is_accessory or it.parent_item_id),
                notes=it.notes or "",
            )
            db.add(pl_item)

    db.flush()
    order_obj = db.query(Order).filter(Order.id == pl_rec.order_id).first()
    if order_obj:
        recalc_order_item_logistics(db, order_obj)
    db.commit()
    db.refresh(pl_rec)

    return {
        "status": "ok",
        "message": f"Packing List {pl_rec.document_number} updated",
        "packing_list": _serialize_pl_for_order_json(pl_rec),
    }


@router.delete("/logistics/packing-list/{pl_ref}")
def delete_packing_list(pl_ref: str, db: Session = Depends(get_db)):
    pl_rec = None
    if str(pl_ref).isdigit():
        pl_rec = db.query(LogisticsPackingList).filter(LogisticsPackingList.id == int(pl_ref)).first()
    if not pl_rec:
        pl_rec = db.query(LogisticsPackingList).filter(LogisticsPackingList.document_number == str(pl_ref)).first()
    if not pl_rec:
        raise HTTPException(status_code=404, detail=f"Packing List '{pl_ref}' not found")

    if pl_rec.status in ("Dispatched", "Delivered") and pl_rec.delivery_note_id:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete Packing List {pl_rec.document_number} while linked to active Delivery Note {pl_rec.delivery_note_number}. Void the Delivery Note first."
        )

    order_id = pl_rec.order_id
    doc_no = pl_rec.document_number
    db.delete(pl_rec)
    db.flush()

    order_obj = db.query(Order).filter(Order.id == order_id).first()
    if order_obj:
        recalc_order_item_logistics(db, order_obj)
    db.commit()

    return {"status": "ok", "message": f"Packing List {doc_no} deleted"}


@router.post("/logistics/delivery-note")
def create_delivery_note(payload: DeliveryNoteCreateInput, db: Session = Depends(get_db)):
    """
    Creates a Delivery Note from selected Packing Lists (95% standard flow) or direct items (5% quick flow),
    captures full transport & site contact metadata, snapshots outstanding backordered items with ETAs,
    updates linked Packing Lists to 'Dispatched', and recalculates OrderItem delivery quantities.
    """
    ensure_legacy_logistics_migrated(db)
    order_obj = _resolve_order(db, payload.order_id, payload.project_key)
    if not order_obj:
        raise HTTPException(status_code=404, detail=f"Order '{payload.order_id}' not found")

    doc_no = _next_document_number(db, "DN")
    proj = db.query(Project).filter(Project.key == (payload.project_key or order_obj.project_key)).first()

    # Resolve source Packing Lists if provided
    linked_pls: List[LogisticsPackingList] = []
    if payload.source_packing_lists:
        linked_pls = db.query(LogisticsPackingList).filter(
            LogisticsPackingList.order_id == order_obj.id,
            LogisticsPackingList.document_number.in_(payload.source_packing_lists)
        ).all()

    dn_items_to_create: List[Dict[str, Any]] = []
    if linked_pls and not payload.items:
        for pl in linked_pls:
            for pl_it in pl.items:
                if int(pl_it.qty_packed or 0) <= 0:
                    continue
                eta_override = (payload.backorder_etas or {}).get(str(pl_it.order_item_id)) or (payload.backorder_etas or {}).get(pl_it.one_one_code or "")
                dn_items_to_create.append({
                    "packing_list_id": pl.id,
                    "packing_list_number": pl.document_number,
                    "order_item_id": pl_it.order_item_id,
                    "parent_item_id": pl_it.parent_item_id,
                    "parent_fitting_code": pl_it.parent_fitting_code,
                    "one_one_code": pl_it.one_one_code,
                    "plan_code": pl_it.plan_code,
                    "supplier_code": pl_it.supplier_code,
                    "description": pl_it.description,
                    "floor": pl_it.floor,
                    "area": pl_it.area,
                    "material_colour": pl_it.material_colour,
                    "first_fix": pl_it.first_fix,
                    "red_list": pl_it.red_list,
                    "box_number": pl_it.box_number,
                    "qty_ordered": int(pl_it.qty_ordered or 0),
                    "qty_delivered": int(pl_it.qty_packed or 0),
                    "qty_remaining": int(pl_it.qty_backorder or 0),
                    "backorder_eta": eta_override or "",
                    "is_accessory": bool(pl_it.is_accessory),
                })
    elif payload.items:
        for it in payload.items:
            if int(it.qty_delivered or 0) <= 0:
                continue
            eta_override = it.backorder_eta or (payload.backorder_etas or {}).get(str(it.order_item_id)) or ""
            dn_items_to_create.append({
                "packing_list_id": it.packing_list_id,
                "packing_list_number": it.packing_list_number,
                "order_item_id": it.order_item_id,
                "parent_item_id": it.parent_item_id,
                "parent_fitting_code": it.parent_fitting_code,
                "one_one_code": it.one_one_code or it.supplier_code or "",
                "plan_code": it.plan_code or "",
                "supplier_code": it.supplier_code or it.one_one_code or "",
                "description": it.description or "",
                "floor": it.floor or "",
                "area": it.area or "",
                "material_colour": it.material_colour or "",
                "first_fix": it.first_fix or "No",
                "red_list": it.red_list or "No",
                "box_number": it.box_number or "Box 1",
                "qty_ordered": int(it.qty_ordered or 0),
                "qty_delivered": int(it.qty_delivered or 0),
                "qty_remaining": int(it.qty_remaining or 0),
                "backorder_eta": eta_override,
                "is_accessory": bool(it.is_accessory),
            })

    if not dn_items_to_create:
        raise HTTPException(status_code=400, detail="Delivery Note must contain at least one item to dispatch")

    # Calculate delivery_type & outstanding backorder snapshot across the entire Order
    order_keys = [k for k in [order_obj.po_number, str(order_obj.id)] if k]
    all_order_items = db.query(OrderItem).filter(OrderItem.order_id.in_(order_keys)).order_by(OrderItem.sort_order.asc(), OrderItem.id.asc()).all()

    dispatched_in_this_dn_by_item: Dict[int, int] = {}
    for dit in dn_items_to_create:
        oid = dit.get("order_item_id")
        if oid:
            dispatched_in_this_dn_by_item[int(oid)] = dispatched_in_this_dn_by_item.get(int(oid), 0) + int(dit.get("qty_delivered") or 0)

    outstanding_snapshot = []
    has_undelivered = False
    for oi in all_order_items:
        if oi.is_credit:
            continue
        ordered = int(oi.qty or 0)
        prev_deliv = int(oi.delivery_qty or 0)
        this_deliv = dispatched_in_this_dn_by_item.get(oi.id, 0)
        remaining_after = max(0, ordered - (prev_deliv + this_deliv))

        eta_val = (
            (payload.backorder_etas or {}).get(str(oi.id))
            or (payload.backorder_etas or {}).get(oi.one_one_code or "")
            or oi.po_eta
            or oi.eta
            or "TBA"
        )
        if eta_val and eta_val != "TBA":
            oi.eta = eta_val

        if remaining_after > 0:
            has_undelivered = True
            outstanding_snapshot.append({
                "order_item_id": oi.id,
                "code": oi.one_one_code or oi.code or "",
                "one_one_code": oi.one_one_code or oi.code or "",
                "plan_code": oi.type or "",
                "supplier_code": oi.code or "",
                "description": oi.description or "",
                "floor": oi.floor or "",
                "area": oi.area or "",
                "qty_ordered": ordered,
                "qty_delivered_to_date": prev_deliv + this_deliv,
                "qty_remaining": remaining_after,
                "backorder_eta": eta_val,
            })

    computed_delivery_type = "Partial" if has_undelivered else "Full"
    initial_status = "Delivered" if payload.received_by else "Dispatched"

    dn_rec = LogisticsDeliveryNote(
        document_number=doc_no,
        project_id=proj.id if proj else order_obj.project_id,
        project_key=order_obj.project_key,
        order_id=order_obj.id,
        order_po_number=order_obj.po_number,
        status=initial_status,
        delivery_type=computed_delivery_type,
        source_packing_lists=[pl.document_number for pl in linked_pls] if linked_pls else (payload.source_packing_lists or []),
        dispatch_method=payload.dispatch_method or "Internal Driver",
        carrier_driver=payload.carrier_driver or payload.dispatch_method or "Internal Driver",
        vehicle_reg=payload.vehicle_reg or "",
        tracking_number=payload.tracking_number or "",
        delivery_address=payload.delivery_address or "",
        site_contact_name=payload.site_contact_name or "",
        site_contact_phone=payload.site_contact_phone or "",
        site_instructions=payload.site_instructions or "",
        received_by=payload.received_by or "",
        received_at=datetime.now(timezone.utc) if payload.received_by else None,
        pod_received=False,
        outstanding_snapshot=outstanding_snapshot,
        notes=payload.notes or "",
        dispatched_by=payload.dispatched_by or "Logistics Team",
    )
    db.add(dn_rec)
    db.flush()

    for dit in dn_items_to_create:
        oid = dit.get("order_item_id")
        oi_match = next((x for x in all_order_items if oid and x.id == int(oid)), None)
        rem_qty = dit.get("qty_remaining") or 0
        if oi_match:
            rem_qty = max(0, int(oi_match.qty or 0) - (int(oi_match.delivery_qty or 0) + dispatched_in_this_dn_by_item.get(oi_match.id, 0)))

        dn_item = LogisticsDeliveryNoteItem(
            delivery_note_id=dn_rec.id,
            packing_list_id=dit.get("packing_list_id"),
            packing_list_number=dit.get("packing_list_number"),
            order_item_id=oid,
            parent_item_id=dit.get("parent_item_id"),
            parent_fitting_code=dit.get("parent_fitting_code"),
            one_one_code=dit.get("one_one_code") or "",
            plan_code=dit.get("plan_code") or "",
            supplier_code=dit.get("supplier_code") or "",
            description=dit.get("description") or "",
            floor=dit.get("floor") or "",
            area=dit.get("area") or "",
            material_colour=dit.get("material_colour") or "",
            first_fix=dit.get("first_fix") or "No",
            red_list=dit.get("red_list") or "No",
            box_number=dit.get("box_number") or "Box 1",
            qty_ordered=int(dit.get("qty_ordered") or 0),
            qty_delivered=int(dit.get("qty_delivered") or 0),
            qty_remaining=rem_qty,
            backorder_eta=dit.get("backorder_eta") or "",
            is_accessory=bool(dit.get("is_accessory")),
        )
        db.add(dn_item)

    # Mark linked Packing Lists as Dispatched and link to this DN
    for pl in linked_pls:
        pl.status = "Dispatched"
        pl.delivery_note_id = dn_rec.id
        pl.delivery_note_number = dn_rec.document_number

    db.flush()
    recalc_order_item_logistics(db, order_obj)
    db.commit()
    db.refresh(dn_rec)

    return {
        "status": "ok",
        "message": f"Delivery Note {doc_no} generated and Order delivery quantities updated",
        "delivery_note": _serialize_dn_for_order_json(dn_rec),
    }


@router.put("/logistics/delivery-note/{dn_ref}/status")
def update_delivery_note_status(dn_ref: str, payload: DeliveryNoteStatusInput, db: Session = Depends(get_db)):
    dn_rec = None
    if str(dn_ref).isdigit():
        dn_rec = db.query(LogisticsDeliveryNote).filter(LogisticsDeliveryNote.id == int(dn_ref)).first()
    if not dn_rec:
        dn_rec = db.query(LogisticsDeliveryNote).filter(LogisticsDeliveryNote.document_number == str(dn_ref)).first()
    if not dn_rec:
        raise HTTPException(status_code=404, detail=f"Delivery Note '{dn_ref}' not found")

    if payload.status:
        dn_rec.status = payload.status
        if payload.status == "Delivered" and not dn_rec.received_at:
            dn_rec.received_at = datetime.now(timezone.utc)
        # Also sync status on linked Packing Lists if delivered
        if payload.status == "Delivered":
            linked_pls = db.query(LogisticsPackingList).filter(LogisticsPackingList.delivery_note_id == dn_rec.id).all()
            for pl in linked_pls:
                pl.status = "Delivered"

    for field in (
        "dispatch_method",
        "carrier_driver",
        "vehicle_reg",
        "tracking_number",
        "delivery_address",
        "site_contact_name",
        "site_contact_phone",
        "site_instructions",
        "received_by",
        "notes",
    ):
        val = getattr(payload, field, None)
        if val is not None:
            setattr(dn_rec, field, val)

    db.flush()
    order_obj = db.query(Order).filter(Order.id == dn_rec.order_id).first()
    if order_obj:
        recalc_order_item_logistics(db, order_obj)
    db.commit()
    db.refresh(dn_rec)

    return {
        "status": "ok",
        "message": f"Delivery Note {dn_rec.document_number} updated",
        "delivery_note": _serialize_dn_for_order_json(dn_rec),
    }


@router.post("/logistics/delivery-note/{dn_ref}/pod")
def upload_delivery_note_pod(dn_ref: str, payload: DeliveryNotePodInput, db: Session = Depends(get_db)):
    dn_rec = None
    if str(dn_ref).isdigit():
        dn_rec = db.query(LogisticsDeliveryNote).filter(LogisticsDeliveryNote.id == int(dn_ref)).first()
    if not dn_rec:
        dn_rec = db.query(LogisticsDeliveryNote).filter(LogisticsDeliveryNote.document_number == str(dn_ref)).first()
    if not dn_rec:
        raise HTTPException(status_code=404, detail=f"Delivery Note '{dn_ref}' not found")

    dn_rec.pod_received = True
    dn_rec.pod_file_url = payload.pod_file_url
    dn_rec.pod_file_name = payload.pod_file_name or "Signed_POD"
    if payload.received_by:
        dn_rec.received_by = payload.received_by
    if not dn_rec.received_at:
        dn_rec.received_at = datetime.now(timezone.utc)
    if payload.mark_delivered:
        dn_rec.status = "Delivered"
        linked_pls = db.query(LogisticsPackingList).filter(LogisticsPackingList.delivery_note_id == dn_rec.id).all()
        for pl in linked_pls:
            pl.status = "Delivered"

    db.flush()
    order_obj = db.query(Order).filter(Order.id == dn_rec.order_id).first()
    if order_obj:
        recalc_order_item_logistics(db, order_obj)
    db.commit()
    db.refresh(dn_rec)

    return {
        "status": "ok",
        "message": f"Proof of Delivery (POD) attached to {dn_rec.document_number}",
        "delivery_note": _serialize_dn_for_order_json(dn_rec),
    }


@router.post("/logistics/delivery-note/{dn_ref}/void")
def void_delivery_note(dn_ref: str, payload: DeliveryNoteVoidInput, db: Session = Depends(get_db)):
    """
    Voids / Cancels a Delivery Note and reverses all downstream effects:
    1. Marks DN status as 'Cancelled'
    2. Releases all linked Packing Lists back to 'Pending Dispatch' (clears delivery_note_id)
    3. Recalculates OrderItem.delivery_qty, delivery_status, and delivery_history from remaining active DNs
    4. Updates Order.delivery_notes, Order.packing_lists, and SalesTracker metrics immediately.
    """
    dn_rec = None
    if str(dn_ref).isdigit():
        dn_rec = db.query(LogisticsDeliveryNote).filter(LogisticsDeliveryNote.id == int(dn_ref)).first()
    if not dn_rec:
        dn_rec = db.query(LogisticsDeliveryNote).filter(LogisticsDeliveryNote.document_number == str(dn_ref)).first()
    if not dn_rec:
        raise HTTPException(status_code=404, detail=f"Delivery Note '{dn_ref}' not found")

    dn_rec.status = "Cancelled"
    dn_rec.voided_at = datetime.now(timezone.utc)
    dn_rec.voided_by = payload.voided_by or "Logistics Admin"
    dn_rec.void_reason = payload.void_reason or "Voided via Logistics Portal"

    # Release linked Packing Lists back to Pending Dispatch
    linked_pls = db.query(LogisticsPackingList).filter(
        (LogisticsPackingList.delivery_note_id == dn_rec.id) |
        (LogisticsPackingList.delivery_note_number == dn_rec.document_number)
    ).all()
    if not linked_pls and dn_rec.source_packing_lists:
        linked_pls = db.query(LogisticsPackingList).filter(
            LogisticsPackingList.order_id == dn_rec.order_id,
            LogisticsPackingList.document_number.in_(dn_rec.source_packing_lists)
        ).all()

    released_pl_numbers = []
    for pl in linked_pls:
        pl.status = "Pending Dispatch"
        pl.delivery_note_id = None
        pl.delivery_note_number = None
        released_pl_numbers.append(pl.document_number)

    db.flush()
    order_obj = db.query(Order).filter(Order.id == dn_rec.order_id).first()
    if order_obj:
        recalc_order_item_logistics(db, order_obj)
    db.commit()
    db.refresh(dn_rec)

    return {
        "status": "ok",
        "message": f"Delivery Note {dn_rec.document_number} voided. Released Packing Lists: {', '.join(released_pl_numbers) or 'None'}. Order & Sales Tracker metrics recalculated.",
        "released_packing_lists": released_pl_numbers,
        "delivery_note": _serialize_dn_for_order_json(dn_rec),
    }


@public_router.get("/logistics/label-templates")
@router.get("/logistics/label-templates")
def get_label_templates(db: Session = Depends(get_db)):
    rows = db.query(LogisticsLabelTemplate).order_by(LogisticsLabelTemplate.id.asc()).all()
    if rows:
        return {
            "templates": [
                {
                    "id": r.template_id,
                    "name": r.name,
                    "type": r.type,
                    "widthMm": r.width_mm,
                    "heightMm": r.height_mm,
                    "gapMm": r.gap_mm,
                    "dpi": r.dpi,
                    "isDefault": r.is_default,
                    "elements": r.elements_json or [],
                }
                for r in rows
            ]
        }

    # Check legacy PortalSetting fallback
    setting = db.query(PortalSetting).filter(PortalSetting.key == "label_templates").first()
    if setting and isinstance(setting.value, list) and len(setting.value) > 0:
        return {"templates": setting.value}

    return {"templates": None}


@router.post("/logistics/label-templates")
def save_label_templates(payload: LabelTemplatesSaveInput, db: Session = Depends(get_db)):
    db.query(LogisticsLabelTemplate).delete()
    db.flush()

    for tpl in payload.templates:
        rec = LogisticsLabelTemplate(
            template_id=str(tpl.get("id") or f"tpl_{int(datetime.now().timestamp())}"),
            name=str(tpl.get("name") or "Custom Label"),
            type=str(tpl.get("type") or "item"),
            width_mm=float(tpl.get("widthMm") or 50.0),
            height_mm=float(tpl.get("heightMm") or 30.0),
            gap_mm=float(tpl.get("gapMm") or 3.0),
            dpi=int(tpl.get("dpi") or 203),
            is_default=bool(tpl.get("isDefault", False)),
            elements_json=tpl.get("elements") or [],
            updated_by=payload.updated_by or "Admin",
        )
        db.add(rec)

    # Also keep PortalSetting('label_templates') in sync for backward compatibility
    setting = db.query(PortalSetting).filter(PortalSetting.key == "label_templates").first()
    if setting:
        setting.value = payload.templates
        flag_modified(setting, "value")
    else:
        db.add(PortalSetting(key="label_templates", value=payload.templates))

    db.commit()
    return {"status": "ok", "count": len(payload.templates)}
