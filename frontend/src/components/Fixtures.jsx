import { useEffect, useState } from 'react'
import { fetchFixtures, predictMatch } from '../api'

const FLAGS = {
  "Argentina":"🇦🇷","France":"🇫🇷","England":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","Brazil":"🇧🇷",
  "Spain":"🇪🇸","Portugal":"🇵🇹","Germany":"🇩🇪","Netherlands":"🇳🇱",
  "USA":"🇺🇸","Mexico":"🇲🇽","Canada":"🇨🇦","Japan":"🇯🇵",
  "Morocco":"🇲🇦","Croatia":"🇭🇷","South Korea":"🇰🇷","Australia":"🇦🇺",
  "Belgium":"🇧🇪","Italy":"🇮🇹","Uruguay":"🇺🇾","Colombia":"🇨🇴",
  "Denmark":"🇩🇰","Switzerland":"🇨🇭","Senegal":"🇸🇳","Ecuador":"🇪🇨",
  "Poland":"🇵🇱","Ghana":"🇬🇭","Tunisia":"🇹🇳","Cameroon":"🇨🇲",
  "Serbia":"🇷🇸","Saudi Arabia":"🇸🇦","Iran":"🇮🇷","Nigeria":"🇳🇬",
  "Egypt":"🇪🇬","Algeria":"🇩🇿","Turkey":"🇹🇷","Sweden":"🇸🇪",
  "South Africa":"🇿🇦","Bolivia":"🇧🇴","Indonesia":"🇮🇩","Iraq":"🇮🇶",
  "Qatar":"🇶🇦","Venezuela":"🇻🇪","Paraguay":"🇵🇾","New Zealand":"🇳🇿",
}

const getFlag = (team) => FLAGS[team] || '🏳️'
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

export default function Fixtures() {
  const [fixtures, setFixtures] = useState([])
  const [predictions, setPredictions] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [stage, setStage] = useState('')

  useEffect(() => {
    fetchFixtures().then(data => {
      setFixtures(data)
      setLoading(false)
      data
        .filter(m => m.stage === 'group-stage' && m.homeTeam && m.awayTeam)
        .forEach(async m => {
          try {
            const p = await predictMatch(m.homeTeam, m.awayTeam, 1)
            setPredictions(prev => ({ ...prev, [m.matchNumber]: p }))
          } catch {}
        })
    })
  }, [])

  const stages = [...new Set(fixtures.map(m => m.stage))]

  const filtered = fixtures.filter(m => {
    const s = filter.toLowerCase()
    const matchStage = stage ? m.stage === stage : true
    const matchSearch = !s || (m.homeTeam||'').toLowerCase().includes(s) ||
      (m.awayTeam||'').toLowerCase().includes(s) ||
      (m.stadium||'').toLowerCase().includes(s)
    return matchStage && matchSearch
  })

  if (loading) return <div className="page"><p className="loading">Loading fixtures...</p></div>

  return (
    <div className="page">
      <h1>All Fixtures</h1>
      <p className="subtitle">104 matches · predictions auto-loaded for group stage</p>

      <div className="filters">
        <input
          placeholder="Search team or venue..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <select value={stage} onChange={e => setStage(e.target.value)}>
          <option value="">All stages</option>
          {stages.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="fixtures-list">
        {filtered.map(m => {
          const p = predictions[m.matchNumber]
          const known = m.homeTeam && m.awayTeam &&
            !m.homeTeam.includes('Winner') && !m.homeTeam.includes('Group')

          return (
            <div key={m.matchNumber} className="fixture-card">
              <div className="fixture-meta">
                <span className="stage-tag">{m.stage.replace(/-/g,' ')}</span>
                {m.group && <span className="group-tag">Group {m.group}</span>}
                <span className="fixture-date">{fmtDate(m.date)} · #{m.matchNumber}</span>
                <span className="fixture-venue">📍 {m.stadium}</span>
              </div>
              <div className="fixture-teams">
                <span className="fixture-team">{getFlag(m.homeTeam)} {m.homeTeam || 'TBD'}</span>
                <span className="fixture-vs">vs</span>
                <span className="fixture-team">{getFlag(m.awayTeam)} {m.awayTeam || 'TBD'}</span>
              </div>
              {known && p && (
                 <div className="fixture-probs">
                 <div className="fixture-prob-item">
                  <span className="fixture-prob-val" style={{color:'#3b82f6'}}>{(p.home_win*100).toFixed(0)}%</span>
                  <span className="fixture-prob-lbl">{m.homeTeam.split(' ')[0]}</span>
                 </div>
                 <div className="fixture-prob-divider" />
                <div className="fixture-prob-item">
                   <span className="fixture-prob-val" style={{color:'#6b7280'}}>{(p.draw*100).toFixed(0)}%</span>
                  <span className="fixture-prob-lbl">Draw</span>
                </div>
                <div className="fixture-prob-divider" />
                <div className="fixture-prob-item">
                  <span className="fixture-prob-val" style={{color:'#ef4444'}}>{(p.away_win*100).toFixed(0)}%</span>
                  <span className="fixture-prob-lbl">{m.awayTeam.split(' ')[0]}</span>
                </div>
               </div>
              )}
              {known && p && (
                <div className="fixture-probs">
                  <span style={{color:'#378add'}}>{(p.home_win*100).toFixed(0)}%</span>
                  <span style={{color:'#888'}}>Draw {(p.draw*100).toFixed(0)}%</span>
                  <span style={{color:'#D85A30'}}>{(p.away_win*100).toFixed(0)}%</span>
                </div>
              )}
              {known && !p && (
                <div className="fixture-probs loading-probs">loading prediction...</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}