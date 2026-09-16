import { useEffect, useState } from 'react'
import { LockKeyhole, RefreshCw, X } from 'lucide-react'
import { useDevice } from '../app/device-state'
import { Button, Field } from './ui'

export function ConnectionBar() {
  const { credentials, connect, disconnect, connected, loading, error } = useDevice(); const [form, setForm] = useState(credentials)
  useEffect(() => setForm(credentials), [credentials])
  return <div className="connection-wrap"><form className="connection-bar" onSubmit={(event) => { event.preventDefault(); connect(form) }}>
    <div className="connection-intro"><span className="eyebrow">LOCAL DEVICE</span><strong>连接设备</strong></div>
    <Field aria-label="设备 IP" label="设备 IP" value={form.host} required placeholder="192.168.1.88" onChange={(e) => setForm({ ...form, host: e.target.value })} />
    <Field aria-label="账号" label="账号" autoComplete="username" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
    <Field className="connection-password" aria-label="密码" label="密码" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
    <div className="connection-actions">
      <Button type="submit" disabled={!form.host.trim() || !form.username || !form.password}><RefreshCw size={15} className={loading ? 'spin' : ''} />{loading ? '重新连接' : '连接'}</Button>
      {(loading || connected) && <Button type="button" variant="secondary" onClick={disconnect}><X size={15} />{loading ? '取消' : '断开'}</Button>}
    </div>
    <span className="connection-status" role="status" aria-live="polite">{loading ? '正在连接设备…' : connected ? '已连接' : error ? '连接失败' : '未连接'}</span>
  </form>{error && <div className="connection-error" role="alert"><LockKeyhole size={15} />{error.message}</div>}</div>
}
