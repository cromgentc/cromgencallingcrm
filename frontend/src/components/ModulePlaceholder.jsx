import { Boxes, CalendarClock, CheckCircle2, Clock3, ListChecks, ShieldCheck, Sparkles } from 'lucide-react'

const pages = {
  'crm-coming-soon': {
    section: 'CRM',
    title: 'Coming Soon',
    description: 'The CRM module will be available here soon.',
    Icon: Sparkles,
    accent: 'teal',
    simple: true,
  },
  'activities-tasks': {
    section: 'Activities',
    title: 'Tasks',
    description: 'Create task follow-ups, assign owners, set due dates, and track completion.',
    Icon: CalendarClock,
    accent: 'teal',
  },
  'activities-meetings': {
    section: 'Activities',
    title: 'Meetings',
    description: 'Schedule meetings, log outcomes, and keep reminders organized.',
    Icon: CalendarClock,
    accent: 'sky',
  },
  'activities-calls': {
    section: 'Activities',
    title: 'Calls',
    description: 'Plan calls, log outcomes, and connect them with CRM records.',
    Icon: CalendarClock,
    accent: 'amber',
  },
  'inventory-products': {
    section: 'Inventory',
    title: 'Products',
    description: 'Manage product catalog, SKUs, categories, and availability.',
    Icon: Boxes,
    accent: 'violet',
  },
  'inventory-price-books': {
    section: 'Inventory',
    title: 'Price Books',
    description: 'Maintain pricing lists, tiers, discounts, and valid date ranges.',
    Icon: Boxes,
    accent: 'violet',
  },
  'inventory-quotes': {
    section: 'Inventory',
    title: 'Quotes',
    description: 'Create customer quotes from products with approval workflow.',
    Icon: Boxes,
    accent: 'rose',
  },
  'inventory-sales-orders': {
    section: 'Inventory',
    title: 'Sales Orders',
    description: 'Track confirmed orders, fulfillment status, and billing timeline.',
    Icon: Boxes,
    accent: 'emerald',
  },
  'inventory-purchase-orders': {
    section: 'Inventory',
    title: 'Purchase Orders',
    description: 'Manage supplier orders, receiving progress, and approval steps.',
    Icon: Boxes,
    accent: 'amber',
  },
  'inventory-invoices': {
    section: 'Inventory',
    title: 'Invoices',
    description: 'Track invoices, payment status, due dates, and customer balances.',
    Icon: Boxes,
    accent: 'sky',
  },
  'inventory-vendors': {
    section: 'Inventory',
    title: 'Vendors',
    description: 'Store vendor details, contacts, and recent procurement activity.',
    Icon: Boxes,
    accent: 'emerald',
  },
}

function getCallBadgeTone(sentiment) {
  const map = {
    'Hot Lead': 'bg-rose-50 text-rose-700 ring-rose-100',
    Interested: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    Callback: 'bg-sky-50 text-sky-700 ring-sky-100',
    'No Response': 'bg-amber-50 text-amber-700 ring-amber-100',
    'Call Disconnected': 'bg-orange-50 text-orange-700 ring-orange-100',
    'Call Handling': 'bg-violet-50 text-violet-700 ring-violet-100',
    Neutral: 'bg-slate-100 text-slate-700 ring-slate-100',
    'Not Interested': 'bg-slate-100 text-slate-700 ring-slate-100',
  }

  const cls = map[sentiment] || 'bg-slate-100 text-slate-700 ring-slate-100'
  return cls
}

