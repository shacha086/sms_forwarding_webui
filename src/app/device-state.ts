import { createContext, useContext } from 'react'
import type { DeviceApi } from '../api/client'
import type { Credentials } from '../api/types'

export interface DeviceContextValue {
  credentials: Credentials
  connectionId: number
  api: DeviceApi
  connected: boolean
  loading: boolean
  error?: Error
  status: Awaited<ReturnType<DeviceApi['getStatus']>> | undefined
  config: Awaited<ReturnType<DeviceApi['getConfig']>> | undefined
  connect: (credentials: Credentials) => void
  disconnect: () => void
  refresh: () => Promise<void>
  notify: (message: string, error?: boolean) => void
}

export const DeviceContext = createContext<DeviceContextValue | null>(null)

export function useDevice() {
  const value = useContext(DeviceContext)
  if (!value) throw new Error('useDevice must be inside DeviceProvider')
  return value
}
