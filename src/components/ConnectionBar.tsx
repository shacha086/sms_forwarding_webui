import { useEffect, useState } from 'react'
import { LockKeyhole, RefreshCw, X } from 'lucide-react'
import { useDevice } from '../app/device-state'
import { credentialStorage } from '../app/credential-storage'
import { Button, Field } from './ui'

export function ConnectionBar() {
  const { credentials, connect, disconnect, connected, loading, error } = useDevice(); const [form, setForm] = useState(credentials)
  const [remember, setRemember] = useState(false)
  const [restoring, setRestoring] = useState(true)
  const [storageError, setStorageError] = useState('')
  useEffect(() => setForm(credentials), [credentials])
  useEffect(() => {
    let cancelled = false
    async function restore() {
      try {
        const saved = await credentialStorage().load()
        if (!cancelled && saved && (!credentials.host || credentials.host === saved.host)) {
          setForm(saved)
          setRemember(true)
        }
      } catch (cause) {
        if (!cancelled) setStorageError(cause instanceof Error ? cause.message : '无法访问密码存储。')
      } finally {
        if (!cancelled) setRestoring(false)
      }
    }
    void restore()
    return () => { cancelled = true }
    // Restore only at mount; subsequent credential changes come from connections.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!remember || !connected || restoring) return
    let cancelled = false
    void credentialStorage().save(credentials).then(() => {
      if (!cancelled) setStorageError('')
    }).catch(() => {
      if (!cancelled) setStorageError('密码保存失败，请检查浏览器存储权限。')
    })
    return () => { cancelled = true }
  }, [remember, connected, credentials, restoring])
  async function changeRemember(checked: boolean) {
    setRemember(checked)
    setStorageError('')
    try {
      const store = credentialStorage()
      if (!checked) await store.clear()
    } catch (cause) {
      setRemember(false)
      setStorageError(cause instanceof Error ? cause.message : '无法更新密码存储。')
    }
  }
  return <div className="connection-wrap"><form className="connection-bar" onSubmit={(event) => { event.preventDefault(); connect(form) }}>
    <div className="connection-intro"><span className="eyebrow">LOCAL DEVICE</span><strong>连接设备</strong></div>
    <Field aria-label="设备 IP" label="设备 IP" disabled={restoring} value={form.host} required placeholder="192.168.1.88" onChange={(e) => setForm({ ...form, host: e.target.value })} />
    <Field aria-label="账号" label="账号" disabled={restoring} autoComplete="username" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
    <Field className="connection-password" aria-label="密码" label="密码" disabled={restoring} type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
    <div className="connection-actions">
      <Button type="submit" disabled={restoring || !form.host.trim() || !form.username || !form.password}><RefreshCw size={15} className={loading ? 'spin' : ''} />{loading ? '重新连接' : '连接'}</Button>
      {(loading || connected) && <Button type="button" variant="secondary" onClick={disconnect}><X size={15} />{loading ? '取消' : '断开'}</Button>}
    </div>
    <div className="connection-preferences"><label className="remember-password"><input type="checkbox" checked={remember} disabled={restoring} onChange={(event) => void changeRemember(event.target.checked)} />记住密码</label>
      <span className="connection-status" role="status" aria-live="polite">{loading ? '正在连接设备…' : connected ? '已连接' : error ? '连接失败' : '未连接'}</span>
    </div>
  </form>{storageError && <div className="connection-error" role="alert"><LockKeyhole size={15} />{storageError}</div>}{error && <div className="connection-error" role="alert"><LockKeyhole size={15} />{error.message}</div>}</div>
}
