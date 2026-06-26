// v20 ccusage 는 Codex 등 타 에이전트 사용량도 섞어 집계(§2). 모델명으로 Claude 만 남긴다.
function isClaudeModel(name) {
  return typeof name === 'string' && name.toLowerCase().startsWith('claude');
}

// entries: daily/monthly/session 배열(각 엔트리에 modelBreakdowns).
// 비-Claude 모델 breakdown 제거 후 엔트리 totals 재계산. Claude 모델 0개면 엔트리 드롭. 원본 불변.
function filterClaude(entries) {
  const out = [];
  for (const e of entries) {
    const kept = (e.modelBreakdowns || []).filter((b) => isClaudeModel(b.modelName));
    if (kept.length === 0) continue;
    const sum = (k) => kept.reduce((a, b) => a + (b[k] || 0), 0);
    const inputTokens = sum('inputTokens');
    const outputTokens = sum('outputTokens');
    const cacheCreationTokens = sum('cacheCreationTokens');
    const cacheReadTokens = sum('cacheReadTokens');
    out.push({
      ...e,
      modelBreakdowns: kept,
      modelsUsed: [...new Set(kept.map((b) => b.modelName))],
      inputTokens,
      outputTokens,
      cacheCreationTokens,
      cacheReadTokens,
      totalCost: sum('cost'),
      // ponytail: ccusage 관례대로 totalTokens = 4개 토큰 합.
      totalTokens: inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens,
    });
  }
  return out;
}

module.exports = { filterClaude, isClaudeModel };
