// 일자별 추세 차트 옵션 빌더(§4.1) — 비용/토큰 토글 막대그래프(사용자 요청: 스무딩 라인 금지).
// UMD: node 테스트(module.exports)·렌더러(window.TrendChart).
(function (root) {
  // Fmt 재사용(UX-030): node는 require, 렌더러는 window.Fmt(호출 시점엔 로드 완료).
  function fmt() {
    return typeof module !== 'undefined' && module.exports ? require('./format') : root.Fmt;
  }

  // metric: 'cost' | 'tokens'. theme: makeEchartsTheme 결과.
  function buildTrendOption(daily, metric, theme) {
    const isTokens = metric === 'tokens';
    const pick = (d) => (isTokens ? d.totalTokens : d.totalCost);
    const F = fmt();
    // 축은 간결하게: 비용 '$1,395'(소수 없음), 토큰 '123.0M'. 툴팁은 더 정밀: 비용 '$91.40'.
    const axisFmt = isTokens ? (v) => F.fmtTokens(v) : (v) => '$' + F.fmtInt(v);
    const tipFmt = isTokens ? (v) => F.fmtTokens(v) : (v) => F.fmtUsd(v);
    return {
      color: theme.color,
      textStyle: theme.textStyle,
      grid: { left: 8, right: 8, top: 16, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', valueFormatter: tipFmt },
      xAxis: {
        type: 'category',
        data: daily.map((d) => d.period),
        axisLine: theme.categoryAxis.axisLine,
        axisTick: theme.categoryAxis.axisTick,
        axisLabel: theme.categoryAxis.axisLabel,
      },
      yAxis: {
        type: 'value',
        axisLabel: Object.assign({}, theme.valueAxis.axisLabel, { formatter: axisFmt }),
        splitLine: theme.valueAxis.splitLine,
      },
      series: [
        {
          type: 'bar',
          data: daily.map(pick),
          // 스무딩 없는 막대(사용자 요청). accent 단색 + 상단만 둥글게(토스 톤).
          itemStyle: Object.assign({}, theme.line.itemStyle, { borderRadius: [4, 4, 0, 0] }),
          barMaxWidth: 28,
        },
      ],
    };
  }

  const api = { buildTrendOption };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TrendChart = api;
})(typeof window !== 'undefined' ? window : globalThis);
