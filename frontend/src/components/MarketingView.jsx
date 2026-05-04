import { useMemo, useState } from 'react'
import { CheckCircle2, Clock3, Mail, MessageSquare, Plus, Save, Settings2, Trash2, Upload, Users } from 'lucide-react'
import { readUserJson, writeUserJson } from '../utils/userStorage'

const storageKey = 'calltrack_marketing_campaigns'

const emailTemplates = [
  { id: 'intro', label: 'Intro', subject: 'Quick follow-up from CromGen', body: 'Hi {{name}}, thank you for connecting with us. We would love to help with your requirement.' },
  { id: 'callback', label: 'Callback', subject: 'Your callback request', body: 'Hi {{name}}, we have noted your callback request. Our team will contact you at the selected time.' },
  { id: 'offer', label: 'Offer', subject: 'Special offer for your business', body: 'Hi {{name}}, sharing a short offer that may be useful for your team. Reply to this email to know more.' },
]

const smsTemplates = [
  { id: 'intro', label: 'Intro', body: 'Hi {{name}}, CromGen team tried reaching you. Reply YES for a callback.' },
  { id: 'callback', label: 'Callback', body: 'Hi {{name}}, your callback is noted. Our team will call you shortly.' },
  { id: 'offer', label: 'Offer', body: 'Hi {{name}}, CromGen has an update for you. Call us back for details.' },
]

const audienceSegments = ['All Leads', 'Interested', 'Hot Lead', 'Callback', 'No Response']

const recipientSample = 'name,email\nRahul Sharma,rahul@example.com\nPriya Singh,priya@example.com'

function initialDraft(channel) {
  return {
    channel,
    name: channel === 'email' ? 'Email Follow-up' : 'SMS Follow-up',
    audience: 'Interested',
    subject: channel === 'email' ? emailTemplates[0].subject : '',
    body: channel === 'email' ? emailTemplates[0].body : smsTemplates[0].body,
    recipients: [],
    status: 'Draft',
  }
}

function loadCampaigns() {
  return readUserJson(storageKey, [])
}

