import { useEffect, useState } from 'react'
import { CalendarDays, Camera, CheckCircle2, ChevronDown, ExternalLink, LinkIcon, Mail, MessageSquare, Network, Save, Server, Settings2, Users } from 'lucide-react'
import { authHeaders, request } from '../controllers/httpController'
import { API_ENDPOINTS, apiUrl } from '../services/api'
import { readUserJson, writeUserJson } from '../utils/userStorage'

const defaultGoogleClientId = '406233399078-76oiq033tjqbkg1uel3pc4an3n0hibeb.apps.googleusercontent.com'
const defaultGoogleApiKey = 'AIzaSyDbK41VJzlMoTsakHzIlUGVGxwcZn_ecHI'

const integrationDefaults = {
  google: {
    clientId: defaultGoogleClientId,
    clientSecret: '',
    apiKey: defaultGoogleApiKey,
    calendarId: 'primary',
    accessToken: '',
    redirectUrl: window.location.origin,
    eventsApiUrl: apiUrl(API_ENDPOINTS.google.calendarEvents),
    meetingTrackingApi: apiUrl(API_ENDPOINTS.google.calendarEvents),
  },
  zoho: { clientId: '', clientSecret: '', refreshToken: '', organizationId: '' },
  linkedin: { clientId: '', clientSecret: '', redirectUrl: '' },
  instagram: { appId: '', appSecret: '', redirectUrl: '', accessToken: '' },
  facebook: { appId: '', appSecret: '', redirectUrl: '', pageAccessToken: '' },
  emailSmtp: {
    provider: 'SMTP',
    host: '',
    port: '587',
    username: '',
    password: '',
    fromEmail: '',
    fromName: 'CromGen CRM',
    secure: 'false',
  },
  smsGateway: {
    provider: 'MSG91',
    apiUrl: '',
    apiKey: '',
    senderId: '',
    route: 'transactional',
    dltTemplateId: '',
  },
}

const integrations = [
  { id: 'google', title: 'Google Calendar & Meet API', description: 'API details for Meet creation, fetching, and meeting tracking.', icon: CalendarDays },
  { id: 'zoho', title: 'Zoho CRM', description: 'Zoho CRM connection details for lead and customer sync.', icon: Server },
  { id: 'linkedin', title: 'LinkedIn Connect', description: 'App credentials for LinkedIn lead source connection.', icon: Network },
  { id: 'instagram', title: 'Instagram Connect', description: 'Token details for Instagram enquiries and lead capture.', icon: Camera },
  { id: 'facebook', title: 'Facebook Connect', description: 'Page token for Facebook page leads sync.', icon: Users },
  { id: 'emailSmtp', title: 'Email SMTP Gateway', description: 'SMTP/provider details for Email Marketing send API.', icon: Mail },
  { id: 'smsGateway', title: 'SMS Gateway', description: 'SMS provider/API details for SMS Marketing send API.', icon: MessageSquare },
]

function loadIntegrations() {
  try {
    const saved = readUserJson('calltrack_integrations', {})
    return Object.fromEntries(
      Object.entries(integrationDefaults).map(([key, value]) => {
        const savedSection = saved[key] || {}
        const merged = Object.fromEntries(
          Object.entries(value).map(([field, defaultValue]) => [field, savedSection[field] || defaultValue]),
        )

        return [key, { ...savedSection, ...merged }]
      }),
    )
  } catch {
    return integrationDefaults
  }
}

function fieldLabel(field) {
  if (field === 'cloudName') return 'CLOUD_NAME'
  if (field === 'apiKey') return 'API_KEY'
  if (field === 'apiSecret') return 'API_SECRET'
  if (field === 'apiUrl') return 'API URL'
  if (field === 'fromEmail') return 'From Email'
  if (field === 'fromName') return 'From Name'
  if (field === 'senderId') return 'Sender ID'
  if (field === 'dltTemplateId') return 'DLT Template ID'
  return field.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())
}

function savedOpenIntegration() {
  const preferredSection = readUserJson('calltrack_settings_open', '')
  return integrationDefaults[preferredSection] ? preferredSection : ''
}

