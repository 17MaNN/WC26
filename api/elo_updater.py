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
            team=team, rating=rating,
            updated_at=datetime.now(timezone.utc)
        ))
    db.commit()

def update_elo_pair(db, home, away, outcome, stage):
    k = K_KNOCKOUT if stage != 'group-stage' else K_GROUP
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

def fetch_match_score(match_url):
    """Fetch individual match page and extract score."""
    try:
        # match data endpoint — append /data.json
        data_url = match_url.replace(
            'https://www.thestatsapi.com/world-cup/matches/',
            'https://www.thestatsapi.com/world-cup/data/matches/'
        ) + '.json'
        res = requests.get(data_url, timeout=8)
        if res.status_code != 200:
            return None, None
        data = res.json()
        hs = data.get('score_home') or data.get('homeScore') or data.get('home_score')
        as_ = data.get('score_away') or data.get('awayScore') or data.get('away_score')
        if hs is not None and as_ is not None:
            return int(hs), int(as_)
        return None, None
    except:
        return None, None

def run_update():
    print(f"[{datetime.now()}] Running Elo update...")
    db = SessionLocal()
    try:
        res = requests.get(FIXTURES_URL, timeout=10)
        fixtures = res.json().get('fixtures', [])

        processed_ids = {r.match_id for r in db.query(MatchResult).all()}
        new_processed = 0

        # only process past matches (by date)
        today = datetime.now(timezone.utc).date()

        for m in fixtures:
            mid = m.get('matchNumber')
            home = m.get('homeTeam')
            away = m.get('awayTeam')
            stage = m.get('stage', 'group-stage')
            match_url = m.get('matchUrl', '')
            match_date = m.get('date', '')

            # skip future matches
            try:
                if datetime.strptime(match_date, '%Y-%m-%d').date() >= today:
                    continue
            except:
                continue

            if mid in processed_ids:
                continue
            if not home or not away:
                continue
            if any(x in str(home) for x in ['Winner', 'Group', 'Loser', 'Runner']):
                continue

            # fetch score from match page
            hs, as_ = fetch_match_score(match_url)
            if hs is None:
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
            print(f"  Processed: {home} {hs}-{as_} {away} → pred:{predicted} actual:{actual}")

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