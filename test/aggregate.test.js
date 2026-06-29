const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildAggregate, buildBurn, shapeBurn, gaugePct, blockHasClaude, sumRecentDays, recentDays, weeklyBuckets } = require('../src/main/aggregate');

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

// 최근 7일 통계(메인 탭): 최신 날짜 기준 n일 이내 합산. period 'YYYY-MM-DD' 사전식 비교.
test('STAT7_sumRecentDays_최근7일합', () => {
  const daily = [
    { period: '2026-06-20', totalCost: 10, totalTokens: 100 }, // 7일 밖(컷오프 06-23)
    { period: '2026-06-23', totalCost: 5, totalTokens: 50 },
    { period: '2026-06-26', totalCost: 7, totalTokens: 70 },
    { period: '2026-06-29', totalCost: 3, totalTokens: 30 }, // 최신
  ];
  // 최신 06-29 기준 7일 = 06-23~06-29 → 5+7+3=15, 50+70+30=150 (06-20 제외)
  const r = sumRecentDays(daily, 7);
  assert.equal(r.totalCost, 15);
  assert.equal(r.totalTokens, 150);
});

test('STAT7_sumRecentDays_빈배열_0', () => {
  assert.deepEqual(sumRecentDays([], 7), { totalCost: 0, totalTokens: 0 });
  assert.deepEqual(sumRecentDays(null, 7), { totalCost: 0, totalTokens: 0 });
});

// TREND7: 일자별 추세를 최근 7일로 제한(사용자 요청, 날짜 과다 방지). recentDays = 최신 날짜 기준 n일 이내 '행' 반환.
test('TREND7_recentDays_최근n일_행반환', () => {
  const daily = [
    { period: '2026-06-20', totalCost: 1 }, // 컷오프(06-23) 밖
    { period: '2026-06-23', totalCost: 2 },
    { period: '2026-06-29', totalCost: 3 }, // 최신
  ];
  const r = recentDays(daily, 7); // 06-29 기준 7일 = 06-23~06-29
  assert.equal(r.length, 2);
  assert.equal(r[0].period, '2026-06-23');
  assert.equal(r[1].period, '2026-06-29');
});

test('TREND7_recentDays_빈배열_빈', () => {
  assert.deepEqual(recentDays([], 7), []);
  assert.deepEqual(recentDays(null, 7), []);
});

test('STAT7_buildAggregate_last7_포함', async () => {
  const run = fakeRun({
    daily: { daily: [
      { period: '2026-06-28', totalCost: 4, totalTokens: 40, modelBreakdowns: [{ modelName: 'claude-opus-4-8', cost: 4, inputTokens: 40, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 }] },
      { period: '2026-06-29', totalCost: 6, totalTokens: 60, modelBreakdowns: [{ modelName: 'claude-opus-4-8', cost: 6, inputTokens: 60, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 }] },
    ] },
    blocks: { blocks: [] },
  });
  const agg = await buildAggregate(run);
  assert.equal(agg.last7.totalCost, 10);
  assert.equal(agg.last7.totalTokens, 100);
});

// BL-05: 상세 탭 토큰 구성(입력·출력·캐시생성·캐시읽기). claude만 합산(codex 제외), PDF p3와 동일 reportData.tokenComposition.
test('BL05_buildAggregate_tokens_구성_claude만합산', async () => {
  const run = fakeRun({
    daily: { daily: [
      { period: '2026-06-28', modelBreakdowns: [
        { modelName: 'claude-opus-4-8', cost: 1, inputTokens: 100, outputTokens: 20, cacheCreationTokens: 50, cacheReadTokens: 300 },
        { modelName: 'gpt-5-codex', cost: 9, inputTokens: 999, outputTokens: 999, cacheCreationTokens: 999, cacheReadTokens: 999 },
      ] },
      { period: '2026-06-29', modelBreakdowns: [
        { modelName: 'claude-sonnet-4-6', cost: 2, inputTokens: 10, outputTokens: 5, cacheCreationTokens: 0, cacheReadTokens: 200 },
      ] },
    ] },
    blocks: { blocks: [] },
  });
  const agg = await buildAggregate(run);
  // codex 제외 후 두 날 claude 합산.
  assert.deepEqual(agg.tokens, { input: 110, output: 25, cacheCreate: 50, cacheRead: 500 });
});

