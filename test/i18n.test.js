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

test('AUTO020_t_보간_프로토타입체인키_미보간_own키만', () => {
  // interpolate가 `k in vars`로 판정하면 Object.prototype 멤버명({constructor}/{toString} 등)이
  // vars에 own 키가 없어도 프로토타입에서 끌려와 가비지(함수 문자열)가 UI 텍스트에 주입됨.
  // own 키만 보간해야 안전 — 매칭 안 되면 원문({constructor}) 그대로 보존.
  const t = makeT('en', { msg: 'X {constructor} Y {toString}' });
  assert.equal(t('msg', {}), 'X {constructor} Y {toString}');
  // 회귀 가드: 진짜 own 키는 그대로 보간.
  const t2 = makeT('en', { greet: 'Hi {name}' });
  assert.equal(t2('greet', { name: 'Sam' }), 'Hi Sam');
});

test('AUTO020_t_조회_프로토타입체인키_키반환_own키만', () => {
  // makeT 룩업이 `key in catalog`(프로토타입 체인)로 판정하면 Object.prototype 멤버명
  // ('toString'/'constructor'/'valueOf' 등)이 카탈로그에 own 없어도 상속 함수가 끌려와
  // interpolate가 함수 소스 문자열로 치환 → UI에 가비지. own 키만 조회해야 키 폴백.
  const t = makeT('en', {}, {});
  assert.equal(t('toString'), 'toString');
  assert.equal(t('constructor'), 'constructor');
  assert.equal(t('hasOwnProperty'), 'hasOwnProperty');
  // 회귀 가드: own 키는 정상 조회(locale 우선 → en 폴백).
  const t2 = makeT('ko', { only_en: 'fallback' }, { only_ko: '한글만' });
  assert.equal(t2('only_ko'), '한글만');
  assert.equal(t2('only_en'), 'fallback');
});

test('FND070_loadCatalog_화이트리스트_traversal차단', () => {
  const { loadCatalog } = require('../src/i18n/i18n');
  assert.deepEqual(loadCatalog('../../package'), {}); // 경로 탈출 시도 → 빈 객체
  assert.deepEqual(loadCatalog('xx'), {}); // 미지원 로케일 → 빈 객체
  assert.ok(loadCatalog('en').app_title); // 정상 로케일은 로드
});
