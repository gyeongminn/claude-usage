const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildAggregate, buildBurn, shapeBurn, gaugePct, blockHasClaude } = require('../src/main/aggregate');

test('DSH060_shapeBurn_활성블록_정규화', () => {
  const block = {
    isActive: true,
    costUSD: 50,
    burnRate: { costPerHour: 33.24, tokensPerMinute: 1000 },
    projection: { totalCost: 100, remainingMinutes: 23 },
  };
  const b = shapeBurn(block);
  assert.equal(b.costPerHour, 33.24);
  assert.equal(b.tokPerHour, 60000); // 1000/min * 60
  assert.equal(b.projectedCost, 100);
  assert.equal(b.pct, 50); // 50/100
});

test('DSH060_shapeBurn_블록없음_0', () => {
  const b = shapeBurn(null);
  assert.deepEqual(b, { costPerHour: 0, tokPerHour: 0, projectedCost: 0, pct: 0, timePct: 0, remainingMinutes: 0, totalTokens: 0, tokenPct: null });
});

test('DSH060_shapeBurn_projection0_pct0', () => {
  const b = shapeBurn({ costUSD: 10, burnRate: {}, projection: { totalCost: 0 } });
  assert.equal(b.pct, 0); // 0 나눗셈 방지
});

// INT-030: 플랜 토큰 한도 소진율(OPEN[09]). planTokenLimit 주입 시 totalTokens/한도.
test('INT030_shapeBurn_tokenPct_한도설정시', () => {
  const block = { totalTokens: 50000, burnRate: {}, projection: {} };
  const b = shapeBurn(block, 0, 100000);
  assert.equal(b.totalTokens, 50000);
  assert.equal(b.tokenPct, 50); // 50000/100000
});

test('INT030_shapeBurn_tokenPct_상한100', () => {
  const b = shapeBurn({ totalTokens: 150000, burnRate: {}, projection: {} }, 0, 100000);
  assert.equal(b.tokenPct, 100); // 초과해도 100 상한
});

test('INT030_shapeBurn_tokenPct_한도없으면_null', () => {
  const b = shapeBurn({ totalTokens: 50000, burnRate: {}, projection: {} }, 0, null);
  assert.equal(b.tokenPct, null);
  const b0 = shapeBurn({ totalTokens: 50000, burnRate: {}, projection: {} }, 0, 0);
  assert.equal(b0.tokenPct, null); // 0/음수 한도 무시
});

// 게이지 선택: 한도 소진율 우선(설정 시), 없으면 시간 소진율.
test('INT030_gaugePct_한도있으면_limit모드', () => {
  const r = gaugePct({ tokenPct: 73, timePct: 40 });
  assert.deepEqual(r, { pct: 73, mode: 'limit' });
});

test('INT030_gaugePct_한도없으면_time모드', () => {
  const r = gaugePct({ tokenPct: null, timePct: 40 });
  assert.deepEqual(r, { pct: 40, mode: 'time' });
});

// cmd별 가짜 ccusage 응답 주입
const fakeRun = (responses) => async (cmd) => responses[cmd];

test('DSH060_buildAggregate_daily_claude필터·shape', async () => {
  const run = fakeRun({
    daily: {
      daily: [
        {
          period: '2026-06-25',
          totalCost: 99, totalTokens: 999,
          modelBreakdowns: [
            { modelName: 'claude-opus-4-8', cost: 90, inputTokens: 1, outputTokens: 2, cacheCreationTokens: 0, cacheReadTokens: 0 },
            { modelName: 'gpt-5-codex', cost: 9, inputTokens: 1, outputTokens: 1, cacheCreationTokens: 0, cacheReadTokens: 0 },
          ],
        },
      ],
    },
    blocks: { blocks: [{ isActive: true, costUSD: 5, burnRate: { costPerHour: 10, tokensPerMinute: 100 }, projection: { totalCost: 20 } }] },
  });
  const agg = await buildAggregate(run);
  // codex 제외 후 daily totalCost 재계산(claude만 90)
  assert.equal(agg.daily.length, 1);
  assert.equal(agg.daily[0].totalCost, 90);
  assert.equal(agg.today.totalCost, 90);
  assert.equal(agg.today.models.length, 1); // claude만
  assert.equal(agg.burn.pct, 25); // 5/20
});

// AUDIT-020: 히어로 burn 게이지는 Claude 활성 블록만 — 순수 비-Claude(Codex 등) 블록 제외.
// ccusage blocks엔 modelBreakdowns 없음(모델별 분해 불가) → 블록 models 배열로 판정. 혼합 블록은 유지(천장).
test('AUDIT020_blockHasClaude_판정', () => {
  assert.equal(blockHasClaude({ models: ['claude-opus-4-8'] }), true);
  assert.equal(blockHasClaude({ models: ['gpt-5-codex'] }), false); // 순수 비-Claude → 제외
  assert.equal(blockHasClaude({ models: ['claude-opus-4-8', 'gpt-5-codex'] }), true); // 혼합 → 유지(분해 불가)
  assert.equal(blockHasClaude({ models: [] }), true); // 모델정보 없으면 보수적 유지(오탐 드롭 방지)
  assert.equal(blockHasClaude({}), true);
});

