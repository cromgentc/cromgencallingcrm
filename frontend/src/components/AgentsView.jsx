import { useEffect, useState } from 'react'
import { MessageSquare, PhoneCall } from 'lucide-react'
import ChatThread from './ChatThread'
import { getAgentTracking } from '../controllers/agentController'
import { getMyMessages, replyMessage, sendStaffMessage } from '../controllers/messageController'

const statusLabels = {
  ready: 'Ready',
  not_ready: 'Not Ready',
  on_call: 'On Call',
  outcall: 'Outcall',
}

const statusClasses = {
  ready: 'bg-emerald-50 text-emerald-700',
  not_ready: 'bg-slate-100 text-slate-700',
  on_call: 'bg-amber-50 text-amber-700',
  outcall: 'bg-sky-50 text-sky-700',
}

export default function AgentsView({ canManage }) {
  const [tracking, setTracking] = useState([])
  const [drafts, setDrafts] = useState({})
  const [inbox, setInbox] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getAgentTracking().then(setTracking).catch((err) => setError(err.message))
    getMyMessages().then(setInbox).catch(() => {})
    const interval = setInterval(() => {
      getAgentTracking().then(setTracking).catch(() => {})
      getMyMessages().then(setInbox).catch(() => {})
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  async function handleMessage(member) {
    const body = drafts[member.staffId] || ''

    if (!body.trim()) {
      return
    }

    await sendStaffMessage({ staffId: member.staffId, body })
    setDrafts({ ...drafts, [member.staffId]: '' })
    setMessage(`Message sent to ${member.name}`)
  }

  async function handleReply(item, body) {
    await replyMessage(item.id, body)
    const data = await getMyMessages()
    setInbox(data)
    setMessage('Reply sent')
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-bold text-slate-950">Calling Staff Tracking</h2>
        <p className="text-sm text-slate-500">Ready, Not Ready, On Call, and Outcall statuses are tracked live.</p>
        {message ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p> : null}
      </section>

      {canManage ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <ChatThread messages={inbox} onReply={handleReply} title="Staff Replies" />
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tracking.map((member) => (
          <article key={member.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-slate-950">{member.name}</p>
                <p className="text-sm text-slate-500">{member.staffId} {member.team ? `- ${member.team}` : ''}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${statusClasses[member.status] || statusClasses.not_ready}`}>
                {statusLabels[member.status] || 'Not Ready'}
              </span>
            </div>

            {member.currentCall ? (
              <div className="mt-4 rounded-lg bg-slate-50 p-3">
                <p className="flex items-center gap-2 text-sm font-bold text-slate-950"><PhoneCall size={16} /> Current Call</p>
                <p className="mt-1 text-sm text-slate-700">{member.currentCall.customer}</p>
                <p className="text-sm text-slate-500">{member.currentCall.phone}</p>
              </div>
            ) : null}

            {canManage ? (
              <div className="mt-4 rounded-lg bg-[#e7f3ef] p-2">
                <div className="flex items-end gap-2">
                  <textarea className="min-h-10 flex-1 resize-none rounded-2xl border border-white bg-white px-3 py-2 text-sm outline-none focus:border-teal-500" placeholder="Direct message" value={drafts[member.staffId] || ''} onChange={(event) => setDrafts({ ...drafts, [member.staffId]: event.target.value })} />
                  <button type="button" onClick={() => handleMessage(member)} className="grid size-10 shrink-0 place-items-center rounded-full bg-teal-600 text-white">
                  <MessageSquare size={16} />
                </button>
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  )
}
