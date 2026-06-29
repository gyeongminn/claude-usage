const { execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// ccusage 가 집계해주는 4개 축(§2). 그 외 명령은 거부.
const COMMANDS = new Set(['daily', 'monthly', 'session', 'blocks']);

// asar 패킹 시 spawn 대상은 app.asar 안이 아니라 app.asar.unpacked(REL-010 asarUnpack)에 있다.
// dev 경로엔 app.asar 세그먼트가 없어 no-op — 안전.
function unpackedPath(p) {
  const seg = `${path.sep}app.asar${path.sep}`;
  return p.split(seg).join(`${path.sep}app.asar.unpacked${path.sep}`);
}

// ccusage 엔진은 플랫폼별 네이티브 바이너리(@ccusage/ccusage-<platform>-<arch>, §2)다. ccusage의 cli.js 런처는
// 이 바이너리를 windowsHide 없이 `stdio:'inherit'`로 spawn해 Windows에서 콘솔 창이 깜빡인다(8초마다 spawn).
// → 런처(cli.js·electron-as-node)를 건너뛰고 네이티브 바이너리를 우리가 직접 windowsHide:true로 띄운다.
// ponytail: 플랫폼 매핑은 ccusage cli.js의 getNativePackageName 미러(소수 고정값). 신규 타깃 추가 시 여기에 한 줄.
const NATIVE_PKG = {
  'win32-x64': '@ccusage/ccusage-win32-x64',
  'win32-arm64': '@ccusage/ccusage-win32-arm64',
  'darwin-arm64': '@ccusage/ccusage-darwin-arm64',
  'darwin-x64': '@ccusage/ccusage-darwin-x64',
  'linux-x64': '@ccusage/ccusage-linux-x64',
  'linux-arm64': '@ccusage/ccusage-linux-arm64',
};

function nativeBinaryPath() {
  const pkg = NATIVE_PKG[`${process.platform}-${process.arch}`];
  if (!pkg) throw new Error(`ccusage 네이티브 바이너리 미지원 플랫폼: ${process.platform}-${process.arch}`);
  const sub = process.platform === 'win32' ? 'bin/ccusage.exe' : 'bin/ccusage';
  // require.resolve로 optionalDependencies 설치 위치를 찾고, asar면 unpacked로 리다이렉트.
  const bin = unpackedPath(require.resolve(`${pkg}/${sub}`));
  // macOS/Linux: cli.js를 우회하므로 실행권한을 직접 보장(ccusage ensureNativeBinaryExecutable 미러). win32는 무의미.
  if (process.platform !== 'win32') {
    try {
      if ((fs.statSync(bin).mode & 0o111) === 0) fs.chmodSync(bin, 0o755);
    } catch (e) {
      // 권한 확인/설정 실패는 무시 — 실제 문제면 execFile EACCES로 드러나 caller가 처리.
    }
  }
  return bin;
}

function defaultRunner(args) {
  return new Promise((resolve, reject) => {
    // 네이티브 바이너리를 직접 실행(env 미지정 → process.env 상속, CLAUDE_CONFIG_DIR 등 존중).
    // windowsHide:true가 이제 실제 콘솔 앱(ccusage.exe)에 적용돼 창 깜빡임 제거. maxBuffer는 100억+ 토큰 stdout 대비 넉넉히.
    execFile(
      nativeBinaryPath(),
      args,
      { maxBuffer: 256 * 1024 * 1024, windowsHide: true },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(`ccusage 실행 실패: ${stderr || err.message}`));
        resolve(stdout);
      }
    );
  });
}

// command: daily|monthly|session|blocks, extraArgs: 추가 플래그(예: --active), runner 주입 가능(테스트용).
async function runCcusage(command, extraArgs = [], runner = defaultRunner) {
  if (!COMMANDS.has(command)) {
    throw new Error(`지원하지 않는 ccusage 명령: ${command}`);
  }
  const args = [command, '--json', ...extraArgs];
  const stdout = await runner(args);
  try {
    return JSON.parse(stdout);
  } catch (e) {
    throw new Error(`ccusage JSON 파싱 실패: ${e.message}`);
  }
}

module.exports = { runCcusage, COMMANDS, unpackedPath };
