const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildTrendOption } = require('../src/renderer/trendChart');
const { makeEchartsTheme, TOKENS } = require('../src/renderer/echartsTheme');

const daily = [
  { period: '2026-06-24', totalCost: 10.5, totalTokens: 1000 },
  { period: '2026-06-25', totalCost: 22.0, totalTokens: 3000 },
  { period: '2026-06-26', totalCost: 8.25, totalTokens: 500 },
];
const theme = makeEchartsTheme(TOKENS);

test('DSH030_xAxis_날짜', () => {
  const opt = buildTrendOption(daily, 'cost', theme);
  assert.deepEqual(opt.xAxis.data, ['2026-06-24', '2026-06-25', '2026-06-26']);
});

test('TRENDH_xAxis_라벨_가로(사용자요청)', () => {
  // 사용자 요청: 날짜 표기 세로 말고 가로로. TREND7로 최근 7일만이라 가로여도 겹치지 않음.
  const opt = buildTrendOption(daily, 'cost', theme);
  assert.equal(opt.xAxis.axisLabel.rotate, 0); // 가로(회전 0)
  assert.equal(opt.xAxis.axisLabel.interval, 0); // 모든 날짜 라벨 유지(막대1=하루1)
});

test('AUTO030_월간_많은날짜_라벨_솎음회전(보고서 가독성·§5)', () => {
  // 보고서(PDF p2)는 월 전체(예: 31일)를 같은 빌더에 넘김 → interval:0/rotate:0면 31개 라벨이 겹쳐
  // 검은 뭉텅이로 불가독(§5 가독성 위반). 라벨이 많으면(>8) 솎음(interval>0)+회전(rotate>0)으로 가독성 확보.
  const month = Array.from({ length: 31 }, (_, i) => ({
    period: `2026-05-${String(i + 1).padStart(2, '0')}`,
    totalCost: i + 1,
    totalTokens: (i + 1) * 1000,
  }));
  const opt = buildTrendOption(month, 'cost', theme);
  assert.ok(opt.xAxis.axisLabel.interval > 0, '많은 라벨은 솎음(interval>0)');
  assert.ok(opt.xAxis.axisLabel.rotate > 0, '많은 라벨은 회전(rotate>0)');
  const shown = Math.ceil(31 / (opt.xAxis.axisLabel.interval + 1)); // 표시 라벨 수 상한(과밀 방지)
  assert.ok(shown <= 12, `표시 라벨 ${shown}개로 제한`);
});

test('RPT020_월간_회전라벨_좌측패딩_클리핑방지', () => {
  // 보고서(>8일·rotate:30) 첫 x축 날짜 라벨 "2026-05-01"의 선두가 좌측 캔버스 경계서 잘리지 않게
  // grid.left 패딩 확보(containLabel은 y축 폭만 예약·회전 라벨 좌측 overhang 미계산=ECharts 한계).
  const month = Array.from({ length: 31 }, (_, i) => ({
    period: `2026-05-${String(i + 1).padStart(2, '0')}`,
    totalCost: i + 1,
    totalTokens: (i + 1) * 1000,
  }));
  const opt = buildTrendOption(month, 'cost', theme);
  assert.ok(opt.xAxis.axisLabel.rotate > 0, '월간은 회전(전제)');
  assert.ok(opt.grid.left >= 28, `회전 라벨 좌측 overhang 수용(left=${opt.grid.left})`);
  assert.equal(opt.grid.containLabel, true); // y축 폭은 여전히 자동 예약(거동 보존)
});

test('RPT020_주간_좁은패딩_유지_거동보존', () => {
  // 대시보드(≤8일·rotate:0)는 좌측 돌출 微 → 기존 left:8 유지(불필요한 여백 금지).
  const opt = buildTrendOption(daily, 'cost', theme);
  assert.equal(opt.grid.left, 8);
});

test('DSH030_cost_메트릭_비용시리즈', () => {
  const opt = buildTrendOption(daily, 'cost', theme);
  assert.deepEqual(opt.series[0].data, [10.5, 22.0, 8.25]);
});

test('DSH030_tokens_메트릭_토큰시리즈', () => {
  const opt = buildTrendOption(daily, 'tokens', theme);
  assert.deepEqual(opt.series[0].data, [1000, 3000, 500]);
});

test('DSH030_막대_accent', () => {
  // 사용자 요청: 일별 추세는 스무딩 라인이 아니라 막대그래프.
  const opt = buildTrendOption(daily, 'cost', theme);
  assert.equal(opt.series[0].type, 'bar');
  assert.equal(opt.series[0].itemStyle.color, TOKENS.accent);
  assert.deepEqual(opt.series[0].itemStyle.borderRadius, [4, 4, 0, 0]); // 상단만 둥글게(토스 톤)
});

test('DSH030_빈데이터_안전', () => {
  const opt = buildTrendOption([], 'cost', theme);
  assert.deepEqual(opt.xAxis.data, []);
  assert.deepEqual(opt.series[0].data, []);
});

test('DSH030_잘못된메트릭_cost폴백', () => {
  const opt = buildTrendOption(daily, 'bogus', theme);
  assert.deepEqual(opt.series[0].data, [10.5, 22.0, 8.25]); // 기본 cost
});

// UX-030: 비용 축은 $ 단위 명시, 토큰 축은 K/M/B 축약(긴 숫자 방지).
test('UX030_cost_yAxis_달러단위_정수', () => {
  const opt = buildTrendOption(daily, 'cost', theme);
  assert.equal(opt.yAxis.axisLabel.formatter(1395), '$1,395'); // 축은 소수 없이 간결
  assert.equal(opt.yAxis.axisLabel.formatter(40), '$40');
});

test('UX030_tokens_yAxis_KMB축약', () => {
  const opt = buildTrendOption(daily, 'tokens', theme);
  assert.equal(opt.yAxis.axisLabel.formatter(123000000), '123M'); // Intl 컴팩트(꼬리 .0 제거)
  assert.equal(opt.yAxis.axisLabel.formatter(46700), '46.7K');
});

test('UX030_cost_tooltip_달러_소수2', () => {
  const opt = buildTrendOption(daily, 'cost', theme);
  assert.equal(opt.tooltip.valueFormatter(91.4), '$91.40');
});

test('UX030_tokens_tooltip_축약', () => {
  const opt = buildTrendOption(daily, 'tokens', theme);
  assert.equal(opt.tooltip.valueFormatter(46700), '46.7K');
});
