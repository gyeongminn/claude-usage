const { test } = require('node:test');
const assert = require('node:assert/strict');
const { topNWithOther, buildProjectBarOption } = require('../src/renderer/projectBars');
const { makeEchartsTheme, TOKENS } = require('../src/renderer/echartsTheme');

const theme = makeEchartsTheme(TOKENS);
const projects = [
  { project: 'a', totalCost: 50 },
  { project: 'b', totalCost: 40 },
  { project: 'c', totalCost: 30 },
  { project: 'd', totalCost: 20 },
  { project: 'e', totalCost: 10 },
  { project: 'f', totalCost: 6 },
  { project: 'g', totalCost: 4 },
];

test('DSH050_Top5_나머지_기타묶음', () => {
  const rows = topNWithOther(projects, 5);
  assert.equal(rows.length, 6); // Top5 + 기타
  assert.deepEqual(rows.map((r) => r.project), ['a', 'b', 'c', 'd', 'e', '기타']);
  assert.equal(rows[5].totalCost, 10); // f(6)+g(4)
});

test('DSH050_정렬_내림차순', () => {
  const rows = topNWithOther([{ project: 'x', totalCost: 1 }, { project: 'y', totalCost: 9 }], 5);
  assert.deepEqual(rows.map((r) => r.project), ['y', 'x']); // 큰 비용 먼저
});

test('DSH050_N이하면_기타없음', () => {
  const rows = topNWithOther(projects.slice(0, 3), 5);
  assert.equal(rows.length, 3);
  assert.ok(!rows.some((r) => r.project === '기타'));
});

test('DSH050_기타_0이면_생략', () => {
  // Top5에 딱 5개 + 0짜리 1개 → 기타 합 0이면 추가 안 함.
  const p = [...projects.slice(0, 5), { project: 'z', totalCost: 0 }];
  const rows = topNWithOther(p, 5);
  assert.equal(rows.length, 5);
});

test('DSH050_바옵션_가로형_테마색', () => {
  const opt = buildProjectBarOption(topNWithOther(projects, 5), theme);
  assert.equal(opt.yAxis.type, 'category'); // 가로 바 = y가 카테고리
  assert.equal(opt.xAxis.type, 'value');
  assert.equal(opt.series[0].type, 'bar');
  assert.equal(opt.series[0].itemStyle.color, TOKENS.accent);
});

test('DSH050_빈배열_안전', () => {
  assert.deepEqual(topNWithOther([], 5), []);
});

test('DSH050_라벨없음_unknown폴백', () => {
  const rows = topNWithOther([{ totalCost: 5 }], 5); // name·project 둘 다 없음
  assert.equal(rows[0].project, '(unknown)'); // undefined 라벨 방지
});

test('DSH050_라벨우선_name_fallback_project', () => {
  // ccusage --instances 는 project 키. name 우선, 없으면 project.
  const rows = topNWithOther([{ name: '내프로젝트', totalCost: 5 }], 5);
  assert.equal(rows[0].project, '내프로젝트');
});
