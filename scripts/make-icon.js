// 앱 아이콘 생성기(1회용). 토스풍 블루 라운드 사각 + 흰색 상승 막대(사용량) 글리프 SVG를
// 투명 배경 BrowserWindow에 그려 capturePage로 1024 PNG를 뽑는다. electron-builder가
// build/icon.png에서 Win .ico / mac .icns를 자동 생성한다(buildResources 기본 경로).
// 실행: node_modules/.bin/electron scripts/make-icon.js  → 산출물 build/icon.png 커밋.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const ACCENT = '#3182F6'; // §5.2 Toss Blue
// 4개 상승 막대(좌소→우대 = 사용량 증가), 흰색, 둥근 모서리.
const bars = [
  { x: 232, h: 180 },
  { x: 382, h: 280 },
  { x: 532, h: 380 },
  { x: 682, h: 480 },
].map((b) => `<rect x="${b.x}" y="${720 - b.h}" width="110" height="${b.h}" rx="26" fill="#fff"/>`).join('');

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect x="0" y="0" width="1024" height="1024" rx="224" fill="${ACCENT}"/>
  ${bars}
</svg>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body>${SVG}</body></html>`;

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    transparent: true,
    frame: false,
    webPreferences: { offscreen: true },
  });
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  await new Promise((r) => setTimeout(r, 400));
  const img = await win.webContents.capturePage();
  const out = path.join(__dirname, '..', 'build', 'icon.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, img.toPNG());
  // self-check: PNG 시그니처 + 비자명 크기
  const buf = fs.readFileSync(out);
  const ok = buf.length > 2000 && buf[0] === 0x89 && buf[1] === 0x50;
  console.log(`icon written: ${out} (${buf.length} bytes) ${ok ? 'OK' : 'SUSPECT'}`);
  win.destroy();
  app.quit();
  if (!ok) process.exitCode = 1;
});
