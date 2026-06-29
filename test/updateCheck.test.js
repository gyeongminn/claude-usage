const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isNewerVersion, latestFromReleases, checkForUpdate, isSafeReleaseUrl } = require('../src/main/updateCheck');

// FEAT-010: semver 비교 — latest > current 일 때만 true.
test('FEAT010_isNewerVersion_상위버전_true', () => {
  assert.equal(isNewerVersion('0.2.0', '0.1.0'), true);
  assert.equal(isNewerVersion('1.0.0', '0.9.9'), true);
  assert.equal(isNewerVersion('0.1.1', '0.1.0'), true);
  assert.equal(isNewerVersion('v0.2.0', '0.1.0'), true); // 'v' 접두 허용
});

test('FEAT010_isNewerVersion_동일_하위_false', () => {
  assert.equal(isNewerVersion('0.1.0', '0.1.0'), false);
  assert.equal(isNewerVersion('0.1.0', '0.2.0'), false);
  assert.equal(isNewerVersion('0.9.9', '1.0.0'), false);
});

test('FEAT010_isNewerVersion_잘못된입력_false', () => {
  assert.equal(isNewerVersion('abc', '0.1.0'), false);
  assert.equal(isNewerVersion(null, '0.1.0'), false);
  assert.equal(isNewerVersion('0.1.0', undefined), false);
});

// 자리수 부족 보정(1.2 → 1.2.0)
test('FEAT010_isNewerVersion_자리수보정', () => {
  assert.equal(isNewerVersion('1.2', '1.1.9'), true);
  assert.equal(isNewerVersion('1', '0.9.9'), true);
  assert.equal(isNewerVersion('1.0', '1.0.0'), false);
});

// GitHub /releases 배열 → 최고 안정 릴리즈 추출(draft·prerelease 제외).
test('FEAT010_latestFromReleases_최고안정_추출', () => {
  const r = latestFromReleases([
    { tag_name: 'v0.1.0', draft: false, prerelease: false, html_url: 'https://github.com/o/r/releases/tag/v0.1.0' },
    { tag_name: 'v0.3.0', draft: false, prerelease: false, html_url: 'https://github.com/o/r/releases/tag/v0.3.0' },
    { tag_name: 'v0.2.0', draft: false, prerelease: false, html_url: 'https://github.com/o/r/releases/tag/v0.2.0' },
  ]);
  assert.equal(r.version, '0.3.0');
  assert.equal(r.url, 'https://github.com/o/r/releases/tag/v0.3.0');
});

test('FEAT010_latestFromReleases_draft_prerelease_제외', () => {
  const r = latestFromReleases([
    { tag_name: 'v0.1.0', draft: false, prerelease: false, html_url: 'u1' },
    { tag_name: 'v0.9.0', draft: true, prerelease: false, html_url: 'u2' }, // draft 제외
    { tag_name: 'v0.8.0', draft: false, prerelease: true, html_url: 'u3' }, // prerelease 제외
  ]);
  assert.equal(r.version, '0.1.0');
});

test('FEAT010_latestFromReleases_빈_비배열_안정없음_null', () => {
  assert.equal(latestFromReleases([]), null);
  assert.equal(latestFromReleases(null), null);
  assert.equal(latestFromReleases([{ tag_name: 'v1.0.0', draft: true }]), null); // 안정 0개
});

// checkForUpdate — fetch 주입. 신버전이면 {version,url}, 아니면 null. 실패도 null(오프라인 안전).
test('FEAT010_checkForUpdate_신버전_반환', async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => [{ tag_name: 'v0.2.0', draft: false, prerelease: false, html_url: 'https://github.com/o/r/releases/tag/v0.2.0' }],
  });
  const r = await checkForUpdate({ currentVersion: '0.1.0', fetchImpl, repo: 'o/r' });
  assert.equal(r.version, '0.2.0');
  assert.equal(r.url, 'https://github.com/o/r/releases/tag/v0.2.0');
});

test('FEAT010_checkForUpdate_최신이면_null', async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => [{ tag_name: 'v0.1.0', draft: false, prerelease: false, html_url: 'u' }],
  });
  assert.equal(await checkForUpdate({ currentVersion: '0.1.0', fetchImpl, repo: 'o/r' }), null);
});

test('FEAT010_checkForUpdate_실패_null', async () => {
  const boom = async () => { throw new Error('offline'); };
  assert.equal(await checkForUpdate({ currentVersion: '0.1.0', fetchImpl: boom, repo: 'o/r' }), null);
  const notOk = async () => ({ ok: false });
  assert.equal(await checkForUpdate({ currentVersion: '0.1.0', fetchImpl: notOk, repo: 'o/r' }), null);
});

// 보안 경계: openExternal에 넘기기 전 https://github.com/ 릴리즈 URL만 허용(임의 sink 차단).
test('FEAT010_isSafeReleaseUrl_github_https만_허용', () => {
  assert.equal(isSafeReleaseUrl('https://github.com/o/r/releases/tag/v0.2.0'), true);
  assert.equal(isSafeReleaseUrl('http://github.com/o/r'), false); // http 거부
  assert.equal(isSafeReleaseUrl('https://evil.com/x'), false); // 타 호스트 거부
  assert.equal(isSafeReleaseUrl('https://github.com.evil.com/x'), false); // 호스트 위장 거부
  assert.equal(isSafeReleaseUrl('javascript:alert(1)'), false); // 비-http 스킴 거부
  assert.equal(isSafeReleaseUrl(''), false);
  assert.equal(isSafeReleaseUrl(null), false);
});
