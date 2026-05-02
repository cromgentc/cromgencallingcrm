let Client
let LocalAuth
let qrcode
const fs = require('fs')
const path = require('path')

try {
  ;({ Client, LocalAuth } = require('whatsapp-web.js'))
  qrcode = require('qrcode')
} catch (error) {
  // Dependencies are optional until installed with npm install.
}

function createSession() {
  return {
  client: null,
  status: 'not_started',
  qr: '',
  qrImage: '',
  number: '',
  name: '',
  lastError: '',
  }
}

const WHATSAPP_CLIENT_ID = process.env.WHATSAPP_CLIENT_ID || 'calltrack-crm'
const WHATSAPP_AUTH_DATA_PATH = path.resolve(
  process.env.WHATSAPP_AUTH_DATA_PATH || path.join(process.cwd(), '.wwebjs_auth_calltrack')
)
const sessions = new Map()

function userSessionKey(req) {
  return String(req.user?._id || req.user?.staffId || req.user?.email || 'anonymous')
}

function getSession(req) {
  const key = userSessionKey(req)
  if (!sessions.has(key)) {
    sessions.set(key, createSession())
  }
  return sessions.get(key)
}

function chromeExecutablePath() {
  const configuredPath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH

  if (configuredPath && fs.existsSync(configuredPath)) {
    return configuredPath
  }

  return undefined
}

function userClientId(req) {
  return `${WHATSAPP_CLIENT_ID}-${userSessionKey(req)}`
}

function whatsappSessionDir(req) {
  return path.join(WHATSAPP_AUTH_DATA_PATH, `session-${userClientId(req)}`)
}

function whatsappStartErrorMessage(error, req) {
  const message = error.message || 'WhatsApp session start failed'

  if (message.includes('browser is already running') || message.includes('userDataDir')) {
    return [
      `WhatsApp browser profile is already in use: ${whatsappSessionDir(req)}.`,
      'Close the other backend/browser or set a different WHATSAPP_AUTH_DATA_PATH folder.',
    ].join(' ')
  }

  if (message.includes('spawn EPERM')) {
    return [
      'WhatsApp browser could not start because Windows blocked the browser process.',
      'The app will use bundled Chromium unless CHROME_PATH or PUPPETEER_EXECUTABLE_PATH is set to an allowed Chrome executable.',
    ].join(' ')
  }

  return message
}

function dependencyGuard(res) {
  if (!Client || !LocalAuth || !qrcode) {
    res.status(503).json({
      message: 'WhatsApp dependencies are not installed. Run npm install in the backend folder.',
      status: 'missing_dependencies',
    })
    return false
  }

  return true
}

function publicStatus(session) {
  return {
    connected: session.status === 'connected',
    status: session.status,
    number: session.number,
    name: session.name,
    qrImage: session.qrImage,
    lastError: session.lastError,
  }
}

function requireConnected(session, res) {
  if (!session.client || session.status !== 'connected') {
    res.status(409).json({ message: 'WhatsApp is not connected yet. Scan the QR code first.' })
    return false
  }

  return true
}

function mapChat(chat) {
  return {
    id: chat.id?._serialized || '',
    name: chat.name || chat.formattedTitle || chat.id?.user || 'Unknown chat',
    archived: Boolean(chat.archived),
    isGroup: Boolean(chat.isGroup),
    unreadCount: chat.unreadCount || 0,
    timestamp: chat.timestamp || 0,
    lastMessage: chat.lastMessage?.body || '',
  }
}

function mapMessage(message) {
  return {
    id: message.id?._serialized || `${message.timestamp}-${message.fromMe ? 'out' : 'in'}`,
    body: message.body || '',
    fromMe: Boolean(message.fromMe),
    fromName: message.fromMe ? 'You' : message._data?.notifyName || message.author || message.from || '',
    createdAt: message.timestamp ? new Date(message.timestamp * 1000).toISOString() : '',
    type: message.type || 'chat',
  }
}

