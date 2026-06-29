// KRW 환율 — 기동 시 1회 fetch, 실패/오프라인 시 폴백(§7). 화면 안 깨지게.
const API_URL = 'https://open.er-api.com/v6/latest/USD'; // 키 불필요, rates.KRW 직접 제공.
const FALLBACK_KRW = 1350; // 최후 고정 폴백(오프라인·미설정 시).

// opts: { fetchImpl(주입), lastKnown(마지막 성공값), fixed(설정 고정값), timeoutMs(기본 4000) }.
// 반환: { krwPerUsd, source: online|lastKnown|fixed|default }.
// NET-010: AbortController 타임아웃 — fetch가 reject 아닌 hang(캡티브 포털: TCP 연결되나 HTTP 스톨)이어도
//   timeoutMs 후 abort→reject→폴백→즉시 진행. 무타임아웃이면 undici headersTimeout(~5분)까지 대시보드 게이트(§6).
async function fetchKrwPerUsd(opts = {}) {
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const timeoutMs = Number.isFinite(opts.timeoutMs) && opts.timeoutMs > 0 ? opts.timeoutMs : 4000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(API_URL, { signal: ctrl.signal });
    if (!res || !res.ok) throw new Error(`HTTP ${res && res.status}`);
    const data = await res.json();
    const krw = data && data.result === 'success' && data.rates && Number(data.rates.KRW);
    if (!Number.isFinite(krw) || krw <= 0) throw new Error('KRW 없음');
    return { krwPerUsd: krw, source: 'online' };
  } catch (e) {
    // 폴백 우선순위(타임아웃 abort 포함 모든 실패): 마지막 성공값 → 설정 고정값 → 기본 상수.
    if (Number.isFinite(opts.lastKnown) && opts.lastKnown > 0) {
      return { krwPerUsd: opts.lastKnown, source: 'lastKnown' };
    }
    if (Number.isFinite(opts.fixed) && opts.fixed > 0) {
      return { krwPerUsd: opts.fixed, source: 'fixed' };
    }
    return { krwPerUsd: FALLBACK_KRW, source: 'default' };
  } finally {
    clearTimeout(timer); // 성공·실패 무관 타이머 정리(누수·핸들 잔존 방지).
  }
}

// refreshFx 배선용 opts 빌더(AUDIT-050): 마지막 성공값 + 설정 고정값(§7 "폴백·강제용")을 모두 넘긴다.
// main.js가 fixed를 빠뜨려 오프라인+커스텀 환율 시 사용자값이 무시되던 실결함을 이 단일 출처로 방지.
function fxOptsFor(lastKnown, settings) {
  return { lastKnown, fixed: settings && settings.krwPerUsd };
}

module.exports = { fetchKrwPerUsd, fxOptsFor, FALLBACK_KRW, API_URL };
