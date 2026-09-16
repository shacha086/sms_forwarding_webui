import * as Toast from '@radix-ui/react-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { DeviceApi, normalizeHost } from '../api/client'
import type { Credentials } from '../api/types'
import { DeviceContext } from './device-state'

function initialCredentials(): Credentials {
  const host = normalizeHost(location.hash.slice(1))
  return { host, username: sessionStorage.getItem('smsUser') || 'admin', password: sessionStorage.getItem('smsPass') || 'admin123' }
}

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentials] = useState(initialCredentials)
  const [toast, setToast] = useState({ open: false, message: '', error: false })
  const client = useQueryClient()
  const api = useMemo(() => new DeviceApi(credentials), [credentials])
  const enabled = Boolean(credentials.host && credentials.password)
  const statusQuery = useQuery({ queryKey: ['status', credentials.host, credentials.username], queryFn: api.getStatus, enabled, retry: false, refetchInterval: 15_000 })
  const configQuery = useQuery({ queryKey: ['config', credentials.host, credentials.username], queryFn: api.getConfig, enabled, retry: false })
  const notify = useCallback((message: string, error = false) => setToast({ open: true, message, error }), [])
  const connect = useCallback((next: Credentials) => {
    const normalized = { ...next, host: normalizeHost(next.host) }
    sessionStorage.setItem('smsUser', normalized.username); sessionStorage.setItem('smsPass', normalized.password)
    location.hash = normalized.host; setCredentials(normalized)
  }, [])
  const refresh = useCallback(async () => { await Promise.all([client.invalidateQueries({ queryKey: ['status'] }), client.invalidateQueries({ queryKey: ['config'] })]) }, [client])
  const error = (statusQuery.error || configQuery.error) as Error | undefined
  return <DeviceContext.Provider value={{ credentials, api, connected: Boolean(statusQuery.data), loading: statusQuery.isFetching || configQuery.isFetching, error, status: statusQuery.data, config: configQuery.data, connect, refresh, notify }}>
    {children}
    <Toast.Provider swipeDirection="right">
      <Toast.Root className={`toast ${toast.error ? 'toast--error' : ''}`} open={toast.open} onOpenChange={(open) => setToast((value) => ({ ...value, open }))}>
        {toast.error ? <XCircle size={18} /> : <CheckCircle2 size={18} />}<Toast.Description>{toast.message}</Toast.Description>
      </Toast.Root><Toast.Viewport className="toast-viewport" />
    </Toast.Provider>
  </DeviceContext.Provider>
}
