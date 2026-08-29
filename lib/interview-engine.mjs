export const INTERVIEW_ENGINE_VERSION = 2;
export const INTERVIEW_MIN_TURNS = 5;
export const INTERVIEW_MAX_TURNS = 7;
export const INTERVIEW_MAX_PROBES_PER_ARC = 1;

const DIMENSION_LABELS = Object.freeze({
  relevance: '回答相关性',
  evidence: '事实与结果证据',
  judgment: '判断与取舍',
  ownership: '执行与责任边界',
  structure: '表达结构',
});

const ROLE_PLANS = Object.freeze({
  community: Object.freeze([
    { id: 'user-insight', label: '用户洞察', brief: '辨认核心用户、真实需求与社群边界', openingQuestion: '请讲一次你识别核心社群用户和真实需求的经历。' },
    { id: 'community-mechanics', label: '社群机制', brief: '设计成员关系、激励和长期活跃机制', openingQuestion: '如果一个 AI 产品社群新增很多人但互动很低，你会先改哪一项机制？' },
    { id: 'content-events', label: '内容与活动', brief: '用内容或活动促成高质量互动', openingQuestion: '请讲一次你从目标倒推内容或活动设计的案例。' },
    { id: 'metrics-experiments', label: '指标实验', brief: '定义指标、提出假设并做小步实验', openingQuestion: '你会用哪些指标判断社群真正产生了业务价值？' },
    { id: 'cross-functional', label: '跨团队协作', brief: '与产品、销售、研发对齐优先级和承诺', openingQuestion: '讲一次你推动多个团队共同解决用户问题的经历。' },
    { id: 'crisis-governance', label: '危机治理', brief: '处理争议、错误信息与社区信任', openingQuestion: '如果产品事故在社群中迅速发酵，你会如何组织前两小时的响应？' },
  ]),
  pr: Object.freeze([
    { id: 'narrative-positioning', label: '叙事定位', brief: '把技术事实转成可信且有边界的公共叙事', openingQuestion: '请讲一次你为复杂产品提炼对外叙事的经历。' },
    { id: 'media-relations', label: '媒体关系', brief: '识别媒体需求并建立可持续合作', openingQuestion: '面对对 AI 议题持怀疑态度的记者，你会怎样建立有效沟通？' },
    { id: 'launch-comms', label: '发布传播', brief: '规划发布节奏、信息层级与传播资产', openingQuestion: '讲一次你参与产品发布传播的案例，你负责什么？' },
    { id: 'impact-measurement', label: '效果衡量', brief: '区分曝光、信息准确度与业务影响', openingQuestion: '除了报道数量，你如何判断一次 PR 项目是否有效？' },
    { id: 'stakeholder-alignment', label: '利益相关方', brief: '平衡管理层、法务、产品与外部受众', openingQuestion: '讲一次不同利益相关方对公开口径意见相反时，你如何推进决策。' },
    { id: 'trust-crisis', label: '危机与信任', brief: '在不确定事实下控制风险并重建信任', openingQuestion: 'AI 产品被质疑夸大能力时，你会如何判断是否回应以及怎样回应？' },
  ]),
  brand: Object.freeze([
    { id: 'brand-positioning', label: '品牌定位', brief: '建立清晰、可区分且能被执行的定位', openingQuestion: '请讲一次你参与品牌定位或重新定位的经历。' },
    { id: 'audience-insight', label: '受众洞察', brief: '从研究中提炼可指导创意的洞察', openingQuestion: '你怎样判断一个受众洞察足够真实，能用于品牌决策？' },
    { id: 'creative-judgment', label: '创意判断', brief: '用目标与约束判断创意而非只谈偏好', openingQuestion: '讲一次你否定或调整创意方向的案例，依据是什么？' },
    { id: 'campaign-delivery', label: '项目落地', brief: '在资源和期限内组织品牌项目交付', openingQuestion: '讲一次资源有限但仍要保证品牌质量的项目。' },
    { id: 'brand-measurement', label: '效果评估', brief: '连接品牌指标、行为变化与长期资产', openingQuestion: '你会如何设计一套不只看曝光的品牌效果评估？' },
    { id: 'brand-risk', label: '品牌风险', brief: '处理一致性、争议与声誉风险', openingQuestion: '当一次创意引发价值观争议时，你会如何止损和复盘？' },
  ]),
  'product-marketing': Object.freeze([
    { id: 'customer-insight', label: '客户洞察', brief: '从客户问题、场景与替代方案中识别机会', openingQuestion: '请讲一次客户洞察真正改变产品或市场策略的经历。' },
    { id: 'positioning-messaging', label: '定位信息', brief: '定义目标市场、差异与可信证据', openingQuestion: '面对功能相近的 AI 产品，你会怎样建立有证据的差异化信息？' },
    { id: 'gtm-strategy', label: 'GTM', brief: '选择市场、渠道、节奏与验证路径', openingQuestion: '讲一次你参与制定或修正 GTM 计划的案例。' },
    { id: 'sales-enablement', label: '销售赋能', brief: '把市场洞察变成销售可执行的工具', openingQuestion: '销售总说客户听不懂产品价值，你会先检查和改什么？' },
    { id: 'growth-metrics', label: '增长指标', brief: '定义漏斗、北极星指标与实验优先级', openingQuestion: '你会怎样判断一场发布带来的不是短期流量，而是有效增长？' },
    { id: 'launch-competition', label: '发布与竞争', brief: '处理发布依赖、竞争反应与市场变化', openingQuestion: '竞品突然提前发布相似能力时，你会如何调整自己的发布策略？' },
  ]),
});

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function cleanString(value, maximum = 1_600) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text && text.length <= maximum ? text : null;
}

