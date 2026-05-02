import { formatRole } from '../utils/roles'

export default function TeamDirectory({ filter = 'all', members = [], onMemberSelect }) {
  const visible = filter === 'all' ? members : members.filter((member) => member.role === filter)

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-bold text-slate-950">Team Directory</h2>
      <p className="text-sm text-slate-500">Registered manager, team leader aur calling staff details.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((member) => (
          <button key={member.id} type="button" onClick={() => onMemberSelect?.(member)} className="rounded-lg border border-slate-200 p-3 text-left transition hover:border-teal-300 hover:bg-teal-50/40">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-slate-950">{member.name}</p>
                <p className="text-sm text-slate-500">{formatRole(member.role)}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${member.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {member.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="mt-3 space-y-1 text-sm text-slate-600">
              {member.staffId ? <p>{member.staffId}</p> : null}
              {member.email ? <p className="break-all">{member.email}</p> : null}
              {member.phone ? <p>{member.phone}</p> : null}
              {member.team ? <p>Team: {member.team}</p> : null}
            </div>
          </button>
        ))}
        {!visible.length ? <p className="text-sm text-slate-500">No records found.</p> : null}
      </div>
    </section>
  )
}
