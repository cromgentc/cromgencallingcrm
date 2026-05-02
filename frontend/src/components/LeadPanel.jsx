export default function LeadPanel({ leads }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-bold text-slate-950">Lead Buckets</h2>
      <div className="mt-4 space-y-4">
        {leads.map((lead) => (
          <div key={lead.name}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-800">{lead.name}</span>
              <span className="font-bold text-slate-950">{lead.count}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-teal-500" style={{ width: `${lead.progress}%` }} />
            </div>
          </div>
        ))}
        {!leads.length ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                <span aria-hidden="true">📥</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800">No lead buckets yet</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">Lead buckets will be generated automatically when calling outcomes sync.</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
