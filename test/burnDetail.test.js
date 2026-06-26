const { test } = require('node:test');
const assert = require('node:assert/strict');
const { blockTimePct } = require('../src/main/aggregate');
const { shapeBurn } = require('../src/main/aggregate');

const START = '2026-06-26T00:00:00Z';
const END = '2026-06-26T05:00:00Z'; // 5시간 블록
const at = (h) => Date.parse(START) + h * 3600 * 1000;

test('DAT030_blockTimePct_절반경과_50', () => {
  assert.equal(blockTimePct(START, END, at(2.5)), 50);
});

test('DAT030_blockTimePct_시작_0', () => {
  assert.equal(blockTimePct(START, END, at(0)), 0);
});

test('DAT030_blockTimePct_초과_100상한', () => {
  assert.equal(blockTimePct(START, END, at(7)), 100); // 블록 지났어도 100
});

test('DAT030_blockTimePct_음수경과_0하한', () => {
  assert.equal(blockTimePct(START, END, at(-1)), 0);
});

test('DAT030_blockTimePct_잘못된시각_0', () => {
  assert.equal(blockTimePct('nope', END, at(1)), 0);
  assert.equal(blockTimePct(START, START, at(1)), 0); // end<=start
});

test('DAT030_shapeBurn_now주입_timePct·remaining', () => {
  const block = {
    isActive: true,
    startTime: START,
    endTime: END,
    costUSD: 50,
    burnRate: { costPerHour: 20, tokensPerMinute: 1000 },
    projection: { totalCost: 100, remainingMinutes: 90 },
  };
  const b = shapeBurn(block, at(2.5));
  assert.equal(b.timePct, 50); // 시간 소진율(Clock 주입)
  assert.equal(b.remainingMinutes, 90);
  assert.equal(b.pct, 50); // 비용 소진율(기존) 유지
});

test('DAT030_shapeBurn_now없음_timePct0', () => {
  const b = shapeBurn({ startTime: START, endTime: END, costUSD: 10, burnRate: {}, projection: { totalCost: 20 } });
  assert.equal(b.timePct, 0); // now 미주입 시 안전
  assert.equal(b.pct, 50);
});

test('DAT030_shapeBurn_블록없음_timePct0', () => {
  const b = shapeBurn(null, at(1));
  assert.equal(b.timePct, 0);
  assert.equal(b.remainingMinutes, 0);
});
