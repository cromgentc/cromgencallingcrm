import { ChevronDown, Filter, MoreHorizontal, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getClients } from '../controllers/clientController'
import { createLead as createLeadRecord, getLeads } from '../controllers/leadController'
import { getStaff } from '../controllers/staffController'
import {
  createLeadId,
  getSavedLeads,
  isLeadHidden,
  setSavedLeads as writeSavedLeads,
} from '../utils/leadStore'

const emptyLead = {
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
  leadSource: 'Website',
  leadOwner: 'Unassigned',
  status: 'Open',
  industry: '',
  city: '',
}

const systemFilters = ['All Leads', 'My Leads', 'Open Leads', 'Hot Leads', 'Today Leads']
const sources = ['Website', 'WhatsApp', 'LinkedIn', 'Referral', 'Cold Call', 'Campaign', 'Database se mila']
const owners = ['Unassigned', 'Admin', 'Manager', 'Team Leader', 'Sales Rep']

function readClients() {
  try {
    return JSON.parse(localStorage.getItem('calltrack_clients') || '[]')
  } catch {
    return []
  }
}

function createCandidateId() {
  return `CAND-${Date.now().toString(36).toUpperCase()}`
}

export default function LeadsView({ currentUser, onLeadSelect, refreshToken = 0 }) {
  const [savedLeads, setSavedLeadsState] = useState(() => getSavedLeads())
  const [clients, setClients] = useState(readClients)
  const [relatedAccounts, setRelatedAccounts] = useState([])

  useEffect(() => {
    setSavedLeadsState(getSavedLeads())
  }, [refreshToken])

  useEffect(() => {
    getLeads()
      .then((items) => setSavedLeadsState(items))
      .catch(() => setSavedLeadsState(getSavedLeads()))
  }, [refreshToken])

  useEffect(() => {
    getStaff()
      .then(setRelatedAccounts)
      .catch(() => setRelatedAccounts([]))
  }, [])

  useEffect(() => {
    getClients()
      .then((items) => {
        setClients(items)
        localStorage.setItem('calltrack_clients', JSON.stringify(items))
      })
      .catch(() => setClients(readClients()))
  }, [])
  const [form, setForm] = useState(emptyLead)
  const [createOpen, setCreateOpen] = useState(false)

  // Accordion controls
  const [filterOpen, setFilterOpen] = useState(true)
  const [systemOpen, setSystemOpen] = useState(true)
  const [fieldsOpen, setFieldsOpen] = useState(true)
  const [relatedOpen, setRelatedOpen] = useState(true)

  const [sortOpen, setSortOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [systemFilter, setSystemFilter] = useState('All Leads')
  const [fieldFilter, setFieldFilter] = useState({ source: 'All', owner: 'All', status: 'All' })
  const [relatedFilter, setRelatedFilter] = useState('All')
  const [sortBy, setSortBy] = useState('Newest')

  const leads = useMemo(() => savedLeads.filter((lead) => !isLeadHidden(lead.id)), [savedLeads])
  const companyOptions = useMemo(
    () => ['', ...new Set(clients.map((client) => client.companyName).filter(Boolean))],
    [clients],
  )
  const ownerOptions = useMemo(() => {
    if (currentUser?.role === 'staff') {
      const hierarchyNames = relatedAccounts
        .filter((account) => ['manager', 'teamleader'].includes(account.role))
        .map((account) => account.name)
        .filter(Boolean)

      return ['Unassigned', currentUser?.name, ...hierarchyNames].filter(Boolean)
    }

    return ['Unassigned', currentUser?.name, ...relatedAccounts.map((account) => account.name), ...owners].filter(Boolean)
  }, [currentUser?.name, currentUser?.role, relatedAccounts])

  const filteredLeads = useMemo(() => {
    const searched = leads.filter((lead) =>
      `${lead.leadName} ${lead.company} ${lead.email} ${lead.phone} ${lead.leadSource} ${lead.leadOwner}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )

    const filtered = searched.filter((lead) => {
      const bySystem =
        systemFilter === 'All Leads' ||
        (systemFilter === 'My Leads' && lead.leadOwner !== 'Unassigned') ||
        (systemFilter === 'Open Leads' && lead.status === 'Open') ||
        (systemFilter === 'Hot Leads' && /hot|interested/i.test(lead.status)) ||
        (systemFilter === 'Today Leads' && new Date(lead.createdAt).toDateString() === new Date().toDateString())

      const bySource = fieldFilter.source === 'All' || lead.leadSource === fieldFilter.source
      const byOwner = fieldFilter.owner === 'All' || lead.leadOwner === fieldFilter.owner
      const byStatus = fieldFilter.status === 'All' || lead.status === fieldFilter.status
      const byRelated = relatedFilter === 'All' || (relatedFilter === 'With Company' ? Boolean(lead.company) : Boolean(lead.phone))

      return bySystem && bySource && byOwner && byStatus && byRelated
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'Lead Name') return a.leadName.localeCompare(b.leadName)
      if (sortBy === 'Company') return a.company.localeCompare(b.company)
      if (sortBy === 'Owner') return a.leadOwner.localeCompare(b.leadOwner)
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
  }, [fieldFilter, leads, relatedFilter, search, sortBy, systemFilter])

  async function createLead(event) {
    event.preventDefault()

    const lead = {
      ...form,
      id: createLeadId(),
      candidateId: form.candidateId || createCandidateId(),
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.id,
      leadOwner: form.leadOwner === 'Unassigned' ? currentUser?.name || 'Unassigned' : form.leadOwner,
      locked: false,
    }

    let created = lead
    try {
      created = await createLeadRecord(lead)
    } catch {
      writeSavedLeads([lead, ...savedLeads])
    }

    const next = [created, ...savedLeads]
    setSavedLeadsState(next)
    setForm(emptyLead)
    setCreateOpen(false)
  }

  return (
    <section className="min-h-0 rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-950">All Leads</h2>
          <p className="text-sm font-semibold text-slate-500">
            {filteredLeads.length} of {leads.length} leads
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterOpen((current) => !current)}
            className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 lg:hidden"
          >
            <Filter size={16} />
            Filter
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setSortOpen((current) => !current)}
              className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700"
            >
              <SlidersHorizontal size={16} />
              Sort
            </button>
            {sortOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
                {['Newest', 'Lead Name', 'Company', 'Owner'].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setSortBy(item)
                      setSortOpen(false)
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm font-bold ${
                      sortBy === item ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex h-10 items-center gap-2 rounded-lg bg-teal-600 px-3 text-sm font-bold text-white"
          >
            <Plus size={16} />
            Create Lead
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-700"
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
                {['Import Leads', 'Export View', 'Mass Update'].map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr] lg:gap-6">
        <aside
          className={`${
            filterOpen ? 'block' : 'hidden'
          } rounded-lg bg-slate-50 p-4 lg:p-4`}
          aria-label="Lead filters"
        >
          <button
            type="button"
            onClick={() => setFilterOpen((current) => !current)}
            className="flex w-full items-center justify-between gap-3"
          >
            <p className="text-sm font-black text-slate-950">Filter Leads by</p>
            <ChevronDown
              size={18}
              className={`${filterOpen ? 'rotate-180' : ''} transform text-slate-500`}
            />
          </button>

          <div className="mt-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:border-teal-500"
                placeholder="Search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <FilterSection
            open={systemOpen}
            onToggle={() => setSystemOpen((v) => !v)}
            title="System Defined Filters"
          >
            <div className="mt-2 flex flex-wrap gap-2">
              {systemFilters.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSystemFilter(item)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    systemFilter === item ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </FilterSection>

          <FilterSection
            open={fieldsOpen}
            onToggle={() => setFieldsOpen((v) => !v)}
            title="Filter By Fields"
          >
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <Select
                label="Source"
                value={fieldFilter.source}
                onChange={(value) => setFieldFilter({ ...fieldFilter, source: value })}
                options={['All', ...sources]}
              />
              <Select
                label="Owner"
                value={fieldFilter.owner}
                onChange={(value) => setFieldFilter({ ...fieldFilter, owner: value })}
                options={['All', ...owners]}
              />
              <Select
                label="Status"
                value={fieldFilter.status}
                onChange={(value) => setFieldFilter({ ...fieldFilter, status: value })}
                options={['All', 'Open', 'Interested', 'Hot Lead', 'Callback', 'Closed']}
              />
            </div>
          </FilterSection>

          <FilterSection
            open={relatedOpen}
            onToggle={() => setRelatedOpen((v) => !v)}
            title="Filter By Related Mod"
          >
            <div className="mt-2 flex flex-wrap gap-2">
              {['All', 'With Company', 'With Phone'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setRelatedFilter(item)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    relatedFilter === item
                      ? 'bg-slate-950 text-white'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </FilterSection>
        </aside>

        <div className="min-w-0">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left">
              <thead className="border-b border-slate-100 bg-white text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Lead Name All</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Lead Source</th>
                  <th className="px-4 py-3">Lead Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onLeadSelect?.(lead)}
                        className="font-bold text-slate-950 hover:text-teal-700"
                      >
                        {lead.leadName}
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onLeadSelect?.(lead)}
                        className="text-sm font-semibold text-slate-700 hover:text-teal-700"
                      >
                        {lead.company}
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onLeadSelect?.(lead)}
                        className="text-sm text-slate-600 hover:text-teal-700"
                      >
                        {lead.email || '-'}
                      </button>
                    </td>

                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">{lead.phone || '-'}</td>

                    <td className="px-4 py-3">
                      <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700">
                        {lead.leadSource}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">{lead.leadOwner}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!filteredLeads.length ? (
              <p className="px-4 py-8 text-center text-sm font-bold text-slate-500">No leads found.</p>
            ) : null}
          </div>
        </div>
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/40 px-4">
          <form onSubmit={createLead} className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xl font-black text-slate-950">Create Lead</h3>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="grid size-9 place-items-center rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input required label="Full Name" value={form.leadName} onChange={(value) => setForm({ ...form, leadName: value })} />
              <Select label="Company Name" value={form.company} onChange={(value) => setForm({ ...form, company: value })} options={companyOptions} />
              <Input label="Email ID" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
              <Input label="Phone Number" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
              <Input label="Position / Role Applied For" value={form.positionRole} onChange={(value) => setForm({ ...form, positionRole: value })} />
              <Input label="Location (City)" value={form.city} onChange={(value) => setForm({ ...form, city: value })} />
              <Input type="datetime-local" label="Interview Date & Time" value={form.interviewDateTime} onChange={(value) => setForm({ ...form, interviewDateTime: value })} />
              <Input disabled label="Candidate ID" value={form.candidateId || 'Auto generated'} onChange={() => {}} />
              <Input label="Qualification / Education" value={form.qualification} onChange={(value) => setForm({ ...form, qualification: value })} />
              <Input label="Skills" value={form.skills} onChange={(value) => setForm({ ...form, skills: value })} />
              <Input label="Resume / CV Upload Link" value={form.resumeUrl} onChange={(value) => setForm({ ...form, resumeUrl: value })} />
              <Input label="Experience" value={form.experience} onChange={(value) => setForm({ ...form, experience: value })} />
              <Select label="Lead Source" value={form.leadSource} onChange={(value) => setForm({ ...form, leadSource: value })} options={sources} />
              <Select label="Lead Owner" value={form.leadOwner} onChange={(value) => setForm({ ...form, leadOwner: value })} options={[...new Set(ownerOptions)]} />
              <Input label="Industry" value={form.industry} onChange={(value) => setForm({ ...form, industry: value })} />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setCreateOpen(false)} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700">
                Cancel
              </button>
              <button type="submit" className="h-10 rounded-lg bg-teal-600 px-4 text-sm font-bold text-white">
                Save Lead
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  )
}

function FilterSection({ open, onToggle, title, children }) {
  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
        <ChevronDown size={18} className={`${open ? 'rotate-180' : ''} transform text-slate-400`} />
      </button>
      {open ? <div className="mt-2">{children}</div> : null}
    </div>
  )
}

function Input({ label, value, onChange, required = false, type = 'text', disabled = false }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        required={required}
        type={type}
        disabled={disabled}
        className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-teal-500"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="relative mt-1 block">
        <select
          className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm font-semibold outline-none focus:border-teal-500"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option} value={option}>{option || 'Select company'}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      </span>
    </label>
  )
}
