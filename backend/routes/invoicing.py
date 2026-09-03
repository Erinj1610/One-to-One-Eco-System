import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_, and_

from database.cloud_sql import get_db
from models.orm_models import (
    PalladiumInvoiceLine,
    ProcurementAllocation,
    AllocationIssue,
    Project,
    Order,
    OrderItem
)
from services.palladium_sync import sync_palladium_sales_invoices
import re

def normalize_sku(s: Optional[str]) -> str:
    if not s:
        return ""
    return re.sub(r'[^A-Za-z0-9]', '', str(s)).upper()

def find_best_item_match(cand_items: List[OrderItem], target_sku: str) -> Optional[OrderItem]:
    if not target_sku or not cand_items:
        return None
    clean_sku = str(target_sku).strip().upper()
    norm_sku = normalize_sku(target_sku)
    
    # Tier 1: Exact code or one_one_code match
    for it in cand_items:
        if (it.code and it.code.strip().upper() == clean_sku) or \
           (it.one_one_code and it.one_one_code.strip().upper() == clean_sku):
            return it

    # Tier 2: Normalized alphanumeric match (ignores dots, dashes, slashes, spaces)
    if norm_sku:
        for it in cand_items:
            if (it.code and normalize_sku(it.code) == norm_sku) or \
               (it.one_one_code and normalize_sku(it.one_one_code) == norm_sku):
                return it

    # Tier 3: Substring / description match
    for it in cand_items:
        if it.description and clean_sku in it.description.upper():
            return it
        if it.description and norm_sku and norm_sku in normalize_sku(it.description):
            return it

    return None

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/invoicing", tags=["Invoicing"])
public_router = APIRouter(prefix="/invoicing", tags=["Invoicing Public"])


