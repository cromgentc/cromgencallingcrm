import { useEffect, useMemo, useState } from 'react'
import { Clock3, Eye, Inbox, MailCheck, RefreshCw, Reply, Send, TrendingUp } from 'lucide-react'
import { request } from '../controllers/httpController'
import { API_ENDPOINTS } from '../services/api'

function formatDate(value) {
  if (!value) return 'Not yet'
  return new Date(value).toLocaleString('en-IN')
}

function latestReply(campaign) {
  return (campaign.replies || []).filter((reply) => reply.type !== 'system').at(-1)
}

export default function EmailTrackingView() {
  const [data, setData] = useState({ campaigns: [], summary: {} })
  const [status, setStatus] = useState('Loading email tracking...')
  const [syncing, setSyncing] = useState(false)

  const summaryCards = useMemo(() => [
    { label: 'Campaigns', value: data.summary.totalCampaigns || 0, icon: Send, tone: 'bg-slate-950 text-white' },
    { label: 'Sent Emails', value: data.summary.totalSent || 0, icon: MailCheck, tone: 'bg-teal-600 text-white' },
    { label: 'Open Events', value: data.summary.totalOpens || 0, icon: Eye, tone: 'bg-sky-600 text-white' },
    { label: 'Open Rate', value: `${data.summary.openRate || 0}%`, icon: TrendingUp, tone: 'bg-emerald-600 text-white' },
  ], [data.summary])

  function loadTracking({ showLoading = true } = {}) {
    if (showLoading) {
      setStatus('Loading email tracking...')
    }
    return request(API_ENDPOINTS.marketing.tracking)
      .then((result) => {
        setData(result)
        setStatus('')
      })
      .catch((error) => setStatus(error.message || 'Email tracking load nahi hua.'))
  }

  async function syncInbox() {
    try {
      setSyncing(true)
      setStatus('Gmail replies sync ho rahe hain...')
      await request(API_ENDPOINTS.marketing.syncInbox, {
        method: 'POST',
        body: JSON.stringify({ limit: 20 }),
      })
      await loadTracking()
      setStatus('Inbox replies synced.')
    } catch (error) {
      setStatus(error.message || 'Inbox sync failed.')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    request(API_ENDPOINTS.marketing.tracking)
      .then((result) => {
        setData(result)
        setStatus('')
      })
      .catch((error) => setStatus(error.message || 'Email tracking load nahi hua.'))
  }, [])

  return (
    <section className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-teal-700">Marketing</p>
            <h2 className="text-2xl font-black text-slate-950">Email Tracking</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Open tracking, replies, and campaign engagement.</p>
          </div>
          <button type="button" onClick={syncInbox} disabled={syncing} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing' : 'Sync Replies'}
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className={`grid size-10 place-items-center rounded-lg ${card.tone}`}>
                  <Icon size={18} />
                </span>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">{card.label}</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{card.value}</p>
              </div>
            )
          })}
        </div>

        {data.typingMessage ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
            Typing: {data.typingMessage}
          </div>
        ) : null}
        {status ? <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600">{status}</p> : null}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.2fr_0.6fr_0.6fr_0.8fr] gap-3 border-b border-slate-100 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500 max-lg:hidden">
          <span>Campaign</span>
          <span>Open</span>
          <span>Reply</span>
          <span>Last Activity</span>
        </div>

        <div className="divide-y divide-slate-100">
          {data.campaigns.map((campaign) => {
            const reply = latestReply(campaign)
            return (
              <article key={campaign._id || campaign.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[1.2fr_0.6fr_0.6fr_0.8fr] lg:items-center">
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-950">{campaign.name}</p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-600">{campaign.subject}</p>
                  <p className="mt-1 text-xs font-bold text-slate-400">{campaign.recipients?.length || 0} recipients</p>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <Eye size={16} className="text-sky-600" />
                  {campaign.openCount || 0} opens
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  {reply ? <Reply size={16} className="text-emerald-600" /> : <Inbox size={16} className="text-slate-400" />}
                  {reply ? 'Reply received' : 'No reply'}
                </div>
                <div className="text-sm font-bold text-slate-600">
                  <span className="flex items-center gap-2">
                    <Clock3 size={16} className="text-slate-400" />
                    {formatDate(campaign.lastOpenedAt || reply?.receivedAt || campaign.sentAt || campaign.updatedAt)}
                  </span>
                  {reply?.body ? <p className="mt-2 line-clamp-2 rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-800">{reply.body}</p> : null}
                </div>
              </article>
            )
          })}

          {!data.campaigns.length ? (
            <div className="px-4 py-8 text-center text-sm font-bold text-slate-500">
              Tracking data abhi empty hai.
            </div>
          ) : null}
        </div>
      </section>
    </section>
  )
}
