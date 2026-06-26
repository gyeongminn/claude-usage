const { test } = require('node:test');
const assert = require('node:assert/strict');
const { burnColor, gaugeState, clampPct } = require('../src/renderer/burnGauge');

test('DSH020_평상시_accent', () => {
  assert.equal(gaugeState(0), 'normal');
  assert.equal(gaugeState(50), 'normal');
  assert.equal(gaugeState(84.9), 'normal');
});

test('DSH020_85이상_warn', () => {
  assert.equal(gaugeState(85), 'warn');
  assert.equal(gaugeState(94.9), 'warn');
});

test('DSH020_95이상_over', () => {
  assert.equal(gaugeState(95), 'over');
  assert.equal(gaugeState(100), 'over');
  assert.equal(gaugeState(120), 'over'); // 한도 초과
});

test('DSH020_burnColor_상태별토큰색', () => {
  const tk = { accent: '#3182F6', warn: '#FFC94D', over: '#F04452' };
  assert.equal(burnColor(50, tk), '#3182F6'); // 평상시 accent(항상-노랑 금지)
  assert.equal(burnColor(85, tk), '#FFC94D');
  assert.equal(burnColor(99, tk), '#F04452');
});

test('DSH020_clampPct_범위제한', () => {
  assert.equal(clampPct(-5), 0);
  assert.equal(clampPct(150), 100);
  assert.equal(clampPct(42.5), 42.5);
});

test('DSH020_clampPct_비정상입력_0', () => {
  assert.equal(clampPct(undefined), 0);
  assert.equal(clampPct(NaN), 0);
});

test('DSH020_clampPct_문자열_숫자강제', () => {
  assert.equal(clampPct('50'), 50); // 숫자형 문자열 → 변환
  assert.equal(clampPct('abc'), 0); // 비수치 문자열 → 0
  assert.equal(clampPct('200'), 100); // 변환 후 clamp
});
