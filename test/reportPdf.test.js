const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { reportFileName, reportPath } = require('../src/main/reportPdf');

// PDF-050: 저장 파일명 reports/YYYY-MM.pdf (월 0패딩)
test('PDF050_reportFileName_월0패딩', () => {
  assert.equal(reportFileName(2026, 5), '2026-05.pdf');
  assert.equal(reportFileName(2026, 12), '2026-12.pdf');
});

test('PDF050_reportPath_디렉터리결합', () => {
  assert.equal(reportPath('/data/reports', 2026, 1), path.join('/data/reports', '2026-01.pdf'));
});

test('PDF050_reportFileName_숫자문자열도0패딩', () => {
  assert.equal(reportFileName('2026', '3'), '2026-03.pdf');
});
