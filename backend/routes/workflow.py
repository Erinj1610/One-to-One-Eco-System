from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc
from database.cloud_sql import get_db
from models.orm_models import WorkflowStage, WorkflowTicket, Project, User, Employee, ProjectTicket
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime, timezone

router = APIRouter()

# --- DEFAULT STAGES SPECIFICATION ---
DEFAULT_STAGES = [
    {"name": "Design & Specification", "slug": "design-spec", "order_index": 1, "default_role": "Design", "color": "#8b5cf6", "icon": "Compass"},
    {"name": "Sales & Estimating", "slug": "sales-estimating", "order_index": 2, "default_role": "Sales", "color": "#3b82f6", "icon": "TrendingUp"},
    {"name": "Procurement / Purchasing", "slug": "procurement", "order_index": 3, "default_role": "Purchasing", "color": "#f59e0b", "icon": "ShoppingCart"},
    {"name": "Warehouse & Receiving", "slug": "warehouse-receiving", "order_index": 4, "default_role": "Stores", "color": "#10b981", "icon": "Package"},
    {"name": "Invoicing / Debtors", "slug": "invoicing-debtors", "order_index": 5, "default_role": "Accounts", "color": "#06b6d4", "icon": "FileText"},
    {"name": "Logistics & Delivery", "slug": "logistics-delivery", "order_index": 6, "default_role": "Logistics", "color": "#ec4899", "icon": "Truck"},
]

def ensure_default_stages(db: Session):
    try:
        count = db.query(WorkflowStage).count()
        if count == 0:
            for s in DEFAULT_STAGES:
                db.add(WorkflowStage(**s))
            db.commit()
    except Exception as e:
        print(f"ensure_default_stages error: {e}")

class WorkflowStageCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    order_index: Optional[int] = 0
    default_role: Optional[str] = None
    color: Optional[str] = "#3b82f6"
    icon: Optional[str] = "CheckCircle"

class WorkflowStageUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    order_index: Optional[int] = None
    default_role: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None

class WorkflowRouteRequest(BaseModel):
    project_key: str
    stage_id: Optional[int] = None
    stage_name: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_role: Optional[str] = None
    action_note: Optional[str] = None
    target_module: Optional[str] = "sales-tracker"
    target_tab: Optional[str] = None
    priority: Optional[str] = "Normal"
    routed_by: Optional[str] = "Staff"
    # Unified Blocker & Snag Extensions
    is_blocker: Optional[bool] = False
    blocker_title: Optional[str] = None
    blocker_type: Optional[str] = "Site Snag / Defect" # "Site Snag / Defect", "Design Revision", "RFI / Site Query", "Procurement Delay", "Electrical / Install Hold-up"
    fitting_code: Optional[str] = None
    location_area: Optional[str] = None
    cost_impact: Optional[float] = 0.0
    schedule_impact_days: Optional[int] = 0
    attachments: Optional[List[str]] = None

class WorkflowResolveRequest(BaseModel):
    project_key: str
    resolved_by: Optional[str] = "Staff"
    resolution_notes: Optional[str] = "Issue resolved and signed off."

@router.get("/stages")
def get_stages(db: Session = Depends(get_db)):
    ensure_default_stages(db)
    stages = db.query(WorkflowStage).filter(WorkflowStage.is_active == True).order_by(WorkflowStage.order_index.asc()).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "slug": s.slug,
            "order_index": s.order_index,
            "default_role": s.default_role,
            "color": s.color,
            "icon": s.icon,
            "is_active": s.is_active
        }
        for s in stages
    ]

@router.post("/stages")
def create_stage(payload: WorkflowStageCreate, db: Session = Depends(get_db)):
    slug = (payload.slug or payload.name.lower().replace(" ", "-").replace("/", "-")).strip()
    existing = db.query(WorkflowStage).filter(WorkflowStage.slug == slug).first()
    if existing:
        slug = f"{slug}-{int(datetime.now(timezone.utc).timestamp())}"
    stage = WorkflowStage(
        name=payload.name,
        slug=slug,
        order_index=payload.order_index or 0,
        default_role=payload.default_role,
        color=payload.color or "#3b82f6",
        icon=payload.icon or "CheckCircle"
    )
    db.add(stage)
    db.commit()
    db.refresh(stage)
    return {"status": "ok", "stage": {"id": stage.id, "name": stage.name, "slug": stage.slug}}

