from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from predict import make_prediction

app = FastAPI(title="WC2026 Predictor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # restrict to your frontend domain in production
    allow_methods=["*"],
    allow_headers=["*"],
)

class MatchRequest(BaseModel):
    home_team: str
    away_team: str
    is_neutral: int = 0

@app.get("/")
def root():
    return {"status": "ok", "model": "XGBoost WC2026"}

@app.post("/predict")
def predict(req: MatchRequest):
    try:
        result = make_prediction(req.home_team, req.away_team, req.is_neutral)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/predict")
def predict_get(home: str, away: str, neutral: int = 0):
    try:
        return make_prediction(home, away, neutral)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))