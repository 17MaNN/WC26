import { useState } from 'react'
import Navbar from './components/Navbar'
import Predictor from './components/Predictor'
import Fixtures from './components/Fixtures'
import Accuracy from './components/Accuracy'
import './App.css'

export default function App() {
  const [page, setPage] = useState('predictor')

  return (
    <div className="app">
      <Navbar page={page} setPage={setPage} />
      {page === 'predictor' && <Predictor />}
      {page === 'fixtures' && <Fixtures />}
      {page === 'accuracy' && <Accuracy />}
    </div>
  )
}