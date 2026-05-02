const Agent = require('../models/Agent')
const Call = require('../models/Call')
const CustomerQueue = require('../models/CustomerQueue')
const DialerSession = require('../models/DialerSession')
const LeadBucket = require('../models/LeadBucket')
const TimelineEvent = require('../models/TimelineEvent')
const User = require('../models/User')

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
    completedAt: call.completedAt,
    recordingUrl: call.recordingUrl,
    recordingPublicId: call.recordingPublicId,
  }
}

function startOfDay(date = new Date()) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function customerQueueVisibilityQuery(user) {
  if (user.role === 'admin') {
    return {}
  }

  if (user.role === 'manager') {
    return { $or: [{ uploadedByRole: 'admin' }, { scopeManager: user._id }, { uploadedBy: user._id }] }
  }

  if (user.role === 'teamleader') {
    return { $or: [{ uploadedByRole: 'admin' }, { scopeTeamLeader: user._id }, { uploadedBy: user._id }] }
  }

  return { assignedTo: user._id }
}

async function getDashboard(req, res, next) {
  try {
    const isStaff = req.user.role === 'staff'
    const staffQueueQuery = customerQueueVisibilityQuery(req.user)
    const pendingQueueQuery = { status: isStaff ? 'assigned' : 'pending', ...staffQueueQuery }
    const completedQueueQuery = { status: 'completed', ...staffQueueQuery }
    const [agents, calls, leads, timeline, pendingCalls, completedCalls, pendingCustomers, users, sessions] = await Promise.all([
      Agent.find().sort({ createdAt: 1 }).lean(),
      Call.find().sort({ createdAt: -1 }).limit(500).lean(),
      LeadBucket.find(req.user.role === 'admin' ? {} : { createdBy: req.user._id }).sort({ createdAt: 1 }).lean(),
      TimelineEvent.find({ createdBy: req.user._id }).sort({ createdAt: -1 }).limit(10).lean(),
      CustomerQueue.countDocuments(pendingQueueQuery),
      CustomerQueue.countDocuments(completedQueueQuery),
      CustomerQueue.find(pendingQueueQuery).sort({ createdAt: 1 }).limit(200).lean(),
      User.find({ role: { $in: ['manager', 'teamleader', 'staff'] } }).sort({ createdAt: -1 }).lean(),
      DialerSession.find().sort({ updatedAt: -1 }).lean(),
    ])

    const roleTitles = {
      admin: 'Admin Dashboard',
      manager: 'Manager Dashboard',
      teamleader: 'Team Leader Dashboard',
      staff: 'Calling Staff Dashboard',
    }

    const staffUsers = users.filter((user) => user.role === 'staff')
    const visibleStaff =
      req.user.role === 'admin'
        ? staffUsers
        : req.user.role === 'staff'
          ? staffUsers.filter((staff) => String(staff._id) === String(req.user._id))
          : req.user.role === 'manager'
            ? staffUsers.filter((staff) => String(staff.assignedManager) === String(req.user._id))
            : staffUsers.filter((staff) => String(staff.assignedTeamLeader) === String(req.user._id))
    const visibleUsers =
      req.user.role === 'admin'
        ? users
        : req.user.role === 'manager'
          ? users.filter((user) => String(user._id) === String(req.user._id) || String(user.assignedManager) === String(req.user._id))
          : req.user.role === 'teamleader'
            ? users.filter((user) => String(user._id) === String(req.user._id) || String(user.assignedTeamLeader) === String(req.user._id))
            : visibleStaff
    const visibleStaffNames = new Set(visibleStaff.map((staff) => staff.name))
    const latestSessionByStaff = new Map()

    sessions.forEach((session) => {
      const key = String(session.staff)
      if (!latestSessionByStaff.has(key)) {
        latestSessionByStaff.set(key, session)
      }
    })

    const visibleAgents = req.user.role === 'staff' ? agents.filter((agent) => agent.name === req.user.name) : agents
    const visibleCalls =
      req.user.role === 'admin' ? calls : calls.filter((call) => visibleStaffNames.has(call.agent))
    const canViewTaggings = ['admin', 'manager', 'teamleader', 'staff'].includes(req.user.role)
    const liveCalls = canViewTaggings ? visibleCalls.length : 0
    const liveTalkCalls = visibleCalls.filter((call) => ['Dialing', 'Outcall'].includes(call.stage)).length
    const todayStart = startOfDay()
    const dailyTaggings = Array.from({ length: 14 }, (_, index) => {
      const date = startOfDay(new Date(todayStart))
      date.setDate(todayStart.getDate() - (13 - index))
      const nextDate = startOfDay(new Date(date))
      nextDate.setDate(date.getDate() + 1)
      const count = visibleCalls.filter((call) => {
        const taggedAt = call.completedAt ? new Date(call.completedAt) : null
        return taggedAt && taggedAt >= date && taggedAt < nextDate
      }).length

      return {
        date: date.toISOString(),
        count,
      }
    })
    const agentsOnline = visibleStaff.filter((staff) => {
      const session = latestSessionByStaff.get(String(staff._id))
      return session && ['ready', 'on_call', 'outcall'].includes(session.status)
    }).length
    const conversions =
      visibleAgents.length === 0
        ? 0
        : Math.round(visibleAgents.reduce((total, agent) => total + agent.conversion, 0) / visibleAgents.length)
    const managerCount = users.filter((user) => user.role === 'manager').length
    const teamLeaderCount = users.filter((user) => user.role === 'teamleader').length
    const staffCallSummary = visibleStaff.map((staff) => {
      const staffCalls = calls.filter((call) => call.agent === staff.name)
      const session = latestSessionByStaff.get(String(staff._id))

      return {
        id: staff._id,
        name: staff.name,
        staffId: staff.staffId,
        team: staff.team,
        totalCalls: staffCalls.length,
        interested: staffCalls.filter((call) => call.sentiment === 'Interested').length,
        hotLead: staffCalls.filter((call) => call.sentiment === 'Hot Lead').length,
        callback: staffCalls.filter((call) => call.sentiment === 'Callback').length,
        status: session?.status || 'not_ready',
        lastCallAt: session?.lastCallAt,
      }
    })

    res.json({
      dashboardTitle: roleTitles[req.user.role],
      role: req.user.role,
      stats: [
        ...(canViewTaggings ? [{ label: 'Taggings', value: String(liveCalls), change: '+18%', tone: 'emerald', view: 'calls', filter: 'live' }] : []),
        { label: 'Pending Calls', value: String(pendingCalls), change: 'Queue', tone: 'violet', view: 'pending' },
        { label: 'Completed Calls', value: String(completedCalls), change: 'Done', tone: 'emerald', view: 'pending', filter: 'completed' },
        ...(canViewTaggings ? [{ label: 'Live Talk', value: String(liveTalkCalls), change: 'Talking now', tone: 'sky', view: 'calls', filter: 'live-talk' }] : []),
        ...(req.user.role !== 'admin'
          ? []
          : [{ label: 'Agents Online', value: String(agentsOnline), change: `${visibleStaff.length} staff`, tone: 'sky', view: 'agents', filter: 'online' }]),
        ...(req.user.role !== 'admin'
          ? []
          : [{ label: 'Calling Staff', value: String(visibleStaff.length), change: req.user.role === 'admin' ? 'All' : 'Team', tone: 'amber', view: 'livecall-staff', filter: 'staff' }]),
        ...(req.user.role === 'admin'
          ? [
              { label: 'Managers', value: String(managerCount), change: 'Registered', tone: 'rose', view: 'team', filter: 'manager' },
              { label: 'Team Leaders', value: String(teamLeaderCount), change: 'Registered', tone: 'violet', view: 'team', filter: 'teamleader' },
            ]
          : []),
        { label: 'Conversions', value: `${conversions}%`, change: '+7%', tone: 'rose', view: 'sales-leads' },
      ],
      staffCallSummary,
      teamMembers: visibleUsers.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        staffId: user.staffId,
        role: user.role,
        phone: user.phone,
        team: user.team,
        isActive: user.isActive,
      })),
      pendingCustomers: pendingCustomers.map((customer) => ({
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        createdAt: customer.createdAt,
      })),
      callQueueSummary: {
        pending: pendingCalls,
        completed: completedCalls,
        liveTalk: liveTalkCalls,
      },
      dailyTaggings,
      agents: visibleAgents.map((agent) => ({ ...agent, id: agent._id })),
      calls: canViewTaggings ? visibleCalls.map(mapCall) : [],
      timeline,
      leads,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = { getDashboard }
