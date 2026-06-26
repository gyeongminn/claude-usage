// 기동 시 catch-up(OPS-040, §1/§3 안전망): "지난달 PDF 없으면 지금 생성".
// 1일에 PC가 꺼져 있어 스케줄러가 못 돈 경우, 다음 기동 때 누락분을 채운다.
// 순수 함수 — Clock(now ms) 주입, UTC 기준(§10/OPEN[05]). 파일 I/O는 호출부(main.js).
const { prevMonthYM } = require('./scheduler');
const { reportFileName } = require('./reportPdf');

// existing: 이미 있는 PDF 파일명(배열/Set, 'YYYY-MM.pdf'). now: 기동 시각 ms.
// lookback: 거슬러 검사할 개월 수(기본 1 = 지난달만). 오래된 달부터 정렬해 누락 YM 반환.
function missingMonths(existing, now, lookback = 1) {
  const have = existing instanceof Set ? existing : new Set(existing || []);
  const n = Math.max(1, Math.floor(lookback));
  const out = [];
  // 지난달을 기준점으로 i개월씩 더 과거로(i=0 지난달, i=n-1 가장 오래된 달).
  for (let i = n - 1; i >= 0; i--) {
    const ym = nthPrevMonthYM(now, i + 1); // i+1 개월 전의 달
    if (!have.has(reportFileName(ym.year, ym.month))) out.push(ym);
  }
  return out;
}

// now 기준 k개월 전의 {year, month}. k=1이면 지난달. prevMonthYM 반복으로 경계 안전.
function nthPrevMonthYM(now, k) {
  let cursor = now;
  let ym = prevMonthYM(cursor);
  for (let j = 1; j < k; j++) {
    // 그 달 1일로 이동 후 다시 지난달 — 월 길이 차이에 안전.
    cursor = Date.UTC(ym.year, ym.month - 1, 1);
    ym = prevMonthYM(cursor);
  }
  return ym;
}

module.exports = { missingMonths };
