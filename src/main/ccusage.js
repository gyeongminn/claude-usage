const { execFile } = require('node:child_process');
const path = require('node:path');

// ccusage 가 집계해주는 4개 축(§2). 그 외 명령은 거부.
const COMMANDS = new Set(['daily', 'monthly', 'session', 'blocks']);

// asar 패킹 시 spawn 대상은 app.asar 안이 아니라 app.asar.unpacked(REL-010 asarUnpack)에 있다.
// dev 경로엔 app.asar 세그먼트가 없어 no-op — 안전.
function unpackedPath(p) {
  const seg = `${path.sep}app.asar${path.sep}`;
  return p.split(seg).join(`${path.sep}app.asar.unpacked${path.sep}`);
}

// ccusage 진입점은 ESM CLI(node_modules/ccusage/src/cli.js). electron-builder는 node_modules/.bin 셰임을
// 패킹에서 제거하므로 .bin에 의존하지 않는다. 패키지 앱엔 별도 node도 없어 Electron 바이너리를
// node 모드(ELECTRON_RUN_AS_NODE=1)로 띄워 CLI를 직접 실행한다(dev/패키징 공통).
const CLI = unpackedPath(path.join(__dirname, '..', '..', 'node_modules', 'ccusage', 'src', 'cli.js'));

function defaultRunner(args) {
  return new Promise((resolve, reject) => {
    // 100억+ 토큰 규모 → stdout 큼. maxBuffer 넉넉히.
    execFile(
      process.execPath,
      [CLI, ...args],
      // windowsHide: ELECTRON_RUN_AS_NODE로 electron.exe를 띄우면 Windows에서 콘솔 창이 깜빡인다.
      // 라이브 집계가 8초마다 spawn하므로 필수.
      { maxBuffer: 256 * 1024 * 1024, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, windowsHide: true },
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
