'use client'
import { useState, useEffect } from 'react'
import DocumentUpload from '../components/DocumentUpload'
import DocumentList from '../components/DocumentList'
import ChatWindow from '../components/ChatWindow'
import { api, DocumentMeta } from '../lib/api'

export default function Home() {
  const [documents, setDocuments] = useState<DocumentMeta[]>([])

  useEffect(() => {
    api.listDocuments().then(setDocuments).catch(() => {})
  }, [])

  const handleUploaded = (doc: DocumentMeta) => {
    setDocuments((prev) => [...prev, doc])
  }

  const handleDeleted = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.documentId !== id))
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[280px] flex-shrink-0 bg-sidebar border-r border-border flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg accent-gradient flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white leading-none">RAG Studio</h1>
              <p className="text-[10px] text-muted mt-0.5">Document Intelligence</p>
            </div>
          </div>
        </div>

        {/* Upload section */}
        <div className="px-4 py-4 border-b border-border">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Upload</p>
          <DocumentUpload onUploaded={handleUploaded} />
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Knowledge Base</p>
            {documents.length > 0 && (
              <span className="text-[10px] bg-accent-purple/20 text-accent-purple px-1.5 py-0.5 rounded-full">
                {documents.length}
              </span>
            )}
          </div>
          <DocumentList documents={documents} onDeleted={handleDeleted} />
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border">
          <p className="text-[10px] text-muted/50">Powered by Groq · Pinecone · HuggingFace</p>
        </div>
      </aside>

      {/* Main chat panel */}
      <main className="flex-1 flex flex-col overflow-hidden bg-bg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Chat</h2>
            <p className="text-[11px] text-muted">
              {documents.length === 0
                ? 'Upload a document to start asking questions'
                : `${documents.length} document${documents.length === 1 ? '' : 's'} in knowledge base`}
            </p>
          </div>
          {documents.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] text-emerald-400">Ready</span>
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-hidden">
          <ChatWindow />
        </div>
      </main>
    </div>
  )
}
