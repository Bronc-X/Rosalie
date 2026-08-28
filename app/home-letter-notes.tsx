'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowClockwise,
  ChatCircleText,
  NotePencil,
  PaperPlaneTilt,
  X,
} from '@phosphor-icons/react';

import { gsap, useGSAP } from '@/lib/gsap-client';

type HomeReply = {
  id: string;
  text: string;
  createdAt: string;
};

type HomeNote = {
  id: string;
  text: string;
  createdAt: string;
  replies: HomeReply[];
};

const BEIJING_TIME = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function responseMessage(status: number) {
  if (status === 401) return '暗号失效，请重新进入。';
  if (status === 429) return '先停一下，过会儿再写。';
  if (status === 413) return '这段话有点长。';
  return '暂时没有写进去，再试一次。';
}

export function HomeLetterNotes({ initiallyOpen = true }: { initiallyOpen?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(initiallyOpen);
  const [notes, setNotes] = useState<HomeNote[]>([]);
  const [loading, setLoading] = useState(initiallyOpen);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [replySending, setReplySending] = useState(false);

  useGSAP(() => {
    const layer = layerRef.current;
    if (!open || !layer) return undefined;
    const motion = gsap.matchMedia();
    motion.add('(prefers-reduced-motion: no-preference)', () => {
      const timeline = gsap.timeline({ defaults: { ease: 'expo.out' } });
      timeline
        .fromTo(layer.querySelector('.letter-notes-scrim'), { autoAlpha: 0 }, { autoAlpha: 1, duration: .2 })
        .fromTo(layer.querySelector('.letter-notes-sheet'), { yPercent: 104 }, { yPercent: 0, duration: .46 }, 0)
        .fromTo(layer.querySelectorAll('.letter-notes-heading, .letter-note-composer'), { autoAlpha: 0, y: 12 }, {
          autoAlpha: 1,
          y: 0,
          duration: .32,
          stagger: .045,
          ease: 'power3.out',
        }, .16);
    });
    const focusTimer = window.setTimeout(() => composerRef.current?.focus(), 420);
    return () => {
      window.clearTimeout(focusTimer);
      motion.revert();
    };
  }, { dependencies: [open] });

  useEffect(() => {
    if (!initiallyOpen) return;
    let cancelled = false;
    fetch('/api/home-notes', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(responseMessage(response.status));
        return response.json() as Promise<{ notes?: HomeNote[] }>;
      })
      .then((result) => {
        if (cancelled) return;
        setNotes(Array.isArray(result.notes) ? result.notes : []);
        setLoaded(true);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '暂时读不到旁注。');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [initiallyOpen]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSheet();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function openSheet() {
    setOpen(true);
    if (!loaded && !loading) void loadNotes();
  }

  function closeSheet() {
    const layer = layerRef.current;
    if (!layer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOpen(false);
      return;
    }
    gsap.timeline({ onComplete: () => setOpen(false) })
      .to(layer.querySelector('.letter-notes-sheet'), { yPercent: 104, duration: .28, ease: 'power3.in' })
      .to(layer.querySelector('.letter-notes-scrim'), { autoAlpha: 0, duration: .18, ease: 'power2.out' }, '<.06');
  }

  async function loadNotes() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/home-notes', { cache: 'no-store' });
      if (!response.ok) throw new Error(responseMessage(response.status));
      const result = await response.json() as { notes?: HomeNote[] };
      setNotes(Array.isArray(result.notes) ? result.notes : []);
      setLoaded(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '暂时读不到旁注。');
    } finally {
      setLoading(false);
    }
  }

  async function submitNote() {
    if (sending || !draft.trim()) return;
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/home-notes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ note: draft }),
      });
      const result = await response.json() as { note?: HomeNote; error?: string };
      if (!response.ok || !result.note) throw new Error(result.error || responseMessage(response.status));
      setNotes((current) => [result.note!, ...current]);
      setDraft('');
      requestAnimationFrame(() => {
        const card = layerRef.current?.querySelector('.letter-note-card');
        if (card && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          gsap.fromTo(card, { autoAlpha: 0, y: 14, scale: .98 }, {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: .42,
            ease: 'power3.out',
          });
        }
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '暂时没有写进去。');
    } finally {
      setSending(false);
    }
  }

  async function submitReply(noteId: string) {
    if (replySending || !replyDraft.trim()) return;
    setReplySending(true);
    setError('');
    try {
      const response = await fetch('/api/home-notes/replies', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ noteId, reply: replyDraft }),
      });
      const result = await response.json() as { noteId?: string; reply?: HomeReply; error?: string };
      if (!response.ok || !result.noteId || !result.reply) {
        throw new Error(result.error || responseMessage(response.status));
      }
      setNotes((current) => current.map((note) => note.id === result.noteId
        ? { ...note, replies: [...note.replies, result.reply!] }
        : note));
      setReplyDraft('');
      setReplyingTo(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '暂时没有回复进去。');
    } finally {
      setReplySending(false);
    }
  }

  return (
    <div className="home-letter-notes" ref={rootRef}>
      <button type="button" className="letter-discussion-bar" onClick={openSheet} aria-haspopup="dialog">
        <span className="letter-discussion-icon" aria-hidden="true"><NotePencil weight="regular" /></span>
        <span><strong>写旁注</strong><small>也可以回复</small></span>
        <b>{loaded ? notes.length : '打开'}</b>
      </button>

      {open ? createPortal(
        <div className="letter-notes-layer" role="presentation" ref={layerRef}>
          <button type="button" className="letter-notes-scrim" onClick={closeSheet} aria-label="关闭旁注" />
          <section className="letter-notes-sheet" role="dialog" aria-modal="true" aria-labelledby="letter-notes-title">
            <div className="letter-sheet-handle" aria-hidden="true" />
            <header className="letter-notes-heading">
              <div>
                <span>LETTER NOTES</span>
                <h2 id="letter-notes-title">旁注</h2>
              </div>
              <button type="button" onClick={closeSheet} aria-label="关闭"><X weight="regular" /></button>
            </header>

            <div className="letter-note-composer">
              <label htmlFor="home-note">写下一句</label>
              <textarea
                id="home-note"
                ref={composerRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={160}
                rows={3}
                placeholder="写在这封信旁边"
              />
              <div>
                <span>{Array.from(draft).length}/160</span>
                <button type="button" disabled={sending || !draft.trim()} onClick={() => void submitNote()}>
                  <PaperPlaneTilt weight="fill" aria-hidden="true" />
                  {sending ? '正在写入' : '写下'}
                </button>
              </div>
            </div>

            <div className="letter-note-feed" aria-live="polite">
              {error ? (
                <div className="letter-note-state is-error">
                  <span>{error}</span>
                  <button type="button" onClick={() => void loadNotes()}><ArrowClockwise />重试</button>
                </div>
              ) : null}
              {loading ? <p className="letter-note-state">正在翻开旁注</p> : null}
              {!loading && loaded && notes.length === 0 ? <p className="letter-note-state">这里还没有字。</p> : null}
              <ul className="letter-note-list">
                {notes.map((note) => (
                  <li className="letter-note-card" key={note.id}>
                    <div className="letter-note-meta">
                      <span>访客</span>
                      <time dateTime={note.createdAt}>{BEIJING_TIME.format(new Date(note.createdAt))}</time>
                    </div>
                    <p>{note.text}</p>
                    {note.replies.length ? (
                      <ul className="letter-reply-list">
                        {note.replies.map((reply) => (
                          <li key={reply.id}>
                            <span>回复</span>
                            <p>{reply.text}</p>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {replyingTo === note.id ? (
                      <div className="letter-reply-form">
                        <textarea
                          value={replyDraft}
                          onChange={(event) => setReplyDraft(event.target.value)}
                          maxLength={100}
                          rows={2}
                          aria-label="回复内容"
                          placeholder="回复这句旁注"
                        />
                        <div>
                          <button type="button" onClick={() => { setReplyingTo(null); setReplyDraft(''); }}>取消</button>
                          <button type="button" disabled={replySending || !replyDraft.trim()} onClick={() => void submitReply(note.id)}>
                            {replySending ? '发送中' : '回复'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="letter-note-reply-trigger"
                        onClick={() => { setReplyingTo(note.id); setReplyDraft(''); }}
                      >
                        <ChatCircleText weight="regular" aria-hidden="true" />
                        回复{note.replies.length ? ` ${note.replies.length}` : ''}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
