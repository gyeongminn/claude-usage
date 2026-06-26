const { test } = require('node:test');
const assert = require('node:assert/strict');
const { runCcusage, COMMANDS } = require('../src/main/ccusage');

// 주입 가능한 runner 로 실제 spawn 없이 검증.
const fakeRunner = (out) => async () => out;

test('FND040_지원하지않는명령_거부', async () => {
  await assert.rejects(() => runCcusage('bogus', [], fakeRunner('{}')), /지원하지 않는/);
});

test('FND040_허용명령_전부통과', async () => {
  for (const cmd of ['daily', 'monthly', 'session', 'blocks']) {
    assert.ok(COMMANDS.has(cmd), `${cmd} 는 허용 명령이어야 함`);
    const r = await runCcusage(cmd, [], fakeRunner('{"ok":1}'));
    assert.deepEqual(r, { ok: 1 });
  }
});

test('FND040_JSON파싱_정상', async () => {
  const r = await runCcusage('daily', [], fakeRunner('{"daily":[{"cost":1.5}]}'));
  assert.deepEqual(r, { daily: [{ cost: 1.5 }] });
});

test('FND040_JSON파싱실패_에러', async () => {
  await assert.rejects(() => runCcusage('daily', [], fakeRunner('not json')), /파싱 실패/);
});

test('FND040_runner실패_전파', async () => {
  const failing = async () => {
    throw new Error('ccusage 실행 실패: spawn ENOENT');
  };
  await assert.rejects(() => runCcusage('daily', [], failing), /실행 실패/);
});

test('FND040_extraArgs_runner에전달', async () => {
  let received;
  const spy = async (args) => {
    received = args;
    return '{}';
  };
  await runCcusage('blocks', ['--active', '--token-limit'], spy);
  assert.deepEqual(received, ['blocks', '--json', '--active', '--token-limit']);
});
