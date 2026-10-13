// Checks the numbers the UI displays against tests/reference/reference.json.
// Usage: node e2e/readouts.mjs <base-url>   (needs the `playwright` package and a Chromium)
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const ref = JSON.parse(readFileSync(new URL('../tests/reference/reference.json', import.meta.url)))
const base = process.argv[2] ?? 'http://localhost:4173'
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined })
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
await page.addInitScript(() => {
  for (const id of ['analyzer', 'waveform', 'modulation', 'filter', 'channelizer', 'antenna', 'calculators', 'home']) localStorage.setItem(`openrf-tour:${id}`, 'done')
})
const results = []
const check = (name, shown, expected, tol) => {
  const ok = Math.abs(shown - expected) <= tol
  results.push({ name, shown, expected: +expected.toFixed(3), ok })
}
const num = s => parseFloat(String(s).replace('−', '-').match(/-?[\d.]+/)[0])
const readout = async label => (await page.locator(`dt:text-is("${label}") + dd`).first().textContent({ timeout: 5000 }))

// Antenna
await page.goto(`${base}/#/antenna`); await page.waitForTimeout(500)
const arr = ref.antenna.arrays[0]
check('array 8 uniform beamwidth', num(await readout('Beamwidth')), arr.hpbw, 0.15)
check('array 8 uniform SLL', num(await readout('Peak SLL')), arr.sllDb, 0.15)
check('array 8 uniform directivity', num(await readout('Directivity')), arr.directivity, 0.1)
for (const t of ['dipole', 'patch', 'horn']) {
  await page.getByRole('button', { name: t[0].toUpperCase() + t.slice(1), exact: true }).first().click(); await page.waitForTimeout(200)
  check(`${t} beamwidth`, num(await readout('Beamwidth')), ref.antenna[t].hpbw, 0.6)
  check(`${t} directivity`, num(await readout('Directivity')), ref.antenna[t].directivity, 0.1)
}

// Modulation: bits/symbol and spectral efficiency = log2(M)
await page.goto(`${base}/#/modulation`); await page.waitForTimeout(500)
for (const [label, m] of [['BPSK', 2], ['QPSK', 4], ['8PSK', 8], ['16-QAM', 16], ['64-QAM', 64], ['256-QAM', 256]]) {
  await page.getByRole('button', { name: label, exact: true }).first().click(); await page.waitForTimeout(100)
  const txt = await page.getByText(/Spectral efficiency/).first().textContent()
  check(`${label} spectral efficiency`, num(txt.split(':')[1]), Math.log2(m), 0)
}

// Channelizer: multiply counts for the default M=8, L=64, N=1024
await page.goto(`${base}/#/channelizer`); await page.waitForTimeout(500)
const body = await page.locator('body').innerText()
const poly = body.match(/Polyphase\s*\n\s*([\d.]+)k mults/); const brute = body.match(/Brute Force\s*\n\s*([\d.]+)k mults/)
check('channelizer polyphase mults (k)', poly ? +poly[1] : NaN, ref.channelizer.multPoly / 1e3, 0.05)
check('channelizer brute-force mults (k)', brute ? +brute[1] : NaN, ref.channelizer.multBrute / 1e3, 0.05)

// Analyzer: preset CW at 2.437 GHz / -20 dBm, peak search marker, 3 dB BW ≈ RBW
await page.goto(`${base}/#/analyzer`); await page.waitForTimeout(800)
await page.getByRole('button', { name: 'Presets' }).first().click(); await page.waitForTimeout(1200)
await page.getByRole('button', { name: 'Peak Search' }).first().click(); await page.waitForTimeout(800)
const row = (await page.locator('table tbody tr').first().innerText()).split('\t')
check('analyzer peak marker level (dBm)', num(row[4]), -20, 0.3)
check('analyzer peak marker freq (MHz)', num(row[3]) * (row[3].includes('GHz') ? 1000 : 1), 2437, 0.13)

console.table(results)
await browser.close()
process.exit(results.every(r => r.ok) ? 0 : 1)
