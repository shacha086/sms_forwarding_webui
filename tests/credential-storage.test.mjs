import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/app/credential-storage.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
})
const { createCredentialStorage, CREDENTIAL_STORAGE_KEY } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const credentials = { host: '192.168.1.88', username: 'admin', password: 'secret-password-中文' }

function fixture() {
  const data = new Map()
  let key
  const storage = {
    getItem: (name) => data.get(name) ?? null,
    setItem: (name, value) => data.set(name, value),
    removeItem: (name) => data.delete(name),
  }
  const keys = { get: async () => key, put: async (value) => { key = value; return key } }
  return { storage, keys, store: createCredentialStorage(storage, keys) }
}

test('stores only ciphertext and restores credentials after reload with a non-extractable key', async () => {
  const { store, storage, keys } = fixture()
  assert.equal(await store.load(), null)
  await store.save(credentials)
  const raw = storage.getItem(CREDENTIAL_STORAGE_KEY)
  for (const value of Object.values(credentials)) assert.ok(!raw.includes(value))
  assert.equal((await keys.get()).extractable, false)
  await assert.rejects(crypto.subtle.exportKey('raw', await keys.get()))
  assert.deepEqual(await createCredentialStorage(storage, keys).load(), credentials)
})

test('uses a fresh IV and ciphertext for each save', async () => {
  const { store, storage } = fixture()
  await store.save(credentials)
  const first = JSON.parse(storage.getItem(CREDENTIAL_STORAGE_KEY))
  await store.save(credentials)
  const second = JSON.parse(storage.getItem(CREDENTIAL_STORAGE_KEY))
  assert.notEqual(first.iv, second.iv)
  assert.notEqual(first.data, second.data)
})

test('forget wins over an in-flight save', async () => {
  const { store, storage } = fixture()
  const saving = store.save(credentials)
  const clearing = store.clear()
  await Promise.all([saving, clearing])
  assert.equal(storage.getItem(CREDENTIAL_STORAGE_KEY), null)
})

test('corrupt ciphertext is rejected and removed', async () => {
  const { store, storage } = fixture()
  await store.save(credentials)
  const record = JSON.parse(storage.getItem(CREDENTIAL_STORAGE_KEY))
  record.data = `${record.data[0] === 'A' ? 'B' : 'A'}${record.data.slice(1)}`
  storage.setItem(CREDENTIAL_STORAGE_KEY, JSON.stringify(record))
  await assert.rejects(store.load())
  assert.equal(storage.getItem(CREDENTIAL_STORAGE_KEY), null)
})

test('a missing key never falls back to plaintext', async () => {
  const { store, storage, keys } = fixture()
  await store.save(credentials)
  await keys.put(undefined)
  await assert.rejects(store.load())
  assert.equal(storage.getItem(CREDENTIAL_STORAGE_KEY), null)
})

test('storage failures propagate and do not poison subsequent operations', async () => {
  const { storage, keys } = fixture()
  let fail = true
  const store = createCredentialStorage({
    ...storage,
    setItem: (name, value) => {
      if (fail) throw new Error('Quota exceeded')
      storage.setItem(name, value)
    },
  }, keys)
  await assert.rejects(store.save(credentials), /Quota/)
  assert.equal(storage.getItem(CREDENTIAL_STORAGE_KEY), null)
  fail = false
  await store.save(credentials)
  assert.deepEqual(await store.load(), credentials)
})

test('uses the committed key when another tab wins key creation', async () => {
  const { storage } = fixture()
  const winner = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  let exists = false
  const keys = {
    get: async () => exists ? winner : undefined,
    put: async () => { exists = true; return winner },
  }
  const store = createCredentialStorage(storage, keys)
  await store.save(credentials)
  assert.deepEqual(await store.load(), credentials)
})
