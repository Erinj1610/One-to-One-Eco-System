from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.cloud_sql import get_db
from models.orm_models import LookupValue, User, Role
from services.firebase_auth import verify_firebase_token
from pydantic import BaseModel
from typing import Optional, List, Any

router = APIRouter()

class LookupValueCreate(BaseModel):
    category: str
    label: str
    value: str
    is_active: Optional[bool] = True
    sort_order: Optional[int] = 0
    metadata_json: Optional[Any] = None

class LookupValueUpdate(BaseModel):
    category: Optional[str] = None
    label: Optional[str] = None
    value: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    metadata_json: Optional[Any] = None

def check_admin(db: Session, current_user: dict):
    db_user = db.query(User).filter(User.email == current_user.get("email")).first()
    is_admin = False
    if db_user and db_user.role_id:
        role = db.query(Role).filter(Role.id == db_user.role_id).first()
        if role and role.name.lower() == "admin":
            is_admin = True
    if current_user.get("email") in ["admin@onetoone.co.za", "erin@onetoone.co.za", "erin.jones@1-to-1.world"]:
        is_admin = True
    if not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to perform admin tasks")

@router.get("/")
def get_lookups(category: Optional[str] = None, db: Session = Depends(get_db), current_user: dict = Depends(verify_firebase_token)):
    query = db.query(LookupValue).filter(LookupValue.is_active == True)
    if category:
        query = query.filter(LookupValue.category == category)
    results = query.order_by(LookupValue.sort_order.asc(), LookupValue.id.asc()).all()
    return results

@router.get("/categories")
def get_lookup_categories(db: Session = Depends(get_db), current_user: dict = Depends(verify_firebase_token)):
    # Standard categories that are known to exist in the app
    default_categories = ["client_type", "loss_reason", "project_status", "delay_reason"]
    db_categories = db.query(LookupValue.category).distinct().all()
    all_categories = set(default_categories + [row[0] for row in db_categories if row[0]])
    return sorted(list(all_categories))

# Admin endpoints
@router.get("/admin/all")
def get_all_lookups_admin(db: Session = Depends(get_db), current_user: dict = Depends(verify_firebase_token)):
    check_admin(db, current_user)
    return db.query(LookupValue).order_by(LookupValue.category.asc(), LookupValue.sort_order.asc()).all()

@router.post("/admin")
def create_lookup_admin(data: LookupValueCreate, db: Session = Depends(get_db), current_user: dict = Depends(verify_firebase_token)):
    check_admin(db, current_user)
    db_val = LookupValue(
        category=data.category,
        label=data.label,
        value=data.value,
        is_active=data.is_active,
        sort_order=data.sort_order,
        metadata_json=data.metadata_json
    )
    db.add(db_val)
    db.commit()
    db.refresh(db_val)
    return db_val

@router.put("/admin/{item_id}")
def update_lookup_admin(item_id: int, data: LookupValueUpdate, db: Session = Depends(get_db), current_user: dict = Depends(verify_firebase_token)):
    check_admin(db, current_user)
    db_val = db.query(LookupValue).filter(LookupValue.id == item_id).first()
    if not db_val:
        raise HTTPException(status_code=404, detail="Lookup value not found")
    
    if data.category is not None:
        db_val.category = data.category
    if data.label is not None:
        db_val.label = data.label
    if data.value is not None:
        db_val.value = data.value
    if data.is_active is not None:
        db_val.is_active = data.is_active
    if data.sort_order is not None:
        db_val.sort_order = data.sort_order
    if data.metadata_json is not None:
        db_val.metadata_json = data.metadata_json
        
    db.commit()
    db.refresh(db_val)
    return db_val

@router.delete("/admin/{item_id}")
def delete_lookup_admin(item_id: int, db: Session = Depends(get_db), current_user: dict = Depends(verify_firebase_token)):
    check_admin(db, current_user)
    db_val = db.query(LookupValue).filter(LookupValue.id == item_id).first()
    if not db_val:
        raise HTTPException(status_code=404, detail="Lookup value not found")
    db.delete(db_val)
    db.commit()
    return {"status": "success", "message": "Lookup value deleted"}
