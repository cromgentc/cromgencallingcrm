import { BarChart3, Boxes, BriefcaseBusiness, CalendarClock, Database, Headphones, LayoutDashboard, PhoneCall, Settings, Users } from 'lucide-react'

export const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    id: 'calls-menu',
    label: 'Taggings',
    icon: PhoneCall,
    children: [
      { id: 'calls', label: 'Taggings' },
      { id: 'livecall-staff', label: 'Calling Staff' },
      { id: 'pending', label: 'Pending Calls' },
    ],
  },
  {
    id: 'database-menu',
    label: 'Database',
    icon: Database,
    children: [
      { id: 'database', label: 'Calling Database' },
      { id: 'clients', label: 'Clients' },
      { id: 'staff-accounts', label: 'Staff Accounts' },
    ],
  },
  { id: 'agents', label: 'Agents', icon: Headphones },
  {
    id: 'sales-menu',
    label: 'Sales',
    icon: BriefcaseBusiness,
    children: [
      { id: 'sales-leads', label: 'Leads' },
      { id: 'sales-contacts', label: 'Contacts' },
      { id: 'sales-accounts', label: 'Accounts' },
      { id: 'sales-deals', label: 'Deals' },
      { id: 'sales-forecasts', label: 'Forecasts' },
      { id: 'sales-documents', label: 'Documents' },
      { id: 'sales-campaigns', label: 'Campaigns' },
    ],
  },
  {
    id: 'activities-menu',
    label: 'Activities',
    icon: CalendarClock,
    children: [
      { id: 'activities-tasks', label: 'Tasks' },
      { id: 'google-calendar', label: 'Meetings' },
      { id: 'whatsapp', label: 'WhatsApp' },
    ],
  },
  {
    id: 'inventory-menu',
    label: 'Inventory',
    icon: Boxes,
    children: [
      { id: 'inventory-products', label: 'Products' },
      { id: 'inventory-price-books', label: 'Price Books' },
      { id: 'inventory-quotes', label: 'Quotes' },
      { id: 'inventory-sales-orders', label: 'Sales Orders' },
      { id: 'inventory-purchase-orders', label: 'Purchase Orders' },
      { id: 'inventory-invoices', label: 'Invoices' },
      { id: 'inventory-vendors', label: 'Vendors' },
    ],
  },
  {
    id: 'crm-menu',
    label: 'CRM',
    icon: Users,
    children: [{ id: 'crm-coming-soon', label: 'Coming Soon' }],
  },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const staffHiddenIds = new Set(['agents', 'database-menu', 'inventory-menu'])
const staffHiddenChildIds = new Set(['livecall-staff'])
const adminOnlyChildIds = new Set(['clients'])
const adminOnlyIds = new Set(['settings'])
const reportRoles = new Set(['manager', 'teamleader', 'staff'])

export function getNavigationItemsForUser(user) {
  if (user?.role === 'staff') {
    return [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      {
        id: 'calls-menu',
        label: 'Taggings',
        icon: PhoneCall,
        children: [
          { id: 'calls', label: 'Taggings' },
          { id: 'pending', label: 'Pending Calls' },
        ],
      },
      {
        id: 'sales-menu',
        label: 'Sales',
        icon: BriefcaseBusiness,
        children: [
          { id: 'sales-leads', label: 'Leads' },
          { id: 'sales-contacts', label: 'Contacts' },
          { id: 'sales-accounts', label: 'Accounts' },
          { id: 'sales-deals', label: 'Deals' },
        ],
      },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
    ]
  }

  return navigationItems
    .filter((item) => !adminOnlyIds.has(item.id) || user?.role === 'admin')
    .filter((item) => item.id !== 'reports' || reportRoles.has(user?.role))
    .filter((item) => user?.role !== 'staff' || !staffHiddenIds.has(item.id))
    .map((item) => {
      if (!item.children) {
        return item
      }

      return {
        ...item,
        children: item.children.filter((child) => {
          if (user?.role === 'staff' && staffHiddenChildIds.has(child.id)) {
            return false
          }

          if (adminOnlyChildIds.has(child.id) && user?.role !== 'admin') {
            return false
          }

          return true
        }),
      }
    })
}
