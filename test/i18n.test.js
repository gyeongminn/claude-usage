const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  LOCALES,
  resolveLocale,
  makeT,
} = require('../src/i18n/i18n');

test('FND070_LOCALES_확정10종', () => {
  assert.deepEqual(LOCALES, ['en', 'es', 'pt-BR', 'ja', 'ko', 'de', 'fr', 'zh-CN', 'it', 'vi']);
});

test('FND070_resolveLocale_ptBR_지역태그처리', () => {
  assert.equal(resolveLocale('pt-BR'), 'pt-BR'); // 정확매칭
  assert.equal(resolveLocale('pt'), 'pt-BR'); // 같은 언어 폴백
  assert.equal(resolveLocale('pt-PT'), 'pt-BR'); // 다른 지역도 pt-BR로
  assert.equal(resolveLocale('vi'), 'vi');
  assert.equal(resolveLocale('it-IT'), 'it');
});

test('FND070_resolveLocale_지원로케일_그대로', () => {
  assert.equal(resolveLocale('ko'), 'ko');
  assert.equal(resolveLocale('ja'), 'ja');
});

test('FND070_resolveLocale_지역태그_기본언어로매핑', () => {
  assert.equal(resolveLocale('ko-KR'), 'ko');
  assert.equal(resolveLocale('en-US'), 'en');
  assert.equal(resolveLocale('zh-CN'), 'zh-CN'); // 정확매칭 우선
  assert.equal(resolveLocale('zh-TW'), 'zh-CN'); // 같은 언어 폴백
});

test('FND070_resolveLocale_미지원_en폴백', () => {
  assert.equal(resolveLocale('xx'), 'en');
  assert.equal(resolveLocale(undefined), 'en');
  assert.equal(resolveLocale(''), 'en');
});

test('FND070_t_키조회', () => {
  const t = makeT('ko', { greeting: '안녕', cost: '비용' });
  assert.equal(t('greeting'), '안녕');
});

test('FND070_t_누락키_en폴백', () => {
  // ko 카탈로그에 없는 키는 en 카탈로그로 폴백.
  const t = makeT('ko', { only_en: 'fallback' }, { only_ko: '한글만' });
  assert.equal(t('only_en'), 'fallback'); // ko에 없으면 en
});

test('FND070_t_키도_폴백도_없으면_키반환', () => {
  const t = makeT('ko', {}, {});
  assert.equal(t('missing'), 'missing');
});

test('FND070_t_변수보간', () => {
  const t = makeT('en', { msg: 'Hello {name}, {n} items' });
  assert.equal(t('msg', { name: 'Sam', n: 3 }), 'Hello Sam, 3 items');
});

test('FND070_t_비문자열값_TypeError없이안전', () => {
  const t = makeT('en', { count: 123 });
  assert.equal(t('count'), '123'); // 숫자 값도 replace 폭발 없이 문자열화
});

test('FND070_loadCatalog_화이트리스트_traversal차단', () => {
  const { loadCatalog } = require('../src/i18n/i18n');
  assert.deepEqual(loadCatalog('../../package'), {}); // 경로 탈출 시도 → 빈 객체
  assert.deepEqual(loadCatalog('xx'), {}); // 미지원 로케일 → 빈 객체
  assert.ok(loadCatalog('en').app_title); // 정상 로케일은 로드
});
