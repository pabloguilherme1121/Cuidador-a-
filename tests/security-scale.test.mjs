import test from 'node:test';
import assert from 'node:assert/strict';
import {creationGuard, requestCategory, responseWithOperations, healthPayload} from '../cloudflare/worker.mjs';

const origin='https://cuidadora-pwa.pabloguui21.workers.dev';
function fakeDB(){
  const quotas=new Map();let calls=0;
  return {quotas,get calls(){return calls}, prepare(sql){
    assert.match(sql,/INSERT INTO creation_quotas/);
    let args=[];
    return {bind(...v){args=v;return this},async first(){
      calls++;
      const [bucket,expiry,max]=args;
      const old=quotas.get(bucket)?.used||0;
      if(old>=max)return null;
      quotas.set(bucket,{used:old+1,expiry});return {used:old+1};
    }};
  }};
}
function req(ip='203.0.113.15'){return new Request(origin+'/api/rooms',{method:'POST',headers:{'CF-Connecting-IP':ip,'Origin':origin}})}

test('room creation blocks bursts and does not store plaintext network address', async()=>{
  const db=fakeDB(),env={CARE_ROOMS:db,ABUSE_SALT:'a-test-only-unguessable-key-for-hmac'};
  for(let i=0;i<8;i++)assert.equal((await creationGuard(req(),env,1761000000000)).allowed,true);
  const denied=await creationGuard(req(),env,1761000000000);
  assert.equal(denied.allowed,false);assert.equal(denied.status,429);
  assert.equal(denied.retryAfter,900);
  assert.equal(db.quotas.size,2);
  for(const bucket of db.quotas.keys())assert.doesNotMatch(bucket,/203\.0\.113|CF-Connecting-IP/);
  assert.equal((await creationGuard(req('203.0.113.16'),env,1761000000000)).allowed,true);
});

test('guard fails closed if secret, IP or database is unavailable',async()=>{
  for(const env of [{CARE_ROOMS:fakeDB()},{ABUSE_SALT:'x'},{CARE_ROOMS:fakeDB(),ABUSE_SALT:'x'}]){
    const input=env.ABUSE_SALT&&env.CARE_ROOMS?new Request(origin+'/api/rooms',{method:'POST'}):req();
    const a=await creationGuard(input,env,1761000000000);
    assert.equal(a.allowed,false);assert.equal(a.status,503);
  }
});

test('operational logs use route templates, never room IDs or sensitive headers',()=>{
  assert.equal(requestCategory('/api/rooms/abcd0123456789abcdefghijkl/messages'),'room-messages');
  assert.equal(requestCategory('/api/rooms/abcd0123456789abcdefghijkl'),'room');
  assert.equal(requestCategory('/assets/icon.svg'),'asset');
  assert.equal(requestCategory('/api/health'),'health');
  const o=responseWithOperations(new Response('{}',{status:429}),{requestId:'request-1',retryAfter:900});
  assert.equal(o.status,429);assert.equal(o.headers.get('Retry-After'),'900');
  assert.equal(o.headers.get('X-Request-ID'),'request-1');
});

test('health endpoint never exposes tenant information',()=>{
  const p=healthPayload();
  assert.equal(p.status,'ok');
  assert.ok(Object.keys(p).every(k=>['status','service','revision'].includes(k)));
});
