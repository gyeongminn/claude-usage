// 한 줄 총평 — 규칙 기반 결정적 생성(§7). LLM 호출 없음: ccusage 수치로 분기해 정해진 문구에 값만 끼움.
// 보고서는 EN/KO만(§10) — locale==='ko'면 한국어, 그 외 전부 영어.
(function (root) {
  function num(v) {
    return typeof v === 'number' && isFinite(v) ? v : 0;
  }

  // 캐시 적중률(%) = cacheRead / (input + cacheCreation + cacheRead). 정수 반올림, 분모 0 안전.
  function cacheHitRate(totals) {
    const t = totals || {};
    const read = num(t.cacheReadTokens);
    const denom = num(t.inputTokens) + num(t.cacheCreationTokens) + read;
    if (denom <= 0) return 0;
    return Math.round((read / denom) * 100);
  }

  // momPct: number|null(전월 데이터 없으면 null), cacheHitRate: 정수%.
  function buildVerdict({ momPct, cacheHitRate: rate } = {}, locale) {
    const ko = locale === 'ko';
    const parts = [];

    if (momPct == null) {
      parts.push(ko ? '이번 달이 첫 집계예요.' : 'This is your first tracked month.');
    } else if (momPct > 0) {
      parts.push(ko ? `지난달보다 ${momPct}% 늘었어요.` : `Up ${momPct}% from last month.`);
    } else if (momPct < 0) {
      const abs = Math.abs(momPct);
      parts.push(ko ? `지난달보다 ${abs}% 줄었어요.` : `Down ${abs}% from last month.`);
    } else {
      parts.push(ko ? '지난달과 비슷해요.' : 'About the same as last month.');
    }

    const r = num(rate);
    if (r > 0) {
      // ponytail: 적중률이 비용 절감으로 이어진다는 메시지는 항상 동일 — 임계 분기는 YAGNI.
      parts.push(ko ? `캐시 적중률 ${r}%로 비용을 아꼈습니다.` : `A ${r}% cache hit rate kept costs down.`);
    }

    return parts.join(' ');
  }

  const api = { cacheHitRate, buildVerdict };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Verdict = api;
})(typeof window !== 'undefined' ? window : globalThis);
