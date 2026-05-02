import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, LogOut, Menu, PhoneCall, Search, X } from 'lucide-react'
import { getNavigationItemsForUser } from '../utils/navigation'
import { formatRole } from '../utils/roles'

function compactList(items) {
  return items.filter((item) => item?.label).slice(0, 8)
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

export default function MobileNav({ dashboard = {}, currentUser, onToggleSidebar, sidebarOpen, onViewChange, onLogout }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const rootRef = useRef(null)

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!rootRef.current?.contains(event.target)) {
        setSearchOpen(false)
        setNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick, { passive: true })

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
    }
  }, [])

  const searchItems = useMemo(() => {
    const navItems = getNavigationItemsForUser(currentUser).flatMap((item) => item.children || [item]).map((item) => ({
      label: item.label,
      meta: 'Page',
      view: item.id,
    }))
    const calls = (dashboard.calls || []).map((call) => ({
      label: call.customerName || call.customer || call.name || call.phone || call.mobile,
      meta: `Call ${call.status || ''}`.trim(),
      view: 'calls',
    }))
    const team = (dashboard.teamMembers || []).map((member) => ({
      label: member.name || member.staffId,
      meta: member.staffId || formatRole(member.role),
      view: 'team',
    }))
    const pending = (dashboard.pendingCustomers || []).map((customer) => ({
      label: customer.name || customer.customerName || customer.phone || customer.mobile,
      meta: 'Pending call',
      view: 'pending',
    }))

    return [...navItems, ...calls, ...team, ...pending]
  }, [currentUser, dashboard.calls, dashboard.pendingCustomers, dashboard.teamMembers])

  const filteredSearch = compactList(
    searchItems.filter((item) => `${item.label} ${item.meta}`.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const socialMessages = readJson('calltrack_social_messages', [])
  const notifications = compactList([
    ...socialMessages.map((message) => ({
      label: `${message.source}: ${message.name}`,
      meta: message.body,
      tone: 'emerald',
    })),
    {
      label: `${dashboard.callQueueSummary?.pending || dashboard.pendingCustomers?.length || 0} pending calls`,
      meta: 'Follow-up queue',
      tone: 'amber',
    },
    {
      label: `${dashboard.callQueueSummary?.liveTalk || 0} live talks`,
      meta: 'Active conversations',
      tone: 'emerald',
    },
    {
      label: `${dashboard.calls?.length || 0} total call records`,
      meta: 'Latest dashboard sync',
      tone: 'sky',
    },
  ])

  const notificationCount = notifications.reduce((total, item) => {
    const value = Number.parseInt(item.label, 10)
    return total + (Number.isNaN(value) ? 0 : value)
  }, 0)

  function handleSearchSelect(item) {
    onViewChange?.(item.view)
    setSearchQuery('')
    setSearchOpen(false)
  }

  function handleSearchSubmit(event) {
    event.preventDefault()
    const firstResult = searchQuery ? filteredSearch[0] : compactList(searchItems)[0]
    if (firstResult) {
      handleSearchSelect(firstResult)
    }
  }

  return (
    <header ref={rootRef} className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        className="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-700"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-lg bg-slate-950 text-white">
          <PhoneCall size={18} />
        </span>
        <span className="font-bold text-slate-950">CallTrack</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            aria-label="Open search"
            onClick={() => {
              setSearchOpen((current) => !current)
              setNotificationsOpen(false)
            }}
            className="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-700"
          >
            <Search size={18} />
          </button>
          {searchOpen ? (
            <div className="fixed left-3 right-3 top-16 z-50 rounded-lg border border-slate-200 bg-white p-2 shadow-xl sm:left-auto sm:right-4 sm:w-96">
              <form onSubmit={handleSearchSubmit}>
                <input
                  autoFocus
                  type="search"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-teal-500 focus:bg-white"
                />
              </form>
              <div className="mt-2 max-h-72 overflow-y-auto">
                {(searchQuery ? filteredSearch : compactList(searchItems)).map((item) => (
                  <button
                    key={`${item.view}-${item.label}-${item.meta}`}
                    type="button"
                    onPointerDown={(event) => {
                      event.preventDefault()
                      handleSearchSelect(item)
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <p className="text-sm font-bold text-slate-950">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.meta}</p>
                  </button>
                ))}
                {searchQuery && !filteredSearch.length ? (
                  <p className="px-3 py-2 text-sm font-semibold text-slate-500">No result found</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen((current) => !current)
              setSearchOpen(false)
            }}
            className="relative grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-700"
          >
            <Bell size={18} />
            {notificationCount ? <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{notificationCount}</span> : null}
          </button>
          {notificationsOpen ? (
            <div className="absolute right-0 z-30 mt-2 w-[calc(100vw-2rem)] max-w-sm rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
              {notifications.map((item) => (
                <div key={item.label} className="flex gap-3 rounded-lg px-3 py-2">
                  <span className={`mt-1 size-2 rounded-full ${item.tone === 'emerald' ? 'bg-emerald-500' : item.tone === 'sky' ? 'bg-sky-500' : 'bg-amber-500'}`} />
                  <div>
                    <p className="text-sm font-bold text-slate-950">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.meta}</p>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={onLogout}
                className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-rose-600 px-3 text-sm font-bold text-white"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
