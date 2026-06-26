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

// UI-020: 다크 토큰 미러 — 같은 토스 원칙(accent 동일), page/text만 어둡게.
test('UI020_TOKENS_DARK_다크값_accent유지', () => {
  const { TOKENS_DARK, tokensFor } = require('../src/renderer/echartsTheme');
  assert.notEqual(TOKENS_DARK.page, TOKENS.page); // 다크 page는 라이트와 다름
  assert.notEqual(TOKENS_DARK['text-1'], TOKENS['text-1']);
  assert.equal(TOKENS_DARK.accent, TOKENS.accent); // accent(블루)는 동일 — 토스 원칙
  assert.equal(tokensFor('dark'), TOKENS_DARK);
  assert.equal(tokensFor('light'), TOKENS);
  assert.equal(tokensFor(undefined), TOKENS); // 기본 라이트
});

test('UI020_makeEchartsTheme_다크_텍스트색', () => {
  const { TOKENS_DARK } = require('../src/renderer/echartsTheme');
  const theme = makeEchartsTheme(TOKENS_DARK);
  assert.equal(theme.textStyle.color, TOKENS_DARK['text-1']);
  assert.equal(theme.color[0], TOKENS_DARK.accent); // accent 팔레트 유지
});

test('UI020_TOKENS_DARK_tokens_css_드리프트없음', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const { TOKENS_DARK } = require('../src/renderer/echartsTheme');
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'tokens.css'), 'utf8');
  const block = css.match(/\[data-theme=['"]dark['"]\]\s*\{([^}]*)\}/);
  assert.ok(block, 'tokens.css에 [data-theme="dark"] 블록 있어야 함');
  for (const [key, val] of Object.entries(TOKENS_DARK)) {
    const m = block[1].match(new RegExp(`--${key}:\\s*(#[0-9A-Fa-f]{3,8})`));
    assert.ok(m, `다크 블록에 --${key} 있어야 함`);
    assert.equal(m[1].toUpperCase(), val.toUpperCase(), `다크 --${key} 불일치`);
  }
});
