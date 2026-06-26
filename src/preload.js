const { contextBridge, ipcRenderer } = require('electron');
const { tFor, resolveLocale } = require('./i18n/i18n');

// UI 로케일은 main이 additionalArguments(--ui-locale=xx)로 전달(§10). 없으면 en.
const arg = process.argv.find((a) => a.startsWith('--ui-locale='));
const uiLocale = resolveLocale(arg ? arg.split('=')[1] : 'en');
const t = tFor(uiLocale);

// 메인 → 렌더러 집계 push + i18n(t/locale) 노출(contextIsolation 유지, nodeIntegration 없음).
// ponytail: t는 함수 프록시로 전달 — 렌더러는 카탈로그/노드 접근 없이 번역만 사용(OPEN[07] 해소).
contextBridge.exposeInMainWorld('usage', {
  onAggregate: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on('usage:aggregate', handler);
    return () => ipcRenderer.removeListener('usage:aggregate', handler);
  },
  locale: uiLocale,
  t: (key, vars) => t(key, vars),
});
