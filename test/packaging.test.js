const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { unpackedPath } = require('../src/main/ccusage');
const pkg = require('../package.json');

// REL-010: asar 패킹 시 spawn 대상은 app.asar 안이 아니라 app.asar.unpacked 여야 함.
test('REL010_unpackedPath_asar→unpacked', () => {
  const sep = path.sep;
  const p = ['C:', 'app', 'resources', 'app.asar', 'node_modules', '.bin', 'ccusage.cmd'].join(sep);
  const out = unpackedPath(p);
  assert.ok(out.includes('app.asar.unpacked'), out);
  assert.ok(!out.includes(`${sep}app.asar${sep}`), '여전히 app.asar 안을 가리킴');
});

test('REL010_unpackedPath_dev경로_불변', () => {
  const p = ['C:', 'proj', 'node_modules', '.bin', 'ccusage.cmd'].join(path.sep);
  assert.equal(unpackedPath(p), p);
});

// REL-010: build 설정 — Win NSIS+portable, mac dmg+zip, ccusage 네이티브 asarUnpack.
test('REL010_build_win타겟_nsis_portable', () => {
  const t = pkg.build.win.target;
  const names = (Array.isArray(t) ? t : [t]).map((x) => (typeof x === 'string' ? x : x.target));
  assert.ok(names.includes('nsis'), 'nsis 누락');
  assert.ok(names.includes('portable'), 'portable 누락');
});

test('REL010_build_mac타겟_dmg_zip', () => {
  const t = pkg.build.mac.target;
  const names = (Array.isArray(t) ? t : [t]).map((x) => (typeof x === 'string' ? x : x.target));
  assert.ok(names.includes('dmg'), 'dmg 누락');
  assert.ok(names.includes('zip'), 'zip 누락');
});

test('REL010_build_asarUnpack_ccusage네이티브포함', () => {
  const u = pkg.build.asarUnpack;
  const arr = Array.isArray(u) ? u : [u];
  // @ccusage(네이티브 바이너리)·ccusage(런처)·.bin 모두 풀어야 spawn 가능.
  assert.ok(arr.some((g) => g.includes('@ccusage')), '@ccusage asarUnpack 누락');
  assert.ok(arr.some((g) => g.includes('node_modules/ccusage') || g.includes('ccusage/**')), 'ccusage 런처 누락');
});

test('REL010_build_mac_category_hardenedRuntime', () => {
  assert.equal(typeof pkg.build.mac.category, 'string');
  assert.equal(pkg.build.mac.hardenedRuntime, true);
});

test('REL020_win_nsis_portable_artifactName_충돌없음', () => {
  // 둘 다 .exe라 전역 artifactName이면 파일명이 같아 덮어씀 → 타깃별로 구분돼야 함.
  const nsis = pkg.build.nsis.artifactName;
  const portable = pkg.build.portable.artifactName;
  assert.ok(nsis && portable, 'nsis/portable artifactName 필요');
  assert.notEqual(nsis, portable, '두 .exe 파일명이 같으면 덮어씀');
});

test('REL040_release_scripts_버저닝흐름', () => {
  // §9.1: npm version <lvl> → git push --follow-tags → Actions 릴리즈.
  for (const lvl of ['patch', 'minor', 'major']) {
    const s = pkg.scripts[`release:${lvl}`];
    assert.ok(s, `누락: release:${lvl}`);
    assert.match(s, new RegExp(`npm version ${lvl}`));
    assert.match(s, /git push --follow-tags/);
  }
});

test('REL040_version_semver_SSOT', () => {
  // 버전 SSOT=package.json version, 태그는 vX.Y.Z와 일치(§9).
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
});

test('REL010_build_기존필드_보존', () => {
  assert.equal(pkg.build.executableName, 'ClaudeUsage');
  assert.equal(pkg.build.artifactName, 'ClaudeUsage-${version}-${os}-${arch}.${ext}');
  assert.equal(pkg.build.publish.provider, 'github');
});
