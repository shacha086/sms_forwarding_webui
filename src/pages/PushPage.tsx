import * as Switch from '@radix-ui/react-switch'
import { useEffect, useState, type FormEvent } from 'react'
import { Save } from 'lucide-react'
import { useDevice } from '../app/device-state'
import type { PushChannel } from '../api/types'
import { Button, Card, EmptyState, Field, SectionTitle, TextArea } from '../components/ui'

const types = ['POST JSON', 'Bark', 'GET 请求', '钉钉机器人', 'PushPlus', 'Server酱', '自定义模板', '飞书机器人', 'Gotify', 'Telegram']
type EditableChannel = PushChannel & { key1: string; key2: string }
export function PushPage() {
  const { config, api, notify, refresh } = useDevice(); const [channels, setChannels] = useState<EditableChannel[]>([])
  useEffect(() => { if (config) setChannels(Array.from({ length: 5 }, (_, index) => {
    const existing = config.pushChannels[index]
    return existing ? { ...existing, key1: '', key2: '' } : { index, enabled: false, type: 1, name: `通道${index + 1}`, url: '', key1Set: false, key2Set: false, customBody: '', key1: '', key2: '' }
  })) }, [config])
  if (!config) return <EmptyState>连接设备后配置推送通道。</EmptyState>
  const update = (index: number, patch: Partial<EditableChannel>) => setChannels((old) => old.map((channel) => channel.index === index ? { ...channel, ...patch } : channel))
  async function save(event: FormEvent) { event.preventDefault(); const body = new URLSearchParams(); channels.forEach((channel) => { const p = `push${channel.index}`; body.set(`${p}en`, String(channel.enabled)); body.set(`${p}type`, String(channel.type)); body.set(`${p}name`, channel.name); body.set(`${p}url`, channel.url); body.set(`${p}body`, channel.customBody); if (channel.key1) body.set(`${p}key1`, channel.key1); if (channel.key2) body.set(`${p}key2`, channel.key2) }); const result = await api.post('/api/v1/config', body); notify(result.message || '推送配置已保存'); await refresh() }
  return <><SectionTitle eyebrow="DELIVERY" title="推送通道" description="最多同时启用五个独立通知出口，密钥留空时不会覆盖已有值。" />
    <form onSubmit={save}><div className="channel-list">{channels.map((channel) => <Card key={channel.index} className="channel-card"><div className="channel-header"><div><span className="channel-number">{String(channel.index + 1).padStart(2, '0')}</span><div><h3>{channel.name || `通道 ${channel.index + 1}`}</h3><p>{types[channel.type - 1] || '未知类型'}</p></div></div><Switch.Root className="switch" checked={channel.enabled} onCheckedChange={(enabled) => update(channel.index, { enabled })}><Switch.Thumb className="switch-thumb" /></Switch.Root></div>
      <div className="form-grid"><Field label="通道名称" value={channel.name} onChange={(e) => update(channel.index, { name: e.target.value })} /><label className="field"><span>推送类型</span><select value={channel.type} onChange={(e) => update(channel.index, { type: Number(e.target.value) })}>{types.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label><Field className="span-2" label="URL / Webhook" value={channel.url} onChange={(e) => update(channel.index, { url: e.target.value })} /><Field label={`参数 1${channel.key1Set ? '（已保存）' : ''}`} type="password" value={channel.key1} placeholder="留空不修改" onChange={(e) => update(channel.index, { key1: e.target.value })} /><Field label={`参数 2${channel.key2Set ? '（已保存）' : ''}`} type="password" value={channel.key2} placeholder="留空不修改" onChange={(e) => update(channel.index, { key2: e.target.value })} /><TextArea className="span-2" label="自定义请求体" value={channel.customBody} onChange={(e) => update(channel.index, { customBody: e.target.value })} /></div></Card>)}</div><div className="sticky-actions"><Button><Save size={15} />保存全部通道</Button></div></form></>
}
