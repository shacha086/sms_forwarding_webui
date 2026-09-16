import { useState } from 'react'
import { Activity, CirclePower, Plane, RadioTower, RotateCcw, Send } from 'lucide-react'
import { useDevice } from '../app/device-state'
import { Button, Card, CodeBlock, EmptyState, Field, SectionTitle } from '../components/ui'

export function ToolsPage() {
  const { connected, api, notify } = useDevice(); const [result, setResult] = useState('等待操作…'); const [at, setAt] = useState('AT')
  if (!connected) return <EmptyState>连接设备后使用诊断工具。</EmptyState>
  async function run(path: string, post?: Record<string, string>) { try { const value = post ? await api.post(path, post) : await api.request(path); setResult(JSON.stringify(value, null, 2)) } catch (error) { notify(error instanceof Error ? error.message : '操作失败', true) } }
  const tools = [
    ['网络状态', Activity, () => run('/query?type=network')], ['信号强度', RadioTower, () => run('/query?type=signal')],
    ['SIM 状态', RadioTower, () => run('/query?type=sim')], ['执行 Ping', Send, () => run('/api/v1/ping', {})],
    ['切换飞行模式', Plane, () => run('/flight?action=toggle')], ['重连 WiFi', RotateCcw, () => run('/wifi', { action: 'restart' })],
    ['重启模组', CirclePower, () => run('/modem?action=restart')],
  ] as const
  return <><SectionTitle eyebrow="DIAGNOSTICS" title="模组工具" description="查询网络、控制蜂窝模组并直接执行 AT 命令。" />
    <div className="tool-grid">{tools.map(([label, Icon, action]) => <button className="tool-button" key={label} onClick={action}><Icon size={19} /><span>{label}</span><small>执行</small></button>)}</div>
    <Card><div className="card-heading"><div><span className="eyebrow">AT TERMINAL</span><h3>命令终端</h3></div></div><div className="terminal-input"><Field label="AT 命令" value={at} onChange={(e) => setAt(e.target.value)} /><Button onClick={() => run(`/at?cmd=${encodeURIComponent(at)}`)}>发送</Button></div><CodeBlock>{result}</CodeBlock></Card></>
}
