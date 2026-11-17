import io
import os
import smtplib
import logging
from email.message import EmailMessage
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from database.cloud_sql import get_db
from models.orm_models import (
    PalladiumPOLine,
    ProcurementAllocation,
    Order,
    OrderItem,
    OrderPaymentAllocation,
    PalladiumInvoiceLine,
    Lead,
    Project,
    Product,
    PortalSetting,
    Client,
)

logger = logging.getLogger(__name__)
router = APIRouter()
public_router = APIRouter()

REPORT_TYPES = {
    "OPEN_POS": {"label": "Open POs", "filename": "Open_POs"},
    "PF_SENT": {"label": "PF Sent", "filename": "PF_Sent"},
    "TO_BE_INVOICED": {"label": "To Be Invoiced", "filename": "To_Be_Invoiced"},
    "SALES": {"label": "Sales", "filename": "Sales_Weekly"},
    "PIPELINE": {"label": "Pipeline", "filename": "Pipeline"},
    "STOCK": {"label": "Stock", "filename": "Stock_Valuation"},
}

DEFAULT_SCHEDULE_CONFIG = {
    "enabled": True,
    "day_of_week": "Monday",
    "time_sast": "07:00",
    "recipients": [],
    "dispatch_history": [],
}


def _matches_division(candidate: Optional[str], rep: Optional[str], division: Optional[str]) -> bool:
    """Case-insensitive substring match for Own Division / Rep scoping."""
    if not division or division.upper() == "ALL":
        return True
    div_clean = division.strip().lower()
    # Extract name inside parentheses if format is 'MODUS PROFESSIONAL ( Ryan )'
    tokens = [div_clean]
    if "(" in div_clean and ")" in div_clean:
        inner = div_clean.split("(", 1)[1].split(")", 1)[0].strip()
        if inner:
            tokens.append(inner)
    hay = f"{candidate or ''} {rep or ''}".lower()
    return any(t in hay for t in tokens if t)


