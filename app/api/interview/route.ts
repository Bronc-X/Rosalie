import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  buildInterviewMessages,
  encodeInterviewEvent,
  extractAssistantContent,
  extractAssistantDelta,
  normalizeInterviewJobRequest,
  splitProviderSseFrames,
} from '@/lib/interview.mjs';
import type { InterviewJobEvent, InterviewRecord } from '@/lib/interview.mjs';
import {
  commitInterviewQuestion,
  prepareInterviewTurn,
} from '@/lib/interview-engine.mjs';
import {
  INTERVIEW_FALLBACK_MODEL_ID,
  INTERVIEW_MODEL_ID,
  INTERVIEW_MODEL_LABEL,
  INTERVIEW_PRIMARY_FIRST_TOKEN_TIMEOUT_MS,
} from '@/lib/interview-model.mjs';
import { attachPlayerCookie, resolvePlayerSession } from '@/lib/player-session';
import {
  getRequestClientKey,
  readBoundedJson,
  takeRateLimit,
  validateJsonMutation,
} from '@/lib/request-security.mjs';
import {
  readVercelInterviewRecords,
  usesVercelBlob,
  writeVercelInterviewRecord,
} from '@/lib/vercel-blob-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function json(data: unknown, status = 200, extraHeaders?: Record<string, string>) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

function providerConfig() {
  const apiKey = process.env.INTERVIEW_AI_API_KEY?.trim();
  const baseUrl = process.env.INTERVIEW_AI_BASE_URL?.trim();
  const model = process.env.INTERVIEW_AI_MODEL?.trim() || INTERVIEW_MODEL_ID;
  if (!apiKey || !baseUrl || model !== INTERVIEW_MODEL_ID) return null;

  try {
    const url = new URL(baseUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return null;
    return {
      apiKey,
      model,
      fallbackModel: INTERVIEW_FALLBACK_MODEL_ID,
      endpoint: `${url.toString().replace(/\/$/, '')}/chat/completions`,
    };
  } catch {
    return null;
  }
}

async function readProviderContent(response: Response, onDelta: (delta: string) => void) {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/event-stream')) {
    return extractAssistantContent(await response.json());
  }
  if (!response.body) return null;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';

  const consume = (frame: string) => {
    if (frame === '[DONE]') return;
    try {
      const payload = JSON.parse(frame) as unknown;
      const delta = extractAssistantDelta(payload);
      if (delta) {
        const safeDelta = delta.slice(0, Math.max(0, 6_000 - content.length));
        if (safeDelta) {
          content += safeDelta;
          onDelta(safeDelta);
        }
      } else if (!content) {
        const complete = extractAssistantContent(payload);
        if (complete) {
          content = complete.slice(0, 6_000);
          onDelta(content);
        }
      }
    } catch {
      // Provider keep-alives and malformed non-content frames carry no user-visible output.
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    const split = splitProviderSseFrames(buffer, decoder.decode(value, { stream: !done }));
    buffer = split.remainder;
    split.frames.forEach(consume);
    if (done) break;
  }
  if (buffer.trim()) {
    const trailing = buffer
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');
    if (trailing) consume(trailing);
  }
  return content || null;
}

async function requestProviderContent({
  apiKey,
  endpoint,
  model,
  messages,
  maxCompletionTokens,
  firstTokenTimeoutMs,
  onDelta,
}: {
  apiKey: string;
  endpoint: string;
  model: string;
  messages: ReturnType<typeof buildInterviewMessages>;
  maxCompletionTokens: number;
  firstTokenTimeoutMs: number | null;
  onDelta: (delta: string) => void;
}) {
  const abortController = new AbortController();
  const hardTimeout = setTimeout(() => abortController.abort(), 40_000);
  let firstTokenTimeout = firstTokenTimeoutMs === null
    ? null
    : setTimeout(() => abortController.abort(), firstTokenTimeoutMs);
  const markFirstToken = () => {
    if (firstTokenTimeout !== null) {
      clearTimeout(firstTokenTimeout);
      firstTokenTimeout = null;
    }
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_completion_tokens: maxCompletionTokens,
        stream: true,
      }),
      signal: abortController.signal,
      cache: 'no-store',
      redirect: 'error',
    });
    if (!response.ok) throw new Error('INTERVIEW_UNAVAILABLE');

    const content = await readProviderContent(response, (delta) => {
      markFirstToken();
      onDelta(delta);
    });
    if (content) markFirstToken();
    return content;
  } finally {
    clearTimeout(hardTimeout);
    if (firstTokenTimeout !== null) clearTimeout(firstTokenTimeout);
  }
}

