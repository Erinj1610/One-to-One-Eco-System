import os
import re
import json
import logging
import urllib.request
import ssl
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, Any, List, Optional, Generator
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from pydantic import BaseModel

from database.cloud_sql import get_db
from models.orm_models import (
    Product, PalladiumPOLine, PalladiumGRNLine,
    PalladiumInvoiceLine, PalladiumPayment,
    PortalSetting, User, Role,
    Project, Order, OrderItem, Client,
    LogisticsPackingList, LogisticsDeliveryNote,
    WorkflowTicket, ProjectTicket, SupportTicket
)
from services.firebase_auth import verify_firebase_token
from services.technical_pack_service import get_gcp_access_token, _SSL_CTX, PROJECT_ID, LOCATION

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/management-ai", tags=["management-ai"])
public_router = APIRouter(prefix="/management-ai", tags=["management-ai-public"])

# Default Vertex AI Model
GEMINI_MODEL = "gemini-3.8-flash"
GEMINI_LOCATION = "global"

AVAILABLE_MODELS = {
    "gemini-3.8-flash": {"location": "global", "label": "Gemini 3.8 Flash (Fast Reasoning + Agentic Tools)"},
    "gemini-2.5-pro": {"location": "us-central1", "label": "Gemini 2.5 Pro (Deep Analytical Reasoning)"},
    "gemini-2.5-flash": {"location": "us-central1", "label": "Gemini 2.5 Flash (Balanced Speed & SQL)"}
}

# --------------------------------------------------------------------------
# BUILT-IN SPECIALIST AGENTS + CUSTOM AGENT REGISTRY
# --------------------------------------------------------------------------
BUILTIN_AGENTS: List[Dict[str, Any]] = [
    {
        "id": "executive-all",
        "name": "Executive Master Agent",
        "category": "google",
        "icon": "Sparkles",
        "color": "#8b5cf6",
        "model": "gemini-3.8-flash",
        "description": "Full autonomous access to Palladium ERP, Sales, Margin KPIs, Procurement, Stock, Projects, and Logistics via live SQL & multi-step reasoning.",
        "system_prompt": (
            "You are the One to One World Executive Master Agent. You have full autonomous access to live Cloud SQL "
            "tables across Palladium ERP (invoices, credit notes, purchase orders, GRNs, customer payments, inventory) "
            "and Portal Operations (projects, quotations/orders, packing lists, delivery notes, CRM clients, tickets). "
            "Always run real SQL aggregations or tool calls to compute exact totals, rankings, margins, and variances."
        ),
        "suggested_prompts": [
            {
                "title": "Executive Revenue & KPI Summary",
                "desc": "Live invoiced sales, credit notes, receipts & division budgets",
                "query": "Run a full executive financial analysis: show our total invoiced sales, credit notes, and customer receipts by month for the last 6 months, and compare against our FY 2026-2027 division budgets."
            },
            {
                "title": "Top 10 Clients & Outstanding Balances",
                "desc": "Full SQL aggregation across all Palladium invoices & receipts",
                "query": "Who are our top 10 clients by total invoiced revenue in Palladium, how much have they paid in receipts, and what orders do they currently have active in the portal?"
            },
            {
                "title": "Overdue Supplier POs & Project Impact",
                "desc": "Open Palladium POs grouped by vendor & affected projects",
                "query": "Query all open Palladium purchase orders where open_qty > 0. Group them by vendor, show total outstanding value by currency, and list the oldest overdue POs."
            },
            {
                "title": "Logistics & Dispatch Bottlenecks",
                "desc": "Orders awaiting packing, pending PLs, and dispatched DNs",
                "query": "Check our portal orders and logistics tables: which active orders have items remaining to pack or deliver, and what packing lists are currently Pending Dispatch?"
            }
        ]
    },
    {
        "id": "deep-sql-analyst",
        "name": "Data Insights & SQL Analyst",
        "category": "google",
        "icon": "Database",
        "color": "#06b6d4",
        "model": "gemini-3.8-flash",
        "description": "Writes and executes multi-table PostgreSQL queries (SUM, GROUP BY, JOIN, window functions) across all 6,500+ products and ERP transactions.",
        "system_prompt": (
            "You are the Data Insights & SQL Analyst Agent for One to One World. "
            "Prioritize using `tool_execute_readonly_sql` to write exact PostgreSQL aggregation queries (`SUM`, `COUNT`, `AVG`, `GROUP BY`, `JOIN`) "
            "so that every number you report is computed across 100% of matching database rows, never a small sample. "
            "Include clear markdown tables and key takeaways."
        ),
        "suggested_prompts": [
            {
                "title": "Sales Rep Leaderboard",
                "desc": "Exact SQL aggregation of invoiced revenue by sales rep",
                "query": "Write a SQL query on palladium_invoice_lines to rank all sales reps by total net invoiced revenue (excluding credit notes vs including credit notes), total invoice count, and average invoice value."
            },
            {
                "title": "Deadstock & High-Valuation Inventory",
                "desc": "Cross-check stock valuation against historical invoice lines",
                "query": "Run a SQL query joining products with palladium_invoice_lines to find the top 15 highest-valuation stock items (stock_on_hand * cost_price) that have had zero invoiced sales in the last 90 days."
            },
            {
                "title": "Product Margin & Pricing Audit",
                "desc": "Analyze trade/retail margins across product families",
                "query": "Analyze our products catalog using SQL: group by brand or category, and show item count, total stock on hand valuation, and average markup/margin between cost_price and retail_price."
            },
            {
                "title": "Monthly Cashflow: Invoiced vs Collected",
                "desc": "Compare monthly Palladium billing vs tblCustPay receipts",
                "query": "Compare monthly total invoiced amounts in palladium_invoice_lines against monthly customer payments in palladium_payments over the last 12 months."
            }
        ]
    },
    {
        "id": "procurement-stock",
        "name": "Procurement & Inventory Agent",
        "category": "google",
        "icon": "Boxes",
        "color": "#f59e0b",
        "model": "gemini-3.8-flash",
        "description": "Monitors supplier Purchase Orders, Goods Received Notes (GRNs), stock-outs, reorder levels, and factory lead times.",
        "system_prompt": (
            "You are the Procurement, Supply Chain & Inventory Agent for One to One World. "
            "Focus on supplier purchase orders (`palladium_po_lines`), goods received (`palladium_grn_lines`), "
            "procurement allocations (`procurement_allocations`), and warehouse stock (`products`). "
            "Highlight stock shortages, overdue vendor deliveries, and high-capital stock."
        ),
        "suggested_prompts": [
            {
                "title": "Vendor Open PO Exposure",
                "desc": "Summary of open POs by supplier and currency",
                "query": "Summarize all open Purchase Orders grouped by vendor_name and currency_code, showing total open lines, total open_qty, and total_value_excl."
            },
            {
                "title": "Recent Goods Received (GRNs)",
                "desc": "Latest warehouse deliveries logged in Palladium",
                "query": "What Goods Received Notes (GRNs) have been logged most recently in palladium_grn_lines? Show vendor, document number, items, received quantities, and references."
            },
            {
                "title": "Allocated Stock vs Physical On-Hand",
                "desc": "Items where demand exceeds available stock",
                "query": "Find all active products where stock_allocated > 0 or stock_on_order > 0, and show their stock_on_hand, stock_available, stock_allocated, and stock_on_order."
            }
        ]
    },
    {
        "id": "logistics-operations",
        "name": "Projects & Logistics Tracker",
        "category": "google",
        "icon": "TrendingUp",
        "color": "#10b981",
        "model": "gemini-3.8-flash",
        "description": "Tracks live portal Projects, Quotations/Orders, Packing Lists, Delivery Notes, POD status, and site snag tickets.",
        "system_prompt": (
            "You are the Projects & Logistics Operations Agent for One to One World. "
            "Focus on live portal `projects`, `orders`, `order_items`, `logistics_packing_lists`, `logistics_delivery_notes`, "
            "and `project_tickets`. Give exact order numbers, packing list numbers, delivery note statuses, and item backorders."
        ),
        "suggested_prompts": [
            {
                "title": "Active Packing Lists & Delivery Notes",
                "desc": "Live status of warehouse PLs and dispatched DNs",
                "query": "Show all Logistics Packing Lists and Delivery Notes in the system, including their document numbers, order PO numbers, status, box counts, and whether POD is received."
            },
            {
                "title": "Project Pipeline & Order Status",
                "desc": "Overview of active projects, PMs, and order values",
                "query": "List our active projects and orders in the portal with their project manager (pm_name), client, status, order value, and paid vs outstanding amounts."
            },
            {
                "title": "Open Site Tickets & Workflow Bottlenecks",
                "desc": "Inspect workflow_tickets and project_tickets",
                "query": "Check workflow_tickets and project_tickets: what tickets are currently open or pending, who are they assigned to, and which projects are affected?"
            }
        ]
    }
]


