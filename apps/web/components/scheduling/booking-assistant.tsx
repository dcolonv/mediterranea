'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { sendAgentMessage } from '@/actions/agent';
import type { AgentMessage } from '@/lib/agent/booking-agent';

interface ChatMessage extends AgentMessage {
  /** Tools the assistant ran to produce this reply. */
  actions?: string[];
  /** Marks an error bubble. */
  error?: boolean;
}

const SUGGESTIONS = [
  'What’s open tomorrow for a Deep Cleansing Facial?',
  'Book Ana García, ana@example.com, +34 600 000 000, for a facial on Friday morning.',
  'Move my 3pm appointment today to 4pm.',
];

interface BookingAssistantProps {
  onClose: () => void;
  /** Called when the assistant creates / updates / deletes an appointment. */
  onMutated: () => void;
}

export function BookingAssistant({ onClose, onMutated }: BookingAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;

    const history: AgentMessage[] = messages
      .filter((m) => !m.error)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setInput('');
    setSending(true);

    const res = await sendAgentMessage({ message, history });

    if (res.success) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.reply || '(no reply)', actions: res.actions },
      ]);
      if (res.mutated) onMutated();
    } else {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.error || 'Something went wrong.', error: true },
      ]);
    }
    setSending(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex h-full w-full max-w-md flex-col border-l border-white-10 bg-dark-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white-10 p-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-px w-6 bg-gold" />
              <span className="text-[10px] tracking-[0.3em] text-gold uppercase">Assistant</span>
            </div>
            <h2 className="mt-1 font-serif text-xl text-white">Booking assistant</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white-50 transition-colors hover:text-white"
            aria-label="Close assistant"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-white-50">
                Ask me to check availability, book, reschedule, or cancel appointments. I book against the
                live calendar, so I can’t double-book.
              </p>
              <div className="space-y-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full border border-white-10 p-3 text-left text-sm text-white-70 transition-colors hover:border-white-30 hover:text-white"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={`max-w-[85%] px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-gold/15 text-white border border-gold/30'
                      : m.error
                        ? 'bg-red-500/10 text-red-300 border border-red-500/30'
                        : 'bg-dark-800 text-white-90 border border-white-10'
                  }`}
                >
                  {m.content}
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 border-t border-white-10 pt-2">
                      {m.actions.map((a, j) => (
                        <span
                          key={j}
                          className="bg-white-10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white-50"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="border border-white-10 bg-dark-800 px-4 py-2.5 text-sm text-white-50">
                Thinking…
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-white-10 p-4"
        >
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={2}
              placeholder="Message the assistant…"
              disabled={sending}
              className="flex-1 resize-none border border-white-10 bg-dark-800 px-3 py-2 text-sm text-white placeholder:text-white-30 focus:border-gold focus:outline-none disabled:opacity-50"
            />
            <Button type="submit" variant="elegant" size="sm" disabled={sending || !input.trim()}>
              Send
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
