from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.cloud_sql import get_db
from models.orm_models import User, Employee, Role, RolePermission
from services.firebase_auth import verify_firebase_token, firebase_initialized
from firebase_admin import auth as firebase_auth
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

router = APIRouter()

SYSTEM_MODULES = [
    'Dashboard', 'CRM', 'Pipeline', 'Design tracker', 'Projects', 
    'Design fee', 'Time tracking', 'Products', 'BOQ Maker', 'Orders', 
    'Invoices', 'Documents', 'HR & people', 'Reports', 'Support'
]

def is_admin_user(db: Session, current_user: dict) -> bool:
    email = (current_user.get("email") or "").strip().lower()
    role_claim = (current_user.get("role") or "").strip().lower()
    if role_claim == "admin":
        return True
    if email in ["admin@onetoone.co.za", "erin@onetoone.co.za", "erin.jones@1-to-1.world", "staff@onetoone.co.za"]:
        return True
    db_user = db.query(User).filter(User.email.ilike(email)).first()
    if db_user and db_user.role_id:
        role = db.query(Role).filter(Role.id == db_user.role_id).first()
        if role and role.name.lower() == "admin":
            return True
    return False


class UserInvite(BaseModel):
    name: str
    email: str
    role_id: Optional[int] = None
    department: Optional[str] = None

class UserUpdate(BaseModel):
    name: str
    role_id: Optional[int] = None
    department: Optional[str] = None
    disabled: Optional[bool] = False

class RoleCreate(BaseModel):
    name: str

class RoleUpdate(BaseModel):
    name: str

class PermissionsUpdate(BaseModel):
    role_id: Optional[int] = None
    permissions: Optional[Dict[str, str]] = None
    matrix: Optional[Dict[str, Dict[str, str]]] = None