def _build_open_pos(db: Session, division: Optional[str] = None) -> Dict[str, Any]:
    rows = db.query(PalladiumPOLine).filter(
        PalladiumPOLine.open_qty > 0
    ).order_by(desc(PalladiumPOLine.transaction_date)).all()

    allocs = db.query(ProcurementAllocation).filter(
        ProcurementAllocation.allocation_type == "PO",
        ProcurementAllocation.status == "Active"
    ).all()
    alloc_by_doc: Dict[str, float] = {}
    orders_by_doc: Dict[str, set] = {}
    for a in allocs:
        alloc_by_doc[a.source_doc_no] = alloc_by_doc.get(a.source_doc_no, 0.0) + float(a.allocated_qty or 0.0)
        if a.project_name:
            orders_by_doc.setdefault(a.source_doc_no, set()).add(a.project_name)

    docs: Dict[str, Dict[str, Any]] = {}
    now = datetime.now(timezone.utc).date()

    for r in rows:
        doc_no = r.document_no
        curr = (r.currency_code or "ZAR").strip().upper() or "ZAR"
        rate = float(r.exchange_rate or 1.0)
        line_val = float(r.total_value_excl or 0.0)
        if float(r.order_qty or 0.0) > 0 and float(r.open_qty or 0.0) < float(r.order_qty or 0.0):
            line_val = round(float(r.open_qty or 0.0) * float(r.unit_cost or 0.0), 2)
        zar_val = line_val * rate if (curr != "ZAR" and rate > 0 and rate != 1.0) else line_val

        if doc_no not in docs:
            tx_date = r.transaction_date.date() if r.transaction_date else None
            req_date = r.order_required_date.date() if r.order_required_date else None
            days_overdue = (now - req_date).days if (req_date and now > req_date) else 0
            docs[doc_no] = {
                "po_number": doc_no,
                "supplier": r.vendor_name or "Unknown",
                "order_date": tx_date.isoformat() if tx_date else "—",
                "eta": req_date.isoformat() if req_date else (r.line_eta or "—"),
                "days_overdue": days_overdue,
                "project_ref": r.reference or ", ".join(sorted(orders_by_doc.get(doc_no, []))) or "—",
                "open_qty": 0.0,
                "currency": curr,
                "exchange_rate": rate,
                "foreign_value": 0.0,
                "zar_value": 0.0,
                "allocated_qty": round(alloc_by_doc.get(doc_no, 0.0), 2),
            }
        docs[doc_no]["open_qty"] += float(r.open_qty or 0.0)
        docs[doc_no]["foreign_value"] += line_val if curr != "ZAR" else 0.0
        docs[doc_no]["zar_value"] += zar_val

    items = []
    for d in docs.values():
        d["open_qty"] = round(d["open_qty"], 2)
        d["foreign_value"] = round(d["foreign_value"], 2)
        d["zar_value"] = round(d["zar_value"], 2)
        d["allocation_status"] = (
            "Allocated" if d["allocated_qty"] >= d["open_qty"] > 0
            else ("Partial" if d["allocated_qty"] > 0 else "Unallocated")
        )
        items.append(d)

    total_zar = round(sum(i["zar_value"] for i in items), 2)
    overdue_count = sum(1 for i in items if i["days_overdue"] > 0)
    unallocated_count = sum(1 for i in items if i["allocation_status"] == "Unallocated")

    return {
        "report_type": "OPEN_POS",
        "title": "Open Purchase Orders",
        "kpis": [
            {"label": "Open POs", "value": len(items), "format": "number"},
            {"label": "Total Open Value (ZAR)", "value": total_zar, "format": "currency"},
            {"label": "Overdue ETAs", "value": overdue_count, "format": "number", "tone": "danger" if overdue_count else "neutral"},
            {"label": "Unallocated POs", "value": unallocated_count, "format": "number", "tone": "warning" if unallocated_count else "neutral"},
        ],
        "columns": [
            {"key": "po_number", "label": "PO #", "type": "text"},
            {"key": "supplier", "label": "Supplier", "type": "text"},
            {"key": "order_date", "label": "Order Date", "type": "text"},
            {"key": "eta", "label": "ETA", "type": "text"},
            {"key": "days_overdue", "label": "Days Overdue", "type": "number"},
            {"key": "project_ref", "label": "Project / Reference", "type": "text"},
            {"key": "open_qty", "label": "Open Qty", "type": "number"},
            {"key": "currency", "label": "Curr", "type": "text"},
            {"key": "foreign_value", "label": "Foreign Ref", "type": "number"},
            {"key": "zar_value", "label": "ZAR Value (Excl)", "type": "currency"},
            {"key": "allocation_status", "label": "Allocation", "type": "badge"},
        ],
        "rows": items,
    }


