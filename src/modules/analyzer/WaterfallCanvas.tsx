import { useRef, useEffect } from 'react'
import { amplitudeToColor } from '../../utils/color-maps'

interface WaterfallCanvasProps {
  width: number
  height: number
  waterfallRow: Float32Array | null
  refLevel: number
  scale: number
  numDivY: number
}

const MAX_HISTORY = 200

export function WaterfallCanvas({ width, height, waterfallRow, refLevel, scale, numDivY = 10 }: WaterfallCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const historyRef = useRef<Float32Array[]>([])
  const imageDataRef = useRef<ImageData | null>(null)

  const minDb = refLevel - scale * numDivY
  const maxDb = refLevel

  useEffect(() => {
    if (!waterfallRow) return
    historyRef.current.unshift(new Float32Array(waterfallRow))
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.pop()

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!imageDataRef.current || imageDataRef.current.width !== width || imageDataRef.current.height !== height) {
      imageDataRef.current = ctx.createImageData(width, height)
    }
    const imageData = imageDataRef.current
    const pixels = imageData.data
    const history = historyRef.current
    const rowHeight = height / MAX_HISTORY

    for (let row = 0; row < Math.min(history.length, MAX_HISTORY); row++) {
      const data = history[row]
      const yStart = Math.floor(row * rowHeight)
      const yEnd = Math.floor((row + 1) * rowHeight)
      for (let x = 0; x < width; x++) {
        const bin = Math.floor((x / width) * data.length)
        const val = bin < data.length ? data[bin] : -150
        const [r, g, b] = amplitudeToColor(val, minDb, maxDb)
        for (let y = yStart; y < yEnd && y < height; y++) {
          const idx = (y * width + x) * 4
          pixels[idx] = r; pixels[idx + 1] = g; pixels[idx + 2] = b; pixels[idx + 3] = 255
        }
      }
    }

    const filledHeight = Math.floor(Math.min(history.length, MAX_HISTORY) * rowHeight)
    for (let y = filledHeight; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        pixels[idx] = 0; pixels[idx + 1] = 5; pixels[idx + 2] = 32; pixels[idx + 3] = 255
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }, [waterfallRow, width, height, minDb, maxDb])

  return <canvas ref={canvasRef} width={width} height={height} className="block" style={{ backgroundColor: '#060b16' }} />
}
