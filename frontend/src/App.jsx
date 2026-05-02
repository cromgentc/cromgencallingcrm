import { useEffect, useState } from 'react'
import AuthPage from './components/AuthPage'
import Dashboard from './pages/Dashboard'
import MobileDialer from './pages/MobileDialer'

function App() {
  const dialerMatch = window.location.pathname.match(/^\/dialer\/([^/]+)/)
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

  function handleAuth(response) {
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

  return <Dashboard currentUser={auth.user} onLogout={handleLogout} onUserUpdated={handleUserUpdated} />
}

export default App
