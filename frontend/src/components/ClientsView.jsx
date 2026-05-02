import { Edit3, PauseCircle, PlayCircle, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient, deleteClient, getClients, updateClient } from '../controllers/clientController'

const storageKey = 'calltrack_clients'

const emptyClient = {
  title: '',
  companyName: '',
  companyGst: '',
  companyLicenseNumber: '',
  openingPositionCount: '',
  openingPositionName: '',
  contactPerson: '',
  contactPersonNumber: '',
  status: 'active',
}

function readClients() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || '[]')
  } catch {
    return []
  }
}

function writeClients(clients) {
  localStorage.setItem(storageKey, JSON.stringify(clients))
}

export default function ClientsView({ currentUser }) {
  const [clients, setClients] = useState(readClients)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [form, setForm] = useState(emptyClient)
  const [error, setError] = useState('')
  const isAdmin = currentUser?.role === 'admin'

  useEffect(() => {
    if (!isAdmin) return
    const localClients = readClients()

    getClients()
      .then(async (serverClients) => {
        const serverCompanyNames = new Set(serverClients.map((client) => String(client.companyName || '').trim().toLowerCase()))
        const localOnlyClients = localClients.filter((client) => {
          const companyName = String(client.companyName || '').trim()
          return companyName && !serverCompanyNames.has(companyName.toLowerCase())
        })
        const migratedClients = await Promise.all(
          localOnlyClients.map((client) =>
            createClient({
              title: client.title || '',
              companyName: client.companyName,
              companyGst: client.companyGst || '',
              companyLicenseNumber: client.companyLicenseNumber || '',
              openingPositionCount: client.openingPositionCount || '',
              openingPositionName: client.openingPositionName || '',
              contactPerson: client.contactPerson || '',
              contactPersonNumber: client.contactPersonNumber || '',
              status: client.status || 'active',
            }).catch(() => null),
          ),
        )
        const nextClients = [...migratedClients.filter(Boolean), ...serverClients]

        setClients(nextClients)
        writeClients(nextClients)
      })
      .catch((err) => setError(err.message))
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-bold text-slate-950">Clients</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">The clients database is only available to admins.</p>
      </section>
    )
  }

  function persist(nextClients) {
    setClients(nextClients)
    writeClients(nextClients)
  }

  function openCreate() {
    setEditingId('')
    setForm(emptyClient)
    setModalOpen(true)
  }

  function openEdit(client) {
    setEditingId(client.id)
    setForm({
      title: client.title || '',
      companyName: client.companyName || '',
      companyGst: client.companyGst || '',
      companyLicenseNumber: client.companyLicenseNumber || '',
      openingPositionCount: client.openingPositionCount || '',
      openingPositionName: client.openingPositionName || '',
      contactPerson: client.contactPerson || '',
      contactPersonNumber: client.contactPersonNumber || '',
      status: client.status || 'active',
    })
    setModalOpen(true)
  }

  async function handleSubmit(event) {
    try {
      event.preventDefault()
      setError('')

      const payload = {
        ...form,
        openingPositionCount: String(form.openingPositionCount || '').trim(),
        updatedAt: new Date().toISOString(),
      }

      if (editingId) {
        const updated = await updateClient(editingId, payload)
        persist(clients.map((client) => (client.id === editingId ? updated : client)))
      } else {
        const created = await createClient(payload)
        persist([created, ...clients])
      }

      setModalOpen(false)
      setEditingId('')
      setForm(emptyClient)
    } catch (err) {
      setError(err.message || 'Client could not be saved')
    }
  }

  async function handleDelete(clientId) {
    try {
      setError('')
      await deleteClient(clientId)
      persist(clients.filter((client) => client.id !== clientId))
    } catch (err) {
      setError(err.message || 'Client could not be deleted')
    }
  }

  async function togglePause(client) {
    try {
      setError('')
      const updated = await updateClient(client.id, {
        status: client.status === 'paused' ? 'active' : 'paused',
        updatedAt: new Date().toISOString(),
      })
      persist(clients.map((item) => (item.id === client.id ? updated : item)))
    } catch (err) {
      setError(err.message || 'Client could not be updated')
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-slate-950">Clients</h2>
          <p className="text-sm font-semibold text-slate-500">Manage company client details and open positions.</p>
        </div>
        <button type="button" onClick={openCreate} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-bold text-white">
          <Plus size={16} />
          Add Client
        </button>
      </div>
      {error ? <p className="mx-4 mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p> : null}

      <div className="overflow-x-auto">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">GST</th>
              <th className="px-4 py-3">License No.</th>
              <th className="px-4 py-3">Openings</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">Contact Person</th>
              <th className="px-4 py-3">Contact No.</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-bold text-slate-950">{client.title || '-'}</td>
                <td className="px-4 py-3 text-slate-700">{client.companyName || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{client.companyGst || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{client.companyLicenseNumber || '-'}</td>
                <td className="px-4 py-3 font-bold text-slate-800">{client.openingPositionCount || '0'}</td>
                <td className="px-4 py-3 text-slate-700">{client.openingPositionName || '-'}</td>
                <td className="px-4 py-3 text-slate-700">{client.contactPerson || '-'}</td>
                <td className="px-4 py-3 text-slate-700">{client.contactPersonNumber || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${client.status === 'paused' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {client.status === 'paused' ? 'Paused' : 'Active'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => openEdit(client)} className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-white" title="Edit">
                      <Edit3 size={15} />
                    </button>
                    <button type="button" onClick={() => togglePause(client)} className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-white" title={client.status === 'paused' ? 'Resume' : 'Pause'}>
                      {client.status === 'paused' ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
                    </button>
                    <button type="button" onClick={() => handleDelete(client.id)} className="grid size-9 place-items-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700" title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!clients.length ? (
          <div className="px-4 py-8 text-center text-sm font-bold text-slate-500">No clients added yet.</div>
        ) : null}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 px-4 py-6">
          <form onSubmit={handleSubmit} className="flex max-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-lg font-black text-slate-950">{editingId ? 'Edit Client' : 'Add Client'}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="grid size-9 place-items-center rounded-lg hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input required label="Title" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
                <Input required label="Company Name" value={form.companyName} onChange={(value) => setForm({ ...form, companyName: value })} />
                <Input label="Company GST" value={form.companyGst} onChange={(value) => setForm({ ...form, companyGst: value })} />
                <Input label="Company License Number" value={form.companyLicenseNumber} onChange={(value) => setForm({ ...form, companyLicenseNumber: value })} />
                <Input type="number" label="Opening Position Count" value={form.openingPositionCount} onChange={(value) => setForm({ ...form, openingPositionCount: value })} />
                <Input label="Opening Position Name" value={form.openingPositionName} onChange={(value) => setForm({ ...form, openingPositionName: value })} />
                <Input label="Contact Person" value={form.contactPerson} onChange={(value) => setForm({ ...form, contactPerson: value })} />
                <Input label="Contact Person Number" value={form.contactPersonNumber} onChange={(value) => setForm({ ...form, contactPersonNumber: value })} />
              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button type="button" onClick={() => setModalOpen(false)} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700">
                Cancel
              </button>
              <button type="submit" className="h-10 rounded-lg bg-teal-600 px-4 text-sm font-bold text-white">
                Save Client
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  )
}

function Input({ label, value, onChange, required = false, type = 'text' }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        required={required}
        type={type}
        className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-teal-500"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
