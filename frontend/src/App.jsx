import { useEffect, useState } from 'react'
import AuthPage from './components/AuthPage'
import EmailMarketingWorkspace from './components/EmailMarketingWorkspace'
import SettingsView from './components/SettingsView'
import Dashboard from './pages/Dashboard'
import MobileDialer from './pages/MobileDialer'

function App() {
  const dialerMatch = window.location.pathname.match(/^\/(?:dialer|dailer)\/([^/]+)/)
  const emailMarketingPath = window.location.pathname === '/marketing/email'
  const emailSettingsPath = window.location.pathname === '/marketing/email/settings'
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('calltrack_token')
    const user = localStorage.getItem('calltrack_user')

    return token && user ? { token, user: JSON.parse(user) } : null
  })

  useEffect(() => {
    if (auth?.token) {
      localStorage.setItem('calltrack_token', auth.token)
      localStorage.setItem('calltrack_user', JSON.stringify(auth.user))
    }
  }, [auth])

  useEffect(() => {
    if (dialerMatch) {
      document.title = 'Mobile Dialer | CromGen CRM'
      return
    }

    if (emailMarketingPath || emailSettingsPath) {
      document.title = `${emailSettingsPath ? 'Email Settings' : 'Email Marketing'} | CromGen CRM`
      return
    }

    document.title = auth ? 'Dashboard | CromGen CRM' : 'Login | CromGen CRM'
  }, [auth, dialerMatch, emailMarketingPath, emailSettingsPath])

  function handleAuth(response) {
    localStorage.setItem('calltrack_token', response.token)
    localStorage.setItem('calltrack_user', JSON.stringify(response.user))
    setAuth(response)
  }

  function handleLogout() {
    localStorage.removeItem('calltrack_token')
    localStorage.removeItem('calltrack_user')
    setAuth(null)
  }

  function handleUserUpdated(user) {
    setAuth((current) => ({ ...current, user }))
  }

  if (dialerMatch) {
    return <MobileDialer token={dialerMatch[1]} />
  }

  if (!auth) {
    return <AuthPage onAuth={handleAuth} />
  }

  if (emailMarketingPath) {
    return <EmailMarketingWorkspace currentUser={auth.user} />
  }

  if (emailSettingsPath) {
    return <SettingsView currentUser={auth.user} initialIntegration="emailSmtp" />
  }

  return <Dashboard currentUser={auth.user} onLogout={handleLogout} onUserUpdated={handleUserUpdated} />
}

export default App
