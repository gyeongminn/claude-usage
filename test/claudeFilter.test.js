const { test } = require('node:test');
const assert = require('node:assert/strict');
const { filterClaude, isClaudeModel } = require('../src/main/claudeFilter');

const bd = (modelName, cost, i, o, cc, cr) => ({
  modelName,
  cost,
  inputTokens: i,
  outputTokens: o,
  cacheCreationTokens: cc,
  cacheReadTokens: cr,
});

// claude + codex(gpt) 섞인 하루치 엔트리
const mixedEntry = () => ({
  period: '2026-06-26',
  agent: 'mixed',
  metadata: { agents: ['claude', 'codex'] },
  inputTokens: 300,
  outputTokens: 600,
  cacheCreationTokens: 30,
  cacheReadTokens: 70,
  totalCost: 100,
  totalTokens: 1000,
  modelsUsed: ['claude-opus-4-8', 'gpt-5-codex'],
  modelBreakdowns: [
    bd('claude-opus-4-8', 90, 100, 200, 10, 20),
    bd('gpt-5-codex', 10, 200, 400, 20, 50),
  ],
});

test('FND050_isClaudeModel_판정', () => {
  assert.ok(isClaudeModel('claude-opus-4-8'));
  assert.ok(isClaudeModel('Claude-Haiku-4-5')); // 대소문자 무관
  assert.ok(!isClaudeModel('gpt-5-codex'));
  assert.ok(!isClaudeModel(undefined));
});

test('FND050_타에이전트모델_제외', () => {
  const [e] = filterClaude([mixedEntry()]);
  assert.deepEqual(e.modelsUsed, ['claude-opus-4-8']);
  assert.equal(e.modelBreakdowns.length, 1);
  assert.equal(e.modelBreakdowns[0].modelName, 'claude-opus-4-8');
});

test('FND050_totals_클로드만재계산', () => {
  const [e] = filterClaude([mixedEntry()]);
  assert.equal(e.inputTokens, 100);
  assert.equal(e.outputTokens, 200);
  assert.equal(e.cacheCreationTokens, 10);
  assert.equal(e.cacheReadTokens, 20);
  assert.equal(e.totalCost, 90);
  assert.equal(e.totalTokens, 100 + 200 + 10 + 20); // 330
});

test('FND050_클로드없는엔트리_드롭', () => {
  const codexOnly = {
    period: '2026-06-25',
    modelsUsed: ['gpt-5-codex'],
    modelBreakdowns: [bd('gpt-5-codex', 5, 1, 2, 0, 0)],
  };
  const out = filterClaude([codexOnly, mixedEntry()]);
  assert.equal(out.length, 1); // codex-only 엔트리 제거
  assert.equal(out[0].period, '2026-06-26');
});

test('FND050_breakdown없으면_드롭', () => {
  const noBd = { period: '2026-06-24', modelsUsed: [] };
  assert.equal(filterClaude([noBd]).length, 0);
});

test('FND050_modelsUsed_중복제거', () => {
  const dup = {
    period: '2026-06-23',
    modelBreakdowns: [
      bd('claude-opus-4-8', 1, 1, 1, 0, 0),
      bd('claude-opus-4-8', 2, 2, 2, 0, 0),
    ],
  };
  const [e] = filterClaude([dup]);
  assert.deepEqual(e.modelsUsed, ['claude-opus-4-8']); // 중복 제거
  assert.equal(e.totalCost, 3); // breakdown 합은 그대로
});

test('FND050_원본불변_기타필드보존', () => {
  const input = [mixedEntry()];
  const before = JSON.stringify(input);
  const [e] = filterClaude(input);
  assert.equal(JSON.stringify(input), before); // 원본 mutate 안 함
  assert.equal(e.period, '2026-06-26'); // period/agent/metadata 보존
  assert.equal(e.agent, 'mixed');
});
