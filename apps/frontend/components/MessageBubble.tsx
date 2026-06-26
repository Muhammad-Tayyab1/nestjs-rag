import { Source } from '../lib/api'

interface Props {
  role: 'user' | 'ai'
  content: string
  sources?: Source[]
}

export default function MessageBubble({ role, content, sources }: Props) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full accent-gradient flex-shrink-0 mr-2.5 mt-0.5 flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 3a1 1 0 110 2 1 1 0 010-2zm0 3c.55 0 1 .45 1 1v4a1 1 0 11-2 0V9a1 1 0 011-1z" />
          </svg>
        </div>
      )}

      <div className={`max-w-[78%] ${isUser ? '' : 'flex-1'}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'accent-gradient text-white rounded-br-sm'
              : 'bg-surface border border-border text-white rounded-bl-sm'
          }`}
        >
          <p className="whitespace-pre-wrap">{content}</p>

          {sources && sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
              <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wide">Sources</p>
              {sources.map((s, i) => (
                <div key={i} className="text-[11px] bg-black/20 rounded-lg px-2.5 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-white/80 truncate">{s.filename}</span>
                    <span className="text-white/40 flex-shrink-0">
                      {(s.score * 100).toFixed(0)}% match
                    </span>
                  </div>
                  <p className="text-white/40 italic mt-0.5 line-clamp-1">{s.chunk}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isUser && (
        <div className="w-6 h-6 rounded-full bg-surface border border-border flex-shrink-0 ml-2.5 mt-0.5 flex items-center justify-center">
          <svg className="w-3 h-3 text-muted" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  )
}
