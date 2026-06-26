const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { runCcusage } = require('./main/ccusage');
const { buildAggregate } = require('./main/aggregate');
const { startWatcher } = require('./main/watcher');
const { fetchKrwPerUsd } = require('./main/fxRate');
const { renderReportToPdf, reportPath } = require('./main/reportPdf');
const { buildReportInput } = require('./main/reportAssembler');
const { buildTrayMenuTemplate, trayIconBitmap } = require('./main/tray');
const { setAutoLaunch } = require('./main/autoLaunch');
const { scheduleMonthly, currentYM } = require('./main/scheduler');
const { missingMonths } = require('./main/catchup');
const { loadSettings, saveSettings, clampScale } = require('./main/settings');
const { tFor, resolveLocale } = require('./i18n/i18n');

// 시스템 타임존(§10/OPEN[05]: UTC 계산 + 시스템 TZ 표시)으로 daily 날짜 그룹화.
const SYSTEM_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

// 앱 아이콘(UX-050): build/icon.png. 패키징 시 build/는 asar에 포함되며 createFromPath가 asar 경로도 읽음.
const ICON_PATH = path.join(__dirname, '..', 'build', 'icon.png');

let tray = null; // GC 방지로 모듈 스코프 보관(§3 상주).
let isQuitting = false; // 트레이 Quit/실종료 시에만 true — 그 전엔 창 닫기=트레이로 숨김.
let schedulerHandle = null; // 월별 스케줄러(OPS-030).
let settings = null; // 영속 설정(OPS-050) — 기동 시 1회 로드.

// 보고서 저장 디렉터리: 설정값 우선, 없으면 앱 데이터 폴더 reports/(§4.2).
function reportsDir() {
  const d = settings && settings.reportsDir;
  return d ? d : path.join(app.getPath('userData'), 'reports');
}

// 월 보고서 생성(INT-010): ccusage 월/일/세션 → 어셈블러 → printToPDF → reports/YYYY-MM.pdf.
// PDF 로케일은 EN/KO만(§10). 실패해도 앱은 유지(에러 로깅).
async function generateMonthlyReport(ym) {
  try {
    const tzArgs = SYSTEM_TZ ? ['--timezone', SYSTEM_TZ] : [];
    const [daily, monthly, session] = await Promise.all([
      runCcusage('daily', tzArgs),
      runCcusage('monthly'),
      runCcusage('session'),
    ]);
    const effLocale = (settings && settings.locale) || app.getLocale();
    const reportLocale = String(effLocale).toLowerCase().startsWith('ko') ? 'ko' : 'en';
    const generated = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
    const data = buildReportInput(
      { daily, monthly, session },
      {
        year: ym.year,
        month: ym.month,
        locale: reportLocale,
        krwPerUsd: krwPerUsd || (settings && settings.krwPerUsd) || 1350,
        generated,
      }
    );
    const out = reportPath(reportsDir(), ym.year, ym.month);
    await renderReportToPdf({
      BrowserWindow,
      htmlPath: path.join(__dirname, 'report', 'report.html'),
      data,
      outPath: out,
    });
    console.log('월 보고서 생성:', out);
  } catch (e) {
    console.error('월 보고서 생성 실패:', e.message);
  }
}

// 기동 시 catch-up(OPS-040): reports에 없는 지난달 보고서를 지금 생성.
function runCatchUp() {
  const dir = reportsDir();
  let existing = [];
  try {
    existing = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  } catch (e) {
    console.error('catch-up 디렉터리 읽기 실패:', e.message);
  }
  const missing = missingMonths(existing, Date.now());
  if (missing.length === 0) {
    console.log('catch-up: 누락 없음');
    return;
  }
  for (const ym of missing) generateMonthlyReport(ym);
}

// KRW 환율 — 기동 시 1회 fetch, 마지막 성공값 보관(§7). 실패해도 폴백.
let krwPerUsd = null;
async function refreshFx() {
  const r = await fetchKrwPerUsd({ lastKnown: krwPerUsd });
  krwPerUsd = r.krwPerUsd;
}