# --------------------------------------------------------------------------
# DATABASE SCHEMA DOCUMENTATION FOR AUTONOMOUS SQL AGENT
# --------------------------------------------------------------------------
CLOUD_SQL_SCHEMA_DOCS = """
POSTGRESQL DATABASE SCHEMA (Cloud SQL Live Mirror):

1. `palladium_invoice_lines` (Sales Invoices & Credit Notes from Palladium biSalesAnalysis)
   - id (INT), document_no (VARCHAR, e.g. 'IN-000000483', 'CN-000000001'), customer_code (VARCHAR), customer_name (VARCHAR)
   - reference (VARCHAR), item_code (VARCHAR), item_description (TEXT), item_unit (VARCHAR)
   - qty (FLOAT), unit_price_excl (FLOAT), unit_price_incl (FLOAT), line_total_excl (FLOAT), line_total_incl (FLOAT)
   - document_subtotal (FLOAT), document_discount (FLOAT), document_total (FLOAT)
   - transaction_date (TIMESTAMP), currency_code (VARCHAR), exchange_rate (FLOAT), is_foreign_currency (BOOL)
   - sales_rep (VARCHAR), last_synced_at (TIMESTAMP)

2. `palladium_po_lines` (Supplier Purchase Orders from Palladium biPurchaseOrders)
   - id (INT), document_no (VARCHAR, e.g. 'PO-000000388'), vendor_name (VARCHAR), item_code (VARCHAR), item_description (TEXT)
   - order_qty (FLOAT), open_qty (FLOAT), shipped_qty (FLOAT), unit_cost (FLOAT), total_value_excl (FLOAT)
   - currency_code (VARCHAR), exchange_rate (FLOAT), transaction_date (TIMESTAMP), order_required_date (TIMESTAMP)
   - reference (VARCHAR), status (VARCHAR: 'Open', 'Closed', 'Partial'), customer_name (VARCHAR), last_synced_at (TIMESTAMP)

3. `palladium_grn_lines` (Goods Received Notes from Palladium)
   - id (INT), document_no (VARCHAR), vendor_name (VARCHAR), item_code (VARCHAR), item_description (TEXT)
   - received_qty (FLOAT), unit_cost (FLOAT), line_total_excl (FLOAT), line_total_incl (FLOAT)
   - transaction_date (TIMESTAMP), location (VARCHAR), currency_code (VARCHAR), reference (VARCHAR)

4. `palladium_payments` (Customer Receipts / Deposits from Palladium tblCustPay)
   - id (INT), palladium_payment_id (BIGINT), receipt_no (VARCHAR, e.g. 'RC-000000674'), payment_date (TIMESTAMP)
   - customer_code (VARCHAR), customer_name (VARCHAR), amount (FLOAT), reference (VARCHAR)
   - payment_method (VARCHAR), captured_by (VARCHAR), currency_code (VARCHAR), is_reversed (BOOL)

5. `products` (Master Product Catalog & Live Palladium Warehouse Stock)
   - id (INT), sku (VARCHAR), one_to_one_code (VARCHAR), name (VARCHAR), brand (VARCHAR), family (VARCHAR), category (VARCHAR)
   - supplier_name (VARCHAR), cost_price (FLOAT), supplier_cost (FLOAT), trade_price (FLOAT), retail_price (FLOAT)
   - stock_on_hand (FLOAT), stock_available (FLOAT), stock_allocated (FLOAT), stock_on_order (FLOAT), reorder_level (INT)
   - lead_time (VARCHAR), color (VARCHAR), kelvin (VARCHAR), beam_angle (VARCHAR), ip_rating (VARCHAR), fitting_type (VARCHAR)
   - first_fix (VARCHAR), red_list (VARCHAR), is_active (BOOL), palladium_status (VARCHAR)

6. `projects` (Portal Projects)
   - id (INT), project_key (VARCHAR), name (VARCHAR), client_name (VARCHAR), pm_name (VARCHAR), offering (VARCHAR)
   - status (VARCHAR), complete_status (VARCHAR), start_date (VARCHAR), deadline (VARCHAR)
   - design_fee (FLOAT), outstanding_amount (FLOAT), target_margin (FLOAT), actual_margin (FLOAT)

7. `orders` (Portal Quotations & Client Orders)
   - id (INT), po_number (VARCHAR, e.g. 'Q-2026-0660'), project_id (INT), project_key (VARCHAR), quote_name (VARCHAR)
   - client_name (VARCHAR), client_company (VARCHAR), pm_name (VARCHAR), one_one_rep (VARCHAR), division (VARCHAR)
   - status (VARCHAR), items_count (INT), value (FLOAT), paid (FLOAT), outstanding (FLOAT), discount (FLOAT)
   - order_date (VARCHAR), pf_date (VARCHAR), expected_delivery_date (VARCHAR), delivery_address (VARCHAR)

8. `order_items` (Line Items inside Portal Quotations/Orders)
   - id (VARCHAR), order_id (VARCHAR - matches orders.po_number or orders.id::text), qty (INT), code (VARCHAR), one_one_code (VARCHAR)
   - description (VARCHAR), floor (VARCHAR), area (VARCHAR), brand (VARCHAR), supplier (VARCHAR)
   - unit_cost (FLOAT), unit_trade (FLOAT), unit_retail (FLOAT), stock_status (VARCHAR), eta (VARCHAR)
   - po_ref (VARCHAR), po_qty_ordered (INT), received_qty (INT), invoice_qty (INT), delivery_qty (INT), delivery_status (VARCHAR)

9. `logistics_packing_lists` & `logistics_packing_list_items`
   - `logistics_packing_lists`: id (INT), document_number (VARCHAR, e.g. 'PL-2026-0001'), project_key (VARCHAR), order_id (INT), order_po_number (VARCHAR), status (VARCHAR: 'Draft', 'Pending Dispatch', 'Dispatched', 'Delivered', 'Cancelled'), total_boxes (INT), total_items (INT), delivery_note_number (VARCHAR), created_by (VARCHAR), created_at (TIMESTAMP)
   - `logistics_packing_list_items`: id (INT), packing_list_id (INT), order_item_id (VARCHAR), parent_item_id (VARCHAR), one_one_code (VARCHAR), description (TEXT), qty_ordered (INT), qty_packed (INT), qty_backorder (INT), box_number (VARCHAR), is_accessory (BOOL)

10. `logistics_delivery_notes` & `logistics_delivery_note_items`
    - `logistics_delivery_notes`: id (INT), document_number (VARCHAR, e.g. 'DN-2026-0001'), project_key (VARCHAR), order_id (INT), order_po_number (VARCHAR), status (VARCHAR), delivery_type (VARCHAR), dispatch_method (VARCHAR), carrier_driver (VARCHAR), delivery_address (TEXT), received_by (VARCHAR), pod_received (BOOL), dispatched_at (TIMESTAMP)
    - `logistics_delivery_note_items`: id (INT), delivery_note_id (INT), packing_list_number (VARCHAR), one_one_code (VARCHAR), description (TEXT), box_number (VARCHAR), qty_ordered (INT), qty_delivered (INT), qty_remaining (INT)

11. `clients` (CRM Clients)
    - id (INT), name (VARCHAR), company (VARCHAR), email (VARCHAR), phone (VARCHAR), status (VARCHAR), type (VARCHAR), lifetime_revenue (FLOAT), annual_revenue (FLOAT)

12. `workflow_tickets` & `project_tickets` & `support_tickets`
    - `workflow_tickets`: id (INT), project_key (VARCHAR), stage_name (VARCHAR), assigned_to (VARCHAR), assigned_role (VARCHAR), priority (VARCHAR), status (VARCHAR), action_note (TEXT), created_at (TIMESTAMP)
    - `project_tickets`: id (INT), ticket_number (VARCHAR), project_name (VARCHAR), client_name (VARCHAR), pm_name (VARCHAR), stage (VARCHAR), title (VARCHAR), priority (VARCHAR), status (VARCHAR), cost_impact (FLOAT)
"""


