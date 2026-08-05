import sys, os
sys.path.append(r'c:\Users\erin\Desktop\One to One Eco System\backend')
from database.cloud_sql import SessionLocal
from sqlalchemy import text

db = SessionLocal()

res = db.execute(text("SELECT value FROM portal_settings WHERE key = 'invoices'")).first()
inv_list = res[0] if res else []

projects = db.execute(text("SELECT id, name, project_key FROM projects")).fetchall()
proj_by_name = {r[1].lower(): (r[0], r[2]) for r in projects if r[1]}

orders_count = 0
items_count = 0

for inv in inv_list:
    pn = (inv.get('project') or '').lower()
    p_info = proj_by_name.get(pn)
    if not p_info:
        continue
    pid, pkey = p_info
    po_num = str(inv.get('orderId') or f"PO-{inv.get('id')}")
    qn = str(inv.get('code') or inv.get('id') or 'General Spec')
    amt_raw = str(inv.get('amount', 0)).replace('R', '').replace(',', '').strip()
    try:
        val = float(amt_raw) if amt_raw and amt_raw != '—' else 0.0
    except Exception:
        val = 0.0
    paid_val = val if inv.get('paid') or inv.get('status') == 'Paid' else 0.0
    out_val = 0.0 if paid_val > 0 else val
    st = 'Complete' if paid_val > 0 else 'Pending'
    
    db.execute(text("""
        INSERT INTO orders (project_id, project_key, po_number, supplier_name, items_count, value, paid, outstanding, status, eta, quote_name)
        VALUES (:pid, :pk, :po, '1-to-1 Lighting', :ic, :val, :pd, :out, :st, 'TBD', :qn)
        ON CONFLICT (po_number) DO UPDATE SET
            project_id = EXCLUDED.project_id,
            value = EXCLUDED.value
    """), {
        'pid': pid,
        'pk': pkey,
        'po': po_num,
        'ic': len(inv.get('items', [])),
        'val': val,
        'pd': paid_val,
        'out': out_val,
        'st': st,
        'qn': qn
    })
    orders_count += 1

    for idx, item in enumerate(inv.get('items', [])):
        item_id = f"{po_num}-item-{idx}"
        db.execute(text("""
            INSERT INTO order_items (id, order_id, qty, code, description, unit_cost, unit_retail, item_type, stock_status)
            VALUES (:id, :oid, :qty, :code, :desc, :uc, :ur, 'Hardware', 'In Stock')
            ON CONFLICT (id) DO UPDATE SET
                qty = EXCLUDED.qty,
                code = EXCLUDED.code
        """), {
            'id': item_id,
            'oid': po_num,
            'qty': int(item.get('qtyAction') or item.get('qty') or 1),
            'code': str(item.get('code', 'LIGHT-001')),
            'desc': str(item.get('description', 'Lighting Item')),
            'uc': float(item.get('rate', 0) or 0) * 0.5,
            'ur': float(item.get('rate', 0) or 0)
        })
        items_count += 1

db.commit()
print(f"SUCCESS! Built and inserted {orders_count} orders and {items_count} order items into Cloud SQL!")
db.close()
