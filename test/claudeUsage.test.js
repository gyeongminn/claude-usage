const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readOAuth, parseUsage, fetchUsage, etaMinutes, etaFromWindow } = require('../src/main/claudeUsage');

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

test('USAGE_etaMinutes_증가추세_예측', () => {
  // 10분 사이 50%→60% (10%/10분=1%/분) → 100까지 40%p → 40분.
  const t0 = 1_000_000;
  assert.equal(etaMinutes(50, t0, 60, t0 + 10 * 60000), 40);
  assert.equal(etaMinutes(99, t0, 100, t0 + 60000), 0); // 이미 100
});

test('USAGE_etaMinutes_비증가_입력부족_null', () => {
  const t0 = 1_000_000;
  assert.equal(etaMinutes(60, t0, 60, t0 + 60000), null); // 정체
  assert.equal(etaMinutes(60, t0, 55, t0 + 60000), null); // 감소
  assert.equal(etaMinutes(50, t0, 60, t0), null); // dt<=0
  assert.equal(etaMinutes(NaN, t0, 60, t0 + 60000), null); // 입력부족
});

test('USAGE_etaFromWindow_첫폴링_평균burn추정', () => {
  // BL-01: 직전 샘플이 없는 첫 폴링도 윈도우 시작 이후 평균 burn으로 즉시 추정.
  const now = Date.parse('2026-06-29T03:00:00Z');
  // 5h(300분) 윈도우의 절반(150분) 경과 → 재시작은 now+150분. util 50% → 같은 속도로 50%p 더 = 150분.
  const resets = new Date(now + 150 * 60000).toISOString();
  assert.equal(etaFromWindow(50, resets, 300, now), 150);
  // 이미 100%면 0.
  assert.equal(etaFromWindow(100, resets, 300, now), 0);
});

test('USAGE_etaFromWindow_경계_null안전', () => {
  const now = Date.parse('2026-06-29T03:00:00Z');
  const resetFull = new Date(now + 300 * 60000).toISOString(); // 윈도우 시작=now → 경과 0
  assert.equal(etaFromWindow(50, resetFull, 300, now), null); // elapsed<=0
  assert.equal(etaFromWindow(0, new Date(now + 150 * 60000).toISOString(), 300, now), null); // util 0 → 추세 없음
  assert.equal(etaFromWindow(50, null, 300, now), null); // resetsAt 없음
  assert.equal(etaFromWindow(50, 'nope', 300, now), null); // 파싱 불가
});
