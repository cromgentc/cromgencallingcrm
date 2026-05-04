const net = require('net')

function amiConfig() {
  return {
    host: process.env.ASTERISK_AMI_HOST || '127.0.0.1',
    port: Number(process.env.ASTERISK_AMI_PORT || 5038),
    username: process.env.ASTERISK_AMI_USER || '',
    secret: process.env.ASTERISK_AMI_SECRET || '',
    timeoutMs: Number(process.env.ASTERISK_AMI_TIMEOUT_MS || 10000),
  }
}

function serializeAction(action) {
  const lines = []

  Object.entries(action).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item) => lines.push(`${key}: ${item}`))
      return
    }

    lines.push(`${key}: ${value}`)
  })

  return `${lines.join('\r\n')}\r\n\r\n`
}

function parsePackets(buffer) {
  return buffer
    .split('\r\n\r\n')
    .filter(Boolean)
    .map((packet) =>
      packet.split('\r\n').reduce((result, line) => {
        const index = line.indexOf(':')
        if (index === -1) {
          return result
        }

        result[line.slice(0, index).trim()] = line.slice(index + 1).trim()
        return result
      }, {}),
    )
}

function sendAmiActions(actions) {
  const config = amiConfig()

  if (!config.username || !config.secret) {
    return Promise.reject(new Error('Asterisk AMI credentials are missing. Set ASTERISK_AMI_USER and ASTERISK_AMI_SECRET.'))
  }

  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: config.host, port: config.port })
    const actionId = actions[actions.length - 1].ActionID
    let buffer = ''
    let settled = false

    const finish = (error, result) => {
      if (settled) {
        return
      }

      settled = true
      socket.destroy()
      if (error) {
        reject(error)
        return
      }

      resolve(result)
    }

    const timer = setTimeout(() => {
      finish(new Error('Asterisk AMI request timed out.'))
    }, config.timeoutMs)

    socket.on('connect', () => {
      socket.write(
        serializeAction({
          Action: 'Login',
          Username: config.username,
          Secret: config.secret,
          Events: 'off',
        }),
      )

      actions.forEach((action) => socket.write(serializeAction(action)))
      socket.write(serializeAction({ Action: 'Logoff' }))
    })

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8')
      const packets = parsePackets(buffer)
      const matchingPacket = packets.find((packet) => packet.ActionID === actionId)

      if (!matchingPacket) {
        return
      }

      clearTimeout(timer)

      if (matchingPacket.Response && matchingPacket.Response.toLowerCase() === 'error') {
        finish(new Error(matchingPacket.Message || 'Asterisk AMI returned an error.'))
        return
      }

      finish(null, matchingPacket)
    })

    socket.on('error', (error) => {
      clearTimeout(timer)
      finish(error)
    })

    socket.on('close', () => {
      clearTimeout(timer)
      if (!settled) {
        finish(new Error('Asterisk AMI connection closed before a response was received.'))
      }
    })
  })
}

function cleanDialString(value) {
  return String(value || '').replace(/[^\d+]/g, '')
}

function cleanExtension(value) {
  return String(value || '').replace(/[^\dA-Za-z_-]/g, '')
}

async function originateOutboundCall({ agentExtension, phone, callId, customer, agentName, record = false }) {
  const cleanAgentExtension = cleanExtension(agentExtension)
  const cleanPhone = cleanDialString(phone)

  if (!cleanAgentExtension || !cleanPhone) {
    throw new Error('agentExtension and phone are required for PBX calling.')
  }

  const actionId = `crm-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const context = process.env.ASTERISK_ORIGINATE_CONTEXT || 'crm-outbound'
  const callerId = process.env.ASTERISK_CALLER_ID || agentName || 'CRM'
  const timeout = Number(process.env.ASTERISK_ORIGINATE_TIMEOUT_MS || 30000)

  const response = await sendAmiActions([
    {
      Action: 'Originate',
      ActionID: actionId,
      Channel: `PJSIP/${cleanAgentExtension}`,
      Context: context,
      Exten: cleanPhone,
      Priority: 1,
      Timeout: timeout,
      CallerID: callerId,
      Async: 'true',
      Variable: [
        `CRM_CALL_ID=${cleanExtension(callId)}`,
        `CRM_CUSTOMER=${String(customer || '').replace(/[;\r\n]/g, ' ').slice(0, 80)}`,
        `CRM_AGENT=${String(agentName || '').replace(/[;\r\n]/g, ' ').slice(0, 80)}`,
        `CRM_RECORD=${record ? '1' : '0'}`,
      ],
    },
  ])

  return { actionId, response }
}

module.exports = { originateOutboundCall }
