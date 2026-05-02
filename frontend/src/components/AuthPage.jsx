import { useState } from 'react'
import { Headphones, Lock, Mail, PhoneCall } from 'lucide-react'
import { login } from '../controllers/authController'

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('staff')
  const [form, setForm] = useState({ name: '', loginId: '', email: '', password: '', phone: '' })
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    try {
      const response = await login({
        loginId: mode === 'staff' ? form.loginId : form.email,
        password: form.password,
        mode,
      })

      onAuth(response)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="grid min-h-screen bg-slate-950 lg:grid-cols-[1fr_480px]">
      <section className="hidden min-h-screen flex-col justify-between bg-slate-900 px-10 py-9 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-lg bg-teal-500">
            <PhoneCall size={24} />
          </span>
          <div>
            <p className="text-xl font-bold">CromGen CRM</p>
            <p className="text-sm text-slate-300">Smart calling workspace</p>
          </div>
        </div>
        <div>
          <p className="max-w-2xl text-5xl font-bold leading-tight">Turn every customer call into a clear next step.</p>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
            CromGen CRM brings calling teams, live status, customer queues, recordings, and follow-ups into one focused control center.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          {[
            { title: 'Live Calling', detail: 'Track active calls and outcomes instantly.' },
            { title: 'Team Flow', detail: 'Organize work from leads to follow-ups.' },
            { title: 'CRM Insights', detail: 'See queue, tags, recordings, and reports.' },
          ].map((item) => (
            <div key={item.title} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="font-bold">{item.title}</p>
              <p className="mt-1 text-slate-300">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-8">
        <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl sm:p-7">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="grid size-11 place-items-center rounded-lg bg-slate-950 text-white">
              <PhoneCall size={22} />
            </span>
            <p className="text-xl font-bold text-slate-950">CromGen CRM</p>
          </div>

          <h1 className="text-2xl font-bold text-slate-950">Login</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Calling staff log in with Staff ID. Admin, manager, and team leader log in with email.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
            {[
              { id: 'staff', label: 'Staff ID' },
              { id: 'email', label: 'Email Login' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={`rounded-md px-3 py-2 text-sm font-bold ${
                  mode === item.id ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">{mode === 'staff' ? 'Staff ID' : 'Email'}</span>
              <div className="mt-1 flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-teal-500">
                {mode === 'staff' ? <Headphones size={18} className="text-slate-400" /> : <Mail size={18} className="text-slate-400" />}
                <input
                  className="w-full outline-none"
                  placeholder={mode === 'staff' ? 'CGOB0001' : 'admin@example.com'}
                  value={mode === 'staff' ? form.loginId : form.email}
                  onChange={(event) => setForm({ ...form, [mode === 'staff' ? 'loginId' : 'email']: event.target.value })}
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Password</span>
              <div className="mt-1 flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-teal-500">
                <Lock size={18} className="text-slate-400" />
                <input className="w-full outline-none" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
              </div>
            </label>

          </div>

          {error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}

          <button type="submit" className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 font-bold text-white">
            <Lock size={18} />
            Login
          </button>
        </form>
      </section>
    </main>
  )
}
