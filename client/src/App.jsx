import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import SetupWizard from './pages/SetupWizard'
import Dashboard   from './pages/Dashboard'

export default function App() {
  const [firstRun, setFirstRun] = useState(null)

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(d => setFirstRun(d.first_run))
      .catch(() => setFirstRun(false))
  }, [])

  if (firstRun === null) return (
    <div className="flex items-center justify-center h-screen bg-slate-900 text-white text-xl">
      Starting...
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/setup"     element={<SetupWizard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to={firstRun ? "/setup" : "/dashboard"} />} />
      </Routes>
    </BrowserRouter>
  )
}
