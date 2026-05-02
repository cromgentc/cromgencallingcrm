const Call = require('../models/Call')
const CustomerQueue = require('../models/CustomerQueue')
const User = require('../models/User')
const { uploadAudioBuffer } = require('../services/cloudinaryService')

const TAGS = ['Interested', 'Hot Lead', 'Not Interested', 'No Response', 'Call Disconnected', 'Callback', 'Call Handling', 'Neutral']

async function callOwnerQuery(req, extra = {}) {
  if (req.user.role === 'admin') {
    return extra
  }

  if (req.user.role === 'staff') {
    return { ...extra, agent: req.user.name }
  }

  const staffQuery =
    req.user.role === 'manager'
      ? { role: 'staff', assignedManager: req.user._id }
      : { role: 'staff', assignedTeamLeader: req.user._id }
  const staff = await User.find(staffQuery).select('name').lean()

  return { ...extra, agent: { $in: staff.map((member) => member.name) } }
}

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
    createdAt: call.createdAt,
    completedAt: call.completedAt,
    recordingUrl: call.recordingUrl,
    recordingPublicId: call.recordingPublicId,
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

async function createCall(req, res, next) {
  try {
    const { customer, phone, stage, duration, sentiment } = req.body
    const agent = req.user.role === 'staff' ? req.user.name : req.body.agent

    if (!customer || !phone || !agent) {
      return res.status(400).json({ message: 'customer, phone, and agent are required' })
    }

    const totalCalls = await Call.countDocuments()
    const queuedCustomer = await CustomerQueue.findOne({ phone })

    if (queuedCustomer?.status === 'completed') {
      return res.status(409).json({ message: 'This customer number already completed calling' })
    }

    const call = await Call.create({
      callId: `CL-${2051 + totalCalls}`,
      customer,
      phone,
      agent,
      stage,
      duration,
      sentiment,
    })

    if (queuedCustomer) {
      queuedCustomer.status = 'assigned'
      queuedCustomer.assignedToName = agent
      queuedCustomer.assignedCallId = call.callId
      await queuedCustomer.save()
    }

    res.status(201).json(mapCall(call))
  } catch (error) {
    next(error)
  }
}

async function updateCall(req, res, next) {
  try {
    const { sentiment, remark, stage } = req.body
    const call = await Call.findOne(await callOwnerQuery(req, { callId: req.params.callId }))

    if (!call) {
      return res.status(404).json({ message: 'call not found' })
    }

    if (sentiment && !TAGS.includes(sentiment)) {
      return res.status(400).json({ message: 'Invalid call tag' })
    }

    if (sentiment) {
      call.sentiment = sentiment
      call.completedAt = new Date()
      call.stage = stage || 'Completed'
      call.duration = call.duration && call.duration !== '00:00' ? call.duration : formatDuration(call.createdAt, call.completedAt)
    } else if (stage) {
      call.stage = stage
    }

    if (remark !== undefined) {
      call.remark = remark
    }

    await call.save()

    if (sentiment) {
      await CustomerQueue.findOneAndUpdate(
        { phone: call.phone },
        {
          status: 'completed',
          assignedToName: call.agent,
          assignedCallId: call.callId,
          completedAt: new Date(),
        },
      )
    }

    res.json(mapCall(call))
  } catch (error) {
    next(error)
  }
}

async function getCalls(req, res, next) {
  try {
    const calls = await Call.find(await callOwnerQuery(req)).sort({ createdAt: -1 }).lean()
    res.json(calls.map(mapCall))
  } catch (error) {
    next(error)
  }
}

async function uploadRecording(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'recording audio file is required' })
    }

    const call = await Call.findOne(await callOwnerQuery(req, { callId: req.params.callId }))

    if (!call) {
      return res.status(404).json({ message: 'call not found' })
    }

    const uploadResult = await uploadAudioBuffer(req.file.buffer, req.file.originalname)

    call.recordingUrl = uploadResult.secure_url
    call.recordingPublicId = uploadResult.public_id
    call.recordingFormat = uploadResult.format
    call.recordingBytes = uploadResult.bytes
    await call.save()

    res.json(mapCall(call))
  } catch (error) {
    next(error)
  }
}

async function getRecording(req, res, next) {
  try {
    const call = await Call.findOne(await callOwnerQuery(req, { callId: req.params.callId })).lean()

    if (!call) {
      return res.status(404).json({ message: 'call not found' })
    }

    if (!call.recordingUrl) {
      return res.status(404).json({ message: 'recording not uploaded yet' })
    }

    res.json({
      callId: call.callId,
      recordingUrl: call.recordingUrl,
      recordingPublicId: call.recordingPublicId,
      recordingFormat: call.recordingFormat,
      recordingBytes: call.recordingBytes,
    })
  } catch (error) {
    next(error)
  }
}

function buildDownloadUrl(url) {
  if (!url || !url.includes('/upload/')) {
    return url
  }

  return url.replace('/upload/', '/upload/fl_attachment/')
}

async function downloadRecording(req, res, next) {
  try {
    const call = await Call.findOne(await callOwnerQuery(req, { callId: req.params.callId })).lean()

    if (!call) {
      return res.status(404).json({ message: 'call not found' })
    }

    if (!call.recordingUrl) {
      return res.status(404).json({ message: 'recording not uploaded yet' })
    }

    res.redirect(buildDownloadUrl(call.recordingUrl))
  } catch (error) {
    next(error)
  }
}

async function deleteCall(req, res, next) {
  try {
    const result = await Call.deleteOne({ callId: req.params.callId })

    res.json({ deleted: result.deletedCount })
  } catch (error) {
    next(error)
  }
}

async function deleteCalls(req, res, next) {
  try {
    const callIds = Array.isArray(req.body.callIds) ? req.body.callIds.filter(Boolean) : []

    if (!callIds.length) {
      return res.status(400).json({ message: 'Select at least one tagging to delete' })
    }

    const result = await Call.deleteMany({ callId: { $in: callIds } })

    res.json({ deleted: result.deletedCount, callIds })
  } catch (error) {
    next(error)
  }
}

module.exports = { createCall, deleteCall, deleteCalls, downloadRecording, getCalls, getRecording, updateCall, uploadRecording }
