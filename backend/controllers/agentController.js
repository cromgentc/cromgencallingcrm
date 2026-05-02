const Agent = require('../models/Agent')
const Call = require('../models/Call')
const DialerSession = require('../models/DialerSession')
const User = require('../models/User')

function mapAgent(agent) {
  return {
    id: agent._id,
    name: agent.name,
    role: agent.role,
    status: agent.status,
    calls: agent.calls,
    conversion: agent.conversion,
    location: agent.location,
    avatar: agent.avatar,
  }
}

async function getAgents(req, res, next) {
  try {
    const agents = await Agent.find().sort({ createdAt: -1 }).lean()
    res.json(agents.map(mapAgent))
  } catch (error) {
    next(error)
  }
}

async function getAgentTracking(req, res, next) {
  try {
    const staffQuery = { role: 'staff' }

    if (req.user.role === 'manager') {
      staffQuery.assignedManager = req.user._id
    }

    if (req.user.role === 'teamleader') {
      staffQuery.assignedTeamLeader = req.user._id
    }

    const staff = await User.find(staffQuery).sort({ name: 1 }).lean()
    const sessions = await DialerSession.find({ staff: { $in: staff.map((member) => member._id) } })
      .sort({ updatedAt: -1 })
      .lean()
    const latestSessionByStaff = new Map()

    sessions.forEach((session) => {
      const key = String(session.staff)
      if (!latestSessionByStaff.has(key)) {
        latestSessionByStaff.set(key, session)
      }
    })

    const activeCalls = await Call.find({ stage: { $in: ['Dialing', 'Outcall'] } }).sort({ createdAt: -1 }).lean()

    res.json(
      staff.map((member) => {
        const session = latestSessionByStaff.get(String(member._id))
        const call = activeCalls.find((item) => item.agent === member.name)

        return {
          id: member._id,
          name: member.name,
          staffId: member.staffId,
          team: member.team,
          status: session?.status || 'not_ready',
          lastCallAt: session?.lastCallAt,
          currentCall: call
            ? {
                id: call.callId,
                customer: call.customer,
                phone: call.phone,
                stage: call.stage,
              }
            : null,
        }
      }),
    )
  } catch (error) {
    next(error)
  }
}

async function createAgent(req, res, next) {
  try {
    const { name, role = 'Calling Staff', status, calls, conversion, location } = req.body

    if (!name) {
      return res.status(400).json({ message: 'name is required' })
    }

    const avatar = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase()

    const agent = await Agent.create({
      name,
      role,
      status,
      calls,
      conversion,
      location,
      avatar: avatar || 'AG',
    })

    res.status(201).json(mapAgent(agent))
  } catch (error) {
    next(error)
  }
}

async function updateAgent(req, res, next) {
  try {
    const agent = await Agent.findByIdAndUpdate(req.params.agentId, req.body, {
      new: true,
      runValidators: true,
    }).lean()

    if (!agent) {
      return res.status(404).json({ message: 'agent not found' })
    }

    res.json(mapAgent(agent))
  } catch (error) {
    next(error)
  }
}

module.exports = { createAgent, getAgents, getAgentTracking, updateAgent }
