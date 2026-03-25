import { Toaster } from 'sonner'
import { Navbar } from '@/components/Navbar'
import { CharacterPanel } from '@/components/CharacterPanel/CharacterPanel'
import { ChatArea } from '@/components/ChatArea/ChatArea'
import { SidePanel } from '@/components/SidePanel/SidePanel'
import { ConquestOverlay } from '@/components/ConquestOverlay'

function App() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <Navbar />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <CharacterPanel />
        <ChatArea />
        <SidePanel />
      </div>

      <ConquestOverlay />
      <Toaster richColors position="top-center" />
    </div>
  )
}

export default App
