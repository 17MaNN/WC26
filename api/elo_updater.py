import os
import requests
from database import SessionLocal, EloRating, MatchResult, AccuracyLog
from predict import make_prediction, INITIAL_ELO
from datetime import datetime, timezone

K_GROUP = 32
K_KNOCKOUT = 40
FD_API_KEY = os.environ.get("FOOTBALL_DATA_API_KEY")
FD_URL = "https://api.football-data.org/v4/competitions/WC/matches"

def expected_score(ra, rb):
    return 1 / (1 + 10 ** ((rb - ra) / 400))

def get_elo_from_db(db, team):
    row = db.query(EloRating).filter(EloRating.team == team).first()
    if row:
        return row.rating
    return INITIAL_ELO.get(team, 1400)

def save_elo(db, team, rating):
    row = db.query(EloRating).filter(EloRating.team == team).first()
    if row:
        row.rating = rating
        row.updated_at = datetime.now(timezone.utc)
    else:
        db.add(EloRating(team=team, rating=rating,
                         updated_at=datetime.now(timezone.utc)))
    db.commit()

def update_elo_pair(db, home, away, outcome, stage):
    k = K_KNOCKOUT if stage != 'GROUP_STAGE' else K_GROUP
    eh = get_elo_from_db(db, home)
    ea = get_elo_from_db(db, away)
    sh, sa = (1,0) if outcome=='home_win' else (0,1) if outcome=='away_win' else (0.5,0.5)
    new_eh = round(eh + k * (sh - expected_score(eh, ea)), 2)
    new_ea = round(ea + k * (sa - expected_score(ea, eh)), 2)
    save_elo(db, home, new_eh)
    save_elo(db, away, new_ea)

def get_actual_outcome(hs, as_):
    if hs > as_: return 'home_win'
    elif hs < as_: return 'away_win'
    return 'draw'

def run_update():
    print(f"[{datetime.now()}] Running Elo update...")
    db = SessionLocal()
    try:
        headers = {"X-Auth-Token": FD_API_KEY}
        res = requests.get(FD_URL, headers=headers, timeout=10)
        if res.status_code != 200:
            print(f"API error: {res.status_code} {res.text[:200]}")
            return

        matches = res.json().get('matches', [])
        processed_ids = {r.match_id for r in db.query(MatchResult).all()}
        new_processed = 0

        for m in matches:
            mid = m.get('id')
            status = m.get('status')

            # only process finished matches
            if status != 'FINISHED':
                continue
            if mid in processed_ids:
                continue

            home = m['homeTeam']['name']
            away = m['awayTeam']['name']
            hs = m['score']['fullTime']['home']
            as_ = m['score']['fullTime']['away']
            stage = m.get('stage', 'GROUP_STAGE')
            match_date = m.get('utcDate', '')[:10]

            if hs is None or as_ is None:
                continue

            actual = get_actual_outcome(hs, as_)
            pred = make_prediction(home, away, is_neutral=1, db=db)
            predicted = pred['predicted_outcome']

            update_elo_pair(db, home, away, actual, stage)

            db.add(MatchResult(
                match_id=mid,
                home_team=home,
                away_team=away,
                predicted_outcome=predicted,
                actual_outcome=actual,
                home_score=hs,
                away_score=as_,
                stage=stage,
                match_date=match_date,
            ))
            db.commit()
            new_processed += 1
            print(f"  {home} {hs}-{as_} {away} → pred:{predicted} actual:{actual}")

        all_results = db.query(MatchResult).all()
        total = len(all_results)
        correct = sum(1 for r in all_results if r.predicted_outcome == r.actual_outcome)
        acc = round((correct / total * 100), 2) if total > 0 else 0

        if new_processed > 0:
            db.add(AccuracyLog(total_matches=total, correct=correct, accuracy_pct=acc))
            db.commit()

        print(f"[{datetime.now()}] Done. New: {new_processed}, Accuracy: {acc}%")

    except Exception as e:
        print(f"Update error: {e}")
    finally:
        db.close()