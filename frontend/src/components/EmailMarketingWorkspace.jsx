import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, Inbox, Mail, MousePointerClick, Plus, RefreshCw, Save, Search, Send, Settings2, Star, Trash2, Upload, Users, X } from 'lucide-react'
import { request } from '../controllers/httpController'
import { API_ENDPOINTS } from '../services/api'
import { readUserJson, writeUserJson } from '../utils/userStorage'
import EmailTrackingView from './EmailTrackingView'

const storageKey = 'calltrack_marketing_campaigns'
const recipientSample = 'name,email\nRahul Sharma,rahul@example.com\nPriya Singh,priya@example.com'

const templates = [
  { id: 'intro', label: 'Intro', subject: 'Quick follow-up from CromGen', body: 'Hi {{name}},\n\nThank you for connecting with us. We would love to help with your requirement.\n\nRegards,\nCromGen CRM' },
  { id: 'callback', label: 'Callback', subject: 'Your callback request', body: 'Hi {{name}},\n\nWe have noted your callback request. Our team will contact you at the selected time.\n\nRegards,\nCromGen CRM' },
  { id: 'offer', label: 'Offer', subject: 'Special offer for your business', body: 'Hi {{name}},\n\nSharing a short offer that may be useful for your team. Reply to this email to know more.\n\nRegards,\nCromGen CRM' },
]

function initialDraft() {
  return {
    channel: 'email',
    name: 'Email Follow-up',
    audience: 'Interested',
    subject: templates[0].subject,
    body: templates[0].body,
    recipients: [],
    status: 'Draft',
    scheduledAt: '',
  }
}

function parseCsvLine(line) {
  const values = []
  let current = ''
  let quoted = false

  for (const char of line) {
    if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

function parseRecipients(rows) {
  return rows
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean)
    .map(parseCsvLine)
    .filter(([name, email]) => name?.toLowerCase() !== 'name' && email?.toLowerCase() !== 'email')
    .map(([name, email]) => ({ name, email }))
    .filter((item) => item.name && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email))
}

function loadCampaigns() {
  return readUserJson(storageKey, [])
}

function normalizeCampaign(campaign = {}) {
  return {
    ...campaign,
    id: campaign.id || campaign._id || `email-${Date.now()}`,
    channel: 'email',
    status: campaign.status || 'Draft',
    folder: campaign.folder || (campaign.status || 'Draft').toLowerCase(),
    recipients: campaign.recipients || [],
    replies: campaign.replies || [],
  }
}

function validEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())
}

function statusTone(status) {
  if (status === 'Sent') return 'bg-violet-50 text-violet-700'
  if (status === 'Scheduled') return 'bg-sky-50 text-sky-700'
  if (status === 'Ready') return 'bg-emerald-50 text-emerald-700'
  return 'bg-slate-100 text-slate-700'
}

