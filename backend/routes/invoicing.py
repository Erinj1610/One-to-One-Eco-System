import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_, and_

from database.cloud_sql import get_db
from models.orm_models import (
    PalladiumInvoiceLine,
    ProcurementAllocation,
    Project,
    Order,
    OrderItem
)
from services.palladium_sync import sync_palladium_sales_invoices

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/invoicing", tags=["Invoicing"])
public_router = APIRouter(prefix="/api/invoicing", tags=["Invoicing Public"])


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

        return {
            "total_documents": len(doc_stats),
            "total_lines": len(all_lines),
            "unallocated_count": unallocated_cnt,
            "partially_allocated_count": partially_allocated_cnt,
            "fully_allocated_count": fully_allocated_cnt,
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
    tab: str = Query("all"), # "all", "needs_allocation", "partially_allocated", "fully_allocated"
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
                    "sales_rep": line.sales_rep,
                    "lines_count": 0,
                    "total_qty": 0.0,
                    "allocated_qty": 0.0,
                    "total_value_excl": 0.0,
                    "lines_sample": []
                }
            
            line_qty = abs(float(line.qty or 0.0))
            allocated = min(line_qty, alloc_map.get((d_no, line.item_code), 0.0))

            docs_grouped[d_no]["lines_count"] += 1
            docs_grouped[d_no]["total_qty"] += line_qty
            docs_grouped[d_no]["allocated_qty"] += allocated
            docs_grouped[d_no]["total_value_excl"] += float(line.line_total_excl or 0.0)
            
            if len(docs_grouped[d_no]["lines_sample"]) < 4:
                docs_grouped[d_no]["lines_sample"].append({
                    "sku": line.item_code,
                    "description": line.item_description,
                    "qty": line_qty,
                    "unit_price_excl": float(line.unit_price_excl or 0.0)
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
            d["total_value_excl"] = round(d["total_value_excl"], 2)

            if tab == "needs_allocation" and status != "Needs Allocation":
                continue
            if tab == "partially_allocated" and status != "Partially Allocated":
                continue
            if tab == "fully_allocated" and status != "Fully Allocated":
                continue

            filtered_docs.append(d)

        # Sort descending by transaction date
        filtered_docs.sort(key=lambda x: x.get("transaction_date") or "", reverse=True)

        total_count = len(filtered_docs)
        total_pages = max(1, (total_count + page_size - 1) // page_size)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_docs = filtered_docs[start_idx:end_idx]

        return {
            "total_documents": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "documents": paginated_docs
        }
    except Exception as e:
        logger.error(f"Error listing invoicing documents: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.get("/document/{document_no}")
@router.get("/document/{document_no}")
def get_invoicing_document_details(document_no: str, db: Session = Depends(get_db)):
    """
    Returns full details for a single invoice document, including all line items and their active allocations.
    """
    try:
        lines = db.query(PalladiumInvoiceLine).filter(PalladiumInvoiceLine.document_no == document_no).all()
        if not lines:
            raise HTTPException(status_code=404, detail=f"Invoice document {document_no} not found.")

        first_line = lines[0]
        allocs = db.query(ProcurementAllocation).filter(
            ProcurementAllocation.allocation_type == "INVOICE",
            ProcurementAllocation.source_doc_no == document_no,
            ProcurementAllocation.status == "Active"
        ).all()

        alloc_by_sku = {}
        for a in allocs:
            alloc_by_sku.setdefault(a.sku, []).append({
                "id": a.id,
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

            doc_total_qty += line_qty
            doc_total_allocated += min(line_qty, total_alloc_qty)
            doc_total_val += float(line.line_total_excl or 0.0)

            parsed_lines.append({
                "line_id": line.id,
                "item_code": line.item_code,
                "item_description": line.item_description,
                "item_unit": line.item_unit or "EA",
                "invoiced_qty": line_qty,
                "unit_price_excl": float(line.unit_price_excl or 0.0),
                "unit_price_incl": float(line.unit_price_incl or 0.0),
                "line_total_excl": float(line.line_total_excl or 0.0),
                "line_total_incl": float(line.line_total_incl or 0.0),
                "allocated_qty": total_alloc_qty,
                "unallocated_qty": unalloc_qty,
                "status": l_status,
                "allocations": sku_allocs
            })

        return {
            "document_no": document_no,
            "doc_type": "INVOICE" if not document_no.startswith("CN-") else "CREDIT_NOTE",
            "customer_code": first_line.customer_code,
            "customer_name": first_line.customer_name or "General Client",
            "reference": first_line.reference,
            "transaction_date": first_line.transaction_date.isoformat() if first_line.transaction_date else None,
            "currency_code": first_line.currency_code or "ZAR",
            "sales_rep": first_line.sales_rep,
            "total_qty": doc_total_qty,
            "allocated_qty": doc_total_allocated,
            "unallocated_qty": max(0.0, doc_total_qty - doc_total_allocated),
            "total_value_excl": round(doc_total_val, 2),
            "lines": parsed_lines
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching invoice document details for {document_no}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


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
        project_name = payload.get("project_name")
        order_id = payload.get("order_id")
        order_item_id = payload.get("order_item_id")
        fitting_code = payload.get("fitting_code")
        allocated_qty = float(payload.get("allocated_qty") or 0.0)
        unit_cost = float(payload.get("unit_cost") or 0.0) # unit price
        doc_date = payload.get("doc_date") or payload.get("transaction_date")
        allocated_by = payload.get("allocated_by_name") or "Staff"
        notes = payload.get("notes")

        if not source_doc_no or not sku or not project_id_input or allocated_qty <= 0:
            raise HTTPException(status_code=400, detail="Missing required allocation parameters.")

        # Resolve Project Entity
        proj = None
        if str(project_id_input).isdigit():
            proj = db.query(Project).filter(Project.id == int(project_id_input)).first()
        if not proj:
            proj = db.query(Project).filter(Project.project_key == str(project_id_input)).first()
        if not proj and project_name:
            proj = db.query(Project).filter(Project.name.ilike(f"%{project_name}%")).first()

        real_proj_id = proj.id if proj else (int(project_id_input) if str(project_id_input).isdigit() else 1)
        real_proj_name = proj.name if proj else (project_name or f"Project #{real_proj_id}")

        clean_sku = sku.strip().upper()
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
            for it in proj_items:
                if (it.code and it.code.strip().upper() == clean_sku) or \
                   (it.one_one_code and it.one_one_code.strip().upper() == clean_sku) or \
                   (it.description and clean_sku in it.description.upper()):
                    matched_item = it
                    break

        if not matched_item:
            cand_items = db.query(OrderItem).filter(
                or_(
                    OrderItem.code.ilike(f"%{clean_sku}%"),
                    OrderItem.one_one_code.ilike(f"%{clean_sku}%")
                )
            ).all()
            if cand_items:
                matched_item = cand_items[0]
                if matched_item.order_id:
                    p_slug = str(matched_item.order_id).split("--")[0]
                    found_proj = db.query(Project).filter(Project.project_key == p_slug).first()
                    if found_proj:
                        real_proj_id = found_proj.id
                        real_proj_name = found_proj.name

        if matched_item and not order_id:
            if str(matched_item.order_id).isdigit():
                order_id = int(matched_item.order_id)
            else:
                ord_match = db.query(Order).filter(Order.po_number == str(matched_item.order_id)).first()
                if ord_match:
                    order_id = ord_match.id

        alloc = ProcurementAllocation(
            allocation_type="INVOICE",
            source_doc_no=source_doc_no,
            sku=sku,
            project_id=real_proj_id,
            project_name=real_proj_name,
            order_id=int(order_id) if order_id else None,
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

        if matched_item:
            matched_item.invoice_ref = source_doc_no
            matched_item.invoice_qty = (matched_item.invoice_qty or 0) + int(allocated_qty)
            if doc_date:
                matched_item.invoice_date = str(doc_date).split("T")[0]
            else:
                matched_item.invoice_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            
            matched_item.invoice_value = (matched_item.invoice_value or 0.0) + float(allocated_qty * unit_cost)
            
            i_hist = list(matched_item.invoice_history or [])
            i_hist.append({
                "id": source_doc_no,
                "ref": source_doc_no,
                "qty": allocated_qty,
                "unitPrice": unit_cost,
                "total": round(allocated_qty * unit_cost, 2),
                "date": matched_item.invoice_date,
                "by": allocated_by
            })
            matched_item.invoice_history = i_hist

        db.commit()
        logger.info(f"Allocated invoice {source_doc_no} (qty {allocated_qty}) to {real_proj_name}.")
        return {
            "status": "success",
            "message": f"Successfully allocated {allocated_qty} units from {source_doc_no} to {real_proj_name}.",
            "allocation_id": alloc.id
        }
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
        project_name = payload.get("project_name")
        order_id = payload.get("order_id")
        doc_date = payload.get("doc_date") or payload.get("transaction_date")
        allocated_by = payload.get("allocated_by_name") or "Staff"
        notes = payload.get("notes") or "Batch invoice allocation"
        items = payload.get("items") or []

        if not source_doc_no or not project_id_input or not items:
            raise HTTPException(status_code=400, detail="Missing source_doc_no, project_id, or items list.")

        # Resolve Project Entity
        proj = None
        if str(project_id_input).isdigit():
            proj = db.query(Project).filter(Project.id == int(project_id_input)).first()
        if not proj:
            proj = db.query(Project).filter(Project.project_key == str(project_id_input)).first()
        if not proj and project_name:
            proj = db.query(Project).filter(Project.name.ilike(f"%{project_name}%")).first()

        real_proj_id = proj.id if proj else (int(project_id_input) if str(project_id_input).isdigit() else 1)
        real_proj_name = proj.name if proj else (project_name or f"Project #{real_proj_id}")

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
            matched_item = None
            if order_item_id:
                matched_item = db.query(OrderItem).filter(OrderItem.id == str(order_item_id)).first()
            elif proj_items:
                for p_item in proj_items:
                    if (p_item.code and p_item.code.strip().upper() == clean_sku) or \
                       (p_item.one_one_code and p_item.one_one_code.strip().upper() == clean_sku) or \
                       (p_item.description and clean_sku in p_item.description.upper()):
                        matched_item = p_item
                        break

            item_proj_id = real_proj_id
            item_proj_name = real_proj_name
            if not matched_item:
                cand_items = db.query(OrderItem).filter(
                    or_(
                        OrderItem.code.ilike(f"%{clean_sku}%"),
                        OrderItem.one_one_code.ilike(f"%{clean_sku}%")
                    )
                ).all()
                if cand_items:
                    matched_item = cand_items[0]
                    if matched_item.order_id:
                        p_slug = str(matched_item.order_id).split("--")[0]
                        found_proj = db.query(Project).filter(Project.project_key == p_slug).first()
                        if found_proj:
                            item_proj_id = found_proj.id
                            item_proj_name = found_proj.name

            item_order_id = order_id
            if matched_item and not item_order_id:
                if str(matched_item.order_id).isdigit():
                    item_order_id = int(matched_item.order_id)
                elif p_orders:
                    item_order_id = p_orders[0].id
                else:
                    ord_match = db.query(Order).filter(Order.po_number == str(matched_item.order_id)).first()
                    if ord_match:
                        item_order_id = ord_match.id

            alloc = ProcurementAllocation(
                allocation_type="INVOICE",
                source_doc_no=source_doc_no,
                sku=sku,
                project_id=item_proj_id,
                project_name=item_proj_name,
                order_id=int(item_order_id) if item_order_id else None,
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

            if matched_item:
                matched_item.invoice_ref = source_doc_no
                matched_item.invoice_qty = (matched_item.invoice_qty or 0) + int(allocated_qty)
                if doc_date:
                    matched_item.invoice_date = str(doc_date).split("T")[0]
                else:
                    matched_item.invoice_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                
                matched_item.invoice_value = (matched_item.invoice_value or 0.0) + float(allocated_qty * unit_cost)
                
                i_hist = list(matched_item.invoice_history or [])
                i_hist.append({
                    "id": source_doc_no,
                    "ref": source_doc_no,
                    "qty": allocated_qty,
                    "unitPrice": unit_cost,
                    "total": round(allocated_qty * unit_cost, 2),
                    "date": matched_item.invoice_date,
                    "by": allocated_by
                })
                matched_item.invoice_history = i_hist

            count_allocated += 1

        db.commit()
        logger.info(f"Batch allocated {count_allocated} invoice items from {source_doc_no} to {real_proj_name}.")
        return {
            "status": "success",
            "message": f"Successfully allocated {count_allocated} items from {source_doc_no} to {real_proj_name}.",
            "count": count_allocated
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error in batch invoice allocation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@public_router.post("/unallocate")
@router.post("/unallocate")
def unallocate_invoicing_item(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Cancels an active invoice allocation and updates OrderItem invoice_qty and invoice_history.
    """
    try:
        allocation_id = payload.get("allocation_id")
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
                    OrderItem.code.ilike(f"%{clean_sku}%"),
                    OrderItem.one_one_code.ilike(f"%{clean_sku}%")
                )
            ).all()
            if cand_items:
                matched_item = cand_items[0]

        if matched_item:
            i_hist = list(matched_item.invoice_history or [])
            new_hist = [h for h in i_hist if h.get("id") != alloc.source_doc_no and h.get("ref") != alloc.source_doc_no]
            matched_item.invoice_history = new_hist
            matched_item.invoice_qty = sum(int(h.get("qty") or 0) for h in new_hist)
            matched_item.invoice_value = sum(float(h.get("total") or 0.0) for h in new_hist)
            
            if new_hist:
                matched_item.invoice_ref = "; ".join(set(str(h.get("ref")) for h in new_hist if h.get("ref")))
            else:
                matched_item.invoice_ref = None
                matched_item.invoice_date = None

        db.commit()
        logger.info(f"Unallocated invoice #{allocation_id} for {alloc.sku} ({alloc.source_doc_no}).")
        return {
            "status": "success",
            "message": f"Successfully unallocated {alloc.sku} from {alloc.source_doc_no}."
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error unallocating invoice item: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
