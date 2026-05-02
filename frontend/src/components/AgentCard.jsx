const statusStyle = {
  'On Call': 'bg-emerald-50 text-emerald-700',
  Available: 'bg-sky-50 text-sky-700',
  'Wrap Up': 'bg-amber-50 text-amber-700',
}

export default function AgentCard({ agent }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-slate-900 text-sm font-bold text-white">
          {agent.avatar}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-950">{agent.name}</h3>
              <p className="text-sm text-slate-500">{agent.role}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[agent.status]}`}>
              {agent.status}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="font-bold text-slate-950">{agent.calls}</p>
              <p className="text-slate-500">Calls</p>
            </div>
            <div>
              <p className="font-bold text-slate-950">{agent.conversion}%</p>
              <p className="text-slate-500">Close</p>
            </div>
            <div>
              <p className="truncate font-bold text-slate-950">{agent.location}</p>
              <p className="text-slate-500">Desk</p>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
