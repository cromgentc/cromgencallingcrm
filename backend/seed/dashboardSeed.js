const Agent = require('../models/Agent')
const Call = require('../models/Call')
const LeadBucket = require('../models/LeadBucket')
const TimelineEvent = require('../models/TimelineEvent')
const User = require('../models/User')

const agents = [
  {
    name: 'Aarav Mehta',
    role: 'Sales Agent',
    status: 'On Call',
    calls: 42,
    conversion: 41,
    location: 'Delhi Desk',
    avatar: 'AM',
  },
  {
    name: 'Nisha Khan',
    role: 'Support Lead',
    status: 'Available',
    calls: 35,
    conversion: 52,
    location: 'Mumbai Desk',
    avatar: 'NK',
  },
  {
    name: 'Kabir Soni',
    role: 'Retention',
    status: 'Wrap Up',
    calls: 28,
    conversion: 33,
    location: 'Remote',
    avatar: 'KS',
  },
]

const calls = [
  {
    callId: 'CL-2048',
    customer: 'Priya Sharma',
    phone: '+91 98765 12045',
    agent: 'Aarav Mehta',
    stage: 'Qualification',
    duration: '05:32',
    sentiment: 'Interested',
  },
  {
    callId: 'CL-2049',
    customer: 'Rahul Verma',
    phone: '+91 98221 77390',
    agent: 'Nisha Khan',
    stage: 'Callback',
    duration: '01:18',
    sentiment: 'Neutral',
  },
  {
    callId: 'CL-2050',
    customer: 'Meera Iyer',
    phone: '+91 90044 81020',
    agent: 'Kabir Soni',
    stage: 'Offer Shared',
    duration: '08:09',
    sentiment: 'Hot Lead',
  },
]

const timeline = [
  { time: '10:24 AM', title: 'Lead assigned', detail: 'CRM se 14 new leads agent queue mein aaye.' },
  { time: '10:32 AM', title: 'Call connected', detail: 'Aarav ne Priya Sharma ke saath product pitch start ki.' },
  { time: '10:41 AM', title: 'Follow-up booked', detail: 'Meera Iyer ke liye 4:30 PM callback schedule hua.' },
]

const leads = [
  { name: 'Enterprise Trial', count: 18, progress: 72 },
  { name: 'Missed Call Back', count: 11, progress: 48 },
  { name: 'Payment Follow-up', count: 9, progress: 64 },
]

async function seedDashboardData() {
  const [agentCount, callCount, leadCount, timelineCount, adminCount] = await Promise.all([
    Agent.countDocuments(),
    Call.countDocuments(),
    LeadBucket.countDocuments(),
    TimelineEvent.countDocuments(),
    User.countDocuments({ role: 'admin' }),
  ])

  await Promise.all([
    agentCount ? Promise.resolve() : Agent.insertMany(agents),
    callCount ? Promise.resolve() : Call.insertMany(calls),
    leadCount ? Promise.resolve() : LeadBucket.insertMany(leads),
    timelineCount ? Promise.resolve() : TimelineEvent.insertMany(timeline),
    process.env.SEED_ADMIN === 'true' && !adminCount
      ? User.create({
          name: process.env.ADMIN_NAME || 'Super Admin',
          email: process.env.ADMIN_EMAIL || 'admin@calltrack.local',
          password: process.env.ADMIN_PASSWORD || 'admin12345',
          role: 'admin',
        })
      : Promise.resolve(),
  ])
}

module.exports = { seedDashboardData }