function attachClientEvents(client, session) {
  client.on('qr', async (qr) => {
    session.status = 'qr_ready'
    session.qr = qr
    session.qrImage = await qrcode.toDataURL(qr)
    session.lastError = ''
  })

  client.on('ready', async () => {
    session.status = 'connected'
    session.qr = ''
    session.qrImage = ''

    const info = client.info || {}
    session.number = info.wid?.user || info.me?.user || ''
    session.name = info.pushname || ''
    session.lastError = ''
  })

  client.on('authenticated', () => {
    session.status = 'authenticated'
    session.lastError = ''
  })

  client.on('auth_failure', (message) => {
    session.status = 'auth_failed'
    session.lastError = message || 'WhatsApp authentication failed'
  })

  client.on('disconnected', (reason) => {
    session.status = 'disconnected'
    session.lastError = reason || ''
    session.client = null
  })
}

async function startWhatsAppSession(req, res) {
  const session = getSession(req)

  if (!dependencyGuard(res)) {
    return
  }

  if (session.client && !['error', 'auth_failed', 'disconnected'].includes(session.status)) {
    return res.json(publicStatus(session))
  }

  if (session.client) {
    try {
      await session.client.destroy()
    } catch (error) {
      // Continue with a clean client.
    }
    session.client = null
  }

  session.status = 'starting'
  session.lastError = ''
  fs.mkdirSync(WHATSAPP_AUTH_DATA_PATH, { recursive: true })

  const executablePath = chromeExecutablePath()

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: userClientId(req), dataPath: WHATSAPP_AUTH_DATA_PATH }),
    authTimeoutMs: 45000,
    qrMaxRetries: 3,
    takeoverOnConflict: true,
    takeoverTimeoutMs: 0,
    puppeteer: {
      headless: 'new',
      ...(executablePath ? { executablePath } : {}),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-gpu',
        '--disable-sync',
        '--disable-translate',
        '--disable-notifications',
        '--disable-popup-blocking',
        '--disable-features=Translate,BackForwardCache,MediaRouter',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--no-first-run',
        '--no-default-browser-check',
        '--window-size=1280,900',
      ],
    },
  })

  session.client = client
  attachClientEvents(client, session)
  client.initialize().catch((error) => {
    session.status = 'error'
    session.lastError = whatsappStartErrorMessage(error, req)
    session.client = null
  })

  res.json(publicStatus(session))
}

function getWhatsAppStatus(req, res) {
  res.json(publicStatus(getSession(req)))
}

async function getWhatsAppChats(req, res) {
  const session = getSession(req)

  if (!requireConnected(session, res)) {
    return
  }

  try {
    const chats = await session.client.getChats()
    res.json(
      chats
        .map(mapChat)
        .filter((chat) => chat.id)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50),
    )
  } catch (error) {
    res.status(500).json({ message: error.message || 'WhatsApp chats could not be loaded.' })
  }
}

async function getWhatsAppMessages(req, res) {
  const session = getSession(req)

  if (!requireConnected(session, res)) {
    return
  }

  try {
    const chat = await session.client.getChatById(req.params.chatId)
    const messages = await chat.fetchMessages({ limit: Number(req.query.limit) || 40 })
    res.json(messages.map(mapMessage))
  } catch (error) {
    res.status(500).json({ message: error.message || 'WhatsApp messages could not be loaded.' })
  }
}

async function sendWhatsAppMessage(req, res) {
  const session = getSession(req)

  if (!requireConnected(session, res)) {
    return
  }

  const body = `${req.body?.message || ''}`.trim()
  if (!body) {
    return res.status(400).json({ message: 'Message is required.' })
  }

  try {
    const sent = await session.client.sendMessage(req.params.chatId, body)
    res.json(mapMessage(sent))
  } catch (error) {
    res.status(500).json({ message: error.message || 'WhatsApp message could not be sent.' })
  }
}

async function resetWhatsAppSession(req, res) {
  const session = getSession(req)

  try {
    if (session.client) {
      await session.client.destroy()
    }
  } catch (error) {
    session.lastError = error.message || ''
  }

  session.client = null
  session.status = 'not_started'
  session.qr = ''
  session.qrImage = ''
  session.number = ''
  session.name = ''

  res.json(publicStatus(session))
}

module.exports = {
  getWhatsAppChats,
  getWhatsAppMessages,
  getWhatsAppStatus,
  resetWhatsAppSession,
  sendWhatsAppMessage,
  startWhatsAppSession,
}
