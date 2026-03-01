import { useState, useRef, useEffect, useCallback } from 'react'
import { createWorker } from 'tesseract.js'

type Props = {
  open: boolean
  onClose: () => void
}

type Phase = 'camera' | 'processing' | 'results'

export default function OcrScanner({ open, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [phase, setPhase] = useState<Phase>('camera')
  const [tokens, setTokens] = useState<string[]>([])
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [error, setError] = useState('')

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const startCamera = useCallback(async () => {
    setError('')
    setPhase('camera')
    setTokens([])
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch {
      setError('Could not access camera. Check permissions.')
    }
  }, [])

  useEffect(() => {
    if (open) {
      startCamera()
    } else {
      stopCamera()
      setPhase('camera')
      setTokens([])
      setError('')
    }
    return () => stopCamera()
  }, [open, startCamera, stopCamera])

  async function handleCapture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)

    stopCamera()
    setPhase('processing')

    try {
      const worker = await createWorker('eng+jpn')
      const { data } = await worker.recognize(canvas)
      await worker.terminate()

      const words = data.text
        .split(/[\n\r\s]+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 0)

      setTokens(words)
      setPhase('results')
    } catch {
      setError('OCR failed. Try again with better lighting.')
      setPhase('camera')
      startCamera()
    }
  }

  function handleCopy(token: string, idx: number) {
    navigator.clipboard.writeText(token).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 1500)
    })
  }

  function handleRetake() {
    setTokens([])
    startCamera()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-900/95">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-lg font-semibold text-neutral-100">Scan Card</h2>
        <button
          onClick={onClose}
          className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 transition hover:bg-neutral-800"
        >
          Close
        </button>
      </div>

      {error && (
        <p className="px-4 text-sm text-red-400">{error}</p>
      )}

      {/* Camera viewfinder */}
      {phase === 'camera' && (
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-h-[60vh] rounded-lg border border-neutral-700 bg-black object-cover"
          />
          <button
            onClick={handleCapture}
            className="mt-6 rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Capture
          </button>
        </div>
      )}

      {/* Processing spinner */}
      {phase === 'processing' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-600 border-t-indigo-500" />
          <p className="text-sm text-neutral-400">Reading text...</p>
        </div>
      )}

      {/* Results */}
      {phase === 'results' && (
        <div className="flex flex-1 flex-col px-4 overflow-y-auto">
          {tokens.length === 0 ? (
            <p className="mt-8 text-center text-sm text-neutral-400">
              No text detected. Try again with better lighting.
            </p>
          ) : (
            <>
              <p className="mb-3 text-xs text-neutral-500">
                Tap a word to copy it to clipboard
              </p>
              <div className="flex flex-wrap gap-2">
                {tokens.map((token, idx) => (
                  <button
                    key={`${token}-${idx}`}
                    onClick={() => handleCopy(token, idx)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      copiedIdx === idx
                        ? 'border-green-600 bg-green-900/40 text-green-300'
                        : 'border-neutral-600 bg-neutral-800 text-neutral-200 hover:border-indigo-500'
                    }`}
                  >
                    {copiedIdx === idx ? 'Copied!' : token}
                  </button>
                ))}
              </div>
            </>
          )}
          <button
            onClick={handleRetake}
            className="mt-6 self-center rounded-lg border border-neutral-700 px-6 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800"
          >
            Retake
          </button>
        </div>
      )}

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
