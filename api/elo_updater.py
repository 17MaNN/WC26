import requests
from database import SessionLocal, EloRating, MatchResult, AccuracyLog
from predict import make_prediction, INITIAL_ELO
from datetime import datetime, timezone

K_GROUP = 32
K_KNOCKOUT = 40
FIXTURES_URL = "https://www.thestatsapi.com/world-cup/data/fixtures.json"

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
        db.add(EloRating(
            team=team,
            rating=rating,
            updated_at=datetime.now(timezone.utc)
        ))
    db.commit()

def update_elo_pair(db, home, away, outcome, stage):
    k = K_KNOCKOUT if stage != 'group-stage' else K_GROUP
    eh = get_elo_from_db(db, home)
    ea = get_elo_from_db(db, away)

    if outcome == 'home_win':
        sh, sa = 1, 0
    elif outcome == 'away_win':
        sh, sa = 0, 1
    else:
        sh, sa = 0.5, 0.5

    exp_h = expected_score(eh, ea)
    exp_a = expected_score(ea, eh)

    new_eh = round(eh + k * (sh - exp_h), 2)
    new_ea = round(ea + k * (sa - exp_a), 2)

    save_elo(db, home, new_eh)
    save_elo(db, away, new_ea)
    return new_eh, new_ea

def get_actual_outcome(home_score, away_score):
    if home_score > away_score:
        return 'home_win'
    elif home_score < away_score:
        return 'away_win'
    return 'draw'

def run_update():
    print(f"[{datetime.now()}] Running Elo update...")
    db = SessionLocal()
    try:
        res = requests.get(FIXTURES_URL, timeout=10)
        fixtures = res.json().get('fixtures', [])

        processed_ids = {r.match_id for r in db.query(MatchResult).all()}
        new_processed = 0

        for m in fixtures:
            mid = m.get('matchNumber')
            home = m.get('homeTeam')
            away = m.get('awayTeam')
            hs = m.get('score_home')
            as_ = m.get('score_away')
            stage = m.get('stage', 'group-stage')

            if hs is None or mid in processed_ids:
                continue
            if not home or not away:
                continue
            if 'Winner' in str(home) or 'Group' in str(home):
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
                match_date=m.get('date', ''),
            ))
            db.commit()
            new_processed += 1

        all_results = db.query(MatchResult).all()
        total = len(all_results)
        correct = sum(1 for r in all_results
                      if r.predicted_outcome == r.actual_outcome)
        acc = round((correct / total * 100), 2) if total > 0 else 0

        if new_processed > 0:
            db.add(AccuracyLog(
                total_matches=total,
                correct=correct,
                accuracy_pct=acc
            ))
            db.commit()

        print(f"[{datetime.now()}] Done. New: {new_processed}, "
              f"Accuracy: {acc}%")

    except Exception as e:
        print(f"Update error: {e}")
    finally:
        db.close()