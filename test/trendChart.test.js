const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildTrendOption } = require('../src/renderer/trendChart');
const { makeEchartsTheme, TOKENS } = require('../src/renderer/echartsTheme');

const daily = [
  { period: '2026-06-24', totalCost: 10.5, totalTokens: 1000 },
  { period: '2026-06-25', totalCost: 22.0, totalTokens: 3000 },
  { period: '2026-06-26', totalCost: 8.25, totalTokens: 500 },
];
const theme = makeEchartsTheme(TOKENS);

test('DSH030_xAxis_날짜', () => {
  const opt = buildTrendOption(daily, 'cost', theme);
  assert.deepEqual(opt.xAxis.data, ['2026-06-24', '2026-06-25', '2026-06-26']);
});

test('DSH030_cost_메트릭_비용시리즈', () => {
  const opt = buildTrendOption(daily, 'cost', theme);
  assert.deepEqual(opt.series[0].data, [10.5, 22.0, 8.25]);
});

test('DSH030_tokens_메트릭_토큰시리즈', () => {
  const opt = buildTrendOption(daily, 'tokens', theme);
  assert.deepEqual(opt.series[0].data, [1000, 3000, 500]);
});

test('DSH030_라인_영역_accent', () => {
  const opt = buildTrendOption(daily, 'cost', theme);
  assert.equal(opt.series[0].type, 'line');
  assert.equal(opt.series[0].lineStyle.color, TOKENS.accent);
  assert.match(opt.series[0].areaStyle.color, /rgba\(/); // 저알파 영역
});

test('DSH030_빈데이터_안전', () => {
  const opt = buildTrendOption([], 'cost', theme);
  assert.deepEqual(opt.xAxis.data, []);
  assert.deepEqual(opt.series[0].data, []);
});

test('DSH030_잘못된메트릭_cost폴백', () => {
  const opt = buildTrendOption(daily, 'bogus', theme);
  assert.deepEqual(opt.series[0].data, [10.5, 22.0, 8.25]); // 기본 cost
});
