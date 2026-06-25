'use client'
import {useState, useEffect} from 'react'
import DocumentUpload from '../components/DocumentUpload'
import ChatWindow from '../components/ChatWindow'
import {api, DocumentMeta} from '../lib/api'

export default function Home() {
	const [documents, setDocuments] = useState<DocumentMeta[]>([])

	useEffect(() => {
		api.listDocuments()
			.then(setDocuments)
			.catch(() => {})
	}, [])

	const handleUploaded = (doc: DocumentMeta) => {
		setDocuments((prev) => [...prev, doc])
	}

	return (
		<main className="max-w-3xl mx-auto px-4 py-8 h-screen flex flex-col gap-6">
			<div>
				<h1 className="text-2xl font-bold text-gray-900">NestJS RAG</h1>
				<p className="text-sm text-gray-500 mt-1">Upload a document and ask questions — answers are grounded in your content.</p>
			</div>

			<DocumentUpload onUploaded={handleUploaded} />

			{documents.length > 0 && (
				<div className="text-xs text-gray-500">
					<span className="font-medium">Knowledge base:</span> {documents.map((d) => d.filename).join(', ')}
				</div>
			)}

			<div className="flex-1 bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col min-h-0">
				<div className="px-5 py-3 border-b border-gray-100">
					<h2 className="text-sm font-semibold text-gray-700">Chat</h2>
				</div>
				<ChatWindow />
			</div>
		</main>
	)
}
