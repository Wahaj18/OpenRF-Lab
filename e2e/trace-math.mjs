// Trace math: T3 = T1(max-hold) − T2(min-hold) must equal the difference of the two traces.
// Usage: node e2e/trace-math.mjs <base-url> [screenshot.png]
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:4173'
const shot = process.argv[3]
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined })
let failed = false
for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  const page = await browser.newPage({ viewport })
  await page.addInitScript(() => localStorage.setItem('openrf-tour:analyzer', 'done'))
  await page.goto(`${base}/#/analyzer`); await page.waitForTimeout(800)
  const mobile = viewport.width < 768
  if (mobile) {
    const btn = page.getByRole('button', { name: /controls/i }).first()
    if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(300) }
  }
  await page.getByRole('button', { name: 'Presets' }).first().click()
  const rows = page.locator('[data-tour="traces"] select')
  await rows.nth(0).selectOption('max-hold')
  await rows.nth(1).selectOption('min-hold')
  await page.getByLabel('Trace math').selectOption('subtract')
  await page.waitForTimeout(3000)
  const ro = page.getByTestId('trace-math-readout')
  const v = async k => parseFloat(await ro.locator(`[data-v="${k}"]`).textContent())
  // read a few times; max/min hold have settled so values are stable
  let a, b, r, ok = false
  for (let i = 0; i < 5 && !ok; i++) {
    a = await v('a'); b = await v('b'); r = await v('r')
    ok = Math.abs(r - (a - b)) <= 0.05 && Math.abs(a - b) > 1
    if (!ok) await page.waitForTimeout(300)
  }
  console.log(`${viewport.width}px: mean T1 ${a}, T2 ${b}, T3 ${r}, expected ${(a - b).toFixed(2)} → ${ok ? 'PASS' : 'FAIL'}`)
  failed ||= !ok
  if (!mobile && shot) {
    if (mobile === false) await page.locator('.flex-1.flex.overflow-visible').first().screenshot({ path: shot })
  }
  if (mobile && shot) await page.screenshot({ path: shot.replace(/\.png$/, '-mobile.png') })
  await page.close()
}
await browser.close()
process.exit(failed ? 1 : 0)
