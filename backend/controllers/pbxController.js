const Call = require('../models/Call')
const { originateOutboundCall } = require('../services/asteriskAmiService')
const { createCallWithUniqueId } = require('../utils/callId')

function mapCall(call) {
  return {
    id: call.callId,
    customer: call.customer,
    phone: call.phone,
    agent: call.agent,
    stage: call.stage,
    duration: call.duration,
    sentiment: call.sentiment,
    remark: call.remark,
    connectedAt: call.connectedAt,
    completedAt: call.completedAt,
  }
}

async function originateCall(req, res, next) {
  try {
    const { agentExtension, phone, customer = 'PBX Call', callId, record = false } = req.body || {}

    if (!agentExtension || !phone) {
      return res.status(400).json({ message: 'agentExtension and phone are required' })
    }

    let call = callId ? await Call.findOne({ callId }) : null

    if (!call) {
      call = await createCallWithUniqueId({
        customer,
        phone,
        agent: req.user.name,
        stage: 'On Call',
        sentiment: 'Neutral',
        connectedAt: new Date(),
      })
    } else {
      call.stage = 'On Call'
      call.connectedAt = call.connectedAt || new Date()
      await call.save()
    }

    const originate = await originateOutboundCall({
      agentExtension,
      phone,
      callId: call.callId,
      customer: call.customer,
      agentName: req.user.name,
      record,
    })

    res.status(202).json({
      message: 'PBX call sent to Asterisk.',
      call: mapCall(call),
      actionId: originate.actionId,
      ami: originate.response,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = { originateCall }
