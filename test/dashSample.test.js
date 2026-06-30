const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DASH_SAMPLE } = require('../src/renderer/dashSample');
const { legendItems } = require('../src/renderer/modelDonut');

// DOC-SHOT-010: 대시보드 캡처 샘플은 renderAgg/renderLimits(index.html)의 "빈 화면 안 되는" 계약을
// 충족해야 채워진 스크린샷이 나온다. self-check이 그 필수 필드를 가드(누락 시 캡처가 조용히 빈 화면).
test('DOCSHOT010_샘플_renderAgg_필수필드_채워진대시보드', () => {
  const a = DASH_SAMPLE.agg;
  // renderAgg는 `!agg.burn`이면 즉시 return → 히어로/추세 미갱신. burn 필수.
  assert.equal(typeof a.burn.costPerHour, 'number');
  assert.equal(typeof a.burn.tokPerHour, 'number');
  // 일별 추세: daily 비면 drawTrend 빈상태. 각 항목 period(YYYY-MM-DD)+totalCost/totalTokens(trendChart pick).
  assert.ok(Array.isArray(a.daily) && a.daily.length > 0);
  for (const d of a.daily) {
    assert.match(d.period, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(typeof d.totalCost, 'number');
    assert.equal(typeof d.totalTokens, 'number');
  }
  // 오늘 KPI + 모델 도넛(today.models). 도넛/범례는 modelName 키를 읽는다(name 아님) — 과거 키 오타로 범례 모델명 빈칸이던 회귀 가드.
  assert.equal(typeof a.today.totalCost, 'number');
  assert.equal(typeof a.today.totalTokens, 'number');
  assert.ok(Array.isArray(a.today.models) && a.today.models.length > 0);
  for (const m of a.today.models) {
    assert.equal(typeof m.modelName, 'string');
    assert.ok(m.modelName.length > 0);
    assert.equal(typeof m.cost, 'number');
  }
  // 핵심: legendItems가 비지 않은 범례명을 산출해야 도넛 범례에 모델명이 뜬다(키 오타 시 name=undefined로 빈칸).
  for (const it of legendItems(a.today.models, ['#3182F6', '#15803D'])) {
    assert.equal(typeof it.name, 'string');
    assert.ok(it.name.length > 0, '범례 모델명 비어있음(modelName 키 확인)');
  }
  // 최근 7일 통계.
  assert.equal(typeof a.last7.totalCost, 'number');
  assert.equal(typeof a.last7.totalTokens, 'number');
  // 최근 5주: renderWeekly has=cost>0||tokens>0 아니면 빈상태 → 최소 1주 양수. weekStart+값.
  assert.ok(Array.isArray(a.weekly) && a.weekly.length > 0);
  assert.ok(a.weekly.some((w) => w.totalCost > 0 || w.totalTokens > 0));
  for (const w of a.weekly) {
    assert.match(w.weekStart, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(typeof w.totalCost, 'number');
    assert.equal(typeof w.totalTokens, 'number');
  }
  // 상세 탭 토큰 구성(renderTokens: input/output/cacheCreate/cacheRead).
  for (const k of ['input', 'output', 'cacheCreate', 'cacheRead']) {
    assert.equal(typeof a.tokens[k], 'number');
  }
  // 통화 병기(₩) — krwPerUsd>0이라야 today-cost-krw 표시.
  assert.ok(a.krwPerUsd > 0);
});

test('DOCSHOT010_샘플_renderLimits_게이지_utilization', () => {
  const l = DASH_SAMPLE.limits;
  // renderUsageCol은 typeof w.utilization!=='number'이면 '—'(빈 게이지). 5h·7d 둘 다 0~100 수치 필수.
  for (const w of [l.fiveHour, l.sevenDay]) {
    assert.equal(typeof w.utilization, 'number');
    assert.ok(w.utilization >= 0 && w.utilization <= 100);
  }
});

// DOC-SHOT: 상세 시스템 카드(renderSysStats)도 캡처 시 __captureSample(sys)로 채워진다 — 실 sysStats는 캡처 모드서 가드됨.
// renderSysStats 계약: cpu(number), mem{pct,usedBytes,totalBytes}(number), gpu(number|null) 충족해야 게이지가 '—'/N/A 안 됨.
test('DOCSHOT_샘플_renderSysStats_시스템카드_필드', () => {
  const s = DASH_SAMPLE.sys;
  assert.equal(typeof s.cpu, 'number');
  assert.ok(s.cpu >= 0 && s.cpu <= 100);
  for (const k of ['pct', 'usedBytes', 'totalBytes']) {
    assert.equal(typeof s.mem[k], 'number');
  }
  assert.ok(s.mem.totalBytes > 0 && s.mem.usedBytes >= 0);
  // gpu는 number(게이지%) 또는 null(N/A). 샘플은 영어 원본 재현용 number.
  assert.ok(s.gpu === null || typeof s.gpu === 'number');
});
