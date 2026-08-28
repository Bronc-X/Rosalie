'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowClockwise,
  ChatCircleText,
  PaperPlaneTilt,
  PencilSimpleLine,
  WarningCircle,
} from '@phosphor-icons/react';

import { TREEHOLE_MAX_LENGTH, TREEHOLE_REPLY_MAX_LENGTH } from '@/lib/treehole.mjs';

type Reply = { id: string; text: string; createdAt: string };
type Message = { id: string; text: string; createdAt: string; replies: Reply[] };

async function fetchMessages() {
  const response = await fetch('/api/treehole', { cache: 'no-store' });
  const data = await response.json() as { ok?: boolean; messages?: Message[] };
  if (!response.ok || !data.ok || !Array.isArray(data.messages)) throw new Error('load failed');
  return data.messages.map((message) => ({ ...message, replies: message.replies ?? [] }));
}

function formatBeijingTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function TreeholeBoard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [replyState, setReplyState] = useState<'idle' | 'sending' | 'error'>('idle');
  const [replyFeedback, setReplyFeedback] = useState('');

  async function loadMessages() {
    setLoadState('loading');
    try {
      setMessages(await fetchMessages());
      setLoadState('loaded');
    } catch {
      setLoadState('error');
    }
  }

  useEffect(() => {
    let isCurrent = true;
    void fetchMessages()
      .then((nextMessages) => {
        if (!isCurrent) return;
        setMessages(nextMessages);
        setLoadState('loaded');
      })
      .catch(() => {
        if (isCurrent) setLoadState('error');
      });
    return () => { isCurrent = false; };
  }, []);

  async function leaveMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim() || sendState === 'sending') return;
    setSendState('sending');
    setFeedback('发送中');

    try {
      const response = await fetch('/api/treehole', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: draft }),
      });
      const data = await response.json() as { ok?: boolean; message?: Message; error?: string };
      if (!response.ok || !data.ok || !data.message) throw new Error(data.error ?? 'send failed');
      setMessages((current) => [{ ...data.message as Message, replies: data.message?.replies ?? [] }, ...current]);
      setDraft('');
      setSendState('sent');
      setFeedback('已发布');
    } catch {
      setSendState('error');
      setFeedback('发送失败，请重试');
    }
  }

  function openReply(messageId: string) {
    setReplyingTo(messageId);
    setReplyDraft('');
    setReplyState('idle');
    setReplyFeedback('');
  }

  async function leaveReply(event: FormEvent<HTMLFormElement>, messageId: string) {
    event.preventDefault();
    if (!replyDraft.trim() || replyState === 'sending') return;
    setReplyState('sending');
    setReplyFeedback('发送中');

    try {
      const response = await fetch('/api/treehole/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, reply: replyDraft }),
      });
      const data = await response.json() as { ok?: boolean; reply?: Reply; error?: string };
      if (!response.ok || !data.ok || !data.reply) throw new Error(data.error ?? 'reply failed');
      setMessages((current) => current.map((message) => (
        message.id === messageId
          ? { ...message, replies: [...message.replies, data.reply as Reply] }
          : message
      )));
      setReplyDraft('');
      setReplyState('idle');
      setReplyFeedback('');
      setReplyingTo(null);
    } catch {
      setReplyState('error');
      setReplyFeedback('回复失败，请重试');
    }
  }

  return (
    <main className="treehole-page">
      <div className="treehole-backdrop" aria-hidden="true">
        <span /><span />
      </div>
      <header className="treehole-header">
        <div>
          <h1>留言</h1>
          {loadState === 'loaded' && <p>{messages.length} 条</p>}
        </div>
      </header>

      <section className="treehole-compose" aria-labelledby="treehole-compose-title">
        <div className="treehole-form-wrap">
          <div className="treehole-compose-heading">
            <span className="treehole-compose-mark" aria-hidden="true">
              <PencilSimpleLine weight="regular" />
            </span>
            <h2 id="treehole-compose-title">写留言</h2>
          </div>
          <form onSubmit={leaveMessage}>
            <textarea
              value={draft}
              maxLength={TREEHOLE_MAX_LENGTH}
              placeholder="写下留言"
              onChange={(event) => {
                setDraft(event.target.value);
                if (sendState !== 'idle') {
                  setSendState('idle');
                  setFeedback('');
                }
              }}
              aria-describedby="treehole-feedback"
            />
            <div className="treehole-form-bottom">
              <span>{Array.from(draft).length} / {TREEHOLE_MAX_LENGTH}</span>
              <button type="submit" disabled={!draft.trim() || sendState === 'sending'}>
                <PaperPlaneTilt aria-hidden="true" weight="fill" />
                <span>{sendState === 'sending' ? '发送中' : '发布'}</span>
              </button>
            </div>
          </form>
          <p id="treehole-feedback" className={`treehole-feedback feedback-${sendState}`} aria-live="polite">{feedback}</p>
        </div>
      </section>

      <section className="treehole-messages" aria-labelledby="treehole-messages-title">
        <div className="treehole-list-heading">
          <h2 id="treehole-messages-title">全部留言</h2>
          <button type="button" onClick={() => void loadMessages()} disabled={loadState === 'loading'} aria-label="刷新留言">
            <ArrowClockwise aria-hidden="true" className={loadState === 'loading' ? 'is-spinning' : ''} />
            <span>{loadState === 'loading' ? '读取中' : '刷新'}</span>
          </button>
        </div>

        {loadState === 'error' ? (
          <div className="treehole-empty" role="status">
            <WarningCircle aria-hidden="true" />
            <p>暂时无法读取留言</p>
            <button type="button" onClick={() => void loadMessages()}>重试</button>
          </div>
        ) : loadState === 'loading' && messages.length === 0 ? (
          <div className="treehole-loading" role="status" aria-label="正在读取留言">
            <i /><i /><i />
          </div>
        ) : messages.length === 0 ? (
          <div className="treehole-empty" role="status">
            <ChatCircleText aria-hidden="true" />
            <p>还没有留言</p>
          </div>
        ) : (
          <ol className="message-list">
            {messages.map((message, index) => (
              <li className="message-card" key={message.id}>
                <div className="message-meta">
                  <span>{String(messages.length - index).padStart(2, '0')}</span>
                  <time dateTime={message.createdAt}>{formatBeijingTime(message.createdAt)}</time>
                </div>
                <p className="message-text">{message.text}</p>

                {message.replies.length > 0 && (
                  <ol className="reply-list" aria-label="回复">
                    {message.replies.map((reply) => (
                      <li key={reply.id}>
                        <ChatCircleText aria-hidden="true" />
                        <div>
                          <p>{reply.text}</p>
                          <time dateTime={reply.createdAt}>{formatBeijingTime(reply.createdAt)}</time>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}

                {replyingTo === message.id ? (
                  <form className="reply-form" onSubmit={(event) => void leaveReply(event, message.id)}>
                    <label htmlFor={`reply-${message.id}`}>回复这条留言</label>
                    <textarea
                      id={`reply-${message.id}`}
                      value={replyDraft}
                      maxLength={TREEHOLE_REPLY_MAX_LENGTH}
                      autoFocus
                      placeholder="写回复"
                      onChange={(event) => {
                        setReplyDraft(event.target.value);
                        if (replyState === 'error') setReplyState('idle');
                      }}
                    />
                    <div className="reply-form-actions">
                      <span>{Array.from(replyDraft).length} / {TREEHOLE_REPLY_MAX_LENGTH}</span>
                      <button type="button" className="reply-cancel" onClick={() => setReplyingTo(null)}>取消</button>
                      <button type="submit" disabled={!replyDraft.trim() || replyState === 'sending'}>
                        {replyState === 'sending' ? '发送中' : '发送'}
                      </button>
                    </div>
                    {replyFeedback && <p className="reply-feedback" role="status">{replyFeedback}</p>}
                  </form>
                ) : (
                  <button className="reply-trigger" type="button" onClick={() => openReply(message.id)}>
                    <ChatCircleText aria-hidden="true" />
                    <span>回复{message.replies.length > 0 ? ` ${message.replies.length}` : ''}</span>
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