# --------------------------------------------------------------------------
# HELPER: Check Management / Admin Authorization
# --------------------------------------------------------------------------
def is_management_authorized(db: Session, current_user: dict) -> bool:
    email = (current_user.get("email") or "").strip().lower()
    role_claim = (current_user.get("role") or "").strip().lower()
    if role_claim in ("admin", "management", "director", "executive"):
        return True
    if email in [
        "admin@onetoone.co.za", "erin@onetoone.co.za",
        "erin.jones@1-to-1.world", "staff@onetoone.co.za"
    ]:
        return True
    db_user = db.query(User).filter(User.email.ilike(email)).first()
    if db_user and db_user.role_id:
        role = db.query(Role).filter(Role.id == db_user.role_id).first()
        if role and role.name.lower() in ("admin", "management", "director", "executive"):
            return True
    return False


# --------------------------------------------------------------------------
# CUSTOM AGENTS STORAGE HELPERS (PERSISTED IN CLOUD SQL PORTAL_SETTINGS)
# --------------------------------------------------------------------------
CUSTOM_AGENTS_KEY = "management_ai_custom_agents"

def get_all_agents(db: Session) -> List[Dict[str, Any]]:
    setting = db.query(PortalSetting).filter(PortalSetting.key == CUSTOM_AGENTS_KEY).first()
    custom_list = []
    if setting and isinstance(setting.value, list):
        custom_list = setting.value
    return BUILTIN_AGENTS + custom_list


# --------------------------------------------------------------------------
# TOOL IMPLEMENTATIONS (REAL SQL + ERP & PORTAL TOOLS)
# --------------------------------------------------------------------------

def _serialize_val(val: Any) -> Any:
    if val is None:
        return None
    if isinstance(val, (datetime,)):
        return val.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(val, Decimal):
        return float(round(val, 2))
    if isinstance(val, float):
        return round(val, 2)
    if isinstance(val, (dict, list, int, bool, str)):
        return val
    return str(val)


def tool_execute_readonly_sql(db: Session, sql_query: str, explanation: Optional[str] = None) -> Dict[str, Any]:
    """
    Executes a safe, read-only PostgreSQL SELECT / WITH query directly against Cloud SQL.
    Allows true aggregations (SUM, COUNT, AVG, GROUP BY, JOIN, ORDER BY) across the entire database.
    """
    if not sql_query or not sql_query.strip():
        return {"error": "SQL query cannot be empty."}

    cleaned = sql_query.strip().rstrip(";")

    # Strip SQL comments for validation
    no_comments = re.sub(r"--.*?$", "", cleaned, flags=re.MULTILINE)
    no_comments = re.sub(r"/\*.*?\*/", "", no_comments, flags=re.DOTALL).strip()

    first_word = no_comments.split()[0].upper() if no_comments.split() else ""
    if first_word not in ("SELECT", "WITH"):
        return {"error": "Only read-only SELECT or WITH (CTE) queries are permitted."}

    # Block any mutating or administrative keywords
    forbidden_pattern = r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|COPY|EXECUTE|CALL|PG_SLEEP)\b"
    if re.search(forbidden_pattern, no_comments, flags=re.IGNORECASE):
        return {"error": "Query rejected: Mutating or administrative SQL keywords are strictly forbidden."}

    # Prevent multiple statements
    if ";" in no_comments:
        return {"error": "Query rejected: Only a single SQL statement may be executed per call."}

    # Enforce row cap so huge unaggregated dumps don't blow up context
    if not re.search(r"\bLIMIT\s+\d+", no_comments, flags=re.IGNORECASE):
        cleaned = f"SELECT * FROM ({cleaned}) AS _subq LIMIT 250"

    try:
        result = db.execute(text(cleaned))
        columns = list(result.keys())
        raw_rows = result.fetchall()
        rows = []
        for r in raw_rows[:250]:
            row_dict = {}
            for idx, col in enumerate(columns):
                row_dict[col] = _serialize_val(r[idx])
            rows.append(row_dict)

        return {
            "executed_sql": cleaned,
            "explanation": explanation or "Read-only SQL query executed on Cloud SQL",
            "row_count": len(rows),
            "columns": columns,
            "rows": rows
        }
    except Exception as e:
        db.rollback()
        logger.warning(f"AI SQL execution error: {e} | Query: {cleaned}")
        return {
            "error": f"PostgreSQL Error: {str(e)}",
            "attempted_sql": cleaned,
            "hint": "Check column names against the provided CLOUD_SQL_SCHEMA_DOCS and retry."
        }


def tool_get_sync_status(db: Session) -> Dict[str, Any]:
    """Retrieves the timestamp and record counts of the last Palladium ERP sync and live portal tables."""
    setting = db.query(PortalSetting).filter(PortalSetting.key == "palladium_sync_status").first()
    latest_inv = db.query(PalladiumInvoiceLine.last_synced_at).order_by(PalladiumInvoiceLine.last_synced_at.desc()).first()
    total_products = db.query(Product).count()
    total_pos = db.query(PalladiumPOLine).count()
    total_grns = db.query(PalladiumGRNLine).count()
    total_invoices = db.query(PalladiumInvoiceLine).count()
    total_payments = db.query(PalladiumPayment).count()
    total_projects = db.query(Project).count()
    total_orders = db.query(Order).count()
    total_pls = db.query(LogisticsPackingList).count()
    total_dns = db.query(LogisticsDeliveryNote).count()

    synced_dt = None
    if setting and isinstance(setting.value, dict) and setting.value.get("last_synced_at"):
        synced_dt = setting.value.get("last_synced_at")
    elif latest_inv and latest_inv[0]:
        synced_dt = latest_inv[0].strftime("%Y-%m-%d %H:%M:%S UTC")

    return {
        "last_synced_at": synced_dt or "Within the last 30 minutes (Auto-sync active)",
        "auto_sync_active": True,
        "counts": {
            "products_in_catalog": total_products,
            "purchase_order_lines": total_pos,
            "grn_lines": total_grns,
            "sales_invoice_lines": total_invoices,
            "customer_receipts": total_payments,
            "portal_projects": total_projects,
            "portal_orders": total_orders,
            "packing_lists": total_pls,
            "delivery_notes": total_dns
        }
    }


def tool_query_sales_and_invoices(
    db: Session,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    customer: Optional[str] = None,
    sales_rep: Optional[str] = None,
    document_type: Optional[str] = None,
    limit: int = 50
) -> Dict[str, Any]:
    """Queries sales invoices, credit notes, and true SQL aggregates across ALL matching Palladium biSalesAnalysis rows."""
    query = db.query(PalladiumInvoiceLine)

    if date_from:
        try:
            dt = datetime.strptime(date_from[:10], "%Y-%m-%d")
            query = query.filter(PalladiumInvoiceLine.transaction_date >= dt)
        except Exception:
            pass
    if date_to:
        try:
            dt = datetime.strptime(date_to[:10], "%Y-%m-%d")
            query = query.filter(PalladiumInvoiceLine.transaction_date <= dt)
        except Exception:
            pass
    if customer:
        query = query.filter(
            (PalladiumInvoiceLine.customer_name.ilike(f"%{customer}%")) |
            (PalladiumInvoiceLine.customer_code.ilike(f"%{customer}%"))
        )
    if sales_rep:
        query = query.filter(PalladiumInvoiceLine.sales_rep.ilike(f"%{sales_rep}%"))

    if document_type == 'invoice':
        query = query.filter(PalladiumInvoiceLine.document_no.ilike("IN-%"))
    elif document_type == 'credit_note':
        query = query.filter(
            (PalladiumInvoiceLine.document_no.ilike("CN-%")) |
            (PalladiumInvoiceLine.document_no.ilike("CR-%")) |
            (PalladiumInvoiceLine.line_total_excl < 0)
        )

    # True SQL aggregation across ALL matching rows (not just the sample limit!)
    agg = query.with_entities(
        func.count(PalladiumInvoiceLine.id),
        func.coalesce(func.sum(PalladiumInvoiceLine.line_total_excl), 0.0),
        func.coalesce(func.sum(PalladiumInvoiceLine.line_total_incl), 0.0),
        func.count(func.distinct(PalladiumInvoiceLine.document_no)),
        func.count(func.distinct(PalladiumInvoiceLine.customer_code))
    ).first()

    total_count = agg[0] if agg else 0
    grand_total_excl = float(agg[1] or 0.0) if agg else 0.0
    grand_total_incl = float(agg[2] or 0.0) if agg else 0.0
    distinct_docs = agg[3] if agg else 0
    distinct_customers = agg[4] if agg else 0

    safe_limit = min(max(int(limit or 50), 1), 150)
    rows = query.order_by(PalladiumInvoiceLine.transaction_date.desc()).limit(safe_limit).all()

    items = []
    for r in rows:
        items.append({
            "document_no": r.document_no,
            "customer_code": r.customer_code,
            "customer_name": r.customer_name,
            "reference": r.reference,
            "item_code": r.item_code,
            "item_description": r.item_description,
            "qty": r.qty,
            "unit_price_excl": r.unit_price_excl,
            "line_total_excl": r.line_total_excl,
            "line_total_incl": r.line_total_incl,
            "sales_rep": r.sales_rep,
            "date": r.transaction_date.strftime("%Y-%m-%d") if r.transaction_date else None,
            "currency_code": r.currency_code
        })

    return {
        "total_matching_line_items": total_count,
        "distinct_documents_count": distinct_docs,
        "distinct_customers_count": distinct_customers,
        "grand_total_excl_zar_all_matching": round(grand_total_excl, 2),
        "grand_total_incl_zar_all_matching": round(grand_total_incl, 2),
        "returned_sample_records": len(items),
        "records": items
    }