test('TREND7_buildAggregate_daily_최근7일만', async () => {
  // 10일치 데이터 → 트렌드(agg.daily)는 최근 7일(06-23~06-29)만(사용자 요청: 날짜 과다 방지).
  const days = [];
  for (let i = 20; i <= 29; i++) {
    days.push({ period: `2026-06-${i}`, modelBreakdowns: [{ modelName: 'claude-opus-4-8', cost: 1, inputTokens: 10, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 }] });
  }
  const agg = await buildAggregate(fakeRun({ daily: { daily: days }, blocks: { blocks: [] } }));
  assert.equal(agg.daily.length, 7); // 06-23~06-29
  assert.equal(agg.daily[0].period, '2026-06-23');
  assert.equal(agg.daily[6].period, '2026-06-29');
  // last7 KPI·tokens 구성은 여전히 전체 기간 기준(트렌드 창과 무관).
  assert.equal(agg.tokens.input, 100); // 10일 × 10
});

// WEEK5: 메인 최근 5주 주차별 사용량(이번 주 포함). 월요일 시작(UTC) 달력 주, nowMs 주입(Clock).
test('WEEK5_weeklyBuckets_최근5주_이번주포함_빈주0', () => {
  const now = Date.parse('2026-06-24T12:00:00Z'); // 수요일 → 이번 주 시작 월요일 06-22
  const daily = [
    { period: '2026-05-25', totalCost: 1, totalTokens: 10 }, // 05-25 주
    { period: '2026-06-02', totalCost: 2, totalTokens: 20 }, // 06-01 주
    { period: '2026-06-16', totalCost: 4, totalTokens: 40 }, // 06-15 주
    { period: '2026-06-22', totalCost: 5, totalTokens: 50 }, // 이번 주(월)
    { period: '2026-06-24', totalCost: 6, totalTokens: 60 }, // 이번 주(수, 부분)
    // 06-08 주는 데이터 없음 → 0
  ];
  const w = weeklyBuckets(daily, 5, now);
  assert.equal(w.length, 5);
  assert.deepEqual(w.map((x) => x.weekStart), ['2026-05-25', '2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22']);
  assert.equal(w[0].totalCost, 1);
  assert.equal(w[1].totalCost, 2);
  assert.equal(w[2].totalCost, 0); // 빈 주 → 0
  assert.equal(w[3].totalCost, 4);
  assert.equal(w[4].totalCost, 11); // 이번 주 부분합 06-22(5)+06-24(6)
  assert.equal(w[4].totalTokens, 110);
});

test('WEEK5_weeklyBuckets_범위밖제외_빈null안전', () => {
  const now = Date.parse('2026-06-24T12:00:00Z');
  // 5주 창(05-25~) 이전(05-18 주)은 제외 → 전부 0.
  const w = weeklyBuckets([{ period: '2026-05-18', totalCost: 99, totalTokens: 990 }], 5, now);
  assert.equal(w.length, 5);
  assert.equal(w.reduce((s, x) => s + x.totalCost, 0), 0);
  assert.equal(weeklyBuckets([], 5, now).length, 5);
  assert.equal(weeklyBuckets(null, 5, now).length, 5);
});

test('WEEK5_buildAggregate_weekly_포함', async () => {
  const run = fakeRun({
    daily: { daily: [
      { period: '2026-06-29', totalCost: 7, totalTokens: 70, modelBreakdowns: [{ modelName: 'claude-opus-4-8', cost: 7, inputTokens: 70, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 }] },
    ] },
    blocks: { blocks: [] },
  });
  const agg = await buildAggregate(run, { nowMs: Date.parse('2026-06-29T12:00:00Z') });
  assert.equal(agg.weekly.length, 5);
  assert.equal(agg.weekly[4].weekStart, '2026-06-29'); // 이번 주(06-29 월요일)
  assert.equal(agg.weekly[4].totalCost, 7);
});

test('DSH060_buildAggregate_빈데이터_안전', async () => {
  const run = fakeRun({ daily: {}, blocks: {} });
  const agg = await buildAggregate(run);
  assert.deepEqual(agg.daily, []);
  assert.deepEqual(agg.today, { totalCost: 0, totalTokens: 0, models: [] });
  assert.deepEqual(agg.tokens, { input: 0, output: 0, cacheCreate: 0, cacheRead: 0 }); // BL-05 빈 구성 안전
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