def _build_pf_sent(db: Session, division: Optional[str] = None) -> Dict[str, Any]:
    orders = db.query(Order).all()
    pay_allocs = db.query(OrderPaymentAllocation).all()
    paid_by_order: Dict[int, float] = {}
    for pa in pay_allocs:
        if pa.order_id:
            paid_by_order[pa.order_id] = paid_by_order.get(pa.order_id, 0.0) + float(pa.amount_allocated or 0.0)

    now = datetime.now(timezone.utc).date()
    rows = []

    for o in orders:
        if not _matches_division(o.division, o.one_one_rep or o.pm_name, division):
            continue
        first_pf = getattr(o, "first_pf_sent_date", None) or o.pf_date
        last_pf = getattr(o, "last_pf_sent_date", None) or o.pf_date
        is_pf_status = (o.status or "").lower() in ("proforma sent", "pf sent", "awaiting deposit", "quoted")
        if not (first_pf or last_pf or is_pf_status):
            continue

        order_val = float(o.value or 0.0)
        paid_val = max(float(o.paid or 0.0), paid_by_order.get(o.id, 0.0))
        balance_due = max(0.0, round(order_val - paid_val, 2))

        # Auto-clear once paid in full or invoiced status
        if paid_val >= order_val > 0 or (o.status or "").lower() in ("complete", "cancelled", "closed"):
            continue

        days_waiting = 0
        ref_date_str = first_pf or last_pf
        if ref_date_str:
            try:
                d_obj = datetime.fromisoformat(str(ref_date_str).split("T")[0]).date()
                days_waiting = max(0, (now - d_obj).days)
            except Exception:
                pass

        rows.append({
            "po_number": o.po_number or f"ORD-{o.id}",
            "project_client": f"{o.quote_name or 'Order'} ({o.client_name or o.client or 'Client'})",
            "rep_division": o.division or o.one_one_rep or o.pm_name or "Unassigned",
            "first_pf_date": str(first_pf).split("T")[0] if first_pf else "—",
            "last_pf_date": str(last_pf).split("T")[0] if last_pf else "—",
            "revision_count": int(getattr(o, "pf_revision_count", 0) or (1 if (first_pf or last_pf) else 0)),
            "days_waiting": days_waiting,
            "order_value": round(order_val, 2),
            "deposit_paid": round(paid_val, 2),
            "balance_due": balance_due,
            "status": "Deposit Partial" if paid_val > 0 else "Awaiting Deposit",
        })

    rows.sort(key=lambda x: x["days_waiting"], reverse=True)
    total_due = round(sum(r["balance_due"] for r in rows), 2)
    aged_30 = sum(1 for r in rows if r["days_waiting"] > 30)

    return {
        "report_type": "PF_SENT",
        "title": "PF Sent (Deduplicated Active Proformas)",
        "kpis": [
            {"label": "Active PFs Awaiting Payment", "value": len(rows), "format": "number"},
            {"label": "Total Balance Due (ZAR)", "value": total_due, "format": "currency"},
            {"label": "Aged > 30 Days", "value": aged_30, "format": "number", "tone": "warning" if aged_30 else "neutral"},
        ],
        "columns": [
            {"key": "po_number", "label": "Order #", "type": "text"},
            {"key": "project_client", "label": "Project / Client", "type": "text"},
            {"key": "rep_division", "label": "Division / Rep", "type": "text"},
            {"key": "first_pf_date", "label": "First PF Date", "type": "text"},
            {"key": "last_pf_date", "label": "Latest Follow-Up", "type": "text"},
            {"key": "revision_count", "label": "Rev #", "type": "number"},
            {"key": "days_waiting", "label": "Days Waiting", "type": "number"},
            {"key": "order_value", "label": "Order Value", "type": "currency"},
            {"key": "deposit_paid", "label": "Paid", "type": "currency"},
            {"key": "balance_due", "label": "Balance Due", "type": "currency"},
            {"key": "status", "label": "Status", "type": "badge"},
        ],
        "rows": rows,
    }


