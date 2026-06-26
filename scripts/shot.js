// UI 검증 스크린샷 루프: `node scripts/shot.js [out.png]`
// 앱을 캡처 모드(CAPTURE_PATH)로 띄워 렌더된 창을 PNG로 저장하고 종료한다.
// 산출 PNG 를 사람/에이전트가 Read 로 눈 검증. 외부 스크린샷 도구·의존성 없음.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const out = path.resolve(process.argv[2] || path.join(__dirname, '..', 'reports', 'shot.png'));
fs.mkdirSync(path.dirname(out), { recursive: true });

// node 컨텍스트에서 require('electron')는 electron 바이너리 경로 문자열을 반환.
const electron = require('electron');
const r = spawnSync(electron, ['.'], {
  stdio: 'inherit',
  env: { ...process.env, CAPTURE_PATH: out },
});

if (r.status !== 0 || !fs.existsSync(out)) {
  console.error(`shot 실패: exit=${r.status}, PNG 존재=${fs.existsSync(out)}`);
  process.exit(1);
}
console.log(`saved ${out} (${fs.statSync(out).size} bytes)`);
