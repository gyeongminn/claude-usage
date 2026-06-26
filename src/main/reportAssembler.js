// 보고서 실데이터 어셈블러(INT-010, OPEN[10] 해소). ccusage 월/일/세션 JSON → report.html 입력 객체.
// 순수 함수 — ccusage 호출 결과(이미 파싱)와 메타를 받아 조립. 날조 금지(§2): 데이터 없는 축은 빈 배열.
const { filterClaude } = require('./claudeFilter');

// 'YYYY-MM' 전월 키(연경계 안전, UTC).
function prevMonthKey(year, month) {
  const d = new Date(Date.UTC(year, month - 1, 1) - 1); // 이번 달 1일 직전 = 전월 말일
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(year, month, locale) {
  const lc = locale === 'ko' ? 'ko' : 'en';
  return new Intl.DateTimeFormat(lc, { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, 1))
  );
}

// raw: { daily, monthly, session } — 각 ccusage <cmd> --json 결과. meta: {year, month, locale, krwPerUsd, generated}.
function buildReportInput(raw, meta) {
  const { year, month, locale, krwPerUsd, generated } = meta;
  const key = `${year}-${String(month).padStart(2, '0')}`;
  const prevKey = prevMonthKey(year, month);

  // 일자별: 해당 월만 + Claude 필터(totals·토큰축 재계산). filterClaude가 토큰 4축·totalCost/Tokens 채움.
  const dailyAll = filterClaude(((raw.daily && raw.daily.daily) || []).filter((d) => String(d.period).startsWith(key)));
  const daily = dailyAll.map((d) => ({
    period: d.period,
    totalCost: d.totalCost,
    totalTokens: d.totalTokens,
    inputTokens: d.inputTokens,
    outputTokens: d.outputTokens,
    cacheCreationTokens: d.cacheCreationTokens,
    cacheReadTokens: d.cacheReadTokens,
  }));

  // 월 모델 분해·전월 비용: monthly(Claude 필터)에서 해당/전월 행.
  const monthlyC = filterClaude((raw.monthly && raw.monthly.monthly) || []);
  const cur = monthlyC.find((m) => m.period === key);
  const prevRow = monthlyC.find((m) => m.period === prevKey);
  const models = cur ? cur.modelBreakdowns.map((b) => ({ modelName: b.modelName, cost: b.cost })) : [];
  const prevMonthCost = prevRow ? prevRow.totalCost : 0;

  return {
    title: locale === 'ko' ? 'Claude 사용 보고서' : 'Claude Usage Report',
    period: monthLabel(year, month, locale),
    generated,
    locale,
    krwPerUsd,
    daily,
    prevMonthCost,
    models,
    // ccusage v20: 프로젝트 축 없음(--instances 부재), 세션 period=UUID(월필터·라벨 불가) → 데이터원 없음(OPEN[08]).
    projects: [],
    sessions: [],
  };
}

module.exports = { buildReportInput, prevMonthKey };
