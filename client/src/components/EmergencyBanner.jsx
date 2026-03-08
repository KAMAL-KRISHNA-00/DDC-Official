export default function EmergencyBanner({ onWait, onDnd }) {
  return (
    <div className="bg-red-900/50 border border-red-600 rounded-2xl p-5 mb-5">
      <h3 className="font-bold text-lg text-red-300 mb-1">🚨 Someone is at your door</h3>
      <p className="text-sm text-red-200 mb-4">Send a response to the display outside:</p>
      <div className="flex gap-3">
        <button onClick={onWait}
          className="flex-1 py-3 bg-yellow-600 hover:bg-yellow-500 rounded-xl font-bold transition">
          ⏳ WAIT
        </button>
        <button onClick={onDnd}
          className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold transition">
          🚫 DO NOT DISTURB
        </button>
      </div>
    </div>
  )
}
