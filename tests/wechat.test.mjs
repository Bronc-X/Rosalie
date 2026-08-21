import test from 'node:test';
import assert from 'node:assert/strict';

import { createWechatSignature, normalizeShareUrl } from '../lib/wechat.mjs';

test('normalizes a canonical share URL and removes the fragment', () => {
  assert.equal(
    normalizeShareUrl('https://rosalie.toni.asia/path?from=wechat#surprise'),
    'https://rosalie.toni.asia/path?from=wechat',
  );
});

test('rejects non-https and foreign share origins', () => {
  assert.throws(() => normalizeShareUrl('http://rosalie.toni.asia/'), /not allowed/);
  assert.throws(() => normalizeShareUrl('https://toni.asia/'), /not allowed/);
  assert.throws(() => normalizeShareUrl('https://evil.example/'), /not allowed/);
});

test('creates the canonical SHA-1 signature used by the WeChat JS-SDK', async () => {
  const signature = await createWechatSignature({
    jsapiTicket: 'sM4AOVdWfPE4DxkXGEs8VM1AGC8_4WCGYqzJjvZiG3CN0m5uHMDzZm-qSsZX5oKmfHq8WJO2vP9Z72zTOaW',
    nonceStr: 'Wm3WZYTPz0wzccnW',
    timestamp: 1414587457,
    url: 'http://mp.weixin.qq.com?params=value',
  });

  assert.equal(signature, 'e61b679474057ccc6bc925a3867cf3997c8cf949');
});
