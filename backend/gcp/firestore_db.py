from google.cloud import firestore
from gcp.connection import GCP_PROJECT_ID

def get_firestore_client():
    try:
        db = firestore.Client(project=GCP_PROJECT_ID)
        return db
    except Exception as e:
        print(f"Firestore Auth Error: {e}")
        return None

def add_mock_data():
    db = get_firestore_client()
    if not db:
        return {"status": "error", "message": "Could not connect to Firestore"}
    
    doc_ref = db.collection('test_collection').document('mock_doc')
    try:
        doc_ref.set({
            'name': 'Test Project',
            'status': 'active',
            'timestamp': firestore.SERVER_TIMESTAMP
        })
        return {"status": "success", "message": "Mock data added to Firestore"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_mock_data():
    db = get_firestore_client()
    if not db:
        return {"status": "error", "message": "Could not connect to Firestore"}
    
    try:
        doc_ref = db.collection('test_collection').document('mock_doc')
        doc = doc_ref.get()
        if doc.exists:
            return {"status": "success", "data": doc.to_dict()}
        else:
            return {"status": "not_found", "message": "No mock data found"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
