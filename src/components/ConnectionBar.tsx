import { useEffect, useState } from 'react'
import { LockKeyhole, RefreshCw } from 'lucide-react'
import { useDevice } from '../app/device-state'
import { Button, Field } from './ui'

export function ConnectionBar() {
  const { credentials, connect, loading, error } = useDevice(); const [form, setForm] = useState(credentials)
  useEffect(() => setForm(credentials), [credentials])
  return <div className="connection-wrap"><form className="connection-bar" onSubmit={(event) => { event.preventDefault(); connect(form) }}>
    <div className="connection-intro"><span className="eyebrow">LOCAL DEVICE</span><strong>连接设备</strong></div>
    <Field aria-label="设备 IP" label="设备 IP" value={form.host} placeholder="192.168.1.88" onChange={(e) => setForm({ ...form, host: e.target.value })} />
    <Field aria-label="账号" label="账号" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
    <Field aria-label="密码" label="密码" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
    <Button disabled={loading || !form.host}><RefreshCw size={15} className={loading ? 'spin' : ''} />{loading ? '连接中' : '连接'}</Button>
  </form>{error && <div className="connection-error"><LockKeyhole size={15} />{error.message}</div>}</div>
}
