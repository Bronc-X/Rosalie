export const INITIAL_INVITATION = Object.freeze({
  choice: 'pending',
  noCount: 0,
  message: '十天后，是否恢复线下双人作业？',
  reason: null,
});

const NO_PROMPTS = [
  {
    message: '操作存疑，请复核。',
    reason: '系统检测到误触，正确选项仍在左边。',
  },
  {
    message: '审批未通过，请重新提交。',
    reason: '理由 01：两个人不见面，项目无法验收。',
  },
  {
    message: '“否”的本月额度已用完。',
    reason: '理由 02：有个历史遗留问题，必须当面解决。',
  },
  {
    message: '最后一次人工申诉。',
    reason: '理由 03：历史遗留问题本人正在左边等你。',
  },
];

export function respondToInvitation(current, answer) {
  if (answer === 'yes') {
    return {
      choice: 'yes',
      noCount: current.noCount,
      message: '收到，十天后恢复双人作业。',
      reason: null,
    };
  }

  const noCount = current.noCount + 1;
  const prompt = NO_PROMPTS[Math.min(noCount - 1, NO_PROMPTS.length - 1)];
  return {
    choice: 'pending',
    noCount,
    message: prompt.message,
    reason: prompt.reason,
  };
}
