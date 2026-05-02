const Agent = require('../models/Agent')
const Call = require('../models/Call')
const LeadBucket = require('../models/LeadBucket')
const User = require('../models/User')

function staffQueryForReporter(user) {
  if (user.role === 'manager') {
    return { role: 'staff', assignedManager: user._id }
  }

  if (user.role === 'teamleader') {
    return { role: 'staff', assignedTeamLeader: user._id }
  }

  if (user.role === 'staff') {
    return { _id: user._id, role: 'staff' }
  }

  return { role: 'staff' }
}

async function getReports(req, res, next) {
  try {
    const visibleStaff = await User.find(staffQueryForReporter(req.user)).select('_id name').lean()
    const visibleStaffNames = visibleStaff.map((staff) => staff.name)
    const visibleStaffIds = visibleStaff.map((staff) => staff._id)
    const [agents, calls, leads] = await Promise.all([
      Agent.find({ name: { $in: visibleStaffNames } }).lean(),
      Call.find({ agent: { $in: visibleStaffNames } }).sort({ createdAt: -1 }).lean(),
      LeadBucket.find({ createdBy: { $in: visibleStaffIds } }).lean(),
    ])

    const visibleCalls = calls
    const visibleAgents = agents
    const totalLeadCount = leads.reduce((total, lead) => total + lead.count, 0)
    const conversion =
      visibleAgents.length === 0
        ? 0
        : Math.round(visibleAgents.reduce((total, agent) => total + agent.conversion, 0) / visibleAgents.length)

    const sentiment = visibleCalls.reduce(
      (summary, call) => ({
        ...summary,
        [call.sentiment]: (summary[call.sentiment] || 0) + 1,
      }),
      {},
    )

    res.json({
      totals: [
        { label: 'Total Calls', value: visibleCalls.length },
        { label: 'Active Agents', value: visibleAgents.filter((agent) => agent.status !== 'Offline').length },
        { label: 'Lead Count', value: totalLeadCount },
        { label: 'Avg Conversion', value: `${conversion}%` },
      ],
      sentiment,
      recentCalls: visibleCalls.slice(0, 8).map((call) => ({
        id: call.callId,
        customer: call.customer,
        agent: call.agent,
        stage: call.stage,
        sentiment: call.sentiment,
      })),
    })
  } catch (error) {
    next(error)
  }
}

module.exports = { getReports }
