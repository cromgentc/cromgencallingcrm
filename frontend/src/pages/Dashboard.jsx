import { useEffect, useState } from 'react'
import { Eye, EyeOff, Menu } from 'lucide-react'
import AgentsView from '../components/AgentsView'
import ClientsView from '../components/ClientsView'
import Database from '../components/Database'
import GoogleCalendarView from '../components/GoogleCalendarView'
import Header from '../components/Header'
import LeadsView from '../components/LeadsView'
import LeadDetailPage from '../components/LeadDetailPage'
import LiveCallStaff from '../components/LiveCallStaff'
import LiveCallsView from '../components/LiveCallsView'
import MobileNav from '../components/MobileNav'
import ModulePlaceholder from '../components/ModulePlaceholder'
import PendingCallsView from '../components/PendingCallsView'
import ProfileSettings from '../components/ProfileSettings'
import ReportsView from '../components/ReportsView'
import SalesView from '../components/SalesView'
import SettingsView from '../components/SettingsView'
import StaffManagement from '../components/StaffManagement'
import StaffDialerPanel from '../components/StaffDialerPanel'
import StaffAccounts from '../components/StaffAccounts'
import StaffDetailPage from '../components/StaffDetailPage'
import Sidebar from '../components/Sidebar'
import StatCard from '../components/StatCard'
import TeamDirectory from '../components/TeamDirectory'
import WhatsAppView from '../components/WhatsAppView'
import CrmHomePage from '../components/dashboard/CrmHomePage'
import { fallbackDashboard } from '../data/fallbackData'
import { uploadCallRecording } from '../controllers/callController'
import { getDashboardData } from '../controllers/dashboardController'
import { getReports } from '../controllers/reportController'
import { getNavigationItemsForUser } from '../utils/navigation'

function getInitialView() {
  const params = new URLSearchParams(window.location.search)
  const state = params.get('state')

  return params.get('code') && ['google', 'linkedin', 'facebook', 'instagram'].includes(state) ? 'settings' : 'dashboard'
}

