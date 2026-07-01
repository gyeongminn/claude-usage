const { test } = require('node:test');
const assert = require('node:assert/strict');
const { TILES, TILE_IDS, DEFAULT_MAIN_TILES, normalizeMainTiles } = require('../src/renderer/tiles');
const { SIZES, SIZE_IDS, sizesFor, defaultSizeFor, minSizeFor, normalizeTileSizes, sizeOf } = require('../src/renderer/tiles');

// TILE-010(§12): 메인 탭 타일 카탈로그 + mainTiles 정규화(화이트리스트·중복제거·미지 드롭·빈/무효→기본).

test('TILE010_카탈로그_구조_id유일_span유효', () => {
  assert.ok(Array.isArray(TILES) && TILES.length >= 7);
  const ids = TILES.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, 'id 중복');
  const SPANS = new Set(['full', 'wide', 'narrow']);
  for (const t of TILES) {
    assert.equal(typeof t.id, 'string');
    assert.ok(t.id.length > 0);
    assert.equal(typeof t.labelKey, 'string');
    assert.ok(t.labelKey.length > 0);
    assert.ok(SPANS.has(t.span), `잘못된 span: ${t.span}`);
  }
});

test('TILE010_카탈로그_기대id포함_projects제외', () => {
  for (const id of ['hero', 'trend', 'today', 'weekly', 'models', 'tokens', 'system']) {
    assert.ok(TILE_IDS.includes(id), `누락: ${id}`);
  }
  assert.ok(!TILE_IDS.includes('projects'), 'projects 제외(빈상태·데이터원 부재 OPEN[08])');
});

test('TILE010_기본_mainTiles_현행4_모두카탈로그id', () => {
  assert.deepEqual(DEFAULT_MAIN_TILES, ['hero', 'trend', 'today', 'weekly']);
  for (const id of DEFAULT_MAIN_TILES) assert.ok(TILE_IDS.includes(id));
});

test('TILE010_normalize_정상부분집합_순서보존', () => {
  assert.deepEqual(normalizeMainTiles(['system', 'hero']), ['system', 'hero']);
  assert.deepEqual(normalizeMainTiles(['trend', 'today', 'models']), ['trend', 'today', 'models']);
});

test('TILE010_normalize_미지id_드롭', () => {
  assert.deepEqual(normalizeMainTiles(['hero', 'bogus', 'trend']), ['hero', 'trend']);
});

test('TILE010_normalize_중복제거_첫등장유지', () => {
  assert.deepEqual(normalizeMainTiles(['hero', 'trend', 'hero', 'trend']), ['hero', 'trend']);
});

test('TILE010_normalize_비문자열요소_드롭', () => {
  assert.deepEqual(normalizeMainTiles(['hero', 123, null, 'trend']), ['hero', 'trend']);
});

test('TILE010_normalize_빈_비배열_전부무효_기본폴백', () => {
  assert.deepEqual(normalizeMainTiles([]), DEFAULT_MAIN_TILES);
  assert.deepEqual(normalizeMainTiles(['bogus', 'nope']), DEFAULT_MAIN_TILES); // 전부 무효 → 빈 → 기본
  assert.deepEqual(normalizeMainTiles(null), DEFAULT_MAIN_TILES);
  assert.deepEqual(normalizeMainTiles('hero'), DEFAULT_MAIN_TILES); // 문자열 비배열
  assert.deepEqual(normalizeMainTiles(undefined), DEFAULT_MAIN_TILES);
});

test('TILE010_normalize_폴백은_복사본_기본원본불변', () => {
  const a = normalizeMainTiles([]);
  a.push('system');
  assert.deepEqual(normalizeMainTiles([]), ['hero', 'trend', 'today', 'weekly']);
});

// WIDGET-010(§13): 2D 크기 클래스 카탈로그 + tileSizes 정규화(타일별 허용 크기·최소 크기·미지/비허용 드롭·프로토타입 안전·구형 투명 마이그레이션).

