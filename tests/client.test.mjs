import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { afterEach, test } from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/api/client.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
})
const { DeviceApi, ApiError } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const originalFetch = globalThis.fetch
const api = new DeviceApi({ host: '192.168.1.88', username: 'admin', password: 'changed-password' })

afterEach(() => { globalThis.fetch = originalFetch })

test('requests use the supplied password, not the default password', async () => {
  globalThis.fetch = async (request) => {
    assert.equal(request.headers.get('Authorization'), `Basic ${btoa('admin:changed-password')}`)
    return Response.json({ service: 'sms-forwarding' })
  }
  assert.equal((await api.getStatus()).service, 'sms-forwarding')
})

test('authentication failures preserve HTTP 401', async () => {
  globalThis.fetch = async () => Response.json({}, { status: 401 })
  await assert.rejects(api.getStatus(), (error) => error instanceof ApiError && error.status === 401)
})

test('diagnostic queries use the authenticated API client', async () => {
  globalThis.fetch = async (request) => {
    assert.equal(request.url, 'http://192.168.1.88/query?type=network')
    assert.equal(request.headers.get('Authorization'), `Basic ${btoa('admin:changed-password')}`)
    return Response.json({ success: true, data: { registration: '已注册，本地网络' } })
  }
  assert.equal((await api.getDiagnostic('network')).data.registration, '已注册，本地网络')
})

test('eSIM queries use the authenticated API client', async () => {
  globalThis.fetch = async (request) => {
    assert.equal(request.url, 'http://192.168.1.88/esim?action=list')
    assert.equal(request.headers.get('Authorization'), `Basic ${btoa('admin:changed-password')}`)
    return Response.json({ success: true, profiles: [], count: 0 })
  }
  assert.equal((await api.getEsim('list')).count, 0)
})

test('cancellation aborts the underlying request without reporting a network failure', async () => {
  const controller = new AbortController()
  let requestSignal
  globalThis.fetch = (request) => new Promise((resolve, reject) => {
    requestSignal = request.signal
    request.signal.addEventListener('abort', () => reject(request.signal.reason), { once: true })
  })
  const pending = api.getStatus(controller.signal)
  controller.abort()
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal(requestSignal.aborted, true)
})

test('an already cancelled attempt cannot start another request', async () => {
  const controller = new AbortController()
  controller.abort()
  globalThis.fetch = async (request) => {
    assert.equal(request.signal.aborted, true)
    throw request.signal.reason
  }
  await assert.rejects(api.getConfig(controller.signal), { name: 'AbortError' })
})

test('an unresponsive connection times out and aborts the request', async () => {
  let requestSignal
  globalThis.fetch = (request) => new Promise((resolve, reject) => {
    requestSignal = request.signal
    request.signal.addEventListener('abort', () => reject(request.signal.reason), { once: true })
  })
  await assert.rejects(api.request('/api/v1/status', {}, 10), (error) => error instanceof ApiError && error.status === 0)
  assert.equal(requestSignal.aborted, true)
})

test('timeout also covers a stalled response body', async () => {
  globalThis.fetch = async (request) => new Response(new ReadableStream({
    start(controller) {
      request.signal.addEventListener('abort', () => controller.error(request.signal.reason), { once: true })
    },
  }))
  await assert.rejects(api.request('/api/v1/status', {}, 10), (error) => error instanceof ApiError && error.status === 0)
})

test('network failures become actionable API errors', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(api.getStatus(), (error) => error instanceof ApiError && error.status === 0)
})