export default function Dashboard({ currentUser, onLogout, onUserUpdated }) {
  const [activeView, setActiveView] = useState(getInitialView)
  const [viewFilter, setViewFilter] = useState('')
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)
  const [leadListView, setLeadListView] = useState('leads')
  const [leadStoreRefreshToken, setLeadStoreRefreshToken] = useState(0)
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const [topbarHidden, setTopbarHidden] = useState(false)
  const [dashboard, setDashboard] = useState(fallbackDashboard)
  const [reports, setReports] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const canManage = ['admin', 'manager', 'teamleader'].includes(currentUser?.role)
  const canDownloadRecordings = ['admin', 'manager', 'teamleader'].includes(currentUser?.role)
  const canViewTaggings = ['admin', 'manager', 'teamleader', 'staff'].includes(currentUser?.role)
  const canViewReports = ['manager', 'teamleader', 'staff'].includes(currentUser?.role)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const pageTitles = new Map(
      getNavigationItemsForUser(currentUser)
        .flatMap((item) => item.children || [item])
        .map((item) => [item.id, item.label]),
    )
    pageTitles.set('profile', 'Profile')
    pageTitles.set('team', 'Team Directory')
    pageTitles.set('staff-management', 'Staff Management')
    pageTitles.set('staff-detail', selectedStaff?.name || 'Staff Details')
    pageTitles.set('lead-detail', selectedLead?.leadName || selectedLead?.name || 'Lead Details')

    document.title = `${pageTitles.get(activeView) || 'Dashboard'} | CromGen CRM`
  }, [activeView, currentUser, selectedLead, selectedStaff])

  function loadDashboard() {
    return getDashboardData()
      .then((data) => {
        setDashboard(data)
        setError('')
      })
      .catch((err) => {
        setError(err.message || 'Dashboard data could not be loaded.')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  useEffect(() => {
    let isMounted = true

    loadDashboard().finally(() => {
      if (!isMounted) {
        return
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (activeView === 'reports') {
      getReports().then(setReports).catch((err) => setError(err.message || 'Report data could not be loaded.'))
    }
  }, [activeView])

  async function handleRecordingUploaded(callId, file) {
    const updatedCall = await uploadCallRecording(callId, file)

    setDashboard((current) => ({
      ...current,
      calls: current.calls.map((call) => (call.id === callId ? updatedCall : call)),
    }))
  }

  function handleCallUpdated(call) {
    setDashboard((current) => ({
      ...current,
      calls: current.calls.map((item) => (item.id === call.id ? call : item)),
    }))
  }

  function handleCallDeleted(callId) {
    setDashboard((current) => ({
      ...current,
      calls: current.calls.filter((item) => item.id !== callId),
    }))
  }

  function handleCallsDeleted(callIds) {
    const deletedIds = new Set(callIds)
    setDashboard((current) => ({
      ...current,
      calls: current.calls.filter((item) => !deletedIds.has(item.id)),
    }))
  }

  function handleCustomerUploaded() {
    setError('')
    loadDashboard()
  }

  function handleStatSelect(stat) {
    setViewFilter(stat.filter || '')
    setActiveView(stat.view)
  }

  function handleStaffSelect(staff) {
    setSelectedStaff(staff)
    setActiveView('staff-detail')
  }

  function handleLeadSelect(lead) {
    setSelectedLead(lead)
    setLeadListView(activeView)
    setActiveView('lead-detail')
  }

  function renderActiveView() {
    if (activeView === 'dashboard') {
      return (
        <>
          <CrmHomePage
            dashboard={dashboard}
            canDownloadRecordings={canDownloadRecordings}
            currentUser={currentUser}
            onNavigate={setActiveView}
            onSelectStat={handleStatSelect}
          />
          {currentUser?.role === 'staff' ? (
            <section className="mt-4">
              <StaffDialerPanel currentUser={currentUser} />
            </section>
          ) : null}
        </>
      )
    }

    if (activeView === 'sales-leads') {
      return (
        <LeadsView
          currentUser={currentUser}
          canDownloadRecordings={canDownloadRecordings}
          onLeadSelect={handleLeadSelect}
          refreshToken={leadStoreRefreshToken}
        />
      )
    }

    if (activeView.startsWith('sales-')) {
      return <SalesView view={activeView} calls={dashboard.calls} canDownloadRecordings={canDownloadRecordings} />
    }

    if (activeView.startsWith('activities-') || activeView.startsWith('inventory-')) {
      return <ModulePlaceholder view={activeView} calls={dashboard.calls} timeline={dashboard.timeline} />
    }

    if (activeView === 'crm-coming-soon') {
      return <ModulePlaceholder view="crm-coming-soon" calls={[]} timeline={[]} />
    }

    if (activeView === 'calls') {
      if (!canViewTaggings) {
        return null
      }

      return (
        <>
          {currentUser?.role === 'staff' ? (
            <section className="mb-4">
              <StaffDialerPanel currentUser={currentUser} />
            </section>
          ) : null}
          <LiveCallsView
            calls={dashboard.calls}
            currentUser={currentUser}
            onCallUpdated={handleCallUpdated}
            onCallDeleted={handleCallDeleted}
            onCallsDeleted={handleCallsDeleted}
            canDownloadRecordings={canDownloadRecordings}
            onRecordingUploaded={handleRecordingUploaded}
          />
        </>
      )
    }

    if (activeView === 'database') {
      if (currentUser?.role === 'staff') {
        return null
      }
      return <Database canManage={canManage} onCustomerUploaded={handleCustomerUploaded} />
    }

    if (activeView === 'clients') {
      if (currentUser?.role !== 'admin') {
        return null
      }

      return <ClientsView currentUser={currentUser} />
    }

    if (activeView === 'livecall-staff') {
      if (!canViewTaggings) {
        return null
      }
      return <LiveCallStaff />
    }

    if (activeView === 'staff-accounts') {
      return <StaffAccounts currentUser={currentUser} />
    }

    if (activeView === 'pending') {
      return <PendingCallsView customers={dashboard.pendingCustomers} summary={dashboard.callQueueSummary} />
    }

    if (activeView === 'agents') {
      if (currentUser?.role === 'staff') {
        return null
      }
      return <AgentsView canManage={canManage} />
    }

    if (activeView === 'google-calendar') {
      return <GoogleCalendarView />
    }

    if (activeView === 'reports') {
      if (!canViewReports) {
        return null
      }

      return <ReportsView reports={reports} />
    }

    if (activeView === 'whatsapp') {
      return <WhatsAppView />
    }

    if (activeView === 'settings') {
      if (currentUser?.role !== 'admin') {
        return <ProfileSettings currentUser={currentUser} onUserUpdated={onUserUpdated} />
      }
      return <SettingsView currentUser={currentUser} />
    }

    if (activeView === 'profile') {
      return <ProfileSettings currentUser={currentUser} onUserUpdated={onUserUpdated} />
    }

    if (activeView === 'team') {
      return <TeamDirectory filter={viewFilter || 'all'} members={dashboard.teamMembers} onMemberSelect={handleStaffSelect} />
    }

    if (activeView === 'staff-management') {
      return <StaffManagement currentUser={currentUser} onMemberSelect={handleStaffSelect} />
    }

    if (activeView === 'staff-detail') {
      return (
        <StaffDetailPage
          calls={dashboard.calls}
          canDownloadRecordings={canDownloadRecordings}
          staff={selectedStaff}
          onBack={() => setActiveView('team')}
        />
      )
    }

    if (activeView === 'lead-detail') {
      return (
        <LeadDetailPage
          lead={selectedLead}
          onBack={() => {
            setSelectedLead(null)
            setActiveView(leadListView)
          }}
          onLeadStoreMutation={() => setLeadStoreRefreshToken((v) => v + 1)}
          onLeadChange={(nextLead) => setSelectedLead(nextLead)}
          onLeadDeleted={() => {
            setSelectedLead(null)
            setActiveView(leadListView)
            setLeadStoreRefreshToken((v) => v + 1)
          }}
        />
      )
    }

    return (
      <>
        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {dashboard.stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} onSelect={handleStatSelect} />
          ))}
        </section>

        <section className="mt-6">
          <StaffDialerPanel currentUser={currentUser} />
        </section>
      </>
    )
  }

  return (
    <div className="flex h-[100dvh] min-h-[100svh] flex-col overflow-hidden bg-[#f4f8f7]">
      <MobileNav
        dashboard={dashboard}
        currentUser={currentUser}
        onToggleSidebar={() => setSidebarOpen((current) => !current)}
        sidebarOpen={sidebarOpen}
        onViewChange={setActiveView}
        onLogout={onLogout}
      />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          activeView={activeView}
          currentUser={currentUser}
          onViewChange={(view) => {
            setActiveView(view)
            setSidebarOpen(false)
          }}
          sidebarOpen={sidebarOpen}
          sidebarHidden={sidebarHidden}
          onClose={() => setSidebarOpen(false)}
          onLogout={onLogout}
        />
        <main className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <div className="hidden shrink-0 border-b border-slate-200/80 bg-[#f4f8f7]/95 px-4 py-3 backdrop-blur sm:px-6 lg:block lg:px-8">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSidebarHidden((current) => !current)}
                className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm"
              >
                <Menu size={16} />
                {sidebarHidden ? 'Show Sidebar' : 'Hide Sidebar'}
              </button>
              <button
                type="button"
                onClick={() => setTopbarHidden((current) => !current)}
                className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm"
              >
                {topbarHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                {topbarHidden ? 'Show Topbar' : 'Hide Topbar'}
              </button>
            </div>

            {!topbarHidden ? <Header dashboard={dashboard} currentUser={currentUser} onLogout={onLogout} onViewChange={setActiveView} /> : null}

          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 md:px-6 lg:px-8 lg:py-6 lg:pb-8">
            {error ? (
              <div className="mt-5 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {error}
              </div>
            ) : null}

            {isLoading ? (
              <div className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
                Loading dashboard data...
              </div>
            ) : null}

            <div className={activeView === 'dashboard' ? '' : 'lg:mt-2'}>{renderActiveView()}</div>
          </div>
        </main>
      </div>
    </div>
  )
}
