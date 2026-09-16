import type { ApiResult, Credentials, DeviceConfig, DeviceStatus } from './types'

function encodeBasicAuth(username: string, password: string) {
  const bytes = new TextEncoder().encode(`${username}:${password}`); let raw = ''
  bytes.forEach((byte) => { raw += String.fromCharCode(byte) }); return `Basic ${btoa(raw)}`
}
export function normalizeHost(value: string) { return decodeURIComponent(value).trim().replace(/^https?:\/\//i, '').replace(/\/$/, '') }
export class ApiError extends Error { constructor(message: string, public status = 0) { super(message) } }
export class DeviceApi {
  private baseUrl: string
  constructor(private credentials: Credentials) { this.baseUrl = `http://${normalizeHost(credentials.host)}` }
  async request<T = ApiResult>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    headers.set('Authorization', encodeBasicAuth(this.credentials.username, this.credentials.password)); headers.set('Accept', 'application/json')
    const request = new Request(`${this.baseUrl}${path}`, { ...init, headers, mode: 'cors', cache: 'no-store', targetAddressSpace: 'local' })
    let response: Response
    try { response = await fetch(request) } catch { throw new ApiError('无法访问设备。请确认手机与设备在同一网络，并允许本地网络访问。') }
    const text = await response.text(); let data: unknown = {}
    try { data = text ? JSON.parse(text) : {} } catch { data = { message: text } }
    if (!response.ok) {
      const message = typeof data === 'object' && data && 'message' in data ? String(data.message) : `HTTP ${response.status}`
      throw new ApiError(response.status === 401 ? '管理账号或密码错误' : message, response.status)
    }
    return data as T
  }
  getStatus = () => this.request<DeviceStatus>('/api/v1/status')
  getConfig = () => this.request<DeviceConfig>('/api/v1/config')
  getLogs = () => this.request<string[]>('/api/v1/logs')
  post(path: string, values: URLSearchParams | Record<string, string>) {
    const body = values instanceof URLSearchParams ? values : new URLSearchParams(values)
    return this.request<ApiResult>(path, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body })
  }
}
