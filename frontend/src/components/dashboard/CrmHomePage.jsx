import { CheckCircle2, Clock3, MoreHorizontal, PhoneCall, Sparkles, Users } from 'lucide-react'
import StatCard from '../StatCard'
import Timeline from '../Timeline'

function formatCompactCount(value) {
  const n = Number(value) || 0
  if (n < 1000) return String(n)
  if (n < 1000000) return `${Math.round((n / 1000) * 10) / 10}k`
  return `${Math.round((n / 1000000) * 10) / 10}M`
}

function getSentimentTone(sentiment) {
  const map = {
    'Hot Lead': 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
    Interested: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
    Callback: 'bg-sky-50 text-sky-700 ring-1 ring-sky-100',
    'No Response': 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
    'Call Disconnected': 'bg-orange-50 text-orange-700 ring-1 ring-orange-100',
    'Call Handling': 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
    Neutral: 'bg-slate-100 text-slate-700 ring-1 ring-slate-100',
    'Not Interested': 'bg-slate-100 text-slate-700 ring-1 ring-slate-100',
  }

  return map[sentiment] || 'bg-slate-100 text-slate-700 ring-1 ring-slate-100'
}

function formatWhen(value) {
  if (!value) return '-'
  try {
    const dt = new Date(value)
    if (Number.isNaN(dt.getTime())) return '-'
    return dt.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })
  } catch {
    return '-'
  }
}

