'use client'
import { useRef, useState, DragEvent } from 'react'
import { api, DocumentMeta } from '../lib/api'

interface Props {
  onUploaded: (doc: DocumentMeta) => void
}

export default function DocumentUpload({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'dragging' | 'uploading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState(0)

  const processFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setStatus('error')
      setMessage('File exceeds 10MB limit')
      return
    }

    setStatus('uploading')
    setMessage('')
    setProgress(0)

    const ticker = setInterval(() => {
      setProgress((p) => (p < 85 ? p + Math.random() * 15 : p))
    }, 300)

    try {
      const res = await api.uploadDocument(file)
      clearInterval(ticker)
      setProgress(100)
      setTimeout(() => {
        setStatus('success')
        setMessage(`"${file.name}" — ${res.chunks} chunks`)
        setProgress(0)
      }, 300)
      onUploaded({
        documentId: res.documentId,
        filename: file.name,
        chunks: res.chunks,
        uploadedAt: new Date().toISOString(),
      })
      if (inputRef.current) inputRef.current.value = ''
    } catch (err: unknown) {
      clearInterval(ticker)
      setProgress(0)
      setStatus('error')
      const axiosErr = err as { response?: { data?: { message?: string } } }
      setMessage(axiosErr?.response?.data?.message || 'Upload failed. Please try again.')
    }
  }

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setStatus('idle')
    handleFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setStatus('dragging')
  }

  const handleDragLeave = () => {
    if (status === 'dragging') setStatus('idle')
  }

  const isDragging = status === 'dragging'
  const isUploading = status === 'uploading'

  return (
    <div className="space-y-2">
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative rounded-xl border-2 border-dashed px-3 py-4 text-center cursor-pointer transition-all duration-200
          ${isDragging
            ? 'border-accent-purple bg-accent-purple/10'
            : 'border-border hover:border-accent-purple/50 hover:bg-surface/50'
          }
          ${isUploading ? 'pointer-events-none' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md,.docx"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {isUploading ? (
          <div className="space-y-2">
            <p className="text-xs text-muted">Processing…</p>
            <div className="h-1 bg-border rounded-full overflow-hidden">
              <div
                className="h-full accent-gradient rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <svg className="w-5 h-5 text-muted mx-auto mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-xs text-muted">
              {isDragging ? 'Drop to upload' : 'Drop a file or click to browse'}
            </p>
            <p className="text-[10px] text-muted/60 mt-0.5">PDF, TXT, MD, DOCX — max 10MB</p>
          </>
        )}
      </div>

      {message && (
        <p className={`text-[11px] px-1 animate-fade-in ${
          status === 'error' ? 'text-red-400' : 'text-emerald-400'
        }`}>
          {message}
        </p>
      )}
    </div>
  )
}
