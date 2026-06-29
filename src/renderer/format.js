// 통화·숫자 포맷(§5.1) — $X (₩Y) 병기, tabular(고정폭은 CSS font-feature 'tnum').
// UMD: node 테스트·렌더러(window.Fmt). ponytail: Intl 위임, 자릿수 직접 구현 안 함.
(function (root) {
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  // §10: 숫자는 UI 로케일의 Intl 포맷(자리구분·소수기호가 de/fr/it/vi 등에서 다름).
  // §5.1: 통화 글리프($·₩)는 토스 디자인대로 접두 고정 — 로케일은 '숫자 포맷'만 좌우(기호는 브랜드 일관).
  // AUDIT-030: 기존 'en-US' 하드코딩 → setLocale로 주입. 미설정 시 en-US(기존 동작 보존).
  let usdFmt, intFmt, tokFmt;
  function build(locale) {
    usdFmt = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    intFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    // 토큰 큰수 표기: 로케일별 표준 컴팩트(ko 만/억, ja 万/億, zh 万/亿, en K/M/B, de Mio./Mrd. …).
    tokFmt = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
  }
  build('en-US');

  // 렌더러 기동 시 window.usage.locale로 1회 설정. 비문자열/잘못된 로케일은 무시(기존 유지).
  function setLocale(locale) {
    if (typeof locale !== 'string' || !locale) return;
    try {
      build(locale);
    } catch (e) {
      build('en-US'); // 구조적으로 잘못된 태그 → en-US 폴백(화면 안 깨짐).
    }
  }

  function fmtUsd(v) {
    return '$' + usdFmt.format(num(v));
  }

  function fmtInt(v) {
    return intFmt.format(Math.round(num(v)));
  }

  function fmtKrw(v) {
    return '₩' + fmtInt(v);
  }

  // $X (₩Y). krwPerUsd 없거나 0이면 USD만(오프라인/미설정 안전).
  function fmtUsdKrw(usd, krwPerUsd) {
    const base = fmtUsd(usd);
    const rate = num(krwPerUsd);
    if (rate <= 0) return base;
    return `${base} (${fmtKrw(num(usd) * rate)})`;
  }

  // 토큰 큰수 표기 — 로케일별 표준 컴팩트(사용자 요청: 한국 1230만·10억, ja 万/億, zh 万/亿, en K/M/B).
  // 네이티브 Intl 컴팩트에 위임(setLocale로 로케일 주입). 직접 자릿수 구현 안 함.
  function fmtTokens(v) {
    return tokFmt.format(Math.round(num(v)));
  }

  const api = { fmtUsd, fmtKrw, fmtUsdKrw, fmtTokens, fmtInt, setLocale };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Fmt = api;
})(typeof window !== 'undefined' ? window : globalThis);
