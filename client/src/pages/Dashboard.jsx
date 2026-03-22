import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import socket from '../socket'
import { TopNav, Footer } from '../components/Layout'

// ── State metadata ──────────────────────────────────────────────
const STATE_META = {
  IDLE: { label: 'Room Available', subLabel: 'No meeting detected', icon: 'meeting_room', ringColor: 'border-white/20' },
  ACTIVE_MEETING: { label: 'Deep Work', subLabel: 'Active Now', icon: 'meeting_room', ringColor: 'border-white/40' },
  INTERRUPTED: { label: 'Interrupted', subLabel: 'Mic muted', icon: 'do_not_disturb', ringColor: 'border-error/40' },
  EMERGENCY_PENDING: { label: 'Emergency Pending', subLabel: 'Awaiting response', icon: 'emergency', ringColor: 'border-error/80' },
}

// ── Emergency Banner ────────────────────────────────────────────
function EmergencyBanner({ onWait, onDnd, onComing }) {
  return (
    <section className="mb-12">
      <div className="relative overflow-hidden rounded-xl bg-error-container/20 p-6 flex flex-col md:flex-row items-center justify-between gap-6 outline outline-1 outline-error/20">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-error text-on-error">
            <span className="material-symbols-filled text-xl">emergency</span>
          </div>
          <div>
            <h4 className="text-error font-bold tracking-tight">Emergency Pending</h4>
            <p className="text-on-error-container text-sm opacity-80">Someone needs your attention. Choose your response:</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onWait}
            className="px-5 py-2 rounded-full bg-error text-on-error text-sm font-bold active:scale-[0.98] transition-transform"
          >
            Please Wait
          </button>
          <button
            onClick={onComing}
            className="px-5 py-2 rounded-full liquid-glass text-white text-sm font-bold active:scale-[0.98] transition-transform border-t border-white/20"
          >
            Coming Soon
          </button>
          <button
            onClick={onDnd}
            className="px-5 py-2 rounded-full liquid-glass text-white text-sm font-bold active:scale-[0.98] transition-transform border-t border-white/20"
          >
            Do Not Disturb
          </button>
        </div>
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-error/10 blur-[80px] pointer-events-none" />
      </div>
    </section>
  )
}

// ── Audio wave bars (decorative) ────────────────────────────────
function AudioWave({ muted }) {
  const heights = muted
    ? ['h-1', 'h-1', 'h-1', 'h-1', 'h-1', 'h-1', 'h-1']
    : ['h-1/4', 'h-2/4', 'h-3/4', 'h-full', 'h-2/4', 'h-1/4', 'h-2/4']
  const opacities = muted
    ? ['opacity-10', 'opacity-10', 'opacity-10', 'opacity-10', 'opacity-10', 'opacity-10', 'opacity-10']
    : ['opacity-10', 'opacity-20', 'opacity-40', 'opacity-100', 'opacity-60', 'opacity-30', 'opacity-10']
  return (
    <div className="flex items-end gap-1 h-16 mt-8">
      {heights.map((h, i) => (
        <div key={i} className={`flex-1 bg-white rounded-full transition-all duration-700 ${h} ${opacities[i]}`} />
      ))}
    </div>
  )
}

