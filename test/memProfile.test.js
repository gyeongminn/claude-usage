const { test } = require('node:test');
const assert = require('node:assert/strict');
const { summarizeMetrics, formatReport } = require('../src/main/memProfile');

// MEM-010(Phase 18, §8): app.getAppMetrics() 프로세스별 RSS 집계(순수) — 최적화 전 측정 계측.

test('MEM010_summarizeMetrics_타입별_집계_합계', () => {
  const metrics = [
    { type: 'Browser', memory: { workingSetSize: 120000 } },
    { type: 'Tab', memory: { workingSetSize: 200000 } },
    { type: 'Tab', memory: { workingSetSize: 50000 } },
    { type: 'GPU', memory: { workingSetSize: 80000 } },
  ];
  const s = summarizeMetrics(metrics);
  assert.equal(s.processCount, 4);
  assert.equal(s.byType.Tab.count, 2);
  assert.equal(s.byType.Tab.workingSetKb, 250000); // 200000+50000
  assert.equal(s.byType.Browser.workingSetKb, 120000);
  assert.equal(s.totalWorkingSetKb, 450000);
});

test('MEM010_summarizeMetrics_비배열_누락필드_안전', () => {
  assert.deepEqual(summarizeMetrics(null), { byType: {}, totalWorkingSetKb: 0, processCount: 0 });
  const s = summarizeMetrics([{}, { type: 'GPU' }, { memory: {} }]);
  assert.equal(s.processCount, 3);
  assert.equal(s.totalWorkingSetKb, 0); // workingSetSize 전부 누락 → 0
  assert.ok(s.byType.Unknown, 'type 누락 → Unknown 버킷');
  assert.equal(s.byType.GPU.workingSetKb, 0);
});

test('MEM010_formatReport_사람가독_MB_total', () => {
  const s = summarizeMetrics([{ type: 'Browser', memory: { workingSetSize: 102400 } }]);
  const txt = formatReport(s);
  assert.match(txt, /Browser/);
  assert.match(txt, /100\.0 MB/); // 102400 KB / 1024 = 100.0 MB
  assert.match(txt, /total/i);
});
