// 보고서 KPI 계산(§4.2 p1). 순수 함수 — 결정적, LLM 없음.
// UMD: node 테스트·렌더러(window.ReportData).
(function (root) {
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  // 행 배열에서 숫자 필드 k 합산(num 가드). monthSummary·tokenComposition 공유(reduce+guard idiom 단일화).
  const sumField = (rows, k) => rows.reduce((s, d) => s + num(d[k]), 0);

  // daily(claude 필터된 월 데이터) → 총비용·총토큰·일수·일평균비용.
  function monthSummary(daily) {
    const rows = Array.isArray(daily) ? daily : [];
    const totalCost = sumField(rows, 'totalCost');
    const totalTokens = sumField(rows, 'totalTokens');
    const days = rows.length;
    return {
      totalCost,
      totalTokens,
      days,
      avgDailyCost: days > 0 ? totalCost / days : 0,
    };
  }

  // 전월 대비 증감(%). 전월 0/없음이면 비교 불가 → null. 소수 1자리.
  function momChangePct(current, previous) {
    const prev = num(previous);
    if (prev <= 0) return null;
    const pct = ((num(current) - prev) / prev) * 100;
    return Math.round(pct * 10) / 10;
  }

  // 월 토큰 구성(p3): 입력·출력·캐시생성·캐시읽기 합산. claudeFilter 필드명 따름.
  function tokenComposition(daily) {
    const rows = Array.isArray(daily) ? daily : [];
    return {
      input: sumField(rows, 'inputTokens'),
      output: sumField(rows, 'outputTokens'),
      cacheCreate: sumField(rows, 'cacheCreationTokens'),
      cacheRead: sumField(rows, 'cacheReadTokens'),
    };
  }

  // 세션 통계(p4, §7): 총 세션 수 + 최고 비용 Top 3. 평균류 생략.
  function sessionStats(sessions) {
    const rows = Array.isArray(sessions) ? sessions : [];
    const top3 = rows.slice().sort((a, b) => num(b.totalCost) - num(a.totalCost)).slice(0, 3);
    return { totalSessions: rows.length, top3 };
  }

  const api = { monthSummary, momChangePct, tokenComposition, sessionStats };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ReportData = api;
})(typeof window !== 'undefined' ? window : globalThis);
