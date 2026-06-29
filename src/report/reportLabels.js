// 보고서 정적 라벨 카탈로그 — PDF는 EN·KO만(§10). locale==='ko'면 한국어, 그 외 전부 영어 폴백.
// 숫자·통화·날짜 값 자체는 Intl(format.js)로 포맷, 여기선 라벨 문자열만. UMD(node 테스트·렌더러).
(function (root) {
  const en = {
    totalCost: 'Total cost',
    totalTokens: 'Total tokens',
    dailyAvg: 'Daily average',
    vsLastMonth: 'vs last month',
    pricingSource: 'Pricing source: ccusage pricing',
    dailyTrend: 'Daily Trend',
    date: 'Date',
    cost: 'Cost',
    tokens: 'Tokens',
    breakdown: 'Breakdown',
    byModel: 'By model',
    model: 'Model',
    tokenComposition: 'Token composition',
    kind: 'Kind',
    cacheEfficiency: 'Cache efficiency',
    cacheFormula: 'cache read / total input',
    input: 'Input',
    output: 'Output',
    cacheCreate: 'Cache create',
    cacheRead: 'Cache read',
    projectsSessions: 'Projects & Sessions',
    topProjects: 'Top projects',
    project: 'Project',
    other: 'Other',
    generated: 'Generated {t}',
    sessions: 'Sessions — {n} total, top 3 by cost',
  };
  const ko = {
    totalCost: '총 비용',
    totalTokens: '총 토큰',
    dailyAvg: '일 평균',
    vsLastMonth: '전월 대비',
    pricingSource: '단가 출처: ccusage pricing',
    dailyTrend: '일자별 추세',
    date: '날짜',
    cost: '비용',
    tokens: '토큰',
    breakdown: '분해',
    byModel: '모델별',
    model: '모델',
    tokenComposition: '토큰 구성',
    kind: '종류',
    cacheEfficiency: '캐시 효율',
    cacheFormula: '캐시 읽기 / 전체 입력',
    input: '입력',
    output: '출력',
    cacheCreate: '캐시 생성',
    cacheRead: '캐시 읽기',
    projectsSessions: '프로젝트 · 세션',
    topProjects: '상위 프로젝트',
    project: '프로젝트',
    other: '기타',
    generated: '{t} 생성',
    sessions: '세션 — 총 {n}개, 비용 상위 3',
  };

  function reportLabels(locale) {
    return locale === 'ko' ? ko : en;
  }

  const api = { reportLabels };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ReportLabels = api;
})(typeof window !== 'undefined' ? window : globalThis);
