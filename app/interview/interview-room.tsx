'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';

import {
  INTERVIEW_COMPANY_MAX_LENGTH,
  INTERVIEW_EXPERIENCE_LEVELS,
  INTERVIEW_MESSAGE_MAX_LENGTH,
  INTERVIEW_ROLES,
  mergeInterviewRecords,
  normalizeInterviewRecord,
  parseInterviewEventFrame,
} from '@/lib/interview.mjs';
import type {
  InterviewAction,
  InterviewExperienceId,
  InterviewJobEvent,
  InterviewMessage,
  InterviewProfile,
  InterviewRecord,
  InterviewRoleId,
} from '@/lib/interview.mjs';

const LEGACY_STORAGE_KEY = 'rosalie-interview-session-v1';
const HISTORY_STORAGE_KEY = 'rosalie-interview-history-v1';
const ACTIVE_STORAGE_KEY = 'rosalie-interview-active-v1';
const MAX_QUESTIONS = 8;

type Stage = 'setup' | 'interview' | 'review';
type RequestState = 'idle' | 'waiting';
type VoiceState = 'idle' | 'listening' | 'processing';

type LegacySession = {
  stage: Stage;
  profile: InterviewProfile;
  messages: InterviewMessage[];
  review: string;
};

type BrowserSpeechResult = {
  isFinal: boolean;
  0?: { transcript?: string };
};

type BrowserSpeechEvent = {
  resultIndex: number;
  results: { length: number; [index: number]: BrowserSpeechResult };
};

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: BrowserSpeechEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;
type SpeechWindow = Window & {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
};

const DEFAULT_PROFILE: InterviewProfile = {
  company: '科技公司',
  role: 'community',
  experience: 'junior',
};

function createSessionId() {
  const token = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replaceAll('-', '')
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `iv_${token}`;
}

