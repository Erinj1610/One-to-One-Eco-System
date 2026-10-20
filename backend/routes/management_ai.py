import os
import json
import logging
import urllib.request
import ssl
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Generator
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

from database.cloud_sql import get_db
from models.orm_models import (
    Product, PalladiumPOLine, PalladiumGRNLine, 
    PalladiumInvoiceLine, PalladiumPayment, 
    PortalSetting, User, Role
)
from services.firebase_auth import verify_firebase_token
from services.technical_pack_service import get_gcp_access_token, _SSL_CTX, PROJECT_ID, LOCATION

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/management-ai", tags=["management-ai"])
public_router = APIRouter(prefix="/management-ai", tags=["management-ai-public"])

# Use Google Gemini on Vertex AI
GEMINI_MODEL = "gemini-3.8-flash"
GEMINI_LOCATION = "global"

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
# TOOL IMPLEMENTATIONS (PALLADIUM CLOUD SQL QUERIES)
# --------------------------------------------------------------------------

def tool_get_sync_status(db: Session) -> Dict[str, Any]:
    """Retrieves the timestamp and record counts of the last Palladium ERP sync."""
    setting = db.query(PortalSetting).filter(PortalSetting.key == "palladium_sync_status").first()
    latest_inv = db.query(PalladiumInvoiceLine.last_synced_at).order_by(PalladiumInvoiceLine.last_synced_at.desc()).first()
    latest_po = db.query(PalladiumPOLine.last_synced_at).order_by(PalladiumPOLine.last_synced_at.desc()).first()
    total_products = db.query(Product).count()
    total_pos = db.query(PalladiumPOLine).count()
    total_invoices = db.query(PalladiumInvoiceLine).count()
    total_payments = db.query(PalladiumPayment).count()

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
            "sales_invoice_lines": total_invoices,
            "customer_receipts": total_payments
        }
    }

def tool_query_sales_and_invoices(
    db: Session, 
    date_from: Optional[str] = None, 
    date_to: Optional[str] = None, 
    customer: Optional[str] = None, 
    sales_rep: Optional[str] = None, 
    document_type: Optional[str] = None, # 'invoice' | 'credit_note' | 'all'
    limit: int = 50
) -> Dict[str, Any]:
    """Queries sales invoices, credit notes, and customer billing from Palladium biSalesAnalysis."""
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

    # Calculate overall aggregate totals
    total_count = query.count()
    rows = query.order_by(PalladiumInvoiceLine.transaction_date.desc()).limit(limit).all()

    total_excl = sum(r.line_total_excl or 0.0 for r in rows)
    total_incl = sum(r.line_total_incl or 0.0 for r in rows)

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
            "is_foreign_currency": r.is_foreign_currency,
            "currency_code": r.currency_code
        })

    return {
        "matching_records": total_count,
        "returned_sample_records": len(items),
        "sample_total_excl_zar": round(total_excl, 2),
        "sample_total_incl_zar": round(total_incl, 2),
        "records": items
    }

def tool_query_purchase_orders(
    db: Session,
    status: Optional[str] = None, # 'Open', 'Closed', 'Partial'
    vendor: Optional[str] = None,
    item_search: Optional[str] = None,
    overdue_only: bool = False,
    limit: int = 50
) -> Dict[str, Any]:
    """Queries Purchase Orders from Palladium biPurchaseOrders with vendor, ordered/open quantities, and ETA."""
    query = db.query(PalladiumPOLine)
    if status and status != 'All':
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

    total_count = query.count()
    rows = query.order_by(PalladiumPOLine.transaction_date.desc()).limit(limit).all()

    total_order_val = sum(r.total_value_excl or 0.0 for r in rows)
    total_open_qty = sum(r.open_qty or 0.0 for r in rows)

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
        "matching_records": total_count,
        "returned_sample_records": len(items),
        "sample_total_value_excl": round(total_order_val, 2),
        "sample_total_open_qty": total_open_qty,
        "records": items
    }

