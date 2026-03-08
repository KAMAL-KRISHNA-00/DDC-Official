export default function StatusCard({ label, value, ok }) {
  return (
    <div className={`bg-slate-800 rounded-xl p-4 border
      ${ok ? 'border-slate-700' : 'border-red-800'}`}>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`font-semibold text-sm ${ok ? 'text-white' : 'text-red-400'}`}>
        {value}
      </p>
    </div>
  )
}
