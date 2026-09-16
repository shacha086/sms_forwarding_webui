import { useState, type FormEvent } from 'react'
import { MessageSquareText, Send } from 'lucide-react'
import { useDevice } from '../app/device-state'
import { Button, Card, EmptyState, Field, SectionTitle, TextArea } from '../components/ui'

export function SmsPage() {
  const { connected, api, notify } = useDevice(); const [sending, setSending] = useState(false); const [content, setContent] = useState('')
  if (!connected) return <EmptyState>连接设备后发送短信。</EmptyState>
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); setSending(true); try { const result = await api.post('/api/v1/sms', { phone: String(data.get('phone')), content }); notify(result.message || '短信已发送'); setContent('') } catch (error) { notify(error instanceof Error ? error.message : '发送失败', true) } finally { setSending(false) } }
  return <><SectionTitle eyebrow="MESSAGING" title="发送短信" description="通过蜂窝模组主动发送短信，用于测试或保号。" />
    <Card className="narrow-card"><div className="message-visual"><MessageSquareText size={24} /><span>NEW MESSAGE</span></div><form onSubmit={submit}><Field label="目标号码" name="phone" placeholder="13800138000" required /><TextArea label="短信内容" value={content} onChange={(e) => setContent(e.target.value)} placeholder="输入短信内容…" required /><div className="composer-meta"><span>{content.length} 字符</span><Button disabled={sending}><Send size={15} />{sending ? '发送中' : '发送短信'}</Button></div></form></Card></>
}
