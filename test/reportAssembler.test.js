const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildReportInput, prevMonthKey } = require('../src/main/reportAssembler');

// 합성 ccusage JSON(이미 파싱된 형태). 각 행은 modelBreakdowns 보유(filterClaude 대상).
const daily = {
  daily: [
    { period: '2026-05-31', modelBreakdowns: [{ modelName: 'claude-opus-4-8', cost: 5, inputTokens: 10, outputTokens: 2, cacheCreationTokens: 3, cacheReadTokens: 40 }] },
    { period: '2026-06-01', modelBreakdowns: [{ modelName: 'claude-opus-4-8', cost: 10, inputTokens: 100, outputTokens: 20, cacheCreationTokens: 30, cacheReadTokens: 400 }] },
    { period: '2026-06-02', modelBreakdowns: [
      { modelName: 'claude-haiku-4-5', cost: 1, inputTokens: 5, outputTokens: 1, cacheCreationTokens: 2, cacheReadTokens: 10 },
      { modelName: 'gpt-5.4', cost: 99, inputTokens: 9999, outputTokens: 9, cacheCreationTokens: 9, cacheReadTokens: 9 }, // 비-Claude → 제외
    ] },
  ],
};
const monthly = {
  monthly: [
    { period: '2026-05', modelBreakdowns: [{ modelName: 'claude-opus-4-8', cost: 200, inputTokens: 1, outputTokens: 1, cacheCreationTokens: 1, cacheReadTokens: 1 }] },
    { period: '2026-06', modelBreakdowns: [
      { modelName: 'claude-opus-4-8', cost: 300, inputTokens: 1, outputTokens: 1, cacheCreationTokens: 1, cacheReadTokens: 1 },
      { modelName: 'claude-haiku-4-5', cost: 50, inputTokens: 1, outputTokens: 1, cacheCreationTokens: 1, cacheReadTokens: 1 },
    ] },
  ],
};
const session = { session: [{ period: 'uuid-1', modelBreakdowns: [{ modelName: 'claude-opus-4-8', cost: 9 }] }] };

const opts = { year: 2026, month: 6, locale: 'en', krwPerUsd: 1380, generated: '2026-07-01 09:00' };

test('INT010_prevMonthKey_연경계', () => {
  assert.equal(prevMonthKey(2026, 6), '2026-05');
  assert.equal(prevMonthKey(2026, 1), '2025-12');
});

test('INT010_daily_해당월만_claude필터_토큰축포함', () => {
  const r = buildReportInput({ daily, monthly, session }, opts);
  // 5/31 제외, 6/01·6/02만. 6/02는 gpt 제외하고 claude-haiku만 남음.
  assert.deepEqual(r.daily.map((d) => d.period), ['2026-06-01', '2026-06-02']);
  const d1 = r.daily[0];
  assert.equal(d1.totalCost, 10);
  assert.equal(d1.inputTokens, 100);
  assert.equal(d1.cacheReadTokens, 400);
  // 6/02 totalCost는 claude-haiku만(1), gpt(99) 제외.
  assert.equal(r.daily[1].totalCost, 1);
});

test('INT010_models_해당월monthly_claude만', () => {
  const r = buildReportInput({ daily, monthly, session }, opts);
  assert.deepEqual(r.models.map((m) => m.modelName).sort(), ['claude-haiku-4-5', 'claude-opus-4-8']);
  const opus = r.models.find((m) => m.modelName === 'claude-opus-4-8');
  assert.equal(opus.cost, 300);
});

test('INT010_prevMonthCost_전월monthly_claude합', () => {
  const r = buildReportInput({ daily, monthly, session }, opts);
  assert.equal(r.prevMonthCost, 200); // 2026-05 claude 합
});

test('INT010_projects_sessions_빈배열_OPEN08', () => {
  const r = buildReportInput({ daily, monthly, session }, opts);
  // ccusage v20: 프로젝트 축 없음, 세션 period=UUID(월필터·라벨 불가) → 날조 금지(§2).
  assert.deepEqual(r.projects, []);
  assert.deepEqual(r.sessions, []);
});

test('INT010_title_period_로케일', () => {
  const en = buildReportInput({ daily, monthly, session }, opts);
  assert.match(en.title, /Claude Usage Report/);
  assert.match(en.period, /June 2026/);
  const ko = buildReportInput({ daily, monthly, session }, { ...opts, locale: 'ko' });
  assert.match(ko.title, /Claude 사용 보고서/);
  assert.match(ko.period, /2026년 6월/);
  // 패스스루 필드
  assert.equal(en.krwPerUsd, 1380);
  assert.equal(en.generated, '2026-07-01 09:00');
  assert.equal(en.locale, 'en');
});

test('INT010_대상월_monthly없으면_models빈·prev0', () => {
  const r = buildReportInput({ daily: { daily: [] }, monthly: { monthly: [] }, session }, opts);
  assert.deepEqual(r.models, []);
  assert.equal(r.prevMonthCost, 0);
  assert.deepEqual(r.daily, []);
});
