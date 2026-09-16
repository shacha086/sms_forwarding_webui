interface BluetoothRequestDeviceOptions {
  filters?: Array<{ namePrefix?: string; services?: string[] }>
  optionalServices?: string[]
}

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  value?: DataView
  readValue(): Promise<DataView>
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  writeValue(value: BufferSource): Promise<void>
  writeValueWithResponse?(value: BufferSource): Promise<void>
}

interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>
}

interface BluetoothRemoteGATTServer {
  readonly connected: boolean
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>
}

interface BluetoothDevice extends EventTarget {
  readonly id: string
  readonly name?: string
  readonly gatt?: BluetoothRemoteGATTServer
}

interface Bluetooth {
  requestDevice(options: BluetoothRequestDeviceOptions): Promise<BluetoothDevice>
}

interface Navigator {
  readonly bluetooth?: Bluetooth
}