@router.get("/", response_model=List[dict])
def list_users(db: Session = Depends(get_db), current_user: dict = Depends(verify_firebase_token)):
    if not is_admin_user(db, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to manage users")

    users = db.query(User).all()
    result = []
    for u in users:
        emp = db.query(Employee).filter(Employee.user_id == u.id).first()
        role = db.query(Role).filter(Role.id == u.role_id).first() if u.role_id else None
        name = emp.name if (emp and emp.name) else (u.email.split("@")[0].replace(".", " ").title())
        result.append({
            "id": u.id,
            "email": u.email,
            "role": role.name if role else "User",
            "role_id": u.role_id,
            "name": name,
            "department": emp.department if (emp and emp.department) else "General",
            "disabled": bool(u.disabled)
        })
    return result

@router.get("/roles", response_model=List[dict])
def list_roles(db: Session = Depends(get_db), current_user: dict = Depends(verify_firebase_token)):
    roles = db.query(Role).order_by(Role.id.asc()).all()
    res = []
    for r in roles:
        user_count = db.query(User).filter(User.role_id == r.id).count()
        res.append({
            "id": r.id,
            "name": r.name,
            "user_count": user_count
        })
    return res

@router.post("/roles", status_code=status.HTTP_201_CREATED)
def create_role(data: RoleCreate, db: Session = Depends(get_db), current_user: dict = Depends(verify_firebase_token)):
    if not is_admin_user(db, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to manage roles")
    clean_name = data.name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Role name cannot be empty")
    existing = db.query(Role).filter(Role.name.ilike(clean_name)).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Role '{clean_name}' already exists")
    new_role = Role(name=clean_name)
    db.add(new_role)
    db.commit()
    db.refresh(new_role)
    # Seed default permissions as 'View only' for all modules
    for mod in SYSTEM_MODULES:
        db.add(RolePermission(role_id=new_role.id, section=mod, permission_level="View only"))
    db.commit()
    return {"id": new_role.id, "name": new_role.name, "user_count": 0}

@router.put("/roles/{role_id}")
def update_role(role_id: int, data: RoleUpdate, db: Session = Depends(get_db), current_user: dict = Depends(verify_firebase_token)):
    if not is_admin_user(db, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to manage roles")
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    clean_name = data.name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Role name cannot be empty")
    role.name = clean_name
    db.commit()
    return {"message": "Role updated successfully", "id": role.id, "name": role.name}

@router.delete("/roles/{role_id}")
def delete_role(role_id: int, db: Session = Depends(get_db), current_user: dict = Depends(verify_firebase_token)):
    if not is_admin_user(db, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to manage roles")
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.name.lower() == "admin":
        raise HTTPException(status_code=400, detail="The default Admin role cannot be deleted")
    user_count = db.query(User).filter(User.role_id == role_id).count()
    if user_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete role: {user_count} user(s) currently assigned to this role")
    db.query(RolePermission).filter(RolePermission.role_id == role_id).delete()
    db.delete(role)
    db.commit()
    return {"message": "Role deleted successfully"}

@router.get("/permissions")
def get_permissions(db: Session = Depends(get_db), current_user: dict = Depends(verify_firebase_token)):
    roles = db.query(Role).order_by(Role.id.asc()).all()
    perms = db.query(RolePermission).all()
    
    matrix = {}
    for r in roles:
        matrix[str(r.id)] = {}
        for mod in SYSTEM_MODULES:
            matrix[str(r.id)][mod] = "No access"
            
    for p in perms:
        rid = str(p.role_id)
        if rid in matrix:
            matrix[rid][p.section] = p.permission_level

    return {
        "roles": [{"id": r.id, "name": r.name} for r in roles],
        "modules": SYSTEM_MODULES,
        "matrix": matrix
    }

@router.put("/permissions")
def update_permissions(data: PermissionsUpdate, db: Session = Depends(get_db), current_user: dict = Depends(verify_firebase_token)):
    if not is_admin_user(db, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to manage permissions")
        
    if data.matrix:
        for rid_str, mod_perms in data.matrix.items():
            try:
                rid = int(rid_str)
            except ValueError:
                continue
            for mod, level in mod_perms.items():
                rp = db.query(RolePermission).filter(RolePermission.role_id == rid, RolePermission.section == mod).first()
                if rp:
                    rp.permission_level = level
                else:
                    db.add(RolePermission(role_id=rid, section=mod, permission_level=level))
        db.commit()
        return {"message": "Permissions matrix updated successfully"}

    elif data.role_id is not None and data.permissions:
        rid = data.role_id
        for mod, level in data.permissions.items():
            rp = db.query(RolePermission).filter(RolePermission.role_id == rid, RolePermission.section == mod).first()
            if rp:
                rp.permission_level = level
            else:
                db.add(RolePermission(role_id=rid, section=mod, permission_level=level))
        db.commit()
        return {"message": f"Permissions updated successfully for role {rid}"}

    raise HTTPException(status_code=400, detail="Invalid permissions payload")

@router.post("/", status_code=status.HTTP_201_CREATED)
def invite_user(invite: UserInvite, db: Session = Depends(get_db), current_user: dict = Depends(verify_firebase_token)):
    if not is_admin_user(db, current_user):
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
            if reset_link:
                reset_link = reset_link.replace(
                    "https://one-to-one-portal-500205.firebaseapp.com/__/auth/action",
                    "https://ejportal.vercel.app/reset-password"
                )
            
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
    if not is_admin_user(db, current_user):
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
        # Import related models to ensure clean deletion
        from models.orm_models import Project, LeaveBalance, LeaveRequest, WellbeingCheckIn, StaffSelfAssessment, TimeLog
        
        # 1. Nullify project manager links
        db.query(Project).filter(Project.pm_id == employee.id).update({Project.pm_id: None})
        
        # 2. Nullify manager references in other employees
        db.query(Employee).filter(Employee.manager_id == employee.id).update({Employee.manager_id: None})
        
        # 3. Clean up leave balances and requests
        db.query(LeaveBalance).filter(LeaveBalance.employee_id == employee.id).delete()
        db.query(LeaveRequest).filter(LeaveRequest.employee_id == employee.id).delete()
        db.query(LeaveRequest).filter(LeaveRequest.manager_id == employee.id).update({LeaveRequest.manager_id: None})
        
        # 4. Clean up wellbeing check-ins and self assessments
        db.query(WellbeingCheckIn).filter(
            (WellbeingCheckIn.employee_id == employee.id) | 
            (WellbeingCheckIn.manager_id == employee.id)
        ).delete()
        db.query(StaffSelfAssessment).filter(StaffSelfAssessment.employee_id == employee.id).delete()
        
        # 5. Clean up time logs
        db.query(TimeLog).filter(TimeLog.employee_id == employee.id).delete()
        
        # 6. Delete the employee record
        db.delete(employee)
    
    db.delete(user_to_delete)
    db.commit()

    return {"message": "User deleted successfully"}

@router.put("/{user_id}")
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db), current_user: dict = Depends(verify_firebase_token)):
    if not is_admin_user(db, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to manage users")

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update User model
    target_user.role_id = data.role_id
    target_user.disabled = data.disabled

    # Update Employee model
    employee = db.query(Employee).filter(Employee.user_id == user_id).first()
    role_record = db.query(Role).filter(Role.id == data.role_id).first() if data.role_id else None
    
    if not employee:
        employee = Employee(
            user_id=user_id,
            name=data.name,
            department=data.department or "Staff",
            role=role_record.name if role_record else "Staff"
        )
        db.add(employee)
    else:
        employee.name = data.name
        employee.department = data.department or "Staff"
        if role_record:
            employee.role = role_record.name

    # Sync disabled status with Identity Platform/Firebase Auth
    if firebase_initialized:
        try:
            fb_user = firebase_auth.get_user_by_email(target_user.email)
            firebase_auth.update_user(fb_user.uid, disabled=bool(data.disabled))
            print(f"Synced disable status ({data.disabled}) for {target_user.email} in Firebase Auth.")
        except Exception as e:
            print(f"Warning: Failed to sync disable status in Firebase Auth: {e}")

    db.commit()
    return {"message": "User updated successfully"}

@router.post("/{user_id}/reset-password")
def trigger_password_reset(user_id: int, db: Session = Depends(get_db), current_user: dict = Depends(verify_firebase_token)):
    if not is_admin_user(db, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to manage users")

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    reset_link = None
    if firebase_initialized:
        try:
            reset_link = firebase_auth.generate_password_reset_link(target_user.email)
            if reset_link:
                reset_link = reset_link.replace(
                    "https://one-to-one-portal-500205.firebaseapp.com/__/auth/action",
                    "https://ejportal.vercel.app/reset-password"
                )
            
            # Send the email automatically via Identity Platform REST API
            try:
                import urllib.request
                import json
                api_key = "AIzaSyAsdT5wto73He85BZjf1gu_sEBtDxDgPkA"
                url = f"https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key={api_key}"
                post_data = json.dumps({
                    "requestType": "PASSWORD_RESET",
                    "email": target_user.email
                }).encode("utf-8")
                req = urllib.request.Request(
                    url,
                    data=post_data,
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req) as response:
                    print(f"Successfully triggered password reset email for {target_user.email}")
            except Exception as email_err:
                print(f"Warning: Failed to automatically send email: {email_err}")

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Firebase operations failed: {str(e)}")

    return {
        "message": "Password reset triggered successfully",
        "reset_link": reset_link
    }
