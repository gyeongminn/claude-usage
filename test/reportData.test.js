const { test } = require('node:test');
const assert = require('node:assert/strict');
const { monthSummary, momChangePct, tokenComposition, sessionStats } = require('../src/report/reportData');

const daily = [
  { period: '2026-05-01', totalCost: 10, totalTokens: 100 },
  { period: '2026-05-02', totalCost: 20, totalTokens: 200 },
  { period: '2026-05-03', totalCost: 30, totalTokens: 300 },
];

test('PDF020_monthSummary_총합·일평균', () => {
  const s = monthSummary(daily);
  assert.equal(s.totalCost, 60);
  assert.equal(s.totalTokens, 600);
  assert.equal(s.days, 3);
  assert.equal(s.avgDailyCost, 20); // 60/3
});

test('PDF020_monthSummary_빈_0', () => {
  const s = monthSummary([]);
  assert.deepEqual(s, { totalCost: 0, totalTokens: 0, days: 0, avgDailyCost: 0 });
});

test('PDF020_momChangePct_증가', () => {
  assert.equal(momChangePct(120, 100), 20); // +20%
});

test('PDF020_momChangePct_감소', () => {
  assert.equal(momChangePct(80, 100), -20);
});

test('PDF020_momChangePct_전월0_null', () => {
  assert.equal(momChangePct(50, 0), null); // 전월 데이터 없음 → 비교 불가
  assert.equal(momChangePct(50, -10), null); // 음수 전월도 비교 불가
});

test('PDF020_monthSummary_비배열_0안전', () => {
  assert.deepEqual(monthSummary(null), { totalCost: 0, totalTokens: 0, days: 0, avgDailyCost: 0 });
  assert.deepEqual(monthSummary(undefined), { totalCost: 0, totalTokens: 0, days: 0, avgDailyCost: 0 });
});

test('PDF020_momChangePct_반올림_1자리', () => {
  assert.equal(momChangePct(133, 100), 33); // 33%
  assert.equal(momChangePct(112.5, 100), 12.5);
});

// PDF-040 p3: 월 토큰 구성(입력·출력·캐시생성·캐시읽기) 합산
const compDaily = [
  { inputTokens: 100, outputTokens: 10, cacheCreationTokens: 200, cacheReadTokens: 700 },
  { inputTokens: 50, outputTokens: 5, cacheCreationTokens: 100, cacheReadTokens: 300 },
];

test('PDF040_tokenComposition_4축합산', () => {
  const c = tokenComposition(compDaily);
  assert.deepEqual(c, { input: 150, output: 15, cacheCreate: 300, cacheRead: 1000 });
});

test('PDF040_tokenComposition_비배열_0안전', () => {
  assert.deepEqual(tokenComposition(null), { input: 0, output: 0, cacheCreate: 0, cacheRead: 0 });
});

// PDF-040 p4: 세션 통계 = 총 세션 수 + 최고 비용 Top 3(§7)
const sessions = [
  { sessionId: 'a', project: 'p1', totalCost: 30, totalTokens: 300 },
  { sessionId: 'b', project: 'p2', totalCost: 50, totalTokens: 500 },
  { sessionId: 'c', project: 'p3', totalCost: 10, totalTokens: 100 },
  { sessionId: 'd', project: 'p4', totalCost: 40, totalTokens: 400 },
];

test('PDF040_sessionStats_총수와Top3비용내림차순', () => {
  const s = sessionStats(sessions);
  assert.equal(s.totalSessions, 4);
  assert.equal(s.top3.length, 3);
  assert.deepEqual(s.top3.map((x) => x.totalCost), [50, 40, 30]); // b,d,a
});

test('PDF040_sessionStats_3개미만_있는만큼', () => {
  const s = sessionStats([{ sessionId: 'x', totalCost: 7 }]);
  assert.equal(s.totalSessions, 1);
  assert.equal(s.top3.length, 1);
});

test('PDF040_sessionStats_비배열_0안전', () => {
  assert.deepEqual(sessionStats(undefined), { totalSessions: 0, top3: [] });
});
