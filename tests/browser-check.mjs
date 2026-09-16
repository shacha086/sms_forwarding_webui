import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'

const { chromium } = createRequire(import.meta.url)(process.argv[2] || 'playwright')
const baseUrl = process.argv[3] || 'http://127.0.0.1:5173/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext()
const page = await context.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
const output = new URL('../node_modules/.ui-check/', import.meta.url)
await mkdir(output, { recursive: true })
let rejected = false
await context.route('http://192.168.1.88/api/v1/**', (route) => route.fulfill({
  status: rejected ? 401 : 200,
  contentType: 'application/json',
  headers: { 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(route.request().url().endsWith('/status') ? {
    service: 'sms-forwarding', apiVersion: 1, uptimeSeconds: 100, freeHeap: 102400,
    modemReady: false, limitedMode: true, configValid: true, bleProvisioning: false,
    wifi: { connected: true, ssid: 'Test network', ip: '192.168.1.88', rssi: -40 },
  } : { webUser: 'admin', pushChannels: [] }),
}))
const password = 'browser-test-secret'
const storageKey = 'sms-forwarding.credentials.v1'
try {
  await page.goto(`${baseUrl}#192.168.1.88`)
  await page.getByLabel('密码', { exact: true }).fill(password)
  await page.getByLabel('记住密码', { exact: true }).check()
  rejected = true
  await page.getByRole('button', { name: '连接', exact: true }).click()
  await page.getByRole('status').filter({ hasText: '连接失败' }).waitFor()
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), storageKey), null)
  for (const width of [320, 478, 640, 641, 808, 900, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    const alert = page.getByRole('alert').filter({ hasText: '管理账号或密码错误' })
    const box = await alert.boundingBox()
    const form = await page.locator('.connection-bar').evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return { left: bounds.left + parseFloat(style.paddingLeft), right: bounds.right - parseFloat(style.paddingRight) }
    })
    assert.ok(box)
    assert.ok(Math.abs(box.x - form.left) < 1, `Error left edge does not align with form at ${width}`)
    assert.ok(Math.abs(box.x + box.width - form.right) < 1, `Error right edge does not align with form at ${width}`)
    const padding = await alert.evaluate((element) => {
      const style = getComputedStyle(element)
      return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft]
    })
    assert.deepEqual(padding, ['12px', '16px', '12px', '16px'])
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Error overflow at ${width}`)
    await page.screenshot({ path: new URL(`error-${width}.png`, output).pathname.replace(/^\/([A-Za-z]:)/, '$1') })
  }
  rejected = false
  await page.getByRole('button', { name: '连接', exact: true }).click()
  await page.getByRole('heading', { name: '系统概览' }).waitFor()
  await page.waitForFunction((key) => localStorage.getItem(key) !== null, storageKey)
  assert.ok(!(await page.evaluate((key) => localStorage.getItem(key), storageKey)).includes(password))

  for (const width of [320, 478, 640, 641, 808, 900, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    if (width <= 640) await page.getByRole('button', { name: '菜单', exact: true }).click()
    const item = page.getByRole('tab', { name: '概览', exact: true })
    const box = await item.boundingBox()
    const icon = await item.locator('svg').boundingBox()
    assert.ok(box && icon)
    if (width > 640 && width <= 900) {
      assert.ok(Math.abs(icon.x + icon.width / 2 - box.x - box.width / 2) < 1, `Icon is not centered at ${width}`)
    } else {
      assert.ok(icon.x - box.x >= 10, `Missing item padding at ${width}`)
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow at ${width}`)
    await page.screenshot({ path: new URL(`layout-${width}.png`, output).pathname.replace(/^\/([A-Za-z]:)/, '$1'), fullPage: true })
    if (width <= 640) await item.click()
  }

  await page.reload()
  await page.waitForFunction((expected) => document.querySelector('input[type=password]')?.value === expected, password)
  assert.equal(await page.getByLabel('记住密码', { exact: true }).isChecked(), true)
  assert.equal(await page.getByRole('status').textContent(), '未连接')

  const otherDevice = await context.newPage()
  await otherDevice.goto(`${baseUrl}#192.168.1.99`)
  await otherDevice.getByLabel('密码', { exact: true }).fill('other-device')
  assert.equal(await otherDevice.getByLabel('记住密码', { exact: true }).isChecked(), false)
  assert.equal(await otherDevice.getByLabel('设备 IP', { exact: true }).inputValue(), '192.168.1.99')
  await otherDevice.close()

  await page.getByLabel('记住密码', { exact: true }).uncheck()
  await page.waitForFunction((key) => localStorage.getItem(key) === null, storageKey)
  await page.reload()
  await page.getByLabel('密码', { exact: true }).fill('new-session')
  assert.equal(await page.getByLabel('记住密码', { exact: true }).isChecked(), false)
  assert.deepEqual(errors, [])
  console.log('PASS: failed authentication, error padding/alignment, encrypted save, reload, no auto-connect, host isolation, forget, seven viewport layouts, no page errors')
} finally {
  await browser.close()
}
