/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';

export function UnlockForm({ nextPath }: { nextPath: string }) {
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password || status === 'loading') return;
    setStatus('loading');

    try {
      const response = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        setStatus('error');
        setPassword('');
        return;
      }
      window.location.assign(nextPath);
    } catch {
      setStatus('error');
    }
  }

  return (
    <main className="unlock-page">
      <div className="unlock-aurora" aria-hidden="true" />
      <section className={`unlock-card unlock-${status}`} aria-labelledby="unlock-title">
        <div className="unlock-keyhole" aria-hidden="true">
          <span />
          <img src="/soft-pull-controller.webp" alt="" />
        </div>
        <h1 id="unlock-title">先测健康度</h1>

        <form onSubmit={unlock}>
          <label htmlFor="site-password">暗号</label>
          <div className="unlock-input-wrap">
            <input
              id="site-password"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              placeholder=" "
              maxLength={16}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (status === 'error') setStatus('idle');
              }}
              aria-describedby="unlock-feedback"
              autoFocus
            />
            <i aria-hidden="true">••••</i>
          </div>
          <button type="submit" disabled={!password || status === 'loading'}>
            <span>{status === 'loading' ? '检测中' : '确认'}</span>
            <b aria-hidden="true">→</b>
          </button>
        </form>

        <p id="unlock-feedback" className="unlock-feedback" aria-live="polite">
          {status === 'error' ? '未通过。' : ''}
        </p>
      </section>
    </main>
  );
}
