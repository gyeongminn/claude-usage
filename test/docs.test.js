const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('DOC010_LICENSE_MIT존재_연도저작자', () => {
  const l = read('LICENSE');
  assert.match(l, /MIT License/);
  assert.match(l, /Permission is hereby granted/);
  assert.match(l, /gyeongmin/); // package.json author와 일치
});

test('DOC010_README_존재_제목_소개', () => {
  const r = read('README.md');
  assert.match(r, /# Claude Usage/);
  assert.match(r, /ccusage/); // 데이터 출처 명시
});

test('DOC010_README_필수섹션', () => {
  const r = read('README.md');
  // 설치/실행·빌드·데이터 출처·라이선스 섹션(영어 canonical).
  for (const h of [/## Install/i, /## (Build|Development)/i, /## Data source/i, /## License/i]) {
    assert.match(r, h);
  }
});

test('DOC010_README_언어네비_링크자리', () => {
  const r = read('README.md');
  // 상단 언어 네비(번역본 점진, EN은 self 링크). DOC-020에서 번역본 추가.
  assert.match(r, /\[English\]\(README\.md\)/);
});

test('DOC010_README_설치실행_명령', () => {
  const r = read('README.md');
  assert.match(r, /npm install/);
  assert.match(r, /npm start/);
  assert.match(r, /npm run build/);
});

test('DOC020_언어네비_KO링크포함', () => {
  // 표준 OSS 패턴: 상단 네비에 번역본 링크. EN 자기 + KO 우선.
  const r = read('README.md');
  assert.match(r, /\[English\]\(README\.md\)/);
  assert.match(r, /\[한국어\]\(i18n\/README\.ko\.md\)/);
});

test('DOC020_KO번역본_존재_제목_네비', () => {
  const ko = read('i18n/README.ko.md');
  assert.match(ko, /# Claude Usage/);
  assert.match(ko, /ccusage/); // 데이터 출처
  // 번역본도 같은 언어 네비(상호 링크). KO에서 EN으로 돌아가는 링크는 ../README.md.
  assert.match(ko, /\[English\]\(\.\.\/README\.md\)/);
  assert.match(ko, /\[한국어\]/);
});

test('DOC020_KO번역본_핵심섹션_한국어', () => {
  const ko = read('i18n/README.ko.md');
  // 한국어 섹션 헤더(설치·라이선스 등) 존재.
  assert.match(ko, /## 설치/);
  assert.match(ko, /## 라이선스/);
});

const OTHER_LANGS = ['es', 'pt-BR', 'ja', 'de', 'fr', 'zh-CN', 'it', 'vi'];

test('DOC030_나머지8언어_번역본_존재_제목', () => {
  for (const lang of OTHER_LANGS) {
    const t = read(`i18n/README.${lang}.md`);
    assert.match(t, /# Claude Usage/, `${lang} 제목 누락`);
    assert.match(t, /ccusage/, `${lang} 데이터출처 누락`);
    assert.match(t, /\[English\]\(\.\.\/README\.md\)/, `${lang} EN 네비 누락`);
  }
});

test('DOC030_언어네비_전체10개_링크', () => {
  // canonical README 상단 네비에 10개 언어 모두.
  const r = read('README.md');
  const expect = [
    /\[English\]\(README\.md\)/, /\[한국어\]\(i18n\/README\.ko\.md\)/,
    /\(i18n\/README\.es\.md\)/, /\(i18n\/README\.pt-BR\.md\)/, /\(i18n\/README\.ja\.md\)/,
    /\(i18n\/README\.de\.md\)/, /\(i18n\/README\.fr\.md\)/, /\(i18n\/README\.zh-CN\.md\)/,
    /\(i18n\/README\.it\.md\)/, /\(i18n\/README\.vi\.md\)/,
  ];
  for (const re of expect) assert.match(r, re);
});
