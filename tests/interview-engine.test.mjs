import test from 'node:test';
import assert from 'node:assert/strict';

const engine = await import('../lib/interview-engine.mjs').catch(() => ({}));

const PROFILES = [
  { company: 'AI 公司', role: 'community', experience: 'junior' },
  { company: 'AI 公司', role: 'pr', experience: 'junior' },
  { company: 'AI 公司', role: 'brand', experience: 'junior' },
  { company: 'AI 公司', role: 'product-marketing', experience: 'junior' },
];

test('each role owns a distinct six-competency interview plan', () => {
  const plans = PROFILES.map((profile) => engine.getInterviewRolePlan?.(profile.role));

  assert.ok(plans.every((plan) => plan?.length === 6));
  assert.equal(new Set(plans.map((plan) => plan.map((arc) => arc.id).join('|'))).size, 4);
  assert.ok(plans.flat().every((arc) => arc.id && arc.label && arc.brief && arc.openingQuestion));
});

test('a thin answer triggers one grounded probe, then the code orchestrator moves on', () => {
  const profile = PROFILES[0];
  const opening = engine.prepareInterviewTurn?.({ action: 'start', profile, messages: [] });
  const asked = engine.commitInterviewQuestion?.(opening.engine, opening.decision, '你如何理解开发者社群？');
  const first = engine.prepareInterviewTurn?.({
    action: 'reply',
    profile,
    engine: asked,
    messages: [
      { role: 'assistant', content: '你如何理解开发者社群？' },
      { role: 'user', content: '我觉得要多做活动。' },
    ],
  });

  assert.equal(first.decision.action, 'probe');
  assert.equal(first.engine.probesOnCurrentArc, 1);

  const probed = engine.commitInterviewQuestion(first.engine, first.decision, '你具体做了什么，结果怎样？');
  const second = engine.prepareInterviewTurn({
    action: 'reply',
    profile,
    engine: probed,
    messages: [
      { role: 'assistant', content: '你如何理解开发者社群？' },
      { role: 'user', content: '我觉得要多做活动。' },
      { role: 'assistant', content: '你具体做了什么，结果怎样？' },
      { role: 'user', content: '就是继续做活动。' },
    ],
  });

  assert.equal(second.decision.action, 'move_on');
  assert.equal(second.engine.currentArcIndex, 1);
  assert.equal(second.engine.probesOnCurrentArc, 0);
});

test('a concrete result moves on and can raise difficulty by only one level', () => {
  const profile = PROFILES[1];
  const opening = engine.prepareInterviewTurn({ action: 'start', profile, messages: [] });
  const asked = engine.commitInterviewQuestion(opening.engine, opening.decision, '讲一次媒体沟通。');
  const next = engine.prepareInterviewTurn({
    action: 'reply',
    profile,
    engine: asked,
    messages: [
      { role: 'assistant', content: '讲一次媒体沟通。' },
      { role: 'user', content: '我负责梳理三类媒体名单，先访谈 12 位记者验证选题，再调整叙事和资料包。两周获得 18 篇有效报道，核心信息准确率从 62% 提升到 91%。复盘后我把口径确认加入发布清单。' },
    ],
  });

  assert.equal(next.decision.action, 'move_on');
  assert.equal(next.engine.currentArcIndex, 1);
  assert.ok(next.engine.difficulty >= asked.difficulty);
  assert.ok(next.engine.difficulty - asked.difficulty <= 1);
  assert.equal(next.evaluation.answerType, 'strong');
});

test('engine state is bounded, normalizable and exposes a quiet UI status', () => {
  const profile = PROFILES[2];
  const state = engine.createInterviewEngine?.(profile);
  const normalized = engine.normalizeInterviewEngineState?.({ ...state, difficulty: 99 }, profile);
  const status = engine.getInterviewEngineStatus?.(profile, state);

  assert.equal(normalized.ok, false);
  assert.equal(status.questionNumber, 1);
  assert.equal(status.maxTurns, 7);
  assert.ok(status.competency.length > 0);
  assert.match(status.depth, /基础|深入|压力/);
});
