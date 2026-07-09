import sqlite3
import json

conn = sqlite3.connect('C:/Users/erin/Desktop/One to One Eco System/backend/local_ecosystem.db')
cursor = conn.cursor()

try:
    cursor.execute("SELECT key, value FROM portal_settings WHERE key = 'projects'")
    row = cursor.fetchone()
    if row:
        print("Found key:", row[0])
        projects = json.loads(row[1]) if isinstance(row[1], str) else row[1]
        print("Number of projects:", len(projects))
        for p_key, p_val in projects.items():
            print(f"Project key: {p_key}")
            for order in p_val.get('orders', []):
                if order.get('id') == 'PO-2026-7924':
                    print(f"  Order: {order.get('id')}")
                    for idx, item in enumerate(order.get('itemsList', [])):
                        print(f"    Item {idx}: {item.get('code')} - supplier: '{item.get('supplier')}' - stockStatus: '{item.get('stockStatus')}'")
                        print(f"      purchaseHistory: {item.get('purchaseHistory')}")
                        print(f"      receivingHistory: {item.get('receivingHistory')}")
    else:
        print("No projects key found.")
except Exception as e:
    print("Error:", e)

conn.close()
