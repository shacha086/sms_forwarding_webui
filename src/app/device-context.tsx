import * as Toast from '@radix-ui/react-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { DeviceApi, normalizeHost } from '../api/client'
import type { Credentials } from '../api/types'
import { DeviceContext } from './device-state'

function initialCredentials(): Credentials {
  const host = normalizeHost(location.hash.slice(1))
  return { host, username: 'admin', password: 'admin123' }
}

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentials] = useState(initialCredentials)
  const [connectionId, setConnectionId] = useState(0)
  const nextConnectionId = useRef(0)
  const [toast, setToast] = useState({ open: false, message: '', error: false })
  const client = useQueryClient()
  const api = useMemo(() => new DeviceApi(credentials), [credentials])
  const deviceQuery = useQuery({
    // A new attempt must authenticate again, even when only the password changed.
    queryKey: ['device', connectionId],
    queryFn: async ({ signal }) => {
      const status = await api.getStatus(signal)
      const config = await api.getConfig(signal)
      return { status, config }
    },
    enabled: connectionId !== 0,
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    refetchInterval: (query) => query.state.status === 'success' ? 15_000 : false,
  })
  const notify = useCallback((message: string, error = false) => setToast({ open: true, message, error }), [])
  const connect = useCallback((next: Credentials) => {
    const normalized = { ...next, host: normalizeHost(next.host) }
    if (!normalized.host || !normalized.username || !normalized.password) return
    void client.cancelQueries({ queryKey: ['device'] })
    location.hash = normalized.host
    setCredentials(normalized)
    setConnectionId(++nextConnectionId.current)
  }, [client])
  const disconnect = useCallback(() => {
    void client.cancelQueries({ queryKey: ['device'] })
    setConnectionId(0)
  }, [client])
  const refresh = useCallback(async () => {
    if (connectionId) await client.invalidateQueries({ queryKey: ['device', connectionId] })
  }, [client, connectionId])
  const connected = connectionId !== 0 && deviceQuery.isSuccess
  const loading = connectionId !== 0 && deviceQuery.isPending
  const error = deviceQuery.error || undefined
  return <DeviceContext.Provider value={{ credentials, connectionId, api, connected, loading, error, status: connected ? deviceQuery.data?.status : undefined, config: connected ? deviceQuery.data?.config : undefined, connect, disconnect, refresh, notify }}>
    {children}
    <Toast.Provider swipeDirection="right">
      <Toast.Root className={`toast ${toast.error ? 'toast--error' : ''}`} open={toast.open} onOpenChange={(open) => setToast((value) => ({ ...value, open }))}>
        {toast.error ? <XCircle size={18} /> : <CheckCircle2 size={18} />}<Toast.Description>{toast.message}</Toast.Description>
      </Toast.Root><Toast.Viewport className="toast-viewport" />
    </Toast.Provider>
  </DeviceContext.Provider>
}
