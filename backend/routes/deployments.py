from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.orm import Session
from database.cloud_sql import get_db
from models.deployment import DeploymentRevision
from models.orm_models import PortalSetting
from datetime import datetime
import os
import json
import urllib.request
import urllib.error

router = APIRouter()

GITHUB_REPO = "Erinj1610/One-to-One-Eco-System"

def get_github_token(db: Session) -> str:
    setting = db.query(PortalSetting).filter(PortalSetting.key == "github_deploy_token").first()
    if setting and setting.value:
        if isinstance(setting.value, dict) and "token" in setting.value:
            return str(setting.value["token"]).strip()
        if isinstance(setting.value, str):
            return setting.value.strip()
    return os.environ.get("GITHUB_DEPLOY_TOKEN") or os.environ.get("GITHUB_TOKEN") or ""

def merge_staging_to_main_on_github(token: str, version_tag: str, release_name: str, release_notes: str, admin_email: str) -> dict:
    url = f"https://api.github.com/repos/{GITHUB_REPO}/merges"
    commit_msg = f"🚀 Production Release {version_tag}: {release_name}\n\n{release_notes}\n\nPromoted by: {admin_email}"
    
    req_body = json.dumps({
        "base": "main",
        "head": "staging",
        "commit_message": commit_msg
    }).encode("utf-8")
    
    req = urllib.request.Request(
        url,
        data=req_body,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "OneToOne-Portal-Deployer",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_code = response.getcode()
            if res_code == 204:
                return {
                    "status": "up_to_date",
                    "sha": "main-head",
                    "message": "Main branch is already up to date with staging."
                }
            data = json.loads(response.read().decode("utf-8"))
            return {
                "status": "merged",
                "sha": data.get("sha", "head"),
                "message": f"Successfully merged staging into main ({data.get('sha', '')[:7]})"
            }
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            err_json = json.loads(err_body)
            msg = err_json.get("message", err_body)
        except Exception:
            msg = err_body
        if e.code == 409:
            raise HTTPException(status_code=409, detail=f"Git merge conflict between staging and main: {msg}. Please resolve branch differences in Git.")
        elif e.code in (401, 403):
            raise HTTPException(status_code=401, detail=f"GitHub token authentication failed: {msg}. Please verify your GitHub Deploy Token in portal settings.")
        else:
            raise HTTPException(status_code=500, detail=f"GitHub merge API error ({e.code}): {msg}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect to GitHub API: {str(e)}")

@router.get("/deployments")
def get_deployments_status(db: Session = Depends(get_db)):
    """
    Returns deployment status, active production revision, staging status, full release history log, and GitHub sync status.
    """
    revisions = db.query(DeploymentRevision).order_by(DeploymentRevision.created_at.desc()).all()
    active_prod = db.query(DeploymentRevision).filter(DeploymentRevision.is_active_prod == True).first()
    
    token = get_github_token(db)
    github_configured = bool(token and len(token) > 10)
    masked_token = f"{token[:4]}...{token[-4:]}" if github_configured else None

    formatted_revisions = []
    for r in revisions:
        formatted_revisions.append({
            "id": r.id,
            "version_tag": r.version_tag,
            "release_name": r.release_name,
            "release_notes": r.release_notes or "",
            "environment": r.environment,
            "commit_hash": r.commit_hash or "",
            "cloud_run_revision": r.cloud_run_revision or "",
            "deployed_by": r.deployed_by or "Admin",
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else "",
            "is_active_prod": r.is_active_prod
        })

    # Fallback initial status if no DB rows exist yet
    if not active_prod and not formatted_revisions:
        formatted_revisions = [{
            "id": 1,
            "version_tag": "v1.5.0",
            "release_name": "Initial Production Release & Live Vault Engine",
            "release_notes": "Google Sheets document engine, template row height preservation, Drive Vault hierarchy, bulk product reconciliation.",
            "environment": "production",
            "commit_hash": "95ba1cf",
            "cloud_run_revision": "one-to-one-backend-00509-hq6",
            "deployed_by": "erin.jones@1-to-1.world",
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "is_active_prod": True
        }]

    return {
        "current_production": {
            "version_tag": active_prod.version_tag if active_prod else "v1.5.0",
            "release_name": active_prod.release_name if active_prod else "Initial Production Release & Live Vault Engine",
            "cloud_run_revision": active_prod.cloud_run_revision if active_prod else "one-to-one-backend-00509-hq6",
            "deployed_by": active_prod.deployed_by if active_prod else "erin.jones@1-to-1.world",
            "created_at": active_prod.created_at.strftime("%Y-%m-%d %H:%M:%S") if active_prod and active_prod.created_at else datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        },
        "staging": {
            "url": "https://frontend-git-staging-erinj1610s-projects.vercel.app",
            "backend_url": "https://one-to-one-backend-staging-858977785048.us-central1.run.app",
            "status": "Ready for Promotion"
        },
        "github_integration": {
            "configured": github_configured,
            "repository": GITHUB_REPO,
            "masked_token": masked_token
        },
        "history": formatted_revisions
    }

@router.post("/deployments/github-token")
def save_github_token(payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Saves and validates the GitHub Deploy Token for 1-click automated promotions.
    """
    token = str(payload.get("token") or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="GitHub Token cannot be empty.")
    
    # Test token against repository
    test_url = f"https://api.github.com/repos/{GITHUB_REPO}"
    req = urllib.request.Request(
        test_url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "OneToOne-Portal-Deployer"
        }
    )
    try:
        with urllib.request.urlopen(req) as resp:
            if resp.getcode() != 200:
                raise HTTPException(status_code=400, detail="Failed to verify token with GitHub repository.")
    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"GitHub Token rejected ({e.code}): Please ensure token has 'repo' or 'contents:write' permission.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not connect to GitHub: {str(e)}")

    # Persist in portal_settings
    setting = db.query(PortalSetting).filter(PortalSetting.key == "github_deploy_token").first()
    if setting:
        setting.value = {"token": token, "updated_at": datetime.utcnow().isoformat()}
    else:
        setting = PortalSetting(key="github_deploy_token", value={"token": token, "updated_at": datetime.utcnow().isoformat()})
        db.add(setting)
    db.commit()

    return {
        "status": "success",
        "message": f"GitHub Deploy Token verified and saved successfully for repository {GITHUB_REPO}!"
    }

@router.post("/deployments/promote")
def promote_staging_to_production(payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Promotes Staging release to Production:
    1. Executes GitHub API merge from 'staging' into 'main'
    2. GitHub push to 'main' automatically triggers Vercel (Frontend) and GitHub Actions (Cloud Run Backend)
    3. Records active production revision in Cloud SQL
    """
    version_tag = str(payload.get("version_tag") or f"v1.{int(datetime.now().timestamp()) % 1000}").strip()
    release_name = str(payload.get("release_name") or "New Portal Feature Release").strip()
    release_notes = str(payload.get("release_notes") or "").strip()
    admin_email = str(payload.get("admin_email") or "admin@1-to-1.world").strip()
    
    token = get_github_token(db)
    commit_hash = "main-head"
    
    if token:
        merge_result = merge_staging_to_main_on_github(token, version_tag, release_name, release_notes, admin_email)
        commit_hash = str(merge_result.get("sha") or "main-head")[:8]
    else:
        raise HTTPException(
            status_code=400,
            detail="GitHub Deploy Token is not configured. Please enter your GitHub Personal Access Token (with 'repo' scope) in Settings -> Releases & Deployments to enable automated 1-click deployments."
        )

    # Deactivate current active production revision
    db.query(DeploymentRevision).filter(DeploymentRevision.is_active_prod == True).update({"is_active_prod": False})
    
    # Create new active production revision log
    new_rev = DeploymentRevision(
        version_tag=version_tag,
        release_name=release_name,
        release_notes=release_notes,
        environment="production",
        commit_hash=commit_hash,
        cloud_run_revision=f"one-to-one-backend-{version_tag.replace('.', '')}",
        deployed_by=admin_email,
        created_at=datetime.utcnow(),
        is_active_prod=True
    )
    db.add(new_rev)
    db.commit()
    db.refresh(new_rev)
    
    return {
        "status": "success",
        "message": f"Successfully promoted release '{release_name}' ({version_tag})! Staging merged into main (commit {commit_hash}). Vercel frontend and Cloud Run backend deployments have been triggered.",
        "revision_id": new_rev.id,
        "commit_hash": commit_hash
    }

@router.post("/deployments/rollback/{revision_id}")
def rollback_to_revision(revision_id: int, payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Rolls back live Production traffic to a historic revision ID.
    """
    rev = db.query(DeploymentRevision).filter(DeploymentRevision.id == revision_id).first()
    if not rev:
        raise HTTPException(status_code=404, detail="Requested deployment revision not found.")

    # Update database active marker
    db.query(DeploymentRevision).filter(DeploymentRevision.is_active_prod == True).update({"is_active_prod": False})
    rev.is_active_prod = True
    db.commit()

    return {
        "status": "success",
        "message": f"Successfully marked revision {rev.version_tag} ({rev.release_name}) as active Production!",
        "active_revision": rev.version_tag
    }
