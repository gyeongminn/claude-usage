const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loginSettings, setAutoLaunch } = require('../src/main/autoLaunch');

test('OPS020_loginSettings_불린매핑', () => {
  assert.deepEqual(loginSettings(true), { openAtLogin: true, openAsHidden: true });
  assert.deepEqual(loginSettings(false), { openAtLogin: false, openAsHidden: false });
  assert.deepEqual(loginSettings(undefined), { openAtLogin: false, openAsHidden: false });
});

// 가짜 electron app api(상태 보유)
function fakeApi(initial) {
  let state = { openAtLogin: initial };
  return {
    calls: [],
    getLoginItemSettings() {
      return state;
    },
    setLoginItemSettings(opts) {
      this.calls.push(opts);
      state = { openAtLogin: opts.openAtLogin };
    },
  };
}

test('OPS020_setAutoLaunch_등록', () => {
  const api = fakeApi(false);
  const r = setAutoLaunch(api, true);
  assert.deepEqual(r, { changed: true, enabled: true });
  assert.equal(api.calls.length, 1);
  assert.equal(api.calls[0].openAtLogin, true);
});

test('OPS020_setAutoLaunch_해제', () => {
  const api = fakeApi(true);
  const r = setAutoLaunch(api, false);
  assert.deepEqual(r, { changed: true, enabled: false });
  assert.equal(api.calls[0].openAtLogin, false);
});

test('OPS020_setAutoLaunch_idempotent_이미같으면_무변경', () => {
  const api = fakeApi(true);
  const r = setAutoLaunch(api, true);
  assert.deepEqual(r, { changed: false, enabled: true });
  assert.equal(api.calls.length, 0); // setLoginItemSettings 호출 안 함
});

test('OPS020_setAutoLaunch_getLoginItemSettings_없어도_안전', () => {
  const api = { calls: [], setLoginItemSettings(o) { this.calls.push(o); } };
  const r = setAutoLaunch(api, true);
  assert.equal(r.changed, true); // 현재상태 false로 간주 → 등록
  assert.equal(api.calls.length, 1);
});
