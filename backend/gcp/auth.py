import firebase_admin
from firebase_admin import credentials, auth
from fastapi import Header, HTTPException
from typing import Optional
import logging

logger = logging.getLogger(__name__)

def initialize_firebase():
    if not firebase_admin._apps:
        try:
            # Assumes Application Default Credentials or GOOGLE_APPLICATION_CREDENTIALS 
            # environment variable is present configuring the default credentials for the VM or local
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred, options={'projectId': 'one-to-one-eco-system'})
            logger.info("Firebase Admin initialized successfully.")
        except Exception as e:
            logger.error(f"Error initializing Firebase Admin: {e}")

# Call to initialize default settings
initialize_firebase()

def verify_token(authorization: Optional[str] = Header(None)):
    """
    FastAPI dependency to verify a token in the Authorization header.
    Usage:
        @app.get("/api/secure-data")
        def secure_data(user = Depends(verify_token)): ...
    """
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Invalid or missing Authorization header")
    
    token = authorization.split(" ")[1]
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
