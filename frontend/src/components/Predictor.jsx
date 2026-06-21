import { useState, useEffect, useRef } from 'react'
import { predictMatch } from '../api'

const TEAMS = [
  "Algeria", "Argentina", "Australia", "Austria",
  "Belgium", "Bosnia and Herzegovina", "Brazil",
  "Canada", "Cabo Verde", "Colombia", "Croatia", "Curacao",
  "Czechia", "DR Congo",
  "Ecuador", "Egypt", "England",
  "France",
  "Germany", "Ghana",
  "Haiti",
  "Iran", "Iraq", "Ivory Coast",
  "Japan", "Jordan",
  "Mexico", "Morocco",
  "Netherlands", "New Zealand", "Norway",
  "Panama", "Paraguay", "Portugal",
  "Qatar",
  "Saudi Arabia", "Scotland", "Senegal", "South Africa", "South Korea",
  "Spain", "Sweden", "Switzerland",
  "Tunisia", "Turkey",
  "Uruguay", "USA", "Uzbekistan"
].sort()

const FLAGS = {
  "Algeria":"🇩🇿",
  "Argentina":"🇦🇷",
  "Australia":"🇦🇺",
  "Austria":"🇦🇹",
  "Belgium":"🇧🇪",
  "Bosnia and Herzegovina":"🇧🇦",
  "Brazil":"🇧🇷",
  "Canada":"🇨🇦",
  "Cabo Verde":"🇨🇻",
  "Colombia":"🇨🇴",
  "Croatia":"🇭🇷",
  "Curacao":"🇨🇼",
  "Czechia":"🇨🇿",
  "DR Congo":"🇨🇩",
  "Ecuador":"🇪🇨",
  "Egypt":"🇪🇬",
  "England":"🏴",
  "France":"🇫🇷",
  "Germany":"🇩🇪",
  "Ghana":"🇬🇭",
  "Haiti":"🇭🇹",
  "Iran":"🇮🇷",
  "Iraq":"🇮🇶",
  "Ivory Coast":"🇨🇮",
  "Japan":"🇯🇵",
  "Jordan":"🇯🇴",
  "Mexico":"🇲🇽",
  "Morocco":"🇲🇦",
  "Netherlands":"🇳🇱",
  "New Zealand":"🇳🇿",
  "Norway":"🇳🇴",
  "Panama":"🇵🇦",
  "Paraguay":"🇵🇾",
  "Portugal":"🇵🇹",
  "Qatar":"🇶🇦",
  "Saudi Arabia":"🇸🇦",
  "Scotland":"🏴",
  "Senegal":"🇸🇳",
  "South Africa":"🇿🇦",
  "South Korea":"🇰🇷",
  "Spain":"🇪🇸",
  "Sweden":"🇸🇪",
  "Switzerland":"🇨🇭",
  "Tunisia":"🇹🇳",
  "Turkey":"🇹🇷",
  "Uruguay":"🇺🇾",
  "USA":"🇺🇸",
  "Uzbekistan":"🇺🇿"
}

const getFlag = (t) => FLAGS[t] || '🏳️'
const COLORS = { home: '#3b82f6', draw: '#6b7280', away: '#ef4444' }
const CONFETTI_COLORS = ['#3b82f6','#ef4444','#f59e0b','#10b981','#8b5cf6','#ec4899']

function Confetti() {
  const pieces = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    duration: 1.5 + Math.random() * 2,
    delay: Math.random() * 0.8,
    size: 6 + Math.random() * 6,
  }))

  return (
    <div className="confetti-container">
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: p.size,
            height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

function AnimatedBar({ value, color, delay = 0 }) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setWidth(value * 100), delay)
    return () => clearTimeout(t)
  }, [value, delay])

  return (
    <div className="prob-track">
      <div className="prob-fill" style={{ width: `${width}%`, background: color }} />
    </div>
  )
}

export default function Predictor() {
  const [home, setHome] = useState('')
  const [away, setAway] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)

  const handlePredict = async () => {
    if (!home || !away) return setError('Select both teams')
    if (home === away) return setError('Select different teams')
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const data = await predictMatch(home, away, 1)
      setResult(data)
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3000)
    } catch {
      setError('API error — is the backend running?')
    }
    setLoading(false)
  }

  const winner = result?.predicted_outcome === 'home_win' ? result.home_team
    : result?.predicted_outcome === 'away_win' ? result.away_team
    : null

  return (
    <>
      {showConfetti && <Confetti />}
      <div className="page predictor-page">
        <h1>Match Predictor</h1>
        <p className="subtitle">ML-powered predictions for every WC2026 match</p>

        <div className="predictor-card">
          <div className="team-selects">
            <div className="select-group">
              <label>Home Team</label>
              <select value={home} onChange={e => setHome(e.target.value)}>
                <option value="">Select team...</option>
                {TEAMS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="vs-badge">VS</div>
            <div className="select-group">
              <label>Away Team</label>
              <select value={away} onChange={e => setAway(e.target.value)}>
                <option value="">Select team...</option>
                {TEAMS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          <button className="predict-btn" onClick={handlePredict} disabled={loading}>
            {loading ? 'Predicting...' : 'Predict Match'}
          </button>

          {result && (
            <div className="result-panel">
              <div className="result-header">
                <div className="team-block-result">
                  <span className="team-flag-large">{getFlag(result.home_team)}</span>
                  <span className="team-name-result">{result.home_team}</span>
                </div>
                <div className="result-center">
                  <span className="result-vs">VS</span>
                  <span className="result-label">
                    {winner ? `${winner} wins` : 'Draw likely'}
                  </span>
                </div>
                <div className="team-block-result">
                  <span className="team-flag-large">{getFlag(result.away_team)}</span>
                  <span className="team-name-result">{result.away_team}</span>
                </div>
              </div>

              <div className="prob-bars">
                {[
                  { label: result.home_team, value: result.home_win, color: COLORS.home, delay: 0 },
                  { label: 'Draw', value: result.draw, color: COLORS.draw, delay: 150 },
                  { label: result.away_team, value: result.away_win, color: COLORS.away, delay: 300 },
                ].map(({ label, value, color, delay }) => (
                  <div key={label} className="prob-row">
                    <span className="prob-label">{label}</span>
                    <AnimatedBar value={value} color={color} delay={delay} />
                    <span className="prob-pct">{(value * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}