def _build_to_be_invoiced(db: Session, division: Optional[str] = None) -> Dict[str, Any]:
    orders = db.query(Order).all()
    all_items = db.query(OrderItem).all()
    items_by_order: Dict[str, List[OrderItem]] = {}
    for it in all_items:
        if it.order_id:
            items_by_order.setdefault(str(it.order_id), []).append(it)

    rows = []
    for o in orders:
        if not _matches_division(o.division, o.one_one_rep or o.pm_name, division):
            continue
        if (o.status or "").lower() in ("cancelled", "lost", "draft"):
            continue
        o_items = items_by_order.get(str(o.po_number), [])
        order_val = float(o.value or 0.0)
        invoiced_val = sum(float(it.invoice_value or 0.0) for it in o_items)
        to_be_invoiced = round(max(0.0, order_val - invoiced_val), 2)
        if to_be_invoiced <= 1.0:
            continue

        total_qty = sum(max(0.0, float(it.qty or 0.0)) for it in o_items)
        ready_qty = sum(
            max(0.0, float(it.qty or 0.0))
            for it in o_items
            if (it.stock_status or "").lower() in ("in stock", "stock", "received", "ready")
        )
        stock_ready_pct = round((ready_qty / total_qty) * 100) if total_qty > 0 else 0

        rows.append({
            "po_number": o.po_number or f"ORD-{o.id}",
            "project_client": f"{o.quote_name or 'Order'} ({o.client_name or o.client or 'Client'})",
            "rep_division": o.division or o.one_one_rep or o.pm_name or "Unassigned",
            "order_value": round(order_val, 2),
            "already_invoiced": round(invoiced_val, 2),
            "to_be_invoiced": to_be_invoiced,
            "stock_ready_pct": f"{stock_ready_pct}%",
            "eta": o.eta or o.expected_delivery_date or "—",
            "expected_month": o.expected_deposit_month or "—",
        })

    rows.sort(key=lambda x: x["to_be_invoiced"], reverse=True)
    total_tbi = round(sum(r["to_be_invoiced"] for r in rows), 2)

    return {
        "report_type": "TO_BE_INVOICED",
        "title": "To Be Invoiced",
        "kpis": [
            {"label": "Orders To Be Invoiced", "value": len(rows), "format": "number"},
            {"label": "Total Un-Invoiced (ZAR)", "value": total_tbi, "format": "currency"},
        ],
        "columns": [
            {"key": "po_number", "label": "Order #", "type": "text"},
            {"key": "project_client", "label": "Project / Client", "type": "text"},
            {"key": "rep_division", "label": "Division / Rep", "type": "text"},
            {"key": "order_value", "label": "Order Value", "type": "currency"},
            {"key": "already_invoiced", "label": "Invoiced", "type": "currency"},
            {"key": "to_be_invoiced", "label": "To Be Invoiced", "type": "currency"},
            {"key": "stock_ready_pct", "label": "Stock Ready", "type": "text"},
            {"key": "eta", "label": "Next ETA", "type": "text"},
            {"key": "expected_month", "label": "Expected Month", "type": "text"},
        ],
        "rows": rows,
    }


def _build_sales(db: Session, division: Optional[str] = None) -> Dict[str, Any]:
    lines = db.query(PalladiumInvoiceLine).order_by(desc(PalladiumInvoiceLine.transaction_date)).limit(1500).all()
    now = datetime.now(timezone.utc).date()
    week_ago = now - timedelta(days=7)
    month_start = now.replace(day=1)

    docs: Dict[str, Dict[str, Any]] = {}
    for l in lines:
        if not _matches_division(l.sales_rep, l.sales_rep, division):
            continue
        doc_no = l.document_no
        if doc_no not in docs:
            tx_date = l.transaction_date.date() if l.transaction_date else None
            docs[doc_no] = {
                "document_no": doc_no,
                "tx_date": tx_date,
                "date_str": tx_date.isoformat() if tx_date else "—",
                "client": l.customer_name or "General Client",
                "reference": l.reference or "—",
                "sales_rep": l.sales_rep or "Unassigned",
                "total_excl": float(l.document_subtotal or 0.0),
            }

    rows = []
    week_total = 0.0
    mtd_total = 0.0
    for d in docs.values():
        tx = d["tx_date"]
        if tx and tx >= week_ago:
            week_total += d["total_excl"]
        if tx and tx >= month_start:
            mtd_total += d["total_excl"]
        if tx and tx >= month_start - timedelta(days=35):
            rows.append({
                "document_no": d["document_no"],
                "date": d["date_str"],
                "client": d["client"],
                "reference": d["reference"],
                "sales_rep": d["sales_rep"],
                "amount_excl": round(d["total_excl"], 2),
                "period": "This Week" if (tx >= week_ago) else ("This Month" if tx >= month_start else "Prior"),
            })

    return {
        "report_type": "SALES",
        "title": "Weekly & MTD Sales (Palladium Tax Invoices)",
        "kpis": [
            {"label": "Last 7 Days Sales (Excl)", "value": round(week_total, 2), "format": "currency"},
            {"label": "MTD Sales (Excl)", "value": round(mtd_total, 2), "format": "currency"},
            {"label": "Recent Documents", "value": len(rows), "format": "number"},
        ],
        "columns": [
            {"key": "document_no", "label": "Invoice / CN #", "type": "text"},
            {"key": "date", "label": "Date", "type": "text"},
            {"key": "client", "label": "Client", "type": "text"},
            {"key": "reference", "label": "Reference", "type": "text"},
            {"key": "sales_rep", "label": "Sales Rep", "type": "text"},
            {"key": "amount_excl", "label": "Amount (Excl)", "type": "currency"},
            {"key": "period", "label": "Window", "type": "badge"},
        ],
        "rows": rows,
    }


