const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULTS, mergeSettings, validateSettings } = require('../src/main/settings');

test('OPS050_DEFAULTS_필수키', () => {
  for (const k of ['reportsDir', 'krwPerUsd', 'autoLaunch', 'locale', 'planTokenLimit']) {
    assert.ok(k in DEFAULTS, `누락 키: ${k}`);
  }
});

// UI-040: 설정 화면용 신규 키 — timezone(표시 타임존 수동 오버라이드, §10)·checkUpdates(업데이트 토글).
test('UI040_DEFAULTS_timezone_checkUpdates', () => {
  assert.ok('timezone' in DEFAULTS);
  assert.equal(DEFAULTS.timezone, null); // null = 시스템 타임존 자동(§10)
  assert.ok('checkUpdates' in DEFAULTS);
  assert.equal(DEFAULTS.checkUpdates, true); // 기본 켜짐(FEAT-010 소비)
});

test('UI040_validate_timezone_유효IANA_or_null', () => {
  assert.equal(validateSettings({ timezone: 'Asia/Seoul' }).timezone, 'Asia/Seoul');
  assert.equal(validateSettings({ timezone: 'America/New_York' }).timezone, 'America/New_York');
  assert.equal(validateSettings({ timezone: 'UTC' }).timezone, 'UTC');
  assert.equal(validateSettings({ timezone: 'Not/AZone' }).timezone, null); // 잘못된 IANA → null(시스템)
  assert.equal(validateSettings({ timezone: '' }).timezone, null);
  assert.equal(validateSettings({ timezone: 123 }).timezone, null);
  assert.equal(validateSettings({ timezone: null }).timezone, null);
  assert.equal(validateSettings({}).timezone, null); // 미지정 → 기본 null
});

test('UI040_validate_checkUpdates_불린_기본true', () => {
  assert.equal(validateSettings({}).checkUpdates, true); // 기본 켜짐
  assert.equal(validateSettings({ checkUpdates: false }).checkUpdates, false);
  assert.equal(validateSettings({ checkUpdates: true }).checkUpdates, true);
  assert.equal(validateSettings({ checkUpdates: 'x' }).checkUpdates, true); // 비불린 → 기본
  assert.equal(validateSettings({ checkUpdates: 0 }).checkUpdates, true); // 비불린 → 기본
});

// BL-02: accurateUsage 토글(실제 사용 한도 oauth /usage 조회). 불린 강제, 기본 켜짐, 끄면 호출 0.
test('BL02_validate_accurateUsage_불린_기본true', () => {
  assert.ok('accurateUsage' in DEFAULTS);
  assert.equal(validateSettings({}).accurateUsage, true); // 기본 켜짐(사용자 선택)
  assert.equal(validateSettings({ accurateUsage: false }).accurateUsage, false); // 끄면 false 영속
  assert.equal(validateSettings({ accurateUsage: true }).accurateUsage, true);
  assert.equal(validateSettings({ accurateUsage: 'x' }).accurateUsage, true); // 비불린 → 기본
  assert.equal(validateSettings({ accurateUsage: 0 }).accurateUsage, true); // 비불린 → 기본
});

test('OPS050_mergeSettings_부분오버라이드', () => {
  const m = mergeSettings({ krwPerUsd: 1400, autoLaunch: false });
  assert.equal(m.krwPerUsd, 1400);
  assert.equal(m.autoLaunch, false);
  assert.equal(m.locale, DEFAULTS.locale); // 미지정은 기본값
});

test('OPS050_mergeSettings_비객체_기본값', () => {
  assert.deepEqual(mergeSettings(null), DEFAULTS);
  assert.deepEqual(mergeSettings('garbage'), DEFAULTS);
  assert.deepEqual(mergeSettings(undefined), DEFAULTS);
});

test('OPS050_mergeSettings_미지정키무시', () => {
  const m = mergeSettings({ unknownKey: 1, krwPerUsd: 1500 });
  assert.equal(m.unknownKey, undefined); // 화이트리스트 외 키 무시
  assert.equal(m.krwPerUsd, 1500);
});

test('OPS050_validate_krwPerUsd_양수아니면_기본값', () => {
  assert.equal(validateSettings({ krwPerUsd: -5 }).krwPerUsd, DEFAULTS.krwPerUsd);
  assert.equal(validateSettings({ krwPerUsd: 0 }).krwPerUsd, DEFAULTS.krwPerUsd);
  assert.equal(validateSettings({ krwPerUsd: 'x' }).krwPerUsd, DEFAULTS.krwPerUsd);
  assert.equal(validateSettings({ krwPerUsd: 1325 }).krwPerUsd, 1325);
});

