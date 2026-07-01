// WIDGET-030(§13): system 타일 그래프 모드의 지연 ring-buffer(경계·회전) 순수 로직.
// 그래프 타일이 마운트된(lg 크기) 동안에만 렌더러가 채운다 — 상시 샘플링·상시 점유 없음(Phase 18 무충돌).
// UMD: node 테스트(module.exports)·렌더러(<script> → window.SysHistory). 로직 단일 출처.
(function (root) {
  const CAP = 60; // 60샘플 × 2s(sys:stats 주기) = 2분 창(§13). 초과분은 앞(가장 오래된)에서 드롭.

  // 경계 ring-buffer 회전: sample을 뒤에 넣고 cap 초과분을 앞에서 잘라냄. 원본 불변(새 배열). 비배열 buf → [].
  function pushSample(buf, sample, cap = CAP) {
    const arr = Array.isArray(buf) ? buf.slice() : [];
    arr.push(sample);
    if (arr.length > cap) arr.splice(0, arr.length - cap);
    return arr;
  }

  // 특정 지표(cpu/ram/gpu) 시계열 배열. 숫자 아니면(예: GPU 부재 null·미존재) null → ECharts가 갭 처리.
  function toSeries(buf, key) {
    return (Array.isArray(buf) ? buf : []).map((s) => (s && typeof s[key] === 'number' ? s[key] : null));
  }

  const api = { pushSample, toSeries, CAP };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SysHistory = api;
})(typeof window !== 'undefined' ? window : globalThis);