test('AUDIT020_buildAggregate_순수비클로드블록_burn제외', async () => {
  const run = fakeRun({
    daily: { daily: [] },
    blocks: { blocks: [{ isActive: true, models: ['gpt-5-codex'], costUSD: 99, burnRate: { costPerHour: 88, tokensPerMinute: 7000 }, projection: { totalCost: 200 } }] },
  });
  const agg = await buildAggregate(run);
  // Codex 전용 활성 블록 → 드롭 → 게이지 0(히어로에 Codex burn 노출 안 함, §2).
  assert.equal(agg.burn.costPerHour, 0);
  assert.equal(agg.burn.tokPerHour, 0);
  assert.equal(agg.burn.pct, 0);
  assert.equal(agg.burn.totalTokens, 0);
});

test('AUDIT020_buildAggregate_클로드블록_유지', async () => {
  const run = fakeRun({
    daily: { daily: [] },
    blocks: { blocks: [{ isActive: true, models: ['claude-opus-4-8'], costUSD: 5, burnRate: { costPerHour: 10, tokensPerMinute: 100 }, projection: { totalCost: 20 } }] },
  });
  const agg = await buildAggregate(run);
  assert.equal(agg.burn.costPerHour, 10);
  assert.equal(agg.burn.pct, 25); // 5/20
});

// PERF-010(§3): 활성 블록 burn만 짧은 간격 갱신. buildBurn은 daily 전체 파싱 없이 blocks --active만 호출.
test('PERF010_buildBurn_blocks만호출_daily안함', async () => {
  const calls = [];
  const run = async (cmd, args) => {
    calls.push(cmd);
    if (cmd === 'blocks') return { blocks: [{ isActive: true, models: ['claude-opus-4-8'], costUSD: 5, burnRate: { costPerHour: 10, tokensPerMinute: 100 }, projection: { totalCost: 20 } }] };
    return { daily: [{ period: '2026-06-25', totalCost: 999 }] }; // 호출되면 안 됨
  };
  const r = await buildBurn(run);
  assert.deepEqual(calls, ['blocks']); // daily 미호출(매-8s 전체 파싱 제거)
  assert.equal(r.burn.costPerHour, 10);
  assert.equal(r.burn.pct, 25); // 5/20
  assert.ok(!('daily' in r) && !('today' in r)); // burn만 반환
});

test('PERF010_buildBurn_순수비클로드_제외·nowMs·planLimit', async () => {
  const run = async () => ({ blocks: [{ isActive: true, models: ['gpt-5-codex'], costUSD: 99, burnRate: { costPerHour: 88, tokensPerMinute: 7000 }, projection: { totalCost: 200 } }] });
  const r = await buildBurn(run);
  assert.equal(r.burn.costPerHour, 0); // Codex 전용 → 드롭(§2/AUDIT-020 일관)
  // nowMs/planTokenLimit 주입 경로(active Claude 블록).
  const run2 = async () => ({ blocks: [{ isActive: true, models: ['claude-opus-4-8'], totalTokens: 50000, startTime: '2026-06-25T00:00:00Z', endTime: '2026-06-25T05:00:00Z', burnRate: {}, projection: {} }] });
  const r2 = await buildBurn(run2, { nowMs: Date.parse('2026-06-25T02:30:00Z'), planTokenLimit: 100000 });
  assert.equal(r2.burn.timePct, 50); // 2.5h / 5h
  assert.equal(r2.burn.tokenPct, 50); // 50000/100000
});

test('PERF010_buildBurn_빈블록_0안전', async () => {
  const r = await buildBurn(async () => ({ blocks: [] }));
  assert.equal(r.burn.pct, 0);
  assert.equal(r.burn.tokenPct, null);
});

test('DSH060_buildAggregate_빈데이터_안전', async () => {
  const run = fakeRun({ daily: {}, blocks: {} });
  const agg = await buildAggregate(run);
  assert.deepEqual(agg.daily, []);
  assert.deepEqual(agg.today, { totalCost: 0, totalTokens: 0, models: [] });
  assert.equal(agg.burn.pct, 0);
});

test('DSH060_buildAggregate_타임존_daily에전달', async () => {
  let dailyArgs;
  const run = async (cmd, args) => {
    if (cmd === 'daily') dailyArgs = args;
    return cmd === 'blocks' ? { blocks: [] } : { daily: [] };
  };
  await buildAggregate(run, { timezone: 'Asia/Seoul' });
  assert.ok(dailyArgs.includes('--timezone'));
  assert.ok(dailyArgs.includes('Asia/Seoul'));
});