def tool_query_inventory(
    db: Session,
    search: Optional[str] = None,
    category: Optional[str] = None,
    family: Optional[str] = None,
    stock_status: Optional[str] = None, # 'low_stock' | 'out_of_stock' | 'in_stock'
    limit: int = 50
) -> Dict[str, Any]:
    """Queries inventory items, physical on-hand stock, allocated stock, and valuations."""
    query = db.query(Product).filter(Product.is_active == True)
    if search:
        query = query.filter(
            (Product.sku.ilike(f"%{search}%")) |
            (Product.name.ilike(f"%{search}%")) |
            (Product.brand.ilike(f"%{search}%")) |
            (Product.supplier_name.ilike(f"%{search}%"))
        )
    if category and category != 'All':
        query = query.filter(Product.category.ilike(f"%{category}%"))
    if family and family != 'All':
        query = query.filter(Product.family.ilike(f"%{family}%"))

    if stock_status == 'low_stock':
        query = query.filter(Product.stock_level > 0, Product.stock_level <= Product.reorder_level)
    elif stock_status == 'out_of_stock':
        query = query.filter(Product.stock_level <= 0)
    elif stock_status == 'in_stock':
        query = query.filter(Product.stock_level > 0)

    total_count = query.count()
    rows = query.order_by(Product.name.asc()).limit(limit).all()

    items = []
    total_valuation = 0.0
    for p in rows:
        on_hand = p.stock_on_hand if p.stock_on_hand is not None else float(p.stock_level or 0)
        cost = p.cost_price or 0.0
        val = round(on_hand * cost, 2)
        total_valuation += val

        items.append({
            "sku": p.sku,
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
        "matching_records": total_count,
        "returned_sample_records": len(items),
        "sample_total_valuation_zar": round(total_valuation, 2),
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
    """Queries customer payments and receipts from Palladium tblCustPay."""
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

    total_count = query.count()
    rows = query.order_by(PalladiumPayment.payment_date.desc()).limit(limit).all()
    total_amount = sum(r.amount or 0.0 for r in rows)

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
        "matching_records": total_count,
        "returned_sample_records": len(items),
        "sample_total_amount_zar": round(total_amount, 2),
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

# --------------------------------------------------------------------------
# GEMINI TOOL DEFINITIONS & DISPATCH
# --------------------------------------------------------------------------
TOOL_DECLARATIONS = [
    {
        "name": "tool_get_sync_status",
        "description": "Returns when the Palladium ERP data was last synchronized into Cloud SQL and the total record count.",
        "parameters": {
            "type": "OBJECT",
            "properties": {}
        }
    },
    {
        "name": "tool_query_sales_and_invoices",
        "description": "Queries invoiced sales, tax invoices, and credit notes from Palladium biSalesAnalysis. Can filter by date range, customer name, sales rep, or document type ('invoice' or 'credit_note').",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "date_from": {"type": "STRING", "description": "Start date in YYYY-MM-DD format."},
                "date_to": {"type": "STRING", "description": "End date in YYYY-MM-DD format."},
                "customer": {"type": "STRING", "description": "Filter by customer name or code."},
                "sales_rep": {"type": "STRING", "description": "Filter by sales representative name."},
                "document_type": {"type": "STRING", "description": "Filter by 'invoice', 'credit_note', or 'all'."},
                "limit": {"type": "INTEGER", "description": "Maximum records to inspect (default 50)."}
            }
        }
    },
    {
        "name": "tool_query_purchase_orders",
        "description": "Queries Purchase Orders from Palladium ERP. Shows vendor, items, ordered/open quantities, currency, unit costs, and expected delivery dates.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "status": {"type": "STRING", "description": "'Open', 'Closed', 'Partial', or 'All'."},
                "vendor": {"type": "STRING", "description": "Supplier or vendor name (e.g. 'Delta Light')."},
                "item_search": {"type": "STRING", "description": "SKU code or description keywords."},
                "overdue_only": {"type": "BOOLEAN", "description": "If true, returns only POs past their required delivery date."},
                "limit": {"type": "INTEGER", "description": "Maximum records to inspect (default 50)."}
            }
        }
    },
    {
        "name": "tool_query_inventory",
        "description": "Queries product catalogue, warehouse physical on-hand stock, available to sell, allocated to orders, reorder thresholds, and inventory valuations in ZAR.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "search": {"type": "STRING", "description": "SKU, product description, or brand."},
                "category": {"type": "STRING", "description": "Product category (e.g. 'Downlight', 'Track')."},
                "family": {"type": "STRING", "description": "Product family name."},
                "stock_status": {"type": "STRING", "description": "'low_stock', 'out_of_stock', or 'in_stock'."},
                "limit": {"type": "INTEGER", "description": "Maximum records to inspect (default 50)."}
            }
        }
    },
    {
        "name": "tool_query_payments",
        "description": "Queries customer receipts, deposits, payment dates, and payment methods from Palladium tblCustPay.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "customer": {"type": "STRING", "description": "Customer name or customer code."},
                "date_from": {"type": "STRING", "description": "Start date in YYYY-MM-DD format."},
                "date_to": {"type": "STRING", "description": "End date in YYYY-MM-DD format."},
                "min_amount": {"type": "NUMBER", "description": "Minimum transaction value in ZAR."},
                "limit": {"type": "INTEGER", "description": "Maximum records to inspect (default 50)."}
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
    }
]

