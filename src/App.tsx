import { TabsDemo } from '@/components/TabsDemo'
import { SyncProvider } from '@/contexts/sync-context'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { FileNotificationContainer } from '@/components/FileNotificationContainer'

function App() {
  return (
    <SyncProvider>
      <div className='w-full h-dvh flex justify-center items-center'>
        <main className='w-4xl m-auto px-4'>
          <ConnectionStatus />
          <TabsDemo />
        </main>
      </div>
      <FileNotificationContainer />
    </SyncProvider>
  )
}

export default App
