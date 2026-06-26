import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import './globals.css'

export const metadata: Metadata = {
  title: 'RAG Studio — Document Intelligence',
  description: 'Upload documents and ask questions answered by AI, grounded in your content.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body className="bg-bg min-h-screen overflow-hidden">{children}</body>
    </html>
  )
}
