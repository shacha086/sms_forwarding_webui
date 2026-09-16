const SERVICE_UUID = '7d2ea28a-f7bd-485a-bd9d-92ad6ecfe93e'
const SSID_UUID = '7d2ea28b-f7bd-485a-bd9d-92ad6ecfe93e'
const PASSWORD_UUID = '7d2ea28c-f7bd-485a-bd9d-92ad6ecfe93e'
const COMMAND_UUID = '7d2ea28d-f7bd-485a-bd9d-92ad6ecfe93e'
const STATUS_UUID = '7d2ea28e-f7bd-485a-bd9d-92ad6ecfe93e'

export interface ProvisioningStatus {
  state: 'ready' | 'connecting' | 'connected' | 'error'
  message: string
  wifiConnected: boolean
  ssid: string
  ip?: string
}

type StatusListener = (status: ProvisioningStatus) => void

function decodeStatus(value: DataView): ProvisioningStatus {
  const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
  return JSON.parse(new TextDecoder().decode(bytes)) as ProvisioningStatus
}

async function writeText(characteristic: BluetoothRemoteGATTCharacteristic, value: string) {
  const bytes = new TextEncoder().encode(value)
  if (characteristic.writeValueWithResponse) {
    await characteristic.writeValueWithResponse(bytes)
  } else {
    await characteristic.writeValue(bytes)
  }
}

export function bluetoothAvailability() {
  if (!window.isSecureContext) return { available: false, reason: '蓝牙配网需要 HTTPS 安全页面。' }
  if (!navigator.bluetooth) return { available: false, reason: '当前浏览器不支持 Web Bluetooth，请使用支持该功能的浏览器。' }
  return { available: true, reason: '' }
}

export class BluetoothProvisioningClient {
  private device?: BluetoothDevice
  private server?: BluetoothRemoteGATTServer
  private ssid?: BluetoothRemoteGATTCharacteristic
  private password?: BluetoothRemoteGATTCharacteristic
  private command?: BluetoothRemoteGATTCharacteristic
  private status?: BluetoothRemoteGATTCharacteristic
  private statusListener?: EventListener

  get deviceName() { return this.device?.name || 'SMS Forwarding' }
  get connected() { return Boolean(this.server?.connected) }

  async connect(onStatus: StatusListener, onDisconnect: () => void) {
    if (!navigator.bluetooth) throw new Error('当前浏览器不支持 Web Bluetooth')
    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'SMS-', services: [SERVICE_UUID] }],
      optionalServices: [SERVICE_UUID],
    })
    if (!this.device.gatt) throw new Error('该设备不支持 GATT 连接')
    this.device.addEventListener('gattserverdisconnected', onDisconnect, { once: true })
    this.server = await this.device.gatt.connect()
    const service = await this.server.getPrimaryService(SERVICE_UUID)
    const [ssid, password, command, status] = await Promise.all([
      service.getCharacteristic(SSID_UUID), service.getCharacteristic(PASSWORD_UUID),
      service.getCharacteristic(COMMAND_UUID), service.getCharacteristic(STATUS_UUID),
    ])
    this.ssid = ssid
    this.password = password
    this.command = command
    this.status = status
    this.statusListener = ((event: Event) => {
      const value = (event.target as BluetoothRemoteGATTCharacteristic).value
      if (value) onStatus(decodeStatus(value))
    }) as EventListener
    status.addEventListener('characteristicvaluechanged', this.statusListener)
    await status.startNotifications()
    onStatus(decodeStatus(await status.readValue()))
  }

  async provision(ssid: string, password: string) {
    if (!this.connected || !this.ssid || !this.password || !this.command) throw new Error('蓝牙设备尚未连接')
    await writeText(this.ssid, ssid)
    await writeText(this.password, password)
    await writeText(this.command, 'connect')
  }

  disconnect() {
    if (this.status && this.statusListener) this.status.removeEventListener('characteristicvaluechanged', this.statusListener)
    if (this.server?.connected) this.server.disconnect()
    this.device = undefined
    this.server = undefined
    this.ssid = undefined
    this.password = undefined
    this.command = undefined
    this.status = undefined
    this.statusListener = undefined
  }
}
