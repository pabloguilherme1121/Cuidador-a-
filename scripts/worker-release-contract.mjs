/** Pure, auditable check of the public Worker /api/health release contract. */
export function assessWorkerRelease({ expectedSha, httpStatus, contentType, body }) {
  if (typeof expectedSha !== 'string' || !/^[0-9a-f]{40}$/.test(expectedSha))
    throw new Error('Invalid expected SHA: supply exactly 40 lowercase hexadecimal characters');
  if (httpStatus !== 200) throw new Error(`Worker health HTTP ${httpStatus}`);
  if (typeof contentType !== 'string' || !/^application\/json\s*(;|$)/i.test(contentType))
    throw new Error('Worker health content-type must be application/json');
  if (!body || typeof body !== 'object' || Array.isArray(body) || body.status !== 'ok' || body.service !== 'cuidadora')
    throw new Error('Unexpected Worker health payload');
  if (body.revision !== expectedSha) throw new Error('Worker revision mismatch');
  return { ok: true, revision: expectedSha };
}
