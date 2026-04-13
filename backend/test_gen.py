import requests
import json

URL = "http://127.0.0.1:8000/admin/generate/DESIGN_FEE_PROPOSAL"
PAYLOAD = {
    "PROJECT_NAME": "Debug Project",
    "CLIENT_NAME": "Debug Client",
    "DATE": "April 9, 2026",
    "GRAND_TOTAL": "R 50.00"
}

print(f"Sending request to {URL}...")
try:
    res = requests.post(URL, json=PAYLOAD, timeout=30)
    print(f"Status: {res.status_code}")
    if res.status_code == 200:
        print("Success! Got PDF bytes.")
    else:
        print(f"Error: {res.text}")
except Exception as e:
    print(f"Connection failed: {e}")
