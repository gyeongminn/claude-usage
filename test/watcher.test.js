const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveWatchDir, watchGlob, makeDebouncer } = require('../src/main/watcher');
const path = require('node:path');
const os = require('node:os');

test('DAT020_resolveWatchDir_기본_홈projects', () => {
  const dir = resolveWatchDir({}); // env 없음
  assert.equal(dir, path.join(os.homedir(), '.claude', 'projects'));
});

test('DAT020_resolveWatchDir_CLAUDE_CONFIG_DIR_존중', () => {
  const dir = resolveWatchDir({ CLAUDE_CONFIG_DIR: '/custom/cfg' });
  assert.equal(dir, path.join('/custom/cfg', 'projects'));
});

test('DAT020_watchGlob_jsonl만', () => {
  const g = watchGlob('/base');
  assert.match(g, /\*\*/);
  assert.match(g, /\.jsonl$/);
});

test('DAT020_watchGlob_Windows경로_포워드슬래시', () => {
  const g = watchGlob('C:\\Users\\me\\.claude\\projects');
  assert.ok(!g.includes('\\'), 'glob에 백슬래시 없어야 함(chokidar 매칭)');
  assert.equal(g, 'C:/Users/me/.claude/projects/**/*.jsonl');
});

test('DAT020_debounce_연속호출_1회', async () => {
  let calls = 0;
  const d = makeDebouncer(() => calls++, 30);
  d(); d(); d();
  assert.equal(calls, 0); // 아직
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(calls, 1); // 묶여서 1회
});

test('DAT020_debounce_간격이후_재발화', async () => {
  let calls = 0;
  const d = makeDebouncer(() => calls++, 20);
  d();
  await new Promise((r) => setTimeout(r, 40));
  d();
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(calls, 2);
});

test('DAT020_debounce_cancel', async () => {
  let calls = 0;
  const d = makeDebouncer(() => calls++, 20);
  d();
  d.cancel();
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(calls, 0); // 취소됨
});
