const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cacheHitRate, buildVerdict } = require('../src/report/verdict');

// PDF-030: 캐시 적중률 = cacheRead / (input + cacheCreation + cacheRead), 정수% 반올림
test('PDF030_cacheHitRate_비율계산', () => {
  // read 730, input 100, creation 170 → 730/1000 = 73%
  assert.equal(cacheHitRate({ inputTokens: 100, cacheCreationTokens: 170, cacheReadTokens: 730 }), 73);
});

test('PDF030_cacheHitRate_분모0_0안전', () => {
  assert.equal(cacheHitRate({ inputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 }), 0);
  assert.equal(cacheHitRate(null), 0);
});

// 전월 대비 — EN
test('PDF030_buildVerdict_증가_EN', () => {
  const s = buildVerdict({ momPct: 12, cacheHitRate: 73 }, 'en');
  assert.match(s, /Up 12% from last month\./);
  assert.match(s, /73% cache hit rate/);
});

test('PDF030_buildVerdict_감소_EN', () => {
  const s = buildVerdict({ momPct: -8.5, cacheHitRate: 40 }, 'en');
  assert.match(s, /Down 8\.5% from last month\./);
});

test('PDF030_buildVerdict_동일_EN', () => {
  const s = buildVerdict({ momPct: 0, cacheHitRate: 50 }, 'en');
  assert.match(s, /About the same as last month\./);
});

test('PDF030_buildVerdict_첫달_EN', () => {
  const s = buildVerdict({ momPct: null, cacheHitRate: 60 }, 'en');
  assert.match(s, /first tracked month/);
});

// 전월 대비 — KO
test('PDF030_buildVerdict_증가_KO', () => {
  const s = buildVerdict({ momPct: 12, cacheHitRate: 73 }, 'ko');
  assert.match(s, /지난달보다 12% 늘었어요\./);
  assert.match(s, /캐시 적중률 73%로 비용을 아꼈습니다\./);
});

test('PDF030_buildVerdict_감소_KO', () => {
  const s = buildVerdict({ momPct: -8.5, cacheHitRate: 40 }, 'ko');
  assert.match(s, /지난달보다 8\.5% 줄었어요\./);
});

// 캐시 적중률 0이면 캐시 문장 생략
test('PDF030_buildVerdict_캐시0_문장생략', () => {
  const s = buildVerdict({ momPct: 12, cacheHitRate: 0 }, 'en');
  assert.match(s, /Up 12% from last month\./);
  assert.doesNotMatch(s, /cache hit rate/);
});

// 미지원 로케일 → en 폴백(§10)
test('PDF030_buildVerdict_미지원로케일_en폴백', () => {
  const s = buildVerdict({ momPct: 12, cacheHitRate: 73 }, 'ja');
  assert.match(s, /Up 12% from last month\./);
});