function eventAt(type: InterviewJobEvent['type'], jobId: string, data: Record<string, unknown> = {}) {
  return { type, jobId, at: new Date().toISOString(), ...data } as InterviewJobEvent;
}

export async function GET(request: NextRequest) {
  const session = await resolvePlayerSession(request);
  if (!session.ok) return json({ ok: false, error: session.error }, session.error === 'LOCKED' ? 401 : 503);

  try {
    const records = usesVercelBlob() ? await readVercelInterviewRecords(session.playerId) : [];
    return attachPlayerCookie(json({ ok: true, records }), session);
  } catch {
    return attachPlayerCookie(json({ ok: false, error: 'HISTORY_UNAVAILABLE' }, 503), session);
  }
}

export async function POST(request: NextRequest) {
  const session = await resolvePlayerSession(request);
  if (!session.ok) return json({ ok: false, error: session.error }, session.error === 'LOCKED' ? 401 : 503);
  const respond = (data: unknown, status = 200, extraHeaders?: Record<string, string>) => (
    attachPlayerCookie(json(data, status, extraHeaders), session)
  );

  const mutation = validateJsonMutation(request);
  if (!mutation.ok) return respond({ ok: false, error: mutation.error }, mutation.status);
  const rate = takeRateLimit({
    scope: 'interview',
    key: getRequestClientKey(request.headers, session.playerId),
    limit: 14,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return respond(
      { ok: false, error: 'RATE_LIMITED' },
      429,
      { 'Retry-After': String(rate.retryAfter) },
    );
  }

  const parsed = await readBoundedJson(request, 40_000);
  if (!parsed.ok) return respond({ ok: false, error: parsed.error }, parsed.status);
  const normalized = normalizeInterviewJobRequest(parsed.value);
  if (!normalized.ok) return respond({ ok: false, error: normalized.error }, 400);
  const provider = providerConfig();
  if (!provider) return respond({ ok: false, error: 'INTERVIEW_UNAVAILABLE' }, 503);

  const encoder = new TextEncoder();
  const jobId = `job_${crypto.randomUUID().replaceAll('-', '')}`;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: InterviewJobEvent) => controller.enqueue(encoder.encode(encodeInterviewEvent(event)));
      const toolId = (name: string) => `${name}_${crypto.randomUUID().slice(0, 8)}`;
      const contextCallId = toolId('context');
      const modelCallId = toolId('model');
      const fallbackCallId = toolId('fallback');
      let activeModelCallId = modelCallId;

      emit(eventAt('job.started', jobId, {
        title: '生成面试回应',
        modelId: INTERVIEW_MODEL_ID,
        modelLabel: INTERVIEW_MODEL_LABEL,
        fallbackModelId: INTERVIEW_FALLBACK_MODEL_ID,
        fallbackAfterMs: INTERVIEW_PRIMARY_FIRST_TOKEN_TIMEOUT_MS,
      }));
      emit(eventAt('tool.started', jobId, {
        callId: contextCallId,
        name: 'prepare_context',
        inputSummary: `${normalized.value.profile.company} · ${normalized.value.messages.length} 条对话`,
      }));

      try {
        const orchestration = prepareInterviewTurn(normalized.value);
        const providerMessages = buildInterviewMessages(normalized.value, orchestration);
        emit(eventAt('tool.completed', jobId, {
          callId: contextCallId,
          name: 'prepare_context',
          outputSummary: `已整理 ${providerMessages.length} 条上下文 · ${orchestration.decision.competencyLabel}`,
        }));
        if (orchestration.evaluation) {
          const evaluationCallId = toolId('evaluation');
          emit(eventAt('tool.started', jobId, {
            callId: evaluationCallId,
            name: 'evaluate_answer',
            inputSummary: '提取回答证据',
          }));
          emit(eventAt('tool.completed', jobId, {
            callId: evaluationCallId,
            name: 'evaluate_answer',
            outputSummary: `证据已提取 · ${orchestration.evaluation.answerType}`,
          }));
        }
        const routeCallId = toolId('route');
        emit(eventAt('tool.started', jobId, {
          callId: routeCallId,
          name: 'route_interview',
          inputSummary: '决定追问、换题与难度',
        }));
        emit(eventAt('tool.completed', jobId, {
          callId: routeCallId,
          name: 'route_interview',
          outputSummary: `${orchestration.decision.action} · ${orchestration.decision.competencyLabel} · ${orchestration.decision.difficulty}/3`,
        }));
        emit(eventAt('tool.started', jobId, {
          callId: modelCallId,
          name: 'call_interviewer',
          inputSummary: normalized.value.action === 'review' ? '生成复盘' : '生成下一问',
        }));
        emit(eventAt('step.started', jobId, {
          stepId: 'receive_reply',
          title: normalized.value.action === 'review' ? '整理复盘' : '准备下一问',
        }));

        const attempts = [
          {
            model: provider.model,
            callId: modelCallId,
            name: 'call_interviewer',
            firstTokenTimeoutMs: INTERVIEW_PRIMARY_FIRST_TOKEN_TIMEOUT_MS,
          },
          {
            model: provider.fallbackModel,
            callId: fallbackCallId,
            name: 'call_fallback_interviewer',
            firstTokenTimeoutMs: null,
          },
        ] as const;
        let content: string | null = null;
        let modelUsed: string = provider.model;
        let emittedProviderText = false;

        for (const [index, attempt] of attempts.entries()) {
          activeModelCallId = attempt.callId;
          if (index === 1) {
            emit(eventAt('step.started', jobId, {
              stepId: 'model_fallback',
              title: '切换备用模型',
            }));
            emit(eventAt('tool.started', jobId, {
              callId: attempt.callId,
              name: attempt.name,
              inputSummary: '继续生成',
            }));
          }

          try {
            content = await requestProviderContent({
              apiKey: provider.apiKey,
              endpoint: provider.endpoint,
              model: attempt.model,
              messages: providerMessages,
              maxCompletionTokens: normalized.value.action === 'review' ? 1_400 : 420,
              firstTokenTimeoutMs: attempt.firstTokenTimeoutMs,
              onDelta: (delta) => {
                emittedProviderText = true;
                emit(eventAt('artifact.patch', jobId, {
                  artifactId: normalized.value.sessionId,
                  patch: { append: delta },
                }));
              },
            });
            if (!content) throw new Error('INTERVIEW_UNAVAILABLE');
            modelUsed = attempt.model;
            emit(eventAt('tool.completed', jobId, {
              callId: attempt.callId,
              name: attempt.name,
              outputSummary: `收到 ${content.length} 字`,
            }));
            break;
          } catch {
            if (index === 0 && !emittedProviderText) continue;
            throw new Error('INTERVIEW_UNAVAILABLE');
          }
        }
        if (!content) throw new Error('INTERVIEW_UNAVAILABLE');
        const nextEngine = normalized.value.action === 'review'
          ? orchestration.engine
          : commitInterviewQuestion(orchestration.engine, orchestration.decision, content);
        emit(eventAt('artifact.created', jobId, {
          artifactId: normalized.value.sessionId,
          kind: normalized.value.action === 'review' ? 'interview.review' : 'assistant.message',
          title: normalized.value.action === 'review' ? '面试复盘' : '面试问题',
          data: {
            content,
            modelId: modelUsed,
            engine: nextEngine,
            route: {
              action: orchestration.decision.action,
              competency: orchestration.decision.competencyLabel,
              difficulty: orchestration.decision.difficulty,
            },
          },
        }));

        if (usesVercelBlob()) {
          const saveCallId = toolId('save');
          emit(eventAt('tool.started', jobId, {
            callId: saveCallId,
            name: 'save_record',
            inputSummary: '保存本次面试',
          }));
          try {
            const now = new Date().toISOString();
            const record: InterviewRecord = {
              id: normalized.value.sessionId,
              stage: normalized.value.action === 'review' ? 'review' : 'interview',
              profile: normalized.value.profile,
              messages: normalized.value.action === 'review'
                ? normalized.value.messages
                : [...normalized.value.messages, { role: 'assistant', content }],
              review: normalized.value.action === 'review' ? content : '',
              engine: nextEngine,
              createdAt: now,
              updatedAt: now,
            };
            await writeVercelInterviewRecord(session.playerId, record);
            emit(eventAt('tool.completed', jobId, {
              callId: saveCallId,
              name: 'save_record',
              outputSummary: '面试记录已同步',
            }));
          } catch {
            emit(eventAt('step.failed', jobId, {
              stepId: saveCallId,
              error: 'HISTORY_UNAVAILABLE',
              recoverable: true,
            }));
          }
        }

        emit(eventAt('job.completed', jobId, { modelId: modelUsed }));
      } catch {
        emit(eventAt('step.failed', jobId, {
          stepId: activeModelCallId,
          error: 'INTERVIEW_UNAVAILABLE',
          recoverable: true,
        }));
      } finally {
        controller.close();
      }
    },
  });

  const response = new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'private, no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
    },
  });
  return attachPlayerCookie(response, session);
}
