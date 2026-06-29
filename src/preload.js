const { contextBridge, ipcRenderer } = require('electron');
const { tFor, resolveLocale, LOCALES } = require('./i18n/i18n');

// main이 additionalArguments(--name=value)로 넘긴 인자값(없으면 undefined). AUTO-010: 4중복 find+split 단일 헬퍼로.
const argv = (name) => {
  const a = process.argv.find((x) => x.startsWith('--' + name + '='));
  return a ? a.split('=')[1] : undefined;
};

// UI 로케일은 main이 --ui-locale로 전달(§10). 없으면 en.
const uiLocale = resolveLocale(argv('ui-locale') || 'en');
const t = tFor(uiLocale);

// UI 테마(UI-020): main이 --ui-theme로 전달(설정 영속값). dark만 dark, 그 외 light.
const uiTheme = argv('ui-theme') === 'dark' ? 'dark' : 'light';

// UI 배율(UI-030): main이 --ui-scale로 전달. 숫자 아니면 1(실제 clamp·영속은 main이 검증).
const scaleVal = Number(argv('ui-scale'));
const uiScale = isFinite(scaleVal) ? scaleVal : 1;

// TILE-020 캡처 검증용(UI_MAIN_TILES): main이 --ui-main-tiles로 전달. 비면 null(렌더러는 settings.mainTiles 사용).
const mtVal = argv('ui-main-tiles') || '';
const captureMainTiles = mtVal ? mtVal.split(',').filter(Boolean) : null;

// 메인 → 렌더러 push 구독 한 줄 헬퍼(AUTO-010): 채널만 다르고 (on 등록→2번째 인자를 cb로 포워딩→removeListener 언섭스크라이브)
// 가 동일하던 5중복을 묶음. payload는 항상 두 번째 인자 그대로 전달(거동 불변).
const onIpc = (channel) => (cb) => {
  const handler = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

// 메인 → 렌더러 집계 push + i18n(t/locale) 노출(contextIsolation 유지, nodeIntegration 없음).
// ponytail: t는 함수 프록시로 전달 — 렌더러는 카탈로그/노드 접근 없이 번역만 사용(OPEN[07] 해소).
contextBridge.exposeInMainWorld('usage', {
  onAggregate: onIpc('usage:aggregate'),
  // PERF-010: 활성 블록 burn만 경량 갱신(8s 인터벌). 전체 집계와 별도 채널 — daily/today는 안 건드림.
  onBurn: onIpc('usage:burn'),
  // 실제 사용 한도(5h·주간) push — Claude 설정창과 동일 소스. {fiveHour,sevenDay:{utilization,resetsAt,etaMinutes}}.
  onLimits: onIpc('usage:limits'),
  // 시스템 리소스(§11/SYS-020): 2s push {cpu, mem:{pct,usedBytes,totalBytes}, gpu:%|null}. GPU null=NVIDIA 부재/오류.
  onSysStats: onIpc('sys:stats'),
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
  onUpdateAvailable: onIpc('update:available'),
  openRelease: () => ipcRenderer.send('update:open'),
});
