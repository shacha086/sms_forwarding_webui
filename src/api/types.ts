export interface DeviceStatus {
  service: string; apiVersion: number; uptimeSeconds: number; freeHeap: number
  modemReady: boolean; limitedMode?: boolean; configValid: boolean; bleProvisioning: boolean
  wifi: { connected: boolean; ssid: string; ip?: string; rssi?: number }
}
export interface PushChannel { index: number; enabled: boolean; type: number; name: string; url: string; key1Set: boolean; key2Set: boolean; customBody: string }
export interface DeviceConfig {
  webUser: string; smtpServer: string; smtpPort: number; smtpUser: string; smtpPasswordSet: boolean
  smtpSendTo: string; adminPhone: string; numberBlackList: string; pushChannels: PushChannel[]
}
export interface ApiResult { success?: boolean; message?: string; [key: string]: unknown }
export type DiagnosticValue = string | number | boolean | null
export interface DiagnosticResult extends ApiResult { data?: Record<string, DiagnosticValue> }
export interface EsimProfile {
  iccid: string; nickname: string; state: number; profileClass: number
  serviceProviderName: string; profileName: string
}
export interface EsimResult extends ApiResult {
  data?: { eid?: string; notificationCount?: number | null; profileCount?: number }
  profiles?: EsimProfile[]
  count?: number
}
export interface Credentials { host: string; username: string; password: string }
