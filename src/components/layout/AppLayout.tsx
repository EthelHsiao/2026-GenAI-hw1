import { Sidebar } from './Sidebar'
import type { AppSettings } from '@/types/chat'

interface AppLayoutProps {
  settings: AppSettings
  onUpdate: (patch: Partial<AppSettings>) => void
  onReset: () => void
  sidebarOpen: boolean
  onCloseSidebar: () => void
  children: React.ReactNode
}

export function AppLayout({
  settings,
  onUpdate,
  onReset,
  sidebarOpen,
  onCloseSidebar,
  children,
}: AppLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div
        className={`flex-shrink-0 transition-all duration-300 overflow-hidden ${
          sidebarOpen ? 'w-72' : 'w-0'
        }`}
      >
        {sidebarOpen && (
          <Sidebar
            settings={settings}
            onUpdate={onUpdate}
            onReset={onReset}
            onClose={onCloseSidebar}
          />
        )}
      </div>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  )
}
