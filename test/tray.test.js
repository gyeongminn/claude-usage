const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildTrayMenuTemplate } = require('../src/main/tray');

const handlers = { onOpen: () => 'open', onReport: () => 'report', onQuit: () => 'quit' };

test('OPS010_트레이메뉴_3액션+구분자', () => {
  const tpl = buildTrayMenuTemplate(handlers, (k) => k);
  const ids = tpl.filter((i) => i.id).map((i) => i.id);
  assert.deepEqual(ids, ['open', 'report', 'quit']);
  assert.ok(tpl.some((i) => i.type === 'separator'));
});

test('OPS010_트레이메뉴_핸들러배선', () => {
  const tpl = buildTrayMenuTemplate(handlers, (k) => k);
  const byId = Object.fromEntries(tpl.filter((i) => i.id).map((i) => [i.id, i]));
  assert.equal(byId.open.click, handlers.onOpen);
  assert.equal(byId.report.click, handlers.onReport);
  assert.equal(byId.quit.click, handlers.onQuit);
});

test('OPS010_트레이메뉴_라벨_t경유', () => {
  const t = (k) => ({ tray_open: '대시보드 열기', tray_report: '이번 달 보고서', tray_quit: '종료' }[k]);
  const tpl = buildTrayMenuTemplate(handlers, t);
  const byId = Object.fromEntries(tpl.filter((i) => i.id).map((i) => [i.id, i]));
  assert.equal(byId.open.label, '대시보드 열기');
  assert.equal(byId.report.label, '이번 달 보고서');
  assert.equal(byId.quit.label, '종료');
});

test('OPS010_트레이메뉴_t없으면_영어폴백', () => {
  const tpl = buildTrayMenuTemplate(handlers, null);
  const byId = Object.fromEntries(tpl.filter((i) => i.id).map((i) => [i.id, i]));
  assert.equal(byId.open.label, 'Open dashboard');
  assert.equal(byId.quit.label, 'Quit');
});
