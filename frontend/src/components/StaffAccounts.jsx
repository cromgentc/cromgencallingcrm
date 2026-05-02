import { useEffect, useMemo, useState } from 'react'
import { Edit3, Plus, Trash2, X } from 'lucide-react'
import { bulkDeleteStaff, createStaff, deleteStaff, getStaff, updateStaff } from '../controllers/staffController'
import { formatRole } from '../utils/roles'

const emptyForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  team: '',
  role: 'staff',
  assignedManager: '',
  assignedTeamLeader: '',
  isActive: true,
}

const roleTitles = {
  staff: 'Calling Staff',
  teamleader: 'Team Leader',
  manager: 'Manager',
}

export default function StaffAccounts({ currentUser }) {
  const [accounts, setAccounts] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState([])
  const [activeTable, setActiveTable] = useState('manager')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const canAddManager = currentUser?.role === 'admin'
  const canAddTeamLeader = ['admin', 'manager'].includes(currentUser?.role)
  const canManageStaff = ['admin', 'manager', 'teamleader'].includes(currentUser?.role)
  const managers = useMemo(() => accounts.filter((account) => account.role === 'manager'), [accounts])
  const teamLeaders = useMemo(() => accounts.filter((account) => account.role === 'teamleader'), [accounts])
  const counts = useMemo(
    () => ({
      staff: accounts.filter((account) => account.role === 'staff').length,
      teamleader: teamLeaders.length,
      manager: managers.length,
    }),
    [accounts, managers.length, teamLeaders.length],
  )
  const accountTables = useMemo(
    () =>
      [
        { key: 'manager', title: 'Registered Managers', rows: managers },
        currentUser?.role === 'teamleader' ? null : { key: 'teamleader', title: 'Registered Team Leaders', rows: teamLeaders },
        { key: 'staff', title: 'Registered Calling Staff', rows: accounts.filter((account) => account.role === 'staff') },
      ].filter(Boolean),
    [accounts, currentUser?.role, managers, teamLeaders],
  )
  const activeAccountTable = accountTables.find((table) => table.key === activeTable) || accountTables[0]

  function loadStaff() {
    return getStaff().then(setAccounts).catch((err) => setError(err.message))
  }

  useEffect(() => {
    if (canManageStaff) {
      getStaff().then(setAccounts).catch((err) => setError(err.message))
    }
  }, [canManageStaff])

  function openCreateModal(role) {
    setEditing(null)
    setForm({
      ...emptyForm,
      role,
      assignedManager: currentUser?.role === 'manager' && role === 'teamleader' ? currentUser.id : '',
      assignedTeamLeader: currentUser?.role === 'teamleader' && role === 'staff' ? currentUser.id : '',
    })
    setIsModalOpen(true)
    setError('')
    setMessage('')
  }

  function openEditModal(account) {
    setEditing(account)
    setForm({
      name: account.name || '',
      email: account.email || '',
      password: '',
      phone: account.phone || '',
      team: account.team || '',
      role: account.role || 'staff',
      assignedManager: account.assignedManager?.id || '',
      assignedTeamLeader: account.assignedTeamLeader?.id || '',
      isActive: account.isActive !== false,
    })
    setIsModalOpen(true)
    setError('')
    setMessage('')
  }

  async function handleSubmit(event) {
    try {
      event.preventDefault()
      setError('')
      setMessage('')
      const payload = {
        ...form,
        email: form.role === 'staff' ? form.email || undefined : form.email,
        assignedManager: form.role === 'teamleader' && currentUser?.role === 'manager' ? currentUser.id : form.assignedManager || undefined,
        assignedTeamLeader: form.role === 'staff' && currentUser?.role === 'teamleader' ? currentUser.id : form.assignedTeamLeader || undefined,
      }

      if (editing && !payload.password) {
        delete payload.password
      }

      if (editing) {
        await updateStaff(editing.id, payload)
        setMessage('Account updated')
      } else {
        await createStaff(payload)
        setMessage(`${roleTitles[form.role]} account created`)
      }

      setIsModalOpen(false)
      await loadStaff()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(account) {
    if (!window.confirm(`Delete ${account.name}?`)) {
      return
    }

    await deleteStaff(account.id)
    setSelected(selected.filter((id) => id !== account.id))
    setMessage('Account deleted')
    await loadStaff()
  }

  async function handleBulkDelete() {
    if (!selected.length || !window.confirm(`Delete ${selected.length} selected account(s)?`)) {
      return
    }

    const result = await bulkDeleteStaff(selected)
    setSelected([])
    setMessage(`${result.deleted} accounts deleted`)
    await loadStaff()
  }

  function toggleSelected(id) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function canManageAccount(account) {
    if (currentUser?.role === 'admin') return true
    if (currentUser?.role === 'manager') return ['teamleader', 'staff'].includes(account.role)
    if (currentUser?.role === 'teamleader') return account.role === 'staff'
    return false
  }

  function renderAccountsTable(title, rows) {
    const selectableRows = rows.filter(canManageAccount)

    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-bold text-slate-950">{title}</h3>
          <button type="button" onClick={handleBulkDelete} disabled={!selected.length || !selectableRows.length} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-rose-600 px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
            <Trash2 size={16} />
            Delete Selected
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Select</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Login</th>
                <th className="px-4 py-3">Manager</th>
                <th className="px-4 py-3">Team Leader</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((account) => (
                <tr key={account.id}>
                  <td className="whitespace-nowrap px-4 py-3">
                    {canManageAccount(account) ? (
                      <input type="checkbox" checked={selected.includes(account.id)} onChange={() => toggleSelected(account.id)} />
                    ) : (
                      <span className="text-xs font-bold text-slate-400">View</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <p className="font-bold text-slate-950">{account.name}</p>
                    <p className="text-xs text-slate-500">{account.phone || '-'}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatRole(account.role)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{account.role === 'staff' ? account.staffId : account.email}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{account.assignedManager?.name || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{account.assignedTeamLeader?.name || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {canManageAccount(account) ? (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => openEditModal(account)} className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-700">
                          <Edit3 size={16} />
                        </button>
                        <button type="button" onClick={() => handleDelete(account)} className="grid size-9 place-items-center rounded-lg border border-rose-100 text-rose-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-400">View only</span>
                    )}
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td className="px-4 py-4 text-sm text-slate-500" colSpan="7">
                    No accounts are registered yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (!canManageStaff) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-bold text-slate-950">Staff Accounts</h2>
        <p className="mt-1 text-sm text-slate-500">Staff account add/edit/delete access is available only to admin, manager, and team leader roles.</p>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-bold text-slate-950">Staff Accounts</h2>
            <p className="text-sm text-slate-500">Add, edit, delete, and assign calling staff, team leaders, and managers.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => openCreateModal('staff')} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-bold text-white">
              <Plus size={16} />
              Add Calling Staff
            </button>
            {canAddTeamLeader ? (
              <button type="button" onClick={() => openCreateModal('teamleader')} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800">
                <Plus size={16} />
                Add Team Leader
              </button>
            ) : null}
            {canAddManager ? (
              <button type="button" onClick={() => openCreateModal('manager')} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800">
                <Plus size={16} />
                Add Manager
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {Object.entries(counts).map(([key, value]) => (
            <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{roleTitles[key]}</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
            </div>
          ))}
        </div>

        {message ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p> : null}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        <div className="grid gap-2 md:grid-cols-3">
          {accountTables.map((table) => (
            <button
              key={table.key}
              type="button"
              onClick={() => setActiveTable(table.key)}
              className={`flex h-11 items-center justify-center rounded-lg px-3 text-sm font-bold ${
                activeTable === table.key ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {table.title}
            </button>
          ))}
        </div>
      </div>

      {renderAccountsTable(activeAccountTable.title, activeAccountTable.rows)}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4 py-6">
          <form onSubmit={handleSubmit} className="w-full max-w-2xl rounded-lg bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-950">{editing ? 'Edit Account' : `Add ${roleTitles[form.role]}`}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <select className="h-11 rounded-lg border border-slate-200 px-3 outline-none focus:border-teal-500" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value, assignedManager: '', assignedTeamLeader: '' })}>
                <option value="staff">Calling Staff</option>
                {canAddTeamLeader ? <option value="teamleader">Team Leader</option> : null}
                {canAddManager ? <option value="manager">Manager</option> : null}
              </select>
              <input required className="h-11 rounded-lg border border-slate-200 px-3 outline-none focus:border-teal-500" placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              <input className="h-11 rounded-lg border border-slate-200 px-3 outline-none focus:border-teal-500" placeholder={form.role === 'staff' ? 'Email optional' : 'Email'} required={form.role !== 'staff'} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              <input className="h-11 rounded-lg border border-slate-200 px-3 outline-none focus:border-teal-500" placeholder={editing ? 'New password optional' : 'Password'} required={!editing} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
              <input className="h-11 rounded-lg border border-slate-200 px-3 outline-none focus:border-teal-500" placeholder="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              <input className="h-11 rounded-lg border border-slate-200 px-3 outline-none focus:border-teal-500" placeholder="Team / Desk" value={form.team} onChange={(event) => setForm({ ...form, team: event.target.value })} />
              {form.role === 'teamleader' && currentUser?.role === 'admin' ? (
                <select required className="h-11 rounded-lg border border-slate-200 px-3 outline-none focus:border-teal-500" value={form.assignedManager} onChange={(event) => setForm({ ...form, assignedManager: event.target.value })}>
                  <option value="">Assign Manager</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>{manager.name}</option>
                  ))}
                </select>
              ) : null}
              {form.role === 'staff' && currentUser?.role !== 'teamleader' ? (
                <select required className="h-11 rounded-lg border border-slate-200 px-3 outline-none focus:border-teal-500" value={form.assignedTeamLeader} onChange={(event) => setForm({ ...form, assignedTeamLeader: event.target.value })}>
                  <option value="">Assign Team Leader</option>
                  {teamLeaders.map((leader) => (
                    <option key={leader.id} value={leader.id}>{leader.name}</option>
                  ))}
                </select>
              ) : null}
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
              Active account
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700">Cancel</button>
              <button type="submit" className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white">Save</button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  )
}
