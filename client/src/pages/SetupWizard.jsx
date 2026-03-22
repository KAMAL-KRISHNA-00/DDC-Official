import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopNav, Footer } from '../components/Layout'

const STEPS = [
  { label: 'Introduction', icon: 'waving_hand' },
  { label: 'Network Config', icon: 'wifi' },
  { label: 'Port Selection', icon: 'usb' },
  { label: 'Deployment', icon: 'bolt' },
  { label: 'Done', icon: 'check_circle' },
]

// ── Step indicator sidebar ──────────────────────────────────────
function StepSidebar({ current }) {
  return (
    <div className="md:col-span-4 space-y-12">
      <div className="space-y-2">
        <h2 className="text-[0.6875rem] uppercase tracking-[0.1em] font-medium text-secondary">Current Stage</h2>
        <h1 className="text-3xl font-headline font-bold tracking-tight text-white">ESP32 Integration</h1>
      </div>

      <div className="space-y-8 relative">
        {/* Progress line */}
        <div className="absolute left-3 top-2 bottom-2 w-[1px] bg-outline-variant/30" />
        {STEPS.map((s, i) => (
          <div
            key={i}
            className={`relative pl-10 flex items-center gap-4 transition-opacity duration-300 ${i <= current ? 'opacity-100' : 'opacity-30'}`}
          >
            <div className={`absolute left-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors duration-300 ${i < current ? 'bg-white text-surface'
                : i === current ? 'bg-white text-surface'
                  : 'bg-surface-container-highest text-on-surface'
              }`}>
              {i < current
                ? <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>
                : i + 1}
            </div>
            <span className="text-sm font-medium tracking-tight">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="p-6 bg-surface-container-low rounded-xl border-l-2 border-primary/20">
        <p className="text-[0.875rem] leading-[1.6] text-on-surface-variant italic">
          "The quality of your work is directly proportional to the depth of your focus."
        </p>
      </div>
    </div>
  )
}

// ── Main wizard component ───────────────────────────────────────
export default function SetupWizard() {
  const [step, setStep] = useState(0)
  const [wifiInfo, setWifi] = useState({ ssid: '', ip: '' })
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [ports, setPorts] = useState([])
  const [autoPort, setAutoPort] = useState('')
  const [selPort, setSelPort] = useState('')
  const [flashing, setFlashing] = useState(false)
  const [flashMsg, setFlashMsg] = useState('')
  const [flashOk, setFlashOk] = useState(false)
  const [error, setError] = useState('')
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
  const prev = () => { setError(''); setStep(s => Math.max(0, s - 1)) }

  const validateNetwork = () => {
    if (!password) { setError('Enter your WiFi password.'); return }
    if (!wifiInfo.ssid) { setError('WiFi not detected. Check your connection.'); return }
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
      body: JSON.stringify({ port: selPort, ssid: wifiInfo.ssid, password, server_ip: wifiInfo.ip, server_port: 8080 })
    })
    const data = await res.json()
    setFlashing(false)
    if (data.success) {
      setFlashOk(true)
      setFlashMsg('ESP32 configured successfully!')
      setTimeout(() => next(), 1200)
    } else {
      setFlashMsg(data.message)
    }
  }

  const rescanPorts = () =>
    fetch('/api/ports').then(r => r.json()).then(d => {
      setPorts(d.ports || [])
      setAutoPort(d.auto || '')
      setSelPort(d.auto || '')
    })

  // Common input style
  const inputClass = "w-full bg-transparent border-none border-b border-outline-variant/30 py-4 text-white placeholder:text-outline-variant/50 focus:outline-none focus:border-primary transition-all duration-300 text-sm"

  return (
    <div className="bg-surface text-on-surface font-body flex flex-col min-h-screen">
      <TopNav activePage="Integration" />

      <main className="flex-grow flex items-center justify-center px-6 pt-32 pb-20">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-12 items-start">

          {/* Left sidebar — step indicators */}
          <StepSidebar current={step} />

          {/* Right panel — step content */}
          <div className="md:col-span-8">
            <div className="liquid-glass rounded-xl p-8 md:p-12 ghost-shadow">
              <div className="space-y-10">

                {/* Step 0: Welcome */}
                {step === 0 && (
                  <div className="space-y-8 text-center">
                    <div>
                      <span className="material-symbols-outlined text-white/40 block mx-auto mb-6" style={{ fontSize: '80px' }}>developer_board</span>
                      <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Welcome</h2>
                      <p className="text-on-surface-variant text-[0.875rem] leading-[1.6] max-w-md mx-auto">
                        Connect your ESP32 to this PC's WiFi and server. The process takes about 2 minutes.
                      </p>
                    </div>
                    <button
                      onClick={next}
                      className="bg-primary/10 backdrop-blur-xl text-white px-8 py-4 rounded-full font-bold text-[0.875rem] tracking-tight hover:bg-primary/20 active:scale-[0.98] transition-all duration-300 border-t border-white/20 shadow-xl flex items-center gap-3 mx-auto"
                    >
                      Begin Setup
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
                    </button>
                  </div>
                )}

                {/* Step 1: Network */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1 tracking-tight">Network Configuration</h2>
                      <p className="text-on-surface-variant text-sm">Your ESP32 will connect to this network.</p>
                    </div>

                    {/* Detected network info */}
                    <div className="space-y-3">
                      <div className="group flex items-center justify-between p-5 bg-white/5 rounded-lg border-t border-white/5">
                        <div className="flex items-center gap-4">
                          <span className="material-symbols-outlined text-primary/60">wifi</span>
                          <div>
                            <p className="text-sm font-bold text-white tracking-tight">{wifiInfo.ssid || 'Detecting...'}</p>
                            <p className="text-[0.6875rem] uppercase text-on-surface-variant tracking-wider">Active Network</p>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-primary/40">lock</span>
                      </div>
                      <div className="group flex items-center justify-between p-5 bg-white/5 rounded-lg border-t border-white/5">
                        <div className="flex items-center gap-4">
                          <span className="material-symbols-outlined text-primary/60">dns</span>
                          <div>
                            <p className="text-sm font-bold text-white tracking-tight font-mono">{wifiInfo.ip || '...'} : 8080</p>
                            <p className="text-[0.6875rem] uppercase text-on-surface-variant tracking-wider">Server Address</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Password field */}
                    <div className="pt-4 border-t border-white/5 space-y-6">
                      <div className="relative group">
                        <label className="text-[0.6875rem] uppercase tracking-[0.1em] font-medium text-secondary mb-2 block transition-all group-focus-within:translate-x-1">
                          Network Credentials
                        </label>
                        <div className="relative">
                          <input
                            type={showPw ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className={inputClass + ' pr-16'}
                            placeholder="Enter network passphrase"
                          />
                          <button
                            onClick={() => setShowPw(v => !v)}
                            className="absolute right-0 top-4 text-on-surface-variant text-xs uppercase tracking-wider hover:text-white transition-colors"
                          >
                            {showPw ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {error && <p className="text-error text-sm">{error}</p>}
                  </div>
                )}

                {/* Step 2: Port selection */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1 tracking-tight">Hardware Port</h2>
                      <p className="text-on-surface-variant text-sm">Plug in your ESP32 via USB, then select the port.</p>
                    </div>

                    {/* Detection status */}
                    <div className={`flex items-center gap-3 p-4 rounded-lg border-t ${autoPort ? 'bg-white/5 border-white/10' : 'bg-error-container/10 border-error/20'
                      }`}>
                      <span className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${autoPort ? 'bg-emerald-400 shadow-emerald-400/50' : 'bg-error shadow-error/50'}`} />
                      <span className="text-sm text-on-surface-variant">
                        {autoPort ? `Auto-detected: ${autoPort}` : 'Not auto-detected — select manually below'}
                      </span>
                      <button onClick={rescanPorts} className="ml-auto text-xs text-secondary hover:text-white transition-colors flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>refresh</span>
                        Rescan
                      </button>
                    </div>

                    {/* Port list */}
                    <div className="space-y-2">
                      {ports.length === 0 && (
                        <p className="text-on-surface-variant text-sm text-center py-4">No ports found. Connect your ESP32 and rescan.</p>
                      )}
                      {ports.map(p => (
                        <div
                          key={p.device}
                          onClick={() => setSelPort(p.device)}
                          className={`group flex items-center justify-between p-5 rounded-lg border-t cursor-pointer transition-all duration-300 ${selPort === p.device
                              ? 'bg-white/10 border-white/20'
                              : 'bg-white/5 border-white/5 hover:bg-white/10'
                            }`}
                        >
                          <div className="flex items-center gap-4">
                            <span className="material-symbols-outlined text-primary/60">usb</span>
                            <div>
                              <p className="text-sm font-bold text-white tracking-tight font-mono">{p.device}</p>
                              <p className="text-[0.6875rem] uppercase text-on-surface-variant tracking-wider">{p.description}</p>
                            </div>
                          </div>
                          {selPort === p.device && (
                            <span className="material-symbols-outlined text-white" style={{ fontSize: '18px' }}>check_circle</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {error && <p className="text-error text-sm">{error}</p>}
                  </div>
                )}

                {/* Step 3: Flash */}
                {step === 3 && (
                  <div className="space-y-8 text-center">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1 tracking-tight">Initialize Flash</h2>
                      <p className="text-on-surface-variant text-sm">Keep USB plugged in during this process.</p>
                    </div>

                    {!flashing && !flashOk && !flashMsg && (
                      <button
                        onClick={doFlash}
                        className="bg-primary/10 backdrop-blur-xl text-white px-8 py-4 rounded-full font-bold text-[0.875rem] tracking-tight hover:bg-primary/20 active:scale-[0.98] transition-all duration-300 border-t border-white/20 shadow-xl flex items-center gap-3 mx-auto"
                      >
                        Send Credentials
                        <span className="material-symbols-filled" style={{ fontSize: '18px' }}>bolt</span>
                      </button>
                    )}
                    {flashing && (
                      <div className="space-y-4">
                        <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                        <p className="text-on-surface-variant text-sm">{flashMsg}</p>
                      </div>
                    )}
                    {flashOk && (
                      <div className="flex items-center justify-center gap-2 text-white">
                        <span className="material-symbols-outlined text-white">check_circle</span>
                        <p className="font-semibold">{flashMsg}</p>
                      </div>
                    )}
                    {!flashing && !flashOk && flashMsg && (
                      <p className="text-error text-sm">{flashMsg}</p>
                    )}
                  </div>
                )}

                {/* Step 4: Done */}
                {step === 4 && (
                  <div className="space-y-8 text-center">
                    <div>
                      <span className="material-symbols-outlined text-white block mx-auto mb-4" style={{ fontSize: '72px' }}>celebration</span>
                      <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">All Done!</h2>
                    </div>
                    <div className="text-left p-6 bg-surface-container-low rounded-xl border-l-2 border-primary/20 space-y-3">
                      {['Unplug USB cable', 'Power ESP32 externally', 'It connects to WiFi + this server automatically'].map((s, i) => (
                        <div key={i} className="flex items-center gap-3 text-on-surface-variant text-sm">
                          <span className="material-symbols-outlined text-white/60" style={{ fontSize: '16px' }}>check</span>
                          {s}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="bg-white text-surface px-10 py-4 rounded-full font-bold text-[0.875rem] tracking-tight hover:bg-white/90 active:scale-[0.98] transition-all duration-300 shadow-xl flex items-center gap-3 mx-auto"
                    >
                      Open Dashboard
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
                    </button>
                  </div>
                )}

                {/* Action row */}
                {step < 4 && (
                  <div className="flex items-center justify-between pt-8 border-t border-white/5">
                    {step > 0 ? (
                      <button
                        onClick={prev}
                        className="flex items-center gap-2 text-secondary hover:text-white transition-colors text-[0.875rem] font-bold"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
                        Previous Stage
                      </button>
                    ) : <div />}

                    {step === 0 && null}
                    {step === 1 && (
                      <button
                        onClick={validateNetwork}
                        className="bg-primary/10 backdrop-blur-xl text-white px-8 py-4 rounded-full font-bold text-[0.875rem] tracking-tight hover:bg-primary/20 active:scale-[0.98] transition-all duration-300 border-t border-white/20 shadow-xl flex items-center gap-3"
                      >
                        Next Stage
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
                      </button>
                    )}
                    {step === 2 && (
                      <button
                        onClick={validatePort}
                        className="bg-primary/10 backdrop-blur-xl text-white px-8 py-4 rounded-full font-bold text-[0.875rem] tracking-tight hover:bg-primary/20 active:scale-[0.98] transition-all duration-300 border-t border-white/20 shadow-xl flex items-center gap-3"
                      >
                        Next Stage
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Status metadata */}
            <div className="mt-8 flex justify-center gap-8 text-[0.6875rem] uppercase tracking-widest text-outline-variant font-medium">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                Hardware Detected
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/20" />
                v2.4.0 Firmware
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
