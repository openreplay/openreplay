import logging
from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel, Field
from decouple import config
from enum import Enum as PythonEnum
from sqlalchemy import Enum
from sqlalchemy import CheckConstraint
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker, Session
from auth import api_key_auth

pg_dbname = config("pg_dbname")
pg_host = config("pg_host")
pg_password = config("pg_password")
pg_port = config("pg_port")
pg_user = config("pg_user")

DATABASE_URL = f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_dbname}"

POOL_SIZE = config("POOL_SIZE", default=20, cast=int)
MAX_OVERFLOW = config("MAX_OVERFLOW", default=10, cast=int)
POOL_TIMEOUT = config("POOL_TIMEOUT", default=30, cast=int)
POOL_RECYCLE = config("POOL_RECYCLE", default=3600, cast=int)

app = FastAPI(root_path=config("root_path", default="/assist-stats"))

engine = create_engine(
    DATABASE_URL,
    pool_size=POOL_SIZE,
    max_overflow=MAX_OVERFLOW,
    echo=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    expire_on_commit=False
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class EventStateEnum(PythonEnum):
    start = "start"
    end = "end"


class EventTypeEnum(PythonEnum):
    assist = "assist"
    call = "call"
    control = "control"
    record = "record"


class Event(Base):
    __tablename__ = "assist_events"
    event_id = Column(String, primary_key=True)
    project_id = Column(Integer, nullable=False)
    session_id = Column(String, index=True)
    agent_id = Column(Integer, nullable=True)
    event_type = Column(Enum(EventTypeEnum), nullable=False)
    timestamp = Column(Integer, nullable=True)
    duration = Column(Integer, nullable=True)

    __table_args__ = (
        CheckConstraint(
            event_type.in_(['assist', 'call', 'control', 'record']),
            name='event_type_check'
        ),
    )


class EventCreate(BaseModel):
    event_id: str = Field(..., description="The ID of the event")
    project_id: int = Field(..., description="The ID of the project")
    session_id: str = Field(..., description="The session ID of the event")
    event_type: EventTypeEnum = Field(..., description="The type of event")
    event_state: EventStateEnum = Field(..., description="The state of the event")
    agent_id: int = Field(..., description="The ID of the agent")
    timestamp: int = Field(..., description="The timestamp of the event")


def update_duration(event_id, timestamp, db):
    try:
        existing_event = db.query(Event).filter(Event.event_id == event_id).first()

        if existing_event:
            duration = timestamp - existing_event.timestamp
            if duration < 0:
                raise HTTPException(status_code=400, detail="Invalid timestamp")

            existing_event.duration = duration
            db.commit()
        else:
            raise HTTPException(status_code=400, detail="Existing event not found")
    except Exception as e:
        logging.error(f"Error updating duration -: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


def insert_event(event: EventCreate, db: Session):
    db_event = Event(
        event_id=event.event_id,
        session_id=event.session_id,
        project_id=event.project_id,
        event_type=event.event_type,
        agent_id=event.agent_id,
        timestamp=event.timestamp,
    )

    try:
        db.add(db_event)
        db.commit()
        db.refresh(db_event)
    except SQLAlchemyError as e:
        logging.error(f"Error creating event -: {e}")

        if "unique constraint" in str(e):
            raise HTTPException(status_code=409, detail=str("Event already exists"))

        raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        logging.error(f"Error creating event: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@app.post("/events", dependencies=[Depends(api_key_auth)])
def create_event(event: EventCreate, db: Session = Depends(get_db)):
    if event.event_state == EventStateEnum.end:
        update_duration(event.event_id, event.timestamp, db)
    else:
        insert_event(event, db)


@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok"}