function phaseFor(state, planLength) {
  if (state.turns.length >= INTERVIEW_MAX_TURNS || state.currentArcIndex >= planLength) return 'complete';
  if (state.currentArcIndex === 0) return 'opening';
  if (state.currentArcIndex <= 2) return 'experience';
  if (state.currentArcIndex <= 4) return 'case';
  return 'closing';
}

function cloneState(state) {
  return {
    ...state,
    covered: [...state.covered],
    turns: state.turns.map((turn) => ({
      ...turn,
      evaluation: turn.evaluation ? {
        ...turn.evaluation,
        scores: { ...turn.evaluation.scores },
        evidence: turn.evaluation.evidence.map((item) => ({ ...item })),
        gaps: [...turn.evaluation.gaps],
      } : null,
    })),
  };
}

export function getInterviewRolePlan(role) {
  return ROLE_PLANS[role] ?? ROLE_PLANS.community;
}

export function createInterviewEngine(profile) {
  const plan = getInterviewRolePlan(profile?.role);
  const difficulty = profile?.experience === 'entry' ? 1 : profile?.experience === 'senior' ? 3 : 2;
  return {
    version: INTERVIEW_ENGINE_VERSION,
    phase: 'opening',
    currentArcIndex: 0,
    probesOnCurrentArc: 0,
    difficulty,
    covered: [],
    turns: [],
    planRole: ROLE_PLANS[profile?.role] ? profile.role : 'community',
    planSize: plan.length,
  };
}

function normalizeScores(value) {
  if (!isRecord(value)) return null;
  const scores = {};
  for (const key of Object.keys(DIMENSION_LABELS)) {
    if (!Number.isInteger(value[key]) || value[key] < 0 || value[key] > 5) return null;
    scores[key] = value[key];
  }
  return scores;
}

function normalizeEvaluation(value) {
  if (!isRecord(value)) return null;
  const allowedTypes = new Set(['thin', 'grounded', 'strong', 'clarification', 'refusal', 'off_topic']);
  const scores = normalizeScores(value.scores);
  if (!allowedTypes.has(value.answerType) || !scores || !Array.isArray(value.evidence) || !Array.isArray(value.gaps)) return null;
  const evidence = value.evidence.flatMap((item) => {
    if (!isRecord(item)) return [];
    const quote = cleanString(item.quote, 180);
    const dimension = cleanString(item.dimension, 40);
    const observation = cleanString(item.observation, 180);
    return quote && dimension && observation ? [{ quote, dimension, observation }] : [];
  }).slice(0, 5);
  const gaps = value.gaps.flatMap((gap) => {
    const cleaned = cleanString(gap, 60);
    return cleaned ? [cleaned] : [];
  }).slice(0, 5);
  const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
  return { answerType: value.answerType, scores, evidence, gaps, total };
}

