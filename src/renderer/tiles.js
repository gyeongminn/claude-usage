// 메인 탭 타일 카탈로그 + mainTiles 정규화(§12, TILE-010). 메인(렌더러)·검증(settings.js, node) 단일 출처.
// UMD: node 테스트/settings는 module.exports, 렌더러는 <script>로 window.Tiles 노출(로직 단일 출처, 드리프트 없음).
(function (root) {
  // 타일 = { id(안정), labelKey(i18n), span }. span: full=전폭(grid-column 1/-1)·wide=넓은 열·narrow=좁은 열.
  // projects 제외 — 빈상태·데이터원 부재(OPEN[08])라 선택 후보 아님.
  // WIDGET-010(§13): 2D 이산 크기 클래스(너비×높이 격자 칸). 아이폰식 스냅 — 자유좌표 아님.
  // sm=1칸(게이지·KPI)·md=전폭 1행(배너)·lg=전폭 2행(키 큰 — 시스템 그래프 등). WIDGET-020 그리드가 소비.
  const SIZES = { sm: { cols: 1, rows: 1 }, md: { cols: 2, rows: 1 }, lg: { cols: 2, rows: 2 } };
  const SIZE_IDS = Object.keys(SIZES);

  // 타일 = { id, labelKey, span, sizes }. span: 현행 CSS 배치(TILE-020, full/wide/narrow, 유지).
  // sizes: 이 타일이 허용하는 이산 크기(작은 것부터 — [0]=최소 크기 고정). 기본 크기는 span에서 파생(defaultSizeFor).
  // projects 제외 — 빈상태·데이터원 부재(OPEN[08])라 선택 후보 아님.
  const TILES = [
    { id: 'hero', labelKey: 'usage_5h', span: 'full', sizes: ['md', 'lg'] },
    { id: 'trend', labelKey: 'dash_trend', span: 'wide', sizes: ['sm', 'md', 'lg'] },
    { id: 'today', labelKey: 'dash_today', span: 'narrow', sizes: ['sm', 'md'] },
    { id: 'weekly', labelKey: 'dash_weekly5', span: 'full', sizes: ['md', 'lg'] },
    { id: 'models', labelKey: 'model_share', span: 'narrow', sizes: ['sm', 'md'] },
    { id: 'tokens', labelKey: 'detail_token_comp', span: 'wide', sizes: ['sm', 'md', 'lg'] },
    { id: 'system', labelKey: 'sys_title', span: 'narrow', sizes: ['sm', 'md', 'lg'] }, // lg=반응형 그래프(§13)
  ];
  const TILE_IDS = TILES.map((t) => t.id);
  const byId = (id) => TILES.find((t) => t.id === id);
  const ownKey = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  // 타일 허용 크기(복사본). 기본 크기 = span 파생(full=전폭 md·그 외 1칸 sm) → 기본4 렌더 거동 보존.
  function sizesFor(id) { const t = byId(id); return t ? t.sizes.slice() : []; }
  function defaultSizeFor(id) { const t = byId(id); return t && t.span === 'full' ? 'md' : 'sm'; }
  function minSizeFor(id) { const t = byId(id); return t ? t.sizes[0] : null; }

  // {id:size} 맵 정규화 — 카탈로그 id + 그 타일 허용 크기만 남김. 비객체/배열→{}.
  // 고정 카탈로그(TILE_IDS)만 순회하므로 프로토타입 오염 불가(__proto__ 등 미지 키는 애초에 미조회).
  function normalizeTileSizes(map) {
    if (map == null || typeof map !== 'object' || Array.isArray(map)) return {};
    const out = {};
    for (const id of TILE_IDS) {
      if (!ownKey(map, id)) continue;
      const s = map[id];
      if (SIZE_IDS.includes(s) && byId(id).sizes.includes(s)) out[id] = s;
    }
    return out;
  }
  // 유효 크기(정규화 맵 기준) 또는 기본(맵에 없음=구형 [id]만 → 투명 마이그레이션).
  function sizeOf(id, sizes) {
    if (sizes && ownKey(sizes, id)) {
      const s = sizes[id];
      const t = byId(id);
      if (t && SIZE_IDS.includes(s) && t.sizes.includes(s)) return s;
    }
    return defaultSizeFor(id);
  }
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

  // WIDGET-020(§13): 드래그 재배치 = 순서 배열 reorder. fromId를 toId 위치(대상 앞)에 삽입.
  // 원본 불변(복사본 반환)·from/to 미존재·동일 → 무변경 복사. 비배열 → []. 아이폰식 스냅(순서=위치).
  function reorderTiles(order, fromId, toId) {
    const arr = Array.isArray(order) ? order.slice() : [];
    if (fromId === toId) return arr;
    const from = arr.indexOf(fromId);
    if (from < 0 || arr.indexOf(toId) < 0) return arr;
    arr.splice(from, 1);
    arr.splice(arr.indexOf(toId), 0, fromId);
    return arr;
  }
  // 리사이즈 = 허용 이산 크기 순환(다음 크기·마지막→처음 wrap). 무효 현재 → 최소(첫). 허용 없음(미지 타일) → current.
  function cycleSize(id, current) {
    const allowed = sizesFor(id);
    if (!allowed.length) return current;
    const i = allowed.indexOf(current);
    return i < 0 ? allowed[0] : allowed[(i + 1) % allowed.length];
  }

  const api = {
    TILES, TILE_IDS, DEFAULT_MAIN_TILES, normalizeMainTiles,
    SIZES, SIZE_IDS, sizesFor, defaultSizeFor, minSizeFor, normalizeTileSizes, sizeOf,
    reorderTiles, cycleSize,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Tiles = api;
})(typeof window !== 'undefined' ? window : globalThis);
