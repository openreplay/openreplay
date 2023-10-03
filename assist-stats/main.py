import logging
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends, Response
from sqlalchemy import Column, Integer, String, DateTime, update, create_engine, PrimaryKeyConstraint, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel, Field
from datetime import datetime
from decouple import config
from enum import Enum as PythonEnum
from sqlalchemy import Enum
from sqlalchemy import CheckConstraint
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker, Session

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

app = FastAPI()

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


@app.on_event("startup")
def startup_db_client():
    Base.metadata.create_all(bind=engine)


@app.on_event("shutdown")
def shutdown_db_client():
    engine.dispose()


class EventStateEnum(PythonEnum):
    start = "start"
    end = "end"


class EventTypeEnum(PythonEnum):
    # live = "live"
    assist = "assist"
    call = "call"
    remote = "remote"
    record = "record"


class Event(Base):
    __tablename__ = "assist_events"
    project_id = Column(Integer, nullable=False)
    session_id = Column(String, index=True)
    event_type = Column(Enum(EventTypeEnum), nullable=False)
    event_state = Column(Enum(EventStateEnum), nullable=False)
    timestamp = Column(Integer, nullable=True)
    user_id = Column(String, nullable=True)
    agent_id = Column(String, nullable=True)

    __table_args__ = (
        PrimaryKeyConstraint('session_id', 'project_id', 'event_type', 'timestamp', name='pk_session_user_event'),
        CheckConstraint(
            event_type.in_(['live', 'assist', 'call', 'remote', 'record']),
            name='event_type_check'
        ),

        CheckConstraint(
            event_state.in_(['start', 'end']),
            name='event_state_check'
        ),
    )


class EventCreate(BaseModel):
    project_id: str = Field(..., description="The ID of the project")
    session_id: str = Field(..., description="The session ID of the event")
    event_type: EventTypeEnum = Field(..., description="The type of event")
    event_state: EventStateEnum = Field(..., description="The state of the event")
    user_id: Optional[str] = Field(None, description="The ID of the user")
    agent_id: str = Field(..., description="The ID of the agent")
    timestamp: int = Field(..., description="The timestamp of the event")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/events", response_model=EventCreate)
async def create_event_start(event: EventCreate, db: Session = Depends(get_db)):
    db_event = Event(
        session_id=event.session_id,
        user_uuid=event.user_uuid,
        event_type=event.event_type,
        event_state=event.event_state,
        user_id=event.user_id,
        agent_id=event.agent_id,
        timestamp=event.timestamp,
    )

    try:
        db.add(db_event)
        db.commit()
        db.refresh(db_event)
        return Response(status_code=200)
    except SQLAlchemyError as e:
        logging.error(f"Error creating event -: {e}")

        if "unique constraint" in str(e):
            raise HTTPException(status_code=409, detail=str("Event already exists"))

        raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        logging.error(f"Error creating event: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def calculate_total_event_duration(event_type: EventTypeEnum, db: Session = Depends(get_db)):
    events = db.query(Event).filter(Event.event_type == event_type).order_by(Event.timestamp).all()

    total_duration = 0
    start_time = None

    for event in events:
        if event.event_state == EventStateEnum.start:
            start_time = event.timestamp
        elif event.event_state == EventStateEnum.end and start_time is not None:
            total_duration += event.timestamp - start_time
            start_time = None

    return total_duration
