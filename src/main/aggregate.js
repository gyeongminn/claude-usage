const { filterClaude } = require('./claudeFilter');

// 5h 블록 시간 소진율(§4.1) — now 주입(Clock, 절대규칙). 시각은 UTC ms 비교(OPEN[05]).
function blockTimePct(startTime, endTime, nowMs) {
  const start = Date.parse(startTime);
  const end = Date.parse(endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  const n = Number(nowMs);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, ((n - start) / (end - start)) * 100));
}

// 활성 5h 블록 → 게이지용 burn 정규화(§4.1). 블록/필드 누락 안전. nowMs 주입(시간 소진율용).
// planTokenLimit(설정, OPEN[09]) 주입 시 토큰 소진율(tokenPct) 계산 — ccusage엔 한도 없어 사용자 설정값 사용.
function shapeBurn(block, nowMs, planTokenLimit) {
  if (!block) return { costPerHour: 0, tokPerHour: 0, projectedCost: 0, pct: 0, timePct: 0, remainingMinutes: 0, totalTokens: 0, tokenPct: null };
  const br = block.burnRate || {};
  const proj = block.projection || {};
  const cost = Number(block.costUSD) || 0;
  const projectedCost = Number(proj.totalCost) || 0;
  // 비용 소진% = 현재 비용 / 예상 총비용(0 나눗셈 방지, 100 상한).
  const pct = projectedCost > 0 ? Math.min(100, (cost / projectedCost) * 100) : 0;
  const totalTokens = Number(block.totalTokens) || 0;
  const limit = Number(planTokenLimit) || 0;
  const tokenPct = limit > 0 ? Math.min(100, Math.max(0, (totalTokens / limit) * 100)) : null;
  return {
    costPerHour: Number(br.costPerHour) || 0,
    tokPerHour: (Number(br.tokensPerMinute) || 0) * 60,
    projectedCost,
    pct,
    timePct: blockTimePct(block.startTime, block.endTime, nowMs),
    remainingMinutes: Number(proj.remainingMinutes) || 0,
    totalTokens,
    tokenPct,
  };
}

// 게이지 소진율 선택(§4.1): 플랜 토큰 한도 설정 시 토큰 소진율(limit), 없으면 시간 소진율(time).
function gaugePct(burn) {
  if (burn && burn.tokenPct != null) return { pct: burn.tokenPct, mode: 'limit' };
  return { pct: (burn && burn.timePct) || 0, mode: 'time' };
}

// ccusage 실데이터 → 렌더러용 집계 shape. runCcusage 주입(테스트), timezone 전달(§10/OPEN[05]).
// ponytail: 프로젝트 축은 ccusage v20이 노출 안 함(--instances 없음) → 여기 미포함(OPEN).
async function buildAggregate(runCcusage, opts = {}) {
  const nowMs = opts.nowMs != null ? opts.nowMs : Date.now(); // Clock 주입(테스트), 기본 현재시각.
  const tzArgs = opts.timezone ? ['--timezone', opts.timezone] : [];
  const [dailyRaw, blocksRaw] = await Promise.all([
    runCcusage('daily', tzArgs),
    runCcusage('blocks', ['--active']),
  ]);
  const daily = filterClaude((dailyRaw && dailyRaw.daily) || []);
  const last = daily[daily.length - 1] || null;
  const blocks = (blocksRaw && blocksRaw.blocks) || [];
  const block = blocks.find((b) => b.isActive) || blocks[0] || null;
  return {
    daily: daily.map((d) => ({ period: d.period, totalCost: d.totalCost, totalTokens: d.totalTokens })),
    today: last
      ? { totalCost: last.totalCost, totalTokens: last.totalTokens, models: last.modelBreakdowns }
      : { totalCost: 0, totalTokens: 0, models: [] },
    burn: shapeBurn(block, nowMs, opts.planTokenLimit),
  };
}

module.exports = { buildAggregate, shapeBurn, blockTimePct, gaugePct };
