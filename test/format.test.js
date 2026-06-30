const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fmtUsd, fmtKrw, fmtUsdKrw, fmtTokens, fmtInt, fmtGb, setLocale } = require('../src/renderer/format');

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

test('DAT050_fmtTokens_K_M_축약_en컴팩트', () => {
  setLocale('en-US');
  assert.equal(fmtTokens(500), '500');
  assert.equal(fmtTokens(1500), '1.5K');
  assert.equal(fmtTokens(1234567), '1.2M');
  assert.equal(fmtTokens(2500000000), '2.5B');
});

test('DAT050_fmtTokens_경계_en', () => {
  setLocale('en-US');
  assert.equal(fmtTokens(999), '999');
  assert.equal(fmtTokens(1000), '1K'); // Intl 컴팩트는 꼬리 .0 제거
  assert.equal(fmtTokens(1000000), '1M');
});

// 사용자 요청: 언어별 큰수 표기. 한국어는 만/억 단위.
test('TOKFMT_ko_만_억', () => {
  setLocale('ko');
  try {
    assert.equal(fmtTokens(12300000), '1230만');
    assert.equal(fmtTokens(1000000000), '10억');
    assert.equal(fmtTokens(1234567890), '12.3억');
  } finally {
    setLocale('en-US'); // 싱글톤 누수 방지
  }
});

test('TOKFMT_ja_zh_CJK단위', () => {
  setLocale('ja');
  try { assert.equal(fmtTokens(12300000), '1230万'); assert.equal(fmtTokens(1000000000), '10億'); } finally { setLocale('en-US'); }
  setLocale('zh-CN');
  try { assert.equal(fmtTokens(1000000000), '10亿'); } finally { setLocale('en-US'); }
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

// SYS-030: 시스템 RAM "used / total GB"도 §10 로케일 소수기호 따라야(콤마소수 로케일서 22,5). 과거 toFixed(1)=마침표 고정 회귀 가드.
test('SYS030_fmtGb_로케일_소수기호', () => {
  const USED = 24_159_191_040; // 22.5 GiB
  setLocale('en-US');
  assert.equal(fmtGb(USED), '22.5'); // 마침표 소수(en)
  setLocale('de-DE');
  assert.equal(fmtGb(USED), '22,5'); // 콤마 소수(de/vi/fr/it/es/pt-BR)
  setLocale('en-US'); // 다른 테스트 오염 방지(모듈 전역 포맷터 복구)
  assert.equal(fmtGb(0), '0.0'); // NaN/0 안전(num 가드)
  assert.equal(fmtGb(undefined), '0.0');
});
