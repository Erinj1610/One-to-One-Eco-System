import os
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Initialize Firebase Admin SDK
firebase_initialized = False
try:
    firebase_creds_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
    firebase_creds_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
    options = {'projectId': 'one-to-one-eco-system'}
    
    if firebase_creds_json:
        import json
        try:
            creds_dict = json.loads(firebase_creds_json)
            cred = credentials.Certificate(creds_dict)
            firebase_admin.initialize_app(cred)
            firebase_initialized = True
            print("Firebase Admin SDK initialized using FIREBASE_CREDENTIALS_JSON env variable.")
        except Exception as json_err:
            print(f"Warning: Failed to initialize Firebase Admin from JSON env: {json_err}")

    if not firebase_initialized:
        if firebase_creds_path and os.path.exists(firebase_creds_path):
            cred = credentials.Certificate(firebase_creds_path)
            firebase_admin.initialize_app(cred, options)
            firebase_initialized = True
            print("Firebase Admin SDK initialized using Service Account JSON file.")
        else:
            # Fallback to Application Default Credentials
            firebase_admin.initialize_app(options=options)
            firebase_initialized = True
            print("Firebase Admin SDK initialized using Application Default Credentials.")
except Exception as e:
    print(f"Warning: Firebase Admin SDK could not be initialized: {e}")
    # Initialize without creds or leave uninitialized for fallback config
    try:
        # Check if already initialized by default
        firebase_admin.get_app()
        firebase_initialized = True
        print("Firebase Admin SDK was already initialized.")
    except ValueError:
        pass

security = HTTPBearer()

def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    
    # Check if we are in local offline mode and allow mock token fallback to prevent blocking devs
    is_prod = os.getenv("ENV") == "production"
    if not is_prod and token.startswith("mock-"):
        return {"email": "admin@onetoone.co.za", "uid": "mock-uid-123", "role": "admin"}

    if not firebase_initialized:
        raise HTTPException(
            status_code=500,
            detail="Authentication server configuration error. Firebase SDK not initialized."
        )
        
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid or expired authentication credentials: {str(e)}"
        )
