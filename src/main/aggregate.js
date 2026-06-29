const { filterClaude, isClaudeModel } = require('./claudeFilter');
const { tokenComposition } = require('../report/reportData'); // BL-05: 토큰 구성(입력·출력·캐시) 재사용(PDF p3 정합).

// 활성 5h 블록에 Claude 모델이 있는지(§2/AUDIT-020). ccusage blocks엔 modelBreakdowns가 없어 비용·burn을
// 모델별로 분해할 수 없다 → 블록의 models 배열로 판정. 순수 비-Claude(Codex 전용) 블록만 제외하고,
// 모델 정보가 없으면(빈/누락) 보수적으로 유지(정상 블록 오탐 드롭 방지).
// ponytail: 혼합 블록(Claude+Codex)은 burn이 합산값이라 모델별 분해 불가 — 그대로 노출(천장). ccusage가
//           블록별 modelBreakdowns를 제공하면 그때 Claude 몫만 추려 정밀화.
function blockHasClaude(block) {
  if (!block) return false; // falsy 엔트리는 드롭(이후 find(isActive) 크래시 방지).
  const models = block.models;
  if (!Array.isArray(models) || models.length === 0) return true;
  return models.some(isClaudeModel);
}

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

// 최근 n일(달력) '행' 선택 — daily(오름차순 period 'YYYY-MM-DD')에서 최신 날짜 기준 n일 이내 행만.
// 데이터 최신일 기준(시스템 now 아님)이라 표시 TZ와 무관·안전. 문자열 사전식 비교 = 시간순.
function recentDays(daily, n) {
  const arr = Array.isArray(daily) ? daily : [];
  if (!arr.length) return [];
  const last = String(arr[arr.length - 1].period);
  const d = new Date(last + 'T00:00:00Z');
  if (isNaN(d.getTime())) return [];
  d.setUTCDate(d.getUTCDate() - (n - 1));
  const cutoff = d.toISOString().slice(0, 10);
  return arr.filter((x) => String(x.period) >= cutoff);
}

// daily 행 묶음의 비용·토큰 합 — sumRecentDays·weeklyBuckets 공용(중복 제거, 동일 null 가드).
function sumCostTokens(rows) {
  return (Array.isArray(rows) ? rows : []).reduce(
    (a, x) => ({
      totalCost: a.totalCost + (Number(x.totalCost) || 0),
      totalTokens: a.totalTokens + (Number(x.totalTokens) || 0),
    }),
    { totalCost: 0, totalTokens: 0 }
  );
}

// 최근 n일 합계 — recentDays 행을 비용·토큰 합산(메인 탭 KPI).
function sumRecentDays(daily, n) {
  return sumCostTokens(recentDays(daily, n));
}

// 주 시작(월요일 00:00 UTC) ms. ISO 주 표준(월요일 시작). ponytail: 일요일/Anthropic 리셋 정렬 필요 시 교체.
function weekStartMs(ms) {
  const d = new Date(ms);
  const diff = (d.getUTCDay() + 6) % 7; // 월=0..일=6 만큼 거슬러 월요일로
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff);
}

// 최근 n주(이번 주 포함) 주차별 합계 — daily(period 'YYYY-MM-DD') 기준, nowMs 기준 이번 주(Clock 주입).
// 데이터 없는 주는 0(연속 n주 보장). 각 주 [weekStart, +7) 반열린 구간 매칭. 오래된→최신 순.
function weeklyBuckets(daily, n, nowMs) {
  const arr = Array.isArray(daily) ? daily : [];
  const thisWeek = weekStartMs(nowMs);
  const weeks = [];
  for (let i = n - 1; i >= 0; i--) {
    const ws = thisWeek - i * 7 * 86400000;
    const wsStr = new Date(ws).toISOString().slice(0, 10);
    const weStr = new Date(ws + 7 * 86400000).toISOString().slice(0, 10);
    const rows = arr.filter((x) => { const p = String(x.period); return p >= wsStr && p < weStr; });
    weeks.push({ weekStart: wsStr, ...sumCostTokens(rows) });
  }
  return weeks;
}

// 활성 Claude 블록 선택 — ccusage blocks --active 출력에서 순수 비-Claude(Codex 전용) 블록 제외 후
// isActive 블록(없으면 첫 블록, 그것도 없으면 null). buildAggregate·buildBurn 공용 — §2/AUDIT-020 Claude 필터+
// 활성 선택을 한 곳에 모아 cadence 분리(전체 재집계 vs 인터벌 burn-only) 두 경로의 게이지 입력 드리프트 방지.
function selectActiveClaudeBlock(blocksRaw) {
  const blocks = ((blocksRaw && blocksRaw.blocks) || []).filter(blockHasClaude);
  return blocks.find((b) => b.isActive) || blocks[0] || null;
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
  const block = selectActiveClaudeBlock(blocksRaw); // 순수 비-Claude 블록 제외 + 활성 선택(§2/AUDIT-020).
  const dailyShaped = daily.map((d) => ({ period: d.period, totalCost: d.totalCost, totalTokens: d.totalTokens }));
  return {
    daily: recentDays(dailyShaped, 7), // 일자별 추세: 최근 7일만(날짜 과다 방지, 사용자 요청). last7/tokens는 전체 기간.
    last7: sumRecentDays(dailyShaped, 7), // 메인 탭 최근 7일 통계.
    weekly: weeklyBuckets(dailyShaped, 5, nowMs), // 메인 탭 최근 5주 주차별(이번 주 포함, 사용자 요청).
    today: last
      ? { totalCost: last.totalCost, totalTokens: last.totalTokens, models: last.modelBreakdowns }
      : { totalCost: 0, totalTokens: 0, models: [] },
    tokens: tokenComposition(daily), // BL-05: 상세 탭 토큰 구성(전체 기간 claude 합산).
    burn: shapeBurn(block, nowMs, opts.planTokenLimit),
  };
}

// 활성 블록 burn만 경량 갱신(PERF-010/§3: "활성 블록 burn만 짧은 간격 갱신"). daily 전체 파싱 없이
// blocks --active만 fetch → 매-8s 인터벌이 100억+ 토큰 daily를 재파싱하지 않게 한다(daily/today는 워처 이벤트로 갱신).
// ponytail: 파일별 증분 캐시(DAT-010서 시도)는 우리가 JSONL을 직접 파싱하지 않으므로(ccusage 자식프로세스가
//           불투명 전체 파싱) 연결 불가 — per-file totals를 채우려면 ccusage 집계를 재구현해야 해 §8 위반.
//           그래서 해당 모듈(aggCache)은 BL-06서 폐기. §3은 캐시 대신 "워처 트리거 전체 재집계 + 인터벌
//           burn-only"로 충족(전체 재파싱을 이벤트 기반으로 한정). 캐시가 정말 필요해지면 JSONL 직접 파싱부터.
async function buildBurn(runCcusage, opts = {}) {
  const nowMs = opts.nowMs != null ? opts.nowMs : Date.now();
  const blocksRaw = await runCcusage('blocks', ['--active']);
  const block = selectActiveClaudeBlock(blocksRaw);
  return { burn: shapeBurn(block, nowMs, opts.planTokenLimit) };
}

module.exports = { buildAggregate, buildBurn, shapeBurn, blockTimePct, gaugePct, blockHasClaude, sumRecentDays, recentDays, weeklyBuckets };
