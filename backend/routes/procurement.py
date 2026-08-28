import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc

from database.cloud_sql import get_db
from models.orm_models import (
    PalladiumPOLine, 
    PalladiumGRNLine, 
    ProcurementAllocation, 
    Order, 
    OrderItem, 
    Project
)

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

        return {
            "unallocated_count": unallocated_docs,
            "partially_allocated_count": partially_allocated_docs,
            "fully_allocated_count": fully_allocated_docs,
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
                if status != "ALL" and l_status != status.upper():
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
                    "allocations": active_allocs
                })

            for r in grn_rows:
                key = f"GRN_{r.document_no}_{r.item_code}"
                active_allocs = alloc_map.get(key, [])
                total_allocated = sum(a["allocated_qty"] for a in active_allocs)
                target_qty = float(r.received_qty or 0.0)
                rem_qty = max(0.0, target_qty - total_allocated)
                l_status = "NEEDS_ALLOCATION" if total_allocated <= 0 else ("PARTIAL" if total_allocated < target_qty else "FULLY_ALLOCATED")
                if status != "ALL" and l_status != status.upper():
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

            if status != "ALL" and doc_status != status.upper():
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
    """
    try:
        clean_sku = sku.strip()
        
        # Find order items by code or description or one_one_code
        order_items = db.query(OrderItem, Order, Project)\
            .join(Order, OrderItem.order_id == func.cast(Order.id, func.text()))\
            .join(Project, Order.project_id == Project.id)\
            .filter(
                or_(
                    OrderItem.code == clean_sku,
                    OrderItem.one_one_code == clean_sku,
                    OrderItem.description.ilike(f"%{clean_sku}%")
                )
            ).all()

        candidates = []
        for item, order, proj in order_items:
            req_qty = int(item.qty or 0)
            po_ordered = int(item.po_qty_ordered or 0)
            received = int(item.received_qty or 0)
            
            candidates.append({
                "order_item_id": item.id,
                "order_id": order.id,
                "order_title": order.quote_name or f"Order #{order.id}",
                "project_id": proj.id,
                "project_name": proj.name or f"Project #{proj.id}",
                "fitting_code": item.code or item.one_one_code or clean_sku,
                "description": item.description,
                "area": item.area or item.floor or "General",
                "requested_qty": req_qty,
                "po_qty_ordered": po_ordered,
                "received_qty": received,
                "remaining_needed": max(0, req_qty - po_ordered),
                "current_po_ref": item.po_ref,
                "unit_cost": float(item.unit_cost or 0.0),
                "unit_retail": float(item.unit_retail or 0.0)
            })

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
    """
    try:
        allocation_type = str(payload.get("allocation_type") or "PO").upper()
        source_doc_no = str(payload.get("source_doc_no") or "").strip()
        sku = str(payload.get("sku") or "").strip()
        project_id = payload.get("project_id")
        project_name = payload.get("project_name")
        order_id = payload.get("order_id")
        order_item_id = payload.get("order_item_id")
        fitting_code = payload.get("fitting_code")
        allocated_qty = float(payload.get("allocated_qty") or 0.0)
        unit_cost = float(payload.get("unit_cost") or 0.0)
        allocated_by = payload.get("allocated_by_name") or "Staff"
        notes = payload.get("notes")

        if not source_doc_no or not sku or not project_id or allocated_qty <= 0:
            raise HTTPException(status_code=400, detail="Missing required allocation parameters (source_doc_no, sku, project_id, allocated_qty > 0).")

        # 1. Create allocation record
        alloc = ProcurementAllocation(
            allocation_type=allocation_type,
            source_doc_no=source_doc_no,
            sku=sku,
            project_id=int(project_id),
            project_name=project_name,
            order_id=int(order_id) if order_id else None,
            order_item_id=str(order_item_id) if order_item_id else None,
            fitting_code=fitting_code,
            allocated_qty=allocated_qty,
            unit_cost=unit_cost,
            allocated_by_name=allocated_by,
            allocated_at=datetime.now(timezone.utc),
            status="Active",
            notes=notes
        )
        db.add(alloc)

        # 2. Update OrderItem if linked
        if order_item_id:
            order_item = db.query(OrderItem).filter(OrderItem.id == str(order_item_id)).first()
            if order_item:
                if allocation_type == "PO":
                    order_item.po_ref = source_doc_no
                    order_item.po_qty_ordered = (order_item.po_qty_ordered or 0) + int(allocated_qty)
                    order_item.unit_cost = unit_cost
                    order_item.po_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                    p_hist = list(order_item.purchase_history or [])
                    p_hist.append({
                        "ref": source_doc_no,
                        "qty": allocated_qty,
                        "cost": unit_cost,
                        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
                        "by": allocated_by
                    })
                    order_item.purchase_history = p_hist
                elif allocation_type == "GRN":
                    order_item.received_qty = (order_item.received_qty or 0) + int(allocated_qty)
                    order_item.received_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                    r_hist = list(order_item.receiving_history or [])
                    r_hist.append({
                        "ref": source_doc_no,
                        "qty": allocated_qty,
                        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
                        "by": allocated_by
                    })
                    order_item.receiving_history = r_hist

        db.commit()
        logger.info(f"Allocated {allocated_qty} of {sku} from {source_doc_no} to Project #{project_id} (Order #{order_id}).")

        return {
            "status": "success",
            "message": f"Successfully allocated {allocated_qty} units from {source_doc_no} to {project_name or f'Project #{project_id}'}.",
            "allocation_id": alloc.id
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating procurement allocation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.post("/unallocate")
@router.post("/unallocate")
def unallocate_procurement_item(
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Removes an allocation, releasing the quantity back to the unallocated pool.
    """
    try:
        allocation_id = payload.get("allocation_id")
        if not allocation_id:
            raise HTTPException(status_code=400, detail="Missing allocation_id.")

        alloc = db.query(ProcurementAllocation).filter(ProcurementAllocation.id == int(allocation_id)).first()
        if not alloc:
            raise HTTPException(status_code=404, detail="Allocation not found.")

        # Revert order item if linked
        if alloc.order_item_id:
            order_item = db.query(OrderItem).filter(OrderItem.id == str(alloc.order_item_id)).first()
            if order_item:
                if alloc.allocation_type == "PO":
                    order_item.po_qty_ordered = max(0, (order_item.po_qty_ordered or 0) - int(alloc.allocated_qty))
                    if order_item.po_ref == alloc.source_doc_no:
                        order_item.po_ref = None
                elif alloc.allocation_type == "GRN":
                    order_item.received_qty = max(0, (order_item.received_qty or 0) - int(alloc.allocated_qty))

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
