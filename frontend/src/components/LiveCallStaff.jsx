import { useEffect, useMemo, useState } from 'react'
import { PhoneCall } from 'lucide-react'
import { getAgentTracking } from '../controllers/agentController'

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

export default function LiveCallStaff() {
  const [tracking, setTracking] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    function loadTracking() {
      getAgentTracking().then(setTracking).catch((err) => setError(err.message))
    }

    loadTracking()
    const interval = setInterval(loadTracking, 10000)
    return () => clearInterval(interval)
  }, [])

  const liveStaff = useMemo(
    () => tracking.filter((member) => ['on_call', 'outcall'].includes(member.status) || member.currentCall),
    [tracking],
  )

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-bold text-slate-950">Live Calling Staff</h2>
        <p className="text-sm text-slate-500">Calling staff currently on customer calls are shown live here.</p>
        {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p> : null}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Staff</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {liveStaff.map((member) => (
                <tr key={member.id}>
                  <td className="whitespace-nowrap px-4 py-3">
                    <p className="font-bold text-slate-950">{member.name}</p>
                    <p className="text-xs text-slate-500">{member.staffId} {member.team ? `- ${member.team}` : ''}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses[member.status] || statusClasses.not_ready}`}>
                      {statusLabels[member.status] || 'Not Ready'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{member.currentCall?.customer || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{member.currentCall?.phone || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {member.currentCall?.stage ? (
                      <span className="inline-flex items-center gap-2">
                        <PhoneCall size={15} />
                        {member.currentCall.stage}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
              {!liveStaff.length ? (
                <tr>
                  <td className="px-4 py-4 text-sm text-slate-500" colSpan="5">
                    No calling staff are on a live call right now.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
