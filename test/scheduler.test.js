const { test } = require('node:test');
const assert = require('node:assert/strict');
const { nextMonthlyRun, prevMonthYM, scheduleMonthly } = require('../src/main/scheduler');

// 시각·시간 무관 결정성을 위해 Clock(now ms) 주입(UTC 기준 계산, §10/OPEN[05]).
// nextMonthlyRun(now): now '이후'의 가장 가까운 '다음 달 1일 00:00 UTC' ms.
test('OPS030_nextMonthlyRun_월중간→다음달1일', () => {
  const now = Date.UTC(2026, 5, 15, 10, 30); // 2026-06-15 10:30 UTC (month idx 5=June)
  const next = nextMonthlyRun(now);
  assert.equal(next, Date.UTC(2026, 6, 1, 0, 0, 0, 0)); // 2026-07-01 00:00
});

test('OPS030_nextMonthlyRun_연말경계→다음해1월', () => {
  const now = Date.UTC(2026, 11, 20, 0, 0); // 2026-12-20
  assert.equal(nextMonthlyRun(now), Date.UTC(2027, 0, 1, 0, 0, 0, 0)); // 2027-01-01
});

test('OPS030_nextMonthlyRun_정확히1일자정→다음달(이미발화시점)', () => {
  const now = Date.UTC(2026, 5, 1, 0, 0, 0, 0); // 정확히 6/1 00:00
  // 같은 시각이면 다음 달로(중복 발화 방지) — 7/1.
  assert.equal(nextMonthlyRun(now), Date.UTC(2026, 6, 1, 0, 0, 0, 0));
});

// prevMonthYM(now): 'now' 시점 기준 지난달 {year, month}(month 1~12). 보고서 대상.
test('OPS030_prevMonthYM_지난달', () => {
  assert.deepEqual(prevMonthYM(Date.UTC(2026, 6, 1, 0, 0)), { year: 2026, month: 6 }); // 7월→6월
});

test('OPS030_prevMonthYM_연초→전년12월', () => {
  assert.deepEqual(prevMonthYM(Date.UTC(2026, 0, 5, 0, 0)), { year: 2025, month: 12 });
});

// scheduleMonthly: 발화 시 onFire(prevYM) 호출 + 재무장. setTimeout/clearTimeout 주입.
test('OPS030_scheduleMonthly_발화시_지난달로_onFire+재무장', () => {
  let timers = [];
  let nextId = 1;
  const fakeSet = (fn, ms) => {
    const id = nextId++;
    timers.push({ id, fn, ms });
    return id;
  };
  const cleared = [];
  const fakeClear = (id) => cleared.push(id);
  const fired = [];
  const now = Date.UTC(2026, 5, 15, 0, 0); // 6/15 → 다음 발화 7/1
  const handle = scheduleMonthly({
    onFire: (ym) => fired.push(ym),
    now: () => now,
    setTimer: fakeSet,
    clearTimer: fakeClear,
  });
  // 첫 무장: 7/1까지의 지연으로 1개 타이머
  assert.equal(timers.length, 1);
  assert.equal(timers[0].ms, Date.UTC(2026, 6, 1, 0, 0) - now);
  // 타이머 발화 시뮬레이트(발화 시점엔 7/1이 now가 되므로 지난달=6월)
  // scheduler는 발화 시 자기 now()로 prevMonthYM 계산 — now를 7/1로 바꿔 발화
  // 간단화를 위해 onFire 인자만 검증: 발화 콜백이 prevMonthYM(fireTime) 전달
  timers[0].fn();
  assert.equal(fired.length, 1);
  // 발화 시점 now()는 여전히 6/15(주입 고정) → 지난달 5월. 재무장으로 타이머 2개째.
  assert.deepEqual(fired[0], { year: 2026, month: 5 });
  assert.equal(timers.length, 2); // 재무장됨
  // cancel 가능
  handle.cancel();
  assert.ok(cleared.length >= 1);
});
