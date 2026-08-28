/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, LockKeyOpen } from '@phosphor-icons/react';

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
      <div className="unlock-backdrop" aria-hidden="true">
        <span /><span />
      </div>
      <section className={`unlock-card unlock-${status}`} aria-labelledby="unlock-title">
        <div className="unlock-mark" aria-hidden="true">
          <span className="unlock-mark-ring" />
          <img src="/soft-pull-controller.webp" alt="" width="76" height="76" />
        </div>
        <h1 id="unlock-title">暗号</h1>

        <form onSubmit={unlock} aria-busy={status === 'loading'}>
          <label htmlFor="site-password">输入暗号</label>
          <div className="unlock-input-wrap">
            <LockKeyOpen aria-hidden="true" />
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
              aria-invalid={status === 'error'}
              autoFocus
            />
          </div>
          <button type="submit" disabled={!password || status === 'loading'}>
            <span>{status === 'loading' ? '验证中' : '确认'}</span>
            {status === 'loading' ? <i className="unlock-progress" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
          </button>
        </form>

        <p id="unlock-feedback" className="unlock-feedback" aria-live="polite">
          {status === 'error' ? '暗号不对' : ''}
        </p>
      </section>
    </main>
  );
}
