import { useMemo, useState } from 'react'
import { LogOut, PhoneCall } from 'lucide-react'
import { getNavigationItemsForUser } from '../utils/navigation'

export default function Sidebar({ activeView, currentUser, onViewChange, sidebarOpen, sidebarHidden = false, onClose, onLogout }) {
  const [openMenuId, setOpenMenuId] = useState(null)
  const navigationItems = useMemo(() => getNavigationItemsForUser(currentUser), [currentUser])

  const activeParentId = useMemo(() => {
    const match = navigationItems.find((item) => item.children?.some((child) => child.id === activeView))
    return match?.id || null
  }, [activeView, navigationItems])

  function toggleMenu(itemId) {
    setOpenMenuId((current) => (current === itemId ? null : itemId))
  }

  function handleNavClick(item) {
    if (item.children?.length) {
      toggleMenu(item.id)
      if (!item.children?.[0]?.externalPath) {
        onViewChange(item.children?.[0]?.id || item.id)
      }
      onClose?.()
      return
    }

    if (item.externalPath) {
      window.open(item.externalPath, '_blank', 'noopener,noreferrer')
      onClose?.()
      return
    }

    onViewChange(item.id)
    onClose?.()
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity lg:hidden ${sidebarOpen && !sidebarHidden ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => onClose?.()}
        aria-hidden="true"
      />

      <aside
        className={[
          'fixed left-0 top-0 z-50 h-[100dvh] w-[min(18rem,86vw)] shrink-0 border-r border-slate-200 bg-white px-4 py-5 sm:px-5 sm:py-6 lg:static lg:block lg:h-[100dvh] lg:w-72',
          'transform-gpu transition-transform duration-200',
          sidebarOpen && !sidebarHidden ? 'translate-x-0' : '-translate-x-full',
          // On desktop ignore translate; keep normal layout
          sidebarHidden ? 'lg:hidden' : 'lg:translate-x-0',
        ].join(' ')}
        aria-label="Sidebar"
      >
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-lg bg-slate-900 text-white">
            <PhoneCall size={22} />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-950">CallTrack</p>
            <p className="text-sm text-slate-500">Agent command center</p>
          </div>
        </div>

        <nav className="h-[calc(100vh-12rem)] space-y-2 overflow-y-auto pr-1 lg:h-[calc(100vh-8.5rem)]">
          {navigationItems.map((item) => {
            const isChildActive = Boolean(item.children?.some((child) => child.id === activeView))
            const isExpanded = item.children?.length ? openMenuId === item.id || isChildActive || activeParentId === item.id : false

            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => handleNavClick(item)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold transition ${
                    activeView === item.id || isChildActive
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>

                {item.children?.length && isExpanded ? (
                  <div className="mt-2 space-y-1 pl-8">
                    <div className="max-h-64 overflow-y-auto pr-2">
                      {item.children.map((child) => (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => {
                            if (child.externalPath) {
                              window.open(child.externalPath, '_blank', 'noopener,noreferrer')
                              onClose?.()
                              return
                            }
                            onViewChange(child.id)
                            onClose?.()
                          }}
                          className={`w-full rounded-lg px-3 py-2 text-left text-sm font-bold ${
                            activeView === child.id ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </nav>
        <button
          type="button"
          onClick={onLogout}
          className="mt-4 flex h-11 w-full items-center gap-3 rounded-lg bg-rose-600 px-3 text-left text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 lg:hidden"
        >
          <LogOut size={18} />
          Logout
        </button>
      </aside>
    </>
  )
}
