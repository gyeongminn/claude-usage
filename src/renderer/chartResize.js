// UX-010: 창 크기 변경 시 ECharts 인스턴스들을 따라 리사이즈한다.
// ECharts는 init 시점 컨테이너 크기로 캔버스를 고정하므로, window resize에
// chart.resize()를 호출하지 않으면 레이아웃이 안 따라온다(이전엔 Reload View로만 갱신됨).
// UMD — 렌더러(<script>)와 node:test 양쪽에서 로드.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChartResize = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  // 여러 차트를 한 번에 리사이즈. null·미초기화·resize 없는 값은 건너뜀(첫 집계 전 안전).
  function resizeAll(charts) {
    for (const c of charts) {
      if (c && typeof c.resize === 'function') c.resize();
    }
  }

  // 디바운스: ms 동안 모인 호출을 마지막 기준 1회로 합침(연속 resize 폭주 방지).
  function makeDebounced(fn, ms) {
    let t = null;
    return function () {
      if (t) clearTimeout(t);
      t = setTimeout(function () {
        t = null;
        fn();
      }, ms);
    };
  }

  return { resizeAll, makeDebounced };
});
