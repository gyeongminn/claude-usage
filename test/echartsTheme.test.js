const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeEchartsTheme, TOKENS } = require('../src/renderer/echartsTheme');

test('DSN030_테마_토큰색사용_기본팔레트금지', () => {
  const theme = makeEchartsTheme(TOKENS);
  // accent 가 팔레트 1번이어야(기본 ECharts 팔레트 #5470c6 금지).
  assert.equal(theme.color[0], TOKENS.accent);
  assert.ok(!theme.color.includes('#5470c6'));
});

test('DSN030_축·텍스트_토큰색', () => {
  const theme = makeEchartsTheme(TOKENS);
  assert.equal(theme.textStyle.color, TOKENS['text-1']);
  assert.equal(theme.textStyle.fontFamily, 'Pretendard');
});

test('DSN030_라인_accent_영역_저알파', () => {
  const theme = makeEchartsTheme(TOKENS);
  assert.equal(theme.line.itemStyle.color, TOKENS.accent);
  // 영역 채움은 accent 의 저알파(rgba 0.12) — 불투명 단색 금지.
  assert.match(theme.line.areaStyle.color, /rgba\(.+,\s*0\.12\)$/);
});

test('DSN030_hexToRgba_3자리·잘못된입력', () => {
  const { hexToRgba } = require('../src/renderer/echartsTheme');
  assert.equal(hexToRgba('#fff', 0.5), 'rgba(255, 255, 255, 0.5)'); // 3자리 확장
  assert.equal(hexToRgba(undefined, 0.5), 'rgba(0, 0, 0, 0)'); // 잘못된 입력 TypeError 없이 폴백
});

test('DSN030_커스텀토큰_주입반영', () => {
  const custom = { ...TOKENS, accent: '#FF0000' };
  const theme = makeEchartsTheme(custom);
  assert.equal(theme.color[0], '#FF0000');
});

test('DSN030_TOKENS_핵심키존재', () => {
  for (const k of ['page', 'card', 'text-1', 'text-2', 'accent', 'accent-hover', 'track', 'ok', 'warn', 'over']) {
    assert.ok(k in TOKENS, `TOKENS에 ${k} 있어야 함`);
  }
});

test('DSN030_TOKENS_tokens_css와_드리프트없음', () => {
  // JS 미러가 tokens.css §5.2 값과 어긋나지 않는지 검증(두 출처 동기화).
  const fs = require('node:fs');
  const path = require('node:path');
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'tokens.css'), 'utf8');
  for (const [key, val] of Object.entries(TOKENS)) {
    const m = css.match(new RegExp(`--${key}:\\s*(#[0-9A-Fa-f]{3,8})`));
    assert.ok(m, `tokens.css에 --${key} 정의 있어야 함`);
    assert.equal(m[1].toUpperCase(), val.toUpperCase(), `--${key} 값 불일치`);
  }
});
