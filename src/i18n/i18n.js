const fs = require('node:fs');
const path = require('node:path');

// UI 지원 로케일 10종(LTR, §10). en=canonical 폴백.
const LOCALES = ['en', 'es', 'pt-BR', 'ja', 'ko', 'de', 'fr', 'zh-CN', 'it', 'vi'];

// 시스템 로케일(app.getLocale()) → 지원 로케일. 정확매칭 우선, 같은 언어 폴백, 최종 en.
function resolveLocale(sys) {
  if (!sys || typeof sys !== 'string') return 'en';
  if (LOCALES.includes(sys)) return sys;
  const base = sys.split('-')[0].toLowerCase();
  return LOCALES.find((l) => l.split('-')[0].toLowerCase() === base) || 'en';
}

function interpolate(str, vars) {
  if (typeof str !== 'string') return String(str); // 카탈로그에 숫자/불린 들어와도 안전.
  // own 키만 보간 — `k in vars`는 프로토타입 체인까지 봐서 {constructor}/{toString} 등
  // Object.prototype 멤버명 플레이스홀더가 가비지(함수 문자열)로 치환됨(AUTO-020).
  const has = (k) => vars != null && Object.prototype.hasOwnProperty.call(vars, k);
  return str.replace(/\{(\w+)\}/g, (m, k) => (has(k) ? String(vars[k]) : m));
}

// t(key, vars): localeCatalog → enCatalog → key 순 폴백 + {var} 보간.
// ponytail: locale 인자는 향후 복수형/포맷 분기용으로 보존(현재 룩업엔 카탈로그만 사용).
function makeT(locale, enCatalog = {}, localeCatalog = {}) {
  // own 키만 조회 — `key in catalog`는 프로토타입 체인까지 봐서 'toString'/'constructor' 등
  // Object.prototype 멤버명 키가 상속 함수로 끌려와 interpolate가 함수 소스로 치환됨(interpolate AUTO-020 선례와 동일 클래스).
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  return (key, vars) => {
    const raw = own(localeCatalog, key) ? localeCatalog[key] : own(enCatalog, key) ? enCatalog[key] : key;
    return interpolate(raw, vars);
  };
}

function loadCatalog(locale) {
  // path traversal 차단 — 화이트리스트된 로케일만 파일로 매핑.
  if (!LOCALES.includes(locale)) return {};
  const p = path.join(__dirname, `${locale}.json`);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
}

// 시스템 로케일 → 해석 → en 폴백 포함 t 생성(앱에서 진입점).
function tFor(systemLocale) {
  const locale = resolveLocale(systemLocale);
  return makeT(locale, loadCatalog('en'), loadCatalog(locale));
}

// §10 숫자·통화·날짜 로케일 포맷은 렌더러 format.js(fmtUsd/fmtKrw/fmtInt·setLocale)가 담당(AUDIT-030).
// 과거 여기 있던 formatCurrency/formatNumber는 생산 미참조 死코드라 제거(BL-06 선례).

module.exports = {
  LOCALES,
  resolveLocale,
  makeT,
  tFor,
  loadCatalog,
};
