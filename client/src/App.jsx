import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import SetupWizard from './pages/SetupWizard'
import Dashboard from './pages/Dashboard'
import Landing from './pages/Landing'

export default function App() {
  const [firstRun, setFirstRun] = useState(null)

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(d => setFirstRun(d.first_run))
      .catch(() => setFirstRun(false))
  }, [])

  if (firstRun === null) return (
    <div className="flex items-center justify-center h-screen bg-surface text-on-surface text-xl font-body">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <span className="text-on-surface-variant text-sm uppercase tracking-widest">Initializing</span>
      </div>
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/setup" element={<SetupWizard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to={firstRun ? "/setup" : "/dashboard"} />} />
      </Routes>
    </BrowserRouter>
  )
}
