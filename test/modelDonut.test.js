const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildDonutOption, shortModelName } = require('../src/renderer/modelDonut');
const { makeEchartsTheme, TOKENS } = require('../src/renderer/echartsTheme');

const theme = makeEchartsTheme(TOKENS);
const breakdowns = [
  { modelName: 'claude-opus-4-8', cost: 90 },
  { modelName: 'claude-haiku-4-5-20251001', cost: 10 },
];

test('DSH040_도넛_모델별_데이터', () => {
  const opt = buildDonutOption(breakdowns, theme);
  const data = opt.series[0].data;
  assert.equal(data.length, 2);
  assert.equal(data[0].value, 90);
  assert.equal(data[1].value, 10);
});

test('DSH040_도넛_링타입(반경배열)', () => {
  const opt = buildDonutOption(breakdowns, theme);
  assert.ok(Array.isArray(opt.series[0].radius)); // 도넛 = 내경>0
  assert.notEqual(opt.series[0].radius[0], '0%');
});

test('DSH040_도넛_팔레트_테마색', () => {
  const opt = buildDonutOption(breakdowns, theme);
  assert.equal(opt.color[0], TOKENS.accent); // 기본팔레트 금지
});

test('DSH040_shortModelName_가독화', () => {
  assert.equal(shortModelName('claude-opus-4-8'), 'Opus 4.8');
  assert.equal(shortModelName('claude-haiku-4-5-20251001'), 'Haiku 4.5');
  assert.equal(shortModelName('claude-sonnet-4-6'), 'Sonnet 4.6');
});

test('DSH040_shortModelName_미매칭_원본', () => {
  assert.equal(shortModelName('gpt-5-codex'), 'gpt-5-codex');
});

test('DSH040_빈breakdown_안전', () => {
  const opt = buildDonutOption([], theme);
  assert.deepEqual(opt.series[0].data, []);
});

test('DSH040_cost누락_0', () => {
  const opt = buildDonutOption([{ modelName: 'claude-opus-4-8' }], theme);
  assert.equal(opt.series[0].data[0].value, 0); // undefined cost → 0
});

// UX-031: 도넛 툴팁 비용 $ 표기(trend·바와 일관). 호버 시 모델별 비용 가독.
test('UX031_donut_툴팁_달러', () => {
  const opt = buildDonutOption(breakdowns, theme);
  assert.equal(opt.tooltip.trigger, 'item');
  assert.equal(opt.tooltip.valueFormatter(88.2), '$88.20');
});
