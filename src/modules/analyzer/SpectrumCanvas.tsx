import { useRef, useEffect, useCallback } from 'react'

interface SpectrumCanvasProps {
  width: number
  height: number
  spectrumData: Map<number, Float32Array>
  traceColors: string[]
  traceVisible: boolean[]
  refLevel: number
  scale: number
  numDivY: number
  startFreq: number
  stopFreq: number
  offset?: number
  /** extra dB added when drawing each trace (e.g. to centre an A − B result) */
  traceShift?: number[]
  onClickSpectrum?: (frequency: number, amplitude: number) => void
}

export function SpectrumCanvas({
  width, height, spectrumData, traceColors, traceVisible,
  refLevel, scale, numDivY = 10, startFreq, stopFreq, offset = 0, traceShift, onClickSpectrum,
}: SpectrumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const totalDbRange = scale * numDivY

  const dbToY = useCallback((db: number): number => {
    return ((refLevel - (db + offset)) / totalDbRange) * height
  }, [refLevel, totalDbRange, height, offset])

  const binToX = useCallback((bin: number, numBins: number): number => {
    return (bin / (numBins - 1)) * width
  }, [width])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#060b16'
    ctx.fillRect(0, 0, width, height)

    // Graticule
    ctx.strokeStyle = '#0d1f3c'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= numDivY; i++) {
      const y = (i / numDivY) * height
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke()
    }
    const numDivX = 10
    for (let i = 0; i <= numDivX; i++) {
      const x = (i / numDivX) * width
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke()
    }

    // Traces
    spectrumData.forEach((data, traceIndex) => {
      if (!traceVisible[traceIndex] || data.length === 0) return
      ctx.strokeStyle = traceColors[traceIndex] ?? '#00e5ff'
      ctx.lineWidth = traceIndex === 0 ? 1.5 : 1
      ctx.globalAlpha = traceIndex === 0 ? 1 : 0.7
      const shift = traceShift?.[traceIndex] ?? 0
      ctx.beginPath()
      for (let i = 0; i < data.length; i++) {
        const x = binToX(i, data.length)
        const y = Math.max(0, Math.min(height, dbToY(data[i] + shift)))
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    })
  }, [width, height, spectrumData, traceColors, traceVisible, traceShift, refLevel, scale, numDivY, dbToY, binToX])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onClickSpectrum) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const frequency = startFreq + (x / width) * (stopFreq - startFreq)
    const amplitude = refLevel - (y / height) * totalDbRange
    onClickSpectrum(frequency, amplitude)
  }, [onClickSpectrum, startFreq, stopFreq, width, height, refLevel, totalDbRange])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleClick}
      className="block cursor-crosshair"
      style={{ backgroundColor: '#060b16' }}
    />
  )
}