def tool_query_purchase_orders(
    db: Session,
    status: Optional[str] = None,
    vendor: Optional[str] = None,
    item_search: Optional[str] = None,
    overdue_only: bool = False,
    limit: int = 50
) -> Dict[str, Any]:
    """Queries Purchase Orders from Palladium biPurchaseOrders with full SQL aggregates across all matching rows."""
    query = db.query(PalladiumPOLine)
    if status and status.lower() != 'all':
        if status.lower() == 'open':
            query = query.filter(PalladiumPOLine.open_qty > 0)
        else:
            query = query.filter(PalladiumPOLine.status.ilike(f"%{status}%"))
    if vendor:
        query = query.filter(PalladiumPOLine.vendor_name.ilike(f"%{vendor}%"))
    if item_search:
        query = query.filter(
            (PalladiumPOLine.item_code.ilike(f"%{item_search}%")) |
            (PalladiumPOLine.item_description.ilike(f"%{item_search}%"))
        )
    if overdue_only:
        now_dt = datetime.now()
        query = query.filter(
            PalladiumPOLine.open_qty > 0,
            PalladiumPOLine.order_required_date < now_dt
        )

    agg = query.with_entities(
        func.count(PalladiumPOLine.id),
        func.coalesce(func.sum(PalladiumPOLine.total_value_excl), 0.0),
        func.coalesce(func.sum(PalladiumPOLine.open_qty), 0.0),
        func.count(func.distinct(PalladiumPOLine.document_no))
    ).first()

    total_count = agg[0] if agg else 0
    grand_total_val = float(agg[1] or 0.0) if agg else 0.0
    grand_total_open_qty = float(agg[2] or 0.0) if agg else 0.0
    distinct_pos = agg[3] if agg else 0

    safe_limit = min(max(int(limit or 50), 1), 150)
    rows = query.order_by(PalladiumPOLine.transaction_date.desc()).limit(safe_limit).all()

    items = []
    for r in rows:
        items.append({
            "document_no": r.document_no,
            "vendor_name": r.vendor_name,
            "item_code": r.item_code,
            "item_description": r.item_description,
            "order_qty": r.order_qty,
            "open_qty": r.open_qty,
            "shipped_qty": r.shipped_qty,
            "unit_cost": r.unit_cost,
            "total_value_excl": r.total_value_excl,
            "currency_code": r.currency_code,
            "transaction_date": r.transaction_date.strftime("%Y-%m-%d") if r.transaction_date else None,
            "required_date": r.order_required_date.strftime("%Y-%m-%d") if r.order_required_date else None,
            "reference": r.reference,
            "status": r.status
        })

    return {
        "total_matching_po_lines": total_count,
        "distinct_po_documents": distinct_pos,
        "grand_total_value_excl_all_matching": round(grand_total_val, 2),
        "grand_total_open_qty_all_matching": round(grand_total_open_qty, 2),
        "returned_sample_records": len(items),
        "records": items
    }


def tool_query_inventory(
    db: Session,
    search: Optional[str] = None,
    category: Optional[str] = None,
    family: Optional[str] = None,
    stock_status: Optional[str] = None,
    limit: int = 50
) -> Dict[str, Any]:
    """Queries inventory items, physical on-hand stock, allocated stock, and full SQL stock valuation."""
    query = db.query(Product).filter(Product.is_active == True)
    if search:
        query = query.filter(
            (Product.sku.ilike(f"%{search}%")) |
            (Product.one_to_one_code.ilike(f"%{search}%")) |
            (Product.name.ilike(f"%{search}%")) |
            (Product.brand.ilike(f"%{search}%")) |
            (Product.supplier_name.ilike(f"%{search}%"))
        )
    if category and category != 'All':
        query = query.filter(Product.category.ilike(f"%{category}%"))
    if family and family != 'All':
        query = query.filter(Product.family.ilike(f"%{family}%"))

    if stock_status == 'low_stock':
        query = query.filter(Product.stock_on_hand > 0, Product.stock_on_hand <= Product.reorder_level)
    elif stock_status == 'out_of_stock':
        query = query.filter(Product.stock_on_hand <= 0)
    elif stock_status == 'in_stock':
        query = query.filter(Product.stock_on_hand > 0)

    agg = query.with_entities(
        func.count(Product.id),
        func.coalesce(func.sum(Product.stock_on_hand * Product.cost_price), 0.0),
        func.coalesce(func.sum(Product.stock_on_hand), 0.0)
    ).first()

    total_count = agg[0] if agg else 0
    grand_total_valuation = float(agg[1] or 0.0) if agg else 0.0
    grand_total_units = float(agg[2] or 0.0) if agg else 0.0

    safe_limit = min(max(int(limit or 50), 1), 150)
    rows = query.order_by((Product.stock_on_hand * Product.cost_price).desc().nullslast()).limit(safe_limit).all()

    items = []
    for p in rows:
        on_hand = p.stock_on_hand if p.stock_on_hand is not None else float(p.stock_level or 0)
        cost = p.cost_price or 0.0
        val = round(on_hand * cost, 2)

        items.append({
            "sku": p.sku,
            "one_to_one_code": p.one_to_one_code,
            "name": p.name,
            "category": p.category,
            "family": p.family,
            "brand": p.brand,
            "supplier": p.supplier_name,
            "cost_price": cost,
            "retail_price": p.retail_price,
            "stock_on_hand": on_hand,
            "stock_available": p.stock_available,
            "stock_allocated": p.stock_allocated,
            "stock_on_order": p.stock_on_order,
            "reorder_level": p.reorder_level,
            "valuation_zar": val
        })

    return {
        "total_matching_products": total_count,
        "grand_total_stock_units_all_matching": round(grand_total_units, 2),
        "grand_total_valuation_zar_all_matching": round(grand_total_valuation, 2),
        "returned_sample_records": len(items),
        "records": items
    }