test('WIDGET010_SIZES_2D_footprint_sm_md_lg', () => {
  assert.deepEqual(SIZE_IDS, ['sm', 'md', 'lg']);
  for (const id of SIZE_IDS) {
    assert.ok(SIZES[id].cols === 1 || SIZES[id].cols === 2, `cols: ${id}`);
    assert.ok(SIZES[id].rows === 1 || SIZES[id].rows === 2, `rows: ${id}`);
  }
  assert.deepEqual(SIZES.sm, { cols: 1, rows: 1 });
  assert.deepEqual(SIZES.lg, { cols: 2, rows: 2 }); // lg=전폭 2행(시스템 그래프)
});

test('WIDGET010_타일별_허용크기_기본_최소', () => {
  for (const t of TILES) {
    const allowed = sizesFor(t.id);
    assert.ok(Array.isArray(allowed) && allowed.length >= 1, `허용 크기 없음: ${t.id}`);
    for (const s of allowed) assert.ok(SIZE_IDS.includes(s), `미지 크기 ${s} @${t.id}`);
    assert.ok(allowed.includes(defaultSizeFor(t.id)), `기본이 허용 밖: ${t.id}`);
    assert.equal(minSizeFor(t.id), allowed[0]); // 최소=허용 목록 첫(작은 것부터)
  }
});

test('WIDGET010_system_lg허용_그래프모드', () => {
  assert.ok(sizesFor('system').includes('lg'), 'system 큰 크기(그래프) 허용');
});

test('WIDGET010_기본크기_거동보존_기본4', () => {
  // span full→md(전폭)·wide/narrow→sm(1칸). 기본4 렌더 보존.
  assert.equal(defaultSizeFor('hero'), 'md');
  assert.equal(defaultSizeFor('weekly'), 'md');
  assert.equal(defaultSizeFor('trend'), 'sm');
  assert.equal(defaultSizeFor('today'), 'sm');
});

test('WIDGET010_normalizeTileSizes_유효만_남김', () => {
  assert.deepEqual(normalizeTileSizes({ system: 'lg', today: 'md' }), { system: 'lg', today: 'md' });
});

test('WIDGET010_normalizeTileSizes_미지id_드롭', () => {
  assert.deepEqual(normalizeTileSizes({ bogus: 'lg', system: 'sm' }), { system: 'sm' });
});

test('WIDGET010_normalizeTileSizes_타일_비허용크기_드롭', () => {
  // today는 lg 미허용·hero는 sm 미허용(min md) → 드롭. today md는 허용.
  assert.deepEqual(normalizeTileSizes({ today: 'lg', hero: 'sm' }), {});
  assert.deepEqual(normalizeTileSizes({ today: 'md' }), { today: 'md' });
});

test('WIDGET010_normalizeTileSizes_미지크기_비객체_프로토타입_안전', () => {
  assert.deepEqual(normalizeTileSizes({ system: 'huge' }), {}); // 미지 크기
  assert.deepEqual(normalizeTileSizes(null), {});
  assert.deepEqual(normalizeTileSizes([]), {}); // 맵 아님(배열)
  assert.deepEqual(normalizeTileSizes('x'), {});
  const poison = JSON.parse('{"__proto__":{"pwn":1},"system":"lg"}');
  assert.deepEqual(normalizeTileSizes(poison), { system: 'lg' });
  assert.equal({}.pwn, undefined); // 프로토타입 미오염
});

test('WIDGET010_sizeOf_기본폴백_구형마이그레이션', () => {
  // 크기 맵 없음(구형 [id]만) → 각 타일 기본 크기(투명 마이그레이션).
  assert.equal(sizeOf('system', {}), 'sm'); // 기본
  assert.equal(sizeOf('system', { system: 'lg' }), 'lg'); // 지정
  assert.equal(sizeOf('hero', undefined), 'md'); // 맵 없음→기본
  assert.equal(sizeOf('today', { today: 'lg' }), 'sm'); // 비허용→기본
});
