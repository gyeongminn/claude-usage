const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tFor, LOCALES, loadCatalog } = require('../src/i18n/i18n');

const DASH_KEYS = [
  'dash_active_block', 'dash_trend', 'dash_cost', 'dash_tokens',
  'dash_today', 'dash_projects', 'dash_used', 'dash_eta', 'dash_remaining',
  // AUDIT-010: 프로젝트 카드 빈상태(가짜 데이터 제거, ccusage 데이터원 부재 OPEN[08]).
  'dash_projects_empty',
  // AUDIT-060: 추세/도넛 무데이터 빈상태(가짜 sampleDaily/sampleModels 제거, §2).
  'dash_no_data',
  // AUDIT-040: 히어로 burn 단위(하드코딩 제거, §10 t() 경유).
  'dash_per_hour', 'dash_tok_per_hour',
  // FEAT-010: 업데이트 알림 배너(새 버전 {version} · 받기).
  'update_available', 'update_get',
  // 메인/상세 탭 + 실제 사용 한도(5h·주간) 히어로.
  'tab_main', 'tab_detail', 'usage_5h', 'usage_weekly', 'usage_reset', 'usage_eta',
  // BL-03: OAuth 토큰 만료/없음 → 재로그인 안내.
  'usage_reauth',
  // BL-05: 상세 탭 토큰 구성·캐시 효율.
  'detail_token_comp', 'tok_input', 'tok_output', 'tok_cache_create', 'tok_cache_read', 'cache_efficiency',
  // MODELSHARE: 상세 탭 모델 사용 비중(도넛+범례).
  'model_share',
  // WEEK5: 메인 탭 최근 5주 주차별 사용량.
  'dash_weekly5',
  // SYS-030: 상세 탭 시스템 리소스(CPU·RAM·GPU) 카드.
  'sys_title', 'sys_cpu', 'sys_ram', 'sys_gpu', 'sys_gpu_na',
  // TILE-030: 메인 탭 타일 구성(상세 '메인 타일' 카드 + 추가/제거 토글).
  'tile_customize', 'tile_add', 'tile_remove',
];

test('INT020_대시보드키_10로케일_모두존재', () => {
  for (const lc of LOCALES) {
    const cat = loadCatalog(lc);
    for (const k of DASH_KEYS) assert.ok(k in cat, `${lc} 누락: ${k}`);
  }
});

// UI-040: 설정 화면 라벨이 10로케일에 모두 존재(드리프트 가드). BL-02로 set_accurate 추가.
const SET_KEYS = [
  'set_title', 'set_language', 'set_system', 'set_light', 'set_dark',
  'set_timezone', 'set_krw', 'set_token_limit', 'set_reports_dir', 'set_scale',
  'set_autolaunch', 'set_check_updates', 'set_save', 'set_cancel',
  // BL-02: 실제 사용 한도(oauth /usage) 조회 토글.
  'set_accurate',
  // A11Y-010: 설정 닫기(X) 버튼 접근 이름(aria-label/title) — 하드코딩 영어 제거(§10).
  'set_close',
];
test('UI040_설정키_10로케일_모두존재', () => {
  for (const lc of LOCALES) {
    const cat = loadCatalog(lc);
    for (const k of SET_KEYS) assert.ok(k in cat && cat[k], `${lc} 누락/빈값: ${k}`);
  }
});

test('A11Y010_설정닫기_접근이름_en_ko', () => {
  // 설정 모달 닫기(X) 버튼의 접근 이름(data-i18n-title=set_close → applyI18n이 title+aria-label 현지화).
  assert.equal(tFor('en')('set_close'), 'Close');
  assert.equal(tFor('ko')('set_close'), '닫기');
});

test('AUDIT060_무데이터_빈상태_키_en_ko', () => {
  // 추세/도넛 무데이터 시 표시되는 범용 빈상태 문구(가짜 샘플 제거 후, §2).
  assert.equal(tFor('en')('dash_no_data'), 'No usage data yet');
  assert.equal(tFor('ko')('dash_no_data'), '아직 사용 데이터가 없어요');
});

test('AUDIT010_프로젝트_빈상태_키_en_ko_비어있지않음', () => {
  // 가짜 프로젝트 데이터 대신 t() 경유 빈상태 문구. 10로케일 존재는 위 테스트가, 핵심 2종 값 검증.
  for (const lc of ['en', 'ko']) {
    const v = tFor(lc)('dash_projects_empty');
    assert.equal(typeof v, 'string');
    assert.ok(v.length > 0 && v !== 'dash_projects_empty', `${lc} 빈상태 문구 누락`);
  }
});

test('FEAT010_update_배너_보간_en_ko', () => {
  assert.equal(tFor('en')('update_available', { version: 'v0.2.0' }), 'New version v0.2.0');
  assert.equal(tFor('ko')('update_available', { version: 'v0.2.0' }), '새 버전 v0.2.0');
  assert.equal(tFor('en')('update_get'), 'Get');
  assert.equal(tFor('ko')('update_get'), '받기');
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
