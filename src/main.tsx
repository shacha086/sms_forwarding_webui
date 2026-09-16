import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DeviceProvider } from './app/device-context'
import { App } from './app/App'
import './styles.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 5_000, retry: false } } })
createRoot(document.getElementById('root')!).render(<StrictMode><QueryClientProvider client={queryClient}><DeviceProvider><App /></DeviceProvider></QueryClientProvider></StrictMode>)
