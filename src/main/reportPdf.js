// 월별 PDF 보고서 렌더(§4.2, PDF-050). 숨은 BrowserWindow에 report.html 로드 →
// 실데이터 주입(window.renderReport) → webContents.printToPDF(printBackground) → reports/YYYY-MM.pdf.
const fs = require('node:fs');
const path = require('node:path');

// 저장 파일명/경로 — reports/YYYY-MM.pdf (월 2자리 0패딩).
function reportFileName(year, month) {
  const m = String(month).padStart(2, '0');
  return `${year}-${m}.pdf`;
}
function reportPath(dir, year, month) {
  return path.join(dir, reportFileName(year, month));
}

// 숨은 창에 보고서를 렌더하고 PDF로 저장. BrowserWindow 주입(테스트/호출부 결정).
// data: report.html이 기대하는 객체(daily·models·projects·sessions·locale·krwPerUsd·title·period·generated).
async function renderReportToPdf({ BrowserWindow, htmlPath, data, outPath, settleMs = 500 }) {
  const win = new BrowserWindow({
    show: false,
    width: 900,
    height: 1300,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  try {
    await win.loadFile(htmlPath);
    // 실데이터 주입 후 재렌더(차트 재초기화 안전 — chartOf). true 반환으로 직렬화 이슈 회피.
    await win.webContents.executeJavaScript(`window.renderReport(${JSON.stringify(data)}); true;`);
    // 폰트·ECharts 페인트 안정화 대기(빈 차트 방지).
    await new Promise((r) => setTimeout(r, settleMs));
    const pdf = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { marginType: 'none' },
    });
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, pdf);
    return outPath;
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

module.exports = { reportFileName, reportPath, renderReportToPdf };
