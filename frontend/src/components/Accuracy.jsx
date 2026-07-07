import { useEffect, useState } from 'react'
import { fetchAccuracy } from '../api'

const STAGE_LABELS = {
  GROUP_STAGE: 'Group Stage',
  LAST_32: 'Round of 32',
  LAST_16: 'Round of 16',
  QUARTER_FINALS: 'Quarter Finals',
  SEMI_FINALS: 'Semi Finals',
  FINAL: 'Final'
}

export default function Accuracy() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAccuracy().then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <div className="page"><p className="loading">Loading accuracy data...</p></div>

  return (
    <div className="page">
      <h1>Model Accuracy</h1>
      <p className="subtitle">Live tracking — updates every hour as matches finish</p>

      {/* Overall stat */}
      <div className="acc-hero">
        <div className="acc-hero-inner">
          <div className="acc-big">{data.accuracy_pct}%</div>
          <div className="acc-big-label">Overall Accuracy</div>
          <div className="acc-big-sub">{data.correct} correct of {data.total} matches</div>
        </div>
      </div>

      {/* By stage */}
      <div className="acc-section-title">Accuracy by stage</div>
      <div className="acc-stage-grid">
        {Object.entries(data.by_stage).map(([stage, s]) => {
          const pct = s.total > 0 ? Math.round(s.correct / s.total * 100) : 0
          return (
            <div key={stage} className="acc-stage-card">
              <div className="acc-stage-name">{STAGE_LABELS[stage] || stage}</div>
              <div className="acc-stage-pct" style={{
                color: pct >= 60 ? '#22c55e' : pct >= 45 ? '#f59e0b' : '#ef4444'
              }}>{pct}%</div>
              <div className="acc-stage-track">
                <div className="acc-stage-fill" style={{
                  width: `${pct}%`,
                  background: pct >= 60 ? '#22c55e' : pct >= 45 ? '#f59e0b' : '#ef4444'
                }}/>
              </div>
              <div className="acc-stage-sub">{s.correct}/{s.total} correct</div>
            </div>
          )
        })}
      </div>

      {/* Recent matches */}
      <div className="acc-section-title" style={{marginTop:'2rem'}}>Recent predictions</div>
      <div className="acc-recent-list">
        {data.recent.map((r, i) => (
          <div key={i} className={`acc-recent-card ${r.correct ? 'correct' : 'wrong'}`}>
            <div className="acc-recent-left">
              <span className={`acc-badge ${r.correct ? 'badge-correct' : 'badge-wrong'}`}>
                {r.correct ? '✓' : '✗'}
              </span>
              <div>
                <div className="acc-match-name">{r.match}</div>
                <div className="acc-match-meta">{r.date} · Score: {r.score}</div>
              </div>
            </div>
            <div className="acc-recent-right">
              <div className="acc-pred-row">
                <span className="acc-pred-label">Predicted</span>
                <span className="acc-pred-val">{r.predicted.replace('_', ' ')}</span>
              </div>
              <div className="acc-pred-row">
                <span className="acc-pred-label">Actual</span>
                <span className="acc-pred-val">{r.actual.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Live Elo top 10 */}
      <div className="acc-section-title" style={{marginTop:'2rem'}}>Live Elo rankings</div>
      <EloRankings />
    </div>
  )
}

function EloRankings() {
  const [elo, setElo] = useState([])
  useEffect(() => {
    import('../api').then(({default: _, ...api}) => {
      fetch(import.meta.env.VITE_API_URL + '/elo' || 'http://localhost:8000/elo')
        .then(r => r.json()).then(d => setElo(d.slice(0, 10)))
    })
  }, [])

  return (
    <div className="elo-list">
      {elo.map((t, i) => (
        <div key={t.team} className="elo-row">
          <span className="elo-rank">#{i+1}</span>
          <span className="elo-team">{t.team}</span>
          <div className="elo-bar-wrap">
            <div className="elo-bar" style={{
              width: `${((t.rating - 1300) / 600 * 100).toFixed(0)}%`
            }}/>
          </div>
          <span className="elo-rating">{Math.round(t.rating)}</span>
        </div>
      ))}
    </div>
  )
}