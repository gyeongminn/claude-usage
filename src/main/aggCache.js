// 증분 집계 캐시(§3) — 파일별 {mtime·size·합계} 보관, 변경 파일만 재파싱하도록 판정.
// 100억+ 토큰 규모라 매번 전체 재파싱 금지. ponytail: 인메모리 Map 으로 충분(영속화는 필요 시 추가).
function emptyTotals() {
  return { totalCost: 0, totalTokens: 0 };
}

function mergeTotals(list) {
  return list.reduce(
    (acc, t) => ({
      totalCost: acc.totalCost + (Number(t.totalCost) || 0),
      totalTokens: acc.totalTokens + (Number(t.totalTokens) || 0),
    }),
    emptyTotals()
  );
}

class AggCache {
  constructor() {
    this._byPath = new Map(); // path → { mtimeMs, size, totals }
  }

  // stat(mtimeMs·size)이 캐시와 다르면(또는 없으면) 재파싱 필요.
  needsReparse(filePath, stat) {
    if (!stat) return true; // stat 못 얻었으면(파일 사라짐 등) 캐시 신뢰 불가 → 처리 대상.
    const e = this._byPath.get(filePath);
    if (!e) return true;
    return e.mtimeMs !== stat.mtimeMs || e.size !== stat.size;
  }

  // 파일별 집계 갱신(같은 경로면 덮어씀 — 중복합 방지).
  set(filePath, stat, totals) {
    this._byPath.set(filePath, {
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      totals: { totalCost: Number(totals.totalCost) || 0, totalTokens: Number(totals.totalTokens) || 0 },
    });
  }

  remove(filePath) {
    this._byPath.delete(filePath);
  }

  // 전 파일 합산.
  total() {
    return mergeTotals([...this._byPath.values()].map((e) => e.totals));
  }
}

module.exports = { AggCache, mergeTotals, emptyTotals };