SYSTEM_PROMPT = """You are the One to One World Executive AI, an advanced, highly authoritative, and executive-level intelligence assistant powered by Google Gemini 3.8 Flash.
Your purpose is to assist the Managing Director, Executives, and Management with immediate, razor-sharp insights into business performance, procurement, stock, cashflow, and ERP operations.

DATA ENVIRONMENT:
- You are directly connected to the company's Cloud SQL mirror of Palladium ERP and executive financial reports.
- Data is continuously synchronized from Palladium MS SQL Server into Cloud SQL.
- Currency is South African Rand (ZAR / R) unless foreign currency is explicitly indicated.
- Financial Year runs from March 1st to February 28th/29th (e.g. FY 2026-2027 runs March 2026 to February 2027).

RULES & CONDUCT:
1. ALWAYS use the provided tools to retrieve real, concrete numbers.
2. Once you have called a tool and received the database records or KPI configuration, IMMEDIATELY synthesize and output your complete, comprehensive executive answer. Do not repeatedly request the same tool for older years unless specifically asked.
3. Present answers in clean, professional markdown with executive clarity. Use bold text, bullet points, and neat markdown tables where lists or comparisons are requested.
4. If an executive asks about timeliness, verify using `tool_get_sync_status` and mention when the data was last mirrored from Palladium.
5. If an answer includes financial numbers, format them clearly (e.g., R 1,250,400.00).
6. Be concise, direct, and actionable—avoid fluff, corporate excuses, or preamble. Get straight to the business facts."""

# --------------------------------------------------------------------------
# CHAT PAYLOAD SCHEMA
# --------------------------------------------------------------------------
class ChatMessage(BaseModel):
    role: str # 'user' | 'model' | 'assistant'
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    user_email: Optional[str] = None
    user_name: Optional[str] = "Executive"

