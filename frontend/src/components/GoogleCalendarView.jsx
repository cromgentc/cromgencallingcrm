import { useState } from 'react'
import { CalendarDays, ExternalLink, RefreshCw, Video } from 'lucide-react'
import { authHeaders } from '../controllers/httpController'
import { API_ENDPOINTS, apiUrl } from '../services/api'
import { readUserJson } from '../utils/userStorage'

const defaultGoogleApiKey = 'AIzaSyDbK41VJzlMoTsakHzIlUGVGxwcZn_ecHI'

function readGoogleConfig() {
  return readUserJson('calltrack_integrations', {})?.google || {}
}

function buildEventsUrl(config = {}) {
  const baseUrl = apiUrl(API_ENDPOINTS.google.calendarEvents)
  const url = new URL(baseUrl, window.location.origin)

  url.searchParams.set('calendarId', config.calendarId || 'primary')
  url.searchParams.set('apiKey', config.apiKey || defaultGoogleApiKey)
  if (config.accessToken) {
    url.searchParams.set('accessToken', config.accessToken)
  }

  return url.toString()
}

export default function GoogleCalendarView() {
  const [events, setEvents] = useState([])
  const [message, setMessage] = useState('Click refresh to load Google Calendar events.')
  const googleMeetingUrl =
    'https://calendar.google.com/calendar/render?action=TEMPLATE&text=CallTrack%20Meeting&details=Meeting%20created%20from%20CallTrack&location=Google%20Meet'

  async function loadEvents() {
    try {
      setMessage('Loading Google Calendar events...')
      const response = await fetch(buildEventsUrl(readGoogleConfig()), { headers: authHeaders() })
      const contentType = response.headers.get('content-type') || ''

      if (!contentType.includes('application/json')) {
        throw new Error('Backend calendar API did not return JSON.')
      }

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.setup?.fix || data.message || 'Calendar events could not be loaded.')
      }

      setEvents(data.items || [])
      setMessage(data.items?.length ? '' : 'No upcoming calendar events found.')
    } catch (error) {
      setEvents([])
      setMessage(error.message || 'Google Calendar events could not be loaded.')
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">Google Calendar</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">Calendar inside CRM</h2>
          <p className="mt-2 text-sm text-slate-500">Track meetings and calendar events inside the CRM.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={loadEvents} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
            <RefreshCw size={16} />
            Refresh Events
          </button>
          <a href={googleMeetingUrl} target="_blank" rel="noreferrer" className="flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-bold text-white">
            <Video size={16} />
            Create Meet
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {message ? <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600">{message}</p> : null}

      <div className="mt-4 grid gap-3">
        {events.map((event) => (
          <article key={event.id} className="rounded-lg border border-slate-200 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-bold text-slate-950">{event.summary}</p>
                <p className="text-sm text-slate-500">{event.start?.dateTime || event.start?.date || 'Calendar event'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {event.hangoutLink ? (
                  <a href={event.hangoutLink} target="_blank" rel="noreferrer" className="flex h-10 items-center gap-2 rounded-lg bg-teal-600 px-3 text-sm font-bold text-white">
                    <Video size={16} />
                    Join Meet
                  </a>
                ) : null}
                {event.htmlLink ? (
                  <a href={event.htmlLink} target="_blank" rel="noreferrer" className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700">
                    <CalendarDays size={16} />
                    View
                    <ExternalLink size={13} />
                  </a>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
