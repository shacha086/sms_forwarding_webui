import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Bluetooth, CheckCircle2, LoaderCircle, LockKeyhole, RadioTower, Wifi } from 'lucide-react'
import { useDevice } from '../app/device-state'
import { BluetoothProvisioningClient, bluetoothAvailability, type ProvisioningStatus } from '../ble/provisioning'
import { Button, Card, Field, SectionTitle } from '../components/ui'

type Phase = 'idle' | 'scanning' | 'connected' | 'provisioning' | 'success'

export function BluetoothPage() {
  const { notify, connect: connectDevice, credentials, connected: apiConnected, api } = useDevice()
  const client = useRef<BluetoothProvisioningClient | null>(null)
  const intentionalDisconnect = useRef(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [deviceName, setDeviceName] = useState('')
  const [status, setStatus] = useState<ProvisioningStatus>()
  const support = bluetoothAvailability()

  useEffect(() => () => { intentionalDisconnect.current = true; client.current?.disconnect() }, [])

  function disconnected() {
    if (intentionalDisconnect.current) { intentionalDisconnect.current = false; return }
    setPhase('idle')
    setDeviceName('')
    notify('蓝牙连接已断开', true)
  }

  async function scan() {
    setPhase('scanning')
    const next = new BluetoothProvisioningClient()
    let initialState: ProvisioningStatus['state'] | undefined
    try {
      await next.connect((value) => {
        initialState = value.state
        setStatus(value)
        if (value.state === 'connecting') setPhase('provisioning')
        if (value.state === 'connected') {
          setPhase('success')
          notify(`已连接 WiFi${value.ip ? `：${value.ip}` : ''}`)
        }
        if (value.state === 'error') {
          setPhase('connected')
          notify(value.message || 'WiFi 连接失败', true)
        }
      }, disconnected)
      if (client.current) {
        intentionalDisconnect.current = true
        client.current.disconnect()
      }
      client.current = next
      setDeviceName(next.deviceName)
      setPhase(initialState === 'connected' ? 'success' : 'connected')
    } catch (error) {
      next.disconnect()
      setPhase('idle')
      const message = error instanceof Error && error.name === 'NotFoundError' ? '已取消选择设备' : error instanceof Error ? error.message : '蓝牙连接失败'
      notify(message, true)
    }
  }

  async function enableBle() {
    try {
      const result = await api.post('/api/v1/wifi', { action: 'enable_ble' })
      notify(result.message || 'BLE 配网已开启')
    } catch (error) {
      notify(error instanceof Error ? error.message : '无法开启 BLE 配网', true)
    }
  }

  async function provision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const ssid = String(data.get('ssid') || '').trim()
    const password = String(data.get('password') || '')
    setPhase('provisioning')
    try {
      await client.current?.provision(ssid, password)
      notify('凭据已发送，设备正在连接 WiFi')
    } catch (error) {
      setPhase('connected')
      notify(error instanceof Error ? error.message : '发送配网信息失败', true)
    }
  }

  function openDevice() {
    if (!status?.ip) return
    connectDevice({ ...credentials, host: status.ip })
  }

  const busy = phase === 'scanning' || phase === 'provisioning'
  return <><SectionTitle eyebrow="WIRELESS SETUP" title="蓝牙配网" description="无需先连接设备热点，直接通过 BLE 写入新的 WiFi 凭据。" />
    {!support.available && <Card className="notice-card notice-card--error"><Bluetooth size={20} /><div><strong>此环境无法使用蓝牙配网</strong><p>{support.reason}</p></div></Card>}
    <div className="provisioning-steps">
      <Card className={phase !== 'idle' ? 'step-card step-card--done' : 'step-card'}><span className="step-number">1</span><RadioTower size={20} /><strong>选择设备</strong><p>选择名称以 SMS- 开头的设备。</p></Card>
      <Card className={['provisioning', 'success'].includes(phase) ? 'step-card step-card--done' : 'step-card'}><span className="step-number">2</span><LockKeyhole size={20} /><strong>安全配对</strong><p>系统询问 PIN 时输入 123456。</p></Card>
      <Card className={phase === 'success' ? 'step-card step-card--done' : 'step-card'}><span className="step-number">3</span><Wifi size={20} /><strong>连接 WiFi</strong><p>写入网络名称和密码。</p></Card>
    </div>
    <Card className="ble-panel">
      <div className="card-heading"><div><span className="eyebrow">BLUETOOTH LE</span><h3>{deviceName || '尚未连接设备'}</h3><p>{deviceName ? '蓝牙安全连接已建立，可以开始配置网络。' : '请确保设备已通电且 BLE 配网处于开启状态。'}</p></div><span className={`ble-state ${deviceName ? 'ble-state--connected' : ''}`}><span />{deviceName ? '已连接' : '未连接'}</span></div>
      {!deviceName ? <div className="ble-scan"><Bluetooth size={34} /><div><strong>扫描附近设备</strong><p>扫描必须由点击触发；浏览器会弹出系统设备选择器。</p></div><div className="button-row">{apiConnected && <Button type="button" variant="secondary" onClick={enableBle}><RadioTower size={16} />开启设备 BLE</Button>}<Button type="button" disabled={!support.available || busy} onClick={scan}>{phase === 'scanning' ? <LoaderCircle className="spin" size={16} /> : <Bluetooth size={16} />}{phase === 'scanning' ? '正在选择…' : '选择蓝牙设备'}</Button></div></div>
        : <form className="ble-form" onSubmit={provision}><div className="form-grid"><Field label="WiFi 名称（SSID）" name="ssid" required maxLength={32} defaultValue={status?.ssid || ''} autoComplete="off" /><Field label="WiFi 密码" name="password" type="password" maxLength={63} autoComplete="new-password" hint="开放网络可留空" /></div><div className="ble-actions"><Button type="button" variant="secondary" onClick={() => { intentionalDisconnect.current = true; client.current?.disconnect(); setPhase('idle'); setDeviceName('') }}>断开</Button><Button disabled={busy}>{phase === 'provisioning' ? <LoaderCircle className="spin" size={16} /> : <Wifi size={16} />}{phase === 'provisioning' ? '设备连接中…' : '发送并连接'}</Button></div></form>}
    </Card>
    {phase === 'success' && <Card className="notice-card notice-card--success"><CheckCircle2 size={22} /><div><strong>WiFi 配置成功</strong><p>{status?.ssid}{status?.ip ? ` · ${status.ip}` : ''}</p></div>{status?.ip && <Button onClick={openDevice}>连接设备控制台</Button>}</Card>}
    <Card className="ble-help"><span className="eyebrow">BEFORE YOU START</span><h3>设备没有出现在列表中？</h3><p>WiFi 未连接时 BLE 会自动开启；已有网络连接时，可在设备控制台通过网络设置重新开启 BLE。设备在正常联网五分钟后会关闭 BLE，以释放内存。</p></Card>
  </>
}
