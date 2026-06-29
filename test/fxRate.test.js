const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fetchKrwPerUsd, fxOptsFor, FALLBACK_KRW, API_URL } = require('../src/main/fxRate');

// fetch 주입(node fetch 시그니처 흉내). ok·json() 제공.
const okFetch = (krw) => async () => ({ ok: true, json: async () => ({ result: 'success', rates: { KRW: krw } }) });

test('DAT040_API_URL_open_er', () => {
  assert.equal(API_URL, 'https://open.er-api.com/v6/latest/USD');
});

test('DAT040_정상_rates_KRW', async () => {
  const r = await fetchKrwPerUsd({ fetchImpl: okFetch(1380.5) });
  assert.equal(r.krwPerUsd, 1380.5);
  assert.equal(r.source, 'online');
});

test('DAT040_네트워크실패_마지막값폴백', async () => {
  const r = await fetchKrwPerUsd({
    fetchImpl: async () => { throw new Error('offline'); },
    lastKnown: 1400,
  });
  assert.equal(r.krwPerUsd, 1400);
  assert.equal(r.source, 'lastKnown');
});

test('DAT040_네트워크실패_마지막값없으면_설정고정값', async () => {
  const r = await fetchKrwPerUsd({
    fetchImpl: async () => { throw new Error('offline'); },
    fixed: 1350,
  });
  assert.equal(r.krwPerUsd, 1350);
  assert.equal(r.source, 'fixed');
});

test('DAT040_lastKnown무효_fixed로폴스루', async () => {
  // lastKnown이 0/음수면 무시하고 fixed 사용(>0 가드).
  const r = await fetchKrwPerUsd({
    fetchImpl: async () => { throw new Error('x'); },
    lastKnown: 0,
    fixed: 1290,
  });
  assert.equal(r.krwPerUsd, 1290);
  assert.equal(r.source, 'fixed');
});

test('DAT040_둘다없으면_기본폴백상수', async () => {
  const r = await fetchKrwPerUsd({ fetchImpl: async () => { throw new Error('x'); } });
  assert.equal(r.krwPerUsd, FALLBACK_KRW);
  assert.equal(r.source, 'default');
});

test('DAT040_HTTP비정상_폴백', async () => {
  const r = await fetchKrwPerUsd({ fetchImpl: async () => ({ ok: false, status: 500 }), fixed: 1300 });
  assert.equal(r.krwPerUsd, 1300);
});

test('DAT040_result실패_폴백', async () => {
  const r = await fetchKrwPerUsd({
    fetchImpl: async () => ({ ok: true, json: async () => ({ result: 'error' }) }),
    fixed: 1320,
  });
  assert.equal(r.krwPerUsd, 1320);
});

test('DAT040_KRW누락_폴백', async () => {
  const r = await fetchKrwPerUsd({
    fetchImpl: async () => ({ ok: true, json: async () => ({ result: 'success', rates: {} }) }),
    fixed: 1310,
  });
  assert.equal(r.krwPerUsd, 1310);
});

// AUDIT-050: refreshFx 배선 회귀 가드 — opts에 설정 고정값(settings.krwPerUsd)이 fixed로 실려야 §7 폴백이 산다.
test('AUDIT050_fxOptsFor_설정고정값_fixed로_전달', () => {
  const o = fxOptsFor(null, { krwPerUsd: 1500 });
  assert.equal(o.fixed, 1500); // 사용자 커스텀 환율이 폴백·강제용으로 전달
  assert.equal(o.lastKnown, null); // 마지막 성공값도 함께
});

test('AUDIT050_fxOptsFor_settings_null_안전', () => {
  const o = fxOptsFor(1400, null);
  assert.equal(o.lastKnown, 1400);
  assert.ok(!Number.isFinite(o.fixed)); // settings 없으면 fixed는 사용 불가값(null) → fetchKrwPerUsd가 lastKnown/default로 폴백
});

// 통합 회귀: 오프라인 + 마지막값 없음(기동 리셋) + 사용자 커스텀 환율 → fxOptsFor 경유 시 1350이 아닌 1500.
test('AUDIT050_오프라인_커스텀환율_기동시_사용자값_적용', async () => {
  const r = await fetchKrwPerUsd({
    fetchImpl: async () => { throw new Error('offline'); },
    ...fxOptsFor(null, { krwPerUsd: 1500 }),
  });
  assert.equal(r.krwPerUsd, 1500);
  assert.equal(r.source, 'fixed');
});

// NET-010: fetch가 reject 아닌 hang(캡티브 포털: TCP 연결되나 HTTP 스톨)이어도 timeoutMs로 abort→폴백.
// signal abort에만 reject하는 hang fetch — 타임아웃 없으면 영원히 pending(test timeout=Red), 있으면 폴백 반환(Green).
test('NET010_환율fetch_hang시_타임아웃_폴백', { timeout: 3000 }, async () => {
  const hangFetch = (url, init) =>
    new Promise((_, reject) => {
      const sig = init && init.signal;
      if (sig) sig.addEventListener('abort', () => reject(new Error('aborted')));
    });
  const r = await fetchKrwPerUsd({ fetchImpl: hangFetch, timeoutMs: 50, lastKnown: 1400 });
  assert.equal(r.source, 'lastKnown');
  assert.equal(r.krwPerUsd, 1400);
});

// NET-010: 정상 응답은 타임아웃 타이머를 정리하고 online 반환(타이머 누수·핸들 잔존 없음).
test('NET010_정상응답_타임아웃_무간섭_online', async () => {
  const r = await fetchKrwPerUsd({ fetchImpl: okFetch(1377), timeoutMs: 1000 });
  assert.equal(r.source, 'online');
  assert.equal(r.krwPerUsd, 1377);
});