// 실데이터 집계 → 렌더러 push. 실패해도 앱은 유지(빈 화면 방지 위해 에러 무시).
async function pushAggregate(win) {
  try {
    const agg = await buildAggregate(runCcusage, {
      timezone: SYSTEM_TZ,
      planTokenLimit: settings && settings.planTokenLimit, // 플랜 한도 소진율(OPEN[09], 미설정 시 시간 소진율).
    });
    agg.krwPerUsd = krwPerUsd; // 통화 병기용(§5.1).
    if (!win.isDestroyed()) win.webContents.send('usage:aggregate', agg);
  } catch (e) {
    console.error('집계 실패:', e.message);
  }
}

// ponytail: 검증용 스크린샷은 네이티브 capturePage 로 충분 — 외부 도구/의존성 불필요.
// CAPTURE_PATH 가 있으면 렌더 후 그 경로에 PNG 저장하고 종료(검증 루프 전용 모드).
async function captureAndQuit(win, outPath) {
  // 검증 캡처는 전체 대시보드가 한 프레임에 들어오게 창을 키운다(뷰포트 밖 카드까지).
  // CAPTURE_W로 폭 지정 가능(반응형 단일 컬럼 검증용, 기본 1100).
  win.setContentSize(Number(process.env.CAPTURE_W) || 1100, Number(process.env.CAPTURE_H) || 1300);
  // 첫 페인트 + 폰트 + ECharts 애니메이션 안정화 후 캡처(빈/미완성 프레임 방지).
  const delay = Number(process.env.CAPTURE_DELAY) || 1400;
  await new Promise((r) => setTimeout(r, delay));
  // 보고서 로케일 검증: REPORT_LOCALE면 샘플을 해당 로케일로 재렌더(EN/KO §10).
  if (process.env.REPORT_LOCALE) {
    await win.webContents.executeJavaScript(
      `window.renderReport(Object.assign({}, window.__SAMPLE__, { locale: ${JSON.stringify(process.env.REPORT_LOCALE)} })); true;`
    );
    await new Promise((r) => setTimeout(r, 300));
  }
  // 보고서처럼 긴 문서는 CAPTURE_SCROLL(px)로 해당 위치까지 스크롤 후 캡처(페이지별 검증).
  if (process.env.CAPTURE_SCROLL) {
    await win.webContents.executeJavaScript(`window.scrollTo(0, ${Number(process.env.CAPTURE_SCROLL)})`);
    await new Promise((r) => setTimeout(r, 300));
  }
  const img = await win.webContents.capturePage();
  fs.writeFileSync(outPath, img.toPNG());
  app.quit();
}

