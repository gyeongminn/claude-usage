// 로그인 자동실행(OPS-020, §1/§3). Electron app 객체 주입(api)으로 OS 부작용을 테스트와 분리.
// 시각·시간 무관 — 순수 설정 매핑 + idempotent 적용.

// 자동실행 옵션 객체. 트레이 앱이라 숨겨서 시작(openAsHidden).
// ponytail: openAsHidden은 macOS 전용 — Windows는 창이 떴다 트레이로 숨음(OPS-010 close→hide). 필요해지면 args:['--hidden'].
function loginSettings(enabled) {
  const on = !!enabled;
  return { openAtLogin: on, openAsHidden: on };
}

// 현재 등록 상태와 목표가 다를 때만 적용(idempotent). getLoginItemSettings 없으면 false로 간주.
function setAutoLaunch(api, enabled) {
  const on = !!enabled;
  const cur =
    (api.getLoginItemSettings && api.getLoginItemSettings().openAtLogin) || false;
  if (cur === on) return { changed: false, enabled: on };
  api.setLoginItemSettings(loginSettings(on));
  return { changed: true, enabled: on };
}

module.exports = { loginSettings, setAutoLaunch };
