import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database.cloud_sql import Base
from models.orm_models import Project, Client, Quote, FeeStatus

# Create in-memory SQLite database for testing
DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture
def db_session():
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    SessionTesting = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionTesting()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

def test_create_project_and_client(db_session):
    # Create client
    client = Client(name="Sarah Venter", company="Venter Architects", email="sarah@venterarch.co.za")
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)
    
    assert client.id is not None
    assert client.name == "Sarah Venter"

    # Create project linked to client
    project = Project(
        name="Clifton Villa",
        client_id=client.id,
        offering="Signature",
        sqm="3,700",
        design_fee_status=FeeStatus.unpaid
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    assert project.id is not None
    assert project.client_id == client.id
    assert project.name == "Clifton Villa"
    assert project.design_fee_status == FeeStatus.unpaid

def test_create_quote(db_session):
    project = Project(name="Singita Lodge")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    quote = Quote(project_id=project.id, phase_name="Concept Design", fulfillment_percentage=50.0, status="approved")
    db_session.add(quote)
    db_session.commit()
    db_session.refresh(quote)

    assert quote.id is not None
    assert quote.project_id == project.id
    assert quote.phase_name == "Concept Design"
    assert quote.fulfillment_percentage == 50.0
