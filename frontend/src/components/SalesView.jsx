import { BriefcaseBusiness, FileText, Megaphone, TrendingUp, UserRound, Users } from 'lucide-react'

function safeNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function callToSalesLead(call) {
  return {
    id: `call-${call.id}`,
    leadName: call.customer || call.customerName || 'Unknown Lead',
    phone: call.phone || '',
    owner: call.agent || 'Unassigned',
    status: call.sentiment || 'Interested',
    stage: call.stage || '',
    duration: call.duration || '',
    createdAt: call.completedAt || call.createdAt || '',
  }
}

function statusTone(status) {
  const map = {
    'Hot Lead': 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
    Interested: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
    Callback: 'bg-sky-50 text-sky-700 ring-1 ring-sky-100',
    'No Response': 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
    'Call Disconnected': 'bg-orange-50 text-orange-700 ring-orange-100 ring-1',
    'Call Handling': 'bg-violet-50 text-violet-700 ring-violet-100 ring-1',
    Neutral: 'bg-slate-100 text-slate-700 ring-slate-100 ring-1',
    'Not Interested': 'bg-slate-100 text-slate-700 ring-slate-100 ring-1',
  }
  return map[status] || 'bg-slate-100 text-slate-700 ring-slate-100 ring-1'
}

function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item)
    acc[key] = acc[key] || []
    acc[key].push(item)
    return acc
  }, {})
}

const salesPages = {
  'sales-leads': {
    title: 'Leads',
    description: 'New prospects, source tracking, and follow-up ownership (calls-based).',
    icon: UserRound,
    accent: 'teal',
  },
  'sales-contacts': {
    title: 'Contacts',
    description: 'Customer people, phone numbers, and relationship notes (calls-based).',
    icon: Users,
    accent: 'sky',
  },
  'sales-accounts': {
    title: 'Accounts',
    description: 'Company records, account owners, and deal history (customer-based).',
    icon: BriefcaseBusiness,
    accent: 'violet',
  },
  'sales-deals': {
    title: 'Deals',
    description: 'Pipeline opportunities, value, and stage signals (sentiment-based).',
    icon: TrendingUp,
    accent: 'amber',
  },
  'sales-forecasts': {
    title: 'Forecasts',
    description: 'Expected outcomes based on recent calling signals (calls-based).',
    icon: TrendingUp,
    accent: 'emerald',
  },
  'sales-documents': {
    title: 'Documents',
    description: 'Quotes, proposals, and customer files (coming next — preview uses call history).',
    icon: FileText,
    accent: 'rose',
  },
  'sales-campaigns': {
    title: 'Campaigns',
    description: 'Marketing campaigns and outreach performance (preview uses call history).',
    icon: Megaphone,
    accent: 'violet',
  },
}

function AccentGlow({ accent }) {
  const background =
    accent === 'emerald'
      ? 'radial-gradient(600px 200px at 20% 0%, rgba(16, 185, 129, 0.18), transparent 50%), radial-gradient(600px 260px at 90% 10%, rgba(34, 197, 94, 0.14), transparent 55%)'
      : accent === 'rose'
        ? 'radial-gradient(600px 200px at 20% 0%, rgba(244, 63, 94, 0.14), transparent 50%), radial-gradient(600px 260px at 90% 10%, rgba(249, 115, 22, 0.12), transparent 55%)'
        : accent === 'violet'
          ? 'radial-gradient(600px 200px at 20% 0%, rgba(139, 92, 246, 0.16), transparent 50%), radial-gradient(600px 260px at 90% 10%, rgba(59, 130, 246, 0.12), transparent 55%)'
          : accent === 'sky'
            ? 'radial-gradient(600px 200px at 20% 0%, rgba(14, 165, 233, 0.16), transparent 50%), radial-gradient(600px 260px at 90% 10%, rgba(56, 189, 248, 0.12), transparent 55%)'
            : 'radial-gradient(600px 200px at 20% 0%, rgba(13, 148, 136, 0.18), transparent 50%), radial-gradient(600px 260px at 90% 10%, rgba(2, 132, 199, 0.18), transparent 55%)'

  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-60" style={{ background }} />
}

function ProgressBar({ value, max, tone }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-2 rounded-full bg-slate-100 ring-1 ring-slate-200">
      <div
        className={`h-2 rounded-full ${tone}`}
        style={{
          width: `${pct}%`,
        }}
      />
    </div>
  )
}

