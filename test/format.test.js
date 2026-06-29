const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fmtUsd, fmtKrw, fmtUsdKrw, fmtTokens, fmtInt, setLocale } = require('../src/renderer/format');

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

// AUDIT-030: 숫자·통화는 UI 로케일 Intl 포맷(§10). $/₩ 글리프는 접두 고정(§5.1), 숫자만 로케일.
test('AUDIT030_setLocale_de_자리구분_소수기호', () => {
  setLocale('de'); // 자리구분 '.', 소수 ','
  try {
    assert.equal(fmtInt(1234567), '1.234.567');
    assert.equal(fmtUsd(1234.5), '$1.234,50'); // $ 접두 유지 + de 숫자
    assert.equal(fmtKrw(1234567.8), '₩1.234.568');
    assert.equal(fmtUsdKrw(10, 1350), '$10,00 (₩13.500)');
  } finally {
    setLocale('en-US'); // 싱글톤 누수 방지 — 다른 테스트는 en 기대
  }
});

test('AUDIT030_setLocale_en_복원_기존동작', () => {
  setLocale('en-US');
  assert.equal(fmtUsd(1234.5), '$1,234.50');
  assert.equal(fmtInt(1234567), '1,234,567');
});

test('AUDIT030_setLocale_잘못된입력_무시', () => {
  setLocale('en-US');
  setLocale(null); // 비문자열 → 무시(기존 유지)
  setLocale(''); // 빈 문자열 → 무시
  assert.equal(fmtUsd(1234.5), '$1,234.50'); // en 유지
});
