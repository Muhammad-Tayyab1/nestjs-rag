'use client'
import { useState } from 'react'
import { api, DocumentMeta } from '../lib/api'

interface Props {
  documents: DocumentMeta[]
  onDeleted: (id: string) => void
}

export default function DocumentList({ documents, onDeleted }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await api.deleteDocument(id)
      onDeleted(id)
    } catch {
      // silently ignore — document may already be gone
    } finally {
      setDeletingId(null)
    }
  }

  if (documents.length === 0) {
    return (
      <p className="text-xs text-muted px-1">No documents yet. Upload one above.</p>
    )
  }

  return (
    <ul className="space-y-1.5">
      {documents.map((doc) => (
        <li
          key={doc.documentId}
          className="group flex items-start gap-2 rounded-lg px-2.5 py-2 bg-surface border border-border hover:border-accent-purple/40 transition-colors"
        >
          <div className="mt-0.5 w-1.5 h-1.5 rounded-full accent-gradient flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{doc.filename}</p>
            <p className="text-[10px] text-muted mt-0.5">{doc.chunks} chunks</p>
          </div>
          <button
            onClick={() => handleDelete(doc.documentId)}
            disabled={deletingId === doc.documentId}
            aria-label={`Delete ${doc.filename}`}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-red-400 disabled:opacity-30 flex-shrink-0 mt-0.5"
          >
            {deletingId === doc.documentId ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}
