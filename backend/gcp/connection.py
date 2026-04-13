import os
import google.auth
from google.auth.exceptions import DefaultCredentialsError

# Centralize the GCP Project ID as agreed on
GCP_PROJECT_ID = "one-to-one-eco-system"

def check_gcp_status():
    """
    Checks if Google Cloud credentials can be acquired from the environment.
    This respects Application Default Credentials (e.g. from `gcloud auth application-default login`)
    or the GOOGLE_APPLICATION_CREDENTIALS env var.
    """
    try:
        credentials, project = google.auth.default()
        return {
            "status": "connected",
            "project_id": project or GCP_PROJECT_ID,
            "message": "GCP Application Default Credentials found."
        }
    except DefaultCredentialsError:
        return {
            "status": "error",
            "project_id": GCP_PROJECT_ID,
            "message": "GCP Credentials not found. Please run 'gcloud auth application-default login'."
        }
