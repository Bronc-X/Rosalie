import test from 'node:test';
import assert from 'node:assert/strict';

const invitation = await import('../lib/invitation.mjs').catch(() => ({}));

test('the invitation opens as an absurd work request', () => {
  assert.equal(
    invitation.INITIAL_INVITATION?.message,
    '十天后，是否恢复线下双人作业？',
  );
});

test('the first no is treated as a suspicious operation', () => {
  assert.equal(typeof invitation.respondToInvitation, 'function');

  const result = invitation.respondToInvitation(
    { choice: 'pending', noCount: 0, message: '回来以后，要不要见一面？', reason: null },
    'no',
  );

  assert.deepEqual(result, {
    choice: 'pending',
    noCount: 1,
    message: '操作存疑，请复核。',
    reason: '系统检测到误触，正确选项仍在左边。',
  });
});

test('the second no becomes a rejected approval request', () => {
  assert.equal(typeof invitation.respondToInvitation, 'function');

  const result = invitation.respondToInvitation(
    { choice: 'pending', noCount: 1, message: '操作存疑，请复核。', reason: '系统检测到误触，正确选项仍在左边。' },
    'no',
  );

  assert.equal(result.noCount, 2);
  assert.equal(result.message, '审批未通过，请重新提交。');
  assert.equal(result.reason, '理由 01：两个人不见面，项目无法验收。');
});

test('the third no reveals a historical issue that requires an in-person fix', () => {
  assert.equal(typeof invitation.respondToInvitation, 'function');

  const result = invitation.respondToInvitation(
    { choice: 'pending', noCount: 2, message: '审批未通过，请重新提交。', reason: null },
    'no',
  );

  assert.equal(result.choice, 'pending');
  assert.equal(result.noCount, 3);
  assert.equal(result.message, '“否”的本月额度已用完。');
  assert.equal(result.reason, '理由 02：有个历史遗留问题，必须当面解决。');
});

test('the final prompt remains available without removing the no choice', () => {
  assert.equal(typeof invitation.respondToInvitation, 'function');

  const result = invitation.respondToInvitation(
    { choice: 'pending', noCount: 8, message: '“否”的本月额度已用完。', reason: null },
    'no',
  );

  assert.equal(result.choice, 'pending');
  assert.equal(result.noCount, 9);
  assert.equal(result.message, '最后一次人工申诉。');
  assert.equal(result.reason, '理由 03：历史遗留问题本人正在左边等你。');
});

test('yes starts the departure celebration and preserves the story so far', () => {
  assert.equal(typeof invitation.respondToInvitation, 'function');

  const result = invitation.respondToInvitation(
    { choice: 'pending', noCount: 2, message: '审批未通过，请重新提交。', reason: '理由 01：两个人不见面，项目无法验收。' },
    'yes',
  );

  assert.deepEqual(result, {
    choice: 'yes',
    noCount: 2,
    message: '收到，十天后恢复双人作业。',
    reason: null,
  });
});
