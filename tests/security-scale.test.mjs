import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{creationGuard, requestCategory, responseWithOperations, healthPayload} from '../cloudflare/worker.mjs';

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


test('Worker serves PG Bot image required by the offline cache with the correct MIME type',async()=>{
 const originalFetch=globalThis.fetch;
 let upstreamCalls=0;
 const imageBytes=new Uint8Array([82,73,70,70,1,2,3,4]);
 globalThis.fetch=async()=>{upstreamCalls++;return new Response(imageBytes,{status:200})};
 try{
  const resource=origin+'/assets/pg-bot.webp';
  const get=await worker.fetch(new Request(resource),{});
  assert.equal(get.status,200,'PG Bot asset must be permitted on the Worker origin');
  assert.equal(get.headers.get('content-type'),'image/webp');
  assert.deepEqual(new Uint8Array(await get.arrayBuffer()),imageBytes);
  const head=await worker.fetch(new Request(resource,{method:'HEAD'}),{});
  assert.equal(head.status,200);
  assert.equal(head.headers.get('content-type'),'image/webp');
  assert.equal(await head.text(),'');
  assert.equal(upstreamCalls,2);
 }finally{globalThis.fetch=originalFetch}
});

test('Worker remains allowlisted: arbitrary files cannot be downloaded',async()=>{
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async()=>{throw new Error('fetch should not be reached')};
 try{
  const response=await worker.fetch(new Request(origin+'/assets/private-data.json'),{});
  assert.equal(response.status,404);
 }finally{globalThis.fetch=originalFetch}
});


test('unencrypted GET and HEAD are redirected without returning app content or touching D1',async()=>{
 const originalFetch=globalThis.fetch;
 let fetched=0;
 globalThis.fetch=async()=>{fetched++;return new Response('should never reach upstream',{status:200})};
 try{
  for(const method of ['GET','HEAD']){
   for(const route of ['/', '/assets/pg-bot.webp', '/api/health']){
    const original='http://cuidadora-pwa.pabloguui21.workers.dev'+route+'?lang=pt';
    const res=await worker.fetch(new Request(original,{method}),{});
    assert.equal(res.status,308,method+' '+route+' must enforce HTTPS');
    assert.equal(res.headers.get('location'),original.replace('http:','https:'));
    assert.equal(res.headers.get('cache-control'),'no-store');
    assert.equal(await res.text(),'');
   }
  }
  assert.equal(fetched,0,'HTTP must not request assets from upstream');
 }finally{globalThis.fetch=originalFetch}
});

test('unencrypted writes are rejected without parsing or persisting private data',async()=>{
 let calls=0;
 const env={CARE_ROOMS:{prepare(){calls++;throw Error('D1 must not be used')}},ABUSE_SALT:'test-unguessable-hmac-salt-long-enough'};
 const body=JSON.stringify({private:'should not reach DB'});
 for(const method of ['POST','PUT','DELETE']){
  const res=await worker.fetch(new Request('http://cuidadora-pwa.pabloguui21.workers.dev/api/rooms',{method,headers:{'Content-Type':'application/json','CF-Connecting-IP':'203.0.113.50'},body:method==='DELETE'?undefined:body}),env);
  assert.equal(res.status,403,method+' must never run over HTTP');
  assert.equal(res.headers.get('cache-control'),'no-store');
 }
 assert.equal(calls,0);
});

test('already encrypted health GET keeps its normal endpoint behavior',async()=>{
 const res=await worker.fetch(new Request(origin+'/api/health'),{});
 assert.equal(res.status,200);
 assert.equal((await res.json()).service,'cuidadora');
});


test('public privacy notice GET and HEAD are served without D1 or private-room access',async()=>{
 const originalFetch=globalThis.fetch;
 let calls=0;
 globalThis.fetch=async url=>{calls++;assert.match(String(url),/\/privacidade\.html$/);return new Response('<html lang="pt-BR"><title>Privacidade</title></html>',{status:200})};
 try{
  for(const method of ['GET','HEAD']){
   const res=await worker.fetch(new Request(origin+'/privacidade.html',{method}),{});
   assert.equal(res.status,200);
   assert.match(res.headers.get('content-type'),/text\/html/);
   if(method==='HEAD')assert.equal(await res.text(),'');
  }
  assert.equal(calls,2);
 }finally{globalThis.fetch=originalFetch}
});
