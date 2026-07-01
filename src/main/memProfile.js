// MEM-010(Phase 18, §8): 앱 RAM 풋프린트 측정 계측(순수). app.getAppMetrics() 프로세스별 workingSetSize 집계.
// ponytail: 측정 먼저 — 추측 최적화 금지(§8). main.js가 MEM_PROFILE env일 때만 호출(프로덕션 무영향).
// app.getAppMetrics(): [{ type:'Browser'|'Tab'|'GPU'|'Utility'|…, memory:{ workingSetSize(KB), … }, … }]

// 프로세스 타입별 개수·workingSet(KB) 합 + 총합. 비배열·누락 필드 안전(측정 계측이라 크래시 금지).
function summarizeMetrics(metrics) {
  const list = Array.isArray(metrics) ? metrics : [];
  const byType = {};
  let totalWorkingSetKb = 0;
  for (const m of list) {
    const type = (m && m.type) || 'Unknown';
    const kb = (m && m.memory && Number(m.memory.workingSetSize)) || 0;
    if (!byType[type]) byType[type] = { count: 0, workingSetKb: 0 };
    byType[type].count += 1;
    byType[type].workingSetKb += kb;
    totalWorkingSetKb += kb;
  }
  return { byType, totalWorkingSetKb, processCount: list.length };
}

function mb(kb) {
  return (kb / 1024).toFixed(1) + ' MB';
}

// 사람이 읽는 한 줄 요약 + 타입별 분해(콘솔 로그용).
function formatReport(summary) {
  const s = summary || { byType: {}, totalWorkingSetKb: 0, processCount: 0 };
  const lines = [`[MEM] processes=${s.processCount} total=${mb(s.totalWorkingSetKb)}`];
  for (const type of Object.keys(s.byType)) {
    const e = s.byType[type];
    lines.push(`  ${type} x${e.count}: ${mb(e.workingSetKb)}`);
  }
  return lines.join('\n');
}

module.exports = { summarizeMetrics, formatReport };
