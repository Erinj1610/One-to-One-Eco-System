from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.cloud_sql import get_db
from models.orm_models import User, Employee, Role
from services.firebase_auth import verify_firebase_token, firebase_initialized
from firebase_admin import auth as firebase_auth
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

class UserInvite(BaseModel):
    name: str
    email: str
    role_id: Optional[int] = None
    department: Optional[str] = None

@router.get("/", response_model=List[dict])
def list_users(db: Session = Depends(get_db), current_user: dict = Depends(verify_firebase_token)):
    db_user = db.query(User).filter(User.email == current_user.get("email")).first()
    is_admin = False
    if db_user and db_user.role_id:
        role = db.query(Role).filter(Role.id == db_user.role_id).first()
        if role and role.name.lower() == "admin":
            is_admin = True
    if current_user.get("email") in ["admin@onetoone.co.za", "erin@onetoone.co.za", "erin.jones@1-to-1.world"]:
        is_admin = True

    if not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to manage users")

    users = db.query(User).all()
    result = []
    for u in users:
        emp = db.query(Employee).filter(Employee.user_id == u.id).first()
        role = db.query(Role).filter(Role.id == u.role_id).first() if u.role_id else None
        result.append({
            "id": u.id,
            "email": u.email,
            "role": role.name if role else "User",
            "role_id": u.role_id,
            "name": emp.name if emp else "Unknown",
            "department": emp.department if emp else "None"
        })
    return result

@router.post("/", status_code=status.HTTP_201_CREATED)
def invite_user(invite: UserInvite, db: Session = Depends(get_db), current_user: dict = Depends(verify_firebase_token)):
    db_user = db.query(User).filter(User.email == current_user.get("email")).first()
    is_admin = False
    if db_user and db_user.role_id:
        role = db.query(Role).filter(Role.id == db_user.role_id).first()
        if role and role.name.lower() == "admin":
            is_admin = True
    if current_user.get("email") in ["admin@onetoone.co.za", "erin@onetoone.co.za", "erin.jones@1-to-1.world"]:
        is_admin = True

    if not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to manage users")

    existing_user = db.query(User).filter(User.email == invite.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists in local database")

    reset_link = None

    if firebase_initialized:
        try:
            try:
                fb_user = firebase_auth.get_user_by_email(invite.email)
            except Exception:
                fb_user = firebase_auth.create_user(
                    email=invite.email,
                    email_verified=False,
                    disabled=False
                )
            reset_link = firebase_auth.generate_password_reset_link(invite.email)
            
            # Send the email automatically via Identity Platform REST API
            try:
                import urllib.request
                import json
                api_key = "AIzaSyAsdT5wto73He85BZjf1gu_sEBtDxDgPkA"
                url = f"https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key={api_key}"
                post_data = json.dumps({
                    "requestType": "PASSWORD_RESET",
                    "email": invite.email
                }).encode("utf-8")
                req = urllib.request.Request(
                    url,
                    data=post_data,
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req) as response:
                    print(f"Successfully triggered password reset email for {invite.email}")
            except Exception as email_err:
                print(f"Warning: Failed to automatically send email: {email_err}")
                
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Firebase user creation failed: {str(e)}")
    else:
        reset_link = f"https://my-app.firebaseapp.com/reset?email={invite.email}&mock=true"

    # Make sure default Roles exist
    if invite.role_id:
        role_record = db.query(Role).filter(Role.id == invite.role_id).first()
    else:
        # Default to staff/user role or first role
        role_record = db.query(Role).filter(Role.name.ilike("staff%")).first() or db.query(Role).first()
        if not role_record:
            role_record = Role(name="Staff")
            db.add(role_record)
            db.commit()
            db.refresh(role_record)

    new_user = User(email=invite.email, role_id=role_record.id if role_record else None)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    new_employee = Employee(
        name=invite.name,
        department=invite.department or "Staff",
        user_id=new_user.id,
        role=role_record.name if role_record else "Staff"
    )
    db.add(new_employee)
    db.commit()

    return {
        "message": "User invited successfully",
        "email": invite.email,
        "reset_link": reset_link
    }

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: dict = Depends(verify_firebase_token)):
    db_user = db.query(User).filter(User.email == current_user.get("email")).first()
    is_admin = False
    if db_user and db_user.role_id:
        role = db.query(Role).filter(Role.id == db_user.role_id).first()
        if role and role.name.lower() == "admin":
            is_admin = True
    if current_user.get("email") in ["admin@onetoone.co.za", "erin@onetoone.co.za", "erin.jones@1-to-1.world"]:
        is_admin = True

    if not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to manage users")

    user_to_delete = db.query(User).filter(User.id == user_id).first()
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")

    if firebase_initialized:
        try:
            fb_user = firebase_auth.get_user_by_email(user_to_delete.email)
            firebase_auth.delete_user(fb_user.uid)
        except Exception as e:
            print(f"Warning: Failed to delete user from Firebase Auth: {e}")

    employee = db.query(Employee).filter(Employee.user_id == user_id).first()
    if employee:
        db.delete(employee)
    
    db.delete(user_to_delete)
    db.commit()

    return {"message": "User deleted successfully"}
