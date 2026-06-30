// DOC-SHOT-010: 대시보드 캡처 전용 샘플 집계 — README 다국어 스크린샷(각 언어 UI·동일 데이터).
// 보고서 __SAMPLE__(report.html)의 대시보드판. 값은 영어 assets/dashboard.png 재현
// (5h 67%·주간 7%·burn $41.73/h·62.5Mtok/h·오늘 $272.31·385M·최근7일 $1,427.01·1.9B·최근5주).
// renderAgg/renderLimits(index.html)가 기대하는 형태와 동일(buildAggregate/fetchUsage 출력 계약).
// ★앱 실사용엔 절대 안 들어간다 — captureAndQuit이 env DASH_SAMPLE일 때만 window.__captureSample로 주입.
// §2(가짜 데이터 금지)는 사용자 대시보드 표시에 적용 — 이건 홍보 스크린샷 전용 대표 데이터(보고서 __SAMPLE__와 동일 성격).
// ponytail: 정적 데이터 fixture(로직 없음). self-check(dashSample.test)이 renderAgg/renderLimits 필수 필드를 가드.
const DASH_SAMPLE = {
  agg: {
    krwPerUsd: 1537, // $272.31 × 1537 ≈ ₩418,486(영어 캡처 병기값).
    burn: { costPerHour: 41.73, tokPerHour: 62_500_000 },
    // 일별 추세(최근 7일, recentDays(7) 형태). 06-29는 오늘과 일치, 27/28은 미사용일(0).
    daily: [
      { period: '2026-06-23', totalCost: 289.6, totalTokens: 402_000_000 },
      { period: '2026-06-24', totalCost: 410.2, totalTokens: 560_000_000 },
      { period: '2026-06-25', totalCost: 150.4, totalTokens: 205_000_000 },
      { period: '2026-06-26', totalCost: 300.1, totalTokens: 418_000_000 },
      { period: '2026-06-27', totalCost: 0, totalTokens: 0 },
      { period: '2026-06-28', totalCost: 0, totalTokens: 0 },
      { period: '2026-06-29', totalCost: 272.31, totalTokens: 385_000_000 },
    ],
    today: {
      period: '2026-06-29',
      totalCost: 272.31,
      totalTokens: 385_000_000,
      // 모델 도넛(상세 탭)은 modelName 키를 읽는다(modelDonut.legendItems/buildDonutOption).
      // 영어 assets/detail.png 재현: Opus 4.8 98.9% · Haiku 4.5 1.1%(합=272.31=totalCost).
      // (과거 `name` 키 버그 → shortModelName(undefined)로 범례 모델명 빈칸이던 것 수정.)
      models: [
        { modelName: 'claude-opus-4-8', cost: 269.31 },
        { modelName: 'claude-haiku-4-5-20251001', cost: 3.0 },
      ],
    },
    last7: { totalCost: 1427.01, totalTokens: 1_900_000_000 },
    // 최근 5주(weeklyBuckets 형태, 오래된→최신). renderWeekly가 reverse해 최신을 위로.
    weekly: [
      { weekStart: '2026-06-01', totalCost: 1858.46, totalTokens: 2_300_000_000 },
      { weekStart: '2026-06-08', totalCost: 1801.88, totalTokens: 1_800_000_000 },
      { weekStart: '2026-06-15', totalCost: 3367.59, totalTokens: 3_500_000_000 },
      { weekStart: '2026-06-22', totalCost: 1753.9, totalTokens: 2_300_000_000 },
      { weekStart: '2026-06-29', totalCost: 272.31, totalTokens: 385_000_000 },
    ],
    // 상세 탭 토큰 구성(전체 기간 합). 캐시 읽기가 압도적(캐시 효율 ~97%) — 실사용 전형.
    tokens: { input: 12_400_000, output: 8_100_000, cacheCreate: 520_000_000, cacheRead: 16_040_000_000 },
  },
  // 히어로 5h·주간 게이지(fetchUsage utilization 형태). resetsAt은 표시 TZ로 변환(고정 미래 시각).
  limits: {
    fiveHour: { utilization: 67, resetsAt: '2026-06-30T18:49:00Z', etaMinutes: 43 },
    sevenDay: { utilization: 7, resetsAt: '2026-07-06T13:59:00Z', etaMinutes: 3600 },
  },
  // 상세 탭 시스템 카드(SYS-030, renderSysStats 형태). 영어 assets/detail.png 재현(CPU 51%·RAM 71% 22.5/31.8GB·GPU 1%).
  // captureAndQuit이 DASH_SAMPLE일 때 실 sysStats 푸시를 끄므로(레이스 방지) 캡처용 대표 sys를 주입한다.
  sys: { cpu: 51, mem: { pct: 71, usedBytes: 24_159_191_040, totalBytes: 34_144_990_003 }, gpu: 1 },
};

module.exports = { DASH_SAMPLE };
