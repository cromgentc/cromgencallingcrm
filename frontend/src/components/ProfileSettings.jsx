import { useState } from 'react'
import { Save, UserPen } from 'lucide-react'
import { updateProfile } from '../controllers/authController'
import { formatRole } from '../utils/roles'

export default function ProfileSettings({ currentUser, onUserUpdated }) {
  const [form, setForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    team: currentUser?.team || '',
  })
  const [message, setMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    const updated = await updateProfile(form)
    onUserUpdated(updated)
    setMessage('Profile updated')
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
        <span className="grid size-10 place-items-center rounded-lg bg-slate-950 text-white">
          <UserPen size={18} />
        </span>
        <div>
          <h2 className="font-bold text-slate-950">Profile Settings</h2>
          <p className="text-sm text-slate-500">Update {formatRole(currentUser?.role)} profile details.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
        <input required placeholder="Name" className="h-11 rounded-lg border border-slate-200 px-3 outline-none focus:border-teal-500" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <input placeholder="Email" className="h-11 rounded-lg border border-slate-200 px-3 outline-none focus:border-teal-500" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <input placeholder="Phone" className="h-11 rounded-lg border border-slate-200 px-3 outline-none focus:border-teal-500" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        <input placeholder="Team" className="h-11 rounded-lg border border-slate-200 px-3 outline-none focus:border-teal-500" value={form.team} onChange={(event) => setForm({ ...form, team: event.target.value })} />
        <button type="submit" className="flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 font-bold text-white md:w-max">
          <Save size={18} />
          Save Profile
        </button>
      </form>
      {message ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{message}</p> : null}
    </section>
  )
}
