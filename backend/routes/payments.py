import logging
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_, and_

from database.cloud_sql import get_db
from models.orm_models import (
    PalladiumPayment,
    OrderPaymentAllocation,
    Project,
    Order
)
from services.palladium_sync import sync_palladium_payments

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Payments"])
public_router = APIRouter(prefix="/payments", tags=["Payments Public"])


def recalc_order_payments(db: Session, order_id_str: str):
    """
    Recalculates an Order's paid amount and outstanding balance from both
    active Palladium OrderPaymentAllocations and manual payments.
    """
    try:
        # Find order by po_number or id
        order = db.query(Order).filter(
            or_(Order.po_number == str(order_id_str), Order.id == int(order_id_str) if str(order_id_str).isdigit() else False)
        ).first()
        if not order:
            return

        # 1. Fetch active allocations for this order
        allocs = db.query(OrderPaymentAllocation).filter(
            OrderPaymentAllocation.order_id.in_([order.po_number, str(order.id)]),
            OrderPaymentAllocation.status == "Active"
        ).all()

        allocated_total = sum(float(a.allocated_amount or 0.0) for a in allocs)

        # 2. Parse manual payments from order.payments (filter out any previously injected PALLADIUM items to avoid double-counting)
        manual_payments = []
        try:
            raw_payments = json.loads(order.payments) if isinstance(order.payments, str) and order.payments.strip() else (order.payments or [])
            if isinstance(raw_payments, list):
                for p in raw_payments:
                    if isinstance(p, dict) and p.get("source") != "PALLADIUM" and not p.get("is_palladium"):
                        manual_payments.append(p)
        except Exception:
            manual_payments = []

        manual_total = sum(float(p.get("amount", 0) or 0.0) for p in manual_payments)
        combined_paid = round(allocated_total + manual_total, 2)

        # 3. Calculate outstanding
        order_val = float(order.value or 0.0)
        outstanding = max(0.0, round(order_val - combined_paid, 2))

        # 4. Build consolidated payments array for order
        consolidated_payments = list(manual_payments)
        for a in allocs:
            consolidated_payments.append({
                "id": f"pal-alloc-{a.id}",
                "allocation_id": a.id,
                "palladium_payment_id": a.palladium_payment_id,
                "receipt_no": a.receipt_no,
                "amount": float(a.allocated_amount or 0.0),
                "type": a.payment_type or "Deposit Payment",
                "date": a.allocated_at.strftime("%Y-%m-%d") if a.allocated_at else datetime.now().strftime("%Y-%m-%d"),
                "notes": a.notes or f"Allocated from Palladium Receipt {a.receipt_no}",
                "source": "PALLADIUM",
                "is_palladium": True,
                "allocated_by": a.allocated_by
            })

        order.paid = combined_paid
        order.outstanding = outstanding
        order.payments = json.dumps(consolidated_payments)
        db.commit()
    except Exception as e:
        logger.error(f"Error recalculating order payments for order {order_id_str}: {e}")
        db.rollback()


