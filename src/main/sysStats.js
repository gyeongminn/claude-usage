// 시스템 리소스 사용률 순수 계산(§11, SYS-010). 표준 os 스냅샷·nvidia-smi 출력만 받아 계산 — I/O 없음(테스트 결정성).
// 샘플러(SYS-020)가 os.cpus()/totalmem/freemem과 nvidia-smi spawn을 담당하고, 결과를 여기 순수 함수에 넘긴다.

// os.cpus() 한 스냅샷의 전 코어 idle·total 합. times 누락은 0 간주(안전).
function sumTimes(cpus) {
  let idle = 0;
  let total = 0;
  for (const c of cpus) {
    const t = (c && c.times) || {};
    const user = Number(t.user) || 0;
    const nice = Number(t.nice) || 0;
    const sys = Number(t.sys) || 0;
    const id = Number(t.idle) || 0;
    const irq = Number(t.irq) || 0;
    idle += id;
    total += user + nice + sys + id + irq;
  }
  return { idle, total };
}

// CPU 사용률(%) = 두 os.cpus() 스냅샷 간 (1 − idleΔ/totalΔ)×100, 0~100 정수.
// 동일 스냅샷·카운터 리셋(totalΔ≤0)·빈/널 입력 → 0(0나눗셈·음수 방지).
function cpuPercent(prevCpus, curCpus) {
  if (!Array.isArray(prevCpus) || !Array.isArray(curCpus) || !prevCpus.length || !curCpus.length) return 0;
  const a = sumTimes(prevCpus);
  const b = sumTimes(curCpus);
  const idleD = b.idle - a.idle;
  const totalD = b.total - a.total;
  if (totalD <= 0) return 0;
  const pct = (1 - idleD / totalD) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

// RAM 사용률 — os.totalmem()/os.freemem() bytes. used=total−free(음수 clamp), pct 0~100 정수, total≤0 안전.
function memUsage(total, free) {
  const t = Number(total) || 0;
  const f = Number(free) || 0;
  if (t <= 0) return { pct: 0, usedBytes: 0, totalBytes: 0 };
  const used = Math.max(0, t - f);
  const pct = Math.max(0, Math.min(100, Math.round((used / t) * 100)));
  return { pct, usedBytes: used, totalBytes: t };
}

// nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits 출력 → 첫 GPU 사용률 정수%|null.
// 빈 출력·비숫자(N/A 등)·비문자열 → null(부재/오류 graceful). 여러 GPU면 첫 줄.
function parseNvidiaSmi(stdout) {
  if (typeof stdout !== 'string') return null;
  const first = stdout.split('\n').map((s) => s.trim()).find((s) => s.length > 0);
  if (!first) return null;
  const n = parseInt(first, 10);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

module.exports = { cpuPercent, memUsage, parseNvidiaSmi };
