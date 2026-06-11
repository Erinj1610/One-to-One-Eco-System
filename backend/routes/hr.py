from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.cloud_sql import get_db
from models.orm_models import Employee, LeaveType, LeaveBalance, LeaveRequest, PulseSurvey, WellbeingCheckIn, TimeLog, Project, StaffSelfAssessment
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta

router = APIRouter()

class StaffSelfAssessmentCreate(BaseModel):
    employee_id: int
    happiness: int
    workload_feeling: int
    busyness: str
    notes: Optional[str] = None

class WellbeingCheckInCreate(BaseModel):
    employee_id: int
    manager_id: int
    sentiment: str
    workload_rating: int
    notes: Optional[str] = None

class LeaveRequestCreate(BaseModel):
    employee_id: int
    leave_type_id: int
    start_date: str
    end_date: str
    reason: Optional[str] = None

class LeaveRequestStatusUpdate(BaseModel):
    status: str

class PulseSurveyCreate(BaseModel):
    stress_score: int
    comment_text: Optional[str] = None

@router.get("/employees")
def list_employees(db: Session = Depends(get_db)):
    employees = db.query(Employee).all()
    result = []
    for emp in employees:
        balances = db.query(LeaveBalance).filter(LeaveBalance.employee_id == emp.id).all()
        leave_balances_data = []
        for bal in balances:
            l_type = db.query(LeaveType).filter(LeaveType.id == bal.leave_type_id).first()
            leave_balances_data.append({
                "type_id": bal.leave_type_id,
                "type_name": l_type.name if l_type else "Unknown",
                "taken": bal.taken,
                "remaining": bal.remaining
            })
        
        mgr_name = "None"
        if emp.manager_id:
            mgr = db.query(Employee).filter(Employee.id == emp.manager_id).first()
            if mgr:
                mgr_name = mgr.name

        # Fetch latest self assessment
        latest_assessment = db.query(StaffSelfAssessment).filter(StaffSelfAssessment.employee_id == emp.id).order_by(StaffSelfAssessment.date.desc()).first()
        wellbeing = {
            "happiness": latest_assessment.happiness if latest_assessment else 3,
            "workload": latest_assessment.workload_feeling if latest_assessment else 3,
            "busyness": latest_assessment.busyness if latest_assessment else "Normal",
            "last_checked": latest_assessment.date if latest_assessment else "Never"
        }

        result.append({
            "id": emp.id,
            "name": emp.name,
            "role": emp.role,
            "department": emp.department,
            "start_date": emp.start_date,
            "manager_id": emp.manager_id,
            "manager_name": mgr_name,
            "leave_balances": leave_balances_data,
            "wellbeing": wellbeing
        })
    return result

@router.get("/employee-by-email/{email}")
def get_employee_by_email(email: str, db: Session = Depends(get_db)):
    from models.orm_models import User
    usr = db.query(User).filter(User.email == email).first()
    if not usr:
        emp = db.query(Employee).filter(Employee.name.ilike(email.split('@')[0] + "%")).first()
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")
    else:
        emp = db.query(Employee).filter(Employee.user_id == usr.id).first()
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found for user")
        
    balances = db.query(LeaveBalance).filter(LeaveBalance.employee_id == emp.id).all()
    leave_balances_data = []
    for bal in balances:
        l_type = db.query(LeaveType).filter(LeaveType.id == bal.leave_type_id).first()
        leave_balances_data.append({
            "type_id": bal.leave_type_id,
            "type_name": l_type.name if l_type else "Unknown",
            "taken": bal.taken,
            "remaining": bal.remaining
        })
        
    mgr_name = "None"
    if emp.manager_id:
        mgr = db.query(Employee).filter(Employee.id == emp.manager_id).first()
        if mgr:
            mgr_name = mgr.name

    latest_assessment = db.query(StaffSelfAssessment).filter(StaffSelfAssessment.employee_id == emp.id).order_by(StaffSelfAssessment.date.desc()).first()
    wellbeing = {
        "happiness": latest_assessment.happiness if latest_assessment else 3,
        "workload": latest_assessment.workload_feeling if latest_assessment else 3,
        "busyness": latest_assessment.busyness if latest_assessment else "Normal",
        "last_checked": latest_assessment.date if latest_assessment else "Never"
    }

    return {
        "id": emp.id,
        "name": emp.name,
        "role": emp.role,
        "department": emp.department,
        "start_date": emp.start_date,
        "manager_id": emp.manager_id,
        "manager_name": mgr_name,
        "leave_balances": leave_balances_data,
        "wellbeing": wellbeing
    }

