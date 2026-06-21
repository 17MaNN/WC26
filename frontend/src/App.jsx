import { useState } from 'react'
import Navbar from './components/Navbar'
import Predictor from './components/Predictor'
import Fixtures from './components/Fixtures'
import './App.css'

export default function App() {
  const [page, setPage] = useState('predictor')

  return (
    <div className="app">
      <Navbar page={page} setPage={setPage} />
      {page === 'predictor' ? <Predictor /> : <Fixtures />}
    </div>
  )
}