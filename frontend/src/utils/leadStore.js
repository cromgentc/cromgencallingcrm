export const LEADS_STORAGE_KEY = 'calltrack_crm_leads'
export const LEADS_HIDDEN_STORAGE_KEY = 'calltrack_crm_leads_hidden'

const emptyArray = []

function safeReadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function safeWriteJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function currentUserStorageKey(baseKey) {
  try {
    const user = JSON.parse(localStorage.getItem('calltrack_user') || '{}')
    const userKey = user?.id || user?.staffId || user?.email || 'anonymous'
    return `${baseKey}:${userKey}`
  } catch {
    return `${baseKey}:anonymous`
  }
}

export function getSavedLeads() {
  return safeReadJson(currentUserStorageKey(LEADS_STORAGE_KEY), emptyArray)
}

export function setSavedLeads(nextLeads) {
  safeWriteJson(currentUserStorageKey(LEADS_STORAGE_KEY), Array.isArray(nextLeads) ? nextLeads : emptyArray)
}

export function getHiddenLeadIds() {
  return safeReadJson(currentUserStorageKey(LEADS_HIDDEN_STORAGE_KEY), emptyArray)
}

export function setHiddenLeadIds(nextIds) {
  safeWriteJson(currentUserStorageKey(LEADS_HIDDEN_STORAGE_KEY), Array.isArray(nextIds) ? nextIds : emptyArray)
}

export function isLeadHidden(leadId) {
  if (!leadId) return false
  return getHiddenLeadIds().includes(leadId)
}

export function hideLead(leadId) {
  if (!leadId) return
  const current = getHiddenLeadIds()
  if (!current.includes(leadId)) setHiddenLeadIds([leadId, ...current])
}

export function unhideLead(leadId) {
  if (!leadId) return
  const current = getHiddenLeadIds()
  setHiddenLeadIds(current.filter((id) => id !== leadId))
}

export function upsertSavedLead(lead) {
  if (!lead || !lead.id) return
  const current = getSavedLeads()
  const idx = current.findIndex((x) => x.id === lead.id)
  const next = idx === -1 ? [lead, ...current] : current.map((x) => (x.id === lead.id ? lead : x))
  setSavedLeads(next)
  return lead
}

export function deleteSavedLead(leadId) {
  if (!leadId) return
  const next = getSavedLeads().filter((l) => l.id !== leadId)
  setSavedLeads(next)
}

export function getSavedLeadById(leadId) {
  if (!leadId) return null
  return getSavedLeads().find((l) => l.id === leadId) || null
}

export function createLeadId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `lead-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function cloneLeadForDuplicate(lead) {
  if (!lead) return null
  return {
    ...lead,
    id: createLeadId(),
    createdAt: new Date().toISOString(),
    locked: false,
  }
}

export function ensureEditableLeadFromLead(lead) {
  // If lead is locked (coming from calls), create a new saved record for editing.
  if (!lead) return null
  if (!lead.locked) return lead

  const { locked, ...rest } = lead
  const created = {
    ...rest,
    id: createLeadId(),
    createdAt: new Date().toISOString(),
    locked: false,
  }
  upsertSavedLead(created)
  hideLead(lead.id)
  return created
}

export function copyLeadSharePayload(lead) {
  const payload = {
    id: lead?.id,
    leadName: lead?.leadName,
    company: lead?.company,
    email: lead?.email,
    phone: lead?.phone,
    positionRole: lead?.positionRole,
    interviewDateTime: lead?.interviewDateTime,
    candidateId: lead?.candidateId,
    qualification: lead?.qualification,
    skills: lead?.skills,
    resumeUrl: lead?.resumeUrl,
    experience: lead?.experience,
    leadSource: lead?.leadSource,
    leadOwner: lead?.leadOwner,
    status: lead?.status,
    industry: lead?.industry,
    city: lead?.city,
    createdAt: lead?.createdAt,
  }

  return JSON.stringify(payload, null, 2)
}
