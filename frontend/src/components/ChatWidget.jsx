import { useRef, useState } from 'react';
import { Bot, Send, X, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

function formatReply(text) {
  return text.split('\n').filter(Boolean).map((line, i) => {
    if (line.startsWith('•'))
      return (
        <li key={i} className="ml-4 list-disc">
          {line.slice(1).trim()}
        </li>
      );
    return <p key={i}>{line}</p>;
  });
}

export default function ChatWidget() {
  const { user } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef(null);
  const streamRef = useRef(null);

  const resetStream = () => {
    if (streamRef.current) streamRef.current.abort();
    streamRef.current = null;
  };

  const scrollBottom = () => {
    requestAnimationFrame(() => {
      if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true);
    setMessages((m) => [...m, { role: 'user', text }]);
    setMessages((m) => [...m, { role: 'bot', text: '', streaming: true }]);
    scrollBottom();

    const controller = new AbortController();
    streamRef.current = controller;

    try {
      const params = new URLSearchParams({ stream: '1' });
      const target = `${import.meta.env.VITE_API_URL || '/api'}/chat?${params}`;
      const res = await fetch(target, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('Chat request failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';
        for (const chunk of parts) {
          for (const line of chunk.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            try {
              const payload = JSON.parse(trimmed.slice(5).trim());
              if (payload.text) {
                setMessages((m) => m.map((msg, i) => (i === m.length - 1 ? { ...msg, text: msg.text + payload.text } : msg)));
                scrollBottom();
              }
              if (payload.done) {
                setMessages((m) => m.map((msg, i) => (i === m.length - 1 ? { ...msg, streaming: false } : msg)));
              }
            } catch {
              /* ignore */
            }
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setMessages((m) => m.map((msg, i) => (i === m.length - 1 ? { ...msg, text: 'Sorry, I could not reach the assistant. Please try again.', streaming: false } : msg)));
      toast.error('Assistant unavailable.');
    } finally {
      setBusy(false);
      streamRef.current = null;
      scrollBottom();
    }
  };

  const clear = () => {
    resetStream();
    setMessages([]);
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[480px] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center gap-2.5 border-b border-slate-100 bg-primary-800 px-4 py-3 text-white">
            <span className="flex size-9 items-center justify-center rounded-full bg-white/15">
              <Bot size={18} />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">DOrSU Assistant</p>
              <p className="text-[11px] text-primary-200">Enrollment help · {user?.fullName}</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button className="rounded-md p-1.5 text-primary-200 transition-colors hover:bg-white/10 hover:text-white" onClick={clear} title="Clear conversation">
                <Sparkles size={15} />
              </button>
              <button className="rounded-md p-1.5 text-primary-200 transition-colors hover:bg-white/10 hover:text-white" onClick={() => setOpen(false)} title="Close">
                <X size={17} />
              </button>
            </div>
          </div>

          <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
            {messages.length === 0 && (
              <div className="rounded-2xl rounded-tl-sm bg-white p-3 text-sm text-slate-500 shadow-sm">
                Hello, {user?.fullName.split(' ')[0]}! Ask me about enrollment steps, clearance, grades, the Student Profile
                Form, fees, or upcoming activities.
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' ? 'rounded-br-sm bg-primary-700 text-white' : 'rounded-tl-sm bg-white text-slate-700'
                  }`}
                >
                  <div className="space-y-1">{formatReply(msg.text)}</div>
                  {msg.streaming && <span className="inline-block h-3 w-1 animate-pulse bg-primary-400 align-middle" />}
                </div>
              </div>
            ))}
          </div>

          <form
            className="flex items-center gap-2 border-t border-slate-100 bg-white p-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              className="input flex-1 !rounded-full !border-slate-200 !px-3.5"
              placeholder="Ask about enrollment, clearance, grades…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
            />
            <button type="submit" disabled={busy || !input.trim()} className="btn-primary flex size-9 shrink-0 items-center justify-center rounded-full !p-0" aria-label="Send">
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      <button
        className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-primary-700 text-white shadow-xl transition-transform hover:scale-105"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle assistant"
      >
        {open ? <X size={22} /> : <Bot size={24} />}
      </button>
    </>
  );
}