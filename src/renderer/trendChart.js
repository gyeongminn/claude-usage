// 일자별 추세 차트 옵션 빌더(§4.1) — 비용/토큰 토글 라인·영역.
// UMD: node 테스트(module.exports)·렌더러(window.TrendChart).
(function (root) {
  // metric: 'cost' | 'tokens'. theme: makeEchartsTheme 결과.
  function buildTrendOption(daily, metric, theme) {
    const isTokens = metric === 'tokens';
    const pick = (d) => (isTokens ? d.totalTokens : d.totalCost);
    return {
      color: theme.color,
      textStyle: theme.textStyle,
      grid: { left: 8, right: 8, top: 16, bottom: 8, containLabel: true },
      xAxis: {
        type: 'category',
        data: daily.map((d) => d.period),
        axisLine: theme.categoryAxis.axisLine,
        axisTick: theme.categoryAxis.axisTick,
        axisLabel: theme.categoryAxis.axisLabel,
      },
      yAxis: {
        type: 'value',
        axisLabel: theme.valueAxis.axisLabel,
        splitLine: theme.valueAxis.splitLine,
      },
      series: [
        {
          type: 'line',
          smooth: true,
          symbol: 'none',
          data: daily.map(pick),
          lineStyle: theme.line.lineStyle,
          areaStyle: theme.line.areaStyle,
          itemStyle: theme.line.itemStyle,
        },
      ],
    };
  }

  const api = { buildTrendOption };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TrendChart = api;
})(typeof window !== 'undefined' ? window : globalThis);
