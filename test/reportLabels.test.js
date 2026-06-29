const { test } = require('node:test');
const assert = require('node:assert/strict');
const { reportLabels } = require('../src/report/reportLabels');

// PDF-060: PDF는 EN·KO만(§10). ko→한국어, 그 외 전부 영어 폴백.
test('PDF060_reportLabels_ko_한국어', () => {
  const L = reportLabels('ko');
  assert.equal(L.totalCost, '총 비용');
  assert.equal(L.dailyTrend, '일자별 추세');
  assert.equal(L.cacheEfficiency, '캐시 효율');
});

test('PDF060_reportLabels_en_영어', () => {
  const L = reportLabels('en');
  assert.equal(L.totalCost, 'Total cost');
  assert.equal(L.tokenComposition, 'Token composition');
});

test('PDF060_reportLabels_미지원로케일_en폴백', () => {
  assert.equal(reportLabels('ja').totalCost, 'Total cost'); // ja는 PDF 미지원→en
  assert.equal(reportLabels('pt-BR').totalCost, 'Total cost');
  assert.equal(reportLabels(undefined).totalCost, 'Total cost');
});

test('PDF060_reportLabels_생성·세션_템플릿보간', () => {
  const en = reportLabels('en');
  assert.equal(en.generated.replace('{t}', '2026-06-01'), 'Generated 2026-06-01');
  assert.equal(en.sessions.replace('{n}', '4'), 'Sessions — 4 total, top 3 by cost');
  const ko = reportLabels('ko');
  assert.equal(ko.generated.replace('{t}', '2026-06-01'), '2026-06-01 생성');
  assert.equal(ko.sessions.replace('{n}', '4'), '세션 — 총 4개, 비용 상위 3');
});

// AUDIT-040: 푸터 "단가 출처: ccusage pricing"(§4.2 — 끝 "pricing" 단어) + '기타'(other) 로케일화.
test('AUDIT040_pricingSource_pricing단어_other라벨', () => {
  const en = reportLabels('en');
  const ko = reportLabels('ko');
  assert.match(en.pricingSource, /ccusage pricing$/);
  assert.match(ko.pricingSource, /ccusage pricing$/);
  assert.equal(en.other, 'Other');
  assert.equal(ko.other, '기타');
});

test('PDF060_reportLabels_키집합_동일', () => {
  // en/ko 키 누락 방지(자체 드리프트 가드).
  const a = Object.keys(reportLabels('en')).sort();
  const b = Object.keys(reportLabels('ko')).sort();
  assert.deepEqual(a, b);
});

test('RPT010_projectsEmpty_빈상태_라벨_en_ko', () => {
  // 보고서 p4(프로젝트·세션)가 빈 데이터(OPEN[08])일 때 노출할 빈상태 메시지(§2/AUDIT-010 선례). EN/KO 둘 다 존재·비공백.
  const en = reportLabels('en').projectsEmpty;
  const ko = reportLabels('ko').projectsEmpty;
  assert.ok(typeof en === 'string' && en.trim().length > 0, 'en projectsEmpty 존재');
  assert.ok(typeof ko === 'string' && ko.trim().length > 0, 'ko projectsEmpty 존재');
});
