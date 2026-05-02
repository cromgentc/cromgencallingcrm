const queueStats = [
  { key: 'pending', label: 'Pending Calls' },
  { key: 'completed', label: 'Completed Calls' },
  { key: 'liveTalk', label: 'Live Talk' },
]

export default function PendingCallsView({ customers = [], summary = {} }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-bold text-slate-950">Pending Calls</h2>
        <p className="text-sm text-slate-500">
          Pending customer calls, completed calls, and live talk counts are shown here.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {queueStats.map((stat) => (
          <div key={stat.key} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{summary[stat.key] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <h3 className="font-bold text-slate-950">Pending Call Table</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Added Time</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-950">{customer.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{customer.phone}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {customer.createdAt ? new Date(customer.createdAt).toLocaleString() : '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">Pending</span>
                  </td>
                </tr>
              ))}
              {!customers.length ? (
                <tr>
                  <td className="px-4 py-4" colSpan="4">
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6">
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 place-items-center rounded-lg bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                          <span aria-hidden="true">⏳</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800">Queue is empty</p>
                          <p className="mt-1 text-sm font-semibold text-slate-500">This table will fill automatically when new pending customers sync.</p>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
