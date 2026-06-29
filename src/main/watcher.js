const path = require('node:path');
const os = require('node:os');
const chokidar = require('chokidar');

// 감시 루트 — CLAUDE_CONFIG_DIR 존중(§2), 없으면 ~/.claude/projects.
function resolveWatchDir(env = process.env) {
  const base = env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  return path.join(base, 'projects');
}

// 계정 변경 즉시 반영(BL-04) — 현재 계정 OAuth 자격파일(~/.claude/.credentials.json, CLAUDE_CONFIG_DIR 존중).
function resolveCredentialsFile(env = process.env) {
  const base = env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  return path.join(base, '.credentials.json');
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

// JSONL 변경 감시 → 디바운스된 onChange 호출. close()로 정리.
// ponytail: chokidar에 감시 위임 — fs.watch 직접 구현 안 함(크로스플랫폼 안정성).
function startWatcher(onChange, opts = {}) {
  const dir = resolveWatchDir(opts.env);
  const debounced = makeDebouncer(onChange, opts.debounceMs || 800);
  const w = chokidar.watch(watchGlob(dir), {
    ignoreInitial: true, // 기동 시 기존 파일은 catch-up이 처리, 워처는 변경만.
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });
  w.on('add', debounced).on('change', debounced).on('unlink', debounced);
  return {
    close: () => {
      debounced.cancel();
      return w.close();
    },
  };
}

// 자격파일(.credentials.json) 단일 감시 → 변경 시 디바운스된 onChange(계정 전환/토큰 갱신 즉시 한도 재조회, BL-04).
// 토큰 갱신은 원자적 rename(unlink+add)일 수 있어 세 이벤트 모두 구독. ignoreInitial로 기동 중복 방지.
function startCredentialsWatcher(onChange, opts = {}) {
  const file = resolveCredentialsFile(opts.env);
  const debounced = makeDebouncer(onChange, opts.debounceMs || 1000);
  const w = chokidar.watch(file, {
    ignoreInitial: true, // 기동 시 pushLimits가 이미 1회 조회 — 워처는 이후 변경만.
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });
  w.on('add', debounced).on('change', debounced).on('unlink', debounced);
  return {
    close: () => {
      debounced.cancel();
      return w.close();
    },
  };
}

module.exports = { resolveWatchDir, resolveCredentialsFile, watchGlob, makeDebouncer, startWatcher, startCredentialsWatcher };
