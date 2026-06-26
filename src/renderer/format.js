// 통화·숫자 포맷(§5.1) — $X (₩Y) 병기, tabular(고정폭은 CSS font-feature 'tnum').
// UMD: node 테스트·렌더러(window.Fmt). ponytail: Intl 위임, 자릿수 직접 구현 안 함.
(function (root) {
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  const usdFmt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const intFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

  function fmtUsd(v) {
    return usdFmt.format(num(v));
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

  // 토큰 축약 K/M/B. 1000 미만은 정수, 그 이상 1자리.
  function fmtTokens(v) {
    const n = num(v);
    const abs = Math.abs(n);
    if (abs >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(Math.round(n));
  }

  const api = { fmtUsd, fmtKrw, fmtUsdKrw, fmtTokens, fmtInt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Fmt = api;
})(typeof window !== 'undefined' ? window : globalThis);
