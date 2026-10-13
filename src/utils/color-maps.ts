export function amplitudeToColor(amplitudeDb: number, minDb: number, maxDb: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, (amplitudeDb - minDb) / (maxDb - minDb)))
  if (t < 0.2) { const s = t / 0.2; return [0, 0, Math.round(40 + s * 120)] }
  else if (t < 0.4) { const s = (t - 0.2) / 0.2; return [0, Math.round(s * 200), Math.round(160 + s * 55)] }
  else if (t < 0.6) { const s = (t - 0.4) / 0.2; return [0, Math.round(200 + s * 55), Math.round(215 - s * 215)] }
  else if (t < 0.8) { const s = (t - 0.6) / 0.2; return [Math.round(s * 255), 255, 0] }
  else { const s = (t - 0.8) / 0.2; return [255, Math.round(255 - s * 255), 0] }
}
