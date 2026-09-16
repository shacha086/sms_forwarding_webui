import { Bluetooth, CheckCircle2, Cpu, HardDrive, RefreshCw, Signal, Timer, Wifi } from 'lucide-react'
import { useDevice } from '../app/device-state'
import { Button, Card, EmptyState, SectionTitle } from '../components/ui'

function duration(seconds = 0) { const d = Math.floor(seconds / 86400), h = Math.floor(seconds % 86400 / 3600), m = Math.floor(seconds % 3600 / 60); return `${d}天 ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` }
export function OverviewPage() {
  const { status, refresh, api, notify } = useDevice()
  if (!status) return <EmptyState>连接设备后查看运行状态。</EmptyState>
  const stats = [
    ['WiFi', status.wifi.connected ? '已连接' : '未连接', Wifi], ['设备 IP', status.wifi.ip || '—', HardDrive],
    ['模组', status.modemReady ? '已就绪' : '未就绪', Cpu], ['可用堆内存', `${Math.round(status.freeHeap / 1024)} KB`, HardDrive],
    ['运行时间', duration(status.uptimeSeconds), Timer], ['BLE 配网', status.bleProvisioning ? '开启' : '关闭', Bluetooth],
    ['信号 RSSI', status.wifi.rssi == null ? '—' : `${status.wifi.rssi} dBm`, Signal], ['系统配置', status.configValid ? '有效' : '待配置', CheckCircle2],
  ] as const
  return <><SectionTitle eyebrow="OVERVIEW" title="系统概览" description="设备、网络与蜂窝模组的实时运行状态。" action={<Button variant="secondary" onClick={() => refresh()}><RefreshCw size={15} />刷新</Button>} />
    <div className="stat-grid">{stats.map(([label, value, Icon]) => <Card key={label} className="stat-card"><Icon size={18} /><span>{label}</span><strong>{value}</strong></Card>)}</div>
    <Card className="hero-card"><div className="gradient-orb" /><div><span className="eyebrow">PROVISIONING</span><h3>需要切换网络？</h3><p>临时开启 BLE 配网，通过手机安全写入新的 WiFi 凭据。</p></div><Button onClick={async () => { const result = await api.post('/api/v1/wifi', { action: 'enable_ble' }); notify(result.message || 'BLE 配网已开启') }}><Bluetooth size={16} />开启 BLE</Button></Card></>
}
