/* eslint-disable @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { TREEHOLE_MAX_LENGTH } from '@/lib/treehole.mjs';

type Message = { id: string; text: string; createdAt: string };

async function fetchMessages() {
  const response = await fetch('/api/treehole', { cache: 'no-store' });
  const data = await response.json() as { ok?: boolean; messages?: Message[] };
  if (!response.ok || !data.ok || !Array.isArray(data.messages)) throw new Error('load failed');
  return data.messages;
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
  const [feedback, setFeedback] = useState('匿名留言。');

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
    setFeedback('正在发送。');

    try {
      const response = await fetch('/api/treehole', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: draft }),
      });
      const data = await response.json() as { ok?: boolean; message?: Message; error?: string };
      if (!response.ok || !data.ok || !data.message) throw new Error(data.error ?? 'send failed');
      setMessages((current) => [data.message as Message, ...current]);
      setDraft('');
      setSendState('sent');
      setFeedback('已留言。');
    } catch {
      setSendState('error');
      setFeedback('发送失败，请重试。');
    }
  }

  return (
    <main className="treehole-page">
      <div className="treehole-glow" aria-hidden="true" />
      <header className="treehole-header">
        <Link href="/play">← 回实验室</Link>
        <div>
          <p>ANONYMOUS · NO KPI</p>
          <h1>树洞留言板</h1>
          <span>不署名，也不催回复。</span>
        </div>
        <Link href="/schedule">日程板 ↗</Link>
      </header>

      <section className="treehole-compose" aria-labelledby="treehole-compose-title">
        <div className="tree-rings" aria-hidden="true">
          <i /><i /><i /><i />
          <img src="/soft-pull-controller.webp" alt="" />
        </div>
        <div className="treehole-form-wrap">
          <p>DROP A SECRET</p>
          <h2 id="treehole-compose-title">把一句话丢进去</h2>
          <form onSubmit={leaveMessage}>
            <textarea
              value={draft}
              maxLength={TREEHOLE_MAX_LENGTH}
              placeholder="写点什么。"
              onChange={(event) => {
                setDraft(event.target.value);
                if (sendState !== 'idle') setSendState('idle');
              }}
              aria-describedby="treehole-feedback"
            />
            <div className="treehole-form-bottom">
              <span>{Array.from(draft).length} / {TREEHOLE_MAX_LENGTH}</span>
              <button type="submit" disabled={!draft.trim() || sendState === 'sending'}>
                {sendState === 'sending' ? '正在掉落' : '扔进树洞'}
                <i aria-hidden="true">↘</i>
              </button>
            </div>
          </form>
          <p id="treehole-feedback" className={`treehole-feedback feedback-${sendState}`} aria-live="polite">{feedback}</p>
        </div>
      </section>

      <section className="treehole-messages" aria-labelledby="treehole-messages-title">
        <div className="treehole-list-heading">
          <p>INSIDE THE TREE</p>
          <h2 id="treehole-messages-title">最近掉进去的</h2>
          <button type="button" onClick={() => void loadMessages()} disabled={loadState === 'loading'}>
            {loadState === 'loading' ? '加载中' : '刷新'}
          </button>
        </div>

        {loadState === 'error' ? (
          <div className="treehole-empty" role="status">
            <span>…</span>
            <p>树洞暂时没接上。</p>
            <button type="button" onClick={() => void loadMessages()}>再试一次</button>
          </div>
        ) : loadState === 'loading' && messages.length === 0 ? (
          <div className="treehole-empty" role="status"><span>○</span><p>加载中。</p></div>
        ) : messages.length === 0 ? (
          <div className="treehole-empty" role="status"><span>○</span><p>暂无留言。</p></div>
        ) : (
          <ol className="message-list">
            {messages.map((message, index) => (
              <li key={message.id} style={{ '--message-index': index } as React.CSSProperties}>
                <span className="message-number">{String(index + 1).padStart(2, '0')}</span>
                <p>{message.text}</p>
                <time dateTime={message.createdAt}>{formatBeijingTime(message.createdAt)}</time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
