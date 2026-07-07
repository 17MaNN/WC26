import { useEffect, useState } from 'react'
import { fetchFixtures } from '../api'

const FLAGS = {
  "Argentina":"🇦🇷","France":"🇫🇷","England":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","Brazil":"🇧🇷",
  "Spain":"🇪🇸","Portugal":"🇵🇹","Belgium":"🇧🇪","Germany":"🇩🇪",
  "Netherlands":"🇳🇱","Croatia":"🇭🇷","Italy":"🇮🇹","Morocco":"🇲🇦",
  "Uruguay":"🇺🇾","Colombia":"🇨🇴","Denmark":"🇩🇰","Mexico":"🇲🇽",
  "United States":"🇺🇸","Switzerland":"🇨🇭","Senegal":"🇸🇳","Japan":"🇯🇵",
  "Ecuador":"🇪🇨","Australia":"🇦🇺","Poland":"🇵🇱","South Korea":"🇰🇷",
  "Canada":"🇨🇦","Turkey":"🇹🇷","Ukraine":"🇺🇦","Austria":"🇦🇹",
  "Ghana":"🇬🇭","Tunisia":"🇹🇳","Cameroon":"🇨🇲","Serbia":"🇷🇸",
  "Ivory Coast":"🇨🇮","Czechia":"🇨🇿","Sweden":"🇸🇪","Nigeria":"🇳🇬",
  "Algeria":"🇩🇿","Egypt":"🇪🇬","Saudi Arabia":"🇸🇦","Iran":"🇮🇷",
  "Venezuela":"🇻🇪","Paraguay":"🇵🇾","South Africa":"🇿🇦","Qatar":"🇶🇦",
  "Iraq":"🇮🇶","Indonesia":"🇮🇩","New Zealand":"🇳🇿","Bolivia":"🇧🇴",
  "Norway":"🇳🇴","Scotland":"🏴󠁧󠁢󠁳󠁣󠁴󠁿","Cape Verde Islands":"🇨🇻",
  "Congo DR":"🇨🇩","Bosnia-Herzegovina":"🇧🇦","Curaçao":"🇨🇼",
  "Haiti":"🇭🇹","Uzbekistan":"🇺🇿","Jordan":"🇯🇴","Panama":"🇵🇦",
}

const getFlag = (t) => FLAGS[t] || '🏳️'

const STAGE_LABELS = {
  GROUP_STAGE: 'Group Stage',
  LAST_32: 'Round of 32',
  LAST_16: 'Round of 16',
  QUARTER_FINALS: 'Quarter Finals',
  SEMI_FINALS: 'Semi Finals',
  FINAL: 'Final'
}

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', {
  day: 'numeric', month: 'short'
})

export default function Fixtures() {
  const [fixtures, setFixtures] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [stage, setStage] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetchFixtures().then(data => {
      setFixtures(data)
      setLoading(false)
    })
  }, [])

  const stages = [...new Set(fixtures.map(m => m.stage))].filter(Boolean)

  const filtered = fixtures.filter(m => {
    const s = filter.toLowerCase()
    const matchStage = stage ? m.stage === stage : true
    const matchStatus = statusFilter ? m.status === statusFilter : true
    const matchSearch = !s ||
      (m.home_team||'').toLowerCase().includes(s) ||
      (m.away_team||'').toLowerCase().includes(s) ||
      (m.stadium||'').toLowerCase().includes(s)
    return matchStage && matchStatus && matchSearch
  })

  if (loading) return (
    <div className="page">
      <p className="loading">Loading fixtures...</p>
    </div>
  )

  return (
    <div className="page">
      <h1>All Fixtures</h1>
      <p className="subtitle">
        {fixtures.filter(m=>m.status==='FINISHED').length} played ·{' '}
        {fixtures.filter(m=>m.status!=='FINISHED').length} upcoming · live predictions
      </p>

      <div className="filters">
        <input
          placeholder="Search team or venue..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All matches</option>
          <option value="FINISHED">Finished</option>
          <option value="SCHEDULED">Upcoming</option>
          <option value="TIMED">Upcoming</option>
        </select>
        <select value={stage} onChange={e => setStage(e.target.value)}>
          <option value="">All stages</option>
          {stages.map(s => (
            <option key={s} value={s}>{STAGE_LABELS[s] || s}</option>
          ))}
        </select>
      </div>

      <div className="fixtures-list">
        {filtered.map(m => {
          const finished = m.status === 'FINISHED'
          const known = m.home_team &&
            !m.home_team.includes('Group') &&
            !m.home_team.includes('Winner') &&
            !m.home_team.includes('runners')

          return (
            <div key={m.match_id}
              className={`fixture-card ${finished ? 'finished' : ''}`}>
              <div className="fixture-meta">
                <span className="stage-tag">
                  {STAGE_LABELS[m.stage] || m.stage}
                </span>
                {m.group && (
                  <span className="group-tag">Group {m.group}</span>
                )}
                {finished && (
                  <span className="finished-tag">FT</span>
                )}
                <span className="fixture-date">
                  {fmtDate(m.date)} · #{m.match_id}
                </span>
                {m.stadium && (
                  <span className="fixture-venue">📍 {m.stadium}</span>
                )}
              </div>

              <div className="fixture-teams">
                <span className="fixture-team">
                  <span className="fixture-flag">{getFlag(m.home_team)}</span>
                  {m.home_team || 'TBD'}
                </span>

                {finished ? (
                  <span className="fixture-score">
                    {m.score_home} – {m.score_away}
                  </span>
                ) : (
                  <span className="fixture-vs">VS</span>
                )}

                <span className="fixture-team">
                  <span className="fixture-flag">{getFlag(m.away_team)}</span>
                  {m.away_team || 'TBD'}
                </span>
              </div>

              {known && m.home_win != null && (
                <div className="fixture-probs">
                  <div className="fixture-prob-item">
                    <span className="fixture-prob-val"
                      style={{color:'#3b82f6'}}>
                      {(m.home_win*100).toFixed(0)}%
                    </span>
                    <span className="fixture-prob-lbl">
                      {m.home_team.split(' ')[0]}
                    </span>
                  </div>
                  <div className="fixture-prob-divider"/>
                  <div className="fixture-prob-item">
                    <span className="fixture-prob-val"
                      style={{color:'#6b7280'}}>
                      {(m.draw*100).toFixed(0)}%
                    </span>
                    <span className="fixture-prob-lbl">Draw</span>
                  </div>
                  <div className="fixture-prob-divider"/>
                  <div className="fixture-prob-item">
                    <span className="fixture-prob-val"
                      style={{color:'#ef4444'}}>
                      {(m.away_win*100).toFixed(0)}%
                    </span>
                    <span className="fixture-prob-lbl">
                      {m.away_team.split(' ')[0]}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}