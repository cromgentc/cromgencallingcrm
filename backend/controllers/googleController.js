function normalizeEvent(event) {
  return {
    id: event.id,
    summary: event.summary || 'Google Calendar event',
    description: event.description || '',
    htmlLink: event.htmlLink,
    hangoutLink: event.hangoutLink,
    start: event.start,
    end: event.end,
    creator: event.creator,
  }
}

async function getCalendarEvents(req, res, next) {
  try {
    const calendarId = req.query.calendarId || process.env.GOOGLE_CALENDAR_ID || 'primary'
    const apiKey = req.query.apiKey || process.env.GOOGLE_CALENDAR_API_KEY || 'AIzaSyDbK41VJzlMoTsakHzIlUGVGxwcZn_ecHI'
    const accessToken = req.query.accessToken || process.env.GOOGLE_CALENDAR_ACCESS_TOKEN

    if (!apiKey && !accessToken) {
      return res.status(400).json({
        message: 'Google Calendar API key or access token is required.',
        setup: {
          calendarId,
          needs: ['apiKey for public calendars', 'accessToken for private calendars'],
        },
      })
    }

    const params = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: String(req.query.maxResults || 10),
      timeMin: req.query.timeMin || new Date().toISOString(),
    })

    if (apiKey && !accessToken) {
      params.set('key', apiKey)
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      },
    )
    const data = await response.json()

    if (!response.ok) {
      const isPrimaryWithApiKey = calendarId === 'primary' && apiKey && !accessToken

      return res.status(response.status).json({
        message: isPrimaryWithApiKey
          ? 'Primary calendars are private. Connect with Google login/access token or use a public calendar ID.'
          : data.error?.message || 'Google Calendar events could not be fetched.',
        details: data.error,
        setup: isPrimaryWithApiKey
          ? {
              calendarId,
              fix: 'Use Login with Google in Settings > Google Calendar & Meet API, or use the real Calendar ID for a public calendar.',
            }
          : undefined,
      })
    }

    res.json({
      calendarId,
      items: (data.items || []).map(normalizeEvent),
    })
  } catch (error) {
    next(error)
  }
}

async function exchangeGoogleCode(req, res, next) {
  try {
    const { code, redirectUri, clientId, clientSecret } = req.body || {}
    const resolvedClientId = clientId || process.env.GOOGLE_CLIENT_ID
    const resolvedClientSecret = clientSecret || process.env.GOOGLE_CLIENT_SECRET

    if (!code || !redirectUri || !resolvedClientId || !resolvedClientSecret) {
      return res.status(400).json({
        message: 'Google code, redirectUri, clientId, and clientSecret are required.',
      })
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: resolvedClientId,
        client_secret: resolvedClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({
        message: data.error_description || data.error || 'Google token exchange failed',
        details: data,
      })
    }

    res.json({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scope: data.scope,
      tokenType: data.token_type,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = { exchangeGoogleCode, getCalendarEvents }
