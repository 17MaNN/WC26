import joblib
import pandas as pd

model = joblib.load(r'C:\WC26\models\xgb_model.pkl')

FEATURES = [
    'elo_diff', 'form_diff', 'is_neutral', 'tournament_weight',
    'avg_goals_diff', 'defense_diff', 'is_major_tournament', 'h2h_home_wins'
]

ELO_RATINGS = {
    "Argentina": 1850,
    "France": 1810,
    "England": 1790,
    "Brazil": 1780,
    "Spain": 1770,
    "Portugal": 1740,
    "Belgium": 1720,
    "Germany": 1710,
    "Netherlands": 1700,
    "Croatia": 1680,
    "Italy": 1670,
    "Morocco": 1650,
    "Uruguay": 1640,
    "Colombia": 1620,
    "Denmark": 1610,
    "Mexico": 1600,
    "USA": 1590,
    "Switzerland": 1580,
    "Senegal": 1570,
    "Japan": 1560,
    "Ecuador": 1550,
    "Australia": 1540,
    "Poland": 1530,
    "South Korea": 1520,
    "Canada": 1510,
    "Turkey": 1500,
    "Ukraine": 1490,
    "Austria": 1485,
    "Ghana": 1480,
    "Tunisia": 1475,
    "Cameroon": 1470,
    "Serbia": 1465,
    "Ivory Coast": 1460,
    "Czechia": 1455,
    "Sweden": 1450,
    "Nigeria": 1445,
    "Algeria": 1440,
    "Egypt": 1435,
    "Saudi Arabia": 1430,
    "Iran": 1425,
    "Venezuela": 1415,
    "Paraguay": 1410,
    "South Africa": 1390,
    "Qatar": 1385,
    "Iraq": 1375,
    "Indonesia": 1340,
    "New Zealand": 1360,
    "Bolivia": 1340,
    "DR Congo": 1380,
    "Bosnia and Herzegovina": 1450,
    "Cabo Verde": 1420,
    "Curacao": 1385,
    "Haiti": 1370,
    "Jordan": 1410,
    "Norway": 1630,
    "Panama": 1470,
    "Scotland": 1600,
    "Uzbekistan": 1460,
}

def get_elo(team):
    # try exact match first
    if team in ELO_RATINGS:
        return ELO_RATINGS[team]
    # try case-insensitive
    for k, v in ELO_RATINGS.items():
        if k.lower() == team.lower():
            return v
    # fallback
    return 1400

def make_prediction(home_team: str, away_team: str, is_neutral: int = 0):
    elo_h = get_elo(home_team)
    elo_a = get_elo(away_team)

    features = pd.DataFrame([{
        'elo_diff': elo_h - elo_a,
        'form_diff': 0,              # default, update with live data later
        'is_neutral': is_neutral,
        'tournament_weight': 3,      # World Cup = 3
        'avg_goals_diff': 0,
        'defense_diff': 0,
        'is_major_tournament': 3,
        'h2h_home_wins': 0
    }])

    probs = model.predict_proba(features)[0]
    outcome = ['away_win', 'draw', 'home_win'][probs.argmax()]

    return {
        "home_team": home_team,
        "away_team": away_team,
        "away_win": round(float(probs[0]), 3),
        "draw": round(float(probs[1]), 3),
        "home_win": round(float(probs[2]), 3),
        "predicted_outcome": outcome
    }