def _build_pipeline(db: Session, division: Optional[str] = None) -> Dict[str, Any]:
    leads = db.query(Lead).all()
    clients = {c.id: c.name for c in db.query(Client).all()}
    orders = db.query(Order).filter(Order.status.in_(["Draft", "Quote", "Quoted", "Proforma Sent", "PF Sent"])).all()

    rows = []
    for ld in leads:
        if (ld.pipeline_status or "").lower() in ("won", "lost"):
            continue
        rows.append({
            "name": ld.title,
            "client": clients.get(ld.client_id, "—"),
            "rep_division": "Pipeline Lead",
            "stage": ld.pipeline_status or "Enquiry",
            "quote_date": "—",
            "value_excl": round(float(ld.value or 0.0), 2),
        })

    for o in orders:
        if not _matches_division(o.division, o.one_one_rep or o.pm_name, division):
            continue
        rows.append({
            "name": f"{o.po_number or ''} {o.quote_name or 'Order'}".strip(),
            "client": o.client_name or o.client or "—",
            "rep_division": o.division or o.one_one_rep or o.pm_name or "Unassigned",
            "stage": o.status or "Quoted",
            "quote_date": o.quotation_sent_date or o.order_date or "—",
            "value_excl": round(float(o.value or 0.0), 2),
        })

    rows.sort(key=lambda x: x["value_excl"], reverse=True)
    total_pipe = round(sum(r["value_excl"] for r in rows), 2)

    return {
        "report_type": "PIPELINE",
        "title": "Active Sales Pipeline",
        "kpis": [
            {"label": "Open Opportunities", "value": len(rows), "format": "number"},
            {"label": "Total Pipeline (Excl)", "value": total_pipe, "format": "currency"},
        ],
        "columns": [
            {"key": "name", "label": "Project / Opportunity", "type": "text"},
            {"key": "client", "label": "Client", "type": "text"},
            {"key": "rep_division", "label": "Division / Rep", "type": "text"},
            {"key": "stage", "label": "Stage", "type": "badge"},
            {"key": "quote_date", "label": "Quote Date", "type": "text"},
            {"key": "value_excl", "label": "Pipeline Value (Excl)", "type": "currency"},
        ],
        "rows": rows,
    }


