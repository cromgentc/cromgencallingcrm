const crypto = require('crypto')
const Call = require('../models/Call')
const CustomerQueue = require('../models/CustomerQueue')
const DialerSession = require('../models/DialerSession')
const StaffMessage = require('../models/StaffMessage')
const User = require('../models/User')
const { uploadAudioBuffer } = require('../services/cloudinaryService')

function mapSession(session) {
  return {
    token: session.token,
    status: session.status,
    authorizedAt: session.authorizedAt,
    lastCallAt: session.lastCallAt,
  }
}

function mapDialerCall(call) {
  return {
    id: call.callId,
    customer: call.customer,
    phone: call.phone,
    agent: call.agent,
    stage: call.stage,
    sentiment: call.sentiment,
    remark: call.remark,
  }
}

function formatDuration(start, end = new Date()) {
  const startedAt = start ? new Date(start) : null
  if (!startedAt || Number.isNaN(startedAt.getTime())) {
    return '00:00'
  }

  const totalSeconds = Math.max(0, Math.floor((new Date(end).getTime() - startedAt.getTime()) / 1000))
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function queueScopeForStaff(staff) {
  const scope = [{ uploadedByRole: 'admin' }, { uploadedByRole: { $exists: false } }]

  if (staff.assignedManager) {
    scope.push({ scopeManager: staff.assignedManager })
  }

  if (staff.assignedTeamLeader) {
    scope.push({ scopeTeamLeader: staff.assignedTeamLeader })
  }

  return scope
}

async function createSession(req, res, next) {
  try {
    if (req.user.role !== 'staff') {
      return res.status(403).json({ message: 'Dialer links are only available for calling staff.' })
    }

    const token = crypto.randomBytes(24).toString('hex')
    const session = await DialerSession.create({ token, staff: req.user._id })

    res.status(201).json(mapSession(session))
  } catch (error) {
    next(error)
  }
}

async function authorizeSession(req, res, next) {
  try {
    const { staffId, password } = req.body || {}

    if (!staffId || !password) {
      return res.status(400).json({ message: 'staffId and password are required' })
    }

    const session = await DialerSession.findOne({ token: req.params.token })

    if (!session) {
      return res.status(404).json({ message: 'dialer link not found' })
    }

    const staff = await User.findOne({ _id: session.staff, staffId: staffId.toUpperCase(), role: 'staff' }).select('+password')

    if (!staff || !(await staff.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid staff ID or password' })
    }

    session.authorizedAt = new Date()
    session.status = 'not_ready'
    await session.save()

    res.json({
      session: mapSession(session),
      staff: {
        id: staff._id,
        name: staff.name,
        staffId: staff.staffId,
        role: staff.role,
        team: staff.team,
      },
    })
  } catch (error) {
    next(error)
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status } = req.body || {}
    const session = await DialerSession.findOne({ token: req.params.token })

    if (!session || !session.authorizedAt) {
      return res.status(401).json({ message: 'Dialer is not authorized.' })
    }

    if (!['ready', 'not_ready', 'on_call', 'outcall'].includes(status)) {
      return res.status(400).json({ message: 'Invalid dialer status' })
    }

    session.status = status
    await session.save()

    res.json(mapSession(session))
  } catch (error) {
    next(error)
  }
}

async function getNextCall(req, res, next) {
  try {
    const session = await DialerSession.findOne({ token: req.params.token }).populate('staff')

    if (!session || !session.authorizedAt) {
      return res.status(401).json({ message: 'Dialer is not authorized.' })
    }

    if (session.status !== 'ready') {
      return res.status(409).json({ message: 'Calls are not assigned while status is Not Ready.' })
    }

    const queuedCustomer = await CustomerQueue.findOneAndUpdate(
      {
        status: 'pending',
        $or: queueScopeForStaff(session.staff),
      },
      {
        status: 'assigned',
        assignedTo: session.staff._id,
        assignedToName: session.staff.name,
      },
      { new: true, sort: { createdAt: 1 } },
    )

    if (!queuedCustomer) {
      session.status = 'ready'
      await session.save()

      return res.json({
        session: mapSession(session),
        call: null,
        telUrl: '',
        message: 'No customer calls are available in the queue.',
      })
    }

    const totalCalls = await Call.countDocuments()
    const call = await Call.create({
      callId: `CL-${2051 + totalCalls}`,
      customer: queuedCustomer.name,
      phone: queuedCustomer.phone,
      agent: session.staff.name,
      stage: 'Dialing',
      sentiment: 'Neutral',
    })

    queuedCustomer.assignedCallId = call.callId
    await queuedCustomer.save()

    session.status = 'outcall'
    session.lastCallAt = new Date()
    await session.save()

    res.json({ session: mapSession(session), call: mapDialerCall(call), telUrl: `tel:${call.phone}` })
  } catch (error) {
    next(error)
  }
}

async function createOutcall(req, res, next) {
  try {
    const { customer = 'Manual Outcall', phone } = req.body || {}
    const session = await DialerSession.findOne({ token: req.params.token }).populate('staff')

    if (!session || !session.authorizedAt) {
      return res.status(401).json({ message: 'Dialer is not authorized.' })
    }

    if (!phone) {
      return res.status(400).json({ message: 'phone is required' })
    }

    const totalCalls = await Call.countDocuments()
    const call = await Call.create({
      callId: `CL-${2051 + totalCalls}`,
      customer,
      phone,
      agent: session.staff.name,
      stage: 'Outcall',
      sentiment: 'Neutral',
    })

    session.status = 'on_call'
    session.lastCallAt = new Date()
    await session.save()

    res.status(201).json({ session: mapSession(session), call: mapDialerCall(call), telUrl: `tel:${phone}` })
  } catch (error) {
    next(error)
  }
}

async function completeCall(req, res, next) {
  try {
    const { sentiment, remark } = req.body || {}
    const allowedTags = ['Interested', 'Hot Lead', 'Not Interested', 'No Response', 'Call Disconnected', 'Callback', 'Call Handling', 'Neutral']
    const session = await DialerSession.findOne({ token: req.params.token }).populate('staff')

    if (!session || !session.authorizedAt) {
      return res.status(401).json({ message: 'Dialer is not authorized.' })
    }

    if (!allowedTags.includes(sentiment)) {
      return res.status(400).json({ message: 'Valid tagging required' })
    }

    const call = await Call.findOne({ callId: req.params.callId, agent: session.staff.name })

    if (!call) {
      return res.status(404).json({ message: 'call not found for this staff' })
    }

    call.sentiment = sentiment
    call.remark = remark || ''
    call.stage = 'Completed'
    call.completedAt = new Date()
    call.duration = formatDuration(call.createdAt, call.completedAt)
    await call.save()

    await CustomerQueue.findOneAndUpdate(
      { assignedCallId: call.callId },
      {
        status: 'completed',
        assignedTo: session.staff._id,
        assignedToName: session.staff.name,
        assignedCallId: call.callId,
        completedAt: new Date(),
      },
    )

    session.status = 'ready'
    await session.save()

    res.json({ session: mapSession(session), call: mapDialerCall(call), nextDelaySeconds: 5 })
  } catch (error) {
    next(error)
  }
}

async function connectCall(req, res, next) {
  try {
    const session = await DialerSession.findOne({ token: req.params.token }).populate('staff')

    if (!session || !session.authorizedAt) {
      return res.status(401).json({ message: 'Dialer is not authorized.' })
    }

    const call = await Call.findOne({ callId: req.params.callId, agent: session.staff.name })

    if (!call) {
      return res.status(404).json({ message: 'call not found for this staff' })
    }

    if (call.stage === 'Completed') {
      return res.status(409).json({ message: 'Completed calls cannot be recorded.' })
    }

    call.stage = 'On Call'
    await call.save()

    session.status = 'on_call'
    await session.save()

    res.json({ session: mapSession(session), call: mapDialerCall(call) })
  } catch (error) {
    next(error)
  }
}

async function uploadDialerRecording(req, res, next) {
  try {
    const session = await DialerSession.findOne({ token: req.params.token }).populate('staff')

    if (!session || !session.authorizedAt) {
      return res.status(401).json({ message: 'Dialer is not authorized.' })
    }

    if (!req.file) {
      return res.status(400).json({ message: 'recording audio file is required' })
    }

    const call = await Call.findOne({ callId: req.params.callId, agent: session.staff.name })

    if (!call) {
      return res.status(404).json({ message: 'call not found for this staff' })
    }

    if (call.stage !== 'On Call') {
      return res.status(409).json({ message: 'Recording can start only after the call is connected.' })
    }

    const uploadResult = await uploadAudioBuffer(req.file.buffer, req.file.originalname)

    call.recordingUrl = uploadResult.secure_url
    call.recordingPublicId = uploadResult.public_id
    call.recordingFormat = uploadResult.format
    call.recordingBytes = uploadResult.bytes
    await call.save()

    res.json({ call: mapDialerCall(call), recordingUrl: call.recordingUrl })
  } catch (error) {
    next(error)
  }
}

async function getDialerMessages(req, res, next) {
  try {
    const session = await DialerSession.findOne({ token: req.params.token })

    if (!session || !session.authorizedAt) {
      return res.status(401).json({ message: 'Dialer is not authorized.' })
    }

    const messages = await StaffMessage.find({ $or: [{ to: session.staff }, { from: session.staff }] })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean()
    res.json(
      messages.map((message) => ({
        id: message._id,
        fromName: message.fromName,
        body: message.body,
        fromMe: String(message.from) === String(session.staff),
        createdAt: message.createdAt,
      })),
    )
  } catch (error) {
    next(error)
  }
}

async function replyDialerMessage(req, res, next) {
  try {
    const { body } = req.body || {}
    const session = await DialerSession.findOne({ token: req.params.token }).populate('staff')

    if (!session || !session.authorizedAt) {
      return res.status(401).json({ message: 'Dialer is not authorized.' })
    }

    if (!body) {
      return res.status(400).json({ message: 'message is required' })
    }

    const original = await StaffMessage.findById(req.params.messageId).lean()

    if (!original || String(original.to) !== String(session.staff._id)) {
      return res.status(404).json({ message: 'message not found for this staff' })
    }

    const reply = await StaffMessage.create({
      from: session.staff._id,
      fromName: session.staff.name,
      to: original.from,
      body,
    })

    res.status(201).json({
      id: reply._id,
      fromName: reply.fromName,
      body: reply.body,
      fromMe: true,
      createdAt: reply.createdAt,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = { authorizeSession, completeCall, connectCall, createOutcall, createSession, getDialerMessages, getNextCall, replyDialerMessage, updateStatus, uploadDialerRecording }
