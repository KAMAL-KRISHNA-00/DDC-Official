export default function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center justify-between mb-5">
      {steps.map((label, i) => (
        <div key={i} className="flex flex-col items-center flex-1">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1
            ${i < current  ? 'bg-green-600 text-white'   : ''}
            ${i === current ? 'bg-blue-600 text-white ring-2 ring-blue-400' : ''}
            ${i > current  ? 'bg-slate-600 text-slate-400' : ''}`}>
            {i < current ? '✓' : i + 1}
          </div>
          <span className={`text-xs hidden sm:block
            ${i === current ? 'text-white' : 'text-slate-500'}`}>
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}
