import { useEffect, useState } from 'react'
import { IdCard, ShieldCheck } from 'lucide-react'
import { getStaff } from '../controllers/staffController'
import { formatRole } from '../utils/roles'

export default function StaffManagement({ currentUser, onMemberSelect }) {
  const [staff, setStaff] = useState([])
  const canManageStaff = ['admin', 'manager'].includes(currentUser?.role)

  useEffect(() => {
    if (canManageStaff) {
      getStaff().then(setStaff).catch(() => setStaff([]))
    }
  }, [canManageStaff])

  if (!canManageStaff) {
    return null
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-slate-950">Staff Management</h2>
          <p className="text-sm text-slate-500">Registered staff, team leader aur manager list.</p>
        </div>
        <ShieldCheck className="text-teal-600" size={22} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {staff.map((member) => (
          <button key={member.id} type="button" onClick={() => onMemberSelect?.(member)} className="rounded-lg border border-slate-200 p-3 text-left transition hover:border-teal-300 hover:bg-teal-50/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-950">{member.name}</p>
                <p className="text-sm text-slate-500">{formatRole(member.role)}</p>
              </div>
              {member.staffId ? (
                <span className="flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700">
                  <IdCard size={14} />
                  {member.staffId}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-slate-600">{member.email || 'Staff ID login'}</p>
            <p className="text-sm text-slate-500">{member.team || 'No team assigned'}</p>
          </button>
        ))}
      </div>
    </section>
  )
}
