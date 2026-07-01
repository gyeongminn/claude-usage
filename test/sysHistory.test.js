const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pushSample, toSeries, CAP } = require('../src/renderer/sysHistory');

// WIDGET-030(§13): system 타일 그래프 모드의 지연 ring-buffer(경계·회전) + 지표 시계열 추출.

test('WIDGET030_pushSample_cap초과_가장오래된것_드롭_회전', () => {
  let buf = [];
  for (let i = 1; i <= 5; i++) buf = pushSample(buf, { cpu: i }, 3);
  assert.deepEqual(buf.map((s) => s.cpu), [3, 4, 5]); // 마지막 3개만(1,2 드롭)
});

test('WIDGET030_pushSample_원본불변_새배열', () => {
  const a = [{ cpu: 1 }];
  const b = pushSample(a, { cpu: 2 }, 3);
  assert.equal(a.length, 1); // 원본 안 건드림
  assert.deepEqual(b.map((s) => s.cpu), [1, 2]);
  assert.notEqual(a, b);
});

test('WIDGET030_pushSample_비배열_빈으로_시작', () => {
  assert.deepEqual(pushSample(null, { cpu: 9 }, 3), [{ cpu: 9 }]);
  assert.deepEqual(pushSample(undefined, { cpu: 9 }, 3), [{ cpu: 9 }]);
});

test('WIDGET030_pushSample_기본CAP_60', () => {
  assert.equal(CAP, 60);
  let buf = [];
  for (let i = 0; i < 80; i++) buf = pushSample(buf, { cpu: i }); // cap 생략 → 기본 CAP
  assert.equal(buf.length, 60);
  assert.equal(buf[0].cpu, 20); // 앞 20개 드롭(80-60)
  assert.equal(buf[59].cpu, 79);
});

test('WIDGET030_toSeries_지표추출_null안전', () => {
  const buf = [{ cpu: 10, ram: 70, gpu: 5 }, { cpu: 20, ram: 71, gpu: null }, { cpu: 30, ram: 72 }];
  assert.deepEqual(toSeries(buf, 'cpu'), [10, 20, 30]);
  assert.deepEqual(toSeries(buf, 'gpu'), [5, null, null]); // null·미존재 → null(ECharts 갭)
  assert.deepEqual(toSeries(null, 'cpu'), []); // 비배열 안전
});
