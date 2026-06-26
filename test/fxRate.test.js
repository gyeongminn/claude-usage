const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fetchKrwPerUsd, FALLBACK_KRW, API_URL } = require('../src/main/fxRate');

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