def _build_stock(db: Session, division: Optional[str] = None) -> Dict[str, Any]:
    products = db.query(Product).filter(Product.is_active.isnot(False)).all()
    rows = []
    total_cost_val = 0.0
    total_retail_val = 0.0
    low_stock_count = 0
    out_of_stock_count = 0

    for p in products:
        soh = float(p.stock_on_hand if p.stock_on_hand is not None else (p.stock_level or 0))
        cost = float(p.cost_price or 0.0)
        retail = float(p.retail_price or 0.0)
        reorder = float(p.reorder_level or 0.0)
        cost_val = round(max(0.0, soh) * cost, 2)
        retail_val = round(max(0.0, soh) * retail, 2)
        total_cost_val += cost_val
        total_retail_val += retail_val

        if soh <= 0:
            st = "Out of Stock"
            out_of_stock_count += 1
        elif reorder > 0 and soh <= reorder:
            st = "Low Stock"
            low_stock_count += 1
        else:
            st = "In Stock"

        if soh > 0 or st == "Low Stock":
            rows.append({
                "sku": p.sku or "—",
                "one_to_one_code": p.one_to_one_code or "—",
                "name": p.name or "—",
                "brand": p.brand or p.supplier_name or "—",
                "category": p.category or "—",
                "stock_on_hand": round(soh, 2),
                "unit_cost": round(cost, 2),
                "cost_valuation": cost_val,
                "retail_valuation": retail_val,
                "status": st,
            })

    rows.sort(key=lambda x: x["cost_valuation"], reverse=True)

    return {
        "report_type": "STOCK",
        "title": "Stock On Hand & Valuation",
        "kpis": [
            {"label": "Total Cost Valuation", "value": round(total_cost_val, 2), "format": "currency"},
            {"label": "Total Retail Valuation", "value": round(total_retail_val, 2), "format": "currency"},
            {"label": "Low Stock SKUs", "value": low_stock_count, "format": "number", "tone": "warning" if low_stock_count else "neutral"},
            {"label": "Out of Stock SKUs", "value": out_of_stock_count, "format": "number", "tone": "danger" if out_of_stock_count else "neutral"},
        ],
        "columns": [
            {"key": "sku", "label": "SKU", "type": "text"},
            {"key": "one_to_one_code", "label": "1:1 Code", "type": "text"},
            {"key": "name", "label": "Description", "type": "text"},
            {"key": "brand", "label": "Brand / Supplier", "type": "text"},
            {"key": "category", "label": "Category", "type": "text"},
            {"key": "stock_on_hand", "label": "Stock Qty", "type": "number"},
            {"key": "unit_cost", "label": "Unit Cost", "type": "currency"},
            {"key": "cost_valuation", "label": "Cost Valuation", "type": "currency"},
            {"key": "retail_valuation", "label": "Retail Valuation", "type": "currency"},
            {"key": "status", "label": "Status", "type": "badge"},
        ],
        "rows": rows[:500],
    }


REPORT_BUILDERS = {
    "OPEN_POS": _build_open_pos,
    "PF_SENT": _build_pf_sent,
    "TO_BE_INVOICED": _build_to_be_invoiced,
    "SALES": _build_sales,
    "PIPELINE": _build_pipeline,
    "STOCK": _build_stock,
}


def _build_report_xlsx_bytes(report: Dict[str, Any]) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = report["title"][:31]

    # Title Banner
    ws["A1"] = f"1-to-1 Lighting — {report['title']}"
    ws["A1"].font = Font(name="Calibri", size=14, bold=True, color="0F172A")
    ws["A2"] = f"Generated: {datetime.now(timezone.utc).strftime('%d %b %Y %H:%M UTC')}"
    ws["A2"].font = Font(name="Calibri", size=10, italic=True, color="64748B")

    header_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    header_font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    thin_border = Border(bottom=Side(style="thin", color="CBD5E1"))

    cols = report["columns"]
    header_row_idx = 4
    for c_idx, col in enumerate(cols, start=1):
        cell = ws.cell(row=header_row_idx, column=c_idx, value=col["label"])
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="right" if col["type"] in ("currency", "number") else "left", vertical="center")

    for r_idx, row_data in enumerate(report["rows"], start=header_row_idx + 1):
        for c_idx, col in enumerate(cols, start=1):
            val = row_data.get(col["key"])
            cell = ws.cell(row=r_idx, column=c_idx, value=val)
            cell.border = thin_border
            if col["type"] == "currency":
                cell.number_format = 'R #,##0.00'
                cell.alignment = Alignment(horizontal="right")
            elif col["type"] == "number":
                cell.number_format = '#,##0.##'
                cell.alignment = Alignment(horizontal="right")

    # Totals Row
    if report["rows"]:
        tot_row_idx = header_row_idx + len(report["rows"]) + 1
        ws.cell(row=tot_row_idx, column=1, value="TOTAL").font = Font(bold=True)
        for c_idx, col in enumerate(cols, start=1):
            if col["type"] in ("currency", "number") and col["key"] not in ("days_overdue", "days_waiting", "revision_count", "exchange_rate", "unit_cost"):
                col_letter = get_column_letter(c_idx)
                c_cell = ws.cell(
                    row=tot_row_idx,
                    column=c_idx,
                    value=f"=SUM({col_letter}{header_row_idx + 1}:{col_letter}{tot_row_idx - 1})"
                )
                c_cell.font = Font(bold=True)
                if col["type"] == "currency":
                    c_cell.number_format = 'R #,##0.00'

    # Auto-fit columns
    for c_idx, col in enumerate(cols, start=1):
        max_len = len(col["label"])
        for row_data in report["rows"][:100]:
            max_len = max(max_len, len(str(row_data.get(col["key"]) or "")))
        ws.column_dimensions[get_column_letter(c_idx)].width = min(max_len + 5, 42)

    ws.freeze_panes = "A5"
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


