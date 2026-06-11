from sqlalchemy import Column, Integer, String, Float, ForeignKey, Enum, JSON, Boolean, Date, DateTime
from sqlalchemy.orm import relationship
import enum
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database.cloud_sql import Base

class TemplateConfig(Base):
    __tablename__ = "template_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    template_key = Column(String, unique=True, index=True) # e.g., "DESIGN_FEE_PROPOSAL"
    config_json = Column(JSON, nullable=False) # Stores all visual/text settings

class FeeStatus(str, enum.Enum):
    unpaid = "unpaid"
    paid = "paid"

class KanbanState(str, enum.Enum):
    locked = "locked"
    unlocked = "unlocked"

# --- SPECIFICATION TABLES ---

class ProjectTemplate(Base):
    __tablename__ = "project_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    template_type = Column(String, nullable=True) # e.g. "Design only", "Design + supply", "Supply only"

class TemplateField(Base):
    __tablename__ = "template_fields"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("project_templates.id"))
    name = Column(String, nullable=False)
    field_type = Column(String, nullable=False) # e.g. text, number, date, dropdown, toggle, currency
    options = Column(JSON, nullable=True) # Options list for dropdown

class TemplatePhase(Base):
    __tablename__ = "template_phases"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("project_templates.id"))
    name = Column(String, nullable=False)
    phase_order = Column(Integer, default=0)
    requires_approval = Column(Boolean, default=True)
    triggers_invoice = Column(Boolean, default=False)

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    design_fee_status = Column(Enum(FeeStatus), default=FeeStatus.unpaid)
    kanban_state = Column(Enum(KanbanState), default=KanbanState.locked)
    master_drive_folder = Column(String, nullable=True)
    
    # Specification extensions
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    pm_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    template_id = Column(Integer, ForeignKey("project_templates.id"), nullable=True)
    offering = Column(String, nullable=True)
    sqm = Column(String, nullable=True)
    start_date = Column(String, nullable=True)
    deadline = Column(String, nullable=True)
    status = Column(String, default="On track")
    delay_reason = Column(String, nullable=True)
    complete_status = Column(String, default="Ongoing")
    design_fee = Column(Float, default=0.0)
    outstanding_amount = Column(Float, default=0.0)

    # 1-to-Many Relationships
    quotes = relationship("Quote", back_populates="project")
    field_values = relationship("ProjectFieldValue", back_populates="project")
    phases = relationship("ProjectPhase", back_populates="project")

class ProjectFieldValue(Base):
    __tablename__ = "project_field_values"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    field_name = Column(String, nullable=False)
    field_value = Column(String, nullable=True)
    
    project = relationship("Project", back_populates="field_values")

class ProjectPhase(Base):
    __tablename__ = "project_phases"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    name = Column(String, nullable=False)
    status = Column(String, default="locked") # locked, ongoing, completed
    approved_date = Column(String, nullable=True)
    client_note = Column(String, nullable=True)
    
    project = relationship("Project", back_populates="phases")

class Client(Base):
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    company = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    status = Column(String, default="Active")
    nps = Column(Integer, nullable=True)
    lifetime_revenue = Column(Float, default=0.0)

class Contact(Base):
    __tablename__ = "contacts"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    role = Column(String, nullable=True)

class Lead(Base):
    __tablename__ = "leads"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    title = Column(String, nullable=False)
    value = Column(Float, default=0.0)
    pipeline_status = Column(String, default="Enquiry") # Enquiry, Brief, Proposal, Approved, Won, Lost
    loss_reason = Column(String, nullable=True)

class Proposal(Base):
    __tablename__ = "proposals"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    title = Column(String, nullable=False)
    value = Column(Float, default=0.0)
    status = Column(String, default="draft") # draft, sent, approved, lost
    notes = Column(String, nullable=True)

class BOQ(Base):
    __tablename__ = "boqs"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    status = Column(String, default="draft") # draft, approved
    created_at = Column(String, nullable=True)

