const express = require('express')
const { createAgent, getAgents, getAgentTracking, updateAgent } = require('../controllers/agentController')
const { allowRoles, protect } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/', protect, allowRoles('admin', 'manager', 'teamleader'), getAgents)
router.get('/tracking', protect, allowRoles('admin', 'manager', 'teamleader'), getAgentTracking)
router.post('/', protect, allowRoles('admin', 'manager', 'teamleader'), createAgent)
router.patch('/:agentId', protect, allowRoles('admin', 'manager', 'teamleader'), updateAgent)

module.exports = router
