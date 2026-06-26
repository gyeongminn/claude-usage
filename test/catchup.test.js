const { test } = require('node:test');
const assert = require('node:assert/strict');
const { missingMonths } = require('../src/main/catchup');

// 기동 시 catch-up(OPS-040): 지난달까지 중 reports에 PDF 없는 달 산출(Clock 주입, UTC §10).
// existing: 이미 있는 파일명 집합/배열(reportFileName 형식 YYYY-MM.pdf). now: 기동 시각 ms.
// 기본 lookback=지난달 1개월만(매월 1일 누락 안전망). 여러 달 누락 대비 lookback 인자.

test('OPS040_지난달없음→지난달1개생성대상', () => {
  const now = Date.UTC(2026, 6, 3, 9, 0); // 2026-07-03 → 지난달 6월
  assert.deepEqual(missingMonths([], now), [{ year: 2026, month: 6 }]);
});

test('OPS040_지난달이미있음→빈배열', () => {
  const now = Date.UTC(2026, 6, 3, 9, 0);
  assert.deepEqual(missingMonths(['2026-06.pdf'], now), []);
});

test('OPS040_연초_지난달=전년12월', () => {
  const now = Date.UTC(2026, 0, 2, 0, 0); // 2026-01-02 → 지난달 2025-12
  assert.deepEqual(missingMonths([], now), [{ year: 2025, month: 12 }]);
});

test('OPS040_여러달누락_lookback3_오래된달부터', () => {
  const now = Date.UTC(2026, 6, 3, 0, 0); // 지난달=6월. lookback3 → 4·5·6월
  // 5월만 존재 → 4·6월 누락, 오래된 순.
  assert.deepEqual(missingMonths(['2026-05.pdf'], now, 3), [
    { year: 2026, month: 4 },
    { year: 2026, month: 6 },
  ]);
});

test('OPS040_lookback_연경계_역산', () => {
  const now = Date.UTC(2026, 1, 5, 0, 0); // 2026-02-05 지난달=1월. lookback3 → 2025-11·12·2026-01
  assert.deepEqual(missingMonths([], now, 3), [
    { year: 2025, month: 11 },
    { year: 2025, month: 12 },
    { year: 2026, month: 1 },
  ]);
});

test('OPS040_Set입력도지원', () => {
  const now = Date.UTC(2026, 6, 3, 0, 0);
  assert.deepEqual(missingMonths(new Set(['2026-06.pdf']), now), []);
});