def tool_query_payments(
    db: Session,
    customer: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    min_amount: Optional[float] = None,
    limit: int = 50
) -> Dict[str, Any]:
    """Queries customer payments and receipts from Palladium tblCustPay with full SQL totals."""
    query = db.query(PalladiumPayment).filter(PalladiumPayment.is_reversed == False)
    if customer:
        query = query.filter(
            (PalladiumPayment.customer_name.ilike(f"%{customer}%")) |
            (PalladiumPayment.customer_code.ilike(f"%{customer}%"))
        )
    if date_from:
        try:
            dt = datetime.strptime(date_from[:10], "%Y-%m-%d")
            query = query.filter(PalladiumPayment.payment_date >= dt)
        except Exception:
            pass
    if date_to:
        try:
            dt = datetime.strptime(date_to[:10], "%Y-%m-%d")
            query = query.filter(PalladiumPayment.payment_date <= dt)
        except Exception:
            pass
    if min_amount is not None:
        query = query.filter(PalladiumPayment.amount >= min_amount)

    agg = query.with_entities(
        func.count(PalladiumPayment.id),
        func.coalesce(func.sum(PalladiumPayment.amount), 0.0)
    ).first()

    total_count = agg[0] if agg else 0
    grand_total_amount = float(agg[1] or 0.0) if agg else 0.0

    safe_limit = min(max(int(limit or 50), 1), 150)
    rows = query.order_by(PalladiumPayment.payment_date.desc()).limit(safe_limit).all()

    items = []
    for p in rows:
        items.append({
            "receipt_no": p.receipt_no,
            "customer_code": p.customer_code,
            "customer_name": p.customer_name,
            "amount": p.amount,
            "payment_date": p.payment_date.strftime("%Y-%m-%d") if p.payment_date else None,
            "reference": p.reference,
            "payment_method": p.payment_method,
            "currency_code": p.currency_code
        })

    return {
        "total_matching_receipts": total_count,
        "grand_total_amount_zar_all_matching": round(grand_total_amount, 2),
        "returned_sample_records": len(items),
        "records": items
    }


def tool_get_executive_kpis(db: Session, financial_year: str = "2026-2027") -> Dict[str, Any]:
    """Retrieves executive financial targets, monthly division budgets, and KPI parameters."""
    setting = db.query(PortalSetting).filter(PortalSetting.key == "budgetsConfig").first()
    cfg = setting.value if (setting and setting.value and isinstance(setting.value, dict)) else {}
    fy_cfg = cfg.get(financial_year) or {}

    return {
        "financial_year": financial_year,
        "divisions": fy_cfg.get("divisions", [
            'MODUS PROFESSIONAL ( Ryan )',
            'MOOD STORES',
            'MODUS PROJECTS ( Dani )',
            'PROJECTS (Dani own)',
            'MODUS SIGNATURE ( Thando )',
            'MADE ( Jon-Peer)',
            'LUXELINE',
            'INTERNAL - Office'
        ]),
        "monthly_budgets_kpi1": fy_cfg.get("budgetsKPI1", {}),
        "targets_kpi2_pipeline": fy_cfg.get("targetsKPI2", {}),
        "targets_kpi3_margin": fy_cfg.get("targetsKPI3", {}),
        "targets_kpi4_project_budgets": fy_cfg.get("budgetsKPI4", {})
    }


def tool_query_projects_and_logistics(
    db: Session,
    search: Optional[str] = None,
    status: Optional[str] = None,
    include_logistics: bool = True,
    limit: int = 40
) -> Dict[str, Any]:
    """Queries live Portal Projects, Orders/Quotations, Packing Lists, and Delivery Notes."""
    ord_query = db.query(Order)
    if search:
        ord_query = ord_query.filter(
            (Order.po_number.ilike(f"%{search}%")) |
            (Order.client_name.ilike(f"%{search}%")) |
            (Order.project_key.ilike(f"%{search}%")) |
            (Order.quote_name.ilike(f"%{search}%")) |
            (Order.pm_name.ilike(f"%{search}%"))
        )
    if status:
        ord_query = ord_query.filter(Order.status.ilike(f"%{status}%"))

    orders = ord_query.order_by(Order.id.desc()).limit(limit).all()
    order_list = []
    for o in orders:
        order_list.append({
            "order_id": o.id,
            "po_number": o.po_number,
            "project_key": o.project_key,
            "quote_name": o.quote_name,
            "client_name": o.client_name or o.client_company,
            "pm_name": o.pm_name,
            "rep": o.one_one_rep,
            "division": o.division,
            "status": o.status,
            "value_zar": o.value,
            "paid_zar": o.paid,
            "outstanding_zar": o.outstanding,
            "order_date": o.order_date
        })

    result: Dict[str, Any] = {
        "matching_orders_count": len(order_list),
        "orders": order_list
    }

    if include_logistics:
        pl_query = db.query(LogisticsPackingList)
        dn_query = db.query(LogisticsDeliveryNote)
        if search:
            pl_query = pl_query.filter(
                (LogisticsPackingList.document_number.ilike(f"%{search}%")) |
                (LogisticsPackingList.order_po_number.ilike(f"%{search}%")) |
                (LogisticsPackingList.project_key.ilike(f"%{search}%"))
            )
            dn_query = dn_query.filter(
                (LogisticsDeliveryNote.document_number.ilike(f"%{search}%")) |
                (LogisticsDeliveryNote.order_po_number.ilike(f"%{search}%")) |
                (LogisticsDeliveryNote.project_key.ilike(f"%{search}%"))
            )

        pls = pl_query.order_by(LogisticsPackingList.id.desc()).limit(30).all()
        dns = dn_query.order_by(LogisticsDeliveryNote.id.desc()).limit(30).all()

        result["packing_lists"] = [
            {
                "document_number": pl.document_number,
                "order_po_number": pl.order_po_number,
                "project_key": pl.project_key,
                "status": pl.status,
                "total_boxes": pl.total_boxes,
                "total_items": pl.total_items,
                "delivery_note_number": pl.delivery_note_number,
                "created_at": pl.created_at.strftime("%Y-%m-%d %H:%M") if pl.created_at else None
            }
            for pl in pls
        ]
        result["delivery_notes"] = [
            {
                "document_number": dn.document_number,
                "order_po_number": dn.order_po_number,
                "project_key": dn.project_key,
                "status": dn.status,
                "delivery_type": dn.delivery_type,
                "dispatch_method": dn.dispatch_method,
                "carrier_driver": dn.carrier_driver,
                "pod_received": dn.pod_received,
                "received_by": dn.received_by,
                "dispatched_at": dn.dispatched_at.strftime("%Y-%m-%d %H:%M") if dn.dispatched_at else None
            }
            for dn in dns
        ]

    return result