// ── Dashboard page ──────────────────────────────────────────────
export default function Dashboard() {
  const [status, setStatus] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/status').then(r => r.json()).then(setStatus)
    socket.on('state_update', setStatus)
    return () => socket.off('state_update')
  }, [])

  const respond = (action) =>
    fetch('/api/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    })

  if (!status) return (
    <div className="flex items-center justify-center h-screen bg-surface text-on-surface">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <span className="text-on-surface-variant text-sm uppercase tracking-widest">Connecting</span>
      </div>
    </div>
  )

  const meta = STATE_META[status.state] || STATE_META.IDLE
  const isEmergency = status.state === 'EMERGENCY_PENDING'

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TopNav activePage="Focus" />

      <main className="flex-grow pt-32 pb-20 px-6 md:px-12 max-w-[1440px] mx-auto w-full">

        {/* Emergency banner */}
        {isEmergency && (
          <EmergencyBanner
            onWait={() => respond('WAIT')}
            onDnd={() => respond('DO_NOT_DISTURB')}
            onComing={() => respond('COMING')}
          />
        )}

        {/* ── Status Hero ── */}
        <section className="mb-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 flex flex-col items-start space-y-8">
            <div className="space-y-2">
              <span className="text-[0.6875rem] uppercase tracking-[0.15em] font-medium text-secondary">
                Current State
              </span>
              <h1 className="text-[3.5rem] font-black tracking-[-0.04em] text-white leading-[1.1]">
                {meta.label} <br />
                <span className="text-outline-variant">{meta.subLabel}</span>
              </h1>
            </div>
            <p className="text-on-surface-variant text-lg max-w-md leading-relaxed">
              {status.state === 'ACTIVE_MEETING'
                ? 'The concierge is filtering all environmental noise. Your focus session is active.'
                : status.state === 'INTERRUPTED'
                  ? 'A door interaction was detected. Your microphone has been muted for privacy.'
                  : status.state === 'EMERGENCY_PENDING'
                    ? 'An emergency request is pending. Please respond using the options above.'
                    : 'No meeting detected. The room is available.'}
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/setup')}
                className="flex items-center gap-2 rounded-full liquid-glass text-white px-8 py-4 font-bold border-t border-white/20 active:scale-[0.95] transition-transform"
              >
                <span className="material-symbols-outlined">tune</span>
                Setup
              </button>
            </div>
          </div>

          {/* Status ring */}
          <div className="lg:col-span-5 flex justify-center items-center relative">
            <div className="w-80 h-80 rounded-full bg-surface-container-low flex items-center justify-center relative shadow-[0px_48px_96px_rgba(0,0,0,0.6)]">
              <div className={`absolute inset-0 rounded-full border-4 border-white/5 ${isEmergency ? 'border-t-error' : 'border-t-white'} animate-[spin_8s_linear_infinite]`} />
              <div className="absolute inset-6 rounded-full border border-white/10" />
              <div className="text-center z-10">
                <span
                  className="material-symbols-filled text-white block mb-2"
                  style={{ fontSize: '64px', fontVariationSettings: "'FILL' 1" }}
                >
                  {meta.icon}
                </span>
                <div className="text-white font-bold tracking-widest uppercase text-xs">
                  {meta.label}
                </div>
              </div>
              <div className="absolute -inset-10 glass-glow pointer-events-none" />
            </div>
          </div>
        </section>

        {/* ── Bento Grid Stats ── */}
        <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">

          {/* Microphone card */}
          <div className="md:col-span-2 lg:col-span-2 bg-surface-container-low rounded-xl p-8 flex flex-col justify-between group hover:bg-surface-container transition-colors duration-500 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[0.6875rem] uppercase tracking-widest text-secondary block mb-1">Atmosphere</span>
                <h3 className="text-2xl font-bold text-white tracking-tight">Audio Intake</h3>
              </div>
              <div className="w-10 h-10 rounded-full liquid-glass flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-xl">
                  {status.mic_muted ? 'mic_off' : 'mic'}
                </span>
              </div>
            </div>
            <AudioWave muted={status.mic_muted} />
            <div className="mt-8 flex justify-between items-end">
              <p className="text-xs text-on-surface-variant font-medium">
                {status.mic_muted ? 'Muted for privacy' : 'Active — listening'}
              </p>
              <span className={`text-xs uppercase tracking-widest font-bold ${status.mic_muted ? 'text-error' : 'text-white'}`}>
                {status.mic_muted ? 'Muted' : 'Live'}
              </span>
            </div>
          </div>

          {/* Last Response card */}
          <div className="bg-surface-container-high/40 backdrop-blur-3xl rounded-xl p-8 flex flex-col justify-between border-t border-white/5">
            <div className="flex flex-col gap-4">
              <span className="material-symbols-outlined text-white opacity-50">chat_bubble</span>
              <h3 className="text-sm font-bold text-secondary uppercase tracking-widest">Last Response</h3>
            </div>
            <div>
              <p className="text-white font-medium italic mb-2">
                {status.last_response ? `"${status.last_response}"` : '—'}
              </p>
              <span className="text-[0.625rem] text-outline-variant font-bold uppercase tracking-wider">
                {status.last_response ? 'From this session' : 'No response yet'}
              </span>
            </div>
          </div>

          {/* Door / State card */}
          <div className="bg-surface-container-lowest rounded-xl p-8 border border-white/5 flex flex-col justify-between group cursor-pointer hover:border-white/20 transition-all">
            <div className="flex justify-between items-start">
              <span className="material-symbols-outlined text-white">sensor_door</span>
              <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_white] ${status.state === 'ACTIVE_MEETING' ? 'bg-white' : 'bg-white/20'
                }`} />
            </div>
            <div>
              <h3 className="text-white font-bold mb-1">
                {status.state === 'ACTIVE_MEETING' ? 'Session Active' : 'Room Open'}
              </h3>
              <p className="text-xs text-secondary">
                {status.state === 'INTERRUPTED' ? 'Door interaction detected' : 'Monitoring for activity'}
              </p>
            </div>
          </div>

          {/* Reconfigure link */}
          <div
            className="md:col-span-2 lg:col-span-3 bg-gradient-to-br from-surface-container-high to-surface-container-low rounded-xl p-8 flex items-center justify-between group cursor-pointer"
            onClick={() => navigate('/setup')}
          >
            <div className="flex items-center gap-6">
              <div className="text-4xl font-black text-white/10 group-hover:text-white/20 transition-colors">ESP32</div>
              <div>
                <h4 className="text-white font-bold">Configure Device</h4>
                <p className="text-sm text-secondary">Reprovision your ESP32 device.</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-white transition-transform group-hover:translate-x-2">arrow_forward</span>
          </div>
        </section>
      </main>

      <Footer systemStatus={status.state === 'ACTIVE_MEETING' ? 'Focus Active' : 'Optimal'} />

      {/* FAB */}
      <div className="fixed bottom-10 right-10 z-50">
        <button
          onClick={() => navigate('/setup')}
          className="w-16 h-16 rounded-full bg-white text-black shadow-[0_24px_48px_rgba(0,0,0,0.6)] flex items-center justify-center group active:scale-90 transition-transform"
        >
          <span className="material-symbols-filled group-hover:scale-110 transition-transform">settings</span>
        </button>
      </div>
    </div>
  )
}
