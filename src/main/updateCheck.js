// 업데이트 알림(FEAT-010, 경량). GitHub Releases와 현재 버전을 비교해 새 버전이 있으면 알림.
// 순수 로직(semver 비교·릴리즈 추출)은 fetch와 분리해 TDD. 자동설치 없음(릴리즈 페이지 안내만).
// ponytail: GitHub Releases API 한 곳. 실패·오프라인은 조용히 null(화면 안 깨짐).

// 'v1.2.3' → [1,2,3]. 자리수 부족은 0 보정. 비정상 → null.
function parseVersion(tag) {
  if (typeof tag !== 'string') return null;
  const parts = tag.trim().replace(/^v/i, '').split('.');
  const nums = parts.slice(0, 3).map((x) => parseInt(x, 10));
  if (nums.length === 0 || nums.some((n) => !Number.isInteger(n))) return null;
  while (nums.length < 3) nums.push(0); // 1.2 → [1,2,0]
  return nums;
}

// 버전 튜플 비교: a>b → 1, a<b → -1, 같음 → 0.
function cmp(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return 0;
}

// latest > current 일 때만 true(잘못된 입력은 false → 알림 안 함).
function isNewerVersion(latest, current) {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  if (!a || !b) return false;
  return cmp(a, b) > 0;
}

// GitHub /releases 배열 → 가장 높은 안정 릴리즈 {version, url} 또는 null(draft·prerelease 제외).
function latestFromReleases(releases) {
  if (!Array.isArray(releases)) return null;
  let best = null;
  for (const r of releases) {
    if (!r || r.draft || r.prerelease) continue;
    const v = parseVersion(r.tag_name);
    if (!v) continue;
    if (!best || cmp(v, best.v) > 0) {
      best = { v, version: String(r.tag_name).replace(/^v/i, ''), url: r.html_url || '' };
    }
  }
  return best ? { version: best.version, url: best.url } : null;
}

// 보안 경계: shell.openExternal에 넘기기 전 URL 검증. https + github.com 호스트만 허용.
// 임의 스킴(javascript:)·타 호스트·호스트 위장(github.com.evil.com)을 막는다.
function isSafeReleaseUrl(url) {
  if (typeof url !== 'string' || !url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'github.com';
  } catch (e) {
    return false; // 파싱 불가 → 거부.
  }
}

// 업데이트 확인: fetch 주입(테스트). 신버전이면 {version,url}, 아니면/실패면 null(오프라인 안전).
async function checkForUpdate(opts) {
  const { currentVersion, repo } = opts;
  const fetchImpl = opts.fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!fetchImpl) return null;
  try {
    const res = await fetchImpl(`https://api.github.com/repos/${repo}/releases`, {
      headers: { 'User-Agent': 'claude-usage', Accept: 'application/vnd.github+json' },
    });
    if (!res || !res.ok) return null;
    const releases = await res.json();
    const latest = latestFromReleases(releases);
    return latest && isNewerVersion(latest.version, currentVersion) ? latest : null;
  } catch (e) {
    return null; // 네트워크 실패·파싱 오류 → 조용히 무시.
  }
}

module.exports = { isNewerVersion, latestFromReleases, checkForUpdate, parseVersion, isSafeReleaseUrl };
