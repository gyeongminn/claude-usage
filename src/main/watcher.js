const path = require('node:path');
const os = require('node:os');
const chokidar = require('chokidar');

// Claude 설정 베이스 디렉토리 — CLAUDE_CONFIG_DIR 존중(§2 크로스 머신), 없으면 ~/.claude.
// AUTO-010: resolveWatchDir·resolveCredentialsFile의 동일 base 산출(§2 규칙) 단일화.
function resolveClaudeBase(env = process.env) {
  return env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

// 감시 루트 — CLAUDE_CONFIG_DIR 존중(§2), 없으면 ~/.claude/projects.
function resolveWatchDir(env = process.env) {
  return path.join(resolveClaudeBase(env), 'projects');
}

// 계정 변경 즉시 반영(BL-04) — 현재 계정 OAuth 자격파일(~/.claude/.credentials.json, CLAUDE_CONFIG_DIR 존중).
function resolveCredentialsFile(env = process.env) {
  return path.join(resolveClaudeBase(env), '.credentials.json');
}

function watchGlob(dir) {
  // chokidar glob은 포워드슬래시만 인식 — Windows 백슬래시는 이스케이프로 오해돼 매칭 실패.
  return dir.replace(/\\/g, '/').replace(/\/$/, '') + '/**/*.jsonl';
}

// 디바운서 — 연속 이벤트를 ms 창으로 묶어 1회 실행. cancel 지원.
function makeDebouncer(fn, ms) {
  let timer = null;
  const debounced = (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return debounced;
}

// 공통 FS 워처(AUTO-010): 디바운스 + add/change/unlink 구독 + error 핸들러 + close(cancel+close).
// startWatcher·startCredentialsWatcher 공용 — 차이는 (감시대상·디바운스ms·오류라벨)뿐이라 단일화.
// error 핸들러 필수(§11 크래시 금지): chokidar는 FS 오류(EACCES·EBUSY·EMFILE 등)를 'error'로 방출,
// 리스너 없으면 EventEmitter가 throw → 트레이 상주 메인 프로세스(§3) 크래시. 로그만 남기고 계속 감시.
// 토큰 갱신은 원자적 rename(unlink+add)일 수 있어 세 이벤트 모두 구독. ignoreInitial로 기동 중복 방지.
// ponytail: chokidar에 감시 위임 — fs.watch 직접 구현 안 함(크로스플랫폼 안정성).
function makeFsWatcher(target, onChange, debounceMs, errorLabel) {
  const debounced = makeDebouncer(onChange, debounceMs);
  const w = chokidar.watch(target, {
    ignoreInitial: true, // 기동 시 기존 파일은 catch-up/pushLimits가 처리, 워처는 이후 변경만.
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });
  w.on('add', debounced).on('change', debounced).on('unlink', debounced)
    .on('error', (e) => console.error(errorLabel, (e && e.message) || e));
  return {
    close: () => {
      debounced.cancel();
      return w.close();
    },
  };
}

// JSONL 변경 감시 → 디바운스된 onChange 호출. close()로 정리(§3, DAT-020).
function startWatcher(onChange, opts = {}) {
  return makeFsWatcher(watchGlob(resolveWatchDir(opts.env)), onChange, opts.debounceMs || 800, '워처 오류:');
}

// 자격파일(.credentials.json) 단일 감시 → 변경 시 onChange(계정 전환/토큰 갱신 즉시 한도 재조회, BL-04).
function startCredentialsWatcher(onChange, opts = {}) {
  return makeFsWatcher(resolveCredentialsFile(opts.env), onChange, opts.debounceMs || 1000, '자격파일 워처 오류:');
}

module.exports = { resolveWatchDir, resolveCredentialsFile, watchGlob, makeDebouncer, startWatcher, startCredentialsWatcher };
