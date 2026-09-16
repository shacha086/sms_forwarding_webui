import * as Tabs from '@radix-ui/react-tabs'
import { Activity, Antenna, Bluetooth, Mail, Menu, MessageSquareText, Radio, ScrollText, Send, Settings2, Wifi } from 'lucide-react'
import { useState } from 'react'
import { useDevice } from './device-state'
import { ConnectionBar } from '../components/ConnectionBar'
import { OverviewPage } from '../pages/OverviewPage'
import { ConfigPage } from '../pages/ConfigPage'
import { PushPage } from '../pages/PushPage'
import { SmsPage } from '../pages/SmsPage'
import { ToolsPage } from '../pages/ToolsPage'
import { EsimPage } from '../pages/EsimPage'
import { LogsPage } from '../pages/LogsPage'

const items = [
  ['overview', '概览', Activity], ['config', '基础配置', Settings2], ['push', '推送通道', Send],
  ['sms', '发送短信', MessageSquareText], ['tools', '模组工具', Radio], ['esim', 'eSIM', Antenna], ['logs', '系统日志', ScrollText],
] as const

export function App() {
  const [mobileNav, setMobileNav] = useState(false); const { connected, loading, status } = useDevice()
  return <Tabs.Root className="app-shell" defaultValue="overview">
    <header className="topbar"><div className="brand"><span className="brand-mark"><Mail size={17} /></span><span>SMS Forwarding</span></div>
      <div className="topbar-meta"><span className="device-chip"><span className={`status-dot ${connected ? 'status-dot--ok' : ''}`} />{loading ? '连接中' : connected ? status?.wifi.ip : '未连接'}</span><button className="icon-button mobile-only" onClick={() => setMobileNav(!mobileNav)} aria-label="菜单"><Menu size={18} /></button></div>
    </header>
    <ConnectionBar />
    <div className="shell-body">
      <Tabs.List className={`sidebar ${mobileNav ? 'sidebar--open' : ''}`} aria-label="设备管理">
        <span className="sidebar-label">DEVICE</span>{items.map(([value, label, Icon]) => <Tabs.Trigger key={value} value={value} className="nav-item" onClick={() => setMobileNav(false)}><Icon size={17} />{label}</Tabs.Trigger>)}
        <div className="sidebar-foot"><Wifi size={15} /><span>{status?.wifi.ssid || '等待连接'}</span>{status?.bleProvisioning && <Bluetooth size={14} />}</div>
      </Tabs.List>
      <main className="content">
        <Tabs.Content value="overview"><OverviewPage /></Tabs.Content><Tabs.Content value="config"><ConfigPage /></Tabs.Content>
        <Tabs.Content value="push"><PushPage /></Tabs.Content><Tabs.Content value="sms"><SmsPage /></Tabs.Content>
        <Tabs.Content value="tools"><ToolsPage /></Tabs.Content><Tabs.Content value="esim"><EsimPage /></Tabs.Content><Tabs.Content value="logs"><LogsPage /></Tabs.Content>
      </main>
    </div>
  </Tabs.Root>
}