function createWindow() {
  // UI 로케일(§10): UI_LOCALE env(검증용) > 설정 > 시스템 → resolveLocale(10종, 미지원 en). preload에 전달.
  const uiLocale = resolveLocale(process.env.UI_LOCALE || (settings && settings.locale) || app.getLocale());
  // UI-020 초기 테마: UI_THEME env(검증용) > 설정값. dark만 dark.
  const uiTheme = (process.env.UI_THEME || (settings && settings.theme)) === 'dark' ? 'dark' : 'light';
  // UI-030 초기 배율: UI_SCALE env(검증용) > 설정값. setZoomFactor는 신뢰 경계라 clamp(범위밖/음수 차단).
  const effScale = clampScale(Number(process.env.UI_SCALE) || (settings && settings.uiScale) || 1);
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    // 최소 크기(UX-020): 이 아래로는 단일 컬럼(dashboard.css @760)으로 reflow돼도 카드가 못 눌리게.
    minWidth: 380,
    minHeight: 520,
    icon: ICON_PATH, // UX-050: 작업표시줄/창 아이콘(기본 Electron 아이콘 대체).
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // preload가 i18n 카탈로그(node:fs)를 읽어 t/locale를 노출하려면 sandbox 해제 필요.
      // contextIsolation:true가 핵심 경계는 유지 — 렌더러엔 노출 API만 전달(OPEN[07]).
      sandbox: false,
      additionalArguments: [`--ui-locale=${uiLocale}`, `--ui-theme=${uiTheme}`, `--ui-scale=${effScale}`],
    },
  });
  // REPORT_CAPTURE면 보고서 템플릿 로드(PDF-010 시각 검증용). 평소엔 대시보드.
  const reportMode = !!process.env.REPORT_CAPTURE;
  win.loadFile(
    reportMode
      ? path.join(__dirname, 'report', 'report.html')
      : path.join(__dirname, 'renderer', 'index.html')
  );
  // 트레이 상주(§3): 창 닫기는 종료가 아니라 트레이로 숨김. 실제 종료는 트레이 Quit만.
  win.on('close', (e) => {
    if (tray && !isQuitting) {
      e.preventDefault();
      win.hide();
    }
  });
  win.once('ready-to-show', () => {
    win.show();
    if (reportMode) {
      // 보고서는 집계/워처 불필요 — 캡처만.
      if (process.env.CAPTURE_PATH) captureAndQuit(win, process.env.CAPTURE_PATH);
      return;
    }
    // UI-030: 저장된 UI 배율 적용(차트+글씨 균일 스케일). 0.8~1.5.
    win.webContents.setZoomFactor(effScale);
    // 환율 먼저 fetch 후 집계 push(병기). 환율 실패해도 집계는 진행.
    refreshFx().catch(() => {}).finally(() => pushAggregate(win));
    // 파일 변경 감시(DAT-020) → 변경 시 재집계. 활성 블록 burn 신선도 위해 주기 갱신도 병행(§4.1: 5~10s).
    const watcher = startWatcher(() => pushAggregate(win));
    const timer = setInterval(() => pushAggregate(win), 8000);
    // UI-010: 새로고침(재계산) 버튼 → 즉시 재집계. 결과는 usage:aggregate로 렌더러에 push.
    const onRefresh = () => pushAggregate(win);
    ipcMain.on('usage:refresh', onRefresh);
    // UI-030: 배율 변경 → 검증·영속 후 setZoomFactor(차트+글씨 균일 스케일).
    const onScale = (_e, scale) => {
      settings = saveSettings(app.getPath('userData'), { ...settings, uiScale: scale });
      if (!win.isDestroyed()) win.webContents.setZoomFactor(settings.uiScale);
    };
    ipcMain.on('scale:set', onScale);
    win.on('closed', () => {
      clearInterval(timer);
      watcher.close();
      ipcMain.removeListener('usage:refresh', onRefresh);
      ipcMain.removeListener('scale:set', onScale);
    });
    if (process.env.CAPTURE_PATH) captureAndQuit(win, process.env.CAPTURE_PATH);
  });
  return win;
}

// PDF 렌더 검증 게이트(PDF-050): REPORT_PDF=<out.pdf>면 주입 데이터로 보고서 PDF 1장 생성 후 종료.
// ponytail: 실 스케줄러(OPS-030)·catch-up은 Phase 6, 여기선 렌더 경로 자체만 검증한다.
async function generatePdfAndQuit(outPath) {
  // 주입이 실제로 먹는지 확인용 식별 가능한 데이터(샘플과 제목/기간 다르게).
  const daily = Array.from({ length: 30 }, (_, i) => ({
    period: '2026-04-' + String(i + 1).padStart(2, '0'),
    totalCost: 20 + i,
    totalTokens: 30000 + i * 800,
    inputTokens: 3000 + i * 90,
    outputTokens: 800 + i * 40,
    cacheCreationTokens: 5000 + i * 120,
    cacheReadTokens: 22000 + i * 600,
  }));
  const data = {
    title: 'Claude Usage Report',
    period: 'April 2026 (2026-04-01 ~ 2026-04-30)',
    generated: '2026-05-01 09:00 (KST)',
    locale: 'en',
    krwPerUsd: 1380,
    daily,
    prevMonthCost: 900,
    models: [
      { modelName: 'claude-opus-4-8', cost: 700 },
      { modelName: 'claude-sonnet-4-6', cost: 210 },
    ],
    projects: [
      { project: 'claude-usage', totalCost: 400 },
      { project: 'pantology', totalCost: 250 },
    ],
    sessions: [
      { project: 'claude-usage', totalCost: 72, totalTokens: 980000 },
      { project: 'pantology', totalCost: 55, totalTokens: 700000 },
    ],
  };
  try {
    await renderReportToPdf({
      BrowserWindow,
      htmlPath: path.join(__dirname, 'report', 'report.html'),
      data,
      outPath,
    });
  } catch (e) {
    console.error('PDF 렌더 실패:', e.message);
    process.exitCode = 1;
  }
  app.quit();
}

