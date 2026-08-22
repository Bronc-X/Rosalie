'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import {
  SCHEDULE_ADDED_BY_MAX_LENGTH,
  SCHEDULE_CONTENT_MAX_LENGTH,
  SCHEDULE_LOCATION_MAX_LENGTH,
  sortScheduleEntries,
} from '@/lib/schedule.mjs';
import type { ScheduleEntry } from '@/lib/schedule.mjs';

type Draft = {
  scheduledAt: string;
  content: string;
  location: string;
  addedBy: string;
};

const EMPTY_DRAFT: Draft = { scheduledAt: '', content: '', location: '', addedBy: '' };

async function fetchEntries() {
  const response = await fetch('/api/schedule', { cache: 'no-store' });
  const data = await response.json() as { ok?: boolean; entries?: ScheduleEntry[]; error?: string };
  if (!response.ok || !data.ok || !Array.isArray(data.entries)) throw new Error(data.error ?? 'load failed');
  return data.entries;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function ScheduleBoard() {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [feedback, setFeedback] = useState('四项都会对所有访问者公开。');

  async function loadEntries() {
    setLoadState('loading');
    try {
      setEntries(await fetchEntries());
      setLoadState('loaded');
    } catch {
      setLoadState('error');
    }
  }

  useEffect(() => {
    let current = true;
    void fetchEntries()
      .then((nextEntries) => {
        if (!current) return;
        setEntries(nextEntries);
        setLoadState('loaded');
      })
      .catch(() => {
        if (current) setLoadState('error');
      });
    return () => { current = false; };
  }, []);

  function updateDraft(field: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    if (sendState !== 'idle') setSendState('idle');
    setFeedback('四项都会对所有访问者公开。');
  }

  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendState === 'sending' || Object.values(draft).some((value) => !value.trim())) return;
    setSendState('sending');
    setFeedback('正在写进共享日程。');

    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await response.json() as { ok?: boolean; entry?: ScheduleEntry; error?: string };
      if (!response.ok || !data.ok || !data.entry) throw new Error(data.error ?? 'send failed');
      setEntries((current) => sortScheduleEntries([...current, data.entry as ScheduleEntry]));
      setDraft(EMPTY_DRAFT);
      setSendState('sent');
      setFeedback('已经公开，所有人刷新后都能看到。');
    } catch (error) {
      setSendState('error');
      setFeedback(error instanceof Error && /最多|不能为空|请选择|添加人/.test(error.message)
        ? error.message
        : '没写进去，请再试一次。');
    }
  }

  return (
    <main className="schedule-page">
      <div className="schedule-aurora" aria-hidden="true" />
      <header className="schedule-header liquid-glass">
        <Link href="/play">← 游戏</Link>
        <div>
          <p>SHARED · BEIJING TIME</p>
          <h1>日程板</h1>
          <span>{entries.length} 项公开日程</span>
        </div>
        <Link href="/treehole">树洞 ↗</Link>
      </header>

      <div className="schedule-shell">
        <section className="schedule-compose liquid-glass" aria-labelledby="schedule-compose-title">
          <div className="schedule-motif-orbit" aria-hidden="true">
            <i className="motif-star" /><i className="motif-heart" /><i className="motif-moon" />
            <i className="motif-leaf" /><i className="motif-bow" /><i className="motif-pearl" />
          </div>
          <p className="schedule-eyebrow">ADD ONE THING</p>
          <h2 id="schedule-compose-title">把事情放进来</h2>
          <form onSubmit={addEntry}>
            <label>
              <span>日程时间 · 北京时间</span>
              <input
                type="datetime-local"
                value={draft.scheduledAt}
                min="2020-01-01T00:00"
                max="2100-12-31T23:59"
                onChange={(event) => updateDraft('scheduledAt', event.target.value)}
                required
              />
            </label>
            <label>
              <span>日程内容</span>
              <input
                type="text"
                value={draft.content}
                maxLength={SCHEDULE_CONTENT_MAX_LENGTH}
                placeholder="写清楚要做什么"
                onChange={(event) => updateDraft('content', event.target.value)}
                required
              />
            </label>
            <label>
              <span>地点</span>
              <input
                type="text"
                value={draft.location}
                maxLength={SCHEDULE_LOCATION_MAX_LENGTH}
                placeholder="线上也算地点"
                onChange={(event) => updateDraft('location', event.target.value)}
                required
              />
            </label>
            <label>
              <span>添加人</span>
              <input
                type="text"
                value={draft.addedBy}
                maxLength={SCHEDULE_ADDED_BY_MAX_LENGTH}
                placeholder="所有人会看到这个名字"
                onChange={(event) => updateDraft('addedBy', event.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={sendState === 'sending' || Object.values(draft).some((value) => !value.trim())}>
              <span>{sendState === 'sending' ? '正在添加' : '添加到共享日程'}</span>
              <b aria-hidden="true">＋</b>
            </button>
          </form>
          <p className={`schedule-feedback is-${sendState}`} aria-live="polite">{feedback}</p>
        </section>

        <section className="schedule-timeline" aria-labelledby="schedule-list-title">
          <div className="schedule-list-heading">
            <div>
              <p className="schedule-eyebrow">VISIBLE TO EVERYONE</p>
              <h2 id="schedule-list-title">接下来的事</h2>
            </div>
            <button type="button" onClick={() => void loadEntries()} disabled={loadState === 'loading'}>
              {loadState === 'loading' ? '读取中' : '刷新'}
            </button>
          </div>

          {loadState === 'error' ? (
            <div className="schedule-state" role="status"><i>…</i><p>日程板暂时没接上。</p><button type="button" onClick={() => void loadEntries()}>再试一次</button></div>
          ) : loadState === 'loading' && entries.length === 0 ? (
            <div className="schedule-state" role="status"><i>○</i><p>正在读取共享日程。</p></div>
          ) : entries.length === 0 ? (
            <div className="schedule-state" role="status"><i>＋</i><p>第一项还没被写下。</p></div>
          ) : (
            <ol className="schedule-list">
              {entries.map((entry, index) => (
                  <li key={entry.id} style={{ '--entry-index': index, '--motif-index': index % 6 } as React.CSSProperties}>
                    <div className="schedule-date">
                      <time dateTime={entry.scheduledAt}>{formatDate(entry.scheduledAt)}</time>
                      <strong>{formatTime(entry.scheduledAt)}</strong>
                    </div>
                    <div className="schedule-entry-copy">
                      <h3>{entry.content}</h3>
                      <p><span aria-hidden="true">⌖</span>{entry.location}</p>
                    </div>
                    <div className="schedule-author"><span>ADDED BY</span><strong>{entry.addedBy}</strong></div>
                    <i className="schedule-card-motif" aria-hidden="true" />
                  </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