# --------------------------------------------------------------------------
# GEMINI TOOL DEFINITIONS & DISPATCH
# --------------------------------------------------------------------------
TOOL_DECLARATIONS = [
    {
        "name": "tool_execute_readonly_sql",
        "description": (
            "Executes a read-only PostgreSQL SELECT or WITH query directly against the live Cloud SQL database. "
            "Use this tool whenever you need exact aggregations (SUM, COUNT, AVG, GROUP BY), multi-table JOINs, "
            "date-filtered totals, top-N customer/rep/product rankings, deadstock analysis, or queries on any table "
            "listed in the schema documentation."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "sql_query": {
                    "type": "STRING",
                    "description": "Valid PostgreSQL SELECT query (e.g. SELECT customer_name, SUM(line_total_excl) AS total FROM palladium_invoice_lines GROUP BY customer_name ORDER BY total DESC LIMIT 10)."
                },
                "explanation": {
                    "type": "STRING",
                    "description": "Brief 1-sentence description of what this SQL query is calculating."
                }
            },
            "required": ["sql_query"]
        }
    },
    {
        "name": "tool_get_sync_status",
        "description": "Returns when the Palladium ERP data was last synchronized into Cloud SQL and the total record counts across ERP and Portal tables.",
        "parameters": {
            "type": "OBJECT",
            "properties": {}
        }
    },
    {
        "name": "tool_query_sales_and_invoices",
        "description": "Queries invoiced sales, tax invoices, and credit notes from Palladium biSalesAnalysis, returning true SQL grand totals across all matching rows plus sample line items.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "date_from": {"type": "STRING", "description": "Start date in YYYY-MM-DD format."},
                "date_to": {"type": "STRING", "description": "End date in YYYY-MM-DD format."},
                "customer": {"type": "STRING", "description": "Filter by customer name or code."},
                "sales_rep": {"type": "STRING", "description": "Filter by sales representative name."},
                "document_type": {"type": "STRING", "description": "Filter by 'invoice', 'credit_note', or 'all'."},
                "limit": {"type": "INTEGER", "description": "Maximum sample records to return (default 50)."}
            }
        }
    },
    {
        "name": "tool_query_purchase_orders",
        "description": "Queries Purchase Orders from Palladium ERP with true SQL grand totals across all matching rows plus individual PO lines.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "status": {"type": "STRING", "description": "'Open', 'Closed', 'Partial', or 'All'."},
                "vendor": {"type": "STRING", "description": "Supplier or vendor name (e.g. 'Delta Light')."},
                "item_search": {"type": "STRING", "description": "SKU code or description keywords."},
                "overdue_only": {"type": "BOOLEAN", "description": "If true, returns only POs past their required delivery date."},
                "limit": {"type": "INTEGER", "description": "Maximum sample records to return (default 50)."}
            }
        }
    },
    {
        "name": "tool_query_inventory",
        "description": "Queries product catalogue, warehouse physical on-hand stock, available to sell, allocated to orders, reorder thresholds, and full SQL inventory valuation in ZAR.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "search": {"type": "STRING", "description": "SKU, one_to_one_code, product description, supplier, or brand."},
                "category": {"type": "STRING", "description": "Product category (e.g. 'Downlight', 'Track')."},
                "family": {"type": "STRING", "description": "Product family name."},
                "stock_status": {"type": "STRING", "description": "'low_stock', 'out_of_stock', or 'in_stock'."},
                "limit": {"type": "INTEGER", "description": "Maximum sample records to return (default 50)."}
            }
        }
    },
    {
        "name": "tool_query_payments",
        "description": "Queries customer receipts, deposits, payment dates, and payment methods from Palladium tblCustPay with full SQL grand totals.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "customer": {"type": "STRING", "description": "Customer name or customer code."},
                "date_from": {"type": "STRING", "description": "Start date in YYYY-MM-DD format."},
                "date_to": {"type": "STRING", "description": "End date in YYYY-MM-DD format."},
                "min_amount": {"type": "NUMBER", "description": "Minimum transaction value in ZAR."},
                "limit": {"type": "INTEGER", "description": "Maximum sample records to return (default 50)."}
            }
        }
    },
    {
        "name": "tool_get_executive_kpis",
        "description": "Retrieves the financial targets, monthly division budgets (March-February), and sales rep target models from executive settings.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "financial_year": {"type": "STRING", "description": "Target financial year (e.g. '2026-2027')."}
            }
        }
    },
    {
        "name": "tool_query_projects_and_logistics",
        "description": "Queries Portal Orders/Quotations, Projects, Logistics Packing Lists (PLs), and Delivery Notes (DNs).",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "search": {"type": "STRING", "description": "Order PO number (e.g. 'Q-2026-0660'), project key, client name, PL number, or DN number."},
                "status": {"type": "STRING", "description": "Filter by order status."},
                "include_logistics": {"type": "BOOLEAN", "description": "Include Packing Lists and Delivery Notes (default true)."},
                "limit": {"type": "INTEGER", "description": "Maximum records to inspect (default 40)."}
            }
        }
    }
]


BASE_SYSTEM_PROMPT = f"""You are a real, autonomous AI Agent for One to One World, powered by Google Gemini on Vertex AI with direct multi-step tool execution and live PostgreSQL database access.

TODAY'S DATE: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}
FINANCIAL YEAR CONVENTION: Runs from March 1st to February 28th/29th (e.g., FY 2026-2027 runs 2026-03-01 to 2027-02-28).
DEFAULT CURRENCY: South African Rand (ZAR / R) unless foreign currency (`currency_code`) is explicitly noted.

{CLOUD_SQL_SCHEMA_DOCS}

AGENTIC EXECUTION RULES:
1. CONVERSATIONAL & NATURAL: You are a real, intelligent Google Gemini assistant. If the user says hello, asks a general question, or chats casually, reply naturally and conversationally without running unnecessary SQL queries.
2. NEVER GUESS OR HALLUCINATE BUSINESS NUMBERS: When asked about sales, products, stock, POs, projects, or logistics, call your tools first.
3. EFFICIENT SQL QUERIES (1 TO 2 QUERIES MAX): Combine metrics (such as revenue AND quantity, or FY vs Calendar Year) into a single comprehensive PostgreSQL query using `tool_execute_readonly_sql`. Once you have the data rows from 1 or 2 queries, IMMEDIATELY write your full, detailed answer. Do NOT keep running 4 or 5 redundant variations of the same SQL query.
4. EXECUTIVE FORMATTING: Present your findings in crisp, structured Markdown with bold figures (`R 1,245,000.00`), Markdown tables for comparisons, and clear executive commentary."""


def build_agent_system_prompt(db: Session, agent_id: Optional[str] = None, custom_instructions: Optional[str] = None) -> str:
    agents = get_all_agents(db)
    selected = next((a for a in agents if a.get("id") == agent_id), None) or BUILTIN_AGENTS[0]
    agent_persona = selected.get("system_prompt") or ""
    extra = f"\n\nUSER CUSTOM INSTRUCTIONS:\n{custom_instructions}" if custom_instructions else ""
    return f"{agent_persona}\n\n{BASE_SYSTEM_PROMPT}{extra}"


def dispatch_tool_call(db: Session, fn_name: str, fn_args: Dict[str, Any]) -> Dict[str, Any]:
    if fn_name == "tool_execute_readonly_sql":
        return tool_execute_readonly_sql(db, **fn_args)
    elif fn_name == "tool_get_sync_status":
        return tool_get_sync_status(db)
    elif fn_name == "tool_query_sales_and_invoices":
        return tool_query_sales_and_invoices(db, **fn_args)
    elif fn_name == "tool_query_purchase_orders":
        return tool_query_purchase_orders(db, **fn_args)
    elif fn_name == "tool_query_inventory":
        return tool_query_inventory(db, **fn_args)
    elif fn_name == "tool_query_payments":
        return tool_query_payments(db, **fn_args)
    elif fn_name == "tool_get_executive_kpis":
        return tool_get_executive_kpis(db, **fn_args)
    elif fn_name == "tool_query_projects_and_logistics":
        return tool_query_projects_and_logistics(db, **fn_args)
    else:
        return {"error": f"Unknown tool '{fn_name}'"}


def describe_tool_action(fn_name: str, fn_args: Dict[str, Any]) -> str:
    if fn_name == "tool_execute_readonly_sql":
        expl = fn_args.get("explanation")
        sql_preview = (fn_args.get("sql_query") or "")[:70].replace("\n", " ")
        return f"Running SQL: {expl or sql_preview}..."
    elif fn_name == "tool_query_sales_and_invoices":
        return f"Querying Palladium Sales & Invoices ({fn_args or 'all'})..."
    elif fn_name == "tool_query_purchase_orders":
        return f"Querying Palladium Purchase Orders ({fn_args or 'all'})..."
    elif fn_name == "tool_query_inventory":
        return f"Querying Warehouse Stock & Valuations ({fn_args or 'all'})..."
    elif fn_name == "tool_query_payments":
        return f"Querying Customer Receipts ({fn_args or 'all'})..."
    elif fn_name == "tool_get_executive_kpis":
        return "Fetching Executive KPIs & Division Budgets..."
    elif fn_name == "tool_query_projects_and_logistics":
        return f"Querying Portal Projects, Orders & Logistics ({fn_args or 'all'})..."
    elif fn_name == "tool_get_sync_status":
        return "Checking Palladium ERP & Cloud SQL sync status..."
    return f"Executing {fn_name}..."


# --------------------------------------------------------------------------
# CHAT & AGENT PAYLOAD SCHEMAS
# --------------------------------------------------------------------------
class ChatMessage(BaseModel):
    role: str  # 'user' | 'model' | 'assistant'
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    agent_id: Optional[str] = "executive-all"
    model: Optional[str] = None
    custom_instructions: Optional[str] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = "Executive"

class CustomAgentCreateRequest(BaseModel):
    id: Optional[str] = None
    name: str
    description: Optional[str] = ""
    icon: Optional[str] = "Sparkles"
    color: Optional[str] = "#8b5cf6"
    model: Optional[str] = "gemini-3.8-flash"
    system_prompt: str
    suggested_prompts: Optional[List[Dict[str, str]]] = []


