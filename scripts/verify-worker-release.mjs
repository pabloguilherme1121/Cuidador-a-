#!/usr/bin/env node
/** Read-only, opt-in verification. Does not create rooms, change D1, or log patient data. */
import { assessWorkerRelease } from './worker-release-contract.mjs';

const HEALTH_URL = 'https://cuidadora-pwa.pabloguui21.workers.dev/api/health';
const expectedSha = process.argv[2];

try {
  // Reject invalid input before issuing an external request.
  if (typeof expectedSha !== 'string' || !/^[0-9a-f]{40}$/.test(expectedSha))
    throw new Error('Invalid expected SHA: supply exactly 40 lowercase hexadecimal characters');
  const response = await fetch(HEALTH_URL, {
    headers: { Accept: 'application/json', 'Cache-Control': 'no-store' },
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  });
  const bodyText = await response.text();
  if (bodyText.length > 4096) throw new Error('Unexpected Worker health payload size');
  let body;
  try { body = JSON.parse(bodyText); } catch { throw new Error('Worker health payload is not JSON'); }
  const result = assessWorkerRelease({
    expectedSha, httpStatus: response.status,
    contentType: response.headers.get('content-type'), body,
  });
  console.log('Worker release confirmed on public HTTPS:', result.revision);
} catch (error) {
  console.error('Worker release NOT confirmed:', error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
}
