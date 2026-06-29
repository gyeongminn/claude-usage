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

test('DSH030_막대_accent', () => {
  // 사용자 요청: 일별 추세는 스무딩 라인이 아니라 막대그래프.
  const opt = buildTrendOption(daily, 'cost', theme);
  assert.equal(opt.series[0].type, 'bar');
  assert.equal(opt.series[0].itemStyle.color, TOKENS.accent);
  assert.deepEqual(opt.series[0].itemStyle.borderRadius, [4, 4, 0, 0]); // 상단만 둥글게(토스 톤)
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

// UX-030: 비용 축은 $ 단위 명시, 토큰 축은 K/M/B 축약(긴 숫자 방지).
test('UX030_cost_yAxis_달러단위_정수', () => {
  const opt = buildTrendOption(daily, 'cost', theme);
  assert.equal(opt.yAxis.axisLabel.formatter(1395), '$1,395'); // 축은 소수 없이 간결
  assert.equal(opt.yAxis.axisLabel.formatter(40), '$40');
});

test('UX030_tokens_yAxis_KMB축약', () => {
  const opt = buildTrendOption(daily, 'tokens', theme);
  assert.equal(opt.yAxis.axisLabel.formatter(123000000), '123M'); // Intl 컴팩트(꼬리 .0 제거)
  assert.equal(opt.yAxis.axisLabel.formatter(46700), '46.7K');
});

test('UX030_cost_tooltip_달러_소수2', () => {
  const opt = buildTrendOption(daily, 'cost', theme);
  assert.equal(opt.tooltip.valueFormatter(91.4), '$91.40');
});

test('UX030_tokens_tooltip_축약', () => {
  const opt = buildTrendOption(daily, 'tokens', theme);
  assert.equal(opt.tooltip.valueFormatter(46700), '46.7K');
});
