const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULTS, mergeSettings, validateSettings } = require('../src/main/settings');

test('OPS050_DEFAULTS_필수키', () => {
  for (const k of ['reportsDir', 'krwPerUsd', 'autoLaunch', 'locale', 'planTokenLimit']) {
    assert.ok(k in DEFAULTS, `누락 키: ${k}`);
  }
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
