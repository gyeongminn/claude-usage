// 월별 스케줄러(OPS-030, §3): 매월 1일 00:00에 지난달 보고서 생성 트리거.
// 시각 계산은 UTC 기준(§10/OPEN[05]), Clock(now ms) 주입으로 결정적. setTimeout은 주입 가능.

// now '이후'의 가장 가까운 '다음 달 1일 00:00:00 UTC'(ms). now가 정확히 1일 자정이어도 '다음 달'로(중복 발화 방지).
function nextMonthlyRun(now) {
  const d = new Date(now);
  // 다음 달 1일 00:00 UTC. getUTCMonth()+1은 12월에 자동으로 다음 해 0월(1월)로 정규화됨.
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0, 0);
}

// now 시점 기준 지난달 {year, month(1~12)}. 보고서 대상 월.
function prevMonthYM(now) {
  const d = new Date(now);
  const first = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1); // 이번 달 1일
  const prev = new Date(first - 1); // 직전 ms = 지난달 말일
  return { year: prev.getUTCFullYear(), month: prev.getUTCMonth() + 1 };
}

// now 시점의 이번 달 {year, month(1~12)}. 트레이 "이번 달 미리 뽑기"(UX-060) 대상.
// UTC 기준 — prevMonthYM 등 보고서 YM 규약과 일관(§10/OPEN[05]). // ponytail: 월 경계 몇 시간은
// UTC≠로컬일 수 있으나 보고서 생성 전체가 UTC YM 규약을 따르므로 일관 우선.
function currentYM(now) {
  const d = new Date(now);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

// 매월 1일 발화. 발화 시 onFire(지난달 YM) 호출 후 다음 달로 재무장. handle.cancel()로 해제.
// setTimer/clearTimer 주입(기본 전역). 33일 초과 지연은 setTimeout 한도(약 24.8일) 고려해 분할.
function scheduleMonthly({ onFire, now, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let timerId = null;
  let cancelled = false;
  const MAX_DELAY = 2 ** 31 - 1; // setTimeout 최대(약 24.8일) — 초과 시 분할 무장.

  function arm() {
    if (cancelled) return;
    const target = nextMonthlyRun(now());
    const delay = Math.max(0, target - now());
    if (delay > MAX_DELAY) {
      // 아직 멀면 한도만큼만 자고 재평가(시각 드리프트에도 안전).
      timerId = setTimer(arm, MAX_DELAY);
      return;
    }
    timerId = setTimer(() => {
      if (cancelled) return;
      onFire(prevMonthYM(now())); // 발화 시점의 지난달이 대상.
      arm(); // 다음 달 재무장.
    }, delay);
  }

  arm();
  return {
    cancel() {
      cancelled = true;
      if (timerId != null) clearTimer(timerId);
    },
  };
}

module.exports = { nextMonthlyRun, prevMonthYM, scheduleMonthly, currentYM };
