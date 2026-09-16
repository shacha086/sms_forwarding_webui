import { useEffect, useState, type FormEvent } from 'react'
import { Save, Wifi } from 'lucide-react'
import { useDevice } from '../app/device-state'
import { Button, Card, EmptyState, Field, SectionTitle, TextArea } from '../components/ui'

export function ConfigPage() {
  const { config, api, notify, refresh } = useDevice(); const [values, setValues] = useState<Record<string, string>>({})
  useEffect(() => { if (config) setValues({ webUser: config.webUser, webPass: '', smtpServer: config.smtpServer, smtpPort: String(config.smtpPort), smtpUser: config.smtpUser, smtpPass: '', smtpSendTo: config.smtpSendTo, adminPhone: config.adminPhone, numberBlackList: config.numberBlackList }) }, [config])
  if (!config) return <EmptyState>连接设备后编辑配置。</EmptyState>
  const set = (name: string, value: string) => setValues((old) => ({ ...old, [name]: value }))
  async function save(event: FormEvent) { event.preventDefault(); const body = new URLSearchParams(values); if (!values.webPass) body.delete('webPass'); if (!values.smtpPass) body.delete('smtpPass'); const result = await api.post('/api/v1/config', body); notify(result.message || '配置已保存'); await refresh() }
  async function wifi(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const body = new FormData(event.currentTarget); const result = await api.post('/api/v1/wifi', { action: 'connect', ssid: String(body.get('ssid')), password: String(body.get('password')) }); notify(result.message || 'WiFi 切换已开始') }
  return <><SectionTitle eyebrow="CONFIGURATION" title="基础配置" description="管理认证、邮件通知、管理员号码与网络凭据。" />
    <Card><form onSubmit={save}><div className="form-section"><h3>管理认证</h3><div className="form-grid"><Field label="管理账号" value={values.webUser || ''} onChange={(e) => set('webUser', e.target.value)} /><Field label="新密码" type="password" value={values.webPass || ''} hint="留空保留当前密码" onChange={(e) => set('webPass', e.target.value)} /></div></div>
      <div className="form-section"><h3>邮件通知</h3><div className="form-grid"><Field label="SMTP 服务器" value={values.smtpServer || ''} onChange={(e) => set('smtpServer', e.target.value)} /><Field label="端口" type="number" value={values.smtpPort || '465'} onChange={(e) => set('smtpPort', e.target.value)} /><Field label="邮箱账号" value={values.smtpUser || ''} onChange={(e) => set('smtpUser', e.target.value)} /><Field label="密码 / 授权码" type="password" value={values.smtpPass || ''} hint={config.smtpPasswordSet ? '已保存，留空不修改' : '尚未设置'} onChange={(e) => set('smtpPass', e.target.value)} /><Field className="span-2" label="收件地址" value={values.smtpSendTo || ''} onChange={(e) => set('smtpSendTo', e.target.value)} /></div></div>
      <div className="form-section"><h3>短信安全</h3><div className="form-grid"><Field label="管理员手机号" value={values.adminPhone || ''} onChange={(e) => set('adminPhone', e.target.value)} /><TextArea className="span-2" label="号码黑名单" hint="每行一个号码" value={values.numberBlackList || ''} onChange={(e) => set('numberBlackList', e.target.value)} /></div></div><div className="form-actions"><Button><Save size={15} />保存配置</Button></div></form></Card>
    <Card><div className="card-heading"><div><span className="eyebrow">NETWORK</span><h3>切换 WiFi</h3><p>请求发出后当前连接会断开，请在新网络重新打开设备。</p></div><Wifi size={20} /></div><form className="inline-form" onSubmit={wifi}><Field label="SSID" name="ssid" required maxLength={32} /><Field label="密码" name="password" type="password" maxLength={63} /><Button>保存并切换</Button></form></Card></>
}
