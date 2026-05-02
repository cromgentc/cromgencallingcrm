import { MoreHorizontal, Mail, Pencil, ArrowLeftRight, Link as LinkIcon, Trash2, Copy } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  cloneLeadForDuplicate,
  copyLeadSharePayload,
  deleteSavedLead,
  ensureEditableLeadFromLead,
  hideLead,
  upsertSavedLead,
} from '../utils/leadStore'

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{value || '-'}</p>
    </div>
  )
}

function normalizeLead(lead) {
  const defaultLead = {
    id: '',
    leadName: '',
    company: '',
    email: '',
    phone: '',
    positionRole: '',
    interviewDateTime: '',
    candidateId: '',
    qualification: '',
    skills: '',
    resumeUrl: '',
    experience: '',
    leadSource: '',
    leadOwner: '',
    status: '',
    industry: '',
    city: '',
    title: '',
    annualRevenue: '',
    emailOptOut: '',
    modifiedBy: '',
    fax: '',
    website: '',
    employees: '',
    rating: '',
    createdBy: '',
    skypeId: '',
    secondaryEmail: '',
    twitter: '',
    connectedTo: '',
    address: '',
    description: '',
    locked: false,
  }

  return { ...defaultLead, ...(lead || {}) }
}

function TextInput({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-teal-500"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <textarea
        className="mt-1 min-h-[96px] w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-teal-500"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function readClients() {
  try {
    return JSON.parse(localStorage.getItem('calltrack_clients') || '[]')
  } catch {
    return []
  }
}

function TextSelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <select
        className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-teal-500"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option || 'Select company'}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function LeadDetailPage({ lead, onBack, onLeadStoreMutation, onLeadChange, onLeadDeleted }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [clients] = useState(readClients)

  const normalizedLead = useMemo(() => normalizeLead(lead), [lead])

  const headerTitle = normalizedLead.leadName || normalizedLead.company || 'Lead Details'

  const [draft, setDraft] = useState(normalizedLead)
  const [draftKey, setDraftKey] = useState(normalizedLead.id)

  // Keep draft synced when lead changes (unless user is editing).
  if (normalizedLead.id !== draftKey && !editOpen) {
    setDraftKey(normalizedLead.id)
    setDraft(normalizedLead)
  }

  async function handleShare() {
    try {
      const payload = copyLeadSharePayload(normalizedLead)
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload)
      } else {
        // Fallback
        const ta = document.createElement('textarea')
        ta.value = payload
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 1200)
    } catch {
      setShareCopied(false)
      // No toast system in this project; keep silent.
    }
  }

  function handleDuplicate() {
    const baseEditable = ensureEditableLeadFromLead(normalizedLead) || normalizedLead
    const duplicate = cloneLeadForDuplicate(baseEditable)

    if (!duplicate) return

    upsertSavedLead(duplicate)
    onLeadStoreMutation?.()
    onLeadChange?.(duplicate)
    setMenuOpen(false)
  }

  function handleDelete() {
    if (normalizedLead.locked) {
      hideLead(normalizedLead.id)
    } else {
      deleteSavedLead(normalizedLead.id)
    }

    onLeadStoreMutation?.()
    onLeadDeleted?.()
    setMenuOpen(false)
  }

  function handleEditOpen() {
    const editable = ensureEditableLeadFromLead(normalizedLead)
    const nextDraft = editable || normalizedLead

    setDraftKey(nextDraft.id)
    setDraft(nextDraft)
    setEditOpen(true)
    onLeadChange?.(nextDraft) // update selected lead id if we converted locked call lead
    setMenuOpen(false)
  }

  function handleEditSave() {
    const toSave = {
      ...draft,
      locked: false,
      // Ensure lead id exists for upsert; if somehow missing, bail.
      id: draft?.id,
    }

    if (!toSave.id) return

    upsertSavedLead(toSave)
    onLeadStoreMutation?.()
    onLeadChange?.(toSave)
    setEditOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
        >
          Back
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-lg border border-teal-500/30 bg-teal-50 px-3 text-sm font-bold text-teal-800"
            onClick={() => {
              // send email exists in UI, but not implemented for lead store in this app.
              // Keep button for future; no-op.
            }}
          >
            <Mail size={16} />
            Send Email
          </button>

          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
            onClick={() => {
              // Convert exists in UI, but not wired to lead store in this app.
              // Keep button for future; no-op.
            }}
          >
            <ArrowLeftRight size={16} />
            Convert
          </button>

          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
            onClick={handleEditOpen}
          >
            <Pencil size={16} />
            Edit
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700"
              aria-label="More actions"
            >
              <MoreHorizontal size={18} />
            </button>

            {menuOpen ? (
              <div className="absolute right-0 z-30 mt-2 w-52 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-600 hover:bg-slate-50"
                  onClick={handleDuplicate}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-600 hover:bg-slate-50"
                  onClick={() => {
                    setMenuOpen(false)
                    handleShare()
                  }}
                >
                  <Copy size={16} />
                  {shareCopied ? 'Copied' : 'Share'}
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-rose-600 hover:bg-rose-50"
                  onClick={handleDelete}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-950">{headerTitle}</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {normalizedLead.company ? `Company: ${normalizedLead.company}` : '—'}{' '}
              {normalizedLead.industry ? `• Industry: ${normalizedLead.industry}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
              {normalizedLead.status || 'Lost Lead'}
            </span>
            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
              Owner: {normalizedLead.leadOwner || 'Unassigned'}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
          <div>
            <h2 className="text-sm font-black text-slate-950">Lead Information</h2>

            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Candidate ID" value={normalizedLead.candidateId} />
              <Field label="Full Name" value={normalizedLead.leadName} />
              <Field label="Email ID" value={normalizedLead.email} />
              <Field label="Phone Number" value={normalizedLead.phone} />
              <Field label="Position / Role Applied For" value={normalizedLead.positionRole} />
              <Field label="Location (City)" value={normalizedLead.city} />
              <Field label="Interview Date & Time" value={normalizedLead.interviewDateTime} />
              <Field label="Qualification / Education" value={normalizedLead.qualification} />
              <Field label="Skills" value={normalizedLead.skills} />
              <Field label="Resume / CV Upload Link" value={normalizedLead.resumeUrl} />
              <Field label="Experience" value={normalizedLead.experience} />
              <Field label="Company Name" value={normalizedLead.company} />
              <Field label="Lead Owner" value={normalizedLead.leadOwner} />
              <Field label="Lead Source" value={normalizedLead.leadSource} />
              <Field label="Industry" value={normalizedLead.industry} />
              <Field label="Title" value={normalizedLead.title} />
              <Field label="Mobile" value={normalizedLead.mobile} />
              <Field label="Annual Revenue" value={normalizedLead.annualRevenue} />
              <Field label="Email Opt Out" value={normalizedLead.emailOptOut} />
              <Field label="Modified By" value={normalizedLead.modifiedBy} />
              <Field label="Fax" value={normalizedLead.fax} />
              <Field label="Website" value={normalizedLead.website} />
              <Field label="No. of Employees" value={normalizedLead.employees} />
              <Field label="Rating" value={normalizedLead.rating} />
              <Field label="Created By" value={normalizedLead.createdBy} />
              <Field label="Skype ID" value={normalizedLead.skypeId} />
              <Field label="Secondary Email" value={normalizedLead.secondaryEmail} />
              <Field label="Twitter" value={normalizedLead.twitter} />
              <Field label="Connected To" value={normalizedLead.connectedTo} />
              <Field label="Address" value={normalizedLead.address} />
              <Field label="Description" value={normalizedLead.description} />
            </div>
          </div>

          <aside className="rounded-lg bg-slate-50 p-3">
            <p className="text-sm font-black text-slate-950">Locate Map</p>
            <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-600">
                {normalizedLead.address ? `Address: ${normalizedLead.address}` : 'No address provided.'}
              </p>
              <div className="mt-3 flex gap-2">
                <button type="button" className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                  View Map
                </button>
                <button type="button" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                  <LinkIcon size={16} />
                  Copy
                </button>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</p>
              <p className="mt-1 text-sm font-bold text-slate-700">{normalizedLead.status || 'Lost Lead'}</p>

              <div className="mt-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Created</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {normalizedLead.createdAt ? new Date(normalizedLead.createdAt).toLocaleString() : '-'}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {editOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 px-4 py-6">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleEditSave()
            }}
            className="flex max-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-xl font-black text-slate-950">Edit Lead</h3>
              <button type="button" onClick={() => setEditOpen(false)} className="grid size-9 place-items-center rounded-lg hover:bg-slate-100">
                <MoreHorizontal size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput label="Full Name" value={draft.leadName} onChange={(v) => setDraft((d) => ({ ...d, leadName: v }))} />
              <TextSelect label="Company Name" value={draft.company} options={['', ...clients.map((client) => client.companyName).filter(Boolean)]} onChange={(v) => setDraft((d) => ({ ...d, company: v }))} />
              <TextInput label="Email ID" value={draft.email} onChange={(v) => setDraft((d) => ({ ...d, email: v }))} />
              <TextInput label="Phone Number" value={draft.phone} onChange={(v) => setDraft((d) => ({ ...d, phone: v }))} />
              <TextInput label="Position / Role Applied For" value={draft.positionRole} onChange={(v) => setDraft((d) => ({ ...d, positionRole: v }))} />
              <TextInput label="Location (City)" value={draft.city} onChange={(v) => setDraft((d) => ({ ...d, city: v }))} />
              <TextInput label="Interview Date & Time" value={draft.interviewDateTime} onChange={(v) => setDraft((d) => ({ ...d, interviewDateTime: v }))} />
              <TextInput label="Candidate ID" value={draft.candidateId} onChange={(v) => setDraft((d) => ({ ...d, candidateId: v }))} />
              <TextInput label="Qualification / Education" value={draft.qualification} onChange={(v) => setDraft((d) => ({ ...d, qualification: v }))} />
              <TextInput label="Skills" value={draft.skills} onChange={(v) => setDraft((d) => ({ ...d, skills: v }))} />
              <TextInput label="Resume / CV Upload Link" value={draft.resumeUrl} onChange={(v) => setDraft((d) => ({ ...d, resumeUrl: v }))} />
              <TextInput label="Experience" value={draft.experience} onChange={(v) => setDraft((d) => ({ ...d, experience: v }))} />
              <TextInput label="Lead Source" value={draft.leadSource} onChange={(v) => setDraft((d) => ({ ...d, leadSource: v }))} />
              <TextInput label="Lead Owner" value={draft.leadOwner} onChange={(v) => setDraft((d) => ({ ...d, leadOwner: v }))} />
              <TextInput label="Status" value={draft.status} onChange={(v) => setDraft((d) => ({ ...d, status: v }))} />
              <TextInput label="Industry" value={draft.industry} onChange={(v) => setDraft((d) => ({ ...d, industry: v }))} />

              <TextInput label="Title" value={draft.title} onChange={(v) => setDraft((d) => ({ ...d, title: v }))} />
              <TextInput label="Annual Revenue" value={draft.annualRevenue} onChange={(v) => setDraft((d) => ({ ...d, annualRevenue: v }))} />
              <TextInput label="Email Opt Out" value={draft.emailOptOut} onChange={(v) => setDraft((d) => ({ ...d, emailOptOut: v }))} />
              <TextInput label="Fax" value={draft.fax} onChange={(v) => setDraft((d) => ({ ...d, fax: v }))} />
              <TextInput label="Website" value={draft.website} onChange={(v) => setDraft((d) => ({ ...d, website: v }))} />
              <TextInput label="No. of Employees" value={draft.employees} onChange={(v) => setDraft((d) => ({ ...d, employees: v }))} />
              <TextInput label="Rating" value={draft.rating} onChange={(v) => setDraft((d) => ({ ...d, rating: v }))} />
              <TextInput label="Skype ID" value={draft.skypeId} onChange={(v) => setDraft((d) => ({ ...d, skypeId: v }))} />

              <TextInput
                label="Secondary Email"
                value={draft.secondaryEmail}
                onChange={(v) => setDraft((d) => ({ ...d, secondaryEmail: v }))}
              />
              <TextInput
                label="Twitter"
                value={draft.twitter}
                onChange={(v) => setDraft((d) => ({ ...d, twitter: v }))}
              />
              <TextInput
                label="Connected To"
                value={draft.connectedTo}
                onChange={(v) => setDraft((d) => ({ ...d, connectedTo: v }))}
              />
              <TextInput label="Mobile" value={draft.mobile} onChange={(v) => setDraft((d) => ({ ...d, mobile: v }))} />
              <TextInput label="Created By" value={draft.createdBy} onChange={(v) => setDraft((d) => ({ ...d, createdBy: v }))} />
              <TextInput label="Modified By" value={draft.modifiedBy} onChange={(v) => setDraft((d) => ({ ...d, modifiedBy: v }))} />

              <TextInput label="Address" value={draft.address} onChange={(v) => setDraft((d) => ({ ...d, address: v }))} />
              <TextArea label="Description" value={draft.description} onChange={(v) => setDraft((d) => ({ ...d, description: v }))} />
            </div>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button type="button" onClick={() => setEditOpen(false)} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700">
                Cancel
              </button>
              <button type="submit" className="h-10 rounded-lg bg-teal-600 px-4 text-sm font-bold text-white">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
