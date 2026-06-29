const { test } = require('node:test');
const assert = require('node:assert/strict');
const { TILES, TILE_IDS, DEFAULT_MAIN_TILES, normalizeMainTiles } = require('../src/renderer/tiles');

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