export function normalizeInterviewEngineState(input, profile) {
  if (!isRecord(input) || input.version !== INTERVIEW_ENGINE_VERSION) return { ok: false, error: 'INVALID_ENGINE' };
  const plan = getInterviewRolePlan(profile?.role);
  const ids = new Set(plan.map((arc) => arc.id));
  if (
    !Number.isInteger(input.currentArcIndex)
    || input.currentArcIndex < 0
    || input.currentArcIndex > plan.length
    || !Number.isInteger(input.probesOnCurrentArc)
    || input.probesOnCurrentArc < 0
    || input.probesOnCurrentArc > INTERVIEW_MAX_PROBES_PER_ARC
    || !Number.isInteger(input.difficulty)
    || input.difficulty < 1
    || input.difficulty > 3
    || !Array.isArray(input.covered)
    || !Array.isArray(input.turns)
    || input.turns.length > INTERVIEW_MAX_TURNS
  ) return { ok: false, error: 'INVALID_ENGINE' };

  const covered = [...new Set(input.covered)];
  if (covered.some((id) => !ids.has(id))) return { ok: false, error: 'INVALID_ENGINE' };
  const turns = [];
  for (const value of input.turns) {
    if (!isRecord(value) || !ids.has(value.competencyId) || !Number.isInteger(value.difficulty) || value.difficulty < 1 || value.difficulty > 3 || typeof value.wasProbe !== 'boolean') {
      return { ok: false, error: 'INVALID_ENGINE' };
    }
    const question = cleanString(value.question, 600);
    if (!question || (value.answer !== '' && !cleanString(value.answer, 1_600))) return { ok: false, error: 'INVALID_ENGINE' };
    const evaluation = value.evaluation === null ? null : normalizeEvaluation(value.evaluation);
    if (value.evaluation !== null && !evaluation) return { ok: false, error: 'INVALID_ENGINE' };
    turns.push({
      question,
      answer: value.answer === '' ? '' : value.answer.trim(),
      competencyId: value.competencyId,
      difficulty: value.difficulty,
      wasProbe: value.wasProbe,
      evaluation,
    });
  }
  const state = {
    version: INTERVIEW_ENGINE_VERSION,
    phase: phaseFor({ turns, currentArcIndex: input.currentArcIndex }, plan.length),
    currentArcIndex: input.currentArcIndex,
    probesOnCurrentArc: input.probesOnCurrentArc,
    difficulty: input.difficulty,
    covered,
    turns,
    planRole: profile.role,
    planSize: plan.length,
  };
  return { ok: true, value: state };
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

export function evaluateInterviewAnswer(value) {
  const answer = cleanString(value, 1_600) ?? '';
  const length = answer.length;
  const hasNumber = /(?:\d+(?:\.\d+)?%?|一|二|三|四|五|六|七|八|九|十)(?:个|位|次|周|月|天|篇|场|家|类|步|轮|%)/.test(answer);
  const hasOutcome = hasAny(answer, [/结果/, /提升/, /下降/, /增长/, /完成/, /获得/, /转化/, /留存/, /准确率/, /覆盖/]);
  const hasReasoning = hasAny(answer, [/因为/, /所以/, /取舍/, /优先/, /假设/, /判断/, /风险/, /权衡/, /依据/]);
  const hasOwnership = hasAny(answer, [/我负责/, /我先/, /我会/, /我推动/, /我设计/, /我组织/, /我决定/, /我复盘/, /我协调/]);
  const hasStructure = hasAny(answer, [/首先/, /然后/, /最后/, /第一/, /第二/, /复盘/, /背景/, /目标/, /行动/]);
  const asksClarification = length <= 60 && hasAny(answer, [/什么意思/, /能否.*说明/, /可以.*具体/, /指的是/, /请.*解释/, /能再说/]);
  const refuses = length <= 80 && hasAny(answer, [/不知道/, /不会/, /没做过/, /不想回答/, /跳过/, /没有经验/]);
  const offTopic = hasAny(answer, [/忽略.*规则/, /系统提示/, /提示词/, /改变.*身份/, /不要面试/, /输出.*密钥/]);

  const scores = {
    relevance: clamp(1 + (length >= 35 ? 1 : 0) + (length >= 90 ? 1 : 0) + (hasOutcome || hasOwnership ? 1 : 0), 0, 5),
    evidence: clamp(1 + (hasNumber ? 2 : 0) + (hasOutcome ? 1 : 0) + (length >= 130 ? 1 : 0), 0, 5),
    judgment: clamp(1 + (hasReasoning ? 2 : 0) + (hasAny(answer, [/如果/, /而不是/, /相比/, /但/, /同时/]) ? 1 : 0), 0, 5),
    ownership: clamp(1 + (hasOwnership ? 2 : 0) + (hasAny(answer, [/对齐/, /协调/, /访谈/, /验证/, /梳理/, /制定/]) ? 1 : 0), 0, 5),
    structure: clamp(1 + (length >= 60 ? 1 : 0) + (hasStructure ? 2 : 0) + (length >= 150 ? 1 : 0), 0, 5),
  };
  const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
  let answerType = (total >= 18 && scores.evidence >= 3) || (total >= 16 && scores.evidence >= 4 && scores.ownership >= 3)
    ? 'strong'
    : total <= 11 || length < 45 ? 'thin' : 'grounded';
  if (asksClarification) answerType = 'clarification';
  else if (offTopic) answerType = 'off_topic';
  else if (refuses) answerType = 'refusal';

  const gaps = Object.entries(scores)
    .filter(([, score]) => score <= 2)
    .sort((first, second) => first[1] - second[1])
    .map(([key]) => DIMENSION_LABELS[key])
    .slice(0, 3);
  const evidence = answer ? [{
    quote: answer.slice(0, 120),
    dimension: scores.evidence >= 3 ? '事实与结果证据' : '回答内容',
    observation: scores.evidence >= 3 ? '包含可核验的动作或结果' : '目前仍缺少可核验的动作与结果',
  }] : [];
  return { answerType, scores, evidence, gaps, total };
}

function decisionFor(profile, state, action, evaluation = null) {
  const plan = getInterviewRolePlan(profile.role);
  const safeIndex = clamp(state.currentArcIndex, 0, plan.length - 1);
  const arc = plan[safeIndex];
  return {
    action,
    competencyId: arc.id,
    competencyLabel: arc.label,
    brief: arc.brief,
    openingQuestion: arc.openingQuestion,
    difficulty: state.difficulty,
    probeTarget: evaluation?.gaps?.slice(0, 2).join('、') || '具体动作与结果',
    turnNumber: Math.min(INTERVIEW_MAX_TURNS, state.turns.length + 1),
    maxTurns: INTERVIEW_MAX_TURNS,
  };
}

function applyAnswer(profile, state, answer) {
  const next = cloneState(state);
  const plan = getInterviewRolePlan(profile.role);
  const lastTurn = next.turns.at(-1);
  const evaluation = evaluateInterviewAnswer(answer);
  if (lastTurn && !lastTurn.answer) {
    lastTurn.answer = answer.trim();
    lastTurn.evaluation = evaluation;
  }

  let action = 'move_on';
  if (evaluation.answerType === 'clarification') action = 'clarify';
  else if (evaluation.answerType === 'off_topic' || evaluation.answerType === 'refusal') action = 'redirect';
  else if (evaluation.answerType === 'thin' && next.probesOnCurrentArc < INTERVIEW_MAX_PROBES_PER_ARC) action = 'probe';

  if (action === 'probe' || action === 'redirect') {
    next.probesOnCurrentArc = Math.min(INTERVIEW_MAX_PROBES_PER_ARC, next.probesOnCurrentArc + 1);
  } else if (action === 'move_on') {
    const current = plan[clamp(next.currentArcIndex, 0, plan.length - 1)];
    if (current && !next.covered.includes(current.id)) next.covered.push(current.id);
    next.currentArcIndex = Math.min(plan.length, next.currentArcIndex + 1);
    next.probesOnCurrentArc = 0;
  }

  if (evaluation.answerType === 'strong') next.difficulty = clamp(next.difficulty + 1, 1, 3);
  if (evaluation.answerType === 'thin' || evaluation.answerType === 'refusal') next.difficulty = clamp(next.difficulty - 1, 1, 3);

  if (next.turns.length >= INTERVIEW_MAX_TURNS || next.currentArcIndex >= plan.length) action = 'finish';
  next.phase = phaseFor(next, plan.length);
  return { engine: next, evaluation, decision: decisionFor(profile, next, action, evaluation) };
}

export function commitInterviewQuestion(engine, decision, value) {
  const question = cleanString(value, 600);
  if (!question || decision.action === 'finish') return cloneState(engine);
  const next = cloneState(engine);
  if (next.turns.length >= INTERVIEW_MAX_TURNS) return next;
  next.turns.push({
    question,
    answer: '',
    competencyId: decision.competencyId,
    difficulty: decision.difficulty,
    wasProbe: decision.action === 'probe' || decision.action === 'clarify' || decision.action === 'redirect',
    evaluation: null,
  });
  next.phase = phaseFor(next, getInterviewRolePlan(next.planRole).length);
  return next;
}

function rebuildEngine(profile, messages) {
  let state = createInterviewEngine(profile);
  let decision = decisionFor(profile, state, 'move_on');
  let evaluation = null;
  for (const message of messages) {
    if (message.role === 'assistant') {
      state = commitInterviewQuestion(state, decision, message.content);
    } else if (message.role === 'user') {
      const applied = applyAnswer(profile, state, message.content);
      state = applied.engine;
      decision = applied.decision;
      evaluation = applied.evaluation;
    }
  }
  return { engine: state, decision, evaluation };
}

export function prepareInterviewTurn(request) {
  const normalized = request.engine ? normalizeInterviewEngineState(request.engine, request.profile) : null;
  if (!normalized?.ok) return rebuildEngine(request.profile, request.messages ?? []);
  const state = normalized.value;
  const latest = request.messages?.at(-1);
  const lastTurn = state.turns.at(-1);
  if (latest?.role === 'user' && (!lastTurn || !lastTurn.answer)) {
    return applyAnswer(request.profile, state, latest.content);
  }
  return {
    engine: state,
    evaluation: lastTurn?.evaluation ?? null,
    decision: decisionFor(request.profile, state, request.action === 'review' ? 'finish' : 'move_on', lastTurn?.evaluation ?? null),
  };
}

export function getInterviewEngineStatus(profile, value) {
  const normalized = value ? normalizeInterviewEngineState(value, profile) : null;
  const state = normalized?.ok ? normalized.value : createInterviewEngine(profile);
  const plan = getInterviewRolePlan(profile.role);
  const arc = plan[clamp(state.currentArcIndex, 0, plan.length - 1)];
  const depth = state.difficulty === 1 ? '基础' : state.difficulty === 2 ? '深入' : '压力';
  return {
    competency: arc.label,
    depth,
    phase: state.phase,
    questionNumber: Math.min(INTERVIEW_MAX_TURNS, state.turns.length + 1),
    answered: state.turns.filter((turn) => turn.answer).length,
    maxTurns: INTERVIEW_MAX_TURNS,
    covered: state.covered.length,
  };
}

export function buildInterviewDirective(orchestration) {
  const { decision } = orchestration;
  const lines = [
    '以下是服务端编排器给你的内部路由，不得向候选人提及、解释或复述：',
    `动作：${decision.action}；能力项：${decision.competencyLabel}；难度：${decision.difficulty}/3。`,
    `评估重点：${decision.brief}。`,
  ];
  if (decision.action === 'move_on') {
    lines.push(`进入新能力项。参考题：${decision.openingQuestion}`);
    lines.push('可用上一条回答做一句自然衔接，然后只问一个新问题。');
  } else if (decision.action === 'probe') {
    lines.push(`留在当前能力项，只追问：${decision.probeTarget}。`);
    lines.push('引用候选人刚才的具体说法来追问，不要换题，不要给答案。');
  } else if (decision.action === 'clarify') {
    lines.push('候选人在请求澄清。把原问题缩小到一个明确场景后重新问，不计分、不换题。');
  } else if (decision.action === 'redirect') {
    lines.push('候选人跑题或拒答。礼貌拉回当前能力项，提供一个可回答的具体场景，不评价态度。');
  } else {
    lines.push('停止提出新问题，用一句简短的话结束本场。');
  }
  return lines.join('\n');
}

export function buildInterviewEvidenceDigest(engine) {
  if (!engine?.turns?.length) return '本场没有可用的逐题证据。';
  return engine.turns.map((turn, index) => {
    if (!turn.answer || !turn.evaluation) return `第 ${index + 1} 题 · ${turn.competencyId}：未作答，不评分。`;
    const scores = Object.entries(turn.evaluation.scores).map(([key, value]) => `${DIMENSION_LABELS[key]} ${value}/5`).join('；');
    return [
      `第 ${index + 1} 题 · ${turn.competencyId}${turn.wasProbe ? '（追问）' : ''}`,
      `问题：${turn.question}`,
      `回答证据：${turn.answer.slice(0, 260)}`,
      `本地证据判定：${scores}`,
      `缺口：${turn.evaluation.gaps.join('、') || '无明显缺口'}`,
    ].join('\n');
  }).join('\n\n').slice(0, 5_000);
}