# --------------------------------------------------------------------------
# GEMINI VERTEX AI EXECUTION ENGINE (WITH REAL THINKING & MULTI-STEP TOOLS)
# --------------------------------------------------------------------------
def _resolve_model_and_url(requested_model: Optional[str], stream: bool = False) -> tuple[str, str]:
    model_id = requested_model if requested_model in AVAILABLE_MODELS else GEMINI_MODEL
    loc = AVAILABLE_MODELS.get(model_id, {}).get("location", GEMINI_LOCATION)
    method = "streamGenerateContent?alt=sse" if stream else "generateContent"
    if loc == "global":
        url = f"https://aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/global/publishers/google/models/{model_id}:{method}"
    else:
        url = f"https://{loc}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{loc}/publishers/google/models/{model_id}:{method}"
    return model_id, url


def call_vertex_gemini_with_tools(
    contents: List[Dict[str, Any]],
    system_instruction: str,
    model: Optional[str] = None,
    include_tools: bool = True
) -> Dict[str, Any]:
    token = get_gcp_access_token()
    model_id, url = _resolve_model_and_url(model, stream=False)

    payload: Dict[str, Any] = {
        "contents": contents,
        "system_instruction": {
            "parts": [{"text": system_instruction}]
        },
        "generation_config": {
            "temperature": 0.15,
            "max_output_tokens": 8192
        }
    }
    if include_tools:
        payload["tools"] = [{
            "function_declarations": TOOL_DECLARATIONS
        }]
    elif any("functionCall" in str(c) or "functionResponse" in str(c) for c in contents):
        # Vertex AI requires tools declaration + tool_config: NONE when history contains functionCall/functionResponse
        payload["tools"] = [{
            "function_declarations": TOOL_DECLARATIONS
        }]
        payload["tool_config"] = {
            "function_calling_config": {
                "mode": "NONE"
            }
        }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    )

    try:
        with urllib.request.urlopen(req, context=_SSL_CTX, timeout=120) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        # Automatic fallback to default gemini-3.8-flash if a regional model fails
        if model_id != GEMINI_MODEL:
            logger.warning(f"Model {model_id} failed ({e}), falling back to {GEMINI_MODEL}")
            return call_vertex_gemini_with_tools(contents, system_instruction, model=GEMINI_MODEL, include_tools=include_tools)
        raise


def stream_vertex_gemini(
    contents: List[Dict[str, Any]],
    system_instruction: str,
    model: Optional[str] = None,
    include_tools: bool = False
) -> Generator[str, None, None]:
    """Streams token chunks from Vertex AI streamGenerateContent using SSE."""
    token = get_gcp_access_token()
    model_id, url = _resolve_model_and_url(model, stream=True)

    payload: Dict[str, Any] = {
        "contents": contents,
        "system_instruction": {
            "parts": [{"text": system_instruction}]
        },
        "generation_config": {
            "temperature": 0.15,
            "max_output_tokens": 8192
        }
    }
    if include_tools:
        payload["tools"] = [{
            "function_declarations": TOOL_DECLARATIONS
        }]
    elif any("functionCall" in str(c) or "functionResponse" in str(c) for c in contents):
        # Vertex AI requires tools declaration + tool_config: NONE when history contains functionCall/functionResponse
        payload["tools"] = [{
            "function_declarations": TOOL_DECLARATIONS
        }]
        payload["tool_config"] = {
            "function_calling_config": {
                "mode": "NONE"
            }
        }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    )

    with urllib.request.urlopen(req, context=_SSL_CTX, timeout=120) as resp:
        for line in resp:
            line_str = line.decode('utf-8', errors='ignore')
            if line_str.startswith("data:"):
                raw_json = line_str[5:].strip()
                if not raw_json:
                    continue
                try:
                    data = json.loads(raw_json)
                    candidate = data.get("candidates", [{}])[0]
                    parts = candidate.get("content", {}).get("parts", [])
                    for p in parts:
                        # Skip internal thought parts so only final clean answer streams to text
                        if p.get("thought"):
                            continue
                        txt = p.get("text")
                        if txt:
                            yield txt
                except Exception as e:
                    logger.debug(f"Error parsing SSE chunk: {e}")


# --------------------------------------------------------------------------
# API ENDPOINTS: STATUS, AGENTS CRUD, AND AUTONOMOUS CHAT
# --------------------------------------------------------------------------
@public_router.get("/status")
@router.get("/status")
def get_ai_status(db: Session = Depends(get_db)):
    """Returns AI model status, available models, and Palladium data freshness."""
    sync_info = tool_get_sync_status(db)
    return {
        "status": "online",
        "engine": "Google Gemini 3.8 Flash + Autonomous SQL Agent (Vertex AI)",
        "models": [
            {"id": k, "label": v["label"]} for k, v in AVAILABLE_MODELS.items()
        ],
        "sync_info": sync_info
    }


@public_router.get("/agents")
@router.get("/agents")
def list_ai_agents(db: Session = Depends(get_db)):
    """Returns all built-in Google Gemini specialist agents and user-created custom agents."""
    return {
        "agents": get_all_agents(db),
        "models": [{"id": k, "label": v["label"]} for k, v in AVAILABLE_MODELS.items()]
    }


@public_router.post("/agents")
@router.post("/agents")
def save_custom_agent(req: CustomAgentCreateRequest, db: Session = Depends(get_db)):
    """Creates or updates a user-defined Custom Gemini Agent in Cloud SQL."""
    setting = db.query(PortalSetting).filter(PortalSetting.key == CUSTOM_AGENTS_KEY).first()
    custom_list: List[Dict[str, Any]] = []
    if setting and isinstance(setting.value, list):
        custom_list = list(setting.value)

    agent_id = req.id or f"custom-{int(datetime.now(timezone.utc).timestamp())}"
    new_agent = {
        "id": agent_id,
        "name": req.name.strip(),
        "category": "custom",
        "icon": req.icon or "Sparkles",
        "color": req.color or "#8b5cf6",
        "model": req.model if req.model in AVAILABLE_MODELS else GEMINI_MODEL,
        "description": (req.description or "Custom user-configured Gemini Agent").strip(),
        "system_prompt": req.system_prompt.strip(),
        "suggested_prompts": req.suggested_prompts or []
    }

    existing_idx = next((i for i, a in enumerate(custom_list) if a.get("id") == agent_id), None)
    if existing_idx is not None:
        custom_list[existing_idx] = new_agent
    else:
        custom_list.append(new_agent)

    if not setting:
        setting = PortalSetting(key=CUSTOM_AGENTS_KEY, value=custom_list)
        db.add(setting)
    else:
        setting.value = custom_list
    db.commit()

    return {"status": "saved", "agent": new_agent, "agents": get_all_agents(db)}


@public_router.delete("/agents/{agent_id}")
@router.delete("/agents/{agent_id}")
def delete_custom_agent(agent_id: str, db: Session = Depends(get_db)):
    """Deletes a custom agent from Cloud SQL."""
    setting = db.query(PortalSetting).filter(PortalSetting.key == CUSTOM_AGENTS_KEY).first()
    if setting and isinstance(setting.value, list):
        setting.value = [a for a in setting.value if a.get("id") != agent_id]
        db.commit()
    return {"status": "deleted", "agents": get_all_agents(db)}


