import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import StepIndicator from '../components/StepIndicator'

const STEPS = ['Welcome', 'Network', 'ESP32', 'Flash', 'Done']

export default function SetupWizard() {
  const [step, setStep]         = useState(0)
  const [wifiInfo, setWifi]     = useState({ ssid: '', ip: '' })
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [ports, setPorts]       = useState([])
  const [autoPort, setAutoPort] = useState('')
  const [selPort, setSelPort]   = useState('')
  const [flashing, setFlashing] = useState(false)
  const [flashMsg, setFlashMsg] = useState('')
  const [flashOk, setFlashOk]   = useState(false)
  const [error, setError]       = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (step === 1) fetch('/api/wifi').then(r => r.json()).then(setWifi)
    if (step === 2) {
      fetch('/api/ports').then(r => r.json()).then(d => {
        setPorts(d.ports || [])
        setAutoPort(d.auto || '')
        setSelPort(d.auto || '')
      })
    }
  }, [step])

  const next = () => { setError(''); setStep(s => s + 1) }

  const validateNetwork = () => {
    if (!password)       { setError('Enter your WiFi password.'); return }
    if (!wifiInfo.ssid)  { setError('WiFi not detected. Check your connection.'); return }
    next()
  }

  const validatePort = () => {
    if (!selPort) { setError('Select a COM port.'); return }
    next()
  }

  const doFlash = async () => {
    setFlashing(true)
    setFlashMsg('Sending configuration to ESP32...')
    const res = await fetch('/api/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        port:        selPort,
        ssid:        wifiInfo.ssid,
        password,
        server_ip:   wifiInfo.ip,
        server_port: 8080,
      })
    })
    const data = await res.json()
    setFlashing(false)
    if (data.success) {
      setFlashOk(true)
      setFlashMsg('ESP32 configured!')
      setTimeout(() => next(), 1200)
    } else {
      setFlashMsg(data.message)
    }
  }

  const base = "min-h-screen bg-slate-900 text-white flex items-center justify-center p-6"

  return (
    <div className={base}>
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl p-8">
        <StepIndicator steps={STEPS} current={step} />

        {step === 0 && (
          <div className="text-center mt-4">
            <div className="text-5xl mb-3">🖥️</div>
            <h1 className="text-2xl font-bold mb-2">Deep Work Concierge</h1>
            <p className="text-slate-400 mb-6 text-sm">
              Connect your ESP32 to this PC's WiFi and server.<br/>Takes about 2 minutes.
            </p>
            <button onClick={next}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition">
              Get Started →
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="mt-4">
            <h2 className="text-xl font-bold mb-4">Network Details</h2>
            <div className="bg-slate-700 rounded-xl p-4 mb-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">WiFi Network</span>
                <span className="font-mono text-green-400">{wifiInfo.ssid || 'Detecting...'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Server IP (this PC)</span>
                <span className="font-mono text-blue-400">{wifiInfo.ip}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Server Port</span>
                <span className="font-mono text-blue-400">8080</span>
              </div>
            </div>
            <label className="text-sm text-slate-400 block mb-1">WiFi Password</label>
            <div className="relative mb-3">
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-700 rounded-xl px-4 py-3 pr-14 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter WiFi password" />
              <button onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-3 text-slate-400 text-xs">
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            <button onClick={validateNetwork}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition">
              Next →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="mt-4">
            <h2 className="text-xl font-bold mb-2">Connect ESP32 via USB</h2>
            <p className="text-slate-400 text-sm mb-4">Plug in your ESP32 then click Detect.</p>
            {autoPort
              ? <div className="bg-green-900/40 border border-green-600 rounded-xl p-3 text-green-400 text-sm mb-3">
                  ✅ Found on <span className="font-mono font-bold">{autoPort}</span>
                </div>
              : <div className="bg-yellow-900/40 border border-yellow-600 rounded-xl p-3 text-yellow-400 text-sm mb-3">
                  ⚠️ Not auto-detected. Select manually.
                </div>
            }
            <select value={selPort} onChange={e => setSelPort(e.target.value)}
              className="w-full bg-slate-700 rounded-xl px-4 py-3 mb-2 outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select port...</option>
              {ports.map(p => (
                <option key={p.device} value={p.device}>
                  {p.device} — {p.description}
                </option>
              ))}
            </select>
            <button onClick={() => fetch('/api/ports').then(r => r.json()).then(d => {
              setPorts(d.ports || []); setAutoPort(d.auto || ''); setSelPort(d.auto || '')
            })} className="text-sm text-blue-400 hover:underline block mb-3">
              🔄 Re-scan
            </button>
            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            <button onClick={validatePort}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition">
              Next →
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="mt-4 text-center">
            <h2 className="text-xl font-bold mb-2">Flashing ESP32</h2>
            <p className="text-slate-400 text-sm mb-6">Keep USB plugged in.</p>
            {!flashing && !flashOk && (
              <button onClick={doFlash}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition mb-3">
                🚀 Send Credentials
              </button>
            )}
            {flashing && (
              <div className="space-y-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-slate-300 text-sm">{flashMsg}</p>
              </div>
            )}
            {flashOk && <p className="text-green-400 font-semibold">✅ {flashMsg}</p>}
            {!flashing && !flashOk && flashMsg && (
              <p className="text-red-400 text-sm mt-2">{flashMsg}</p>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="mt-4 text-center">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-2xl font-bold mb-2">All Done!</h2>
            <div className="bg-slate-700 rounded-xl p-4 text-sm text-slate-300 text-left space-y-1 mb-6">
              <p>✅ Unplug USB cable</p>
              <p>✅ Power ESP32 externally</p>
              <p>✅ It connects to WiFi + this server automatically</p>
            </div>
            <button onClick={() => navigate('/dashboard')}
              className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-xl font-semibold text-lg transition">
              Open Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
