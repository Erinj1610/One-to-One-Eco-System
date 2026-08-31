import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc

from database.cloud_sql import get_db
from models.orm_models import (
    PalladiumPOLine, 
    PalladiumGRNLine, 
    ProcurementAllocation, 
    AllocationIssue,
    Order, 
    OrderItem, 
    Project
)
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

logger = logging.getLogger("procurement_routes")
logger.setLevel(logging.INFO)

router = APIRouter(prefix="/procurement", tags=["procurement"])
public_router = APIRouter(prefix="/procurement", tags=["procurement"])


@public_router.get("/summary")
@router.get("/summary")
def get_procurement_summary(db: Session = Depends(get_db)):
    """
    Returns aggregated KPI counts for the Purchasing & Receiving module.
    Counts document-level & line-level metrics.
    """
    try:
        # 1. Fetch all active allocations mapped by source_doc_no + sku
        allocations = db.query(
            ProcurementAllocation.source_doc_no,
            ProcurementAllocation.sku,
            ProcurementAllocation.allocation_type,
            func.sum(ProcurementAllocation.allocated_qty).label("total_allocated")
        ).filter(ProcurementAllocation.status == "Active")\
         .group_by(
             ProcurementAllocation.source_doc_no,
             ProcurementAllocation.sku,
             ProcurementAllocation.allocation_type
         ).all()

        alloc_map = {
            f"{a.allocation_type}_{a.source_doc_no}_{a.sku}": float(a.total_allocated or 0)
            for a in allocations
        }

        # 2. Scan PO lines
        po_lines = db.query(
            PalladiumPOLine.document_no,
            PalladiumPOLine.item_code,
            PalladiumPOLine.order_qty
        ).all()

        # 3. Scan GRN lines
        grn_lines = db.query(
            PalladiumGRNLine.document_no,
            PalladiumGRNLine.item_code,
            PalladiumGRNLine.received_qty
        ).all()

        # Group lines per document to count document-level status
        doc_stats = {}

        for po in po_lines:
            dkey = f"PO_{po.document_no}"
            if dkey not in doc_stats:
                doc_stats[dkey] = {"total_lines": 0, "alloc_lines": 0, "unalloc_lines": 0, "unalloc_units": 0.0}
            doc_stats[dkey]["total_lines"] += 1

            key = f"PO_{po.document_no}_{po.item_code}"
            allocated = alloc_map.get(key, 0.0)
            target_qty = float(po.order_qty or 0.0)
            rem = max(0.0, target_qty - allocated)
            doc_stats[dkey]["unalloc_units"] += rem

            if allocated <= 0:
                doc_stats[dkey]["unalloc_lines"] += 1
            elif allocated >= target_qty:
                doc_stats[dkey]["alloc_lines"] += 1

        for grn in grn_lines:
            dkey = f"GRN_{grn.document_no}"
            if dkey not in doc_stats:
                doc_stats[dkey] = {"total_lines": 0, "alloc_lines": 0, "unalloc_lines": 0, "unalloc_units": 0.0}
            doc_stats[dkey]["total_lines"] += 1

            key = f"GRN_{grn.document_no}_{grn.item_code}"
            allocated = alloc_map.get(key, 0.0)
            target_qty = float(grn.received_qty or 0.0)
            rem = max(0.0, target_qty - allocated)
            doc_stats[dkey]["unalloc_units"] += rem

            if allocated <= 0:
                doc_stats[dkey]["unalloc_lines"] += 1
            elif allocated >= target_qty:
                doc_stats[dkey]["alloc_lines"] += 1

        unallocated_docs = 0
        partially_allocated_docs = 0
        fully_allocated_docs = 0
        total_unallocated_units = 0.0

        for dkey, s in doc_stats.items():
            total_unallocated_units += s["unalloc_units"]
            if s["alloc_lines"] == s["total_lines"]:
                fully_allocated_docs += 1
            elif s["unalloc_lines"] == s["total_lines"]:
                unallocated_docs += 1
            else:
                partially_allocated_docs += 1

        open_issues = db.query(AllocationIssue).filter(
            AllocationIssue.module.in_(["PO", "GRN"]),
            AllocationIssue.status == "Open"
        ).all()
        po_issues_cnt = sum(1 for i in open_issues if i.module == "PO")
        grn_issues_cnt = sum(1 for i in open_issues if i.module == "GRN")

        return {
            "unallocated_count": unallocated_docs,
            "partially_allocated_count": partially_allocated_docs,
            "fully_allocated_count": fully_allocated_docs,
            "issues_count": len(open_issues),
            "po_issues_count": po_issues_cnt,
            "grn_issues_count": grn_issues_cnt,
            "total_documents": len(doc_stats),
            "total_lines": len(po_lines) + len(grn_lines),
            "total_unallocated_units": round(total_unallocated_units, 2)
        }
    except Exception as e:
        logger.error(f"Error computing procurement summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.get("/documents")
@router.get("/documents")
def get_procurement_documents(
    doc_type: str = "ALL",
    status: str = "ALL",
    supplier: Optional[str] = None,
    q: Optional[str] = None,
    view_level: str = "document",  # "document" or "line"
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Returns list of PO and GRN Documents (or raw lines) merged with real-time allocation state.
    In 'document' mode, each record is an entire Purchase Order or GRN containing all its line items.
    """
    try:
        # Load active allocations
        alloc_records = db.query(ProcurementAllocation).filter(ProcurementAllocation.status == "Active").all()
        
        alloc_map = {}
        for ar in alloc_records:
            key = f"{ar.allocation_type}_{ar.source_doc_no}_{ar.sku}"
            if key not in alloc_map:
                alloc_map[key] = []
            alloc_map[key].append({
                "id": ar.id,
                "project_id": ar.project_id,
                "project_name": ar.project_name,
                "order_id": ar.order_id,
                "order_item_id": ar.order_item_id,
                "fitting_code": ar.fitting_code,
                "allocated_qty": ar.allocated_qty,
                "unit_cost": ar.unit_cost,
                "allocated_by_name": ar.allocated_by_name,
                "allocated_at": ar.allocated_at.isoformat() if ar.allocated_at else None,
                "notes": ar.notes
            })

        # Load open issues
        open_issues = db.query(AllocationIssue).filter(
            AllocationIssue.module.in_(["PO", "GRN"]),
            AllocationIssue.status == "Open"
        ).all()
        issue_by_doc = {}
        issue_by_line = {}
        for iss in open_issues:
            issue_by_doc[f"{iss.module}_{iss.document_no}"] = iss
            if iss.line_id:
                issue_by_line[f"{iss.module}_{iss.document_no}_{iss.line_id}"] = iss
            if iss.sku:
                issue_by_line[f"{iss.module}_{iss.document_no}_{iss.sku}"] = iss

        # 1. Fetch PO lines
        po_rows = []
        if doc_type.upper() in ["ALL", "PO"]:
            po_query = db.query(PalladiumPOLine)
            if supplier and supplier != "All Suppliers":
                po_query = po_query.filter(PalladiumPOLine.vendor_name.ilike(f"%{supplier}%"))
            if q:
                search_term = f"%{q}%"
                po_query = po_query.filter(
                    or_(
                        PalladiumPOLine.document_no.ilike(search_term),
                        PalladiumPOLine.item_code.ilike(search_term),
                        PalladiumPOLine.item_description.ilike(search_term),
                        PalladiumPOLine.vendor_name.ilike(search_term),
                        PalladiumPOLine.customer_name.ilike(search_term)
                    )
                )
            po_rows = po_query.order_by(desc(PalladiumPOLine.transaction_date)).all()

        # 2. Fetch GRN lines
        grn_rows = []
        if doc_type.upper() in ["ALL", "GRN"]:
            grn_query = db.query(PalladiumGRNLine)
            if supplier and supplier != "All Suppliers":
                grn_query = grn_query.filter(PalladiumGRNLine.vendor_name.ilike(f"%{supplier}%"))
            if q:
                search_term = f"%{q}%"
                grn_query = grn_query.filter(
                    or_(
                        PalladiumGRNLine.document_no.ilike(search_term),
                        PalladiumGRNLine.item_code.ilike(search_term),
                        PalladiumGRNLine.item_description.ilike(search_term),
                        PalladiumGRNLine.vendor_name.ilike(search_term),
                        PalladiumGRNLine.location.ilike(search_term)
                    )
                )
            grn_rows = grn_query.order_by(desc(PalladiumGRNLine.transaction_date)).all()

        # If line view requested:
        if view_level == "line":
            raw_lines = []
            for r in po_rows:
                key = f"PO_{r.document_no}_{r.item_code}"
                active_allocs = alloc_map.get(key, [])
                total_allocated = sum(a["allocated_qty"] for a in active_allocs)
                target_qty = float(r.order_qty or 0.0)
                rem_qty = max(0.0, target_qty - total_allocated)
                l_status = "NEEDS_ALLOCATION" if total_allocated <= 0 else ("PARTIAL" if total_allocated < target_qty else "FULLY_ALLOCATED")
                
                iss_l = issue_by_line.get(f"PO_{r.document_no}_{r.id}") or issue_by_line.get(f"PO_{r.document_no}_{r.item_code}") or issue_by_doc.get(f"PO_{r.document_no}")
                is_l_issue = bool(iss_l)

                if status.upper() in ["ISSUES", "NOT_FOUND"] and not is_l_issue:
                    continue
                elif status.upper() == "NEEDS_ALLOCATION" and (l_status != "NEEDS_ALLOCATION" or is_l_issue):
                    continue
                elif status != "ALL" and status.upper() not in ["ISSUES", "NOT_FOUND", "NEEDS_ALLOCATION"] and l_status != status.upper():
                    continue

                raw_lines.append({
                    "id": f"PO_{r.id}",
                    "line_id": r.id,
                    "doc_type": "PO",
                    "document_no": r.document_no,
                    "vendor_name": r.vendor_name or "Unknown Supplier",
                    "item_code": r.item_code,
                    "item_description": r.item_description or "",
                    "item_unit": r.item_unit or "EA",
                    "total_qty": target_qty,
                    "unit_cost": float(r.unit_cost or 0.0),
                    "total_value": float(r.total_value_excl or 0.0),
                    "currency_code": r.currency_code or "ZAR",
                    "transaction_date": r.transaction_date.isoformat() if r.transaction_date else None,
                    "allocated_qty": round(total_allocated, 2),
                    "unallocated_qty": round(rem_qty, 2),
                    "allocation_status": l_status,
                    "is_flagged_issue": is_l_issue,
                    "issue_reason": iss_l.reason if iss_l else None,
                    "issue_notes": iss_l.notes if iss_l else None,
                    "issue_flagged_by": iss_l.flagged_by if iss_l else None,
                    "issue_flagged_at": iss_l.flagged_at.isoformat() if iss_l and iss_l.flagged_at else None,
                    "allocations": active_allocs
                })

            for r in grn_rows:
                key = f"GRN_{r.document_no}_{r.item_code}"
                active_allocs = alloc_map.get(key, [])
                total_allocated = sum(a["allocated_qty"] for a in active_allocs)
                target_qty = float(r.received_qty or 0.0)
                rem_qty = max(0.0, target_qty - total_allocated)
                l_status = "NEEDS_ALLOCATION" if total_allocated <= 0 else ("PARTIAL" if total_allocated < target_qty else "FULLY_ALLOCATED")
                
                iss_l = issue_by_line.get(f"GRN_{r.document_no}_{r.id}") or issue_by_line.get(f"GRN_{r.document_no}_{r.item_code}") or issue_by_doc.get(f"GRN_{r.document_no}")
                is_l_issue = bool(iss_l)

                if status.upper() in ["ISSUES", "NOT_FOUND"] and not is_l_issue:
                    continue
                elif status.upper() == "NEEDS_ALLOCATION" and (l_status != "NEEDS_ALLOCATION" or is_l_issue):
                    continue
                elif status != "ALL" and status.upper() not in ["ISSUES", "NOT_FOUND", "NEEDS_ALLOCATION"] and l_status != status.upper():
                    continue

                raw_lines.append({
                    "id": f"GRN_{r.id}",
                    "line_id": r.id,
                    "doc_type": "GRN",
                    "document_no": r.document_no,
                    "vendor_name": r.vendor_name or "Unknown Supplier",
                    "item_code": r.item_code,
                    "item_description": r.item_description or "",
                    "item_unit": r.item_unit or "EA",
                    "total_qty": target_qty,
                    "unit_cost": float(r.unit_cost or 0.0),
                    "total_value": float(r.line_total_excl or 0.0),
                    "currency_code": r.currency_code or "ZAR",
                    "transaction_date": r.transaction_date.isoformat() if r.transaction_date else None,
                    "allocated_qty": round(total_allocated, 2),
                    "unallocated_qty": round(rem_qty, 2),
                    "allocation_status": l_status,
                    "is_flagged_issue": is_l_issue,
                    "issue_reason": iss_l.reason if iss_l else None,
                    "issue_notes": iss_l.notes if iss_l else None,
                    "issue_flagged_by": iss_l.flagged_by if iss_l else None,
                    "issue_flagged_at": iss_l.flagged_at.isoformat() if iss_l and iss_l.flagged_at else None,
                    "allocations": active_allocs
                })

            total_count = len(raw_lines)
            start_idx = (page - 1) * limit
            return {
                "items": raw_lines[start_idx:start_idx + limit],
                "total_count": total_count,
                "page": page,
                "limit": limit,
                "total_pages": (total_count + limit - 1) // limit if limit > 0 else 1
            }

        # Otherwise DOCUMENT-LEVEL GROUPING (Standard Primary View):
        doc_dict = {}

        # Process PO Lines into Documents
        for r in po_rows:
            dkey = f"PO_{r.document_no}"
            if dkey not in doc_dict:
                doc_dict[dkey] = {
                    "id": dkey,
                    "doc_type": "PO",
                    "document_no": r.document_no,
                    "vendor_name": r.vendor_name or "Unknown Supplier",
                    "transaction_date": r.transaction_date.isoformat() if r.transaction_date else None,
                    "order_required_date": r.order_required_date.isoformat() if r.order_required_date else None,
                    "erp_status": r.status or "Open",
                    "customer_name": r.customer_name,
                    "total_lines": 0,
                    "total_qty": 0.0,
                    "allocated_qty": 0.0,
                    "unallocated_qty": 0.0,
                    "total_value": 0.0,
                    "currency_code": r.currency_code or "ZAR",
                    "allocated_lines_count": 0,
                    "unallocated_lines_count": 0,
                    "partial_lines_count": 0,
                    "lines": []
                }

            lkey = f"PO_{r.document_no}_{r.item_code}"
            active_allocs = alloc_map.get(lkey, [])
            line_allocated = sum(a["allocated_qty"] for a in active_allocs)
            target_qty = float(r.order_qty or 0.0)
            rem_qty = max(0.0, target_qty - line_allocated)

            if line_allocated <= 0:
                l_status = "NEEDS_ALLOCATION"
                doc_dict[dkey]["unallocated_lines_count"] += 1
            elif line_allocated < target_qty:
                l_status = "PARTIAL"
                doc_dict[dkey]["partial_lines_count"] += 1
            else:
                l_status = "FULLY_ALLOCATED"
                doc_dict[dkey]["allocated_lines_count"] += 1

            iss_l = issue_by_line.get(f"PO_{r.document_no}_{r.id}") or issue_by_line.get(f"PO_{r.document_no}_{r.item_code}") or issue_by_doc.get(f"PO_{r.document_no}")

            line_item = {
                "id": f"PO_{r.id}",
                "line_id": r.id,
                "doc_type": "PO",
                "document_no": r.document_no,
                "vendor_name": r.vendor_name or "Unknown Supplier",
                "item_code": r.item_code,
                "item_description": r.item_description or "",
                "item_unit": r.item_unit or "EA",
                "total_qty": target_qty,
                "open_qty": float(r.open_qty or 0.0),
                "shipped_qty": float(r.shipped_qty or 0.0),
                "unit_cost": float(r.unit_cost or 0.0),
                "total_value": float(r.total_value_excl or 0.0),
                "currency_code": r.currency_code or "ZAR",
                "transaction_date": r.transaction_date.isoformat() if r.transaction_date else None,
                "order_required_date": r.order_required_date.isoformat() if r.order_required_date else None,
                "erp_status": r.status or "Open",
                "customer_name": r.customer_name,
                "allocated_qty": round(line_allocated, 2),
                "unallocated_qty": round(rem_qty, 2),
                "allocation_status": l_status,
                "is_flagged_issue": bool(iss_l),
                "issue_reason": iss_l.reason if iss_l else None,
                "issue_notes": iss_l.notes if iss_l else None,
                "issue_flagged_by": iss_l.flagged_by if iss_l else None,
                "issue_flagged_at": iss_l.flagged_at.isoformat() if iss_l and iss_l.flagged_at else None,
                "allocations": active_allocs
            }

            doc_dict[dkey]["total_lines"] += 1
            doc_dict[dkey]["total_qty"] += target_qty
            doc_dict[dkey]["allocated_qty"] += line_allocated
            doc_dict[dkey]["unallocated_qty"] += rem_qty
            doc_dict[dkey]["total_value"] += float(r.total_value_excl or 0.0)
            doc_dict[dkey]["lines"].append(line_item)

        # Process GRN Lines into Documents
        for r in grn_rows:
            dkey = f"GRN_{r.document_no}"
            if dkey not in doc_dict:
                doc_dict[dkey] = {
                    "id": dkey,
                    "doc_type": "GRN",
                    "document_no": r.document_no,
                    "vendor_name": r.vendor_name or "Unknown Supplier",
                    "transaction_date": r.transaction_date.isoformat() if r.transaction_date else None,
                    "order_required_date": None,
                    "erp_status": "Received",
                    "customer_name": None,
                    "total_lines": 0,
                    "total_qty": 0.0,
                    "allocated_qty": 0.0,
                    "unallocated_qty": 0.0,
                    "total_value": 0.0,
                    "currency_code": r.currency_code or "ZAR",
                    "allocated_lines_count": 0,
                    "unallocated_lines_count": 0,
                    "partial_lines_count": 0,
                    "lines": []
                }

            lkey = f"GRN_{r.document_no}_{r.item_code}"
            active_allocs = alloc_map.get(lkey, [])
            line_allocated = sum(a["allocated_qty"] for a in active_allocs)
            target_qty = float(r.received_qty or 0.0)
            rem_qty = max(0.0, target_qty - line_allocated)

            if line_allocated <= 0:
                l_status = "NEEDS_ALLOCATION"
                doc_dict[dkey]["unallocated_lines_count"] += 1
            elif line_allocated < target_qty:
                l_status = "PARTIAL"
                doc_dict[dkey]["partial_lines_count"] += 1
            else:
                l_status = "FULLY_ALLOCATED"
                doc_dict[dkey]["allocated_lines_count"] += 1

            iss_l = issue_by_line.get(f"GRN_{r.document_no}_{r.id}") or issue_by_line.get(f"GRN_{r.document_no}_{r.item_code}") or issue_by_doc.get(f"GRN_{r.document_no}")

            line_item = {
                "id": f"GRN_{r.id}",
                "line_id": r.id,
                "doc_type": "GRN",
                "document_no": r.document_no,
                "vendor_name": r.vendor_name or "Unknown Supplier",
                "item_code": r.item_code,
                "item_description": r.item_description or "",
                "item_unit": r.item_unit or "EA",
                "total_qty": target_qty,
                "open_qty": 0.0,
                "shipped_qty": target_qty,
                "unit_cost": float(r.unit_cost or 0.0),
                "total_value": float(r.line_total_excl or 0.0),
                "currency_code": r.currency_code or "ZAR",
                "transaction_date": r.transaction_date.isoformat() if r.transaction_date else None,
                "order_required_date": None,
                "erp_status": "Received",
                "customer_name": None,
                "allocated_qty": round(line_allocated, 2),
                "unallocated_qty": round(rem_qty, 2),
                "allocation_status": l_status,
                "is_flagged_issue": bool(iss_l),
                "issue_reason": iss_l.reason if iss_l else None,
                "issue_notes": iss_l.notes if iss_l else None,
                "issue_flagged_by": iss_l.flagged_by if iss_l else None,
                "issue_flagged_at": iss_l.flagged_at.isoformat() if iss_l and iss_l.flagged_at else None,
                "allocations": active_allocs
            }

            doc_dict[dkey]["total_lines"] += 1
            doc_dict[dkey]["total_qty"] += target_qty
            doc_dict[dkey]["allocated_qty"] += line_allocated
            doc_dict[dkey]["unallocated_qty"] += rem_qty
            doc_dict[dkey]["total_value"] += float(r.line_total_excl or 0.0)
            doc_dict[dkey]["lines"].append(line_item)

        # Compute document overall status & filter
        doc_list = []
        for d in doc_dict.values():
            d["total_qty"] = round(d["total_qty"], 2)
            d["allocated_qty"] = round(d["allocated_qty"], 2)
            d["unallocated_qty"] = round(d["unallocated_qty"], 2)
            d["total_value"] = round(d["total_value"], 2)

            if d["allocated_lines_count"] == d["total_lines"] and d["total_lines"] > 0:
                doc_status = "FULLY_ALLOCATED"
            elif d["unallocated_lines_count"] == d["total_lines"]:
                doc_status = "NEEDS_ALLOCATION"
            else:
                doc_status = "PARTIAL"

            d["allocation_status"] = doc_status

            iss_d = issue_by_doc.get(d["id"])
            is_d_issue = bool(iss_d) or any(l.get("is_flagged_issue") for l in d["lines"])
            d["is_flagged_issue"] = is_d_issue
            d["issue_reason"] = iss_d.reason if iss_d else (next((l["issue_reason"] for l in d["lines"] if l.get("issue_reason")), None))
            d["issue_notes"] = iss_d.notes if iss_d else (next((l["issue_notes"] for l in d["lines"] if l.get("issue_notes")), None))
            d["issue_flagged_by"] = iss_d.flagged_by if iss_d else (next((l["issue_flagged_by"] for l in d["lines"] if l.get("issue_flagged_by")), None))
            d["issue_flagged_at"] = iss_d.flagged_at.isoformat() if iss_d and iss_d.flagged_at else (next((l["issue_flagged_at"] for l in d["lines"] if l.get("issue_flagged_at")), None))

            if status.upper() in ["ISSUES", "NOT_FOUND"] and not is_d_issue:
                continue
            elif status.upper() == "NEEDS_ALLOCATION" and (doc_status != "NEEDS_ALLOCATION" or is_d_issue):
                continue
            elif status != "ALL" and status.upper() not in ["ISSUES", "NOT_FOUND", "NEEDS_ALLOCATION"] and doc_status != status.upper():
                continue

            doc_list.append(d)

        # Sort documents: Needs Allocation first, then most recent transaction date
        doc_list.sort(
            key=lambda x: (
                0 if x["allocation_status"] == "NEEDS_ALLOCATION" else (1 if x["allocation_status"] == "PARTIAL" else 2),
                x["transaction_date"] or ""
            ),
            reverse=False
        )

        total_count = len(doc_list)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_docs = doc_list[start_idx:end_idx]

        return {
            "items": paginated_docs,
            "total_count": total_count,
            "page": page,
            "limit": limit,
            "total_pages": (total_count + limit - 1) // limit if limit > 0 else 1
        }
    except Exception as e:
        logger.error(f"Error fetching procurement documents: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.get("/document-details")
@router.get("/document-details")
def get_document_details(
    doc_type: str = Query(..., description="PO or GRN"),
    document_no: str = Query(..., description="Document number e.g. PO-000000002"),
    db: Session = Depends(get_db)
):
    """
    Fetches an individual PO or GRN document with all its line items and real-time active allocations.
    """
    try:
        clean_doc_type = doc_type.strip().upper()
        clean_doc_no = document_no.strip()

        allocations = db.query(ProcurementAllocation)\
            .filter(
                ProcurementAllocation.status == "Active",
                ProcurementAllocation.allocation_type == clean_doc_type,
                ProcurementAllocation.source_doc_no == clean_doc_no
            ).all()

        alloc_map = {}
        for a in allocations:
            if a.sku not in alloc_map:
                alloc_map[a.sku] = []
            alloc_map[a.sku].append({
                "id": a.id,
                "project_id": a.project_id,
                "project_name": a.project_name,
                "order_id": a.order_id,
                "order_item_id": a.order_item_id,
                "fitting_code": a.fitting_code,
                "allocated_qty": a.allocated_qty,
                "unit_cost": a.unit_cost,
                "allocated_by_name": a.allocated_by_name,
                "allocated_at": a.allocated_at.isoformat() if a.allocated_at else None,
                "notes": a.notes
            })

        lines = []
        vendor_name = "Unknown Supplier"
        transaction_date = None
        order_required_date = None
        customer_name = None
        erp_status = "Open"
        total_value = 0.0

        if clean_doc_type == "PO":
            rows = db.query(PalladiumPOLine).filter(PalladiumPOLine.document_no == clean_doc_no).all()
            for r in rows:
                vendor_name = r.vendor_name or vendor_name
                transaction_date = r.transaction_date.isoformat() if r.transaction_date else transaction_date
                order_required_date = r.order_required_date.isoformat() if r.order_required_date else order_required_date
                customer_name = r.customer_name or customer_name
                erp_status = r.status or erp_status
                total_value += float(r.total_value_excl or 0.0)

                active_allocs = alloc_map.get(r.item_code, [])
                line_allocated = sum(a["allocated_qty"] for a in active_allocs)
                target_qty = float(r.order_qty or 0.0)
                rem_qty = max(0.0, target_qty - line_allocated)

                if line_allocated <= 0:
                    l_status = "NEEDS_ALLOCATION"
                elif line_allocated < target_qty:
                    l_status = "PARTIAL"
                else:
                    l_status = "FULLY_ALLOCATED"

                lines.append({
                    "id": f"PO_{r.id}",
                    "line_id": r.id,
                    "doc_type": "PO",
                    "document_no": r.document_no,
                    "vendor_name": r.vendor_name,
                    "item_code": r.item_code,
                    "item_description": r.item_description or "",
                    "item_unit": r.item_unit or "EA",
                    "total_qty": target_qty,
                    "unit_cost": float(r.unit_cost or 0.0),
                    "total_value": float(r.total_value_excl or 0.0),
                    "allocated_qty": round(line_allocated, 2),
                    "unallocated_qty": round(rem_qty, 2),
                    "allocation_status": l_status,
                    "allocations": active_allocs
                })
        else:
            rows = db.query(PalladiumGRNLine).filter(PalladiumGRNLine.document_no == clean_doc_no).all()
            for r in rows:
                vendor_name = r.vendor_name or vendor_name
                transaction_date = r.transaction_date.isoformat() if r.transaction_date else transaction_date
                erp_status = "Received"
                total_value += float(r.line_total_excl or 0.0)

                active_allocs = alloc_map.get(r.item_code, [])
                line_allocated = sum(a["allocated_qty"] for a in active_allocs)
                target_qty = float(r.received_qty or 0.0)
                rem_qty = max(0.0, target_qty - line_allocated)

                if line_allocated <= 0:
                    l_status = "NEEDS_ALLOCATION"
                elif line_allocated < target_qty:
                    l_status = "PARTIAL"
                else:
                    l_status = "FULLY_ALLOCATED"

                lines.append({
                    "id": f"GRN_{r.id}",
                    "line_id": r.id,
                    "doc_type": "GRN",
                    "document_no": r.document_no,
                    "vendor_name": r.vendor_name,
                    "item_code": r.item_code,
                    "item_description": r.item_description or "",
                    "item_unit": r.item_unit or "EA",
                    "total_qty": target_qty,
                    "unit_cost": float(r.unit_cost or 0.0),
                    "total_value": float(r.line_total_excl or 0.0),
                    "allocated_qty": round(line_allocated, 2),
                    "unallocated_qty": round(rem_qty, 2),
                    "allocation_status": l_status,
                    "allocations": active_allocs
                })

        allocated_lines = sum(1 for l in lines if l["allocation_status"] == "FULLY_ALLOCATED")
        unallocated_lines = sum(1 for l in lines if l["allocation_status"] == "NEEDS_ALLOCATION")

        if allocated_lines == len(lines) and len(lines) > 0:
            doc_status = "FULLY_ALLOCATED"
        elif unallocated_lines == len(lines):
            doc_status = "NEEDS_ALLOCATION"
        else:
            doc_status = "PARTIAL"

        return {
            "doc_type": clean_doc_type,
            "document_no": clean_doc_no,
            "vendor_name": vendor_name,
            "transaction_date": transaction_date,
            "order_required_date": order_required_date,
            "customer_name": customer_name,
            "erp_status": erp_status,
            "total_lines": len(lines),
            "allocated_lines_count": allocated_lines,
            "unallocated_lines_count": unallocated_lines,
            "total_value": round(total_value, 2),
            "allocation_status": doc_status,
            "lines": lines
        }
    except Exception as e:
        logger.error(f"Error fetching document details for {doc_type} {document_no}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.get("/candidate-orders")
@router.get("/candidate-orders")
def get_candidate_orders(
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

        # 1. Preload projects and orders for quick resolution
        all_projects = {p.id: p for p in db.query(Project).all()}
        proj_by_key = {p.project_key: p for p in all_projects.values() if p.project_key}
        all_orders = db.query(Order).all()
        order_by_id = {o.id: o for o in all_orders}

        # 2. Find matching order items by code or one_one_code or description
        order_items = db.query(OrderItem).filter(
            or_(
                OrderItem.code.ilike(f"%{clean_sku}%"),
                OrderItem.one_one_code.ilike(f"%{clean_sku}%"),
                OrderItem.description.ilike(f"%{clean_sku}%")
            )
        ).all()

        candidates = []
        for it in order_items:
            matched_order = None
            matched_proj = None

            # Check direct integer order ID
            if str(it.order_id).isdigit() and int(it.order_id) in order_by_id:
                matched_order = order_by_id[int(it.order_id)]
                matched_proj = all_projects.get(matched_order.project_id)

            # Check by project_key / slug
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
            po_ordered = int(it.po_qty_ordered or 0)
            received = int(it.received_qty or 0)
            rem = max(0, req_qty - po_ordered)

            candidates.append({
                "order_item_id": it.id,
                "order_id": matched_order.id if matched_order else None,
                "order_title": matched_order.quote_name if matched_order else (it.order_id or "General Order"),
                "project_id": matched_proj.id if matched_proj else (matched_order.project_id if matched_order else 1),
                "project_name": matched_proj.name if matched_proj else (matched_order.client_name if matched_order else "Active Project"),
                "fitting_code": it.code or it.one_one_code or clean_sku,
                "one_one_code": it.one_one_code,
                "description": it.description,
                "area": it.area or it.floor or "General",
                "requested_qty": req_qty,
                "po_qty_ordered": po_ordered,
                "received_qty": received,
                "remaining_needed": rem,
                "current_po_ref": it.po_ref,
                "unit_cost": float(it.unit_cost or 0.0),
                "unit_retail": float(it.unit_retail or 0.0)
            })

        # Sort candidates: items still needing stock first
        candidates.sort(key=lambda x: (0 if x["remaining_needed"] > 0 else 1, x["project_name"]))

        return {
            "sku": clean_sku,
            "candidate_count": len(candidates),
            "candidates": candidates
        }
    except Exception as e:
        logger.error(f"Error fetching candidate orders for SKU {sku}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.post("/allocate")
@router.post("/allocate")
def allocate_procurement_item(
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Allocates a quantity from a Palladium PO or GRN line to a Project Order Item.
    Auto-matches Project and OrderItem even if only project key/name is provided.
    Preserves Palladium ERP transaction date as po_date, vendor_name, and staff-specified ETA.
    """
    try:
        allocation_type = str(payload.get("allocation_type") or "PO").upper()
        source_doc_no = str(payload.get("source_doc_no") or "").strip()
        sku = str(payload.get("sku") or "").strip()
        project_id_input = payload.get("project_id")
        project_name = payload.get("project_name")
        order_id = payload.get("order_id")
        order_item_id = payload.get("order_item_id")
        fitting_code = payload.get("fitting_code")
        allocated_qty = float(payload.get("allocated_qty") or 0.0)
        unit_cost = float(payload.get("unit_cost") or 0.0)
        vendor_name = payload.get("vendor_name")
        doc_date = payload.get("doc_date") or payload.get("transaction_date")
        eta = payload.get("eta") or payload.get("po_eta")
        allocated_by = payload.get("allocated_by_name") or "Staff"
        notes = payload.get("notes")

        if not source_doc_no or not sku or not project_id_input or allocated_qty <= 0:
            raise HTTPException(status_code=400, detail="Missing required allocation parameters (source_doc_no, sku, project_id, allocated_qty > 0).")

        # Resolve vendor name from Palladium if missing
        if not vendor_name:
            if allocation_type == "PO":
                pal_po = db.query(PalladiumPOLine).filter(PalladiumPOLine.document_no == source_doc_no).first()
                if pal_po and pal_po.vendor_name:
                    vendor_name = pal_po.vendor_name
            elif allocation_type == "GRN":
                pal_grn = db.query(PalladiumGRNLine).filter(PalladiumGRNLine.document_no == source_doc_no).first()
                if pal_grn and pal_grn.vendor_name:
                    vendor_name = pal_grn.vendor_name

        # 1. Resolve Project Entity
        proj = None
        if str(project_id_input).isdigit():
            proj = db.query(Project).filter(Project.id == int(project_id_input)).first()
        if not proj:
            proj = db.query(Project).filter(Project.project_key == str(project_id_input)).first()
        if not proj and project_name:
            proj = db.query(Project).filter(Project.name.ilike(f"%{project_name}%")).first()

        real_proj_id = proj.id if proj else (int(project_id_input) if str(project_id_input).isdigit() else 1)
        real_proj_name = proj.name if proj else (project_name or f"Project #{real_proj_id}")

        # 2. Auto-match OrderItem
        matched_item = None
        if order_item_id:
            matched_item = db.query(OrderItem).filter(OrderItem.id == str(order_item_id)).first()
        elif proj:
            proj_items = db.query(OrderItem).filter(
                or_(
                    OrderItem.order_id.ilike(f"{proj.project_key}%"),
                    OrderItem.order_id.in_([str(o.id) for o in db.query(Order).filter(Order.project_id == real_proj_id).all()])
                )
            ).all()
            matched_item = find_best_item_match(proj_items, sku)

        # Fallback cross-project SKU match if target project has no matching items
        if not matched_item:
            cand_items = db.query(OrderItem).all()
            matched_item = find_best_item_match(cand_items, sku)
            if matched_item and matched_item.order_id:
                p_slug = str(matched_item.order_id).split("--")[0]
                found_proj = db.query(Project).filter(Project.project_key == p_slug).first()
                if found_proj:
                    real_proj_id = found_proj.id
                    real_proj_name = found_proj.name

        # Resolve order DB ID safely without crashing on string PO numbers
        resolved_order_db_id = None
        if order_id:
            if str(order_id).isdigit():
                resolved_order_db_id = int(order_id)
            else:
                ord_match = db.query(Order).filter(Order.po_number == str(order_id)).first()
                if ord_match:
                    resolved_order_db_id = ord_match.id

        if matched_item and not resolved_order_db_id:
            if matched_item.order_id:
                if str(matched_item.order_id).isdigit():
                    resolved_order_db_id = int(matched_item.order_id)
                else:
                    ord_match = db.query(Order).filter(Order.po_number == str(matched_item.order_id)).first()
                    if ord_match:
                        resolved_order_db_id = ord_match.id

        # 3. Create allocation record
        alloc = ProcurementAllocation(
            allocation_type=allocation_type,
            source_doc_no=source_doc_no,
            sku=sku,
            project_id=real_proj_id,
            project_name=real_proj_name,
            order_id=resolved_order_db_id,
            order_item_id=str(matched_item.id) if matched_item else (str(order_item_id) if order_item_id else None),
            fitting_code=fitting_code or (matched_item.code if matched_item else sku),
            allocated_qty=allocated_qty,
            unit_cost=unit_cost,
            vendor_name=vendor_name,
            doc_date=str(doc_date) if doc_date else None,
            eta=str(eta) if eta else None,
            allocated_by_name=allocated_by,
            allocated_at=datetime.now(timezone.utc),
            status="Active",
            notes=notes
        )
        db.add(alloc)

        # 4. Update OrderItem if matched
        if matched_item:
            if allocation_type == "PO":
                matched_item.po_ref = source_doc_no
                matched_item.po_qty_ordered = (matched_item.po_qty_ordered or 0) + int(allocated_qty)
                matched_item.unit_cost = unit_cost
                if vendor_name:
                    matched_item.po_supplier = vendor_name
                if doc_date:
                    matched_item.po_date = str(doc_date).split("T")[0]
                else:
                    matched_item.po_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                if eta:
                    matched_item.po_eta = str(eta)
                    matched_item.eta = str(eta)
                p_hist = list(matched_item.purchase_history or [])
                p_hist.append({
                    "id": source_doc_no,
                    "ref": source_doc_no,
                    "qty": allocated_qty,
                    "cost": unit_cost,
                    "supplier": vendor_name,
                    "date": matched_item.po_date,
                    "eta": eta,
                    "by": allocated_by
                })
                matched_item.purchase_history = p_hist
            elif allocation_type == "GRN":
                matched_item.received_qty = (matched_item.received_qty or 0) + int(allocated_qty)
                if doc_date:
                    matched_item.received_date = str(doc_date).split("T")[0]
                else:
                    matched_item.received_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                r_hist = list(matched_item.receiving_history or [])
                r_hist.append({
                    "id": source_doc_no,
                    "ref": source_doc_no,
                    "qty": allocated_qty,
                    "supplier": vendor_name,
                    "date": matched_item.received_date,
                    "by": allocated_by
                })
                matched_item.receiving_history = r_hist

        db.commit()
        logger.info(f"Allocated {allocated_qty} of {sku} from {source_doc_no} to {real_proj_name} (Order #{order_id}).")

        return {
            "status": "success",
            "message": f"Successfully allocated {allocated_qty} units from {source_doc_no} to {real_proj_name}.",
            "allocation_id": alloc.id
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating procurement allocation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.post("/batch-allocate")
@router.post("/batch-allocate")
def batch_allocate_procurement_items(
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Allocates multiple items from a PO or GRN to a single Project & Order in one transaction.
    Auto-matches SKUs to Project OrderItems and updates quantities, vendor_name, doc_date, and ETA in real time.
    """
    try:
        allocation_type = str(payload.get("allocation_type") or "PO").upper()
        source_doc_no = str(payload.get("source_doc_no") or "").strip()
        project_id_input = payload.get("project_id")
        project_name = payload.get("project_name")
        order_id = payload.get("order_id")
        vendor_name = payload.get("vendor_name")
        doc_date = payload.get("doc_date") or payload.get("transaction_date")
        eta = payload.get("eta") or payload.get("po_eta")
        allocated_by = payload.get("allocated_by_name") or "Staff"
        notes = payload.get("notes") or "Batch allocation"
        items = payload.get("items") or []

        if not source_doc_no or not project_id_input or not items:
            raise HTTPException(status_code=400, detail="Missing source_doc_no, project_id, or items list.")

        # Resolve vendor name from Palladium if missing
        if not vendor_name:
            if allocation_type == "PO":
                pal_po = db.query(PalladiumPOLine).filter(PalladiumPOLine.document_no == source_doc_no).first()
                if pal_po and pal_po.vendor_name:
                    vendor_name = pal_po.vendor_name
            elif allocation_type == "GRN":
                pal_grn = db.query(PalladiumGRNLine).filter(PalladiumGRNLine.document_no == source_doc_no).first()
                if pal_grn and pal_grn.vendor_name:
                    vendor_name = pal_grn.vendor_name

        # 1. Resolve Project Entity
        proj = None
        if str(project_id_input).isdigit():
            proj = db.query(Project).filter(Project.id == int(project_id_input)).first()
        if not proj:
            proj = db.query(Project).filter(Project.project_key == str(project_id_input)).first()
        if not proj and project_name:
            proj = db.query(Project).filter(Project.name.ilike(f"%{project_name}%")).first()

        real_proj_id = proj.id if proj else (int(project_id_input) if str(project_id_input).isdigit() else 1)
        real_proj_name = proj.name if proj else (project_name or f"Project #{real_proj_id}")

        # Preload project order items for fast SKU auto-matching
        proj_items = []
        if proj:
            proj_items = db.query(OrderItem).filter(
                or_(
                    OrderItem.order_id.ilike(f"{proj.project_key}%"),
                    OrderItem.order_id.in_([str(o.id) for o in db.query(Order).filter(Order.project_id == real_proj_id).all()])
                )
            ).all()

        p_orders = db.query(Order).filter(Order.project_id == real_proj_id).all() if proj else []

        count_allocated = 0
        for it in items:
            sku = str(it.get("sku") or "").strip()
            allocated_qty = float(it.get("allocated_qty") or 0.0)
            unit_cost = float(it.get("unit_cost") or 0.0)
            order_item_id = it.get("order_item_id")
            fitting_code = it.get("fitting_code") or sku

            if not sku or allocated_qty <= 0:
                continue

            clean_sku = sku.strip().upper()

            # Auto-match OrderItem in project
            matched_item = None
            if order_item_id:
                matched_item = db.query(OrderItem).filter(OrderItem.id == str(order_item_id)).first()
            elif proj_items:
                matched_item = find_best_item_match(proj_items, sku)

            # Fallback cross-project match if not found in selected project
            item_proj_id = real_proj_id
            item_proj_name = real_proj_name
            if not matched_item:
                all_items = db.query(OrderItem).all()
                matched_item = find_best_item_match(all_items, sku)
                if matched_item and matched_item.order_id:
                    p_slug = str(matched_item.order_id).split("--")[0]
                    found_proj = db.query(Project).filter(Project.project_key == p_slug).first()
                    if found_proj:
                        item_proj_id = found_proj.id
                        item_proj_name = found_proj.name

            # Resolve order DB ID safely without crashing on string PO numbers
            resolved_order_db_id = None
            if order_id:
                if str(order_id).isdigit():
                    resolved_order_db_id = int(order_id)
                else:
                    ord_match = db.query(Order).filter(Order.po_number == str(order_id)).first()
                    if ord_match:
                        resolved_order_db_id = ord_match.id

            if matched_item and not resolved_order_db_id:
                if matched_item.order_id:
                    if str(matched_item.order_id).isdigit():
                        resolved_order_db_id = int(matched_item.order_id)
                    else:
                        ord_match = db.query(Order).filter(Order.po_number == str(matched_item.order_id)).first()
                        if ord_match:
                            resolved_order_db_id = ord_match.id
                elif p_orders:
                    resolved_order_db_id = p_orders[0].id

            alloc = ProcurementAllocation(
                allocation_type=allocation_type,
                source_doc_no=source_doc_no,
                sku=sku,
                project_id=item_proj_id,
                project_name=item_proj_name,
                order_id=resolved_order_db_id,
                order_item_id=str(matched_item.id) if matched_item else (str(order_item_id) if order_item_id else None),
                fitting_code=fitting_code or (matched_item.code if matched_item else sku),
                allocated_qty=allocated_qty,
                unit_cost=unit_cost,
                vendor_name=vendor_name,
                doc_date=str(doc_date) if doc_date else None,
                eta=str(eta) if eta else None,
                allocated_by_name=allocated_by,
                allocated_at=datetime.now(timezone.utc),
                status="Active",
                notes=notes
            )
            db.add(alloc)

            if matched_item:
                if allocation_type == "PO":
                    matched_item.po_ref = source_doc_no
                    matched_item.po_qty_ordered = (matched_item.po_qty_ordered or 0) + int(allocated_qty)
                    matched_item.unit_cost = unit_cost
                    if vendor_name:
                        matched_item.po_supplier = vendor_name
                    if doc_date:
                        matched_item.po_date = str(doc_date).split("T")[0]
                    else:
                        matched_item.po_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                    if eta:
                        matched_item.po_eta = str(eta)
                        matched_item.eta = str(eta)
                    p_hist = list(matched_item.purchase_history or [])
                    p_hist.append({
                        "id": source_doc_no,
                        "ref": source_doc_no,
                        "qty": allocated_qty,
                        "cost": unit_cost,
                        "supplier": vendor_name,
                        "date": matched_item.po_date,
                        "eta": eta,
                        "by": allocated_by
                    })
                    matched_item.purchase_history = p_hist
                elif allocation_type == "GRN":
                    matched_item.received_qty = (matched_item.received_qty or 0) + int(allocated_qty)
                    if doc_date:
                        matched_item.received_date = str(doc_date).split("T")[0]
                    else:
                        matched_item.received_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                    r_hist = list(matched_item.receiving_history or [])
                    r_hist.append({
                        "id": source_doc_no,
                        "ref": source_doc_no,
                        "qty": allocated_qty,
                        "supplier": vendor_name,
                        "date": matched_item.received_date,
                        "by": allocated_by
                    })
                    matched_item.receiving_history = r_hist

            count_allocated += 1

        db.commit()
        logger.info(f"Batch allocated {count_allocated} items from {source_doc_no} to {real_proj_name}.")

        return {
            "status": "success",
            "message": f"Successfully allocated {count_allocated} items from {source_doc_no} to {real_proj_name}.",
            "count": count_allocated
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error in batch procurement allocation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.post("/unallocate")
@router.post("/unallocate")
def unallocate_procurement_item(
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Removes an allocation, releasing the quantity back to the unallocated pool.
    Fully synchronizes OrderItem quantities, histories, po_ref, and dates for SalesTracker.
    """
    try:
        allocation_id = payload.get("allocation_id")
        if not allocation_id:
            raise HTTPException(status_code=400, detail="Missing allocation_id.")

        alloc = db.query(ProcurementAllocation).filter(ProcurementAllocation.id == int(allocation_id)).first()
        if not alloc:
            raise HTTPException(status_code=404, detail="Allocation not found.")

        # Revert order item if linked
        order_item = None
        if alloc.order_item_id:
            order_item = db.query(OrderItem).filter(OrderItem.id == str(alloc.order_item_id)).first()
        elif alloc.project_id:
            # Fallback search by SKU in project
            proj = db.query(Project).filter(Project.id == alloc.project_id).first()
            if proj:
                clean_sku = alloc.sku.strip().upper()
                proj_items = db.query(OrderItem).filter(OrderItem.order_id.ilike(f"{proj.project_key}%")).all()
                for it in proj_items:
                    if (it.code and it.code.strip().upper() == clean_sku) or \
                       (it.one_one_code and it.one_one_code.strip().upper() == clean_sku):
                        order_item = it
                        break

        if order_item:
            if alloc.allocation_type == "PO":
                # Remove matching records from purchase_history
                cur_hist = list(order_item.purchase_history or [])
                new_hist = [
                    h for h in cur_hist 
                    if str(h.get("id") or h.get("ref") or "") != str(alloc.source_doc_no)
                ]
                order_item.purchase_history = new_hist
                new_qty = sum(float(h.get("qty") or 0) for h in new_hist)
                order_item.po_qty_ordered = int(new_qty)
                if new_hist:
                    order_item.po_ref = "; ".join(set(str(h.get("ref")) for h in new_hist if h.get("ref")))
                    dates = [h.get("date") for h in new_hist if h.get("date")]
                    order_item.po_date = max(dates) if dates else None
                    etas = [h.get("eta") for h in new_hist if h.get("eta")]
                    order_item.po_eta = max(etas) if etas else None
                    order_item.eta = order_item.po_eta
                else:
                    order_item.po_ref = None
                    order_item.po_date = None
                    order_item.po_eta = None
                    order_item.eta = None
                    order_item.po_qty_ordered = 0
            elif alloc.allocation_type == "GRN":
                # Remove matching records from receiving_history
                cur_hist = list(order_item.receiving_history or [])
                new_hist = [
                    h for h in cur_hist 
                    if str(h.get("id") or h.get("ref") or "") != str(alloc.source_doc_no)
                ]
                order_item.receiving_history = new_hist
                new_qty = sum(float(h.get("qty") or 0) for h in new_hist)
                order_item.received_qty = int(new_qty)
                if new_hist:
                    dates = [h.get("date") for h in new_hist if h.get("date")]
                    order_item.received_date = max(dates) if dates else None
                else:
                    order_item.received_date = None
                    order_item.received_qty = 0

        alloc.status = "Cancelled"
        db.commit()

        logger.info(f"Unallocated allocation #{allocation_id} ({alloc.source_doc_no} -> Project #{alloc.project_id}).")
        return {
            "status": "success",
            "message": f"Successfully unallocated {alloc.allocated_qty} units from {alloc.source_doc_no}."
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error unallocating item #{payload.get('allocation_id')}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.post("/flag-issue")
@router.post("/flag-issue")
def flag_procurement_issue(payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Flags a PO or GRN document or line item with an Issue / Not Found status.
    """
    try:
        module = str(payload.get("module") or "PO").strip().upper()
        document_no = str(payload.get("document_no") or "").strip()
        line_id = payload.get("line_id")
        sku = payload.get("sku")
        reason = str(payload.get("reason") or "Order Not Found").strip()
        notes = str(payload.get("notes") or "").strip()
        flagged_by = str(payload.get("flagged_by") or "Staff").strip()

        if not document_no:
            raise HTTPException(status_code=400, detail="Missing document_no")

        query = db.query(AllocationIssue).filter(
            AllocationIssue.module == module,
            AllocationIssue.document_no == document_no,
            AllocationIssue.status == "Open"
        )
        if line_id:
            query = query.filter(AllocationIssue.line_id == int(line_id))
        elif sku:
            query = query.filter(AllocationIssue.sku == str(sku))

        issue = query.first()
        if not issue:
            issue = AllocationIssue(
                module=module,
                document_no=document_no,
                line_id=int(line_id) if line_id else None,
                sku=str(sku) if sku else None,
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
        return {"status": "success", "message": f"{module} {document_no} flagged as '{reason}'"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error flagging procurement issue: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.post("/resolve-issue")
@router.post("/resolve-issue")
def resolve_procurement_issue(payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Resolves an Issue / Not Found flag on a PO or GRN document or line item.
    """
    try:
        module = str(payload.get("module") or "PO").strip().upper()
        document_no = str(payload.get("document_no") or "").strip()
        resolved_by = str(payload.get("resolved_by") or "Staff").strip()

        if not document_no:
            raise HTTPException(status_code=400, detail="Missing document_no")

        issues = db.query(AllocationIssue).filter(
            AllocationIssue.module == module,
            AllocationIssue.document_no == document_no,
            AllocationIssue.status == "Open"
        ).all()

        for iss in issues:
            iss.status = "Resolved"
            iss.resolved_at = datetime.now(timezone.utc)
            iss.resolved_by = resolved_by

        db.commit()
        return {"status": "success", "message": f"Issues on {module} {document_no} resolved"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error resolving procurement issue: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
