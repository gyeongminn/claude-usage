// ECharts 테마 — 디자인 토큰에서 팔레트 주입(§5.1: 기본 팔레트 금지).
// TOKENS 는 tokens.css §5.2 값의 JS 미러(런타임에 CSS 변수 못 읽는 PDF/노드 환경용).
// ponytail: tokens.css 와 두 곳 유지 — 값 바뀌면 둘 다. self-check 가 핵심값 잠금.
// UMD: node(module.exports)·렌더러(window.EChartsTheme) 양쪽 노출.
(function (root) {
const TOKENS = {
  page: '#F2F4F6',
  card: '#FFFFFF',
  'text-1': '#191F28',
  'text-2': '#8B95A1',
  'text-3': '#B0B8C1',
  accent: '#3182F6',
  'accent-hover': '#2272EB',
  'accent-light': '#E8F3FF',
  track: '#EFF1F4',
  ok: '#15803D',
  warn: '#FFC94D',
  over: '#F04452',
};

// 다크 토큰 미러(UI-020) — 같은 토스 원칙(accent 블루 동일), 네온 금지. page/card/text만 어둡게.
// tokens.css [data-theme="dark"] 블록과 동기화(드리프트 self-check가 잠금).
const TOKENS_DARK = {
  page: '#15181E',
  card: '#1E222A',
  'text-1': '#E8EBED',
  'text-2': '#9AA4B0',
  'text-3': '#6B7682',
  accent: '#3182F6',
  'accent-hover': '#4A93F7',
  'accent-light': '#18253A',
  track: '#2B313B',
  ok: '#22C55E',
  warn: '#FFC94D',
  over: '#F04452',
};

// 테마명 → 토큰 셋. 기본 라이트.
function tokensFor(theme) {
  return theme === 'dark' ? TOKENS_DARK : TOKENS;
}

function hexToRgba(hex, alpha) {
  if (typeof hex !== 'string' || !/^#?[0-9A-Fa-f]{3,8}$/.test(hex)) return 'rgba(0, 0, 0, 0)';
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function makeEchartsTheme(tokens = TOKENS) {
  const t = (k) => tokens[k];
  return {
    // accent 우선 팔레트 — 의미색은 임계 표현용으로만(차트 기본은 단색 accent 톤).
    color: [t('accent'), t('ok'), t('warn'), t('over'), t('text-2'), t('accent-hover'), t('track')],
    backgroundColor: 'transparent',
    textStyle: { color: t('text-1'), fontFamily: 'Pretendard' },
    title: { textStyle: { color: t('text-1') }, subtextStyle: { color: t('text-2') } },
    categoryAxis: {
      axisLine: { lineStyle: { color: t('track') } },
      axisTick: { show: false },
      axisLabel: { color: t('text-2') },
      splitLine: { show: false },
    },
    valueAxis: {
      axisLine: { show: false },
      axisLabel: { color: t('text-2') },
      splitLine: { lineStyle: { color: t('track') } },
    },
    // 라인/영역: accent 라인 + accent 저알파 영역 채움(§5.1).
    line: {
      itemStyle: { color: t('accent') },
      lineStyle: { color: t('accent'), width: 2 },
      areaStyle: { color: hexToRgba(t('accent'), 0.12) },
      symbol: 'none',
    },
  };
}

  const api = { makeEchartsTheme, hexToRgba, TOKENS, TOKENS_DARK, tokensFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EChartsTheme = api;
})(typeof window !== 'undefined' ? window : globalThis);
