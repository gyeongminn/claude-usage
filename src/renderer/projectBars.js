// 프로젝트 Top N + '기타' 묶음(§7: Top 5 + 기타). 가로 바 차트.
// UMD: node 테스트·렌더러(window.ProjectBars).
(function (root) {
  const OTHER = '기타'; // ponytail: 라벨은 i18n 배선(OPEN[07]) 후 t() 경유로 교체.

  // ccusage --instances 항목 → {project, totalCost}. name 우선, 없으면 project.
  function topNWithOther(projects, n) {
    const norm = projects.map((p) => ({
      project: p.name || p.project || '(unknown)',
      totalCost: Number(p.totalCost) || 0,
    }));
    const sorted = norm.slice().sort((a, b) => b.totalCost - a.totalCost);
    if (sorted.length <= n) return sorted;
    const top = sorted.slice(0, n);
    const otherCost = sorted.slice(n).reduce((s, p) => s + p.totalCost, 0);
    if (otherCost > 0) top.push({ project: OTHER, totalCost: otherCost });
    return top;
  }

  // Fmt 재사용(UX-031): 비용 $ 단위. node=require, 렌더러=window.Fmt(호출시 resolve).
  function fmt() {
    return typeof module !== 'undefined' && module.exports ? require('./format') : root.Fmt;
  }

  // 가로 바(y=카테고리). ECharts는 위→아래라, 큰 값이 위로 오게 역순으로 넣는다.
  function buildProjectBarOption(rows, theme) {
    const ordered = rows.slice().reverse();
    const F = fmt();
    return {
      color: theme.color,
      textStyle: theme.textStyle,
      grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', valueFormatter: (v) => F.fmtUsd(v) },
      xAxis: {
        type: 'value',
        axisLabel: Object.assign({}, theme.valueAxis.axisLabel, { formatter: (v) => '$' + F.fmtInt(v) }),
        splitLine: theme.valueAxis.splitLine,
      },
      yAxis: {
        type: 'category',
        data: ordered.map((r) => r.project),
        axisLine: theme.categoryAxis.axisLine,
        axisTick: theme.categoryAxis.axisTick,
        axisLabel: theme.categoryAxis.axisLabel,
      },
      series: [
        {
          type: 'bar',
          data: ordered.map((r) => r.totalCost),
          itemStyle: { color: theme.line.itemStyle.color, borderRadius: [0, 6, 6, 0] },
          barWidth: '55%',
        },
      ],
    };
  }

  const api = { topNWithOther, buildProjectBarOption, OTHER };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ProjectBars = api;
})(typeof window !== 'undefined' ? window : globalThis);
