import { useState } from 'react'
import { AlertTriangle, Bell, CheckCircle2, List, ScanLine } from 'lucide-react'
import type { EsimProfile, EsimResult } from '../api/types'
import { useDevice } from '../app/device-state'
import { Button, Card, EmptyState, SectionTitle } from '../components/ui'

type EsimAction = 'info' | 'list' | 'notifcount'
type EsimView =
  | { kind: 'info'; eid: string; notificationCount?: number | null; profileCount?: number }
  | { kind: 'profiles'; profiles: EsimProfile[] }
  | { kind: 'notifications'; count: number }
  | { kind: 'error'; title: string; message: string; code?: string }

function legacyInfo(message = '') {
  if (!message.includes('<tr')) return undefined
  const document = new DOMParser().parseFromString(message, 'text/html')
  const values = new Map(Array.from(document.querySelectorAll('tr')).flatMap((row) => {
    const cells = row.querySelectorAll('td')
    return cells.length >= 2 ? [[cells[0].textContent?.trim() || '', cells[1].textContent?.trim() || '']] : []
  }))
  return {
    eid: values.get('EID') || '—',
    notificationCount: values.has('待处理通知') ? Number(values.get('待处理通知')) : null,
    profileCount: values.has('配置文件数量') ? Number(values.get('配置文件数量')) : undefined,
  }
}

function errorView(title: string, result: EsimResult): EsimView {
  const message = result.message || '设备未返回错误详情'
  return { kind: 'error', title, message, code: message.match(/\+CME ERROR:\s*\d+/i)?.[0] }
}

export function EsimPage() {
  const { connected, api, notify } = useDevice()
  const [view, setView] = useState<EsimView>()
  const [busy, setBusy] = useState<EsimAction>()
  if (!connected) return <EmptyState>连接设备后管理 eSIM。</EmptyState>

  async function run(action: EsimAction, title: string) {
    setBusy(action)
    try {
      const result = await api.getEsim(action)
      if (result.success === false) {
        setView(errorView(`${title}失败`, result))
        return
      }
      if (action === 'info') {
        const info = result.data?.eid ? result.data : legacyInfo(result.message)
        setView(info ? { kind: 'info', eid: info.eid || '—', notificationCount: info.notificationCount, profileCount: info.profileCount } : errorView('设备信息解析失败', result))
      } else if (action === 'list') {
        setView({ kind: 'profiles', profiles: result.profiles || [] })
      } else {
        setView({ kind: 'notifications', count: result.data?.notificationCount ?? 0 })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '查询失败'
      setView({ kind: 'error', title: `${title}失败`, message })
      notify(message, true)
    } finally {
      setBusy(undefined)
    }
  }

  return <><SectionTitle eyebrow="EUICC" title="eSIM 管理" description="读取 EID、配置文件和待处理通知。" />
    <div className="action-cards"><Card><ScanLine size={21} /><h3>设备信息</h3><p>读取 eUICC EID 与当前状态。</p><Button variant="secondary" disabled={Boolean(busy)} onClick={() => run('info', '设备信息读取')}>{busy === 'info' ? '查询中…' : '查询'}</Button></Card><Card><List size={21} /><h3>配置文件</h3><p>列出芯片中的运营商配置。</p><Button variant="secondary" disabled={Boolean(busy)} onClick={() => run('list', '配置文件读取')}>{busy === 'list' ? '读取中…' : '刷新'}</Button></Card><Card><Bell size={21} /><h3>待处理通知</h3><p>检查服务器上的待处理通知数量。</p><Button variant="secondary" disabled={Boolean(busy)} onClick={() => run('notifcount', '通知查询')}>{busy === 'notifcount' ? '查询中…' : '查询'}</Button></Card></div>
    {!view && <Card className="esim-placeholder"><ScanLine size={24} /><div><strong>等待查询</strong><p>选择上方项目读取 eUICC 数据。</p></div></Card>}
    {view?.kind === 'error' && <Card className="esim-result esim-error"><AlertTriangle size={24} /><div><span className="eyebrow">QUERY FAILED</span><h3>{view.title}</h3><p>{view.message}</p>{view.code && <code>{view.code}</code>}<small>请确认 SIM/eUICC 已就绪、模组不在限制模式，然后重试。</small></div></Card>}
    {view?.kind === 'info' && <Card className="esim-result"><div className="card-heading esim-heading"><div><span className="eyebrow">EUICC STATUS</span><h3>设备信息</h3></div><span className="result-badge"><CheckCircle2 size={14} />读取完成</span></div><dl className="esim-info-grid"><div className="esim-eid"><dt>EID</dt><dd>{view.eid}</dd></div><div><dt>配置文件</dt><dd>{view.profileCount == null || view.profileCount < 0 ? '—' : `${view.profileCount} 个`}</dd></div><div><dt>待处理通知</dt><dd>{view.notificationCount == null ? '暂不支持' : `${view.notificationCount} 条`}</dd></div></dl></Card>}
    {view?.kind === 'profiles' && <Card className="esim-result"><div className="card-heading esim-heading"><div><span className="eyebrow">PROFILES</span><h3>配置文件</h3></div><span className="result-badge"><CheckCircle2 size={14} />{view.profiles.length} 个</span></div>{view.profiles.length === 0 ? <div className="esim-empty">芯片中没有可用的运营商配置。</div> : <div className="esim-profile-list">{view.profiles.map((profile, index) => <article className="esim-profile" key={profile.iccid || index}><div><span className={`profile-state ${profile.state === 1 ? 'profile-state--active' : ''}`}>{profile.state === 1 ? '已启用' : profile.state === 0 ? '已禁用' : '状态未知'}</span><h4>{profile.nickname || profile.profileName || `配置 ${index + 1}`}</h4><p>{profile.serviceProviderName || '未知运营商'}</p></div><dl><div><dt>ICCID</dt><dd>{profile.iccid || '—'}</dd></div><div><dt>配置类别</dt><dd>{profile.profileClass}</dd></div></dl></article>)}</div>}</Card>}
    {view?.kind === 'notifications' && <Card className="esim-result"><div className="notification-count"><Bell size={24} /><span>待处理通知</span><strong>{view.count}</strong><small>条</small></div></Card>}
  </>
}
