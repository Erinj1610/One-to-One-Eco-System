import sys
import os
from datetime import datetime, timedelta
import random

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.cloud_sql import engine, Base, SessionLocal
from models.orm_models import User, Employee, LeaveType, LeaveBalance, LeaveRequest, PulseSurvey, WellbeingCheckIn, TimeLog, StaffSelfAssessment

def run():
    print("Dropping existing HR & Pulse tables to update schemas...")
    db = SessionLocal()
    try:
        # Drop dependent tables first
        LeaveRequest.__table__.drop(bind=engine, checkfirst=True)
        LeaveBalance.__table__.drop(bind=engine, checkfirst=True)
        LeaveType.__table__.drop(bind=engine, checkfirst=True)
        PulseSurvey.__table__.drop(bind=engine, checkfirst=True)
        WellbeingCheckIn.__table__.drop(bind=engine, checkfirst=True)
        TimeLog.__table__.drop(bind=engine, checkfirst=True)
        StaffSelfAssessment.__table__.drop(bind=engine, checkfirst=True)
        
        # Modify employee table - drop it and let it recreate
        Employee.__table__.drop(bind=engine, checkfirst=True)
        User.__table__.drop(bind=engine, checkfirst=True)
        
        print("Recreating tables with new columns...")
        Base.metadata.create_all(bind=engine)
        
        # Seed Users
        print("Seeding users...")
        emails = [
            "admin@onetoone.co.za",
            "martin@1-to-1.world",
            "dani@1-to-1.world",
            "refilwe@1-to-1.world",
            "sipho@1-to-1.world",
            "liana@1-to-1.world",
            "james@1-to-1.world"
        ]
        user_map = {}
        for email in emails:
            u = User(email=email, hashed_password="hashed_password") # Dummy hash
            db.add(u)
            db.commit()
            db.refresh(u)
            user_map[email] = u.id
            
        # Seed Leave Types
        print("Seeding leave types...")
        leave_types_data = [
            {"name": "Annual", "entitlement_days": 20},
            {"name": "Sick", "entitlement_days": 10},
            {"name": "Family responsibility", "entitlement_days": 3},
            {"name": "Study", "entitlement_days": 5},
            {"name": "Unpaid", "entitlement_days": 0}
        ]
        type_map = {}
        for lt_data in leave_types_data:
            lt = LeaveType(name=lt_data["name"], entitlement_days=lt_data["entitlement_days"])
            db.add(lt)
            db.commit()
            db.refresh(lt)
            type_map[lt.name] = lt.id
            
        # Seed Employees
        print("Seeding employees...")
        # Martin Döller
        martin = Employee(
            name="Martin Döller",
            role="Founder / Design Director",
            department="Modus",
            start_date="2010-01-01",
            user_id=user_map["martin@1-to-1.world"],
            manager_id=None
        )
        db.add(martin)
        db.commit()
        db.refresh(martin)
        
        # Liana van Wyk
        liana = Employee(
            name="Liana van Wyk",
            role="Studio Manager",
            department="Admin",
            start_date="2019-02-01",
            user_id=user_map["liana@1-to-1.world"],
            manager_id=martin.id
        )
        db.add(liana)
        db.commit()
        db.refresh(liana)
        
        # Others
        staff_data = [
            {"name": "Dani Ferreira", "role": "Senior Lighting Designer", "dept": "Modus", "start": "2018-03-03", "email": "dani@1-to-1.world", "mgr": martin.id, "balance_annual": 14},
            {"name": "Refilwe Sithole", "role": "Project Coordinator", "dept": "Modus", "start": "2021-06-15", "email": "refilwe@1-to-1.world", "mgr": martin.id, "balance_annual": 12},
            {"name": "Sipho Khumalo", "role": "Technical Designer", "dept": "Molecule", "start": "2022-08-02", "email": "sipho@1-to-1.world", "mgr": liana.id, "balance_annual": 10},
            {"name": "James Okafor", "role": "Showroom Consultant", "dept": "Mood", "start": "2023-11-07", "email": "james@1-to-1.world", "mgr": liana.id, "balance_annual": 10}
        ]
        
        all_employees = [martin, liana]
        
        for sd in staff_data:
            emp = Employee(
                name=sd["name"],
                role=sd["role"],
                department=sd["dept"],
                start_date=sd["start"],
                user_id=user_map[sd["email"]],
                manager_id=sd["mgr"]
            )
            db.add(emp)
            db.commit()
            db.refresh(emp)
            all_employees.append(emp)
            
            # Setup specific annual leave balances matching mock leave data
            bal_annual = LeaveBalance(
                employee_id=emp.id,
                leave_type_id=type_map["Annual"],
                year=2026,
                taken=20 - sd["balance_annual"],
                remaining=sd["balance_annual"]
            )
            db.add(bal_annual)
            
            # Setup default sick leave balance
            bal_sick = LeaveBalance(
                employee_id=emp.id,
                leave_type_id=type_map["Sick"],
                year=2026,
                taken=0.0,
                remaining=10.0
            )
            db.add(bal_sick)
            db.commit()
            
        # Set balances for Martin and Liana
        for emp in [martin, liana]:
            bal_annual = LeaveBalance(
                employee_id=emp.id,
                leave_type_id=type_map["Annual"],
                year=2026,
                taken=2.0,
                remaining=18.0
            )
            db.add(bal_annual)
            
            bal_sick = LeaveBalance(
                employee_id=emp.id,
                leave_type_id=type_map["Sick"],
                year=2026,
                taken=0.0,
                remaining=10.0
            )
            db.add(bal_sick)
            db.commit()
            
        # Seed some Leave Requests
        print("Seeding leave requests...")
        req1 = LeaveRequest(
            employee_id=all_employees[2].id, # Dani Ferreira
            user_id=user_map["dani@1-to-1.world"],
            leave_type_id=type_map["Annual"],
            start_date="2026-06-22",
            end_date="2026-06-26",
            reason="Winter holiday",
            status="Pending",
            manager_id=martin.id
        )
        req2 = LeaveRequest(
            employee_id=all_employees[4].id, # Sipho Khumalo
            user_id=user_map["sipho@1-to-1.world"],
            leave_type_id=type_map["Sick"],
            start_date="2026-05-13",
            end_date="2026-05-13",
            reason="Flu",
            status="Approved",
            manager_id=liana.id
        )
        req3 = LeaveRequest(
            employee_id=all_employees[3].id, # Refilwe Sithole
            user_id=user_map["refilwe@1-to-1.world"],
            leave_type_id=type_map["Annual"],
            start_date="2026-06-16",
            end_date="2026-06-20",
            reason="Family gathering",
            status="Pending",
            manager_id=martin.id
        )
        db.add_all([req1, req2, req3])
        db.commit()
        
        # Seed rolling 30-day pulse survey data (morale index)
        print("Seeding pulse surveys...")
        now = datetime.now()
        for i in range(30):
            survey_date = (now - timedelta(days=i)).strftime("%Y-%m-%d")
            # Create 2-4 entries per day with a stress rating centering around 2.5-3.5
            for _ in range(random.randint(2, 4)):
                score = random.choices([1, 2, 3, 4, 5], weights=[10, 25, 35, 20, 10])[0]
                survey = PulseSurvey(
                    date=survey_date,
                    stress_score=score,
                    comment_text="Satisfied with workload" if score <= 3 else "High pressure before project deadlines"
                )
                db.add(survey)
        db.commit()

        # Seed Wellbeing Check-ins
        print("Seeding wellbeing check-ins...")
        ci1 = WellbeingCheckIn(
            employee_id=all_employees[2].id, # Dani Ferreira
            manager_id=martin.id,
            date=(now - timedelta(days=5)).strftime("%Y-%m-%d"),
            sentiment="Stressed",
            workload_rating=4,
            notes="Discussed Villa Z deadline. Feels a bit overloaded but manageable."
        )
        ci2 = WellbeingCheckIn(
            employee_id=all_employees[3].id, # Refilwe Sithole
            manager_id=martin.id,
            date=(now - timedelta(days=3)).strftime("%Y-%m-%d"),
            sentiment="Healthy",
            workload_rating=3,
            notes="Refilwe is doing great, coordinate workflows effectively."
        )
        ci3 = WellbeingCheckIn(
            employee_id=all_employees[4].id, # Sipho Khumalo
            manager_id=liana.id,
            date=(now - timedelta(days=6)).strftime("%Y-%m-%d"),
            sentiment="Burnout Risk",
            workload_rating=5,
            notes="Sipho has been working overtime to finish drawings. Advised to take next Monday off."
        )
        db.add_all([ci1, ci2, ci3])
        db.commit()

        # Seed StaffSelfAssessments (direct employee wellbeing reports)
        print("Seeding staff self-assessments...")
        # We seed a few recent check-ins for each staff member
        assessments = [
            {"emp": all_employees[0], "happy": 5, "work": 2, "busy": "Normal", "note": "All good, template configs are flowing well."},
            {"emp": all_employees[1], "happy": 4, "work": 3, "busy": "Normal", "note": "Busy but managing showroom client tasks."},
            {"emp": all_employees[2], "happy": 4, "work": 4, "busy": "Busy", "note": "Slight pressure with villa project files."},
            {"emp": all_employees[3], "happy": 5, "work": 3, "busy": "Normal", "note": "Great week, quotes approved."},
            {"emp": all_employees[4], "happy": 2, "work": 5, "busy": "Overloaded", "note": "Tons of drawings to modify. Feeling very tired."},
            {"emp": all_employees[5], "happy": 3, "work": 4, "busy": "Busy", "note": "A lot of showroom traffic today."}
        ]
        
        for item in assessments:
            # Seed 2 entries: one 7 days ago and one today
            a1 = StaffSelfAssessment(
                employee_id=item["emp"].id,
                date=(now - timedelta(days=7)).strftime("%Y-%m-%d"),
                happiness=max(1, item["happy"] - 1),
                workload_feeling=item["work"],
                busyness=item["busy"],
                notes="Last week's review notes."
            )
            a2 = StaffSelfAssessment(
                employee_id=item["emp"].id,
                date=now.strftime("%Y-%m-%d"),
                happiness=item["happy"],
                workload_feeling=item["work"],
                busyness=item["busy"],
                notes=item["note"]
            )
            db.add_all([a1, a2])
        db.commit()

        # Seed TimeLogs for this week to compute workload
        print("Seeding workload time logs...")
        today = datetime.now()
        monday = today - timedelta(days=today.weekday())
        project_ids = [1, 2, 3, 4]
        for emp in all_employees:
            for day_offset in range(3):
                log_date = (monday + timedelta(days=day_offset)).strftime("%Y-%m-%d")
                hours = round(random.uniform(6.5, 9.5), 1)
                log = TimeLog(
                    employee_id=emp.id,
                    project_id=random.choice(project_ids),
                    task_description="CAD drafting and client coordination",
                    date=log_date,
                    hours=hours
                )
                db.add(log)
            if emp.name == "Sipho Khumalo":
                log_overload = TimeLog(
                    employee_id=emp.id,
                    project_id=2,
                    task_description="Critical structural revisions",
                    date=monday.strftime("%Y-%m-%d"),
                    hours=15.0
                )
                db.add(log_overload)
                
        db.commit()
        print("Seed run completed successfully!")
    except Exception as e:
        print(f"Error during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run()