@public_router.post("/sync")
@router.post("/sync")
def trigger_payments_sync(db: Session = Depends(get_db)):
    """
    Manually triggers a 100% read-only synchronization of Customer Payments & Receipts from Palladium ERP.
    """
    try:
        res = sync_palladium_payments(db)
        return res
    except Exception as e:
        logger.error(f"Payments manual sync failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.get("/summary")
@router.get("/summary")
def get_payments_summary(db: Session = Depends(get_db)):
    """
    Returns aggregated KPI statistics for Palladium Payments and Allocations.
    """
    try:
        all_payments = db.query(PalladiumPayment).filter(PalladiumPayment.is_reversed == False).all()
        if not all_payments:
            return {
                "total_payments_count": 0,
                "total_amount_synced": 0.0,
                "total_amount_allocated": 0.0,
                "total_amount_unallocated": 0.0,
                "unallocated_payments_count": 0,
                "allocated_payments_count": 0,
                "last_synced_at": None
            }

        # Active allocations
        active_allocs = db.query(OrderPaymentAllocation).filter(
            OrderPaymentAllocation.status == "Active"
        ).all()

        alloc_by_pay_id = {}
        for a in active_allocs:
            alloc_by_pay_id[a.palladium_payment_id] = alloc_by_pay_id.get(a.palladium_payment_id, 0.0) + float(a.allocated_amount or 0.0)

        total_amount_synced = 0.0
        total_amount_allocated = 0.0
        unallocated_cnt = 0
        partially_allocated_cnt = 0
        fully_allocated_cnt = 0
        latest_sync = None

        for p in all_payments:
            amt = float(p.amount or 0.0)
            total_amount_synced += amt
            alc = alloc_by_pay_id.get(p.palladium_payment_id, 0.0)
            total_amount_allocated += min(amt, alc)

            if alc >= amt - 0.01:
                fully_allocated_cnt += 1
            elif alc > 0.01:
                partially_allocated_cnt += 1
            else:
                unallocated_cnt += 1

            if not latest_sync or (p.last_synced_at and p.last_synced_at > latest_sync):
                latest_sync = p.last_synced_at

        return {
            "total_documents": len(all_payments),
            "total_payments_count": len(all_payments),
            "unallocated_count": unallocated_cnt,
            "partially_allocated_count": partially_allocated_cnt,
            "fully_allocated_count": fully_allocated_cnt,
            "total_amount_synced": round(total_amount_synced, 2),
            "total_amount_allocated": round(total_amount_allocated, 2),
            "total_amount_unallocated": round(max(0.0, total_amount_synced - total_amount_allocated), 2),
            "last_synced_at": latest_sync.isoformat() if latest_sync else None
        }
    except Exception as e:
        logger.error(f"Error fetching payments summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.get("/candidate-orders")
@router.get("/candidate-orders")
def get_candidate_orders_for_payment(
    customer_name: Optional[str] = Query(None),
    customer_code: Optional[str] = Query(None),
    reference: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Finds active orders that match the customer name, code, or reference keywords.
    """
    try:
        projects = db.query(Project).all()
        orders = db.query(Order).all()
        
        proj_map = {p.id: p for p in projects}
        proj_by_key = {p.project_key: p for p in projects if p.project_key}

        c_name = (customer_name or "").strip().lower()
        c_code = (customer_code or "").strip().lower()
        ref = (reference or "").strip().lower()
        ref_words = [w for w in ref.replace('-', ' ').replace('/', ' ').split() if len(w) > 2]

        candidates = []
        for o in orders:
            proj = proj_map.get(o.project_id) or (proj_by_key.get(o.project_key) if o.project_key else None)
            proj_name = proj.name if proj else (o.project_full_name or "")
            client_str = f"{o.client_company or ''} {o.client_name or ''} {o.client_contact or ''} {proj.client if proj else ''}".lower()
            order_name = f"{o.quote_name or ''} {o.po_number or ''} {proj_name}".lower()

            match_score = 0
            if c_code and c_code in client_str:
                match_score += 10
            if c_name and (c_name in client_str or any(word in client_str for word in c_name.split() if len(word) > 3)):
                match_score += 8

            for w in ref_words:
                if w in order_name or w in client_str:
                    match_score += 5

            if match_score > 0 or not (c_name or c_code or ref):
                candidates.append({
                    "project_id": proj.id if proj else o.project_id,
                    "project_key": o.project_key or (proj.project_key if proj else None),
                    "project_name": proj_name or "Project",
                    "order_id": o.po_number or str(o.id),
                    "quote_name": o.quote_name or "Spec Order",
                    "client": o.client_company or o.client or o.client_name or (proj.client if proj else "Client"),
                    "total_value": float(o.value or 0.0),
                    "paid_amount": float(o.paid or 0.0),
                    "outstanding": float(o.outstanding or 0.0),
                    "match_score": match_score
                })

        candidates.sort(key=lambda x: (x["match_score"], x["outstanding"]), reverse=True)
        return {"candidates": candidates}
    except Exception as e:
        logger.error(f"Error fetching candidate orders: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.get("/list")
@public_router.get("")
@router.get("")
def get_payments_list(
    status: Optional[str] = Query("all", description="all | unallocated | allocated"),
    search: Optional[str] = Query(None, description="Search receipt, customer, reference"),
    db: Session = Depends(get_db)
):
    """
    Returns list of Palladium payments with live allocation breakdown.
    """
    try:
        query = db.query(PalladiumPayment).filter(PalladiumPayment.is_reversed == False)

        if search and search.strip():
            s = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    PalladiumPayment.receipt_no.ilike(s),
                    PalladiumPayment.customer_name.ilike(s),
                    PalladiumPayment.customer_code.ilike(s),
                    PalladiumPayment.reference.ilike(s)
                )
            )

        payments = query.order_by(desc(PalladiumPayment.payment_date), desc(PalladiumPayment.id)).all()

        # Load all active allocations
        active_allocs = db.query(OrderPaymentAllocation).filter(
            OrderPaymentAllocation.status == "Active"
        ).all()

        # Group allocations by payment ID
        alloc_map: Dict[int, List[OrderPaymentAllocation]] = {}
        for a in active_allocs:
            alloc_map.setdefault(a.palladium_payment_id, []).append(a)

        # Load project & order lookup for enriched display
        orders = db.query(Order).all()
        order_info_map = {str(o.po_number): o for o in orders}
        for o in orders:
            order_info_map[str(o.id)] = o

        projects = db.query(Project).all()
        project_map = {str(p.project_key): p.name for p in projects if p.project_key}

        results = []
        for p in payments:
            amt = float(p.amount or 0.0)
            pay_allocs = alloc_map.get(p.palladium_payment_id, [])
            allocated_amt = sum(float(a.allocated_amount or 0.0) for a in pay_allocs)
            remaining_amt = max(0.0, round(amt - allocated_amt, 2))

            is_fully_allocated = remaining_amt <= 0.01
            is_partially_allocated = allocated_amt > 0.01 and not is_fully_allocated

            alloc_status = "Fully Allocated" if is_fully_allocated else ("Partially Allocated" if is_partially_allocated else "Unallocated")

            # Filter by status if requested
            if status == "unallocated" and is_fully_allocated:
                continue
            elif status == "allocated" and allocated_amt <= 0.01:
                continue

            # Format allocations list
            alloc_details = []
            for a in pay_allocs:
                ord_ref = order_info_map.get(str(a.order_id))
                proj_name = project_map.get(str(a.project_key or (ord_ref.project_key if ord_ref else ""))) or (ord_ref.project_full_name if ord_ref else a.project_key)
                alloc_details.append({
                    "id": a.id,
                    "order_id": a.order_id,
                    "quote_name": ord_ref.quote_name if ord_ref else "Spec Order",
                    "project_key": a.project_key,
                    "project_name": proj_name,
                    "allocated_amount": float(a.allocated_amount or 0.0),
                    "payment_type": a.payment_type,
                    "allocated_by": a.allocated_by,
                    "allocated_at": a.allocated_at.isoformat() if a.allocated_at else None,
                    "notes": a.notes
                })

            results.append({
                "id": p.id,
                "palladium_payment_id": p.palladium_payment_id,
                "receipt_no": p.receipt_no,
                "payment_date": p.payment_date.strftime("%Y-%m-%d") if p.payment_date else None,
                "customer_code": p.customer_code,
                "customer_name": p.customer_name or "Unknown Client",
                "amount": amt,
                "allocated_amount": round(allocated_amt, 2),
                "remaining_amount": remaining_amt,
                "status": alloc_status,
                "reference": p.reference,
                "payment_method": p.payment_method or "EFT",
                "bank_account": p.bank_account,
                "captured_by": p.captured_by,
                "currency_code": p.currency_code or "ZAR",
                "allocations": alloc_details,
                "last_synced_at": p.last_synced_at.isoformat() if p.last_synced_at else None
            })

        return results
    except Exception as e:
        logger.error(f"Error listing payments: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.get("/projects-orders")
@router.get("/projects-orders")
def get_projects_orders_for_allocation(db: Session = Depends(get_db)):
    """
    Returns list of Projects and their Orders to populate the allocation dropdown.
    """
    try:
        projects = db.query(Project).order_by(desc(Project.created_at)).all()
        orders = db.query(Order).all()

        orders_by_proj_id = {}
        orders_by_proj_key = {}
        for o in orders:
            if o.project_id:
                orders_by_proj_id.setdefault(o.project_id, []).append(o)
            if o.project_key:
                orders_by_proj_key.setdefault(o.project_key, []).append(o)

        out = []
        for p in projects:
            p_orders = orders_by_proj_id.get(p.id) or orders_by_proj_key.get(p.project_key) or []
            if not p_orders:
                continue

            order_list = []
            for o in p_orders:
                order_list.append({
                    "id": o.po_number or str(o.id),
                    "db_id": o.id,
                    "po_number": o.po_number,
                    "quote_name": o.quote_name or "General Order",
                    "client": o.client_company or o.client or o.client_name or p.name,
                    "value": float(o.value or 0.0),
                    "paid": float(o.paid or 0.0),
                    "outstanding": float(o.outstanding or 0.0),
                    "status": o.status or "Active"
                })

            out.append({
                "project_id": p.id,
                "project_key": p.project_key,
                "project_name": p.name,
                "client": p.client,
                "orders": order_list
            })

        return out
    except Exception as e:
        logger.error(f"Error fetching projects/orders for allocation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.post("/allocate")
@router.post("/allocate")
def allocate_payment(data: dict = Body(...), db: Session = Depends(get_db)):
    """
    Allocates a Palladium Customer Payment receipt (full or partial) to a Project Order.
    Recalculates the Order's total paid and outstanding balance in real time.
    """
    try:
        palladium_payment_id = data.get("palladium_payment_id")
        order_id = str(data.get("order_id") or "").strip()
        allocated_amount = float(data.get("allocated_amount") or 0.0)
        payment_type = str(data.get("payment_type") or "Deposit Payment").strip()
        notes = str(data.get("notes") or "").strip()
        user_name = str(data.get("user_name") or "User").strip()

        if not palladium_payment_id:
            raise HTTPException(status_code=400, detail="Missing required palladium_payment_id.")
        if not order_id:
            raise HTTPException(status_code=400, detail="Missing required order_id.")
        if allocated_amount <= 0:
            raise HTTPException(status_code=400, detail="Allocated amount must be greater than R 0.00.")

        # 1. Fetch Payment
        payment = db.query(PalladiumPayment).filter(
            PalladiumPayment.palladium_payment_id == palladium_payment_id
        ).first()
        if not payment:
            raise HTTPException(status_code=404, detail="Palladium Payment record not found.")

        # 2. Check remaining unallocated amount on this receipt
        existing_allocs = db.query(OrderPaymentAllocation).filter(
            OrderPaymentAllocation.palladium_payment_id == palladium_payment_id,
            OrderPaymentAllocation.status == "Active"
        ).all()
        already_allocated = sum(float(a.allocated_amount or 0.0) for a in existing_allocs)
        available_amt = max(0.0, float(payment.amount or 0.0) - already_allocated)

        if allocated_amount > available_amt + 0.05:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot allocate R {allocated_amount:,.2f}. Only R {available_amt:,.2f} remains available on receipt {payment.receipt_no}."
            )

        # 3. Resolve Order & Project
        order = db.query(Order).filter(
            or_(Order.po_number == order_id, Order.id == int(order_id) if order_id.isdigit() else False)
        ).first()
        if not order:
            raise HTTPException(status_code=404, detail=f"Order '{order_id}' not found in database.")

        project_key = order.project_key or (db.query(Project).filter(Project.id == order.project_id).first().project_key if order.project_id else None)

        # 4. Create Allocation
        alloc_obj = OrderPaymentAllocation(
            palladium_payment_id=payment.palladium_payment_id,
            receipt_no=payment.receipt_no,
            order_id=order.po_number or str(order.id),
            project_key=project_key,
            allocated_amount=allocated_amount,
            payment_type=payment_type,
            allocated_by=user_name,
            allocated_at=payment.payment_date or datetime.now(timezone.utc),
            status="Active",
            notes=notes or f"Receipt {payment.receipt_no} allocated to {order.quote_name or order.po_number}"
        )
        db.add(alloc_obj)
        db.commit()
        db.refresh(alloc_obj)

        # 5. Recalculate Order balances
        recalc_order_payments(db, order.po_number or str(order.id))

        return {
            "status": "success",
            "message": f"Successfully allocated R {allocated_amount:,.2f} from {payment.receipt_no} to {order.quote_name or order.po_number}.",
            "allocation_id": alloc_obj.id,
            "order_id": order.po_number,
            "allocated_amount": allocated_amount
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error allocating payment: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.delete("/allocations/{allocation_id}")
@router.delete("/allocations/{allocation_id}")
def delete_payment_allocation(allocation_id: int, db: Session = Depends(get_db)):
    """
    Unallocates / deletes an active payment allocation and recalculates order balances.
    """
    try:
        alloc = db.query(OrderPaymentAllocation).filter(OrderPaymentAllocation.id == allocation_id).first()
        if not alloc:
            raise HTTPException(status_code=404, detail="Allocation not found.")

        order_id_ref = alloc.order_id
        db.delete(alloc)
        db.commit()

        # Recalculate order balances
        recalc_order_payments(db, order_id_ref)

        return {
            "status": "success",
            "message": f"Successfully removed payment allocation #{allocation_id}."
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting allocation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.get("/allocations")
@router.get("/allocations")
def get_all_allocations(db: Session = Depends(get_db)):
    """
    Returns audit trail of all active payment allocations.
    """
    try:
        allocs = db.query(OrderPaymentAllocation).filter(
            OrderPaymentAllocation.status == "Active"
        ).order_by(desc(OrderPaymentAllocation.allocated_at), desc(OrderPaymentAllocation.id)).all()

        orders = db.query(Order).all()
        order_info_map = {str(o.po_number): o for o in orders}
        for o in orders:
            order_info_map[str(o.id)] = o

        projects = db.query(Project).all()
        project_map = {str(p.project_key): p.name for p in projects if p.project_key}

        results = []
        for a in allocs:
            ord_ref = order_info_map.get(str(a.order_id))
            proj_name = project_map.get(str(a.project_key or (ord_ref.project_key if ord_ref else ""))) or (ord_ref.project_full_name if ord_ref else a.project_key)
            results.append({
                "id": a.id,
                "palladium_payment_id": a.palladium_payment_id,
                "receipt_no": a.receipt_no,
                "order_id": a.order_id,
                "quote_name": ord_ref.quote_name if ord_ref else "Spec Order",
                "client": ord_ref.client_company or ord_ref.client or ord_ref.client_name if ord_ref else "Client",
                "project_key": a.project_key,
                "project_name": proj_name,
                "allocated_amount": float(a.allocated_amount or 0.0),
                "payment_type": a.payment_type,
                "allocated_by": a.allocated_by,
                "allocated_at": a.allocated_at.isoformat() if a.allocated_at else None,
                "notes": a.notes
            })

        return results
    except Exception as e:
        logger.error(f"Error fetching allocations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