test('OPS050_validate_locale_미지원이면_null(시스템자동)', () => {
  // locale=null은 "시스템 언어 자동"(§10). 지원 로케일이면 그대로, 미지원이면 null로.
  assert.equal(validateSettings({ locale: 'ko' }).locale, 'ko');
  assert.equal(validateSettings({ locale: 'xx' }).locale, null);
  assert.equal(validateSettings({ locale: null }).locale, null);
});

test('OPS050_validate_autoLaunch_불린강제', () => {
  assert.equal(validateSettings({ autoLaunch: 1 }).autoLaunch, true);
  assert.equal(validateSettings({ autoLaunch: 0 }).autoLaunch, false);
});

test('OPS050_validate_planTokenLimit_양수or_null', () => {
  assert.equal(validateSettings({ planTokenLimit: 1000000 }).planTokenLimit, 1000000);
  assert.equal(validateSettings({ planTokenLimit: -1 }).planTokenLimit, null);
  assert.equal(validateSettings({ planTokenLimit: 'x' }).planTokenLimit, null);
});

// UI-030: UI 배율(uiScale) — webContents.setZoomFactor용. 기본 1, [0.8,1.5] clamp, 0.1 반올림, 잘못된 값 1.
test('UI030_uiScale_기본_1', () => {
  assert.equal(validateSettings({}).uiScale, 1);
  assert.ok('uiScale' in DEFAULTS);
});

test('UI030_uiScale_정상값', () => {
  assert.equal(validateSettings({ uiScale: 1.2 }).uiScale, 1.2);
});

test('UI030_uiScale_범위밖_clamp', () => {
  assert.equal(validateSettings({ uiScale: 0.5 }).uiScale, 0.8); // 하한
  assert.equal(validateSettings({ uiScale: 3 }).uiScale, 1.5); // 상한
});

test('UI030_uiScale_반올림_0.1', () => {
  assert.equal(validateSettings({ uiScale: 1.23 }).uiScale, 1.2);
});

test('UI030_uiScale_잘못된값_1', () => {
  assert.equal(validateSettings({ uiScale: 'x' }).uiScale, 1);
  assert.equal(validateSettings({ uiScale: null }).uiScale, 1);
});

// UI-020: 테마 영속(light|dark). 기본 light(§5.2 라이트 기본), 잘못된 값은 light 폴백.
test('UI020_theme_기본_light', () => {
  assert.equal(validateSettings({}).theme, 'light');
  assert.ok('theme' in DEFAULTS);
});

test('UI020_theme_dark_허용', () => {
  assert.equal(validateSettings({ theme: 'dark' }).theme, 'dark');
});

test('UI020_theme_잘못된값_light폴백', () => {
  assert.equal(validateSettings({ theme: 'neon' }).theme, 'light');
  assert.equal(validateSettings({ theme: null }).theme, 'light');
});

// TILE-010: 메인 탭 타일 구성(settings.mainTiles, §12). tiles.js 카탈로그 화이트리스트·중복제거·미지 드롭·빈/무효→기본.
test('TILE010_DEFAULTS_mainTiles_현행4', () => {
  assert.ok('mainTiles' in DEFAULTS);
  assert.deepEqual(DEFAULTS.mainTiles, ['hero', 'trend', 'today', 'weekly']);
});

test('TILE010_validate_mainTiles_정상부분집합_순서보존', () => {
  assert.deepEqual(validateSettings({ mainTiles: ['system', 'hero', 'trend'] }).mainTiles, ['system', 'hero', 'trend']);
});

test('TILE010_validate_mainTiles_미지드롭_중복제거', () => {
  assert.deepEqual(validateSettings({ mainTiles: ['hero', 'bogus', 'hero', 'tokens'] }).mainTiles, ['hero', 'tokens']);
});

test('TILE010_validate_mainTiles_빈_비배열_무효_미지정_기본폴백', () => {
  assert.deepEqual(validateSettings({ mainTiles: [] }).mainTiles, DEFAULTS.mainTiles);
  assert.deepEqual(validateSettings({ mainTiles: 'hero' }).mainTiles, DEFAULTS.mainTiles);
  assert.deepEqual(validateSettings({ mainTiles: ['nope'] }).mainTiles, DEFAULTS.mainTiles);
  assert.deepEqual(validateSettings({}).mainTiles, DEFAULTS.mainTiles); // 미지정 → 기본
});