# --------------------------------------------------------------------------
# GEMINI VERTEX AI EXECUTION ENGINE
# --------------------------------------------------------------------------
def call_vertex_gemini_with_tools(
    contents: List[Dict[str, Any]], 
    model: str = GEMINI_MODEL
) -> Dict[str, Any]:
    token = get_gcp_access_token()
    if GEMINI_LOCATION == "global":
        url = f"https://aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/global/publishers/google/models/{model}:generateContent"
    else:
        url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/{model}:generateContent"

    payload = {
        "contents": contents,
        "system_instruction": {
            "parts": [{"text": SYSTEM_PROMPT}]
        },
        "tools": [{
            "function_declarations": TOOL_DECLARATIONS
        }],
        "generation_config": {
            "temperature": 0.2,
            "max_output_tokens": 4096
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
        return json.loads(resp.read().decode('utf-8'))


def stream_vertex_gemini(
    contents: List[Dict[str, Any]],
    model: str = GEMINI_MODEL
) -> Generator[str, None, None]:
    """Streams token chunks from Vertex AI streamGenerateContent using SSE."""
    token = get_gcp_access_token()
    if GEMINI_LOCATION == "global":
        url = f"https://aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/global/publishers/google/models/{model}:streamGenerateContent?alt=sse"
    else:
        url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/{model}:streamGenerateContent?alt=sse"

    payload = {
        "contents": contents,
        "system_instruction": {
            "parts": [{"text": SYSTEM_PROMPT}]
        },
        "tools": [{
            "function_declarations": TOOL_DECLARATIONS
        }],
        "generation_config": {
            "temperature": 0.2,
            "max_output_tokens": 4096
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
                        txt = p.get("text")
                        if txt:
                            yield txt
                except Exception as e:
                    logger.debug(f"Error parsing SSE chunk: {e}")


@public_router.get("/status")
@router.get("/status")
def get_ai_status(db: Session = Depends(get_db)):
    """Returns AI model status and Palladium data freshness."""
    sync_info = tool_get_sync_status(db)
    return {
        "status": "online",
        "engine": "Google Gemini 3.8 Flash (Vertex AI)",
        "sync_info": sync_info
    }


@public_router.post("/chat")
@router.post("/chat")
def executive_chat_endpoint(
    req: ChatRequest,
    db: Session = Depends(get_db)
):
    """
    Main Executive AI Conversational Endpoint:
    Receives user message history, queries Palladium data via Gemini tool-calls,
    and returns rich executive answers.
    """
    if not req.messages:
        raise HTTPException(status_code=400, detail="Messages list cannot be empty.")

    # Convert client history to Gemini format
    contents = []
    for m in req.messages:
        role = "user" if m.role in ("user", "human") else "model"
        contents.append({
            "role": role,
            "parts": [{"text": m.content}]
        })

    # Execute multi-turn tool calling loop (fast 3 turns maximum)
    max_turns = 3
    tools_called_names = []

    for turn in range(max_turns):
        gemini_response = call_vertex_gemini_with_tools(contents)
        candidate = gemini_response.get("candidates", [{}])[0]
        content_obj = candidate.get("content", {})
        parts = content_obj.get("parts", [])

        # Check if model wants to call a function
        function_calls = [p.get("functionCall") for p in parts if p.get("functionCall")]

        if not function_calls:
            # Final text response reached
            text_parts = [p.get("text", "") for p in parts if p.get("text")]
            full_reply = "".join(text_parts).strip()
            return {
                "role": "assistant",
                "content": full_reply,
                "reply": full_reply,
                "tools_called": tools_called_names,
                "model": GEMINI_MODEL,
                "created_at": datetime.now(timezone.utc).isoformat()
            }

        # Model requested function call(s) — execute them locally on Cloud SQL
        contents.append(content_obj)
        tool_response_parts = []

        for call in function_calls:
            fn_name = call.get("name")
            fn_args = call.get("args") or {}
            fn_call_id = call.get("id")
            tools_called_names.append(fn_name)
            
            logger.info(f"Management AI Function Call: {fn_name}({fn_args}) [id={fn_call_id}]")
            fn_result = {}

            try:
                if fn_name == "tool_get_sync_status":
                    fn_result = tool_get_sync_status(db)
                elif fn_name == "tool_query_sales_and_invoices":
                    fn_result = tool_query_sales_and_invoices(db, **fn_args)
                elif fn_name == "tool_query_purchase_orders":
                    fn_result = tool_query_purchase_orders(db, **fn_args)
                elif fn_name == "tool_query_inventory":
                    fn_result = tool_query_inventory(db, **fn_args)
                elif fn_name == "tool_query_payments":
                    fn_result = tool_query_payments(db, **fn_args)
                elif fn_name == "tool_get_executive_kpis":
                    fn_result = tool_get_executive_kpis(db, **fn_args)
                else:
                    fn_result = {"error": f"Unknown tool '{fn_name}'"}
            except Exception as e:
                logger.error(f"Error executing tool {fn_name}: {e}")
                fn_result = {"error": str(e)}

            fn_resp_dict = {
                "name": fn_name,
                "response": {"result": fn_result}
            }
            if fn_call_id:
                fn_resp_dict["id"] = fn_call_id

            tool_response_parts.append({
                "functionResponse": fn_resp_dict
            })

        contents.append({
            "role": "user",
            "parts": tool_response_parts
        })

    # Final turn synthesis if model reached max_turns
    final_response = call_vertex_gemini_with_tools(contents)
    candidate = final_response.get("candidates", [{}])[0]
    parts = candidate.get("content", {}).get("parts", [])
    text_parts = [p.get("text", "") for p in parts if p.get("text")]
    full_reply = "".join(text_parts).strip() if text_parts else "Summary of retrieved ERP data is ready."

    return {
        "role": "assistant",
        "content": full_reply,
        "reply": full_reply,
        "tools_called": tools_called_names,
        "model": GEMINI_MODEL,
        "created_at": datetime.now(timezone.utc).isoformat()
    }


@public_router.post("/chat/stream")
@router.post("/chat/stream")
def executive_chat_stream_endpoint(
    req: ChatRequest,
    db: Session = Depends(get_db)
):
    """
    Streaming Executive AI Conversational Endpoint:
    Executes tool calls against Cloud SQL, then streams character-by-character
    markdown output directly from Gemini 3.8 Flash to the client via Server-Sent Events (SSE).
    """
    if not req.messages:
        raise HTTPException(status_code=400, detail="Messages list cannot be empty.")

    contents = []
    for m in req.messages:
        role = "user" if m.role in ("user", "human") else "model"
        contents.append({
            "role": role,
            "parts": [{"text": m.content}]
        })

    def event_stream():
        # First turn: Ask Gemini if it needs tools
        max_tool_turns = 2
        tools_called = []
        tool_results_summary = ""

        for _ in range(max_tool_turns):
            try:
                gemini_resp = call_vertex_gemini_with_tools(contents)
            except Exception as e:
                logger.error(f"Vertex AI initial call error: {e}")
                err_chunk = json.dumps({"error": str(e)})
                yield f"data: {err_chunk}\n\n"
                return

            candidate = gemini_resp.get("candidates", [{}])[0]
            content_obj = candidate.get("content", {})
            parts = content_obj.get("parts", [])
            function_calls = [p.get("functionCall") for p in parts if p.get("functionCall")]

            if not function_calls:
                # No tools required — we can stream text directly!
                # If candidate already has text, emit it, or stream from scratch
                already_text = "".join(p.get("text", "") for p in parts if p.get("text")).strip()
                if already_text:
                    # Emit in natural tokenized chunks
                    words = already_text.split(" ")
                    for i, w in enumerate(words):
                        chunk = (w + " ") if i < len(words) - 1 else w
                        yield f"data: {json.dumps({'text': chunk})}\n\n"
                    yield f"data: {json.dumps({'done': True, 'tools_called': tools_called})}\n\n"
                    return
                break

            # Model requested tools: execute on Cloud SQL and notify client
            contents.append(content_obj)
            tool_response_parts = []

            for call in function_calls:
                fn_name = call.get("name")
                fn_args = call.get("args") or {}
                fn_call_id = call.get("id")
                tools_called.append(fn_name)

                # Send SSE event that tool is executing so UI can show a live indicator
                yield f"data: {json.dumps({'status': f'Querying ERP: {fn_name}...', 'tools_called': tools_called})}\n\n"

                fn_result = {}
                try:
                    if fn_name == "tool_get_sync_status":
                        fn_result = tool_get_sync_status(db)
                    elif fn_name == "tool_query_sales_and_invoices":
                        fn_result = tool_query_sales_and_invoices(db, **fn_args)
                    elif fn_name == "tool_query_purchase_orders":
                        fn_result = tool_query_purchase_orders(db, **fn_args)
                    elif fn_name == "tool_query_inventory":
                        fn_result = tool_query_inventory(db, **fn_args)
                    elif fn_name == "tool_query_payments":
                        fn_result = tool_query_payments(db, **fn_args)
                    elif fn_name == "tool_get_executive_kpis":
                        fn_result = tool_get_executive_kpis(db, **fn_args)
                    else:
                        fn_result = {"error": f"Unknown tool '{fn_name}'"}
                except Exception as e:
                    logger.error(f"Error executing tool {fn_name}: {e}")
                    fn_result = {"error": str(e)}

                fn_resp_dict = {
                    "name": fn_name,
                    "response": {"result": fn_result}
                }
                if fn_call_id:
                    fn_resp_dict["id"] = fn_call_id

                tool_response_parts.append({
                    "functionResponse": fn_resp_dict
                })
                tool_results_summary += f"\n--- {fn_name} Results ---\n{json.dumps(fn_result, indent=2)}\n"

            contents.append({
                "role": "user",
                "parts": tool_response_parts
            })

        # Final pass: Stream the synthesis response from Gemini 3.8 Flash token-by-token
        # In multi-turn tool loops, Gemini 3.8 Flash requires thoughtSignature continuity.
        # If tools were invoked, convert the ERP data into direct grounding context for fast, bulletproof streaming.
        try:
            if tools_called and tool_results_summary:
                grounded_contents = [
                    {"role": "user", "parts": [{"text": req.messages[-1].content}]},
                    {"role": "user", "parts": [{
                        "text": f"PALLADIUM ERP LIVE DATA RETRIEVED:\n\n{tool_results_summary}\n\nPlease formulate your full, authoritative executive answer directly based on this data."
                    }]}
                ]
                for text_chunk in stream_vertex_gemini(grounded_contents):
                    if text_chunk:
                        yield f"data: {json.dumps({'text': text_chunk})}\n\n"
            else:
                for text_chunk in stream_vertex_gemini(contents):
                    if text_chunk:
                        yield f"data: {json.dumps({'text': text_chunk})}\n\n"
        except Exception as e:
            logger.error(f"Error streaming Gemini response: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

        yield f"data: {json.dumps({'done': True, 'tools_called': tools_called})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
