import os
from sqlalchemy import create_engine, Column, String, Float, Integer, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone

DATABASE_URL = os.environ.get("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class EloRating(Base):
    __tablename__ = "elo_ratings"
    team = Column(String, primary_key=True)
    rating = Column(Float, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class MatchResult(Base):
    __tablename__ = "match_results"
    match_id = Column(Integer, primary_key=True)
    home_team = Column(String)
    away_team = Column(String)
    predicted_outcome = Column(String)
    actual_outcome = Column(String)
    home_score = Column(Integer)
    away_score = Column(Integer)
    stage = Column(String)
    match_date = Column(String)
    processed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class AccuracyLog(Base):
    __tablename__ = "accuracy_log"
    id = Column(Integer, primary_key=True, autoincrement=True)
    total_matches = Column(Integer)
    correct = Column(Integer)
    accuracy_pct = Column(Float)
    logged_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

def init_db():
    Base.metadata.create_all(engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()