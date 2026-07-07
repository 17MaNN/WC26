from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from apscheduler.schedulers.background import BackgroundScheduler
from database import init_db, get_db, EloRating, MatchResult, AccuracyLog
from predict import make_prediction
from elo_updater import run_update
import atexit

app = FastAPI(title="WC2026 Predictor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# init DB tables on startup
@app.on_event("startup")
def startup():
    init_db()
    run_update()  # run once on startup
    scheduler = BackgroundScheduler()
    scheduler.add_job(run_update, 'interval', hours=1)
    scheduler.start()
    atexit.register(lambda: scheduler.shutdown())

class MatchRequest(BaseModel):
    home_team: str
    away_team: str
    is_neutral: int = 1

@app.get("/")
def root():
    return {"status": "ok", "model": "XGBoost WC2026"}

@app.post("/predict")
def predict_post(req: MatchRequest, db: Session = Depends(get_db)):
    try:
        return make_prediction(req.home_team, req.away_team, req.is_neutral, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/predict")
def predict_get(home: str, away: str, neutral: int = 1,
                db: Session = Depends(get_db)):
    try:
        return make_prediction(home, away, neutral, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/accuracy")
def get_accuracy(db: Session = Depends(get_db)):
    results = db.query(MatchResult).all()
    total = len(results)
    correct = sum(1 for r in results if r.predicted_outcome == r.actual_outcome)
    acc = round(correct / total * 100, 2) if total > 0 else 0

    by_stage = {}
    for r in results:
        s = r.stage
        if s not in by_stage:
            by_stage[s] = {'total': 0, 'correct': 0}
        by_stage[s]['total'] += 1
        if r.predicted_outcome == r.actual_outcome:
            by_stage[s]['correct'] += 1

    history = db.query(AccuracyLog).order_by(AccuracyLog.logged_at).all()

    return {
        "total": total,
        "correct": correct,
        "accuracy_pct": acc,
        "by_stage": by_stage,
        "history": [{"acc": h.accuracy_pct, "total": h.total_matches,
                     "date": str(h.logged_at)} for h in history],
        "recent": [
            {
                "match": f"{r.home_team} vs {r.away_team}",
                "predicted": r.predicted_outcome,
                "actual": r.actual_outcome,
                "correct": r.predicted_outcome == r.actual_outcome,
                "score": f"{r.home_score}–{r.away_score}",
                "date": r.match_date
            }
            for r in reversed(results[-10:])
        ]
    }

@app.get("/elo")
def get_elo_ratings(db: Session = Depends(get_db)):
    ratings = db.query(EloRating).order_by(EloRating.rating.desc()).all()
    return [{"team": r.team, "rating": r.rating,
             "updated_at": str(r.updated_at)} for r in ratings]

@app.post("/trigger-update")
def trigger_update():
    try:
        run_update()
        return {"status": "update complete"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/debug-fixtures")
def debug_fixtures():
    import requests, os
    headers = {"X-Auth-Token": os.environ.get("FOOTBALL_DATA_API_KEY")}
    res = requests.get(
        "https://api.football-data.org/v4/competitions/WC/matches",
        headers=headers, timeout=10
    )
    matches = res.json().get('matches', [])
    finished = [m for m in matches if m.get('status') == 'FINISHED']
    return {
        "status": res.status_code,
        "total": len(matches),
        "finished": len(finished),
        "sample": finished[:2] if finished else matches[:2]
    }