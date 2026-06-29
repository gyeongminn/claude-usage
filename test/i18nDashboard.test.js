const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tFor, LOCALES, loadCatalog } = require('../src/i18n/i18n');

const DASH_KEYS = [
  'dash_active_block', 'dash_trend', 'dash_cost', 'dash_tokens',
  'dash_today', 'dash_projects', 'dash_used', 'dash_eta', 'dash_remaining',
  // AUDIT-010: 프로젝트 카드 빈상태(가짜 데이터 제거, ccusage 데이터원 부재 OPEN[08]).
  'dash_projects_empty',
  // AUDIT-040: 히어로 burn 단위(하드코딩 제거, §10 t() 경유).
  'dash_per_hour', 'dash_tok_per_hour',
];

test('INT020_대시보드키_10로케일_모두존재', () => {
  for (const lc of LOCALES) {
    const cat = loadCatalog(lc);
    for (const k of DASH_KEYS) assert.ok(k in cat, `${lc} 누락: ${k}`);
  }
});

// UI-040: 설정 화면 라벨 14키가 10로케일에 모두 존재(드리프트 가드).
const SET_KEYS = [
  'set_title', 'set_language', 'set_system', 'set_light', 'set_dark',
  'set_timezone', 'set_krw', 'set_token_limit', 'set_reports_dir', 'set_scale',
  'set_autolaunch', 'set_check_updates', 'set_save', 'set_cancel',
];
test('UI040_설정키_10로케일_모두존재', () => {
  for (const lc of LOCALES) {
    const cat = loadCatalog(lc);
    for (const k of SET_KEYS) assert.ok(k in cat && cat[k], `${lc} 누락/빈값: ${k}`);
  }
});

test('AUDIT010_프로젝트_빈상태_키_en_ko_비어있지않음', () => {
  // 가짜 프로젝트 데이터 대신 t() 경유 빈상태 문구. 10로케일 존재는 위 테스트가, 핵심 2종 값 검증.
  for (const lc of ['en', 'ko']) {
    const v = tFor(lc)('dash_projects_empty');
    assert.equal(typeof v, 'string');
    assert.ok(v.length > 0 && v !== 'dash_projects_empty', `${lc} 빈상태 문구 누락`);
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