@router.get("/leave-types")
def list_leave_types(db: Session = Depends(get_db)):
    return db.query(LeaveType).all()

@router.get("/leave-requests")
def list_leave_requests(db: Session = Depends(get_db)):
    requests = db.query(LeaveRequest).all()
    result = []
    for r in requests:
        emp = db.query(Employee).filter(Employee.id == r.employee_id).first()
        l_type = db.query(LeaveType).filter(LeaveType.id == r.leave_type_id).first()
        result.append({
            "id": r.id,
            "employee_id": r.employee_id,
            "employee_name": emp.name if emp else "Unknown",
            "leave_type_id": r.leave_type_id,
            "leave_type_name": l_type.name if l_type else "Unknown",
            "start_date": r.start_date,
            "end_date": r.end_date,
            "reason": r.reason,
            "status": r.status,
            "manager_id": r.manager_id
        })
    return result

@router.post("/leave-requests")
def create_leave_request(req: LeaveRequestCreate, db: Session = Depends(get_db)):
    try:
        from_date = datetime.strptime(req.start_date, "%Y-%m-%d")
        to_date = datetime.strptime(req.end_date, "%Y-%m-%d")
        days = (to_date - from_date).days + 1
        if days <= 0:
            raise HTTPException(status_code=400, detail="End date must be on or after start date")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    emp = db.query(Employee).filter(Employee.id == req.employee_id).first()
    if not emp:
        raise HTTPException(status_code=400, detail="Employee not found")

    bal = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == req.employee_id,
        LeaveBalance.leave_type_id == req.leave_type_id
    ).first()

    if not bal:
        raise HTTPException(status_code=400, detail="Leave balance not initialized for this employee/type")

    if bal.remaining < days:
        raise HTTPException(status_code=400, detail=f"Insufficient leave balance. Remaining: {bal.remaining} days, requested: {days} days")

    new_req = LeaveRequest(
        employee_id=req.employee_id,
        user_id=emp.user_id,
        leave_type_id=req.leave_type_id,
        start_date=req.start_date,
        end_date=req.end_date,
        reason=req.reason,
        status="Pending",
        manager_id=emp.manager_id
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    return {"message": "Leave request submitted successfully", "id": new_req.id}

@router.put("/leave-requests/{request_id}/status")
def update_leave_status(request_id: int, status_update: LeaveRequestStatusUpdate, db: Session = Depends(get_db)):
    req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Leave request not found")

    if status_update.status not in ["Approved", "Rejected"]:
        raise HTTPException(status_code=400, detail="Status must be Approved or Rejected")

    if req.status == "Pending" and status_update.status == "Approved":
        from_date = datetime.strptime(req.start_date, "%Y-%m-%d")
        to_date = datetime.strptime(req.end_date, "%Y-%m-%d")
        days = (to_date - from_date).days + 1
        
        bal = db.query(LeaveBalance).filter(
            LeaveBalance.employee_id == req.employee_id,
            LeaveBalance.leave_type_id == req.leave_type_id
        ).first()
        if bal:
            bal.taken += days
            bal.remaining = max(0.0, bal.remaining - days)

    req.status = status_update.status
    db.commit()
    return {"message": f"Leave request status updated to {status_update.status}"}

@router.post("/pulse-surveys")
def submit_pulse_survey(survey: PulseSurveyCreate, db: Session = Depends(get_db)):
    if not (1 <= survey.stress_score <= 5):
        raise HTTPException(status_code=400, detail="Stress score must be between 1 and 5")
    
    new_entry = PulseSurvey(
        date=datetime.now().strftime("%Y-%m-%d"),
        stress_score=survey.stress_score,
        comment_text=survey.comment_text
    )
    db.add(new_entry)
    db.commit()
    return {"message": "Survey feedback submitted anonymously"}

@router.get("/pulse-surveys/stats")
def get_pulse_survey_stats(db: Session = Depends(get_db)):
    cutoff_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    surveys = db.query(PulseSurvey).filter(PulseSurvey.date >= cutoff_date).all()
    
    if not surveys:
        return {"avg_stress_score": 0.0, "entries_count": 0, "history": []}
    
    total_score = sum(s.stress_score for s in surveys)
    avg_score = round(total_score / len(surveys), 2)
    
    # Group by date for history graph
    history_dict = {}
    for s in surveys:
        history_dict[s.date] = history_dict.get(s.date, []) + [s.stress_score]
        
    history = [{"date": k, "avg_score": round(sum(v)/len(v), 2)} for k, v in sorted(history_dict.items())]
    
    return {
        "avg_stress_score": avg_score,
        "entries_count": len(surveys),
        "history": history,
        "comments": [s.comment_text for s in surveys if s.comment_text]
    }

@router.get("/wellbeing-checkins/{employee_id}")
def get_wellbeing_checkins(employee_id: int, db: Session = Depends(get_db)):
    checkins = db.query(WellbeingCheckIn).filter(WellbeingCheckIn.employee_id == employee_id).order_by(WellbeingCheckIn.date.desc()).all()
    return [{
        "id": c.id,
        "employee_id": c.employee_id,
        "manager_id": c.manager_id,
        "date": c.date,
        "sentiment": c.sentiment,
        "workload_rating": c.workload_rating,
        "notes": c.notes
    } for c in checkins]

@router.post("/wellbeing-checkins")
def create_wellbeing_checkin(checkin: WellbeingCheckInCreate, db: Session = Depends(get_db)):
    new_c = WellbeingCheckIn(
        employee_id=checkin.employee_id,
        manager_id=checkin.manager_id,
        date=datetime.now().strftime("%Y-%m-%d"),
        sentiment=checkin.sentiment,
        workload_rating=checkin.workload_rating,
        notes=checkin.notes
    )
    db.add(new_c)
    db.commit()
    db.refresh(new_c)
    return {"message": "Wellbeing check-in saved successfully", "id": new_c.id}

@router.get("/workload-summary")
def get_workload_summary(db: Session = Depends(get_db)):
    # Calculate start of this week (Monday)
    today = datetime.now()
    start_of_week = today - timedelta(days=today.weekday())
    start_of_week_str = start_of_week.strftime("%Y-%m-%d")

    employees = db.query(Employee).all()
    summary = []
    
    for emp in employees:
        # Get time logs for this employee this week
        logs = db.query(TimeLog).filter(
            TimeLog.employee_id == emp.id,
            TimeLog.date >= start_of_week_str
        ).all()
        
        total_hours = sum(log.hours for log in logs)
        
        # Get project names
        project_ids = list(set(log.project_id for log in logs))
        projects = []
        if project_ids:
            proj_objs = db.query(Project).filter(Project.id.in_(project_ids)).all()
            projects = [p.name for p in proj_objs]
            
        summary.append({
            "employee_id": emp.id,
            "employee_name": emp.name,
            "role": emp.role,
            "department": emp.department,
            "hours_logged": round(total_hours, 1),
            "capacity": 40.0,
            "projects": projects
        })
        
    return summary

@router.get("/self-assessments/{employee_id}")
def get_self_assessments(employee_id: int, db: Session = Depends(get_db)):
    assessments = db.query(StaffSelfAssessment).filter(StaffSelfAssessment.employee_id == employee_id).order_by(StaffSelfAssessment.date.desc()).all()
    return [{
        "id": a.id,
        "employee_id": a.employee_id,
        "date": a.date,
        "happiness": a.happiness,
        "workload_feeling": a.workload_feeling,
        "busyness": a.busyness,
        "notes": a.notes
    } for a in assessments]

@router.post("/self-assessments")
def create_self_assessment(assess: StaffSelfAssessmentCreate, db: Session = Depends(get_db)):
    new_a = StaffSelfAssessment(
        employee_id=assess.employee_id,
        date=datetime.now().strftime("%Y-%m-%d"),
        happiness=assess.happiness,
        workload_feeling=assess.workload_feeling,
        busyness=assess.busyness,
        notes=assess.notes
    )
    db.add(new_a)
    db.commit()
    db.refresh(new_a)
    return {"message": "Wellbeing check-in submitted successfully", "id": new_a.id}
