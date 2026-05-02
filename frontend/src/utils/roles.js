export const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'Manager',
  teamleader: 'Team Leader',
  staff: 'Calling Staff',
}

export function formatRole(role) {
  return ROLE_LABELS[role] || role || ''
}