class BOQItem(Base):
    __tablename__ = "boq_items"
    
    id = Column(Integer, primary_key=True, index=True)
    boq_id = Column(Integer, ForeignKey("boqs.id"))
    product_code = Column(String, nullable=True)
    quantity = Column(Integer, default=1)
    area = Column(String, nullable=True)
    spec_notes = Column(String, nullable=True)
    cost_price = Column(Float, default=0.0)
    retail_price = Column(Float, default=0.0)

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    boq_id = Column(Integer, ForeignKey("boqs.id"), nullable=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    status = Column(String, default="Draft") # Draft, Ordered, Awaiting delivery, Complete
    expected_delivery_date = Column(String, nullable=True)
    notes = Column(String, nullable=True)

class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    qty_ordered = Column(Integer, default=0)
    qty_received = Column(Integer, default=0)

class OrderDocument(Base):
    __tablename__ = "order_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    doc_type = Column(String, nullable=False) # Quote, PO, Delivery Note, Progress Statement, Invoice
    file_path = Column(String, nullable=True)

class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    invoice_type = Column(String, nullable=False) # Design Fee, Product Supply
    status = Column(String, default="Draft") # Draft, Sent, Partially paid, Paid, Overdue
    amount = Column(Float, default=0.0)

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    amount = Column(Float, default=0.0) # Negative for refunds
    payment_date = Column(String, nullable=True)

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    brand = Column(String, nullable=True)
    sku = Column(String, unique=True, index=True)
    cost_price = Column(Float, default=0.0)
    trade_price = Column(Float, default=0.0)
    retail_price = Column(Float, default=0.0)
    stock_level = Column(Integer, default=0)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)

class Supplier(Base):
    __tablename__ = "suppliers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    contact_details = Column(String, nullable=True)

class Employee(Base):
    __tablename__ = "employees"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=True)
    department = Column(String, nullable=True)
    start_date = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True)

class LeaveType(Base):
    __tablename__ = "leave_types"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False) # Annual, Sick, Family responsibility, Unpaid, Study, Other
    entitlement_days = Column(Integer, default=0)
    max_carry_over = Column(Integer, default=0)
    requires_documentation = Column(Boolean, default=False)

class LeaveBalance(Base):
    __tablename__ = "leave_balances"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    leave_type_id = Column(Integer, ForeignKey("leave_types.id"))
    year = Column(Integer, nullable=False)
    taken = Column(Float, default=0.0)
    remaining = Column(Float, default=0.0)

class LeaveRequest(Base):
    __tablename__ = "leave_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    leave_type_id = Column(Integer, ForeignKey("leave_types.id"))
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=False)
    reason = Column(String, nullable=True)
    status = Column(String, default="Pending") # Pending, Approved, Rejected
    manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True)

class PulseSurvey(Base):
    __tablename__ = "pulse_surveys"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, nullable=False)
    stress_score = Column(Integer, nullable=False)
    comment_text = Column(String, nullable=True)

class WellbeingCheckIn(Base):
    __tablename__ = "wellbeing_checkins"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    manager_id = Column(Integer, ForeignKey("employees.id"))
    date = Column(String, nullable=False)
    sentiment = Column(String, nullable=False) # e.g. "Healthy", "Stressed", "Burnout Risk"
    workload_rating = Column(Integer, nullable=False) # 1-5 scale
    notes = Column(String, nullable=True)

class StaffSelfAssessment(Base):
    __tablename__ = "staff_self_assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    date = Column(String, nullable=False)
    happiness = Column(Integer, nullable=False) # 1-5
    workload_feeling = Column(Integer, nullable=False) # 1-5
    busyness = Column(String, nullable=False) # e.g. "Underloaded", "Normal", "Overloaded"
    notes = Column(String, nullable=True)

class TimeLog(Base):
    __tablename__ = "time_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    project_id = Column(Integer, ForeignKey("projects.id"))
    task_description = Column(String, nullable=True)
    date = Column(String, nullable=False)
    hours = Column(Float, default=0.0)

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True) # Design files, Proposals, Invoices, Contracts, Other
    client_visible = Column(Boolean, default=False)
    file_url = Column(String, nullable=True)

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False) # e.g. Senior Designer, Estimator

class RolePermission(Base):
    __tablename__ = "role_permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"))
    section = Column(String, nullable=False) # e.g. CRM, Projects, Settings
    permission_level = Column(String, nullable=False) # Full access, Can edit, View only, No access

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)

class Quote(Base):
    __tablename__ = "quotes"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    phase_name = Column(String, nullable=False) # e.g., Phase 1 - Reception
    fulfillment_percentage = Column(Float, default=0.0)
    status = Column(String, default="draft")
    
    # Parent relationship
    project = relationship("Project", back_populates="quotes")

class ProjectFolder(Base):
    __tablename__ = "project_folders"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    gdrive_folder_id = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey("project_folders.id"), nullable=True)
    sort_order = Column(Integer, default=0)
    name = Column(String, nullable=False)

