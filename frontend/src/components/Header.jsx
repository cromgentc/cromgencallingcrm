import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, CalendarDays, ChevronDown, ExternalLink, Search, Sparkles, User, Video } from 'lucide-react'
import { authHeaders } from '../controllers/httpController'
import { API_ENDPOINTS, apiUrl } from '../services/api'
import { getNavigationItemsForUser } from '../utils/navigation'
import { formatRole } from '../utils/roles'

const defaultGoogleApiKey = 'AIzaSyDbK41VJzlMoTsakHzIlUGVGxwcZn_ecHI'

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

function buildGoogleEventsUrl(config = {}) {
  const configuredUrl = config.meetingTrackingApi || config.eventsApiUrl || ''
  const baseUrl = !configuredUrl || configuredUrl.startsWith('/api/') || configuredUrl.startsWith(window.location.origin)
    ? apiUrl(API_ENDPOINTS.google.calendarEvents)
    : configuredUrl
  const url = new URL(baseUrl, window.location.origin)
  const calendarId = config.calendarId || 'primary'
  const apiKey = config.apiKey || defaultGoogleApiKey

  url.searchParams.set('calendarId', calendarId)
  if (apiKey) {
    url.searchParams.set('apiKey', apiKey)
  }
  if (config.accessToken) {
    url.searchParams.set('accessToken', config.accessToken)
  }

  return url.toString()
}

export default function Header({ dashboard, currentUser, onViewChange }) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const rootRef = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [meetings, setMeetings] = useState([])
  const [meetingStatus, setMeetingStatus] = useState('')
  const today = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())

  useEffect(() => {
    function handleOutsideClick(event) {
      const target = event.target
      if (!rootRef.current?.contains(target)) {
        setProfileOpen(false)
        setSearchOpen(false)
        setCalendarOpen(false)
        setNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick, { passive: true })

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setProfileOpen(false)
        setSearchOpen(false)
        setCalendarOpen(false)
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
  const googleMeetingUrl =
    'https://calendar.google.com/calendar/render?action=TEMPLATE&text=CallTrack%20Meeting&details=Meeting%20created%20from%20CallTrack&location=Google%20Meet'

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

  async function handleCalendarOpen() {
    const nextOpen = !calendarOpen
    setCalendarOpen(nextOpen)

    if (!nextOpen) {
      return
    }

    try {
      const configs = readJson(`calltrack_integrations:${currentUser?.id || currentUser?.staffId || currentUser?.email || 'anonymous'}`, {})
      const googleConfig = configs.google || {}
      const trackingUrl = buildGoogleEventsUrl(googleConfig)

      if (!googleConfig.apiKey && !googleConfig.accessToken && !defaultGoogleApiKey) {
        setMeetingStatus('Add an API key or access token in Google settings.')
        setMeetings([])
        return
      }

      setMeetingStatus('Loading meetings...')
      const response = await fetch(trackingUrl, { headers: authHeaders() })
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        throw new Error('Calendar API did not return JSON. Check the backend URL/port.')
      }
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.setup?.fix || data.message || 'Calendar fetch failed')
      }
      const events = Array.isArray(data) ? data : data.items || data.events || []
      setMeetings(events.slice(0, 4))
      setMeetingStatus(events.length ? '' : 'No tracked meetings found.')
    } catch {
      setMeetingStatus('Meeting tracking API could not be fetched.')
      setMeetings([])
    }
  }

  return (
    <header
      ref={rootRef}
      className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between lg:px-5"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-teal-600 text-white shadow-sm">
            <Sparkles size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-teal-700">CallTrack CRM</p>
            <h1 className="truncate text-xl font-black text-slate-950 sm:text-2xl">Control Center</h1>
          </div>
        </div>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Welcome, <span className="text-slate-800">{currentUser?.name || 'User'}</span> - {formatRole(currentUser?.role)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="search"
            placeholder="Search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value)
              setSearchOpen(true)
            }}
            onFocus={() => setSearchOpen(true)}
            className="h-11 w-56 rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
          />
          {searchOpen && searchQuery ? (
            <div className="absolute right-0 z-30 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
              {filteredSearch.length ? (
                filteredSearch.map((item) => (
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
                ))
              ) : (
                <p className="px-3 py-2 text-sm font-semibold text-slate-500">No result found</p>
              )}
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={handleCalendarOpen}
            className="hidden h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 sm:flex"
          >
            <CalendarDays size={18} />
            {today}
          </button>
          {calendarOpen ? (
            <div className="absolute right-0 z-30 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
              <p className="text-sm font-bold text-slate-950">Google Meeting Calendar</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Meetings are tracked and synced from Google Calendar API settings.</p>
              {meetingStatus ? <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">{meetingStatus}</p> : null}
              {meetings.length ? (
                <div className="mt-2 space-y-2">
                  {meetings.map((meeting, index) => (
                    <div key={meeting.id || meeting.summary || index} className="rounded-lg border border-slate-100 px-3 py-2">
                      <p className="text-xs font-bold text-slate-950">{meeting.summary || meeting.title || 'Google Meet'}</p>
                      <p className="text-[11px] text-slate-500">{meeting.start?.dateTime || meeting.startTime || meeting.date || 'Tracked meeting'}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              <a
                href={googleMeetingUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-bold text-white"
              >
                <Video size={16} />
                Create Meet
                <ExternalLink size={14} />
              </a>
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((current) => !current)}
            className="relative grid size-11 place-items-center rounded-lg bg-slate-950 text-white shadow-sm transition hover:bg-teal-700"
          >
            <Bell size={18} />
            {notificationCount ? <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{notificationCount}</span> : null}
          </button>
          {notificationsOpen ? (
            <div className="absolute right-0 z-30 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
              {notifications.map((item) => (
                <div key={item.label} className="flex gap-3 rounded-lg px-3 py-2">
                  <span className={`mt-1 size-2 rounded-full ${item.tone === 'emerald' ? 'bg-emerald-500' : item.tone === 'sky' ? 'bg-sky-500' : 'bg-amber-500'}`} />
                  <div>
                    <p className="text-sm font-bold text-slate-950">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.meta}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((current) => !current)}
            className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-950 transition hover:border-teal-200 hover:bg-teal-50"
          >
            <span className="grid size-7 place-items-center rounded-lg bg-teal-600 text-white">
              <User size={16} />
            </span>
            <span className="max-w-32 truncate">{currentUser?.name || 'Profile'}</span>
            <ChevronDown size={16} />
          </button>
          {profileOpen ? (
            <div className="absolute right-full top-0 z-30 mr-2 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-xl max-sm:right-0 max-sm:top-full max-sm:mt-2 max-sm:mr-0">
              <div className="px-3 py-2">
                <p className="font-bold text-slate-950">{currentUser?.name}</p>
                <p className="text-xs text-slate-500">{formatRole(currentUser?.role)}</p>
              </div>
              <button type="button" onClick={() => onViewChange?.('profile')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                <User size={16} />
                Profile
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
