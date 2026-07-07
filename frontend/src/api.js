import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const predictMatch = async (home, away, neutral = 1) => {
  const res = await axios.get(`${BASE}/predict`, {
    params: { home, away, neutral }
  })
  return res.data
}

export const fetchFixtures = async () => {
  const res = await axios.get(
    'https://www.thestatsapi.com/world-cup/data/fixtures.json'
  )
  return res.data.fixtures
}

export const fetchAccuracy = async () => {
  const res = await axios.get(`${BASE}/accuracy`)
  return res.data
}

export const fetchFixtures = async () => {
  const res = await axios.get(`${BASE}/fixtures`)
  return res.data
}