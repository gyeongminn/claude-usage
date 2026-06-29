const { contextBridge, ipcRenderer } = require('electron');
const { tFor, resolveLocale, LOCALES } = require('./i18n/i18n');

// UI 로케일은 main이 additionalArguments(--ui-locale=xx)로 전달(§10). 없으면 en.
const arg = process.argv.find((a) => a.startsWith('--ui-locale='));
const uiLocale = resolveLocale(arg ? arg.split('=')[1] : 'en');
const t = tFor(uiLocale);

// UI 테마(UI-020): main이 --ui-theme로 전달(설정 영속값). dark만 dark, 그 외 light.
const themeArg = process.argv.find((a) => a.startsWith('--ui-theme='));
const uiTheme = themeArg && themeArg.split('=')[1] === 'dark' ? 'dark' : 'light';

// UI 배율(UI-030): main이 --ui-scale로 전달. 숫자 아니면 1(실제 clamp·영속은 main이 검증).
const scaleArg = process.argv.find((a) => a.startsWith('--ui-scale='));
const uiScale = scaleArg && isFinite(Number(scaleArg.split('=')[1])) ? Number(scaleArg.split('=')[1]) : 1;

// TILE-020 캡처 검증용(UI_MAIN_TILES): main이 --ui-main-tiles로 전달. 비면 null(렌더러는 settings.mainTiles 사용).
const mtArg = process.argv.find((a) => a.startsWith('--ui-main-tiles='));
const mtVal = mtArg ? mtArg.split('=')[1] : '';
const captureMainTiles = mtVal ? mtVal.split(',').filter(Boolean) : null;

// 메인 → 렌더러 집계 push + i18n(t/locale) 노출(contextIsolation 유지, nodeIntegration 없음).
// ponytail: t는 함수 프록시로 전달 — 렌더러는 카탈로그/노드 접근 없이 번역만 사용(OPEN[07] 해소).
contextBridge.exposeInMainWorld('usage', {
  onAggregate: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on('usage:aggregate', handler);
    return () => ipcRenderer.removeListener('usage:aggregate', handler);
  },
  // PERF-010: 활성 블록 burn만 경량 갱신(8s 인터벌). 전체 집계와 별도 채널 — daily/today는 안 건드림.
  onBurn: (cb) => {
    const handler = (_e, burn) => cb(burn);
    ipcRenderer.on('usage:burn', handler);
    return () => ipcRenderer.removeListener('usage:burn', handler);
  },
  // 실제 사용 한도(5h·주간) push — Claude 설정창과 동일 소스. {fiveHour,sevenDay:{utilization,resetsAt,etaMinutes}}.
  onLimits: (cb) => {
    const handler = (_e, limits) => cb(limits);
    ipcRenderer.on('usage:limits', handler);
    return () => ipcRenderer.removeListener('usage:limits', handler);
  },
  // 시스템 리소스(§11/SYS-020): 2s push {cpu, mem:{pct,usedBytes,totalBytes}, gpu:%|null}. GPU null=NVIDIA 부재/오류.
  onSysStats: (cb) => {
    const handler = (_e, stats) => cb(stats);
    ipcRenderer.on('sys:stats', handler);
    return () => ipcRenderer.removeListener('sys:stats', handler);
  },
  locale: uiLocale,
  t: (key, vars) => t(key, vars),
  // UI-010: 새로고침(재계산) — 메인에 즉시 재집계 요청(결과는 onAggregate로 되돌아옴).
  refresh: () => ipcRenderer.send('usage:refresh'),
  // UI-020: 테마 — 초기값 노출 + 변경 영속(main이 settings.json에 저장).
  theme: uiTheme,
  setTheme: (theme) => ipcRenderer.send('theme:set', theme),
  // UI-030: UI 배율 — 초기값 + 변경(main이 clamp·영속·setZoomFactor).
  uiScale: uiScale,
  setScale: (scale) => ipcRenderer.send('scale:set', scale),
  // TILE-020: 캡처 검증용 메인 타일 오버라이드(평소 null → renderMain이 settings.mainTiles 사용).
  captureMainTiles: captureMainTiles,
  // UI-040: 설정 화면 — 전체 설정 load/save(즉시 반영). main이 검증·영속·라이브 적용 후 결과 반환.
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (partial) => ipcRenderer.invoke('settings:save', partial),
  // 설정 모달 옵션: 지원 로케일 목록 + 시스템 타임존(빈 값=시스템 기본 표시용).
  locales: LOCALES,
  systemTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  // 로케일 즉시 전환용 번역기 빌더(렌더러가 새 로케일로 재번역). i18n 카탈로그는 preload(node)가 읽음.
  makeT: (loc) => {
    const tt = tFor(resolveLocale(loc));
    return (key, vars) => tt(key, vars);
  },
  // FEAT-010: 업데이트 알림 — main이 새 버전 push(version만), "받기"는 main 보관 URL을 openExternal.
  // ponytail: 렌더러는 URL을 넘기지 않는다 — openExternal sink에 임의 URL 주입 불가(보안 경계는 main).
  onUpdateAvailable: (cb) => {
    const handler = (_e, info) => cb(info);
    ipcRenderer.on('update:available', handler);
    return () => ipcRenderer.removeListener('update:available', handler);
  },
  openRelease: () => ipcRenderer.send('update:open'),
});
