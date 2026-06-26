// 히어로 burn 게이지 임계 색전환(§5.1·§5.2): 평소 accent → ≥85% warn → ≥95% over.
// 항상-노랑 금지 — 평상시는 단색 accent.
// UMD: node 테스트는 module.exports, 렌더러는 <script>로 window.BurnGauge 노출(로직 단일 출처, 드리프트 없음).
(function (root) {
  const WARN_AT = 85;
  const OVER_AT = 95;

  function clampPct(pct) {
    const n = Number(pct);
    if (!Number.isFinite(n)) return 0;
    return Math.min(100, Math.max(0, n));
  }

  function gaugeState(pct) {
    const p = clampPct(pct);
    if (p >= OVER_AT) return 'over';
    if (p >= WARN_AT) return 'warn';
    return 'normal';
  }

  // 상태 → 토큰색. normal은 accent.
  function burnColor(pct, tokens) {
    const state = gaugeState(pct);
    return state === 'over' ? tokens.over : state === 'warn' ? tokens.warn : tokens.accent;
  }

  const api = { burnColor, gaugeState, clampPct, WARN_AT, OVER_AT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BurnGauge = api;
})(typeof window !== 'undefined' ? window : globalThis);
