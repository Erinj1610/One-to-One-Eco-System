from google.cloud import storage
from gcp.connection import GCP_PROJECT_ID

BUCKET_NAME = f"{GCP_PROJECT_ID}-portal-assets"

def get_storage_client():
    try:
        storage_client = storage.Client(project=GCP_PROJECT_ID)
        return storage_client
    except Exception as e:
        print(f"Storage Auth Error: {e}")
        return None

def check_or_create_bucket():
    client = get_storage_client()
    if not client:
        return {"status": "error", "message": "Could not connect to Cloud Storage"}
    
    try:
        bucket = client.bucket(BUCKET_NAME)
        if not bucket.exists():
            # Choosing a default location, can be customized
            bucket = client.create_bucket(BUCKET_NAME, location="US")
            return {"status": "success", "message": f"Created new bucket: {BUCKET_NAME}"}
        return {"status": "success", "message": f"Bucket {BUCKET_NAME} exists"}
    except Exception as e:
        return {"status": "error", "message": f"Failed to access bucket: {str(e)}"}