function buildLoginUrl(section, config) {
  const redirectUrl = config.redirectUrl || window.location.origin

  if (section === 'google' && config.clientId) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: redirectUrl,
      scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
      access_type: 'offline',
      prompt: 'consent',
      state: 'google',
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  if (section === 'linkedin' && config.clientId) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: redirectUrl,
      scope: 'openid profile email',
      state: 'linkedin',
    })

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
  }

  if (section === 'facebook' && config.appId) {
    const params = new URLSearchParams({
      client_id: config.appId,
      redirect_uri: redirectUrl,
      response_type: 'code',
      scope: 'email,public_profile,pages_show_list,leads_retrieval',
      state: 'facebook',
    })

    return `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`
  }

  if (section === 'instagram' && config.appId) {
    const params = new URLSearchParams({
      client_id: config.appId,
      redirect_uri: redirectUrl,
      response_type: 'code',
      scope: 'instagram_basic,instagram_manage_messages,pages_show_list',
      state: 'instagram',
    })

    return `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`
  }

  return ''
}

function missingLoginField(section, config) {
  if (section === 'google' && !config.clientId) return 'Client ID'
  if (section === 'linkedin' && !config.clientId) return 'Client ID'
  if (['facebook', 'instagram'].includes(section) && !config.appId) return 'App ID'
  if (!config.redirectUrl) return 'Redirect URL'
  return ''
}

function loginLabel(section) {
  if (section === 'google') return 'Login with Google'
  if (section === 'linkedin') return 'Login with LinkedIn'
  if (section === 'facebook') return 'Login with Facebook'
  if (section === 'instagram') return 'Login with Instagram'
  return ''
}

function buildGoogleEventsUrl(config = {}) {
  const configuredUrl = config.eventsApiUrl || ''
  const baseUrl = !configuredUrl || configuredUrl.startsWith('/api/') || configuredUrl.startsWith(window.location.origin)
    ? apiUrl(API_ENDPOINTS.google.calendarEvents)
    : configuredUrl
  const url = new URL(baseUrl, window.location.origin)

  url.searchParams.set('calendarId', config.calendarId || 'primary')
  if (config.apiKey) {
    url.searchParams.set('apiKey', config.apiKey)
  }
  if (config.accessToken) {
    url.searchParams.set('accessToken', config.accessToken)
  }

  return url.toString()
}

