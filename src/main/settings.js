// 설정 영속화(OPS-050, §1/§4.2): 저장위치·환율·자동실행·언어·플랜한도. userData/settings.json.
// 순수 로직(머지·검증)은 파일 I/O와 분리해 TDD. load/save는 fs 주입 가능.
const fs = require('node:fs');
const path = require('node:path');
const { LOCALES } = require('../i18n/i18n');

// 기본값. reportsDir=''는 "앱 데이터 폴더 reports/"를 의미(호출부에서 해석). locale=null=시스템 언어 자동(§10).
const DEFAULTS = {
  reportsDir: '',
  krwPerUsd: 1350, // 환율 폴백 기본(§7, fxRate FALLBACK과 일치).
  autoLaunch: true,
  locale: null, // null → app.getLocale() 자동(§10). 'ko' 등 지정 시 강제.
  planTokenLimit: null, // 플랜 토큰 한도(OPEN[09]). null=미설정(시간 소진율만).
  theme: 'light', // UI 테마(UI-020). 'light'|'dark'. 기본 라이트(§5.2).
};
const KEYS = Object.keys(DEFAULTS);

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const posNum = (v) => (typeof v === 'number' && isFinite(v) && v > 0 ? v : null);

// 화이트리스트 키만 기본값 위에 머지(미지정·미지원 키 무시).
function mergeSettings(partial) {
  const src = isObj(partial) ? partial : {};
  const out = { ...DEFAULTS };
  for (const k of KEYS) if (k in src) out[k] = src[k];
  return out;
}

// 값 검증 + 잘못된 값 폴백. 머지 후 적용.
function validateSettings(partial) {
  const s = mergeSettings(partial);
  const krw = posNum(s.krwPerUsd);
  return {
    reportsDir: typeof s.reportsDir === 'string' ? s.reportsDir : DEFAULTS.reportsDir,
    krwPerUsd: krw == null ? DEFAULTS.krwPerUsd : krw,
    autoLaunch: !!s.autoLaunch,
    locale: LOCALES.includes(s.locale) ? s.locale : null, // 미지원/ null → 시스템 자동.
    planTokenLimit: posNum(s.planTokenLimit), // 양수 아니면 null.
    theme: s.theme === 'dark' ? 'dark' : 'light', // dark만 dark, 그 외 light 폴백.
  };
}

function settingsPath(dir) {
  return path.join(dir, 'settings.json');
}

// 디스크에서 로드(없거나 깨지면 기본값). dir=userData.
function loadSettings(dir, readFile = defaultRead) {
  let raw = null;
  try {
    const p = settingsPath(dir);
    raw = fs.existsSync(p) ? JSON.parse(readFile(p)) : null;
  } catch (e) {
    raw = null; // 손상 파일 → 기본값으로 복구.
  }
  return validateSettings(raw);
}

// 검증 후 저장(원자성 위해 임시파일→rename은 과함, ponytail: 직접 쓰기로 충분).
function saveSettings(dir, partial, writeFile = defaultWrite) {
  const valid = validateSettings(partial);
  fs.mkdirSync(dir, { recursive: true });
  writeFile(settingsPath(dir), JSON.stringify(valid, null, 2));
  return valid;
}

function defaultRead(p) {
  return fs.readFileSync(p, 'utf8');
}
function defaultWrite(p, data) {
  fs.writeFileSync(p, data);
}

module.exports = { DEFAULTS, mergeSettings, validateSettings, settingsPath, loadSettings, saveSettings };