function campaignTone(status) {
  if (status === 'Scheduled') return 'bg-sky-50 text-sky-700 ring-1 ring-sky-100'
  if (status === 'Ready') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
  return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
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

export default function MarketingView({ view, onNavigate }) {
  const channel = view === 'marketing-sms' ? 'sms' : 'email'
  const isEmail = channel === 'email'
  const [campaigns, setCampaigns] = useState(loadCampaigns)
  const [draft, setDraft] = useState(() => initialDraft(channel))
  const [recipientRows, setRecipientRows] = useState(recipientSample)
  const [manualRecipient, setManualRecipient] = useState({ name: '', email: '' })
  const [message, setMessage] = useState('')

  const templates = isEmail ? emailTemplates : smsTemplates
  const visibleCampaigns = useMemo(() => campaigns.filter((campaign) => campaign.channel === channel), [campaigns, channel])
  const bodyLength = draft.body.length
  const smsParts = Math.max(1, Math.ceil(bodyLength / 160))

  function persist(nextCampaigns) {
    setCampaigns(nextCampaigns)
    writeUserJson(storageKey, nextCampaigns)
  }

  function applyTemplate(templateId) {
    const template = templates.find((item) => item.id === templateId)
    if (!template) return

    setDraft((current) => ({
      ...current,
      subject: isEmail ? template.subject : current.subject,
      body: template.body,
    }))
  }

  function saveCampaign(status = 'Draft') {
    if (!draft.name.trim() || !draft.body.trim()) {
      setMessage('Campaign name aur message required hai.')
      return
    }

    if (isEmail && !draft.recipients.length) {
      setMessage('Email bhejne ke liye customer name aur email id add karo.')
      return
    }

    const nextCampaign = {
      ...draft,
      id: `${channel}-${Date.now()}`,
      status,
      updatedAt: new Date().toISOString(),
    }
    persist([nextCampaign, ...campaigns])
    setDraft(initialDraft(channel))
    setMessage(`${isEmail ? 'Email' : 'SMS'} campaign ${status.toLowerCase()} mein save ho gaya.`)
  }

  function deleteCampaign(campaignId) {
    persist(campaigns.filter((campaign) => campaign.id !== campaignId))
  }

  function addManualRecipient() {
    const name = manualRecipient.name.trim()
    const email = manualRecipient.email.trim()

    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage('Valid customer name aur email id dalo.')
      return
    }

    setDraft((current) => ({
      ...current,
      recipients: [...current.recipients, { name, email }],
    }))
    setManualRecipient({ name: '', email: '' })
    setMessage('Customer email list mein add ho gaya.')
  }

  function importRecipients(rows = recipientRows) {
    const recipients = parseRecipients(rows)

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

  function removeRecipient(email) {
    setDraft((current) => ({
      ...current,
      recipients: current.recipients.filter((recipient) => recipient.email !== email),
    }))
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
      importRecipients(rows)
      event.target.value = ''
    }
    reader.readAsText(file)
  }

  function openGatewaySettings() {
    writeUserJson('calltrack_settings_open', isEmail ? 'emailSmtp' : 'smsGateway')
    onNavigate?.('settings')
  }

  return (
    <section className="min-h-0 space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className={`grid size-11 place-items-center rounded-lg ${isEmail ? 'bg-teal-50 text-teal-700' : 'bg-sky-50 text-sky-700'}`}>
                {isEmail ? <Mail size={22} /> : <MessageSquare size={22} />}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-teal-700">Marketing</p>
                <h2 className="truncate text-2xl font-black text-slate-950">{isEmail ? 'Email Marketing' : 'SMS Marketing'}</h2>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-bold uppercase text-slate-500">Drafts</p>
              <p className="text-xl font-black text-slate-950">{visibleCampaigns.filter((item) => item.status === 'Draft').length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-bold uppercase text-slate-500">Ready</p>
              <p className="text-xl font-black text-slate-950">{visibleCampaigns.filter((item) => item.status === 'Ready').length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-bold uppercase text-slate-500">Total</p>
              <p className="text-xl font-black text-slate-950">{visibleCampaigns.length}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Campaign Name</span>
              <input className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-teal-500" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Audience</span>
              <select className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-teal-500" value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value })}>
                {audienceSegments.map((segment) => <option key={segment}>{segment}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Template</span>
              <select className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-teal-500" onChange={(event) => applyTemplate(event.target.value)} defaultValue={templates[0].id}>
                {templates.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}
              </select>
            </label>
            {isEmail ? (
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Subject</span>
                <input className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-teal-500" value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} />
              </label>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">SMS Length</p>
                <p className="mt-1 text-sm font-black text-slate-950">{bodyLength} chars / {smsParts} part{smsParts === 1 ? '' : 's'}</p>
              </div>
            )}
          </div>

          {isEmail ? (
            <section className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Customer Name</span>
                  <input className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-teal-500" value={manualRecipient.name} onChange={(event) => setManualRecipient({ ...manualRecipient, name: event.target.value })} />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Customer Email ID</span>
                  <input type="email" className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-teal-500" value={manualRecipient.email} onChange={(event) => setManualRecipient({ ...manualRecipient, email: event.target.value })} />
                </label>
                <button type="button" onClick={addManualRecipient} className="mt-5 flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-bold text-white">
                  <Plus size={16} />
                  Add
                </button>
              </div>

              <label className="mt-3 block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Bulk Email CSV</span>
                <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold leading-6 outline-none focus:border-teal-500" value={recipientRows} onChange={(event) => setRecipientRows(event.target.value)} />
              </label>

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => importRecipients()} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
                  <Upload size={16} />
                  Import Rows
                </button>
                <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
                  <Upload size={16} />
                  Upload Excel CSV
                  <input type="file" accept=".csv,text/csv,.txt" className="hidden" onChange={handleRecipientFile} />
                </label>
                <span className="flex h-10 items-center rounded-lg bg-white px-3 text-sm font-black text-slate-700">{draft.recipients.length} recipients</span>
              </div>

              {draft.recipients.length ? (
                <div className="mt-3 flex max-h-24 flex-wrap gap-2 overflow-y-auto">
                  {draft.recipients.map((recipient) => (
                    <button key={recipient.email} type="button" onClick={() => removeRecipient(recipient.email)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs font-bold text-slate-700" title="Remove recipient">
                      {recipient.name} <span className="text-slate-400">{recipient.email}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {isEmail ? (
            <section className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-3 py-2 text-sm font-bold text-slate-600">
                To: {draft.recipients.length ? `${draft.recipients.length} customers selected` : 'Add customer email id above'}
              </div>
              <div className="border-b border-slate-100 px-3 py-2 text-sm font-bold text-slate-600">
                Subject: {draft.subject || 'Email subject'}
              </div>
              <textarea className="min-h-72 w-full resize-y px-4 py-3 text-sm font-semibold leading-7 outline-none focus:bg-slate-50" value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} />
            </section>
          ) : (
            <label className="mt-3 block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Message</span>
              <textarea className="mt-1 min-h-44 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold leading-6 outline-none focus:border-teal-500" value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} />
            </label>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => saveCampaign('Draft')} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
              <Save size={16} />
              Save Draft
            </button>
            <button type="button" onClick={() => saveCampaign('Ready')} className="flex h-10 items-center gap-2 rounded-lg bg-teal-600 px-3 text-sm font-bold text-white">
              <CheckCircle2 size={16} />
              Mark Ready
            </button>
            <button type="button" onClick={() => saveCampaign('Scheduled')} className="flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-bold text-white">
              <Clock3 size={16} />
              Schedule
            </button>
          </div>

          {message ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{message}</p> : null}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-black text-slate-950">Campaign Queue</h3>
              <p className="text-sm font-semibold text-slate-500">{isEmail ? 'Email' : 'SMS'} campaigns</p>
            </div>
            <Users className="text-slate-400" size={20} />
          </div>

          <div className="mt-3 space-y-3">
            {visibleCampaigns.map((campaign) => (
              <article key={campaign.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-950">{campaign.name}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{campaign.audience}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${campaignTone(campaign.status)}`}>{campaign.status}</span>
                </div>
                {campaign.subject ? <p className="mt-2 truncate text-sm font-bold text-slate-700">{campaign.subject}</p> : null}
                {isEmail ? <p className="mt-1 text-xs font-bold text-slate-500">{campaign.recipients?.length || 0} customer emails</p> : null}
                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">{campaign.body}</p>
                <div className="mt-3 flex justify-between gap-2">
                  <span className="text-xs font-bold text-slate-400">{new Date(campaign.updatedAt).toLocaleString('en-IN')}</span>
                  <button type="button" onClick={() => deleteCampaign(campaign.id)} className="grid size-8 place-items-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700" title="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))}

            {!visibleCampaigns.length ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-bold text-slate-500">
                No campaigns saved yet.
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Sending gateway abhi connect nahi hai. Settings mein {isEmail ? 'Email SMTP Gateway' : 'SMS Gateway'} add karo; provider connect hone ke baad actual send API add hoga.
        </span>
        <button type="button" onClick={openGatewaySettings} className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-700 px-3 text-sm font-black text-white">
          <Settings2 size={16} />
          Open Gateway Settings
        </button>
      </section>
    </section>
  )
}
