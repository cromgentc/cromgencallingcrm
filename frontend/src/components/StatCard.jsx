const toneClasses = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  sky: 'bg-sky-50 text-sky-700 ring-sky-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  violet: 'bg-violet-50 text-violet-700 ring-violet-100',
}

export default function StatCard({ onSelect, stat }) {
  const content = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-slate-500">{stat.label}</p>
        <p className="mt-2 text-3xl font-bold text-slate-950">{stat.value}</p>
      </div>
      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${toneClasses[stat.tone]}`}>
        {stat.change}
      </span>
    </div>
  )

  if (stat.view) {
    return (
      <button type="button" onClick={() => onSelect?.(stat)} className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
        {content}
      </button>
    )
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      {content}
    </article>
  )
}
