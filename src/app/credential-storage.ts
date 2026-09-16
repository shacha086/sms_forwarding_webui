import type { Credentials } from '../api/types'

export const CREDENTIAL_STORAGE_KEY = 'sms-forwarding.credentials.v1'
const DATABASE = 'sms-forwarding-secrets'
const KEY_STORE = 'keys'

function withKeyStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DATABASE, 1)
    open.onupgradeneeded = () => open.result.createObjectStore(KEY_STORE)
    open.onerror = () => reject(open.error)
    open.onblocked = () => reject(new Error('Credential storage is blocked'))
    open.onsuccess = () => {
      const db = open.result
      const transaction = db.transaction(KEY_STORE, mode)
      const request = action(transaction.objectStore(KEY_STORE))
      transaction.oncomplete = () => { db.close(); resolve(request.result) }
      transaction.onabort = () => { db.close(); reject(transaction.error) }
      transaction.onerror = () => { db.close(); reject(transaction.error) }
    }
  })
}

const browserKeys = {
  get: () => withKeyStore<CryptoKey | undefined>('readonly', (store) => store.get('credential-key')),
  put: async (key: CryptoKey) => {
    let stored = key
    // A read/write transaction prevents competing tabs from replacing the key.
    await withKeyStore('readwrite', (store) => {
      const request = store.get('credential-key')
      request.onsuccess = () => {
        if (request.result) stored = request.result
        else store.put(key, 'credential-key')
      }
      return request
    })
    return stored
  },
}

// Serialize writes and erasure so unchecking cannot be undone by an in-flight save.
export function createCredentialStorage(storage: Storage, keys = browserKeys) {
  let queue: Promise<unknown> = Promise.resolve()
  function run<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation)
    queue = result.catch(() => {})
    return result
  }
  return {
    load: () => run(async (): Promise<Credentials | null> => {
      const raw = storage.getItem(CREDENTIAL_STORAGE_KEY)
      if (!raw) return null
      try {
        const record = JSON.parse(raw)
        if (record.version !== 1 || typeof record.iv !== 'string' || typeof record.data !== 'string') throw new Error('Invalid credentials')
        const key = await keys.get()
        if (!key) throw new Error('Missing credential key')
        const decode = (value: string) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(record.iv) }, key, decode(record.data))
        const credentials = JSON.parse(new TextDecoder().decode(plain))
        if (!credentials || !['host', 'username', 'password'].every((field) => typeof credentials[field] === 'string' && credentials[field])) throw new Error('Invalid credentials')
        return credentials as Credentials
      } catch {
        storage.removeItem(CREDENTIAL_STORAGE_KEY)
        throw new Error('无法读取已保存的密码，请重新输入并连接。')
      }
    }),
    save: (credentials: Credentials) => run(async () => {
      let key = await keys.get()
      if (!key) {
        key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
        key = await keys.put(key)
      }
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(credentials)))
      const encode = (bytes: Uint8Array) => btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
      storage.setItem(CREDENTIAL_STORAGE_KEY, JSON.stringify({ version: 1, iv: encode(iv), data: encode(new Uint8Array(encrypted)) }))
    }),
    clear: () => run(async () => { storage.removeItem(CREDENTIAL_STORAGE_KEY) }),
  }
}

let instance: ReturnType<typeof createCredentialStorage> | undefined
export function credentialStorage() {
  if (!window.isSecureContext || !crypto.subtle || !window.indexedDB) throw new Error('当前环境不支持安全保存密码，请使用 HTTPS 或 localhost。')
  return instance ??= createCredentialStorage(window.localStorage)
}