function SentimentSummary({ calls }) {
  const stats = [
    { key: 'Hot Lead', label: 'Hot', icon: ShieldCheck },
    { key: 'Interested', label: 'Interested', icon: Sparkles },
    { key: 'Callback', label: 'Callback', icon: Clock3 },
    { key: 'No Response', label: 'No Response', icon: Clock3 },
  ]

  const counts = stats.reduce((acc, item) => {
    acc[item.key] = calls.filter((c) => c.sentiment === item.key).length
    return acc
  }, {})

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {stats.map((s) => {
        const Icon = s.icon
        const count = counts[s.key] || 0
        return (
          <div key={s.key} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{s.label}</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{count}</p>
              </div>
              <span className={`grid size-10 place-items-center rounded-xl bg-slate-50 text-slate-700 ring-1 ring-slate-100`}>
                <Icon size={18} />
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function ModulePlaceholder({ view, calls = [], timeline = [] }) {
  const page = pages[view] || pages['activities-tasks']
  const Icon = page.Icon

  if (page.simple) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto grid size-14 place-items-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
          <Icon size={26} />
        </span>
        <p className="mt-4 text-xs font-black uppercase tracking-wide text-teal-700">{page.section}</p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">{page.title}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-600">{page.description}</p>
      </section>
    )
  }

  const latestTimeline = Array.isArray(timeline) ? timeline.slice(0, 5) : []
  const latestCalls = Array.isArray(calls) ? calls.slice(0, 6) : []

  const totalCalls = calls.length
  const totalDuration = calls.reduce((sum, c) => sum + (Number(c.duration?.toString().replace(/[^\d]/g, '')) || 0), 0)

  return (
    <section className="min-h-0 space-y-4">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              page.accent === 'emerald'
                ? 'radial-gradient(600px 200px at 20% 0%, rgba(16, 185, 129, 0.18), transparent 50%), radial-gradient(600px 260px at 90% 10%, rgba(34, 197, 94, 0.14), transparent 55%)'
                : page.accent === 'rose'
                  ? 'radial-gradient(600px 200px at 20% 0%, rgba(244, 63, 94, 0.14), transparent 50%), radial-gradient(600px 260px at 90% 10%, rgba(249, 115, 22, 0.14), transparent 55%)'
                  : page.accent === 'violet'
                    ? 'radial-gradient(600px 200px at 20% 0%, rgba(139, 92, 246, 0.16), transparent 50%), radial-gradient(600px 260px at 90% 10%, rgba(59, 130, 246, 0.12), transparent 55%)'
                    : page.accent === 'sky'
                      ? 'radial-gradient(600px 200px at 20% 0%, rgba(14, 165, 233, 0.16), transparent 50%), radial-gradient(600px 260px at 90% 10%, rgba(56, 189, 248, 0.12), transparent 55%)'
                      : 'radial-gradient(600px 200px at 20% 0%, rgba(13, 148, 136, 0.18), transparent 50%), radial-gradient(600px 260px at 90% 10%, rgba(2, 132, 199, 0.18), transparent 55%)',
          }}
        />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                <Icon size={22} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-teal-700">{page.section}</p>
                <h2 className="truncate text-2xl font-black text-slate-950">{page.title}</h2>
              </div>
            </div>

            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">{page.description}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                Total calls (context): {totalCalls}
              </span>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                Duration sum: {totalDuration}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <span className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <CheckCircle2 size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Next action</p>
                <p className="truncate text-sm font-black text-slate-950">Create records & assign owners</p>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <span className="grid size-10 place-items-center rounded-lg bg-slate-50 text-slate-700 ring-1 ring-slate-100">
                <ListChecks size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Workflow</p>
                <p className="truncate text-sm font-black text-slate-950">Filters, reports & exports</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-black text-slate-950">Latest Activity (context)</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">Timeline events show your recent system activity.</p>
              </div>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                {latestTimeline.length} events
              </span>
            </div>

            {latestTimeline.length ? (
              <div className="mt-4 space-y-3">
                {latestTimeline.map((item) => (
                  <div key={`${item.time}-${item.title}`} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
                    <div className="mt-1 size-3 shrink-0 rounded-full bg-teal-500 ring-4 ring-teal-50" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{item.time}</p>
                      <p className="mt-1 truncate text-sm font-black text-slate-950">{item.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-bold text-slate-500">
                No timeline events found yet.
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-black text-slate-950">Recent Calls (for automation)</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">Sentiment and stages help drive workflows.</p>
              </div>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                {latestCalls.length} calls
              </span>
            </div>

            {!latestCalls.length ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                    <span aria-hidden="true">📞</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">No call signals yet</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Recent calls will appear here after dashboard calls sync.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {latestCalls.map((call) => (
                  <div key={call.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">{call.customer}</p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                        {call.phone} • {call.agent}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${getCallBadgeTone(call.sentiment)}`}>
                        {call.sentiment || 'Interested'}
                      </span>
                      <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200">
                        {call.stage || '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-black text-slate-950">Sentiment Snapshot</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Hot leads and follow-ups in one glance.</p>
            <div className="mt-4">
              <SentimentSummary calls={calls} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-black text-slate-950">Auto-Workflow Recommendations</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Based on recent calling outcomes.</p>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">If Hot Lead appears</p>
                <p className="mt-1 text-sm font-black text-slate-950">Route to next step + notify owner immediately</p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">If Callback appears</p>
                <p className="mt-1 text-sm font-black text-slate-950">Schedule reminder and log outcome in timeline</p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">If No Response repeats</p>
                <p className="mt-1 text-sm font-black text-slate-950">Mark as nurture + propose next contact window</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-500">
              Module creation UI (tables/forms) will be added next.
            </div>
          </section>
        </div>
      </div>
    </section>
  )
}
