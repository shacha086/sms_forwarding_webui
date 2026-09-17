import { useQuery } from '@tanstack/react-query'
import { Download, RefreshCw } from 'lucide-react'
import { useDevice } from '../app/device-state'
import { Button, Card, CodeBlock, EmptyState, SectionTitle } from '../components/ui'

export function LogsPage() {
  const { connected, api, connectionId } = useDevice(); const query = useQuery({ queryKey: ['device', connectionId, 'logs'], queryFn: ({ signal }) => api.getLogs(signal), enabled: connected, gcTime: 0, retry: false, refetchInterval: connected ? 3_000 : false })
  if (!connected) return <EmptyState>连接设备后查看日志。</EmptyState>
  const text = query.isPending ? '加载中…' : query.data?.join('\n') || '暂无日志'
  function download() { const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' })); link.download = `sms-forwarding-${Date.now()}.log`; link.click(); URL.revokeObjectURL(link.href) }
  return <><SectionTitle eyebrow="OBSERVABILITY" title="系统日志" description="最近 60 行运行日志，每三秒自动刷新。" action={<div className="button-row"><Button variant="secondary" onClick={() => query.refetch()}><RefreshCw size={15} />刷新</Button><Button variant="secondary" onClick={download}><Download size={15} />导出</Button></div>} /><Card><CodeBlock>{text}</CodeBlock></Card></>
}
