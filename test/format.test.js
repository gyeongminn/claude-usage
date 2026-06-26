const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fmtUsd, fmtKrw, fmtUsdKrw, fmtTokens, fmtInt } = require('../src/renderer/format');

test('DAT050_fmtUsd_달러_2자리천단위', () => {
  assert.equal(fmtUsd(1234.5), '$1,234.50');
  assert.equal(fmtUsd(0), '$0.00');
  assert.equal(fmtUsd(9.999), '$10.00'); // 반올림
});

test('DAT050_fmtUsd_비정상_0', () => {
  assert.equal(fmtUsd(undefined), '$0.00');
  assert.equal(fmtUsd(NaN), '$0.00');
});

test('DAT050_fmtKrw_원_정수천단위', () => {
  // KRW는 소수 없음, 반올림 정수.
  assert.equal(fmtKrw(1234567.8), '₩1,234,568');
  assert.equal(fmtKrw(0), '₩0');
});

test('DAT050_fmtUsdKrw_병기', () => {
  // $X (₩Y) — Y = X * krwPerUsd, 반올림 정수.
  assert.equal(fmtUsdKrw(10, 1350), '$10.00 (₩13,500)');
  assert.equal(fmtUsdKrw(2.5, 1380), '$2.50 (₩3,450)');
});

test('DAT050_fmtUsdKrw_환율0이면_USD만', () => {
  assert.equal(fmtUsdKrw(10, 0), '$10.00'); // 환율 없으면 KRW 생략(안 깨짐)
  assert.equal(fmtUsdKrw(10, undefined), '$10.00');
  assert.equal(fmtUsdKrw(10, -5), '$10.00'); // 음수 환율도 USD만(rate<=0 가드)
  assert.equal(fmtUsdKrw(10, NaN), '$10.00');
});

test('DAT050_fmtTokens_K_M_축약', () => {
  assert.equal(fmtTokens(500), '500');
  assert.equal(fmtTokens(1500), '1.5K');
  assert.equal(fmtTokens(1234567), '1.2M');
  assert.equal(fmtTokens(2500000000), '2.5B');
});

test('DAT050_fmtTokens_경계', () => {
  assert.equal(fmtTokens(999), '999');
  assert.equal(fmtTokens(1000), '1.0K');
  assert.equal(fmtTokens(1000000), '1.0M');
});

test('DAT050_fmtInt_천단위_그룹', () => {
  assert.equal(fmtInt(1234567), '1,234,567');
  assert.equal(fmtInt(0), '0');
});
