import { useQuery } from '@tanstack/react-query'
import { Download, RefreshCw } from 'lucide-react'
import { useDevice } from '../app/device-state'
import { Button, Card, CodeBlock, EmptyState, SectionTitle } from '../components/ui'

export function LogsPage() {
  const { connected, api } = useDevice(); const query = useQuery({ queryKey: ['logs'], queryFn: api.getLogs, enabled: connected, refetchInterval: 3_000 })
  if (!connected) return <EmptyState>连接设备后查看日志。</EmptyState>
  const text = query.data?.join('\n') || '暂无日志'
  function download() { const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' })); link.download = `sms-forwarding-${Date.now()}.log`; link.click(); URL.revokeObjectURL(link.href) }
  return <><SectionTitle eyebrow="OBSERVABILITY" title="系统日志" description="最近 60 行运行日志，每三秒自动刷新。" action={<div className="button-row"><Button variant="secondary" onClick={() => query.refetch()}><RefreshCw size={15} />刷新</Button><Button variant="secondary" onClick={download}><Download size={15} />导出</Button></div>} /><Card><CodeBlock>{text}</CodeBlock></Card></>
}
