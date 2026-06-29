const { test } = require('node:test');
const assert = require('node:assert');
const { cpuPercent, memUsage, parseNvidiaSmi } = require('../src/main/sysStats');

// 단일 코어 os.cpus() 스냅샷 모사: times.idle=idle, 나머지(user)=busy.
function core(idle, busy) {
  return { times: { user: busy, nice: 0, sys: 0, idle, irq: 0 } };
}

test('SYS010_cpuPercent_50퍼센트', () => {
  // prev: idle100 total200, cur: idle150 total300 → idleΔ50 totalΔ100 → 1-0.5 = 50%
  assert.equal(cpuPercent([core(100, 100)], [core(150, 150)]), 50);
});

test('SYS010_cpuPercent_동일스냅샷_0', () => {
  const s = [core(100, 100)];
  assert.equal(cpuPercent(s, s), 0); // totalΔ=0 → 0(0나눗셈 방지)
});

test('SYS010_cpuPercent_100퍼센트', () => {
  // idleΔ0 totalΔ100 → 100%
  assert.equal(cpuPercent([core(100, 100)], [core(100, 200)]), 100);
});

test('SYS010_cpuPercent_빈·널_안전', () => {
  assert.equal(cpuPercent([], [core(1, 1)]), 0);
  assert.equal(cpuPercent(null, undefined), 0);
});

test('SYS010_cpuPercent_멀티코어_집계', () => {
  const prev = [core(100, 100), core(100, 100)];
  const cur = [core(150, 150), core(150, 150)];
  assert.equal(cpuPercent(prev, cur), 50);
});

test('SYS010_cpuPercent_카운터리셋_음수totalΔ_0', () => {
  // cur가 prev보다 작음(핫플러그/리셋) → totalΔ<=0 → 0
  assert.equal(cpuPercent([core(150, 150)], [core(100, 100)]), 0);
});

test('SYS010_memUsage_기본_75퍼센트', () => {
  const r = memUsage(16e9, 4e9); // used=12e9, pct=75
  assert.equal(r.pct, 75);
  assert.equal(r.usedBytes, 12e9);
  assert.equal(r.totalBytes, 16e9);
});

test('SYS010_memUsage_0total_안전', () => {
  const r = memUsage(0, 0);
  assert.deepEqual(r, { pct: 0, usedBytes: 0, totalBytes: 0 });
});

test('SYS010_memUsage_free초과_음수가드', () => {
  const r = memUsage(8e9, 9e9); // free>total → used clamp 0
  assert.equal(r.usedBytes, 0);
  assert.equal(r.pct, 0);
});

test('SYS010_parseNvidiaSmi_정상', () => {
  assert.equal(parseNvidiaSmi('45\n'), 45);
  assert.equal(parseNvidiaSmi(' 73 \n'), 73);
});

test('SYS010_parseNvidiaSmi_멀티GPU_첫값', () => {
  assert.equal(parseNvidiaSmi('45\n88\n'), 45);
});

test('SYS010_parseNvidiaSmi_비정상_null', () => {
  assert.equal(parseNvidiaSmi(''), null);
  assert.equal(parseNvidiaSmi('\n\n'), null);
  assert.equal(parseNvidiaSmi('N/A'), null);
  assert.equal(parseNvidiaSmi(null), null);
});