@public_router.get("/weekly-data")
@router.get("/weekly-data")
def get_weekly_report_data(
    report_type: str = Query("ALL"),
    scope: str = Query("ALL"),
    division: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    div_filter = division if scope.upper() == "OWN" and division else None
    rt = report_type.upper()

    if rt == "ALL":
        return {
            key: builder(db, div_filter)
            for key, builder in REPORT_BUILDERS.items()
        }

    if rt not in REPORT_BUILDERS:
        raise HTTPException(status_code=400, detail=f"Invalid report_type: {report_type}")

    return REPORT_BUILDERS[rt](db, div_filter)


@public_router.get("/export-excel")
@router.get("/export-excel")
def export_weekly_report_excel(
    report_type: str = Query(...),
    scope: str = Query("ALL"),
    division: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    rt = report_type.upper()
    if rt not in REPORT_BUILDERS:
        raise HTTPException(status_code=400, detail=f"Invalid report_type: {report_type}")

    div_filter = division if scope.upper() == "OWN" and division else None
    report = REPORT_BUILDERS[rt](db, div_filter)
    xlsx_bytes = _build_report_xlsx_bytes(report)
    fname = f"{REPORT_TYPES[rt]['filename']}_{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.xlsx"

    return StreamingResponse(
        io.BytesIO(xlsx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'}
    )


@public_router.get("/schedule-config")
@router.get("/schedule-config")
def get_schedule_config(db: Session = Depends(get_db)):
    setting = db.query(PortalSetting).filter(PortalSetting.key == "weekly_reports_config").first()
    cfg = dict(DEFAULT_SCHEDULE_CONFIG)
    if setting and isinstance(setting.value, dict):
        cfg.update(setting.value)
    cfg["smtp_configured"] = bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_USER") and os.getenv("SMTP_PASSWORD"))
    return cfg


@public_router.post("/schedule-config")
@router.post("/schedule-config")
def save_schedule_config(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    setting = db.query(PortalSetting).filter(PortalSetting.key == "weekly_reports_config").first()
    existing = dict(DEFAULT_SCHEDULE_CONFIG)
    if setting and isinstance(setting.value, dict):
        existing.update(setting.value)

    for k in ("enabled", "day_of_week", "time_sast", "recipients"):
        if k in payload:
            existing[k] = payload[k]

    if not setting:
        setting = PortalSetting(key="weekly_reports_config", value=existing)
        db.add(setting)
    else:
        setting.value = existing
    db.commit()
    return {"status": "ok", "config": existing}


@public_router.post("/log-pf-sent")
@router.post("/log-pf-sent")
def log_pf_sent(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    po_number = payload.get("po_number")
    if not po_number:
        raise HTTPException(status_code=400, detail="po_number is required")
    order = db.query(Order).filter(Order.po_number == po_number).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not getattr(order, "first_pf_sent_date", None):
        order.first_pf_sent_date = order.pf_date or today_str
    order.last_pf_sent_date = today_str
    order.pf_date = today_str
    order.pf_revision_count = int(getattr(order, "pf_revision_count", 0) or 0) + 1
    db.commit()
    return {
        "status": "ok",
        "po_number": order.po_number,
        "first_pf_sent_date": order.first_pf_sent_date,
        "last_pf_sent_date": order.last_pf_sent_date,
        "pf_revision_count": order.pf_revision_count,
    }


@public_router.post("/weekly-dispatch")
@router.post("/weekly-dispatch")
def dispatch_weekly_reports(payload: Dict[str, Any] = Body(default={}), db: Session = Depends(get_db)):
    setting = db.query(PortalSetting).filter(PortalSetting.key == "weekly_reports_config").first()
    cfg = dict(DEFAULT_SCHEDULE_CONFIG)
    if setting and isinstance(setting.value, dict):
        cfg.update(setting.value)

    target_recipient_id = payload.get("recipient_id")
    recipients = [
        r for r in (cfg.get("recipients") or [])
        if r.get("active", True) and r.get("email") and (not target_recipient_id or r.get("id") == target_recipient_id)
    ]
    if not recipients:
        raise HTTPException(status_code=400, detail="No active recipients configured with an email address.")

    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT") or 587)
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM") or smtp_user

    if not (smtp_host and smtp_user and smtp_pass):
        return {
            "status": "smtp_not_configured",
            "message": "SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASSWORD) are not yet set on Cloud Run. Reports were generated & validated in dry-run mode.",
            "would_send_to": [
                {"name": r.get("name"), "email": r.get("email"), "reports": r.get("reports", []), "scope": r.get("scope", "ALL")}
                for r in recipients
            ],
        }

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    sent_results = []

    with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)

        for rec in recipients:
            rep_keys = [rk for rk in (rec.get("reports") or []) if rk in REPORT_BUILDERS]
            if not rep_keys:
                continue

            div_filter = rec.get("division") if (rec.get("scope") == "OWN" and rec.get("division")) else None
            msg = EmailMessage()
            msg["Subject"] = f"1-to-1 Weekly Action Reports ({today_str})"
            msg["From"] = smtp_from
            msg["To"] = rec["email"]

            html_sections = [f"<h2>1-to-1 Weekly Action Reports &mdash; {today_str}</h2><p>Hi {rec.get('name') or 'Team'},</p><p>Attached are your weekly Excel reports:</p><ul>"]
            for rk in rep_keys:
                report = REPORT_BUILDERS[rk](db, div_filter)
                xlsx_bytes = _build_report_xlsx_bytes(report)
                fname = f"{REPORT_TYPES[rk]['filename']}_{today_str}.xlsx"
                msg.add_attachment(
                    xlsx_bytes,
                    maintype="application",
                    subtype="vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    filename=fname,
                )
                kpi_summary = " | ".join(
                    f"{k['label']}: R {k['value']:,.2f}" if k.get("format") == "currency" else f"{k['label']}: {k['value']}"
                    for k in report["kpis"]
                )
                html_sections.append(f"<li><strong>{report['title']}</strong> ({len(report['rows'])} rows) &mdash; {kpi_summary}</li>")
            html_sections.append("</ul><p>Regards,<br/>1-to-1 Portal Automation</p>")
            msg.add_alternative("".join(html_sections), subtype="html")
            server.send_message(msg)
            sent_results.append({"email": rec["email"], "reports": rep_keys})

    history = list(cfg.get("dispatch_history") or [])
    history.insert(0, {"timestamp": datetime.now(timezone.utc).isoformat(), "sent_count": len(sent_results), "details": sent_results})
    cfg["dispatch_history"] = history[:20]
    if setting:
        setting.value = cfg
        db.commit()

    return {"status": "sent", "sent_count": len(sent_results), "results": sent_results}