export default function SalesView({ view, calls = [] }) {
  const page = salesPages[view] || salesPages['sales-leads']
  const Icon = page.icon

  const leads = calls.map(callToSalesLead)
  const groupedByOwner = groupBy(leads, (l) => l.owner || 'Unassigned')
  const ownerNames = Object.keys(groupedByOwner)

  const countsByStatus = {
    'Hot Lead': leads.filter((l) => l.status === 'Hot Lead').length,
    Interested: leads.filter((l) => l.status === 'Interested').length,
    Callback: leads.filter((l) => l.status === 'Callback').length,
    'No Response': leads.filter((l) => l.status === 'No Response').length,
    'Call Disconnected': leads.filter((l) => l.status === 'Call Disconnected').length,
  }

  const total = leads.length
  const maxCount = Math.max(countsByStatus['Hot Lead'], countsByStatus.Interested, countsByStatus.Callback, countsByStatus['No Response'], countsByStatus['Call Disconnected'])

  const recent = [...leads].slice(0, 8)

  function toneForStatus(status) {
    const map = {
      'Hot Lead': 'bg-rose-500',
      Interested: 'bg-emerald-500',
      Callback: 'bg-sky-500',
      'No Response': 'bg-amber-500',
      'Call Disconnected': 'bg-orange-500',
    }
    return map[status] || 'bg-slate-500'
  }

  return (
    <section className="min-h-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5">
        <AccentGlow accent={page.accent} />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                <Icon size={22} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-wide text-teal-700">Sales</p>
                <h2 className="truncate text-2xl font-black text-slate-950">{page.title}</h2>
              </div>
            </div>

            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">{page.description}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                Calls context: {total}
              </span>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                Hot: {countsByStatus['Hot Lead']}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Pipeline</p>
              <p className="mt-1 text-sm font-black text-slate-950">
                {countsByStatus['Hot Lead'] + countsByStatus.Interested} active
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Follow-ups</p>
              <p className="mt-1 text-sm font-black text-slate-950">{countsByStatus.Callback} callbacks</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-black text-slate-950">Status Distribution</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">Sentiment-based pipeline signals.</p>
              </div>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                Max {maxCount}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { key: 'Hot Lead', label: 'Hot Leads', value: countsByStatus['Hot Lead'] },
                { key: 'Interested', label: 'Interested', value: countsByStatus.Interested },
                { key: 'Callback', label: 'Callbacks', value: countsByStatus.Callback },
                { key: 'No Response', label: 'No Response', value: countsByStatus['No Response'] },
              ].map((s) => (
                <div key={s.key} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{s.label}</p>
                    <p className="text-sm font-black text-slate-950">{safeNumber(s.value)}</p>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={safeNumber(s.value)} max={maxCount || 1} tone={`${toneForStatus(s.key)}/80`} />
                  </div>
                </div>
              ))}
            </div>

            {!total ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                    <span aria-hidden="true">📊</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">No sales signals yet</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Calls sync hone ke baad pipeline charts aur recent leads auto populate honge.</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-black text-slate-950">Recent Leads (from Calls)</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Top {recent.length} recent records.</p>

            <div className="mt-4 space-y-3">
              {!recent.length ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-bold text-slate-500">
                  No recent leads yet.
                </div>
              ) : (
                recent.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">{l.leadName}</p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                        {l.phone ? l.phone : '—'} • {l.owner}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(l.status)}`}>
                        {l.status}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200">
                        {l.stage || '—'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-black text-slate-950">Top Owners</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">Latest activity by agent/owner.</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {!ownerNames.length ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6">
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-lg bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                      <span aria-hidden="true">🧭</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800">No owners found</p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">Agent/owner mapping is built from call data. Owners will appear when calls are available.</p>
                    </div>
                  </div>
                </div>
              ) : (
                ownerNames
                  .sort((a, b) => (groupedByOwner[b]?.length || 0) - (groupedByOwner[a]?.length || 0))
                  .slice(0, 5)
                  .map((owner) => (
                    <div key={owner} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
                      <p className="truncate text-sm font-black text-slate-950">{owner}</p>
                      <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 ring-1 ring-teal-100">
                        {groupedByOwner[owner]?.length || 0}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-black text-slate-950">Quick Insights</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Signals for sales automation.</p>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Hot lead rate</p>
                <p className="mt-1 text-sm font-black text-slate-950">
                  {total ? Math.round((countsByStatus['Hot Lead'] / total) * 100) : 0}%
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Callback coverage</p>
                <p className="mt-1 text-sm font-black text-slate-950">
                  {total ? Math.round((countsByStatus.Callback / total) * 100) : 0}%
                </p>
              </div>

              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm font-bold text-slate-500">
                Next step: connect Deals/Forecasts to real CRM records and add tables + filters.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
