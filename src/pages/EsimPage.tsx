import { useState } from 'react'
import { Bell, List, ScanLine } from 'lucide-react'
import { useDevice } from '../app/device-state'
import { Button, Card, CodeBlock, EmptyState, SectionTitle } from '../components/ui'

export function EsimPage() {
  const { connected, api, notify } = useDevice(); const [result, setResult] = useState('等待查询…')
  if (!connected) return <EmptyState>连接设备后管理 eSIM。</EmptyState>
  async function run(action: string) { try { setResult(JSON.stringify(await api.request(`/esim?action=${action}`), null, 2)) } catch (error) { notify(error instanceof Error ? error.message : '查询失败', true) } }
  return <><SectionTitle eyebrow="EUICC" title="eSIM 管理" description="读取 EID、配置文件和待处理通知。" /><div className="action-cards"><Card><ScanLine size={21} /><h3>设备信息</h3><p>读取 eUICC EID 与当前状态。</p><Button variant="secondary" onClick={() => run('info')}>查询</Button></Card><Card><List size={21} /><h3>配置文件</h3><p>列出芯片中的运营商配置。</p><Button variant="secondary" onClick={() => run('list')}>刷新</Button></Card><Card><Bell size={21} /><h3>待处理通知</h3><p>检查并读取服务器通知。</p><Button variant="secondary" onClick={() => run('notifretrieve')}>读取</Button></Card></div><Card><CodeBlock>{result}</CodeBlock></Card></>
}