@router.put("/stages/{stage_id}")
def update_stage(stage_id: int, payload: WorkflowStageUpdate, db: Session = Depends(get_db)):
    stage = db.query(WorkflowStage).filter(WorkflowStage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    if payload.name is not None: stage.name = payload.name
    if payload.slug is not None: stage.slug = payload.slug
    if payload.order_index is not None: stage.order_index = payload.order_index
    if payload.default_role is not None: stage.default_role = payload.default_role
    if payload.color is not None: stage.color = payload.color
    if payload.icon is not None: stage.icon = payload.icon
    if payload.is_active is not None: stage.is_active = payload.is_active
    db.commit()
    return {"status": "ok"}

@router.delete("/stages/{stage_id}")
def delete_stage(stage_id: int, db: Session = Depends(get_db)):
    stage = db.query(WorkflowStage).filter(WorkflowStage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    stage.is_active = False
    db.commit()
    return {"status": "ok"}

@router.get("/project/{project_key}")
def get_project_workflow(project_key: str, db: Session = Depends(get_db)):
    ensure_default_stages(db)
    active_ticket = db.query(WorkflowTicket).filter(
        WorkflowTicket.project_key == project_key,
        WorkflowTicket.status.in_(["pending", "in_progress"])
    ).order_by(WorkflowTicket.created_at.desc()).first()

    history = db.query(WorkflowTicket).filter(
        WorkflowTicket.project_key == project_key
    ).order_by(WorkflowTicket.created_at.desc()).limit(20).all()

    stages = db.query(WorkflowStage).filter(WorkflowStage.is_active == True).order_by(WorkflowStage.order_index.asc()).all()

    return {
        "project_key": project_key,
        "active_ticket": {
            "id": active_ticket.id,
            "stage_id": active_ticket.stage_id,
            "stage_name": active_ticket.stage_name,
            "assigned_to": active_ticket.assigned_to,
            "assigned_role": active_ticket.assigned_role,
            "routed_by": active_ticket.routed_by,
            "action_note": active_ticket.action_note,
            "target_module": active_ticket.target_module,
            "target_tab": active_ticket.target_tab,
            "priority": active_ticket.priority,
            "status": active_ticket.status,
            "created_at": active_ticket.created_at.isoformat() if active_ticket.created_at else None
        } if active_ticket else None,
        "history": [
            {
                "id": t.id,
                "stage_name": t.stage_name,
                "assigned_to": t.assigned_to,
                "assigned_role": t.assigned_role,
                "routed_by": t.routed_by,
                "action_note": t.action_note,
                "status": t.status,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "completed_at": t.completed_at.isoformat() if t.completed_at else None
            }
            for t in history
        ],
        "stages": [
            {"id": s.id, "name": s.name, "slug": s.slug, "color": s.color, "icon": s.icon, "default_role": s.default_role}
            for s in stages
        ]
    }

@router.post("/route")
def route_project(payload: WorkflowRouteRequest, db: Session = Depends(get_db)):
    ensure_default_stages(db)
    proj = db.query(Project).filter(
        (Project.project_key == payload.project_key) | 
        (Project.name == payload.project_key) |
        (Project.id == int(payload.project_key) if payload.project_key.isdigit() else False)
    ).first()

    now = datetime.now(timezone.utc)
    active_tickets = db.query(WorkflowTicket).filter(
        WorkflowTicket.project_key == payload.project_key,
        WorkflowTicket.status.in_(["pending", "in_progress"])
    ).all()
    for at in active_tickets:
        at.status = "completed"
        at.completed_at = now
        at.completed_by = payload.routed_by

    stage_name = payload.stage_name
    stage_id = payload.stage_id
    if stage_id and not stage_name:
        s_obj = db.query(WorkflowStage).filter(WorkflowStage.id == stage_id).first()
        if s_obj:
            stage_name = s_obj.name
    elif not stage_id and stage_name:
        s_obj = db.query(WorkflowStage).filter(WorkflowStage.name == stage_name).first()
        if s_obj:
            stage_id = s_obj.id

    if not stage_name:
        stage_name = "Design & Specification"

    # Determine if this is raising an urgent blocker
    is_blocker = bool(payload.is_blocker)
    priority_val = "Urgent" if is_blocker else (payload.priority or "Normal")
    note_val = payload.action_note
    if is_blocker and payload.blocker_title:
        note_val = f"[⚠️ BLOCKED: {payload.blocker_title}] {payload.action_note or ''}".strip()

    new_ticket = WorkflowTicket(
        project_id=proj.id if proj else None,
        project_key=payload.project_key,
        stage_id=stage_id,
        stage_name=stage_name,
        assigned_to=payload.assigned_to,
        assigned_role=payload.assigned_role,
        routed_by=payload.routed_by,
        action_note=note_val,
        target_module=payload.target_module or "sales-tracker",
        target_tab=payload.target_tab,
        priority=priority_val,
        status="pending",
        created_at=now
    )
    db.add(new_ticket)

    # If it's a blocker, also create/sync an active ProjectTicket for full defect tracking & set project delay_reason
    created_pt_id = None
    if is_blocker and payload.blocker_title:
        pt = ProjectTicket(
            project_id=proj.id if proj else None,
            project_name=proj.name if proj else payload.project_key,
            client_name=getattr(proj, "client_name", None) or getattr(proj, "client", None) or "",
            pm_name=getattr(proj, "pm_name", None) or getattr(proj, "pm", None) or "",
            stage=stage_name,
            title=payload.blocker_title,
            description=payload.action_note or "",
            ticket_type=payload.blocker_type or "Site Snag / Defect",
            priority="Critical",
            status="Open",
            location_area=payload.location_area or "",
            fitting_code=payload.fitting_code or "",
            cost_impact=float(payload.cost_impact or 0.0),
            schedule_impact_days=int(payload.schedule_impact_days or 0),
            raised_by=payload.routed_by or "Staff",
            assigned_to=payload.assigned_to or "",
            attachments_json=payload.attachments or []
        )
        db.add(pt)
        if proj:
            proj.status = "Off track"
            proj.delay_reason = f"Blocker: {payload.blocker_title}"
        db.flush()
        created_pt_id = pt.id

    db.commit()
    db.refresh(new_ticket)

    return {
        "status": "ok",
        "ticket_id": new_ticket.id,
        "stage_name": new_ticket.stage_name,
        "assigned_to": new_ticket.assigned_to,
        "is_blocker": is_blocker,
        "project_ticket_id": created_pt_id
    }

@router.post("/resolve")
def resolve_blocker(payload: WorkflowResolveRequest, db: Session = Depends(get_db)):
    """
    Resolves any active blocker on a project, closes open ProjectTickets,
    clears project delay_reason, and restores normal workflow status.
    """
    now = datetime.now(timezone.utc)
    proj = db.query(Project).filter(
        (Project.project_key == payload.project_key) | 
        (Project.name == payload.project_key) |
        (Project.id == int(payload.project_key) if payload.project_key.isdigit() else False)
    ).first()

    # Close open project tickets for this project
    pts = db.query(ProjectTicket).filter(
        (ProjectTicket.project_name == payload.project_key) |
        (ProjectTicket.project_id == (proj.id if proj else -1)),
        ProjectTicket.status.in_(["Open", "In progress", "Awaiting Sign-off"])
    ).all()
    for pt in pts:
        pt.status = "Resolved"
        pt.resolved_date = now.strftime("%Y-%m-%d")
        pt.resolution_notes = payload.resolution_notes

    # Clear delay reason if blocked
    if proj:
        proj.status = "On track"
        if proj.delay_reason and "Blocker:" in proj.delay_reason:
            proj.delay_reason = None

    # Update active workflow ticket priority from Urgent to Normal if it had blocker prefix
    active_ticket = db.query(WorkflowTicket).filter(
        WorkflowTicket.project_key == payload.project_key,
        WorkflowTicket.status.in_(["pending", "in_progress"])
    ).order_by(WorkflowTicket.created_at.desc()).first()

    if active_ticket:
        active_ticket.priority = "Normal"
        if active_ticket.action_note and "[⚠️ BLOCKED:" in active_ticket.action_note:
            active_ticket.action_note = f"[Resolved by {payload.resolved_by}] {active_ticket.action_note.split(']')[-1].strip()}"

    db.commit()
    return {"status": "ok", "message": "Blocker resolved and flow restored"}

@router.get("/my-queue")
def get_my_queue(
    user_name: Optional[str] = Query(None),
    user_email: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    ensure_default_stages(db)
    
    query = db.query(WorkflowTicket).filter(
        WorkflowTicket.status.in_(["pending", "in_progress"])
    )

    filters = []
    if user_name:
        u_clean = user_name.strip().lower()
        filters.append(func.lower(WorkflowTicket.assigned_to) == u_clean)
        filters.append(func.lower(WorkflowTicket.assigned_to).like(f"%{u_clean}%"))
    if user_email:
        e_clean = user_email.strip().lower()
        filters.append(func.lower(WorkflowTicket.assigned_to) == e_clean)
        # Also check username portion of email e.g. "erin.jones" -> "erin"
        prefix = e_clean.split('@')[0].replace('.', ' ')
        filters.append(func.lower(WorkflowTicket.assigned_to).like(f"%{prefix}%"))
    if role:
        filters.append(func.lower(WorkflowTicket.assigned_role) == role.strip().lower())

    if filters:
        from sqlalchemy import or_
        query = query.filter(or_(*filters))

    tickets = query.order_by(WorkflowTicket.created_at.asc()).all()

    project_keys = list(set([t.project_key for t in tickets]))
    projs = db.query(Project).filter(
        (Project.project_key.in_(project_keys)) | (Project.name.in_(project_keys))
    ).all()
    proj_map = {p.project_key or p.name: p for p in projs}

    results = []
    now = datetime.now(timezone.utc)
    for t in tickets:
        p = proj_map.get(t.project_key)
        client_val = getattr(p, "client_name", None) or getattr(p, "client", None) or "—"
        
        age_seconds = (now - (t.created_at.replace(tzinfo=timezone.utc) if t.created_at.tzinfo is None else t.created_at)).total_seconds() if t.created_at else 0
        age_seconds = max(0, age_seconds)
        
        if age_seconds < 3600:
            age_str = f"{int(age_seconds // 60)}m ago"
        elif age_seconds < 86400:
            age_str = f"{int(age_seconds // 3600)}h ago"
        else:
            age_str = f"{int(age_seconds // 86400)}d ago"

        results.append({
            "id": t.id,
            "project_key": t.project_key,
            "project_name": p.name if p else t.project_key,
            "client_name": client_val,
            "stage_id": t.stage_id,
            "stage_name": t.stage_name,
            "assigned_to": t.assigned_to,
            "assigned_role": t.assigned_role,
            "routed_by": t.routed_by,
            "action_note": t.action_note,
            "target_module": t.target_module or "sales-tracker",
            "target_tab": t.target_tab,
            "priority": t.priority,
            "status": t.status,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "age_str": age_str,
            "age_seconds": int(age_seconds)
        })

    return results

@router.get("/radar")
def get_workflow_radar(db: Session = Depends(get_db)):
    ensure_default_stages(db)
    stages = db.query(WorkflowStage).filter(WorkflowStage.is_active == True).order_by(WorkflowStage.order_index.asc()).all()

    active_tickets = db.query(WorkflowTicket).filter(
        WorkflowTicket.status.in_(["pending", "in_progress"])
    ).all()

    now = datetime.now(timezone.utc)
    stage_stats = {}
    for s in stages:
        stage_stats[s.name] = {
            "stage_id": s.id,
            "stage_name": s.name,
            "color": s.color,
            "icon": s.icon,
            "count": 0,
            "total_age_seconds": 0,
            "tickets": []
        }

    for t in active_tickets:
        s_name = t.stage_name
        if s_name not in stage_stats:
            stage_stats[s_name] = {
                "stage_id": t.stage_id,
                "stage_name": s_name,
                "color": "#3b82f6",
                "icon": "CheckCircle",
                "count": 0,
                "total_age_seconds": 0,
                "tickets": []
            }
        
        age_seconds = (now - (t.created_at.replace(tzinfo=timezone.utc) if t.created_at.tzinfo is None else t.created_at)).total_seconds() if t.created_at else 0
        age_seconds = max(0, age_seconds)

        stage_stats[s_name]["count"] += 1
        stage_stats[s_name]["total_age_seconds"] += age_seconds
        stage_stats[s_name]["tickets"].append({
            "id": t.id,
            "project_key": t.project_key,
            "assigned_to": t.assigned_to,
            "priority": t.priority,
            "age_seconds": int(age_seconds)
        })

    radar_summary = []
    for s_name, st in stage_stats.items():
        avg_hours = round((st["total_age_seconds"] / (st["count"] * 3600)), 1) if st["count"] > 0 else 0.0
        radar_summary.append({
            "stage_name": s_name,
            "stage_id": st["stage_id"],
            "color": st["color"],
            "icon": st["icon"],
            "active_count": st["count"],
            "avg_wait_hours": avg_hours,
            "is_bottleneck": st["count"] >= 3 or avg_hours > 48
        })

    return {
        "total_active_tasks": len(active_tickets),
        "stages": radar_summary
    }
