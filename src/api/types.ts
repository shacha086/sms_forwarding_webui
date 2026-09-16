export interface DeviceStatus {
  service: string; apiVersion: number; uptimeSeconds: number; freeHeap: number
  modemReady: boolean; configValid: boolean; bleProvisioning: boolean
  wifi: { connected: boolean; ssid: string; ip?: string; rssi?: number }
}
export interface PushChannel { index: number; enabled: boolean; type: number; name: string; url: string; key1Set: boolean; key2Set: boolean; customBody: string }
export interface DeviceConfig {
  webUser: string; smtpServer: string; smtpPort: number; smtpUser: string; smtpPasswordSet: boolean
  smtpSendTo: string; adminPhone: string; numberBlackList: string; pushChannels: PushChannel[]
}
export interface ApiResult { success?: boolean; message?: string; [key: string]: unknown }
export interface Credentials { host: string; username: string; password: string }
