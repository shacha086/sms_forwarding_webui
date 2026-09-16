import type { ApiResult, Credentials, DeviceConfig, DeviceStatus, DiagnosticResult, EsimResult } from './types'

function encodeBasicAuth(username: string, password: string) {
  const bytes = new TextEncoder().encode(`${username}:${password}`); let raw = ''
  bytes.forEach((byte) => { raw += String.fromCharCode(byte) }); return `Basic ${btoa(raw)}`
}
export function normalizeHost(value: string) { return decodeURIComponent(value).trim().replace(/^https?:\/\//i, '').replace(/\/$/, '') }
export class ApiError extends Error { constructor(message: string, public status = 0) { super(message) } }
export class DeviceApi {
  private baseUrl: string
  constructor(private credentials: Credentials) { this.baseUrl = `http://${normalizeHost(credentials.host)}` }
  async request<T = ApiResult>(path: string, init: RequestInit = {}, timeoutMs?: number): Promise<T> {
    const headers = new Headers(init.headers)
    headers.set('Authorization', encodeBasicAuth(this.credentials.username, this.credentials.password)); headers.set('Accept', 'application/json')
    const controller = new AbortController()
    const cancel = () => controller.abort(init.signal?.reason)
    if (init.signal?.aborted) cancel()
    else init.signal?.addEventListener('abort', cancel, { once: true })
    let timedOut = false
    const timer = timeoutMs === undefined ? undefined : setTimeout(() => { timedOut = true; controller.abort() }, timeoutMs)
    try {
      const request = new Request(`${this.baseUrl}${path}`, { ...init, signal: controller.signal, headers, mode: 'cors', cache: 'no-store', targetAddressSpace: 'local' })
      const response = await fetch(request)
      const text = await response.text(); let data: unknown = {}
      try { data = text ? JSON.parse(text) : {} } catch { data = { message: text } }
      if (!response.ok) {
        const message = typeof data === 'object' && data && 'message' in data ? String(data.message) : `HTTP ${response.status}`
        throw new ApiError(response.status === 401 ? '管理账号或密码错误' : message, response.status)
      }
      return data as T
    } catch (error) {
      if (init.signal?.aborted) throw error
      if (timedOut) throw new ApiError('设备请求超时，请检查网络后重试。')
      if (error instanceof ApiError) throw error
      throw new ApiError('无法访问设备。请确认手机与设备在同一网络，并允许本地网络访问。')
    } finally {
      clearTimeout(timer)
      init.signal?.removeEventListener('abort', cancel)
    }
  }
  getStatus = (signal?: AbortSignal) => this.request<DeviceStatus>('/api/v1/status', { signal }, 10_000)
  getConfig = (signal?: AbortSignal) => this.request<DeviceConfig>('/api/v1/config', { signal }, 10_000)
  getLogs = (signal?: AbortSignal) => this.request<string[]>('/api/v1/logs', { signal }, 10_000)
  getDiagnostic = (type: 'network' | 'signal' | 'sim' | 'wifi' | 'ati', signal?: AbortSignal) =>
    this.request<DiagnosticResult>(`/query?type=${encodeURIComponent(type)}`, { signal }, 15_000)
  getEsim = (action: 'info' | 'list' | 'notifcount', signal?: AbortSignal) =>
    this.request<EsimResult>(`/esim?action=${encodeURIComponent(action)}`, { signal }, 30_000)
  post(path: string, values: URLSearchParams | Record<string, string>) {
    const body = values instanceof URLSearchParams ? values : new URLSearchParams(values)
    return this.request<ApiResult>(path, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body })
  }
}