@public_router.post("/chat")
@router.post("/chat")
def executive_chat_endpoint(
    req: ChatRequest,
    db: Session = Depends(get_db)
):
    """
    Autonomous Multi-Turn Tool-Calling Endpoint:
    Executes up to 5 reasoning + tool/SQL turns before returning the verified answer.
    """
    if not req.messages:
        raise HTTPException(status_code=400, detail="Messages list cannot be empty.")

    system_prompt = build_agent_system_prompt(db, req.agent_id, req.custom_instructions)
    agents = get_all_agents(db)
    selected_agent = next((a for a in agents if a.get("id") == req.agent_id), BUILTIN_AGENTS[0])
    chosen_model = req.model or selected_agent.get("model") or GEMINI_MODEL

    contents = []
    for m in req.messages:
        role = "user" if m.role in ("user", "human") else "model"
        contents.append({
            "role": role,
            "parts": [{"text": m.content}]
        })

    max_turns = 5
    tools_called_names = []
    sql_queries_executed = []

    for turn in range(max_turns):
        gemini_response = call_vertex_gemini_with_tools(
            contents=contents,
            system_instruction=system_prompt,
            model=chosen_model,
            include_tools=True
        )
        candidate = gemini_response.get("candidates", [{}])[0]
        content_obj = candidate.get("content", {})
        parts = content_obj.get("parts", [])

        function_calls = [p.get("functionCall") for p in parts if p.get("functionCall")]

        if not function_calls:
            text_parts = [p.get("text", "") for p in parts if p.get("text") and not p.get("thought")]
            full_reply = "".join(text_parts).strip()
            return {
                "role": "assistant",
                "content": full_reply,
                "reply": full_reply,
                "tools_called": tools_called_names,
                "sql_queries": sql_queries_executed,
                "model": chosen_model,
                "agent_id": req.agent_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            }

        contents.append(content_obj)
        tool_response_parts = []

        for call in function_calls:
            fn_name = call.get("name")
            fn_args = call.get("args") or {}
            fn_call_id = call.get("id")
            tools_called_names.append(fn_name)
            if fn_name == "tool_execute_readonly_sql" and fn_args.get("sql_query"):
                sql_queries_executed.append(fn_args.get("sql_query"))

            logger.info(f"Agent [{req.agent_id}] Tool Call: {fn_name}({fn_args})")
            try:
                fn_result = dispatch_tool_call(db, fn_name, fn_args)
            except Exception as e:
                logger.error(f"Error executing tool {fn_name}: {e}")
                fn_result = {"error": str(e)}

            fn_resp_dict: Dict[str, Any] = {
                "name": fn_name,
                "response": {"result": fn_result}
            }
            if fn_call_id:
                fn_resp_dict["id"] = fn_call_id

            tool_response_parts.append({"functionResponse": fn_resp_dict})

        contents.append({
            "role": "user",
            "parts": tool_response_parts
        })

    final_response = call_vertex_gemini_with_tools(
        contents=contents,
        system_instruction=system_prompt,
        model=chosen_model,
        include_tools=False
    )
    candidate = final_response.get("candidates", [{}])[0]
    parts = candidate.get("content", {}).get("parts", [])
    text_parts = [p.get("text", "") for p in parts if p.get("text") and not p.get("thought")]
    full_reply = "".join(text_parts).strip() if text_parts else "Summary of retrieved ERP data is ready."

    return {
        "role": "assistant",
        "content": full_reply,
        "reply": full_reply,
        "tools_called": tools_called_names,
        "sql_queries": sql_queries_executed,
        "model": chosen_model,
        "agent_id": req.agent_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }


@public_router.post("/chat/stream")
@router.post("/chat/stream")
def executive_chat_stream_endpoint(
    req: ChatRequest,
    db: Session = Depends(get_db)
):
    """
    True Autonomous Agentic Streaming Endpoint (ReAct Loop + SSE):
    1. Sends conversation + full tool declarations (including `tool_execute_readonly_sql`) to Gemini.
    2. Whenever Gemini decides to call 1 or more tools/SQL queries, executes them live on Cloud SQL
       and streams real-time progress events (`status`, `tool_step`, `sql_query`) to the UI.
    3. Once Gemini has gathered all required data, streams the final response token-by-token.
    """
    if not req.messages:
        raise HTTPException(status_code=400, detail="Messages list cannot be empty.")

    system_prompt = build_agent_system_prompt(db, req.agent_id, req.custom_instructions)
    agents = get_all_agents(db)
    selected_agent = next((a for a in agents if a.get("id") == req.agent_id), BUILTIN_AGENTS[0])
    chosen_model = req.model or selected_agent.get("model") or GEMINI_MODEL

    def event_stream():
        contents = []
        for m in req.messages:
            role = "user" if m.role in ("user", "human") else "model"
            contents.append({
                "role": role,
                "parts": [{"text": m.content}]
            })

        tools_called_names: List[str] = []
        sql_queries_executed: List[str] = []
        tool_steps_log: List[Dict[str, Any]] = []
        max_turns = 3

        agent_name_str = selected_agent.get("name", "Gemini Agent")
        yield f"data: {json.dumps({'status': f'{agent_name_str} is reasoning & planning tool calls...'})}\n\n"

        try:
            for turn in range(max_turns):
                gemini_response = call_vertex_gemini_with_tools(
                    contents=contents,
                    system_instruction=system_prompt,
                    model=chosen_model,
                    include_tools=True
                )
                candidate = gemini_response.get("candidates", [{}])[0]
                content_obj = candidate.get("content", {})
                parts = content_obj.get("parts", [])

                function_calls = [p.get("functionCall") for p in parts if p.get("functionCall")]

                if not function_calls:
                    # Gemini finished all tool calls and produced the final answer!
                    text_parts = [p.get("text", "") for p in parts if p.get("text") and not p.get("thought")]
                    final_text = "".join(text_parts).strip()

                    if final_text:
                        # Stream in smooth chunks for immediate responsive rendering
                        chunk_size = 48
                        for i in range(0, len(final_text), chunk_size):
                            yield f"data: {json.dumps({'text': final_text[i:i+chunk_size], 'tools_called': tools_called_names, 'tool_steps': tool_steps_log, 'sql_queries': sql_queries_executed})}\n\n"
                        yield f"data: {json.dumps({'done': True, 'tools_called': tools_called_names, 'tool_steps': tool_steps_log, 'sql_queries': sql_queries_executed, 'model': chosen_model})}\n\n"
                        return
                    break

                # Execute each requested function call on live Cloud SQL
                contents.append(content_obj)
                tool_response_parts = []

                for call in function_calls:
                    fn_name = call.get("name")
                    fn_args = call.get("args") or {}
                    fn_call_id = call.get("id")
                    tools_called_names.append(fn_name)

                    action_desc = describe_tool_action(fn_name, fn_args)
                    yield f"data: {json.dumps({'status': action_desc, 'tools_called': tools_called_names})}\n\n"

                    if fn_name == "tool_execute_readonly_sql" and fn_args.get("sql_query"):
                        sql_queries_executed.append(fn_args.get("sql_query"))

                    try:
                        fn_result = dispatch_tool_call(db, fn_name, fn_args)
                    except Exception as e:
                        logger.error(f"Error executing tool {fn_name}: {e}")
                        fn_result = {"error": str(e)}

                    # Record concise summary of tool execution for UI transparency
                    row_info = (
                        fn_result.get("row_count")
                        or fn_result.get("total_matching_line_items")
                        or fn_result.get("total_matching_po_lines")
                        or fn_result.get("total_matching_products")
                        or fn_result.get("total_matching_receipts")
                        or fn_result.get("matching_orders_count")
                    )
                    step_entry = {
                        "tool": fn_name,
                        "description": action_desc,
                        "sql": fn_args.get("sql_query") if fn_name == "tool_execute_readonly_sql" else None,
                        "rows_matched": row_info,
                        "error": fn_result.get("error")
                    }
                    tool_steps_log.append(step_entry)
                    yield f"data: {json.dumps({'tool_steps': tool_steps_log, 'tools_called': tools_called_names, 'sql_queries': sql_queries_executed})}\n\n"

                    fn_resp_dict: Dict[str, Any] = {
                        "name": fn_name,
                        "response": {"result": fn_result}
                    }
                    if fn_call_id:
                        fn_resp_dict["id"] = fn_call_id

                    tool_response_parts.append({"functionResponse": fn_resp_dict})

                contents.append({
                    "role": "user",
                    "parts": tool_response_parts
                })
                yield f"data: {json.dumps({'status': 'Synthesizing verified database results...'})}\n\n"

            # If max_turns was reached, force final synthesis with tool_config mode="NONE"
            final_synth = call_vertex_gemini_with_tools(
                contents=contents,
                system_instruction=system_prompt,
                model=chosen_model,
                include_tools=False
            )
            f_cand = final_synth.get("candidates", [{}])[0]
            f_parts = f_cand.get("content", {}).get("parts", [])
            f_text = "".join([p.get("text", "") for p in f_parts if p.get("text") and not p.get("thought")]).strip()
            if f_text:
                chunk_size = 48
                for i in range(0, len(f_text), chunk_size):
                    yield f"data: {json.dumps({'text': f_text[i:i+chunk_size], 'tools_called': tools_called_names, 'tool_steps': tool_steps_log, 'sql_queries': sql_queries_executed})}\n\n"

        except Exception as e:
            logger.error(f"Error in autonomous agent stream: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

        yield f"data: {json.dumps({'done': True, 'tools_called': tools_called_names, 'tool_steps': tool_steps_log, 'sql_queries': sql_queries_executed, 'model': chosen_model})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
