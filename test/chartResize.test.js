const test = require('node:test');
const assert = require('node:assert/strict');
const { resizeAll, makeDebounced } = require('../src/renderer/chartResize');

// UX-010: 창 resize 시 ECharts 인스턴스들을 따라 리사이즈(레이아웃 추종 버그 수정).
test('UX010_resizeAll_각_차트_resize_1회_호출', () => {
  let a = 0;
  let b = 0;
  resizeAll([{ resize: () => a++ }, { resize: () => b++ }]);
  assert.equal(a, 1);
  assert.equal(b, 1);
});

test('UX010_resizeAll_null_미초기화_resize없음_건너뜀', () => {
  let n = 0;
  // null·undefined·resize 없는 객체는 무시, 정상 인스턴스만 호출(첫 집계 전 미init 안전).
  resizeAll([null, undefined, {}, { resize: () => n++ }]);
  assert.equal(n, 1);
});

test('UX010_makeDebounced_연속호출은_1회로_모임', async () => {
  let calls = 0;
  const d = makeDebounced(() => calls++, 20);
  d();
  d();
  d();
  assert.equal(calls, 0); // 디바운스 창 안 — 아직 미발화
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(calls, 1); // 마지막 호출 기준 1회로 합쳐짐
});