export default function SettingsView({ initialIntegration = '' }) {
  const callbackParams = new URLSearchParams(window.location.search)
  const callbackCode = callbackParams.get('code')
  const callbackState = callbackParams.get('state')
  const callbackSection = ['google', 'linkedin', 'facebook', 'instagram'].includes(callbackState) ? callbackState : callbackCode ? 'google' : ''
  const [configs, setConfigs] = useState(loadIntegrations)
  const [openIntegration, setOpenIntegration] = useState(callbackSection || initialIntegration || savedOpenIntegration() || 'google')
  const [integrationMessage, setIntegrationMessage] = useState('')

  useEffect(() => {
    request(API_ENDPOINTS.settings.smtp)
      .then((smtp) => {
        setConfigs((current) => ({
          ...current,
          emailSmtp: {
            ...current.emailSmtp,
            ...smtp,
            password: current.emailSmtp.password,
          },
        }))
      })
      .catch(() => {})
  }, [])

  function persist(nextConfigs, label) {
    writeUserJson('calltrack_integrations', nextConfigs)
    setIntegrationMessage(label)
  }

  function updateConfig(section, field, value) {
    setConfigs((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }))
  }

  async function saveIntegration(section) {
    if (section === 'emailSmtp') {
      try {
        setIntegrationMessage('Saving SMTP settings...')
        const saved = await request(API_ENDPOINTS.settings.smtp, {
          method: 'PUT',
          body: JSON.stringify(configs.emailSmtp),
        })
        const nextConfigs = {
          ...configs,
          emailSmtp: {
            ...configs.emailSmtp,
            ...saved,
            password: configs.emailSmtp.password,
          },
        }
        setConfigs(nextConfigs)
        persist(nextConfigs, saved.message || 'SMTP settings saved')
      } catch (error) {
        setIntegrationMessage(error.message || 'SMTP settings could not be saved')
      }
      return
    }

    persist(configs, `${integrations.find((item) => item.id === section)?.title || 'API'} saved`)
  }

  async function saveAllIntegrations(event) {
    event.preventDefault()
    try {
      if (configs.emailSmtp?.host || configs.emailSmtp?.username || configs.emailSmtp?.password) {
        await request(API_ENDPOINTS.settings.smtp, {
          method: 'PUT',
          body: JSON.stringify(configs.emailSmtp),
        })
      }
      persist(configs, 'All API settings saved')
    } catch (error) {
      setIntegrationMessage(error.message || 'All settings could not be saved')
    }
  }

  function handleSocialLogin(section) {
    const missingField = missingLoginField(section, configs[section] || {})
    const url = buildLoginUrl(section, configs[section] || {})

    if (missingField || !url) {
      setIntegrationMessage(`Add ${missingField || 'App ID / Client ID'} in ${integrations.find((item) => item.id === section)?.title || 'Social'} first.`)
      return
    }

    persist(configs, `${integrations.find((item) => item.id === section)?.title || 'Social'} settings saved`)
    window.location.assign(url)
  }

  async function exchangeGoogleToken() {
    const googleConfig = configs.google || {}

    if (!callbackCode) {
      setIntegrationMessage('Google callback code is missing. Log in with Google again.')
      return
    }

    if (!googleConfig.clientSecret) {
      setIntegrationMessage('Add the Google Client Secret, then click Confirm Google Login.')
      return
    }

    try {
      setIntegrationMessage('Generating Google access token...')
      const response = await fetch(apiUrl(API_ENDPOINTS.google.token), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          code: callbackCode,
          redirectUri: googleConfig.redirectUrl || window.location.origin,
          clientId: googleConfig.clientId,
          clientSecret: googleConfig.clientSecret,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Google token exchange failed')
      }

      const nextConfigs = {
        ...configs,
        google: {
          ...configs.google,
          connected: true,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || configs.google.refreshToken,
          authCode: callbackCode,
          connectedAt: new Date().toISOString(),
        },
      }

      setConfigs(nextConfigs)
      persist(nextConfigs, 'Google connected. Access token saved.')
      window.history.replaceState({}, document.title, window.location.pathname)
    } catch (error) {
      setIntegrationMessage(error.message || 'Google token exchange failed')
    }
  }

  function markConnected(section) {
    const nextConfigs = {
      ...configs,
      [section]: {
        ...configs[section],
        connected: true,
        authCode: callbackCode,
        connectedAt: new Date().toISOString(),
      },
    }

    setConfigs(nextConfigs)
    persist(nextConfigs, `${integrations.find((item) => item.id === section)?.title || 'Social'} connected`)
    window.history.replaceState({}, document.title, window.location.pathname)
  }

  async function checkGoogleApi() {
    const googleConfig = configs.google || {}

    if (!googleConfig.apiKey && !googleConfig.accessToken) {
      setIntegrationMessage('Add an API key or access token to check the Google API.')
      return
    }

    try {
      setIntegrationMessage('Checking Google Calendar API...')
      const response = await fetch(buildGoogleEventsUrl(googleConfig), { headers: authHeaders() })
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        throw new Error('Google API did not return JSON. Events API URL should point to the backend localhost:5000.')
      }
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Google API did not connect.')
      }

      const nextConfigs = {
        ...configs,
        google: {
          ...configs.google,
          connected: true,
          checkedAt: new Date().toISOString(),
        },
      }

      setConfigs(nextConfigs)
      persist(nextConfigs, `Google API connected. ${data.items?.length || 0} events found`)
    } catch (error) {
      setIntegrationMessage(error.message || 'Google API did not connect.')
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
          <span className="grid size-10 place-items-center rounded-lg bg-slate-950 text-white">
            <Settings2 size={18} />
          </span>
          <div>
            <h2 className="font-bold text-slate-950">API & Channel Connections</h2>
            <p className="text-sm text-slate-500">Click any API to open it. Single save and save all are both available.</p>
          </div>
        </div>

        <form onSubmit={saveAllIntegrations} className="mt-4 space-y-3">
          {integrations.map((integration) => {
            const Icon = integration.icon
            const fields = Object.keys(configs[integration.id] || {})
              .filter((field) => !['connected', 'authCode', 'connectedAt', 'checkedAt'].includes(field))
            const isOpen = openIntegration === integration.id
            const isSocial = ['linkedin', 'facebook', 'instagram'].includes(integration.id)
            const isGoogle = integration.id === 'google'
            const isConnected = Boolean(configs[integration.id]?.connected)
            const hasCallbackCode = callbackCode && callbackSection === integration.id

            return (
              <div key={integration.id} className="rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setOpenIntegration(isOpen ? '' : integration.id)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <span className="flex items-start gap-3">
                    <span className="grid size-10 place-items-center rounded-lg bg-teal-50 text-teal-700">
                      <Icon size={18} />
                    </span>
                    <span>
                      <span className="block font-bold text-slate-950">{integration.title}</span>
                      <span className="block text-sm text-slate-500">{integration.description}</span>
                      {isConnected ? (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                          <CheckCircle2 size={13} />
                          Connected
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <ChevronDown className={`shrink-0 text-slate-500 transition ${isOpen ? 'rotate-180' : ''}`} size={18} />
                </button>

                {isOpen ? (
                  <div className="border-t border-slate-100 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      {fields.map((field) => (
                        <label key={field} className="block">
                          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">{fieldLabel(field)}</span>
                          <input
                            type={field.toLowerCase().includes('secret') || field.toLowerCase().includes('token') || field.toLowerCase().includes('key') || field.toLowerCase().includes('password') ? 'password' : 'text'}
                            className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
                            placeholder={fieldLabel(field)}
                            value={configs[integration.id][field]}
                            onChange={(event) => updateConfig(integration.id, field, event.target.value)}
                          />
                        </label>
                      ))}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {isGoogle ? (
                        <>
                          {hasCallbackCode ? (
                            <button type="button" onClick={exchangeGoogleToken} className="flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white">
                              <CheckCircle2 size={16} />
                              Confirm Google Login
                            </button>
                          ) : null}
                          <button type="button" onClick={() => handleSocialLogin(integration.id)} className="flex h-10 items-center gap-2 rounded-lg bg-teal-600 px-3 text-sm font-bold text-white">
                            <ExternalLink size={16} />
                            {isConnected ? 'Reconnect Google' : loginLabel(integration.id)}
                          </button>
                          <button type="button" onClick={checkGoogleApi} className="flex h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-700">
                            <CheckCircle2 size={16} />
                            Check Google API
                          </button>
                          <p className="w-full text-xs font-semibold text-slate-500">
                            Add the same Redirect URL in Google Cloud OAuth. Private calendars require backend token exchange or an access token.
                          </p>
                        </>
                      ) : null}
                      {isSocial ? (
                        <>
                          {hasCallbackCode ? (
                            <button type="button" onClick={() => markConnected(integration.id)} className="flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white">
                              <CheckCircle2 size={16} />
                              Confirm Connected
                            </button>
                          ) : null}
                          <button type="button" onClick={() => handleSocialLogin(integration.id)} className="flex h-10 items-center gap-2 rounded-lg bg-teal-600 px-3 text-sm font-bold text-white">
                            <ExternalLink size={16} />
                            {isConnected ? `Reconnect ${integration.title.replace(' Connect', '')}` : loginLabel(integration.id)}
                          </button>
                          <p className="w-full text-xs font-semibold text-slate-500">
                            App ID/Client ID and Redirect URL must also be added in the same platform developer console.
                          </p>
                        </>
                      ) : null}
                      <button type="button" onClick={() => saveIntegration(integration.id)} className="flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-bold text-white">
                        <Save size={16} />
                        Save This API
                      </button>
                      <button type="button" className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700">
                        <LinkIcon size={16} />
                        Test Connect
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}

          <button type="submit" className="flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 font-bold text-white">
            <Save size={18} />
            Save All API Settings
          </button>
        </form>
        {integrationMessage ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{integrationMessage}</p> : null}
      </section>
    </div>
  )
}
