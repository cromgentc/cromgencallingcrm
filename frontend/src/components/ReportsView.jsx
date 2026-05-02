export default function ReportsView({ reports }) {
  const totals = reports?.totals || []
  const sentiment = reports?.sentiment || {}
  const recentCalls = reports?.recentCalls || []

  return (
    <div className="space-y-4">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {totals.map((item) => (
          <article key={item.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-bold text-slate-950">Sentiment Report</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(sentiment).map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-sm font-semibold text-slate-700">{label}</span>
                <span className="font-bold text-slate-950">{value}</span>
              </div>
            ))}
            {!Object.keys(sentiment).length ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6">
                <div className="text-sm font-bold text-slate-800">No sentiment report yet</div>
                <div className="mt-1 text-sm font-semibold text-slate-500">Sentiment metrics will appear here after calls/tags sync.</div>
              </div>
            ) : null}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-bold text-slate-950">Recent Calls</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {recentCalls.map((call) => (
              <div key={call.id} className="grid gap-2 py-3 text-sm md:grid-cols-4">
                <span className="font-bold text-slate-950">{call.customer}</span>
                <span className="text-slate-600">{call.agent}</span>
                <span className="text-slate-600">{call.stage}</span>
                <span className="font-semibold text-slate-800">{call.sentiment}</span>
              </div>
            ))}
            {!recentCalls.length ? (
              <div className="py-6">
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6">
                  <div className="text-sm font-bold text-slate-800">No recent calls</div>
                  <div className="mt-1 text-sm font-semibold text-slate-500">This list will populate after the latest call outcomes sync.</div>
                </div>
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </div>
  )
}
