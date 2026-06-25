'use client';
import { useRef, useState } from 'react';
import { api, DocumentMeta } from '../lib/api';

interface Props {
  onUploaded: (doc: DocumentMeta) => void;
}

export default function DocumentUpload({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleUpload = async () => {
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setStatus('error');
      setMessage('File exceeds 10MB limit');
      return;
    }

    setStatus('uploading');
    setMessage('Uploading and processing...');

    try {
      const res = await api.uploadDocument(file);
      setStatus('success');
      setMessage(`Ingested "${file.name}" — ${res.chunks} chunks stored.`);
      onUploaded({
        documentId: res.documentId,
        filename: file.name,
        chunks: res.chunks,
        uploadedAt: new Date().toISOString(),
      });
      if (inputRef.current) inputRef.current.value = '';
    } catch (err: unknown) {
      setStatus('error');
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setMessage(axiosErr?.response?.data?.message || 'Upload failed. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Upload Document</h2>
      <div className="flex gap-3 items-center">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md,.docx"
          className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-gray-300 file:text-sm file:bg-gray-50 file:cursor-pointer"
        />
        <button
          onClick={handleUpload}
          disabled={status === 'uploading'}
          className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
        >
          {status === 'uploading' ? 'Processing...' : 'Upload'}
        </button>
      </div>
      {message && (
        <p className={`mt-2 text-xs ${status === 'error' ? 'text-red-500' : status === 'success' ? 'text-green-600' : 'text-gray-500'}`}>
          {message}
        </p>
      )}
      <p className="mt-1 text-xs text-gray-400">Supported: PDF, TXT, MD, DOCX — max 10MB</p>
    </div>
  );
}
