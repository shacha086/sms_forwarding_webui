import { useState } from 'react'
import { Activity, CheckCircle2, CirclePower, Plane, RadioTower, RotateCcw, Send } from 'lucide-react'
import type { DiagnosticResult, DiagnosticValue } from '../api/types'
import { useDevice } from '../app/device-state'
import { Button, Card, CodeBlock, EmptyState, Field, SectionTitle } from '../components/ui'

type QueryKind = 'network' | 'signal' | 'sim'

interface QueryDefinition {
  title: string
  fields: Array<[string, string]>
}

interface QueryView {
  kind: QueryKind
  title: string
  rows: Array<[string, string]>
  rsrpDbm?: number
}

const queryDefinitions: Record<QueryKind, QueryDefinition> = {
  network: { title: '网络状态', fields: [['registration', '网络注册'], ['operator', '运营商'], ['dataConnection', '数据连接'], ['apn', 'APN']] },
  signal: { title: '信号强度', fields: [['rsrp', '信号强度（RSRP）'], ['rsrq', '信号质量（RSRQ）'], ['quality', '综合评价'], ['raw', '原始数据']] },
  sim: { title: 'SIM 状态', fields: [['imsi', 'IMSI'], ['iccid', 'ICCID'], ['phoneNumber', '本机号码']] },
}

function displayValue(value: DiagnosticValue) {
  if (value == null || value === '') return '—'
  if (typeof value === 'boolean') return value ? '是' : '否'
  return String(value)
}

function textFromHtml(value: string) {
  if (!value.includes('<')) return value
  const document = new DOMParser().parseFromString(value.replace(/<br\s*\/?>/gi, '\n'), 'text/html')
  return document.body.textContent?.trim() || value
}

function legacyRows(message = ''): Array<[string, string]> {
  if (!message.includes('<tr')) return message ? [['查询结果', textFromHtml(message)]] : []
  const document = new DOMParser().parseFromString(message, 'text/html')
  return Array.from(document.querySelectorAll('tr')).flatMap((row) => {
    const cells = row.querySelectorAll('td')
    return cells.length >= 2 ? [[cells[0].textContent?.trim() || '项目', cells[1].textContent?.trim() || '—']] : []
  })
}

function buildQueryView(kind: QueryKind, result: DiagnosticResult): QueryView {
  const definition = queryDefinitions[kind]
  const data = result.data && Object.keys(result.data).length ? result.data : undefined
  const rows = data
    ? definition.fields.map(([key, label]) => [label, displayValue(data[key])] as [string, string])
    : legacyRows(result.message)
  return {
    kind,
    title: definition.title,
    rows,
    rsrpDbm: kind === 'signal' && typeof data?.rsrpDbm === 'number' ? data.rsrpDbm : undefined,
  }
}

export function ToolsPage() {
  const { connected, api, notify } = useDevice()
  const [queryView, setQueryView] = useState<QueryView>()
  const [operation, setOperation] = useState<{ title: string; message: string }>()
  const [busy, setBusy] = useState('')
  const [at, setAt] = useState('AT')
  const [atResult, setAtResult] = useState('等待发送 AT 命令…')
  if (!connected) return <EmptyState>连接设备后使用诊断工具。</EmptyState>

  async function runQuery(kind: QueryKind) {
    setBusy(kind)
    try {
      const value = await api.getDiagnostic(kind)
      if (value.success === false) throw new Error(value.message || '查询失败')
      setQueryView(buildQueryView(kind, value))
    } catch (error) {
      notify(error instanceof Error ? error.message : '查询失败', true)
    } finally {
      setBusy('')
    }
  }

  async function runAction(title: string, path: string, post?: Record<string, string>) {
    setBusy(title)
    try {
      const value = post ? await api.post(path, post) : await api.request(path)
      if (value.success === false) throw new Error(value.message || '操作失败')
      const message = textFromHtml(value.message || '操作已完成')
      setOperation({ title, message })
      notify(message)
    } catch (error) {
      notify(error instanceof Error ? error.message : '操作失败', true)
    } finally {
      setBusy('')
    }
  }

  async function runAt() {
    setBusy('at')
    try {
      const value = await api.request(`/at?cmd=${encodeURIComponent(at)}`)
      if (value.success === false) throw new Error(value.message || 'AT 命令执行失败')
      setAtResult(typeof value.message === 'string' ? textFromHtml(value.message) : JSON.stringify(value, null, 2))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AT 命令执行失败'
      setAtResult(message)
      notify(message, true)
    } finally {
      setBusy('')
    }
  }

  const tools = [
    { id: 'network', label: '网络状态', Icon: Activity, action: () => runQuery('network') },
    { id: 'signal', label: '信号强度', Icon: RadioTower, action: () => runQuery('signal') },
    { id: 'sim', label: 'SIM 状态', Icon: RadioTower, action: () => runQuery('sim') },
    { id: 'ping', label: '执行 Ping', Icon: Send, action: () => runAction('Ping 测试', '/api/v1/ping', {}) },
    { id: 'flight', label: '切换飞行模式', Icon: Plane, action: () => runAction('飞行模式', '/flight?action=toggle') },
    { id: 'wifi', label: '重连 WiFi', Icon: RotateCcw, action: () => runAction('WiFi 重连', '/wifi', { action: 'restart' }) },
    { id: 'modem', label: '重启模组', Icon: CirclePower, action: () => runAction('模组重启', '/modem?action=restart') },
  ] as const

  const signalPercent = queryView?.rsrpDbm == null ? undefined : Math.max(0, Math.min(100, (queryView.rsrpDbm + 140) / 0.96))

  return <><SectionTitle eyebrow="DIAGNOSTICS" title="模组工具" description="查询网络、控制蜂窝模组并直接执行 AT 命令。" />
    <div className="tool-grid">{tools.map(({ id, label, Icon, action }) => <button className={`tool-button ${queryView?.kind === id ? 'tool-button--active' : ''}`} key={id} disabled={Boolean(busy)} aria-busy={busy === id} onClick={action}><Icon size={19} /><span>{label}</span><small>{busy === id ? '执行中…' : queryView?.kind === id ? '已更新 · 再次查询' : '执行'}</small></button>)}</div>
    {queryView && <Card className="diagnostic-result"><div className="card-heading diagnostic-heading"><div><span className="eyebrow">LIVE RESULT</span><h3>{queryView.title}</h3></div><span className="result-badge"><CheckCircle2 size={14} />查询完成</span></div>
      {signalPercent != null && <div className="signal-visual"><div className="signal-scale"><span>弱</span><span>{queryView.rsrpDbm} dBm</span><span>强</span></div><div className="signal-track" role="progressbar" aria-label="蜂窝信号强度" aria-valuemin={-140} aria-valuemax={-44} aria-valuenow={queryView.rsrpDbm}><span style={{ width: `${signalPercent}%` }} /></div></div>}
      <dl className="diagnostic-values">{queryView.rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </Card>}
    {operation && <Card className="operation-result"><CheckCircle2 size={20} /><div><strong>{operation.title}</strong><p>{operation.message}</p></div></Card>}
    <Card><div className="card-heading"><div><span className="eyebrow">AT TERMINAL</span><h3>命令终端</h3></div></div><div className="terminal-input"><Field label="AT 命令" value={at} onChange={(e) => setAt(e.target.value)} /><Button disabled={Boolean(busy)} onClick={runAt}>{busy === 'at' ? '发送中…' : '发送'}</Button></div><CodeBlock>{atResult}</CodeBlock></Card></>
}
