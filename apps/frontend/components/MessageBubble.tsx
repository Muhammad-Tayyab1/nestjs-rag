import { Source } from '../lib/api';

interface Props {
  role: 'user' | 'ai';
  content: string;
  sources?: Source[];
}

export default function MessageBubble({ role, content, sources }: Props) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
        isUser ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800'
      }`}>
        <p className="whitespace-pre-wrap">{content}</p>
        {sources && sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-500 mb-1">Sources:</p>
            {sources.map((s, i) => (
              <div key={i} className="text-xs text-gray-500">
                <span className="font-medium">{s.filename}</span>{' '}
                <span className="text-gray-400">(score: {s.score.toFixed(2)})</span>
                <p className="text-gray-400 italic mt-0.5 truncate">{s.chunk}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