function readLocalHistory() {
  try {
    return mergeInterviewRecords(JSON.parse(window.localStorage.getItem(HISTORY_STORAGE_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

function writeLocalHistory(records: InterviewRecord[]) {
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // The live in-memory session remains available when storage is full or blocked.
  }
}

function readLegacySession(value: string | null): InterviewRecord | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<LegacySession>;
    if (parsed.stage !== 'interview' && parsed.stage !== 'review') return null;
    const now = new Date().toISOString();
    const normalized = normalizeInterviewRecord({
      id: createSessionId(),
      stage: parsed.stage,
      profile: parsed.profile,
      messages: parsed.messages,
      review: parsed.review ?? '',
      createdAt: now,
      updatedAt: now,
    });
    return normalized.ok ? normalized.value : null;
  } catch {
    return null;
  }
}

function friendlyError(code?: string) {
  if (code === 'RATE_LIMITED') return '问得有点密，等一分钟再继续。';
  if (code === 'LOCKED') return '暗号状态失效，请重新进入。';
  if (code === 'INVALID_HISTORY' || code === 'ANSWER_REQUIRED') return '这段会话没有接上，请重新开始。';
  if (code === 'REQUEST_ABORTED') return '已停止，这次的内容还在。';
  return '面试官暂时没接通，你的回答还在，可以重试。';
}

function roleLabel(role: InterviewRoleId) {
  return INTERVIEW_ROLES.find((item) => item.id === role)?.label ?? role;
}

function experienceLabel(experience: InterviewExperienceId) {
  return INTERVIEW_EXPERIENCE_LEVELS.find((item) => item.id === experience)?.label ?? experience;
}

function progressLabel(event: InterviewJobEvent) {
  const name = typeof event.name === 'string' ? event.name : '';
  if (event.type === 'job.started') return '已接收';
  if (event.type === 'step.started') return typeof event.title === 'string' ? event.title : '继续处理';
  if (event.type === 'tool.started' && name === 'prepare_context') return '整理对话';
  if (event.type === 'tool.completed' && name === 'prepare_context') return '对话已整理';
  if (event.type === 'tool.started' && name === 'call_interviewer') return '连接面试官';
  if (event.type === 'tool.completed' && name === 'call_interviewer') return '回答已生成';
  if (event.type === 'tool.started' && name === 'call_fallback_interviewer') return '切换备用模型';
  if (event.type === 'tool.completed' && name === 'call_fallback_interviewer') return '备用模型已回应';
  if (event.type === 'tool.started' && name === 'save_record') return '保存记录';
  if (event.type === 'tool.completed' && name === 'save_record') return '记录已保存';
  if (event.type === 'artifact.created') return '内容已保存';
  if (event.type === 'job.completed') return '完成';
  if (event.type === 'step.failed' && event.error === 'HISTORY_UNAVAILABLE') return '云端未保存，本机仍保留';
  if (event.type === 'step.failed') return '生成中断';
  return '正在处理';
}

function InterviewerMark({ active = false }: { active?: boolean }) {
  return (
    <span className={`interviewer-mark${active ? ' is-active' : ''}`} aria-hidden="true">
      <i /><i /><i />
      <b><span /><span /><span /></b>
    </span>
  );
}

function ProgressWorkspace({
  events,
  draft,
  elapsed,
}: {
  events: InterviewJobEvent[];
  draft: string;
  elapsed: number;
}) {
  const visibleEvents = events
    .filter((event) => event.type !== 'artifact.patch')
    .slice(-5);

  return (
    <section className="interview-progress" aria-live="polite" aria-label="面试生成进度">
      <div className="interview-progress-head">
        <InterviewerMark active />
        <div><span>进度</span><b>正在处理</b></div>
        <time>{elapsed}s</time>
      </div>
      <div className="interview-progress-pulse" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      <ol>
        {(visibleEvents.length ? visibleEvents : [{ type: 'job.started', jobId: 'pending', at: '' } as InterviewJobEvent]).map((event, index) => {
          const failed = event.type === 'step.failed';
          const done = event.type === 'tool.completed' || event.type === 'artifact.created' || event.type === 'job.completed';
          return (
            <li className={failed ? 'is-failed' : done ? 'is-done' : 'is-running'} key={`${event.type}-${String(event.callId ?? event.stepId ?? index)}`}>
              <i aria-hidden="true" />
              <span>{progressLabel(event)}</span>
            </li>
          );
        })}
      </ol>
      {draft && <p className="interview-progress-draft">{draft}<i aria-hidden="true" /></p>}
    </section>
  );
}

export function InterviewRoom() {
  const [stage, setStage] = useState<Stage>('setup');
  const [profile, setProfile] = useState<InterviewProfile>(DEFAULT_PROFILE);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [review, setReview] = useState('');
  const [answer, setAnswer] = useState('');
  const [requestState, setRequestState] = useState<RequestState>('idle');
  const [error, setError] = useState('');
  const [restored, setRestored] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [records, setRecords] = useState<InterviewRecord[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [progressEvents, setProgressEvents] = useState<InterviewJobEvent[]>([]);
  const [liveDraft, setLiveDraft] = useState('');
  const [requestStartedAt, setRequestStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceHint, setVoiceHint] = useState('');
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  const questionCount = useMemo(
    () => messages.filter((message) => message.role === 'assistant').length,
    [messages],
  );
  const hasCandidateAnswer = messages.some((message) => message.role === 'user');

  useEffect(() => {
    let active = true;
    const localRecords = readLocalHistory();
    const activeId = window.localStorage.getItem(ACTIVE_STORAGE_KEY);
    let activeRecord = localRecords.find((record) => record.id === activeId) ?? null;
    let initialRecords = localRecords;
    if (!activeRecord) {
      const legacy = readLegacySession(window.localStorage.getItem(LEGACY_STORAGE_KEY));
      if (legacy) {
        activeRecord = legacy;
        initialRecords = mergeInterviewRecords(localRecords, [legacy]);
        writeLocalHistory(initialRecords);
        window.localStorage.setItem(ACTIVE_STORAGE_KEY, legacy.id);
      }
    }

    const timer = window.setTimeout(() => {
      if (!active) return;
      setRecords(initialRecords);
      if (activeRecord) {
        setSessionId(activeRecord.id);
        setCreatedAt(activeRecord.createdAt);
        setStage(activeRecord.stage);
        setProfile(activeRecord.profile);
        setMessages(activeRecord.messages);
        setReview(activeRecord.review);
      }
      setRestored(true);
    }, 0);

    void fetch('/api/interview', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json() as { ok?: boolean; records?: InterviewRecord[] };
        if (!response.ok || !data.ok || !Array.isArray(data.records)) return;
        if (!active) return;
        setRecords((current) => {
          const merged = mergeInterviewRecords(current, data.records);
          writeLocalHistory(merged);
          return merged;
        });
      })
      .catch(() => undefined);

    const speechWindow = window as SpeechWindow;
    const speechSupported = Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition);
    const supportTimer = window.setTimeout(() => active && setVoiceSupported(speechSupported), 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
      window.clearTimeout(supportTimer);
      recognitionRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!restored) return;
    const timer = window.setTimeout(() => {
      if (stage === 'setup' || !sessionId || !createdAt) {
        try { window.localStorage.removeItem(ACTIVE_STORAGE_KEY); } catch { /* no-op */ }
        return;
      }
      const record: InterviewRecord = {
        id: sessionId,
        stage,
        profile,
        messages,
        review,
        createdAt,
        updatedAt: new Date().toISOString(),
      };
      setRecords((current) => {
        const next = mergeInterviewRecords(current, [record]);
        writeLocalHistory(next);
        return next;
      });
      try { window.localStorage.setItem(ACTIVE_STORAGE_KEY, sessionId); } catch { /* in-memory copy remains */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [createdAt, messages, profile, restored, review, sessionId, stage]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, requestState, review]);

  useEffect(() => {
    if (requestState !== 'waiting' || !requestStartedAt) return;
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - requestStartedAt) / 1_000)), 1_000);
    return () => window.clearInterval(timer);
  }, [requestStartedAt, requestState]);

  async function askAgent(action: InterviewAction, nextMessages: InterviewMessage[], activeSessionId: string) {
    setProgressEvents([]);
    setLiveDraft('');
    setElapsed(0);
    setRequestStartedAt(Date.now());

    const response = await fetch('/api/interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, sessionId: activeSessionId, profile, messages: nextMessages }),
    });
    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok || !contentType.includes('text/event-stream')) {
      const data = await response.json().catch(() => ({})) as { ok?: boolean; message?: string; error?: string };
      if (response.ok && data.ok && data.message) return data.message;
      throw new Error(data.error ?? 'INTERVIEW_UNAVAILABLE');
    }
    if (!response.body) throw new Error('INTERVIEW_UNAVAILABLE');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalContent = '';
    let streamedContent = '';
    let failure = '';

    const consumeFrame = (frame: string) => {
      const event = parseInterviewEventFrame(frame);
      if (!event) return;
      if (event.type === 'artifact.patch') {
        const patch = event.patch && typeof event.patch === 'object'
          ? event.patch as { append?: unknown }
          : null;
        if (typeof patch?.append === 'string') {
          streamedContent = `${streamedContent}${patch.append}`.slice(0, 6_000);
          setLiveDraft(streamedContent);
        }
        return;
      }
      setProgressEvents((current) => [...current, event].slice(-12));
      if (event.type === 'artifact.created') {
        const data = event.data && typeof event.data === 'object'
          ? event.data as { content?: unknown }
          : null;
        if (typeof data?.content === 'string') finalContent = data.content;
      }
      if (event.type === 'step.failed' && event.error !== 'HISTORY_UNAVAILABLE') {
        failure = typeof event.error === 'string' ? event.error : 'INTERVIEW_UNAVAILABLE';
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? '';
      frames.forEach(consumeFrame);
      if (done) break;
    }
    if (buffer.trim()) consumeFrame(buffer.trim());
    if (failure) throw new Error(failure);
    const content = finalContent || streamedContent;
    if (!content) throw new Error('INTERVIEW_UNAVAILABLE');
    return content;
  }

  async function startInterview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestState === 'waiting' || !profile.company.trim()) return;
    const nextSessionId = createSessionId();
    const now = new Date().toISOString();
    setRequestState('waiting');
    setError('');
    setMessages([]);
    setReview('');

    try {
      const message = await askAgent('start', [], nextSessionId);
      setSessionId(nextSessionId);
      setCreatedAt(now);
      setMessages([{ role: 'assistant', content: message }]);
      setStage('interview');
      window.setTimeout(() => textareaRef.current?.focus(), 80);
    } catch (caught) {
      setError(friendlyError(caught instanceof Error ? caught.message : undefined));
    } finally {
      setRequestState('idle');
    }
  }

  async function submitAnswer(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const content = answer.trim();
    if (!content || requestState === 'waiting' || !sessionId) return;

    const previousMessages = messages;
    const nextMessages = [...messages, { role: 'user' as const, content }];
    const shouldReview = questionCount >= MAX_QUESTIONS;
    setMessages(nextMessages);
    setAnswer('');
    setError('');
    setRequestState('waiting');

    try {
      const response = await askAgent(shouldReview ? 'review' : 'reply', nextMessages, sessionId);
      if (shouldReview) {
        setReview(response);
        setStage('review');
      } else {
        setMessages((current) => [...current, { role: 'assistant', content: response }]);
      }
    } catch (caught) {
      setMessages(previousMessages);
      setError(friendlyError(caught instanceof Error ? caught.message : undefined));
      setAnswer(content);
    } finally {
      setRequestState('idle');
    }
  }

  async function finishInterview() {
    if (!hasCandidateAnswer || requestState === 'waiting' || !sessionId) return;
    setError('');
    setRequestState('waiting');
    try {
      const response = await askAgent('review', messages, sessionId);
      setReview(response);
      setStage('review');
    } catch (caught) {
      setError(friendlyError(caught instanceof Error ? caught.message : undefined));
    } finally {
      setRequestState('idle');
    }
  }

  function resetInterview() {
    recognitionRef.current?.abort();
    setStage('setup');
    setSessionId('');
    setCreatedAt('');
    setMessages([]);
    setReview('');
    setAnswer('');
    setError('');
    setProgressEvents([]);
    setLiveDraft('');
    setVoiceState('idle');
    try { window.localStorage.removeItem(ACTIVE_STORAGE_KEY); } catch { /* no-op */ }
  }

  function restoreRecord(record: InterviewRecord) {
    setSessionId(record.id);
    setCreatedAt(record.createdAt);
    setStage(record.stage);
    setProfile(record.profile);
    setMessages(record.messages);
    setReview(record.review);
    setAnswer('');
    setError('');
    setHistoryOpen(false);
    try { window.localStorage.setItem(ACTIVE_STORAGE_KEY, record.id); } catch { /* no-op */ }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void submitAnswer();
    }
  }

  function startVoice(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!voiceSupported || voiceState !== 'idle' || requestState === 'waiting') return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    const base = answer.trim();
    let finalTranscript = '';
    setVoiceHint('松开发送到输入框');
    setVoiceState('listening');

    recognition.onresult = (speechEvent) => {
      let interim = '';
      for (let index = speechEvent.resultIndex; index < speechEvent.results.length; index += 1) {
        const result = speechEvent.results[index];
        const transcript = result?.[0]?.transcript?.trim() ?? '';
        if (result?.isFinal) finalTranscript = `${finalTranscript}${transcript}`;
        else interim = `${interim}${transcript}`;
      }
      const spoken = `${finalTranscript}${interim}`.trim();
      const next = [base, spoken].filter(Boolean).join(base && spoken ? ' ' : '');
      setAnswer(next.slice(0, INTERVIEW_MESSAGE_MAX_LENGTH));
    };
    recognition.onerror = (speechError) => {
      setVoiceHint(speechError.error === 'not-allowed' ? '需要允许麦克风权限' : '这次没听清，再按住试试');
      setVoiceState('idle');
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setVoiceState('idle');
      setVoiceHint(finalTranscript ? '已转成文字，可以继续编辑' : '按住说话');
    };

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setVoiceState('idle');
      setVoiceHint('语音输入暂时不可用');
    }
  }

  function stopVoice(event: ReactPointerEvent<HTMLButtonElement>) {
    if (voiceState !== 'listening') return;
    event.preventDefault();
    setVoiceState('processing');
    setVoiceHint('正在转成文字');
    try { recognitionRef.current?.stop(); } catch { setVoiceState('idle'); }
  }

  return (
    <main className="interview-page">
      <div className="interview-ambient" aria-hidden="true"><i /><i /><i /></div>

      <header className="interview-header">
        <h1>模拟面试</h1>
        <button
          className="interview-history-trigger"
          type="button"
          aria-label={`面试记录，共 ${records.length} 场`}
          onClick={() => setHistoryOpen(true)}
          disabled={requestState === 'waiting'}
        >记录 <b>{records.length}</b></button>
      </header>

      {stage === 'setup' && (
        <section className="interview-setup" aria-labelledby="interview-setup-title">
          <h2 id="interview-setup-title">面试设置</h2>

          <form className="interview-setup-form" onSubmit={startInterview}>
            <label className="interview-company-field">
              <span>公司</span>
              <input
                type="text"
                value={profile.company}
                maxLength={INTERVIEW_COMPANY_MAX_LENGTH}
                onChange={(event) => setProfile((current) => ({ ...current, company: event.target.value }))}
                placeholder="公司名或公司类型"
                required
              />
            </label>

            <fieldset>
              <legend>岗位</legend>
              <div className="interview-role-grid">
                {INTERVIEW_ROLES.map((role) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={profile.role === role.id}
                    className={profile.role === role.id ? 'is-selected' : ''}
                    key={role.id}
                    onClick={() => setProfile((current) => ({ ...current, role: role.id }))}
                  >
                    <span>{role.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>经验</legend>
              <div className="interview-experience-row">
                {INTERVIEW_EXPERIENCE_LEVELS.map((level) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={profile.experience === level.id}
                    className={profile.experience === level.id ? 'is-selected' : ''}
                    key={level.id}
                    onClick={() => setProfile((current) => ({ ...current, experience: level.id }))}
                  >{level.label}</button>
                ))}
              </div>
            </fieldset>

            <button className="interview-primary-button" type="submit" disabled={requestState === 'waiting' || !profile.company.trim()}>
              {requestState === 'waiting' ? <><span className="interview-button-dots" aria-hidden="true"><i /><i /><i /></span>正在连接</> : '开始面试'}
            </button>
            {requestState === 'waiting' && <ProgressWorkspace events={progressEvents} draft={liveDraft} elapsed={elapsed} />}
            {error && <p className="interview-error" role="alert">{error}</p>}
            <small className="interview-privacy">自动保存</small>
          </form>
        </section>
      )}

      {stage === 'interview' && (
        <section className="interview-session" aria-label="模拟面试对话">
          <div className="interview-session-meta">
            <div><b>{roleLabel(profile.role)}</b><span>{profile.company}</span></div>
            <p>{experienceLabel(profile.experience)} {questionCount}/{MAX_QUESTIONS}</p>
          </div>

          <ol className="interview-transcript" aria-live="polite">
            {messages.map((message, index) => (
              <li className={`is-${message.role}`} key={`${message.role}-${index}`}>
                {message.role === 'assistant' && <InterviewerMark />}
                <article>
                  <span>{message.role === 'assistant' ? `问题 ${String(messages.slice(0, index + 1).filter((item) => item.role === 'assistant').length).padStart(2, '0')}` : '你的回答'}</span>
                  <p>{message.content}</p>
                </article>
              </li>
            ))}
          </ol>

          {requestState === 'waiting' && <ProgressWorkspace events={progressEvents} draft={liveDraft} elapsed={elapsed} />}

          <form className="interview-composer" onSubmit={(event) => void submitAnswer(event)}>
            <label htmlFor="interview-answer">回答</label>
            <textarea
              ref={textareaRef}
              id="interview-answer"
              value={answer}
              maxLength={INTERVIEW_MESSAGE_MAX_LENGTH}
              rows={4}
              placeholder="说清你做了什么，结果如何"
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              disabled={requestState === 'waiting'}
            />
            <div className="interview-composer-actions">
              {voiceSupported && (
                <button
                  className={`interview-voice-button${voiceState === 'listening' ? ' is-listening' : ''}`}
                  type="button"
                  aria-label="按住说话，松开转成文字"
                  disabled={requestState === 'waiting' || voiceState === 'processing'}
                  onPointerDown={startVoice}
                  onPointerUp={stopVoice}
                  onPointerCancel={stopVoice}
                  onContextMenu={(event) => event.preventDefault()}
                ><i aria-hidden="true" />{voiceState === 'listening' ? '松开结束' : voiceState === 'processing' ? '识别中' : '按住说话'}</button>
              )}
              <span>{voiceHint || `${answer.length}/${INTERVIEW_MESSAGE_MAX_LENGTH}`}</span>
              <button className="interview-send-button" type="submit" disabled={!answer.trim() || requestState === 'waiting'}>
                {questionCount >= MAX_QUESTIONS ? '提交并复盘' : '发送回答'}
              </button>
            </div>
          </form>

          {error && <div className="interview-inline-error" role="alert"><span>{error}</span><button type="button" onClick={() => setError('')}>关闭</button></div>}

          <div className="interview-session-actions">
            <button type="button" onClick={() => void finishInterview()} disabled={!hasCandidateAnswer || requestState === 'waiting'}>结束并复盘</button>
            <button type="button" onClick={resetInterview} disabled={requestState === 'waiting'}>重新开始</button>
          </div>
          <div ref={transcriptEndRef} />
        </section>
      )}

      {stage === 'review' && (
        <section className="interview-review" aria-labelledby="interview-review-title">
          <div className="interview-review-seal" aria-hidden="true"><InterviewerMark /></div>
          <h2 id="interview-review-title">面试复盘</h2>
          <div className="interview-review-meta">
            <span>{profile.company}</span><i />
            <span>{roleLabel(profile.role)}</span><i />
            <span>{messages.filter((message) => message.role === 'user').length} 个回答</span>
          </div>
          <article className="interview-review-copy">{review}</article>
          <div className="interview-review-actions">
            <button className="interview-primary-button" type="button" onClick={resetInterview}>再练一场</button>
            <Link href="/">回首页</Link>
          </div>
          <small className="interview-privacy">仅供练习</small>
          <div ref={transcriptEndRef} />
        </section>
      )}

      {historyOpen && (
        <div className="interview-history-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && setHistoryOpen(false)}>
          <section className="interview-history-sheet" role="dialog" aria-modal="true" aria-labelledby="interview-history-title">
            <header>
              <div><h2 id="interview-history-title">面试记录</h2></div>
              <button type="button" aria-label="关闭面试记录" onClick={() => setHistoryOpen(false)}>×</button>
            </header>
            {records.length ? (
              <ol>
                {records.map((record) => (
                  <li key={record.id}>
                    <button type="button" onClick={() => restoreRecord(record)}>
                      <time>{new Date(record.updatedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
                      <b>{record.profile.company}</b>
                      <span>{roleLabel(record.profile.role)}，{record.messages.filter((message) => message.role === 'user').length} 个回答，{record.stage === 'review' ? '已复盘' : '进行中'}</span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : <p className="interview-history-empty">暂无记录</p>}
            <button className="interview-history-new" type="button" onClick={() => { resetInterview(); setHistoryOpen(false); }}>新面试</button>
          </section>
        </div>
      )}
    </main>
  );
}
