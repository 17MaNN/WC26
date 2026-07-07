export default function Navbar({ page, setPage }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="trophy">🏆</span>
        <span>WC2026 Predictor</span>
      </div>
      <div className="navbar-links">
        <button className={page==='predictor'?'active':''} onClick={()=>setPage('predictor')}>
          Predict
        </button>
        <button className={page==='fixtures'?'active':''} onClick={()=>setPage('fixtures')}>
          Fixtures
        </button>
        <button className={page==='accuracy'?'active':''} onClick={()=>setPage('accuracy')}>
          Accuracy
        </button>
      </div>
    </nav>
  )
}