export default function EmailMarketingWorkspace({ currentUser }) {
  const [campaigns, setCampaigns] = useState(loadCampaigns)
  const [draft, setDraft] = useState(initialDraft)
  const [recipientRows, setRecipientRows] = useState(recipientSample)
  const [manualRecipient, setManualRecipient] = useState({ name: '', email: '' })
  const [activeMailbox, setActiveMailbox] = useState('inbox')
  const [searchQuery, setSearchQuery] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [syncingInbox, setSyncingInbox] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [inboxMessage, setInboxMessage] = useState('')

  const emailCampaigns = useMemo(() => campaigns.filter((campaign) => campaign.channel === 'email'), [campaigns])
  const filteredCampaigns = useMemo(() => {
    return emailCampaigns
      .filter((campaign) => activeMailbox === 'starred' ? campaign.starred : campaign.folder === activeMailbox)
      .filter((campaign) => `${campaign.name} ${campaign.subject} ${campaign.body}`.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [activeMailbox, emailCampaigns, searchQuery])

  const mailboxItems = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: emailCampaigns.filter((item) => item.folder === 'inbox').length },
    { id: 'starred', label: 'Starred', icon: Star, count: emailCampaigns.filter((item) => item.starred).length },
    { id: 'sent', label: 'Sent', icon: Send, count: emailCampaigns.filter((item) => item.folder === 'sent').length },
    { id: 'tracking', label: 'Tracking', icon: MousePointerClick, count: emailCampaigns.filter((item) => item.folder === 'sent' && item.openCount).length },
    { id: 'draft', label: 'Drafts', icon: Save, count: emailCampaigns.filter((item) => item.folder === 'draft').length },
    { id: 'scheduled', label: 'Scheduled', icon: Clock3, count: emailCampaigns.filter((item) => item.folder === 'scheduled').length },
    { id: 'spam', label: 'Spam', icon: AlertTriangle, count: emailCampaigns.filter((item) => item.folder === 'spam').length },
  ]

  useEffect(() => {
    request(API_ENDPOINTS.marketing.emailCampaigns)
      .then((data) => {
        const serverCampaigns = (data.campaigns || []).map(normalizeCampaign)
        setCampaigns(serverCampaigns)
        writeUserJson(storageKey, serverCampaigns)
        setInboxMessage(data.inboxMessage || '')
      })
      .catch((error) => {
        setMessage(error.message || 'Email campaigns load nahi ho paaye.')
      })
  }, [])

  function persist(nextCampaigns) {
    setCampaigns(nextCampaigns)
    writeUserJson(storageKey, nextCampaigns)
  }

  function draftWithPendingRecipient() {
    const name = manualRecipient.name.trim()
    const email = manualRecipient.email.trim()

    if (!email) {
      return draft
    }

    if (!validEmail(email)) {
      setMessage('Valid customer email id dalo.')
      return null
    }

    const nextRecipient = { name: name || email.split('@')[0], email }
    const exists = draft.recipients.some((recipient) => recipient.email.toLowerCase() === email.toLowerCase())

    return {
      ...draft,
      recipients: exists ? draft.recipients : [...draft.recipients, nextRecipient],
    }
  }

  function openCompose(nextDraft = initialDraft()) {
    setDraft({
      ...initialDraft(),
      ...nextDraft,
      recipients: nextDraft.recipients || [],
    })
    setComposeOpen(true)
  }

  function applyTemplate(templateId) {
    const template = templates.find((item) => item.id === templateId)
    if (!template) return

    setDraft((current) => ({ ...current, subject: template.subject, body: template.body }))
  }

  function addRecipients(recipients) {
    if (!recipients.length) {
      setMessage('CSV mein name,email columns chahiye.')
      return
    }

    setDraft((current) => ({
      ...current,
      recipients: recipients.reduce((list, recipient) => {
        if (list.some((item) => item.email.toLowerCase() === recipient.email.toLowerCase())) {
          return list
        }
        return [...list, recipient]
      }, current.recipients),
    }))
    setMessage(`${recipients.length} customer email import ho gaya.`)
  }

  function addManualRecipient() {
    const name = manualRecipient.name.trim()
    const email = manualRecipient.email.trim()

    if (!email || !validEmail(email)) {
      setMessage('Valid customer name aur email id dalo.')
      return
    }

    addRecipients([{ name: name || email.split('@')[0], email }])
    setManualRecipient({ name: '', email: '' })
  }

  function handleRecipientFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv') && !file.name.toLowerCase().endsWith('.txt')) {
      setMessage('Excel ko CSV format mein save karke upload karo.')
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const rows = String(reader.result || '')
      setRecipientRows(rows)
      addRecipients(parseRecipients(rows))
      event.target.value = ''
    }
    reader.readAsText(file)
  }

  function removeRecipient(email) {
    setDraft((current) => ({
      ...current,
      recipients: current.recipients.filter((recipient) => recipient.email !== email),
    }))
  }

  async function saveCampaign(status) {
    const sendDraft = draftWithPendingRecipient()
    if (!sendDraft) return

    if (!sendDraft.name.trim() || !sendDraft.subject.trim() || !sendDraft.body.trim()) {
      setMessage('Campaign name, subject, aur email body required hai.')
      return
    }

    if (!sendDraft.recipients.length) {
      setMessage('Email bhejne ke liye customer email id add karo.')
      return
    }

    try {
      const result = await request(API_ENDPOINTS.marketing.emailCampaigns, {
        method: 'POST',
        body: JSON.stringify({ ...sendDraft, status }),
      })
      const nextCampaign = normalizeCampaign(result.campaign)
      persist([nextCampaign, ...campaigns])
      setDraft(initialDraft())
      setComposeOpen(false)
      setMessage(result.message || `Email campaign ${status.toLowerCase()} mein save ho gaya.`)
    } catch (error) {
      setMessage(error.message || 'Campaign save nahi hua.')
    }
  }

  async function scheduleCampaign() {
    const sendDraft = draftWithPendingRecipient()
    if (!sendDraft) return

    if (!sendDraft.scheduledAt) {
      setMessage('Scheduled email ke liye date aur time select karo.')
      return
    }

    try {
      const result = await request(API_ENDPOINTS.marketing.scheduleEmail, {
        method: 'POST',
        body: JSON.stringify(sendDraft),
      })
      const nextCampaign = normalizeCampaign(result.campaign)
      persist([nextCampaign, ...campaigns])
      setDraft(initialDraft())
      setComposeOpen(false)
      setActiveMailbox('scheduled')
      setMessage(result.message || 'Email scheduled ho gaya.')
    } catch (error) {
      setMessage(error.message || 'Email schedule nahi hua.')
    }
  }

  async function sendCampaignNow() {
    const sendDraft = draftWithPendingRecipient()
    if (!sendDraft) return

    if (!sendDraft.name.trim() || !sendDraft.subject.trim() || !sendDraft.body.trim()) {
      setMessage('Campaign name, subject, aur email body required hai.')
      return
    }

    if (!sendDraft.recipients.length) {
      setMessage('Email bhejne ke liye customer email id add karo.')
      return
    }

    try {
      setSending(true)
      setMessage('Email send ho raha hai...')
      const result = await request(API_ENDPOINTS.marketing.sendEmail, {
        method: 'POST',
        body: JSON.stringify({
          subject: sendDraft.subject,
          body: sendDraft.body,
          recipients: sendDraft.recipients,
          name: sendDraft.name,
        }),
      })

      persist([normalizeCampaign(result.campaign), ...campaigns])
      setDraft(initialDraft())
      setComposeOpen(false)
      setActiveMailbox('sent')
      setMessage(result.message || 'Email sent successfully.')
    } catch (error) {
      setMessage(error.message || 'Email send failed. SMTP settings check karo.')
    } finally {
      setSending(false)
    }
  }

  function deleteCampaign(campaignId) {
    persist(campaigns.filter((campaign) => campaign.id !== campaignId && campaign._id !== campaignId))
  }

  async function toggleStar(campaign) {
    const campaignId = campaign._id || campaign.id
    const nextStarred = !campaign.starred
    persist(campaigns.map((item) => (item.id === campaign.id || item._id === campaign._id ? { ...item, starred: nextStarred } : item)))

    try {
      await request(API_ENDPOINTS.marketing.updateEmailCampaign(campaignId), {
        method: 'PATCH',
        body: JSON.stringify({ starred: nextStarred }),
      })
    } catch {
      setMessage('Star update server par save nahi hua.')
    }
  }

  async function toggleSpam(campaign) {
    const campaignId = campaign._id || campaign.id
    const spam = campaign.folder !== 'spam'
    const nextFolder = spam ? 'spam' : 'inbox'
    const nextStatus = spam ? 'Spam' : 'Inbox'
    persist(campaigns.map((item) => (item.id === campaign.id || item._id === campaign._id ? { ...item, folder: nextFolder, status: nextStatus } : item)))

    try {
      await request(API_ENDPOINTS.marketing.updateEmailCampaign(campaignId), {
        method: 'PATCH',
        body: JSON.stringify({ spam }),
      })
    } catch {
      setMessage('Spam update server par save nahi hua.')
    }
  }

  async function syncInbox() {
    try {
      setSyncingInbox(true)
      setMessage('Gmail inbox sync ho raha hai...')
      const result = await request(API_ENDPOINTS.marketing.syncInbox, {
        method: 'POST',
        body: JSON.stringify({ limit: 20 }),
      })
      const serverCampaigns = (result.campaigns || []).map(normalizeCampaign)
      const otherCampaigns = campaigns.filter((campaign) => campaign.folder !== 'inbox')
      persist([...serverCampaigns, ...otherCampaigns])
      setActiveMailbox('inbox')
      setMessage(result.message || 'Inbox synced.')
    } catch (error) {
      setMessage(error.message || 'Inbox sync failed. Gmail IMAP check karo.')
    } finally {
      setSyncingInbox(false)
    }
  }

  function openSettings() {
    writeUserJson('calltrack_settings_open', 'emailSmtp')
    window.open('/marketing/email/settings', '_blank', 'noopener,noreferrer')
  }

  return (
    <main className="flex h-[100dvh] min-h-[100svh] overflow-hidden bg-[#f6f8fc] text-slate-900">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-4 lg:block">
        <div className="flex items-center gap-3 px-2">
          <span className="grid size-10 place-items-center rounded-lg bg-rose-600 text-white">
            <Mail size={20} />
          </span>
          <div>
            <p className="text-lg font-black">CromGen Mail</p>
            <p className="text-xs font-bold text-slate-500">{currentUser?.name || 'Email Marketing'}</p>
          </div>
        </div>

        <button type="button" onClick={() => openCompose()} className="mt-6 flex h-12 w-full items-center gap-3 rounded-2xl bg-sky-100 px-4 text-sm font-black text-slate-900 shadow-sm">
          <Plus size={18} />
          Compose
        </button>

        <nav className="mt-5 space-y-1">
          {mailboxItems.map((item) => {
            const Icon = item.icon
            const active = activeMailbox === item.id

            return (
              <button key={item.id} type="button" onClick={() => setActiveMailbox(item.id)} className={`flex h-10 w-full items-center justify-between rounded-r-full px-3 text-sm font-bold ${active ? 'bg-rose-100 text-rose-800' : 'text-slate-600 hover:bg-slate-100'}`}>
                <span className="flex items-center gap-3">
                  <Icon size={17} />
                  {item.label}
                </span>
                <span>{item.count}</span>
              </button>
            )
          })}
        </nav>

        <button type="button" onClick={openSettings} className="mt-6 flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
          <Settings2 size={16} />
          SMTP Settings
        </button>
        <button type="button" onClick={syncInbox} disabled={syncingInbox} className="mt-2 flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400">
          <RefreshCw size={16} className={syncingInbox ? 'animate-spin' : ''} />
          {syncingInbox ? 'Syncing Inbox' : 'Sync Inbox'}
        </button>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-rose-700">Email Marketing</p>
            <h1 className="text-xl font-black text-slate-950">{mailboxItems.find((item) => item.id === activeMailbox)?.label || 'Inbox'}</h1>
          </div>
          <label className="flex h-11 min-w-0 items-center gap-2 rounded-full bg-slate-100 px-4 lg:w-[28rem]">
            <Search size={18} className="text-slate-400" />
            <input className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" placeholder="Search campaigns" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
          </label>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          {activeMailbox === 'tracking' ? (
            <section className="mx-auto h-full max-w-6xl overflow-y-auto px-4 py-4">
              <EmailTrackingView />
            </section>
          ) : (
          <section className="mx-auto h-full max-w-5xl overflow-y-auto bg-white">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-500">
              {filteredCampaigns.length} email{filteredCampaigns.length === 1 ? '' : 's'}
            </div>

            {activeMailbox === 'inbox' && inboxMessage ? (
              <div className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                {inboxMessage}
              </div>
            ) : null}

            {filteredCampaigns.map((campaign) => (
              <article key={campaign.id} className="border-b border-slate-100 px-4 py-3 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button type="button" onClick={() => campaign.folder === 'draft' || campaign.folder === 'scheduled' || campaign.folder === 'ready' ? openCompose(campaign) : null} className="max-w-full truncate text-left text-sm font-black text-slate-950">
                      {campaign.name}
                    </button>
                    <p className="mt-1 truncate text-sm font-bold text-slate-700">{campaign.subject}</p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-500">{campaign.body}</p>
                    {campaign.replies?.[campaign.replies.length - 1]?.body ? (
                      <p className="mt-2 line-clamp-2 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold leading-5 text-emerald-800">
                        Reply: {campaign.replies[campaign.replies.length - 1].body}
                      </p>
                    ) : null}
                    {campaign.scheduledAt ? <p className="mt-1 text-xs font-bold text-sky-700">Scheduled: {new Date(campaign.scheduledAt).toLocaleString('en-IN')}</p> : null}
                    {campaign.replies?.length ? <p className="mt-1 text-xs font-bold text-emerald-700">{campaign.replies.length} replies in thread</p> : null}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${statusTone(campaign.status)}`}>{campaign.status}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                    <Users size={13} />
                    {campaign.recipients?.length || 0} emails
                  </span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => toggleStar(campaign)} className={`grid size-8 place-items-center rounded-lg ${campaign.starred ? 'text-amber-500' : 'text-slate-400 hover:bg-amber-50 hover:text-amber-600'}`} title="Star">
                      <Star size={15} />
                    </button>
                    {(campaign.folder === 'inbox' || campaign.folder === 'spam') ? (
                      <button type="button" onClick={() => toggleSpam(campaign)} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-700" title={campaign.folder === 'spam' ? 'Move to inbox' : 'Move to spam'}>
                        <AlertTriangle size={15} />
                      </button>
                    ) : null}
                    <button type="button" onClick={() => deleteCampaign(campaign.id)} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700" title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {!filteredCampaigns.length ? (
              <div className="m-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">
                {activeMailbox === 'inbox' ? 'Inbox empty hai.' : 'Yahan koi email nahi hai.'}
              </div>
            ) : null}
          </section>
          )}

          {composeOpen ? (
            <section className="fixed bottom-4 right-4 z-50 max-h-[calc(100dvh-2rem)] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-slate-300 bg-white shadow-2xl">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-800 px-4 py-3 text-white">
                <span className="text-sm font-black">New Message</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={openSettings} className="grid size-8 place-items-center rounded-lg hover:bg-white/10" title="SMTP Settings">
                    <Settings2 size={16} />
                  </button>
                  <button type="button" onClick={() => setComposeOpen(false)} className="grid size-8 place-items-center rounded-lg hover:bg-white/10" title="Close">
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="grid gap-3 p-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Campaign Name</span>
                  <input className="mt-1 h-10 w-full border-b border-slate-200 text-sm font-semibold outline-none focus:border-rose-500" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Template</span>
                  <select className="mt-1 h-10 w-full border-b border-slate-200 bg-white text-sm font-semibold outline-none focus:border-rose-500" onChange={(event) => applyTemplate(event.target.value)} defaultValue={templates[0].id}>
                    {templates.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 border-t border-slate-100 px-4 py-3 md:grid-cols-[1fr_1fr_auto]">
                <input className="h-10 border-b border-slate-200 text-sm font-semibold outline-none focus:border-rose-500" placeholder="Customer Name" value={manualRecipient.name} onChange={(event) => setManualRecipient({ ...manualRecipient, name: event.target.value })} />
                <input type="email" className="h-10 border-b border-slate-200 text-sm font-semibold outline-none focus:border-rose-500" placeholder="Customer Email ID" value={manualRecipient.email} onChange={(event) => setManualRecipient({ ...manualRecipient, email: event.target.value })} />
                <button type="button" onClick={addManualRecipient} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-bold text-white">
                  <Plus size={16} />
                  Add
                </button>
              </div>

              <div className="border-t border-slate-100 px-4 py-3">
                <textarea className="min-h-20 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold leading-6 outline-none focus:border-rose-500" value={recipientRows} onChange={(event) => setRecipientRows(event.target.value)} />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => addRecipients(parseRecipients(recipientRows))} className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
                    <Upload size={15} />
                    Import Rows
                  </button>
                  <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
                    <Upload size={15} />
                    Upload Excel CSV
                    <input type="file" accept=".csv,text/csv,.txt" className="hidden" onChange={handleRecipientFile} />
                  </label>
                  <span className="flex h-9 items-center rounded-lg bg-rose-50 px-3 text-sm font-black text-rose-700">{draft.recipients.length} recipients</span>
                </div>
                {draft.recipients.length ? (
                  <div className="mt-2 flex max-h-20 flex-wrap gap-2 overflow-y-auto">
                    {draft.recipients.map((recipient) => (
                      <button key={recipient.email} type="button" onClick={() => removeRecipient(recipient.email)} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        {recipient.name} <span className="text-slate-400">{recipient.email}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="border-t border-slate-100 px-4 py-3 text-sm font-bold text-slate-600">
                To: {draft.recipients.length ? `${draft.recipients.length} customers selected` : 'Add customer email id above'}
              </div>
              <input className="h-12 w-full border-t border-slate-100 px-4 text-sm font-semibold outline-none focus:bg-slate-50" placeholder="Subject" value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} />
              <div className="grid gap-3 border-t border-slate-100 px-4 py-3 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Schedule Date & Time</span>
                  <input type="datetime-local" className="mt-1 h-10 w-full border-b border-slate-200 text-sm font-semibold outline-none focus:border-rose-500" value={draft.scheduledAt || ''} onChange={(event) => setDraft({ ...draft, scheduledAt: event.target.value })} />
                </label>
              </div>
              <textarea className="min-h-72 w-full border-t border-slate-100 px-4 py-3 text-sm font-semibold leading-7 outline-none focus:bg-slate-50" value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} />

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => saveCampaign('Draft')} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
                    <Save size={16} />
                    Save Draft
                  </button>
                  <button type="button" onClick={sendCampaignNow} disabled={sending} className="flex h-10 items-center gap-2 rounded-lg bg-rose-600 px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                    <Send size={16} />
                    {sending ? 'Sending...' : 'Send Now'}
                  </button>
                  <button type="button" onClick={() => saveCampaign('Ready')} className="flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white">
                    <CheckCircle2 size={16} />
                    Mark Ready
                  </button>
                  <button type="button" onClick={scheduleCampaign} className="flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-bold text-white">
                    <Clock3 size={16} />
                    Schedule
                  </button>
                </div>
                <span className="text-xs font-bold text-emerald-700">SMTP send API connected hai.</span>
              </div>
            </section>
          ) : null}

            {message ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{message}</p> : null}
        </div>
      </section>
    </main>
  )
}