function formatCalendarDay(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export default function CrmHomePage({
  dashboard,
  currentUser,
  onNavigate,
  onSelectStat,
}) {
  const stats = dashboard?.stats || []
  const pendingCustomers = dashboard?.pendingCustomers || []
  const timelineItems = dashboard?.timeline || []
  const staffSummary = dashboard?.staffCallSummary || []
  const dailyTaggings = dashboard?.dailyTaggings || []
  const isStaff = currentUser?.role === 'staff'
  const canViewTaggings = ['admin', 'manager', 'teamleader', 'staff'].includes(currentUser?.role)
  const canViewReports = ['manager', 'teamleader', 'staff'].includes(currentUser?.role)
  const calls = canViewTaggings ? (dashboard?.calls || []).slice(0, 8) : []

  const staffOnline = staffSummary.filter((s) => ['ready', 'on_call', 'outcall'].includes(String(s.status)))
  const staffNotReady = staffSummary.filter((s) => !['ready', 'on_call', 'outcall'].includes(String(s.status)))

  const conversions = stats.find((s) => s.label === 'Conversions')
  const conversionsValue = conversions?.value ? String(conversions.value) : ''

  return (
    <div className="min-h-0 space-y-4">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(600px 200px at 20% 0%, rgba(13, 148, 136, 0.18), transparent 50%), radial-gradient(600px 260px at 90% 10%, rgba(2, 132, 199, 0.18), transparent 55%)',
          }}
        />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-teal-600 text-white shadow-sm">
                <Sparkles size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-teal-700">CRM Control Center</p>
                <h2 className="truncate text-xl font-black text-slate-950 sm:text-2xl">
                  {dashboard?.dashboardTitle || 'Dashboard'}
                </h2>
              </div>
            </div>

            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
              Live performance, queue status, and recent calling activity—everything in one place.
            </p>

            {conversionsValue ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-100">
                  Conversions: {conversionsValue}
                </span>
                <span className="text-xs font-bold text-slate-500">Role: {currentUser?.role || 'user'}</span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canViewTaggings ? (
              <button
                type="button"
                onClick={() => onNavigate?.('calls')}
                className="flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700"
              >
                <PhoneCall size={18} />
                Taggings
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => onNavigate?.('pending')}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-teal-200 hover:text-teal-800"
            >
              <Clock3 size={18} />
              Pending Queue
            </button>

            <button
              type="button"
              onClick={() => onNavigate?.('sales-leads')}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-teal-200 hover:text-teal-800"
            >
              <Users size={18} />
              Leads
            </button>

          </div>
        </div>
      </section>

      <section className="mt-1 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} onSelect={onSelectStat} />
        ))}
      </section>

      <section className="grid min-w-0 gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-black text-slate-950">Recent Calls</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Showing latest {Math.min(8, calls.length)} calls from your queue.
                </p>
              </div>
              {canViewTaggings ? (
                <button
                  type="button"
                  onClick={() => onNavigate?.('calls')}
                  className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-teal-200 hover:text-teal-800"
                >
                  View All
                  <MoreHorizontal size={16} />
                </button>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              {!calls.length ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-bold text-slate-500">
                  No calls yet. Use Taggings to start tracking call outcomes.
                </div>
              ) : null}

              {calls.map((call) => (
                <div key={call.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{call.customer}</p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                      {call.phone} • Agent: {call.agent}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${getSentimentTone(call.sentiment)}`}>
                        {call.sentiment || 'Interested'}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                        {call.stage || '—'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-500">{call.duration || ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-black text-slate-950">{isStaff ? 'My Pending Calls' : 'Pending Customers'}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {isStaff ? 'Assigned calls waiting in your queue.' : 'Added to queue waiting for the next calling attempt.'}
              </p>

              <div className="mt-4 space-y-2">
                {!pendingCustomers.length ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-bold text-slate-500">
                    Queue empty. When customers are added, they’ll appear here.
                  </div>
                ) : null}

                {pendingCustomers.slice(0, 5).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onNavigate?.('pending')}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3 text-left transition hover:border-teal-200"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">{c.name}</p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{c.phone}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700 ring-1 ring-violet-100">
                      Pending
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => onNavigate?.('pending')}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700"
                >
                  Open Pending Calls
                  <CheckCircle2 size={16} />
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-black text-slate-950">{isStaff ? 'My Status' : 'Staff Status'}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {isStaff ? 'Only your current dialer status is shown here.' : 'Ready/on-call/outcall counts for your team.'}
              </p>

              {isStaff ? null : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Online</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{formatCompactCount(staffOnline.length)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Not Ready</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{formatCompactCount(staffNotReady.length)}</p>
                </div>
              </div>
              )}

              <div className="mt-4 space-y-2">
                {(staffOnline.length ? staffOnline : staffSummary).slice(0, 4).map((s) => {
                  const tone =
                    s.status === 'ready'
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                      : s.status === 'on_call'
                        ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-100'
                        : s.status === 'outcall'
                          ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                          : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'

                  return (
                    <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950">{s.name}</p>
                        <p className="mt-0.5 text-xs font-semibold text-slate-500">
                          {s.team || ''} • Last: {formatWhen(s.lastCallAt)}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}>
                        {s.status || 'not_ready'}
                      </span>
                    </div>
                  )
                })}
              </div>

              {isStaff ? null : (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => onNavigate?.('team')}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-teal-200 hover:text-teal-800"
                >
                  Manage Staff
                  <MoreHorizontal size={16} />
                </button>
              </div>
              )}
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          {canViewTaggings ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-black text-slate-950">Daily Taggings</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {isStaff ? 'Your daily tag count.' : 'Daily tag count for the visible team.'}
            </p>
            <div className="mt-4 grid grid-cols-7 gap-2">
              {dailyTaggings.map((day) => (
                <div key={day.date} className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-center">
                  <p className="text-[11px] font-bold text-slate-500">{formatCalendarDay(day.date)}</p>
                  <p className="mt-1 text-lg font-black text-slate-950">{day.count}</p>
                </div>
              ))}
            </div>
          </div>
          ) : null}

          <Timeline items={timelineItems.slice(0, 7)} />

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-black text-slate-950">Queue Snapshot</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Pending vs completed calls and live talks.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Pending</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{dashboard?.callQueueSummary?.pending ?? 0}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Completed</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{dashboard?.callQueueSummary?.completed ?? 0}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Live</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{dashboard?.callQueueSummary?.liveTalk ?? 0}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => onNavigate?.('pending')}
                className="flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700"
              >
                Open Queue
                <MoreHorizontal size={16} />
              </button>

              {canViewReports ? (
                <button
                  type="button"
                  onClick={() => onNavigate?.('reports')}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-teal-200 hover:text-teal-800"
                >
                  View Reports
                  <MoreHorizontal size={16} />
                </button>
              ) : null}
            </div>
          </div>

          {/*
            Keep staff dialer panel where it already exists. It’s role-aware, so embedding here is safe.
          */}
          {currentUser?.role === 'staff' ? null : null}
        </div>
      </section>
    </div>
  )
}
