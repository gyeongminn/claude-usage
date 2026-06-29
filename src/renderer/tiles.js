// 메인 탭 타일 카탈로그 + mainTiles 정규화(§12, TILE-010). 메인(렌더러)·검증(settings.js, node) 단일 출처.
// UMD: node 테스트/settings는 module.exports, 렌더러는 <script>로 window.Tiles 노출(로직 단일 출처, 드리프트 없음).
(function (root) {
  // 타일 = { id(안정), labelKey(i18n), span }. span: full=전폭(grid-column 1/-1)·wide=넓은 열·narrow=좁은 열.
  // projects 제외 — 빈상태·데이터원 부재(OPEN[08])라 선택 후보 아님.
  const TILES = [
    { id: 'hero', labelKey: 'usage_5h', span: 'full' },
    { id: 'trend', labelKey: 'dash_trend', span: 'wide' },
    { id: 'today', labelKey: 'dash_today', span: 'narrow' },
    { id: 'weekly', labelKey: 'dash_weekly5', span: 'full' },
    { id: 'models', labelKey: 'model_share', span: 'narrow' },
    { id: 'tokens', labelKey: 'detail_token_comp', span: 'wide' },
    { id: 'system', labelKey: 'sys_title', span: 'narrow' },
  ];
  const TILE_IDS = TILES.map((t) => t.id);
  // 기본 메인 구성 = 현행(거동 보존). 순서 = 메인 그리드 배치 순서.
  const DEFAULT_MAIN_TILES = ['hero', 'trend', 'today', 'weekly'];

  // 입력 배열 → 카탈로그 id만 남기고(미지·비문자열 드롭) 첫 등장 순서로 중복 제거.
  // 비배열·빈 결과(전부 무효 포함) → 기본 복사본(메인 빈 화면 방지·기본 원본 불변).
  function normalizeMainTiles(arr) {
    if (!Array.isArray(arr)) return DEFAULT_MAIN_TILES.slice();
    const seen = new Set();
    const out = [];
    for (const v of arr) {
      if (typeof v !== 'string' || !TILE_IDS.includes(v) || seen.has(v)) continue;
      seen.add(v);
      out.push(v);
    }
    return out.length ? out : DEFAULT_MAIN_TILES.slice();
  }

  const api = { TILES, TILE_IDS, DEFAULT_MAIN_TILES, normalizeMainTiles };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Tiles = api;
})(typeof window !== 'undefined' ? window : globalThis);
