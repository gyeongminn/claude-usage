// 실제 Claude 사용 한도(5h·주간) — Claude Code `/usage`와 동일 소스(api.anthropic.com/api/oauth/usage).
// ccusage는 로컬 JSONL의 비용·토큰 '추정'만 줄 뿐 실제 rate-limit 잔량을 모른다 → 설정창 수치와 일치 불가.
// 이 엔드포인트는 five_hour/seven_day utilization(0~100)·resets_at를 그대로 준다(토큰 소모 없음).
// 현재 계정 OAuth 토큰으로 읽기 전용 GET. 토큰은 로그/저장하지 않는다.
// ⚠ 이 엔드포인트는 공격적으로 rate-limit한다 → 저빈도 폴링(수 분)·캐시·429 백오프 필수.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const USAGE_URL = 'https://api.anthropic.com/api/oauth/usage';
// User-Agent에 `claude-code/<ver>`가 없으면 즉시 공격적 429. 버전 문자열 자체는 관대 — 상수로 충분.
// ponytail: 값이 막히면 실제 설치 버전으로 갱신(현재 동작 확인값).
const UA_VERSION = '2.1.195';

// 현재 계정 자격파일 경로(~/.claude/.credentials.json). CLAUDE_CONFIG_DIR 존중(크로스 머신, §2).
function credentialsPath() {
  const dir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  return path.join(dir, '.credentials.json');
}

// 현재 계정 OAuth 토큰 읽기(claudeAiOauth). 없거나 손상 시 null. readFile 주입(테스트).
function readOAuth(readFile = (p) => fs.readFileSync(p, 'utf8'), credPath = credentialsPath()) {
  try {
    const o = JSON.parse(readFile(credPath));
    const a = o && o.claudeAiOauth;
    if (!a || !a.accessToken) return null;
    return { accessToken: a.accessToken, expiresAt: Number(a.expiresAt) || 0, subscriptionType: a.subscriptionType || null };
  } catch (e) {
    return null;
  }
}

// /usage JSON → 정규화. 각 윈도우: { utilization: 0~100, resetsAt: ISO|null } 또는 null.
function parseUsage(json) {
  if (!json || typeof json !== 'object') return null;
  const win = (w) =>
    w && typeof w.utilization === 'number' ? { utilization: w.utilization, resetsAt: w.resets_at || null } : null;
  return {
    fiveHour: win(json.five_hour),
    sevenDay: win(json.seven_day),
    sevenDaySonnet: win(json.seven_day_sonnet),
    sevenDayOpus: win(json.seven_day_opus),
  };
}

// 실제 한도 조회. 토큰 없음/만료/네트워크 실패/429 → null(caller가 마지막 캐시 유지·백오프).
// fetchImpl·cred·now·version 주입(테스트).
async function fetchUsage(opts = {}) {
  // cred 키를 명시 전달하면(테스트의 null 포함) 그대로 존중, 미전달이면 현재 계정에서 읽음.
  const cred = 'cred' in opts ? opts.cred : readOAuth();
  const now = opts.now || Date.now();
  if (!cred || (cred.expiresAt && cred.expiresAt < now)) return null; // 만료 토큰은 호출 안 함.
  const fetchImpl = opts.fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!fetchImpl) return null;
  try {
    const res = await fetchImpl(USAGE_URL, {
      headers: {
        Authorization: `Bearer ${cred.accessToken}`,
        'anthropic-beta': 'oauth-2025-04-20',
        'User-Agent': `claude-code/${opts.version || UA_VERSION}`,
        Accept: 'application/json',
      },
    });
    if (!res || !res.ok) return null; // 429 포함 — 조용히 null, 마지막 캐시 유지.
    return parseUsage(await res.json());
  } catch (e) {
    return null; // 오프라인·파싱 오류.
  }
}

// util%에서 100%까지 남은 분 — ratePerMin(분당 증가율)로 외삽. 유한·비음수만, 아니면 null.
// AUTO-010: etaMinutes(2샘플 증가율)·etaFromWindow(단일샘플 평균burn) 공통 외삽 꼬리 단일화.
const minsToFull = (util, ratePerMin) => {
  const mins = (100 - util) / ratePerMin;
  return Number.isFinite(mins) && mins >= 0 ? Math.round(mins) : null;
};

// 예상 소진(분): 두 시점 utilization 변화율로 100% 도달까지 남은 분. 증가 중일 때만, 그 외 null.
// 5분 폴링 사이의 실제 증가 추세를 외삽 — 정체·감소·입력부족이면 예측 안 함(과장 방지).
function etaMinutes(prevUtil, prevMs, curUtil, nowMs) {
  if (![prevUtil, prevMs, curUtil, nowMs].every(Number.isFinite)) return null;
  if (curUtil >= 100) return 0;
  const dt = nowMs - prevMs;
  const du = curUtil - prevUtil;
  if (dt <= 0 || du <= 0) return null; // 증가할 때만 예측
  return minsToFull(curUtil, du / (dt / 60000));
}

// 예상 소진(분) — 단일 샘플판(BL-01 첫 폴링용). 직전 샘플이 없어 증가율을 못 구하는 첫 조회에서,
// 윈도우의 알려진 시작 시각(resetsAt - windowMinutes) 이후 '평균 burn'으로 100% 도달까지 남은 분을 추정.
// 평균이라 5분 증가율판보다 덜 출렁이고(과장 방지) 즉시 값을 준다. 윈도우 미시작·미사용이면 null.
function etaFromWindow(util, resetsAt, windowMinutes, nowMs) {
  if (!Number.isFinite(util) || !Number.isFinite(windowMinutes) || !Number.isFinite(nowMs)) return null;
  if (util >= 100) return 0;
  const resetMs = Date.parse(resetsAt);
  if (!Number.isFinite(resetMs)) return null;
  const elapsedMin = (nowMs - (resetMs - windowMinutes * 60000)) / 60000;
  if (elapsedMin <= 0 || util <= 0) return null; // 시작 전·아직 미사용 → 추세 없음
  return minsToFull(util, util / elapsedMin);
}

// OAuth 자격 상태 분류(BL-03). refresh 토큰 흐름이 없어 만료/없음이면 fetchUsage가 영구 null →
// 게이지 '—'로 멈춤. 'expired'/'missing'을 구분해 렌더러에 재로그인 안내를 띄운다(Claude Code 재로그인 시 갱신).
// expiresAt 미상(0)은 오탐 방지로 ok 취급(fetchUsage의 만료 판정과 동일 규칙).
function authStatus(cred, now) {
  if (!cred || !cred.accessToken) return 'missing';
  if (cred.expiresAt && cred.expiresAt < now) return 'expired';
  return 'ok';
}

module.exports = { readOAuth, parseUsage, fetchUsage, etaMinutes, etaFromWindow, authStatus, credentialsPath, USAGE_URL, UA_VERSION };