// 트레이 아이콘(UX-050): 실제 icon.png 우선, 못 읽으면(빈 이미지) 단색 비트맵 폴백.
function trayImage() {
  const img = nativeImage.createFromPath(ICON_PATH);
  if (!img.isEmpty()) {
    console.log('트레이 아이콘: icon.png');
    return img.resize({ width: 16, height: 16 });
  }
  console.log('트레이 아이콘: fallback bitmap');
  const ico = trayIconBitmap(16);
  return nativeImage.createFromBitmap(ico.buffer, { width: ico.width, height: ico.height });
}

// 트레이 상주(OPS-010): 아이콘 + 메뉴(대시보드 열기·이번 달 미리 뽑기·종료). UI 로케일로 라벨.
function setupTray(getWin) {
  // 설정 locale 우선(§10), null이면 시스템 언어 자동.
  const t = tFor((settings && settings.locale) || app.getLocale());
  tray = new Tray(trayImage());
  tray.setToolTip(t('app_title'));
  const showWin = () => {
    const w = getWin();
    if (w && !w.isDestroyed()) {
      w.show();
      w.focus();
    }
  };
  const template = buildTrayMenuTemplate(
    {
      onOpen: showWin,
      // UX-060: "이번 달 미리 뽑기" — 이번 달(UTC YM) 보고서를 지금 생성(reports/YYYY-MM.pdf).
      onReport: () => generateMonthlyReport(currentYM(Date.now())),
      onQuit: () => {
        isQuitting = true;
        if (schedulerHandle) schedulerHandle.cancel();
        app.quit();
      },
    },
    t
  );
  tray.setContextMenu(Menu.buildFromTemplate(template));
  tray.on('click', showWin); // 아이콘 클릭=대시보드 열기(Windows 관례).
}

app.whenReady().then(() => {
  // UX-040: 네이티브 앱 메뉴(Edit/View/Help) 제거 — 모든 동작은 UI에서 처리(사용자 지시).
  // 트레이 컨텍스트 메뉴(setupTray)는 별개라 영향 없음. UX-010 리사이즈 수정으로 Reload View 우회 불필요.
  Menu.setApplicationMenu(null);
  if (process.env.REPORT_PDF) {
    generatePdfAndQuit(process.env.REPORT_PDF);
    return;
  }
  settings = loadSettings(app.getPath('userData')); // 영속 설정 로드(OPS-050).
  // UI-020: 테마 토글 영속 — 렌더러가 setTheme 하면 settings.json에 저장(다음 기동에도 유지).
  ipcMain.on('theme:set', (_e, theme) => {
    settings = saveSettings(app.getPath('userData'), { ...settings, theme });
  });
  const win = createWindow();
  // 캡처/검증 모드가 아니면 트레이 상주 + 로그인 자동실행 등록.
  if (!process.env.CAPTURE_PATH) {
    setupTray(() => win);
    // 자동실행(OPS-020/050): 설정값 우선, AUTO_LAUNCH=0 env면 강제 해제(검증용).
    // ponytail: getLoginItemSettings 비교로 idempotent — 매 기동 레지스트리 재기록 안 함.
    const want = process.env.AUTO_LAUNCH === '0' ? false : settings.autoLaunch;
    const r = setAutoLaunch(app, want);
    console.log(`자동실행: enabled=${r.enabled} changed=${r.changed}`);
    // 기동 시 catch-up(OPS-040): 1일에 PC가 꺼져 스케줄러가 못 돈 경우 누락분을 지금 채움.
    runCatchUp();
    // 월별 스케줄러(OPS-030): 매월 1일 00:00(시스템 TZ는 표시용, 계산은 UTC) 지난달 보고서 생성.
    schedulerHandle = scheduleMonthly({ onFire: generateMonthlyReport, now: () => Date.now() });
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 트레이 상주 시엔 창이 다 닫혀도 종료하지 않음(트레이로 유지). 트레이 없으면(캡처 모드) 종료.
app.on('window-all-closed', () => {
  if (!tray) app.quit();
});
