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

module.exports = { readOAuth, parseUsage, fetchUsage, credentialsPath, USAGE_URL, UA_VERSION };
