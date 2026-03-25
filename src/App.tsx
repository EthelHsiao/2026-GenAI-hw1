import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { ChatArea } from '@/components/chat/ChatArea'
import { useSettings } from '@/hooks/useSettings'
import { useChat } from '@/hooks/useChat'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { settings, updateSettings, resetSettings } = useSettings()
  const { messages, isStreaming, error, sendMessage, stopStreaming, clearHistory } =
    useChat(settings)

  return (
    <AppLayout
      settings={settings}
      onUpdate={updateSettings}
      onReset={resetSettings}
      sidebarOpen={sidebarOpen}
      onCloseSidebar={() => setSidebarOpen(false)}
    >
      <ChatArea
        messages={messages}
        isStreaming={isStreaming}
        error={error}
        onSend={sendMessage}
        onStop={stopStreaming}
        onClear={clearHistory}
        onToggleSidebar={() => setSidebarOpen(true)}
        sidebarOpen={sidebarOpen}
        modelName={settings.model}
      />
    </AppLayout>
  )
}

export default App
