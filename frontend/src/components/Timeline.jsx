export default function Timeline({ items }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-bold text-slate-950">Calling Tracking Timeline</h2>
      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <div key={`${item.time}-${item.title}`} className="flex gap-3">
            <div className="mt-1 size-3 shrink-0 rounded-full bg-teal-500 ring-4 ring-teal-50" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{item.time}</p>
              <p className="mt-1 font-semibold text-slate-950">{item.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
            </div>
          </div>
        ))}
        {!items.length ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                <span aria-hidden="true">⏱️</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800">No timeline events yet</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">Activity logs will appear here after calls or activities are available.</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