@public_router.post("/sync")
@router.post("/sync")
def trigger_invoicing_sync(db: Session = Depends(get_db)):
    """
    Manually triggers a 100% read-only synchronization of Sales Invoices and Credit Notes from Palladium ERP.
    """
    try:
        res = sync_palladium_sales_invoices(db)
        return res
    except Exception as e:
        logger.error(f"Invoicing manual sync failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.get("/summary")
@router.get("/summary")
def get_invoicing_summary(db: Session = Depends(get_db)):
    """
    Returns aggregated KPI statistics for Palladium Invoices.
    """
    try:
        all_lines = db.query(PalladiumInvoiceLine).all()
        if not all_lines:
            return {
                "total_documents": 0,
                "total_lines": 0,
                "unallocated_count": 0,
                "partially_allocated_count": 0,
                "fully_allocated_count": 0,
                "total_invoiced_value": 0.0,
                "last_synced_at": None
            }

        # Active allocations for Invoices
        active_allocs = db.query(ProcurementAllocation).filter(
            ProcurementAllocation.allocation_type == "INVOICE",
            ProcurementAllocation.status == "Active"
        ).all()

        alloc_map = {}
        for a in active_allocs:
            k = (a.source_doc_no, a.sku)
            alloc_map[k] = alloc_map.get(k, 0.0) + float(a.allocated_qty or 0.0)

        # Aggregate documents
        doc_stats = {}
        total_invoiced_value = 0.0
        latest_sync = None

        for line in all_lines:
            doc_no = line.document_no
            if doc_no not in doc_stats:
                doc_stats[doc_no] = {
                    "total_qty": 0.0,
                    "allocated_qty": 0.0,
                    "total_value": 0.0
                }
            
            line_qty = abs(float(line.qty or 0.0))
            line_val = float(line.line_total_excl or 0.0)
            allocated = min(line_qty, alloc_map.get((doc_no, line.item_code), 0.0))
            
            doc_stats[doc_no]["total_qty"] += line_qty
            doc_stats[doc_no]["allocated_qty"] += allocated
            doc_stats[doc_no]["total_value"] += line_val
            total_invoiced_value += line_val

            if not latest_sync or (line.last_synced_at and line.last_synced_at > latest_sync):
                latest_sync = line.last_synced_at

        unallocated_cnt = 0
        partially_allocated_cnt = 0
        fully_allocated_cnt = 0

        for d, s in doc_stats.items():
            tot = s["total_qty"]
            alc = s["allocated_qty"]
            if tot <= 0 or alc >= tot:
                fully_allocated_cnt += 1
            elif alc > 0:
                partially_allocated_cnt += 1
            else:
                unallocated_cnt += 1

        issues_count = db.query(AllocationIssue).filter(
            AllocationIssue.module == "INVOICE",
            AllocationIssue.status == "Open"
        ).count()

        return {
            "total_documents": len(doc_stats),
            "total_lines": len(all_lines),
            "unallocated_count": unallocated_cnt,
            "partially_allocated_count": partially_allocated_cnt,
            "fully_allocated_count": fully_allocated_cnt,
            "issues_count": issues_count,
            "total_invoiced_value": round(total_invoiced_value, 2),
            "last_synced_at": latest_sync.isoformat() if latest_sync else None
        }
    except Exception as e:
        logger.error(f"Error fetching invoicing summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.get("/documents")
@router.get("/documents")
def list_invoicing_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=5, le=100),
    tab: str = Query("all"), # "all", "needs_allocation", "partially_allocated", "fully_allocated", "issues"
    customer_filter: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns paginated list of distinct Invoice documents aggregated from PalladiumInvoiceLine.
    """
    try:
        # Load all invoice lines
        q = db.query(PalladiumInvoiceLine)
        if isinstance(search, str) and search.strip():
            s_term = f"%{search.strip()}%"
            q = q.filter(
                or_(
                    PalladiumInvoiceLine.document_no.ilike(s_term),
                    PalladiumInvoiceLine.customer_name.ilike(s_term),
                    PalladiumInvoiceLine.reference.ilike(s_term),
                    PalladiumInvoiceLine.item_code.ilike(s_term),
                    PalladiumInvoiceLine.item_description.ilike(s_term)
                )
            )
        if isinstance(customer_filter, str) and customer_filter and customer_filter != "All":
            q = q.filter(PalladiumInvoiceLine.customer_name == customer_filter)

        all_lines = q.all()

        if not all_lines:
            return {
                "total_documents": 0,
                "page": page,
                "page_size": page_size,
                "total_pages": 0,
                "documents": []
            }

        # Active allocations mapping
        active_allocs = db.query(ProcurementAllocation).filter(
            ProcurementAllocation.allocation_type == "INVOICE",
            ProcurementAllocation.status == "Active"
        ).all()

        alloc_map = {}
        for a in active_allocs:
            k = (a.source_doc_no, a.sku)
            alloc_map[k] = alloc_map.get(k, 0.0) + float(a.allocated_qty or 0.0)

        # Load open issues
        open_issues = db.query(AllocationIssue).filter(
            AllocationIssue.module == "INVOICE",
            AllocationIssue.status == "Open"
        ).all()
        issue_map = {iss.document_no: iss for iss in open_issues}

        # Group by document_no preserving latest transaction date order
        docs_grouped = {}
        for line in all_lines:
            d_no = line.document_no
            if d_no not in docs_grouped:
                docs_grouped[d_no] = {
                    "document_no": d_no,
                    "doc_type": "INVOICE" if not d_no.startswith("CN-") else "CREDIT_NOTE",
                    "customer_code": line.customer_code,
                    "customer_name": line.customer_name or "General Client",
                    "reference": line.reference,
                    "transaction_date": line.transaction_date.isoformat() if line.transaction_date else None,
                    "currency_code": line.currency_code or "ZAR",
                    "exchange_rate": float(getattr(line, 'exchange_rate', 1.0) or 1.0),
                    "is_foreign_currency": bool(getattr(line, 'is_foreign_currency', False) or (line.currency_code and line.currency_code != 'ZAR')),
                    "foreign_document_subtotal": float(getattr(line, 'foreign_document_subtotal', 0.0) or 0.0),
                    "sales_rep": line.sales_rep,
                    "document_subtotal": float(line.document_subtotal or 0.0),
                    "document_discount": float(line.document_discount or 0.0),
                    "document_total": float(line.document_total or 0.0),
                    "lines_count": 0,
                    "total_qty": 0.0,
                    "allocated_qty": 0.0,
                    "raw_lines_total_excl": 0.0,
                    "total_value_excl": 0.0,
                    "lines_sample": []
                }
            
            line_qty = abs(float(line.qty or 0.0))
            allocated = min(line_qty, alloc_map.get((d_no, line.item_code), 0.0))

            docs_grouped[d_no]["lines_count"] += 1
            docs_grouped[d_no]["total_qty"] += line_qty
            docs_grouped[d_no]["allocated_qty"] += allocated
            docs_grouped[d_no]["raw_lines_total_excl"] += float(line.line_total_excl or 0.0)
            
            if len(docs_grouped[d_no]["lines_sample"]) < 4:
                docs_grouped[d_no]["lines_sample"].append({
                    "sku": line.item_code,
                    "description": line.item_description,
                    "qty": line_qty,
                    "unit_price_excl": float(line.unit_price_excl or 0.0),
                    "line_disc_perc": float(line.line_disc_perc or 0.0)
                })

        doc_list = list(docs_grouped.values())

        # Compute status and filter by tab
        filtered_docs = []
        for d in doc_list:
            tot = d["total_qty"]
            alc = d["allocated_qty"]
            if tot <= 0 or alc >= tot:
                status = "Fully Allocated"
            elif alc > 0:
                status = "Partially Allocated"
            else:
                status = "Needs Allocation"
            
            d["allocation_status"] = status
            d["unallocated_qty"] = max(0.0, tot - alc)
            if d.get("document_subtotal") and d["document_subtotal"] != 0:
                d["total_value_excl"] = round(d["document_subtotal"], 2)
            else:
                d["total_value_excl"] = round(d["raw_lines_total_excl"], 2)

            iss_d = issue_map.get(d["document_no"])
            is_d_issue = bool(iss_d)
            d["is_flagged_issue"] = is_d_issue
            d["issue_reason"] = iss_d.reason if iss_d else None
            d["issue_notes"] = iss_d.notes if iss_d else None
            d["issue_flagged_by"] = iss_d.flagged_by if iss_d else None
            d["issue_flagged_at"] = iss_d.flagged_at.isoformat() if iss_d and iss_d.flagged_at else None

            if tab in ["issues", "not_found"] and not is_d_issue:
                continue
            if tab == "needs_allocation" and (status != "Needs Allocation" or is_d_issue):
                continue
            if tab == "partially_allocated" and status != "Partially Allocated":
                continue
            if tab == "fully_allocated" and status != "Fully Allocated":
                continue

            filtered_docs.append(d)

        # Sort descending by transaction date
        filtered_docs.sort(key=lambda x: x.get("transaction_date") or "", reverse=True)

        total_count = len(filtered_docs)
        import math
        limit = page_size
        total_pages = max(1, math.ceil(total_count / limit))
        start_idx = (page - 1) * limit
        paginated_docs = filtered_docs[start_idx:start_idx + limit]

        return {
            "status": "success",
            "page": page,
            "limit": limit,
            "total_documents": total_count,
            "total_pages": total_pages,
            "documents": paginated_docs
        }
    except Exception as e:
        logger.error(f"Error listing invoicing documents: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.get("/document/{document_no}")
@router.get("/document/{document_no}")
@public_router.get("/documents/{document_no}")
@router.get("/documents/{document_no}")
def get_invoicing_document_details(
    document_no: str,
    db: Session = Depends(get_db)
):
    """
    Fetches full line item breakdown for a single invoice or credit note,
    including allocation status per line item and live discount calculations.
    """
    try:
        lines = db.query(PalladiumInvoiceLine).filter(PalladiumInvoiceLine.document_no == document_no).all()
        if not lines:
            raise HTTPException(status_code=404, detail=f"Document {document_no} not found.")

        first_line = lines[0]
        allocs = db.query(ProcurementAllocation).filter(
            ProcurementAllocation.source_doc_no == document_no,
            ProcurementAllocation.status == "Active"
        ).all()

        alloc_by_sku = {}
        for a in allocs:
            alloc_by_sku.setdefault(a.sku, []).append({
                "allocation_id": a.id,
                "project_id": a.project_id,
                "project_name": a.project_name,
                "order_id": a.order_id,
                "order_item_id": a.order_item_id,
                "fitting_code": a.fitting_code,
                "allocated_qty": a.allocated_qty,
                "unit_cost": a.unit_cost,
                "allocated_by": a.allocated_by_name,
                "allocated_at": a.allocated_at.isoformat() if a.allocated_at else None,
                "notes": a.notes
            })

        parsed_lines = []
        doc_total_qty = 0.0
        doc_total_allocated = 0.0
        doc_total_val = 0.0

        doc_subtotal = float(first_line.document_subtotal or 0.0)
        doc_discount = float(first_line.document_discount or 0.0)
        raw_lines_sum = sum(float(l.line_total_excl or 0.0) for l in lines)
        global_doc_disc_ratio = (abs(doc_subtotal) / abs(raw_lines_sum)) if (doc_subtotal != 0 and raw_lines_sum != 0) else 1.0

        for line in lines:
            line_qty = abs(float(line.qty or 0.0))
            line_sku = line.item_code
            sku_allocs = alloc_by_sku.get(line_sku, [])
            total_alloc_qty = sum(float(a["allocated_qty"] or 0) for a in sku_allocs)
            unalloc_qty = max(0.0, line_qty - total_alloc_qty)

            if line_qty <= 0 or total_alloc_qty >= line_qty:
                l_status = "Fully Allocated"
            elif total_alloc_qty > 0:
                l_status = "Partially Allocated"
            else:
                l_status = "Unallocated"

            l_disc_p = float(line.line_disc_perc or 0.0)
            l_disc_a = float(line.line_disc_amount or 0.0)
            base_unit_price = float(line.unit_price_excl or 0.0)
            effective_unit_price = round(base_unit_price * global_doc_disc_ratio, 2)
            effective_line_total = round(float(line.line_total_excl or 0.0) * global_doc_disc_ratio, 2)

            doc_total_qty += line_qty
            doc_total_allocated += min(line_qty, total_alloc_qty)
            doc_total_val += float(line.line_total_excl or 0.0)

            parsed_lines.append({
                "line_id": line.id,
                "item_code": line.item_code,
                "item_description": line.item_description,
                "item_unit": line.item_unit or "EA",
                "invoiced_qty": line_qty,
                "unit_price_excl": base_unit_price,
                "effective_unit_price_excl": effective_unit_price,
                "unit_price_incl": float(line.unit_price_incl or 0.0),
                "line_total_excl": float(line.line_total_excl or 0.0),
                "effective_line_total_excl": effective_line_total,
                "line_total_incl": float(line.line_total_incl or 0.0),
                "line_disc_perc": l_disc_p,
                "line_disc_amount": l_disc_a,
                "allocated_qty": total_alloc_qty,
                "unallocated_qty": unalloc_qty,
                "status": l_status,
                "allocations": sku_allocs
            })

        final_doc_val = round(doc_subtotal, 2) if doc_subtotal != 0 else round(doc_total_val, 2)

        return {
            "document_no": document_no,
            "doc_type": "INVOICE" if not document_no.startswith("CN-") else "CREDIT_NOTE",
            "customer_code": first_line.customer_code,
            "customer_name": first_line.customer_name or "General Client",
            "reference": first_line.reference,
            "transaction_date": first_line.transaction_date.isoformat() if first_line.transaction_date else None,
            "currency_code": first_line.currency_code or "ZAR",
            "exchange_rate": float(getattr(first_line, 'exchange_rate', 1.0) or 1.0),
            "is_foreign_currency": bool(getattr(first_line, 'is_foreign_currency', False) or (first_line.currency_code and first_line.currency_code != 'ZAR')),
            "foreign_document_subtotal": float(getattr(first_line, 'foreign_document_subtotal', 0.0) or 0.0),
            "sales_rep": first_line.sales_rep,
            "total_qty": doc_total_qty,
            "allocated_qty": doc_total_allocated,
            "unallocated_qty": max(0.0, doc_total_qty - doc_total_allocated),
            "document_subtotal": doc_subtotal,
            "document_discount": doc_discount,
            "total_value_excl": final_doc_val,
            "lines": parsed_lines
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching invoice document details for {document_no}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.get("/candidate-orders")
@router.get("/candidate-orders")
def get_invoicing_candidate_orders(
    sku: str = Query(..., description="Item Code / SKU to find candidate orders for"),
    db: Session = Depends(get_db)
):
    """
    Finds active client project orders and fittings in the portal matching the given SKU.
    Resolves project and order even with composite slug order IDs.
    """
    try:
        clean_sku = sku.strip()
        if not clean_sku:
            return {"sku": "", "candidate_count": 0, "candidates": []}

        all_projects = {p.id: p for p in db.query(Project).all()}
        proj_by_key = {p.project_key: p for p in all_projects.values() if p.project_key}
        all_orders = db.query(Order).all()
        order_by_id = {o.id: o for o in all_orders}

        order_items = db.query(OrderItem).filter(
            or_(
                OrderItem.code.ilike(f"%{clean_sku}%"),
                OrderItem.one_one_code.ilike(f"%{clean_sku}%"),
                OrderItem.description.ilike(f"%{clean_sku}%")
            )
        ).all()

        candidates = []
        for it in order_items:
            # Skip obsolete manual credit entries
            if it.is_credit or (it.id and str(it.id).startswith("C-")) or (it.qty is not None and it.qty < 0):
                continue

            matched_order = None
            matched_proj = None

            if str(it.order_id).isdigit() and int(it.order_id) in order_by_id:
                matched_order = order_by_id[int(it.order_id)]
                matched_proj = all_projects.get(matched_order.project_id)

            if not matched_order and it.order_id:
                parts = str(it.order_id).split('--')
                proj_prefix = parts[0] if parts else ''
                
                if proj_prefix in proj_by_key:
                    matched_proj = proj_by_key[proj_prefix]
                else:
                    for p in all_projects.values():
                        if p.project_key and (p.project_key == proj_prefix or p.project_key in str(it.order_id)):
                            matched_proj = p
                            break

                if matched_proj:
                    proj_orders = [o for o in all_orders if o.project_id == matched_proj.id]
                    for o in proj_orders:
                        if len(parts) > 1:
                            order_slug = parts[1].replace('-', ' ').strip().lower()
                            if order_slug and order_slug in (o.quote_name or '').lower():
                                matched_order = o
                                break
                    if not matched_order and proj_orders:
                        matched_order = proj_orders[0]

            req_qty = int(it.qty or 0)
            invoiced_qty = int(it.invoice_qty or 0)
            rem = max(0, req_qty - invoiced_qty)

            candidates.append({
                "order_item_id": it.id,
                "order_id": matched_order.id if matched_order else None,
                "order_po_number": matched_order.po_number if matched_order else (it.order_id or '—'),
                "order_quote_name": matched_order.quote_name if matched_order else (matched_order.po_number if matched_order else 'Spec Order'),
                "project_id": matched_proj.id if matched_proj else None,
                "project_key": matched_proj.project_key if matched_proj else None,
                "project_name": matched_proj.name if matched_proj else (it.order_id or 'General Project'),
                "fitting_code": it.code or it.one_one_code or sku,
                "description": it.description or it.code or sku,
                "required_qty": req_qty,
                "invoiced_qty": invoiced_qty,
                "remaining_needed": rem,
                "is_direct_sku_match": bool(it.code and it.code.strip().upper() == clean_sku.upper())
            })

        return {
            "sku": clean_sku,
            "candidate_count": len(candidates),
            "candidates": candidates
        }
    except Exception as e:
        logger.error(f"Error fetching invoicing candidate orders for {sku}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


def resolve_target_project_and_order(db: Session, project_id_input, project_key_input, project_name, order_id_input, order_item_id_input):
    """
    Robustly resolves the authentic Project and Order records from database without ever falling back to arbitrary project IDs.
    """
    proj = None
    ord_obj = None
    matched_item = None

    # 1. If order_item_id is provided, try to look up item and its parent order & project
    if order_item_id_input:
        matched_item = db.query(OrderItem).filter(OrderItem.id == str(order_item_id_input)).first()
        if matched_item and matched_item.order_id:
            if str(matched_item.order_id).isdigit():
                ord_obj = db.query(Order).filter(Order.id == int(matched_item.order_id)).first()
            if not ord_obj:
                ord_obj = db.query(Order).filter(Order.po_number == str(matched_item.order_id)).first()
            if ord_obj and ord_obj.project_id:
                proj = db.query(Project).filter(Project.id == ord_obj.project_id).first()

    # 2. If order_id_input is provided, try to find the Order
    if not ord_obj and order_id_input:
        if str(order_id_input).isdigit():
            ord_obj = db.query(Order).filter(Order.id == int(order_id_input)).first()
        if not ord_obj:
            ord_obj = db.query(Order).filter(Order.po_number == str(order_id_input)).first()
        if ord_obj and ord_obj.project_id:
            proj = db.query(Project).filter(Project.id == ord_obj.project_id).first()

    # 3. Match project by project_key
    target_key = str(project_key_input or '').strip()
    if not target_key and project_id_input and not str(project_id_input).isdigit():
        target_key = str(project_id_input).strip()

    if not proj and target_key:
        proj = db.query(Project).filter(Project.project_key == target_key).first()
        if not proj:
            proj = db.query(Project).filter(Project.project_key.ilike(target_key)).first()

    # 4. Match project by numeric project_id (verifying name consistency if provided)
    if not proj and project_id_input and str(project_id_input).isdigit():
        pid_num = int(project_id_input)
        if pid_num > 0:
            candidate_proj = db.query(Project).filter(Project.id == pid_num).first()
            if candidate_proj:
                if project_name:
                    p_name_clean = str(project_name).strip().lower()
                    if candidate_proj.name and (p_name_clean in candidate_proj.name.lower() or candidate_proj.name.lower() in p_name_clean):
                        proj = candidate_proj
                    elif pid_num != 1: # Don't default to Upper Primrose if name doesn't match
                        proj = candidate_proj
                else:
                    proj = candidate_proj

    # 5. Match project by project_name
    if not proj and project_name:
        p_name_clean = str(project_name).strip()
        if p_name_clean:
            proj = db.query(Project).filter(Project.name.ilike(f"%{p_name_clean}%")).first()
            if not proj:
                proj = db.query(Project).filter(Project.client_name.ilike(f"%{p_name_clean}%")).first()

    # 6. If order is still not resolved, but project has orders, select matching order or first order
    if not ord_obj and proj:
        p_orders = db.query(Order).filter(Order.project_id == proj.id).all()
        if order_id_input and p_orders:
            for o in p_orders:
                if str(o.id) == str(order_id_input) or str(o.po_number) == str(order_id_input):
                    ord_obj = o
                    break
        if not ord_obj and p_orders:
            ord_obj = p_orders[0]

    # If still no project found, create one or use the provided name without defaulting to ID 1!
    if not proj and (target_key or project_name):
        import re
        clean_key = target_key or re.sub(r'[^a-z0-9\-]', '-', (project_name or '').lower()).strip('-')
        clean_name = project_name or target_key
        proj = Project(
            name=clean_name,
            project_key=clean_key,
            client_name="General Client",
            status="Ongoing"
        )
        db.add(proj)
        db.flush()
        db.refresh(proj)

    return proj, ord_obj, matched_item


@public_router.post("/allocate")
@router.post("/allocate")
def allocate_invoicing_item(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Allocates a quantity from a Palladium Invoice line to a Project Order Item.
    Updates OrderItem invoice_qty, invoice_ref, invoice_date, and invoice_history in real time.
    """
    try:
        source_doc_no = str(payload.get("source_doc_no") or "").strip()
        sku = str(payload.get("sku") or "").strip()
        project_id_input = payload.get("project_id")
        project_key_input = payload.get("project_key")
        project_name = payload.get("project_name")
        order_id = payload.get("order_id")
        order_item_id = payload.get("order_item_id")
        fitting_code = payload.get("fitting_code")
        allocated_qty = float(payload.get("allocated_qty") or 0.0)
        unit_cost = float(payload.get("unit_cost") or 0.0) # unit price
        doc_date = payload.get("doc_date") or payload.get("transaction_date")
        allocated_by = payload.get("allocated_by_name") or "Staff"
        notes = payload.get("notes")

        if not source_doc_no or not sku or (not project_id_input and not project_key_input and not project_name) or allocated_qty <= 0:
            raise HTTPException(status_code=400, detail="Missing required allocation parameters.")

        # Resolve Project and Order
        proj, ord_obj, direct_item = resolve_target_project_and_order(
            db, project_id_input, project_key_input, project_name, order_id, order_item_id
        )

        real_proj_id = proj.id if proj else None
        real_proj_name = proj.name if proj else (project_name or "Project")

        if not real_proj_id:
            raise HTTPException(status_code=400, detail="Could not resolve target project. Please specify a valid project.")

        resolved_order_id = ord_obj.id if ord_obj else None

        # Resolve matching OrderItem
        matched_item = direct_item
        if not matched_item and order_item_id:
            matched_item = db.query(OrderItem).filter(OrderItem.id == str(order_item_id)).first()

        if not matched_item and ord_obj:
            order_items = db.query(OrderItem).filter(OrderItem.order_id.in_([ord_obj.po_number, str(ord_obj.id)])).all()
            matched_item = find_best_item_match(order_items, sku)

        if not matched_item and real_proj_id:
            proj_items = db.query(OrderItem).filter(
                or_(
                    OrderItem.order_id.ilike(f"{proj.project_key}%") if (proj and proj.project_key) else False,
                    OrderItem.order_id.in_([str(o.id) for o in db.query(Order).filter(Order.project_id == real_proj_id).all()]),
                    OrderItem.order_id.in_([o.po_number for o in db.query(Order).filter(Order.project_id == real_proj_id).all() if o.po_number])
                )
            ).all()
            matched_item = find_best_item_match(proj_items, sku)

        alloc = ProcurementAllocation(
            allocation_type="INVOICE",
            source_doc_no=source_doc_no,
            sku=sku,
            project_id=real_proj_id,
            project_name=real_proj_name,
            order_id=resolved_order_id,
            order_item_id=str(matched_item.id) if matched_item else (str(order_item_id) if order_item_id else None),
            fitting_code=fitting_code or (matched_item.code if matched_item else sku),
            allocated_qty=allocated_qty,
            unit_cost=unit_cost,
            doc_date=str(doc_date) if doc_date else None,
            allocated_by_name=allocated_by,
            allocated_at=datetime.now(timezone.utc),
            status="Active",
            notes=notes
        )
        db.add(alloc)
        db.flush()

        if matched_item:
            recalc_order_item_invoicing(db, matched_item)

        db.commit()
        logger.info(f"Allocated invoice {source_doc_no} (qty {allocated_qty}) to {real_proj_name}.")
        return {
            "status": "success",
            "message": f"Successfully allocated {allocated_qty} units from {source_doc_no} to {real_proj_name}.",
            "allocation_id": alloc.id
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error allocating invoice item: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.post("/batch-allocate")
@router.post("/batch-allocate")
def batch_allocate_invoicing_items(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Allocates multiple items from an invoice to a single Project & Order in one transaction.
    """
    try:
        source_doc_no = str(payload.get("source_doc_no") or "").strip()
        project_id_input = payload.get("project_id")
        project_key_input = payload.get("project_key")
        project_name = payload.get("project_name")
        order_id = payload.get("order_id")
        doc_date = payload.get("doc_date") or payload.get("transaction_date")
        allocated_by = payload.get("allocated_by_name") or "Staff"
        notes = payload.get("notes") or "Batch invoice allocation"
        items = payload.get("items") or []

        if not source_doc_no or (not project_id_input and not project_key_input and not project_name) or not items:
            raise HTTPException(status_code=400, detail="Missing source_doc_no, project destination, or items list.")

        # Resolve Project and Order
        proj, ord_obj, _ = resolve_target_project_and_order(
            db, project_id_input, project_key_input, project_name, order_id, None
        )

        real_proj_id = proj.id if proj else None
        real_proj_name = proj.name if proj else (project_name or "Project")

        if not real_proj_id:
            raise HTTPException(status_code=400, detail="Could not resolve target project. Please specify a valid project.")

        resolved_item_order_id = ord_obj.id if ord_obj else None

        proj_items = []
        if ord_obj:
            proj_items = db.query(OrderItem).filter(OrderItem.order_id.in_([ord_obj.po_number, str(ord_obj.id)])).all()
        elif proj and proj.project_key:
            proj_items = db.query(OrderItem).filter(OrderItem.order_id.ilike(f"{proj.project_key}%")).all()

        count_allocated = 0
        for it in items:
            sku = str(it.get("sku") or "").strip()
            allocated_qty = float(it.get("allocated_qty") or 0.0)
            unit_cost = float(it.get("unit_cost") or 0.0)
            order_item_id = it.get("order_item_id")
            fitting_code = it.get("fitting_code") or sku

            if not sku or allocated_qty <= 0:
                continue

            matched_item = None
            if order_item_id:
                matched_item = db.query(OrderItem).filter(OrderItem.id == str(order_item_id)).first()
            elif proj_items:
                matched_item = find_best_item_match(proj_items, sku)

            alloc = ProcurementAllocation(
                allocation_type="INVOICE",
                source_doc_no=source_doc_no,
                sku=sku,
                project_id=real_proj_id,
                project_name=real_proj_name,
                order_id=resolved_item_order_id,
                order_item_id=str(matched_item.id) if matched_item else (str(order_item_id) if order_item_id else None),
                fitting_code=fitting_code or (matched_item.code if matched_item else sku),
                allocated_qty=allocated_qty,
                unit_cost=unit_cost,
                doc_date=str(doc_date) if doc_date else None,
                allocated_by_name=allocated_by,
                allocated_at=datetime.now(timezone.utc),
                status="Active",
                notes=notes
            )
            db.add(alloc)
            db.flush()

            if matched_item:
                recalc_order_item_invoicing(db, matched_item)

            count_allocated += 1

        db.commit()
        logger.info(f"Batch allocated {count_allocated} invoice items from {source_doc_no} to {real_proj_name}.")
        return {
            "status": "success",
            "message": f"Successfully allocated {count_allocated} items from {source_doc_no} to {real_proj_name}.",
            "count": count_allocated
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error in batch invoice allocation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


def recalc_order_item_invoicing(db: Session, item: OrderItem):
    """
    Recalculates invoice_qty, invoice_value, invoice_ref, invoice_date, and invoice_history
    for an OrderItem strictly from active Tax Invoices (IN-...) in Cloud SQL.
    Credit Notes (CN-...) are tracked in the order's Credits ledger and do not reduce invoice_qty to 0.
    """
    active_allocs = db.query(ProcurementAllocation).filter(
        ProcurementAllocation.allocation_type == "INVOICE",
        ProcurementAllocation.order_item_id == str(item.id),
        ProcurementAllocation.status == "Active"
    ).all()

    if not active_allocs and (item.code or item.one_one_code):
        active_allocs = db.query(ProcurementAllocation).filter(
            ProcurementAllocation.allocation_type == "INVOICE",
            ProcurementAllocation.order_item_id.is_(None),
            or_(
                ProcurementAllocation.sku == item.code,
                ProcurementAllocation.sku == item.one_one_code
            ),
            ProcurementAllocation.status == "Active"
        ).all()

    # Filter strictly for non-credit invoices (IN-...)
    inv_allocs = [a for a in active_allocs if not str(a.source_doc_no).upper().startswith(("CN-", "CR-"))]

    new_hist = []
    total_qty = 0.0
    total_val = 0.0
    refs = set()
    latest_date = None

    for a in inv_allocs:
        qty_val = float(a.allocated_qty or 0.0)
        cost_val = float(a.unit_cost or 0.0)

        total_qty += qty_val
        total_val += qty_val * cost_val
        if a.source_doc_no:
            refs.add(str(a.source_doc_no))
        if a.doc_date:
            latest_date = str(a.doc_date).split("T")[0]

        new_hist.append({
            "id": a.source_doc_no,
            "ref": a.source_doc_no,
            "allocation_id": a.id,
            "qty": qty_val,
            "unitPrice": cost_val,
            "total": round(qty_val * cost_val, 2),
            "date": str(a.doc_date).split("T")[0] if a.doc_date else None,
            "by": a.allocated_by_name or "Staff",
            "type": "Invoice"
        })

    item.invoice_history = new_hist
    item.invoice_qty = int(round(total_qty))
    item.invoice_value = round(total_val, 2)
    item.invoice_ref = "; ".join(sorted(refs)) if refs else None
    item.invoice_date = latest_date


@public_router.post("/unallocate")
@router.post("/unallocate")
def unallocate_invoicing_item(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Cancels an active invoice allocation (or list of allocation IDs) and updates OrderItem invoice fields.
    """
    try:
        allocation_id = payload.get("allocation_id")
        allocation_ids = payload.get("allocation_ids")
        document_no = payload.get("document_no")

        if allocation_ids or (document_no and not allocation_id):
            return batch_unallocate_invoicing_items(payload, db)

        if not allocation_id:
            raise HTTPException(status_code=400, detail="Missing allocation_id.")

        alloc = db.query(ProcurementAllocation).filter(ProcurementAllocation.id == int(allocation_id)).first()
        if not alloc:
            raise HTTPException(status_code=404, detail="Allocation record not found.")

        alloc.status = "Cancelled"

        # Update OrderItem if linked
        matched_item = None
        if alloc.order_item_id:
            matched_item = db.query(OrderItem).filter(OrderItem.id == str(alloc.order_item_id)).first()
        
        if not matched_item and alloc.sku:
            clean_sku = alloc.sku.strip().upper()
            cand_items = db.query(OrderItem).filter(
                or_(
                    OrderItem.code.ilike(clean_sku),
                    OrderItem.one_one_code.ilike(clean_sku)
                )
            ).all()
            if cand_items:
                matched_item = cand_items[0]

        if matched_item:
            recalc_order_item_invoicing(db, matched_item)

        db.commit()
        logger.info(f"Unallocated invoice #{allocation_id} for {alloc.sku} ({alloc.source_doc_no}).")
        return {
            "status": "success",
            "message": f"Successfully unallocated {alloc.sku} from {alloc.source_doc_no}."
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error unallocating invoice item: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.post("/batch-unallocate")
@router.post("/batch-unallocate")
def batch_unallocate_invoicing_items(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Cancels multiple active invoice allocations in bulk by allocation IDs, document_no, or line SKUs.
    """
    try:
        allocation_ids = payload.get("allocation_ids") or []
        document_no = payload.get("document_no")
        skus = payload.get("skus") or []

        query = db.query(ProcurementAllocation).filter(
            ProcurementAllocation.allocation_type == "INVOICE",
            ProcurementAllocation.status == "Active"
        )

        if allocation_ids:
            clean_ids = [int(i) for i in allocation_ids if str(i).isdigit()]
            if clean_ids:
                query = query.filter(ProcurementAllocation.id.in_(clean_ids))
        elif document_no:
            query = query.filter(ProcurementAllocation.source_doc_no == str(document_no).strip())
            if skus:
                clean_skus = [str(s).strip().upper() for s in skus if s]
                query = query.filter(func.upper(ProcurementAllocation.sku).in_(clean_skus))
        else:
            raise HTTPException(status_code=400, detail="Missing allocation_ids or document_no.")

        allocs_to_cancel = query.all()
        if not allocs_to_cancel:
            return {"status": "success", "message": "No active allocations found to unallocate.", "count": 0}

        affected_item_ids = set()
        affected_skus = set()

        for alloc in allocs_to_cancel:
            alloc.status = "Cancelled"
            if alloc.order_item_id:
                affected_item_ids.add(str(alloc.order_item_id))
            if alloc.sku:
                affected_skus.add(alloc.sku.strip().upper())

        # Recalculate OrderItems
        affected_items = []
        if affected_item_ids:
            affected_items = db.query(OrderItem).filter(OrderItem.id.in_(list(affected_item_ids))).all()
        
        if affected_skus:
            cand_items = db.query(OrderItem).filter(
                or_(
                    OrderItem.code.in_(list(affected_skus)),
                    OrderItem.one_one_code.in_(list(affected_skus))
                )
            ).all()
            for ci in cand_items:
                if ci not in affected_items:
                    affected_items.append(ci)

        for it in affected_items:
            recalc_order_item_invoicing(db, it)

        db.commit()
        count = len(allocs_to_cancel)
        logger.info(f"Bulk unallocated {count} allocations.")
        return {
            "status": "success",
            "message": f"Successfully unallocated {count} allocation(s).",
            "count": count
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error in batch unallocate: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.post("/flag-issue")
@router.post("/flag-issue")
def flag_invoicing_issue(payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Flags an invoice document or line item with an Issue / Not Found status.
    """
    try:
        document_no = str(payload.get("document_no") or "").strip()
        raw_line_id = payload.get("line_id")
        sku = payload.get("sku")
        reason = str(payload.get("reason") or "Order Not Found").strip()
        notes = str(payload.get("notes") or "").strip()
        flagged_by = str(payload.get("flagged_by") or "Staff").strip()

        if not document_no:
            raise HTTPException(status_code=400, detail="Missing document_no")

        # Safely parse line_id to integer if provided
        parsed_line_id = None
        if raw_line_id is not None:
            clean_lid_str = str(raw_line_id).replace("INV_", "").replace("PO_", "").replace("GRN_", "").strip()
            if clean_lid_str.isdigit():
                parsed_line_id = int(clean_lid_str)

        query = db.query(AllocationIssue).filter(
            AllocationIssue.module == "INVOICE",
            AllocationIssue.document_no == document_no,
            AllocationIssue.status == "Open"
        )
        if parsed_line_id is not None:
            query = query.filter(AllocationIssue.line_id == parsed_line_id)
        elif sku:
            query = query.filter(AllocationIssue.sku == str(sku))
        else:
            query = query.filter(AllocationIssue.line_id.is_(None))

        issue = query.first()
        if not issue:
            inv = db.query(PalladiumInvoiceLine).filter(PalladiumInvoiceLine.document_no == document_no).first()
            issue = AllocationIssue(
                module="INVOICE",
                document_no=document_no,
                line_id=parsed_line_id,
                sku=str(sku) if sku else (inv.item_code if inv else None),
                amount=inv.document_total if inv else 0.0,
                customer_vendor=inv.customer_name if inv else None,
                reason=reason,
                notes=notes,
                flagged_by=flagged_by,
                flagged_at=datetime.now(timezone.utc),
                status="Open"
            )
            db.add(issue)
        else:
            issue.reason = reason
            issue.notes = notes
            issue.flagged_by = flagged_by
            issue.flagged_at = datetime.now(timezone.utc)

        db.commit()
        return {"status": "success", "message": f"Invoice {document_no} flagged as '{reason}'"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error flagging invoice issue: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.post("/resolve-issue")
@router.post("/resolve-issue")
def resolve_invoicing_issue(payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Resolves an Issue / Not Found flag on an invoice document.
    """
    try:
        document_no = str(payload.get("document_no") or "").strip()
        resolved_by = str(payload.get("resolved_by") or "Staff").strip()

        if not document_no:
            raise HTTPException(status_code=400, detail="Missing document_no")

        issues = db.query(AllocationIssue).filter(
            AllocationIssue.module == "INVOICE",
            AllocationIssue.document_no == document_no,
            AllocationIssue.status == "Open"
        ).all()

        for iss in issues:
            iss.status = "Resolved"
            iss.resolved_at = datetime.now(timezone.utc)
            iss.resolved_by = resolved_by

        db.commit()
        return {"status": "success", "message": f"Issues on invoice {document_no} resolved"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error resolving invoice issue: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
