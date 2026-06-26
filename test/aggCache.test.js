const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AggCache, mergeTotals, emptyTotals } = require('../src/main/aggCache');

const T = (cost, tok) => ({ totalCost: cost, totalTokens: tok });

test('DAT010_mergeTotals_합산', () => {
  const m = mergeTotals([T(1, 10), T(2, 20), T(0.5, 5)]);
  assert.equal(m.totalCost, 3.5);
  assert.equal(m.totalTokens, 35);
});

test('DAT010_emptyTotals_0', () => {
  assert.deepEqual(emptyTotals(), { totalCost: 0, totalTokens: 0 });
});

test('DAT010_needsReparse_신규파일', () => {
  const c = new AggCache();
  assert.equal(c.needsReparse('/a.jsonl', { mtimeMs: 100, size: 50 }), true); // 캐시 없음
});

test('DAT010_needsReparse_변경없음_false', () => {
  const c = new AggCache();
  c.set('/a.jsonl', { mtimeMs: 100, size: 50 }, T(1, 10));
  assert.equal(c.needsReparse('/a.jsonl', { mtimeMs: 100, size: 50 }), false); // 동일 mtime·size
});

test('DAT010_needsReparse_mtime변경_true', () => {
  const c = new AggCache();
  c.set('/a.jsonl', { mtimeMs: 100, size: 50 }, T(1, 10));
  assert.equal(c.needsReparse('/a.jsonl', { mtimeMs: 200, size: 50 }), true);
});

test('DAT010_needsReparse_size변경_true', () => {
  const c = new AggCache();
  c.set('/a.jsonl', { mtimeMs: 100, size: 50 }, T(1, 10));
  assert.equal(c.needsReparse('/a.jsonl', { mtimeMs: 100, size: 99 }), true);
});

test('DAT010_needsReparse_stat없음_true', () => {
  const c = new AggCache();
  c.set('/a.jsonl', { mtimeMs: 1, size: 1 }, T(1, 10));
  assert.equal(c.needsReparse('/a.jsonl', null), true); // stat 못 얻으면 처리 대상
});

test('DAT010_total_파일별합_머지', () => {
  const c = new AggCache();
  c.set('/a.jsonl', { mtimeMs: 1, size: 1 }, T(10, 100));
  c.set('/b.jsonl', { mtimeMs: 1, size: 1 }, T(5, 50));
  assert.deepEqual(c.total(), { totalCost: 15, totalTokens: 150 });
});

test('DAT010_set_갱신시_재머지', () => {
  const c = new AggCache();
  c.set('/a.jsonl', { mtimeMs: 1, size: 1 }, T(10, 100));
  c.set('/a.jsonl', { mtimeMs: 2, size: 2 }, T(20, 200)); // 같은 경로 갱신
  assert.deepEqual(c.total(), { totalCost: 20, totalTokens: 200 }); // 덮어씀, 중복합 아님
});

test('DAT010_remove_삭제파일_제외', () => {
  const c = new AggCache();
  c.set('/a.jsonl', { mtimeMs: 1, size: 1 }, T(10, 100));
  c.set('/b.jsonl', { mtimeMs: 1, size: 1 }, T(5, 50));
  c.remove('/a.jsonl');
  assert.deepEqual(c.total(), { totalCost: 5, totalTokens: 50 });
});
