const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tFor, LOCALES, loadCatalog } = require('../src/i18n/i18n');

const DASH_KEYS = [
  'dash_active_block', 'dash_trend', 'dash_cost', 'dash_tokens',
  'dash_today', 'dash_projects', 'dash_used', 'dash_eta', 'dash_remaining',
];

test('INT020_대시보드키_10로케일_모두존재', () => {
  for (const lc of LOCALES) {
    const cat = loadCatalog(lc);
    for (const k of DASH_KEYS) assert.ok(k in cat, `${lc} 누락: ${k}`);
  }
});

test('INT020_ko_보간_소진율', () => {
  const t = tFor('ko');
  assert.equal(t('dash_used', { pct: 90 }), '소진 90%');
  assert.equal(t('dash_remaining', { n: 7 }), '남은 7분');
  assert.equal(t('dash_today'), '오늘');
});

test('INT020_en_기본', () => {
  const t = tFor('en');
  assert.match(t('dash_used', { pct: 90 }), /90% used/);
  assert.equal(t('dash_cost'), 'Cost');
});

test('INT020_미지원로케일_en폴백', () => {
  const t = tFor('xx-YY'); // 미지원 → en
  assert.equal(t('dash_cost'), 'Cost');
});

test('INT020_보간_미제공시_플레이스홀더유지안전', () => {
  const t = tFor('en');
  // vars 미제공이면 {pct} 토큰 그대로(크래시 없음).
  assert.match(t('dash_used'), /\{pct\}/);
});
