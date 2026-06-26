// 트레이 메뉴(상주, §3/§4.2). 메뉴 '템플릿'은 Electron 비의존 순수 배열 → 테스트 가능.
// 라벨은 UI 로케일 t() 경유(없으면 영어 폴백). 실제 Tray/Menu 생성은 main.js가 이 템플릿으로 수행.
const FALLBACK = { tray_open: 'Open dashboard', tray_report: 'Generate this month', tray_quit: 'Quit' };

function buildTrayMenuTemplate(handlers, t) {
  const label = (k) => {
    const v = t ? t(k) : undefined;
    // t가 키를 그대로 돌려주거나(미등록) 없으면 영어 폴백.
    return v && v !== k ? v : FALLBACK[k];
  };
  return [
    { id: 'open', label: label('tray_open'), click: handlers.onOpen },
    { id: 'report', label: label('tray_report'), click: handlers.onReport },
    { type: 'separator' },
    { id: 'quit', label: label('tray_quit'), click: handlers.onQuit },
  ];
}

// 에셋 파일 없이 단색 트레이 아이콘 비트맵(BGRA, Windows). accent(#3182F6).
// ponytail: 디자인 아이콘은 추후 .ico/.png 에셋으로 교체 — 지금은 가시성만 충족.
function trayIconBitmap(size = 16) {
  const buf = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const o = i * 4;
    buf[o] = 0xf6; // B
    buf[o + 1] = 0x82; // G
    buf[o + 2] = 0x31; // R
    buf[o + 3] = 0xff; // A
  }
  return { buffer: buf, width: size, height: size };
}

module.exports = { buildTrayMenuTemplate, trayIconBitmap, FALLBACK };
