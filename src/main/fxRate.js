// KRW 환율 — 기동 시 1회 fetch, 실패/오프라인 시 폴백(§7). 화면 안 깨지게.
const API_URL = 'https://open.er-api.com/v6/latest/USD'; // 키 불필요, rates.KRW 직접 제공.
const FALLBACK_KRW = 1350; // 최후 고정 폴백(오프라인·미설정 시).

// opts: { fetchImpl(주입), lastKnown(마지막 성공값), fixed(설정 고정값) }.
// 반환: { krwPerUsd, source: online|lastKnown|fixed|default }.
async function fetchKrwPerUsd(opts = {}) {
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  try {
    const res = await fetchImpl(API_URL);
    if (!res || !res.ok) throw new Error(`HTTP ${res && res.status}`);
    const data = await res.json();
    const krw = data && data.result === 'success' && data.rates && Number(data.rates.KRW);
    if (!Number.isFinite(krw) || krw <= 0) throw new Error('KRW 없음');
    return { krwPerUsd: krw, source: 'online' };
  } catch (e) {
    // 폴백 우선순위: 마지막 성공값 → 설정 고정값 → 기본 상수.
    if (Number.isFinite(opts.lastKnown) && opts.lastKnown > 0) {
      return { krwPerUsd: opts.lastKnown, source: 'lastKnown' };
    }
    if (Number.isFinite(opts.fixed) && opts.fixed > 0) {
      return { krwPerUsd: opts.fixed, source: 'fixed' };
    }
    return { krwPerUsd: FALLBACK_KRW, source: 'default' };
  }
}

// refreshFx 배선용 opts 빌더(AUDIT-050): 마지막 성공값 + 설정 고정값(§7 "폴백·강제용")을 모두 넘긴다.
// main.js가 fixed를 빠뜨려 오프라인+커스텀 환율 시 사용자값이 무시되던 실결함을 이 단일 출처로 방지.
function fxOptsFor(lastKnown, settings) {
  return { lastKnown, fixed: settings && settings.krwPerUsd };
}

module.exports = { fetchKrwPerUsd, fxOptsFor, FALLBACK_KRW, API_URL };
