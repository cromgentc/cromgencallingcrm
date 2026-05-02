const statusLabels = {
  ready: 'Ready',
  not_ready: 'Not Ready',
  on_call: 'On Call',
  outcall: 'Outcall',
}

export default function StaffCallSummary({ items = [], onStaffSelect }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-bold text-slate-950">Calling Staff Details</h2>
      <p className="text-sm text-slate-500">Staff-wise total calls, leads, and live status.</p>
      <div className="mt-4 divide-y divide-slate-100">
        {items.map((staff) => (
          <button key={staff.id} type="button" onClick={() => onStaffSelect?.(staff)} className="grid w-full gap-3 py-3 text-left text-sm transition hover:bg-slate-50 lg:grid-cols-[1fr_0.7fr_0.7fr_0.7fr_0.7fr_0.8fr] lg:items-center">
            <div>
              <p className="font-bold text-slate-950">{staff.name}</p>
              <p className="text-slate-500">{staff.staffId} {staff.team ? `- ${staff.team}` : ''}</p>
            </div>
            <p><span className="font-bold text-slate-950">{staff.totalCalls}</span> calls</p>
            <p><span className="font-bold text-emerald-700">{staff.interested}</span> interested</p>
            <p><span className="font-bold text-rose-700">{staff.hotLead}</span> hot lead</p>
            <p><span className="font-bold text-sky-700">{staff.callback}</span> callback</p>
            <span className="w-max rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
              {statusLabels[staff.status] || 'Not Ready'}
            </span>
          </button>
        ))}
        {!items.length ? (
          <div className="py-6">
            <div className="mx-auto w-full max-w-xl rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-lg bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                  <span aria-hidden="true">👥</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800">No staff activity yet</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">This will update when Ready/on_call/outcall data syncs.</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
