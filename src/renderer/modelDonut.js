// 모델별 비용 도넛(§4.1) + 모델명 가독화.
// UMD: node 테스트(module.exports)·렌더러(window.ModelDonut).
(function (root) {
  // 'claude-opus-4-8' → 'Opus 4.8'. 매칭 안 되면 원본.
  function shortModelName(name) {
    const m = /^claude-(opus|haiku|sonnet)-(\d+)-(\d+)/.exec(name || '');
    if (!m) return name;
    const tier = m[1][0].toUpperCase() + m[1].slice(1);
    return `${tier} ${m[2]}.${m[3]}`;
  }

  // Fmt 재사용(UX-031): 툴팁 비용 $ 단위. node=require, 렌더러=window.Fmt(호출시 resolve).
  function fmt() {
    return typeof module !== 'undefined' && module.exports ? require('./format') : root.Fmt;
  }

  // breakdowns: [{modelName, cost}]. 비용 기준 도넛.
  function buildDonutOption(breakdowns, theme) {
    const F = fmt();
    return {
      color: theme.color,
      textStyle: theme.textStyle,
      // 호버 시 '모델명: $비용 (퍼센트%)'. 도넛은 라벨 숨김이라 툴팁이 유일한 수치 노출.
      tooltip: { trigger: 'item', valueFormatter: (v) => F.fmtUsd(v) },
      series: [
        {
          type: 'pie',
          radius: ['55%', '78%'], // 도넛(내경>0)
          avoidLabelOverlap: true,
          label: { show: false },
          // cost 누락 시 0(차트 데이터 무결성). ccusage 비용은 비음수.
          data: breakdowns.map((b) => ({ name: shortModelName(b.modelName), value: Number(b.cost) || 0 })),
        },
      ],
    };
  }

  const api = { buildDonutOption, shortModelName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ModelDonut = api;
})(typeof window !== 'undefined' ? window : globalThis);
