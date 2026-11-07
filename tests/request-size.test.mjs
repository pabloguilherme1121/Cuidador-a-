import test from 'node:test';
import assert from 'node:assert/strict';
import { roomApi } from '../cloudflare/worker.mjs';

test('large streaming body without Content-Length is cancelled before reading it all', async () => {
  let cancelled = false;
  let chunks = 0;
  const body = new ReadableStream({
    pull(controller) {
      chunks++;
      if (chunks <= 8) controller.enqueue(new TextEncoder().encode('x'.repeat(80000)));
      else controller.close();
    },
    cancel() { cancelled = true; },
  });
  const request = new Request('https://example.test/api/rooms', { method: 'POST', body, duplex: 'half' });
  const result = await roomApi(request, { CARE_ROOMS: {} });
  assert.equal(result.status, 400);
  assert.equal(cancelled, true);
  assert.ok(chunks < 8);
});

test('valid JSON remains readable when a UTF-8 character is split between chunks', async () => {
  const payload = JSON.stringify({
    id: 'a'.repeat(22), authHash: 'a'.repeat(43), readHash: 'b'.repeat(43),
    iv: 'a'.repeat(16), ciphertext: 'a'.repeat(22), note: 'ação',
  });
  const bytes = new TextEncoder().encode(payload);
  const split = bytes.indexOf(0xc3) + 1;
  const body = new ReadableStream({ start(controller) {
    controller.enqueue(bytes.slice(0, split));
    controller.enqueue(bytes.slice(split));
    controller.close();
  } });
  let writes = 0;
  const db = { prepare() { return { bind() { return this; }, async run() { writes++; } }; } };
  const request = new Request('https://example.test/api/rooms', { method: 'POST', body, duplex: 'half' });
  const result = await roomApi(request, { CARE_ROOMS: db });
  assert.equal(result.status, 201);
  assert.equal(writes, 1);
});

test('declared oversized bodies are rejected before touching storage', async () => {
  const request = new Request('https://example.test/api/rooms', {
    method: 'POST', headers: { 'Content-Length': '145001' }, body: '{}',
  });
  const result = await roomApi(request, { CARE_ROOMS: { prepare() { throw new Error('unexpected database write'); } } });
  assert.equal(result.status, 400);
});

test('stream limit is enforced at exactly 145000 bytes even with a false Content-Length', async () => {
  const payload = JSON.stringify({
    id: 'a'.repeat(22), authHash: 'a'.repeat(43), readHash: 'b'.repeat(43),
    iv: 'a'.repeat(16), ciphertext: 'a'.repeat(22),
  });
  for (const [size, expected] of [[145000, 201], [145001, 400]]) {
    const body = payload.padEnd(size, ' ');
    const db = { prepare() { return { bind() { return this; }, async run() {} }; } };
    const req = new Request('https://example.test/api/rooms', {
      method: 'POST', headers: {'Content-Length': '1'}, body,
    });
    assert.equal((await roomApi(req, {CARE_ROOMS: db})).status, expected);
  }
});

test('rejects an oversized body even if cancelling the stream never completes', async () => {
  const body = new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(145001)); },
    cancel() { return new Promise(() => {}); },
  });
  const request = new Request('https://example.test/api/rooms', {method: 'POST', body, duplex: 'half'});
  const response = await Promise.race([
    roomApi(request, {CARE_ROOMS: {}}),
    new Promise((_, reject) => setTimeout(() => reject(new Error('cancel blocked the response')), 1000)),
  ]);
  assert.equal(response.status, 400);
});
