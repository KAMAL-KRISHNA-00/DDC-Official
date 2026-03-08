import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import socket from '../socket'
import StatusCard      from '../components/StatusCard'
import EmergencyBanner from '../components/EmergencyBanner'

const STATE_META = {
  IDLE:              { label: 'Room Available',      color: 'slate',  icon: '⚫', ring: 'ring-slate-500'  },
  ACTIVE_MEETING:    { label: 'Meeting in Progress', color: 'green',  icon: '🟢', ring: 'ring-green-500'  },
  INTERRUPTED:       { label: 'Interrupted',          color: 'yellow', icon: '🟡', ring: 'ring-yellow-500' },
  EMERGENCY_PENDING: { label: 'Emergency Pending',    color: 'red',    icon: '🔴', ring: 'ring-red-500'    },
}

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
    <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
      Connecting...
    </div>
  )

  const meta = STATE_META[status.state] || STATE_META.IDLE

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Deep Work Concierge</h1>
          <button onClick={() => navigate('/setup')}
            className="text-sm text-slate-400 hover:text-white transition">
            ⚙ Setup
          </button>
        </div>

        {/* State hero */}
        <div className={`bg-slate-800 rounded-2xl p-8 text-center mb-5 ring-2 ${meta.ring} transition-all duration-500`}>
          <div className="text-6xl mb-3">{meta.icon}</div>
          <h2 className="text-3xl font-bold">{meta.label}</h2>
          <p className="text-slate-400 mt-1 font-mono text-sm">{status.state}</p>
        </div>

        {/* Emergency */}
        {status.state === 'EMERGENCY_PENDING' && (
          <EmergencyBanner
            onWait={() => respond('WAIT')}
            onDnd={() => respond('DO_NOT_DISTURB')}
          />
        )}

        {/* Status grid */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <StatusCard label="Microphone"
            value={status.mic_muted ? '🔇 Muted' : '🎙️ Active'}
            ok={!status.mic_muted} />
          <StatusCard label="Last Response"
            value={status.last_response || '—'}
            ok={!!status.last_response} />
        </div>

        {/* Reconfigure button */}
        <button onClick={() => navigate('/setup')}
          className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-medium transition">
          🔧 Reconfigure ESP32
        </button>
      </div>
    </div>
  )
}
