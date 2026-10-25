import test from 'node:test';
import assert from 'node:assert/strict';
import { assessWorkerRelease } from '../scripts/worker-release-contract.mjs';

const deployedSha = '1a7e1353ab7f9a351b961d46deb391ae56910b48';
const expectedSha = 'dfc63b10520fd669ae9d16c003e9c84514e21485';
const response = (revision=expectedSha) => ({
  expectedSha,
  httpStatus: 200,
  contentType: 'application/json; charset=utf-8',
  body: { status: 'ok', service: 'cuidadora', revision },
});

test('accepts only the exact full deployed SHA from the Cuidador(a) health response', () => {
  assert.deepEqual(assessWorkerRelease(response()), { ok: true, revision: expectedSha });
  assert.throws(() => assessWorkerRelease(response(deployedSha)), /revision mismatch/i);
  assert.throws(() => assessWorkerRelease(response(expectedSha.slice(0, 12))), /revision mismatch/i);
  assert.throws(() => assessWorkerRelease(response('__PINNED_SHA__')), /revision mismatch/i);
});

test('rejects HTTP errors, wrong content type and malformed or unrelated services', () => {
  assert.throws(() => assessWorkerRelease({ ...response(), httpStatus: 503 }), /HTTP 503/i);
  assert.throws(() => assessWorkerRelease({ ...response(), contentType: 'text/html' }), /content-type/i);
  assert.throws(() => assessWorkerRelease({ ...response(), body: null }), /health payload/i);
  assert.throws(() => assessWorkerRelease({ ...response(), body: { status: 'ok', service: 'other', revision: expectedSha } }), /health payload/i);
  assert.throws(() => assessWorkerRelease({ ...response(), body: { status: 'error', service: 'cuidadora', revision: expectedSha } }), /health payload/i);
});

test('rejects partial, invalid or missing requested revisions', () => {
  for (const bad of ['', 'abc', '__PINNED_SHA__', 'A'.repeat(40), 'f'.repeat(39), 'g'.repeat(40)]) {
    assert.throws(() => assessWorkerRelease({ ...response(), expectedSha: bad }), /expected SHA/i);
  }
});
