import CallTable from './CallTable'

export default function StaffDetailPage({ calls = [], onBack, staff }) {
  const staffCalls = calls.filter((call) => call.agent === staff?.name)

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
        Back
      </button>
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-bold text-slate-950">{staff?.name}</h2>
        <p className="text-sm text-slate-500">{staff?.staffId || staff?.email} {staff?.team ? `- ${staff.team}` : ''}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-sm text-slate-500">Total Calls</p><p className="text-2xl font-bold text-slate-950">{staffCalls.length}</p></div>
          <div className="rounded-lg bg-emerald-50 p-3"><p className="text-sm text-emerald-700">Interested</p><p className="text-2xl font-bold text-emerald-800">{staffCalls.filter((call) => call.sentiment === 'Interested').length}</p></div>
          <div className="rounded-lg bg-rose-50 p-3"><p className="text-sm text-rose-700">Hot Lead</p><p className="text-2xl font-bold text-rose-800">{staffCalls.filter((call) => call.sentiment === 'Hot Lead').length}</p></div>
          <div className="rounded-lg bg-sky-50 p-3"><p className="text-sm text-sky-700">Callback</p><p className="text-2xl font-bold text-sky-800">{staffCalls.filter((call) => call.sentiment === 'Callback').length}</p></div>
        </div>
      </section>
      <CallTable calls={staffCalls} enableTagging={false} />
    </div>
  )
}
