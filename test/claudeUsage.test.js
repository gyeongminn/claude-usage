const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readOAuth, parseUsage, fetchUsage } = require('../src/main/claudeUsage');

// 실제 /api/oauth/usage 응답 형태(검증된 실데이터 구조).
const SAMPLE = {
  five_hour: { utilization: 86.0, resets_at: '2026-06-29T04:49:59.894087+00:00' },
  seven_day: { utilization: 79.0, resets_at: '2026-06-29T04:59:59.894118+00:00' },
  seven_day_sonnet: { utilization: 0.0, resets_at: null },
  seven_day_opus: null,
};

test('USAGE_parseUsage_5h_7d_추출', () => {
  const u = parseUsage(SAMPLE);
  assert.equal(u.fiveHour.utilization, 86.0);
  assert.equal(u.fiveHour.resetsAt, '2026-06-29T04:49:59.894087+00:00');
  assert.equal(u.sevenDay.utilization, 79.0);
  assert.equal(u.sevenDaySonnet.utilization, 0.0);
  assert.equal(u.sevenDayOpus, null); // 없는 윈도우는 null
});

test('USAGE_parseUsage_비정상_null안전', () => {
  assert.equal(parseUsage(null), null);
  assert.equal(parseUsage('nope'), null);
  const u = parseUsage({ five_hour: { utilization: 'x' } });
  assert.equal(u.fiveHour, null); // 숫자 아니면 null
});

test('USAGE_readOAuth_토큰추출', () => {
  const file = () => JSON.stringify({ claudeAiOauth: { accessToken: 'tok', expiresAt: 123, subscriptionType: 'max' } });
  const c = readOAuth(file, 'x');
  assert.equal(c.accessToken, 'tok');
  assert.equal(c.expiresAt, 123);
  assert.equal(c.subscriptionType, 'max');
});

test('USAGE_readOAuth_없음_손상_null', () => {
  assert.equal(readOAuth(() => '{}', 'x'), null); // claudeAiOauth 없음
  assert.equal(readOAuth(() => '{"claudeAiOauth":{}}', 'x'), null); // accessToken 없음
  assert.equal(readOAuth(() => { throw new Error('ENOENT'); }, 'x'), null); // 파일 없음
  assert.equal(readOAuth(() => 'not json', 'x'), null);
});

test('USAGE_fetchUsage_200_파싱', async () => {
  const cred = { accessToken: 'tok', expiresAt: 9e15 };
  let calledHeaders;
  const fetchImpl = async (url, opts) => {
    calledHeaders = opts.headers;
    return { ok: true, json: async () => SAMPLE };
  };
  const u = await fetchUsage({ cred, fetchImpl, now: 1 });
  assert.equal(u.fiveHour.utilization, 86.0);
  assert.equal(u.sevenDay.utilization, 79.0);
  // 필수 헤더 확인(없으면 공격적 429).
  assert.match(calledHeaders.Authorization, /^Bearer /);
  assert.equal(calledHeaders['anthropic-beta'], 'oauth-2025-04-20');
  assert.match(calledHeaders['User-Agent'], /^claude-code\//);
});

test('USAGE_fetchUsage_만료토큰_호출안함', async () => {
  let called = false;
  const fetchImpl = async () => { called = true; return { ok: true, json: async () => SAMPLE }; };
  const u = await fetchUsage({ cred: { accessToken: 't', expiresAt: 1000 }, fetchImpl, now: 2000 });
  assert.equal(u, null);
  assert.equal(called, false); // 만료면 네트워크 호출 자체를 안 함
});

test('USAGE_fetchUsage_429_네트워크실패_null', async () => {
  const cred = { accessToken: 't', expiresAt: 9e15 };
  assert.equal(await fetchUsage({ cred, fetchImpl: async () => ({ ok: false, status: 429 }), now: 1 }), null);
  assert.equal(await fetchUsage({ cred, fetchImpl: async () => { throw new Error('offline'); }, now: 1 }), null);
});

test('USAGE_fetchUsage_토큰없음_null', async () => {
  const u = await fetchUsage({ cred: null, fetchImpl: async () => ({ ok: true, json: async () => SAMPLE }), now: 1 });
  assert.equal(u, null);
});
