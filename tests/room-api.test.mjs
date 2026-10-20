import test from 'node:test';import assert from 'node:assert/strict';
import {roomApi,isValidEnvelope} from '../cloudflare/worker.mjs';
import {createCredentials,encryptRoom} from '../room.mjs';

function database(){
 const rows=new Map();
 return {prepare(sql){
   let args;
   return {
    bind(...p){args=p;return this;},
    async first(){return rows.get(args[0])||null;},
    async run(){
     if(sql.startsWith('INSERT')){
      if(rows.has(args[0]))throw Error('duplicate');
      rows.set(args[0],{id:args[0],auth_hash:args[1],read_hash:args[2],iv:args[3],ciphertext:args[4],version:1,updated_at:args[5]});
      return {meta:{changes:1}};
     }
     if(sql.startsWith('UPDATE')){
      const r=rows.get(args[3]);
      if(!r||r.version!==args[4])return {meta:{changes:0}};
      Object.assign(r,{iv:args[0],ciphertext:args[1],version:r.version+1});
      return {meta:{changes:1}};
     }
     if(sql.startsWith('DELETE'))return {meta:{changes:rows.delete(args[0])?1:0}};
    }
   };
 }};
}
const base='https://example.com';
async function request(path,method='GET',json=null,token,readToken){const headers={'Content-Type':'application/json','Origin':base};if(token)headers['X-Room-Token']=token;if(readToken)headers['X-Room-Read-Token']=readToken;return new Request(base+path,{method,headers,body:json?JSON.stringify(json):undefined})}
test('room API refuses plaintext and unauthorized edits; optimistic sync handles conflicts',async()=>{
 const env={CARE_ROOMS:database()},a=await createCredentials(),enc=await encryptRoom(a,{version:1,items:[],settings:{theme:'dark'}});
 assert.equal(isValidEnvelope({...enc,title:'secret'}),true);
 let r=await roomApi(await request('/api/rooms','POST',{...enc,id:a.id,authHash:a.authHash,readHash:a.readHash}),env);assert.equal(r.status,201);
 r=await roomApi(await request('/api/rooms/'+a.id),env);assert.equal(r.status,403);
 r=await roomApi(await request('/api/rooms/'+a.id,'GET',null,null,'invalid-token'),env);assert.equal(r.status,403);
 r=await roomApi(await request('/api/rooms/'+a.id,'GET',null,null,a.readToken),env);assert.equal(r.status,200);const payload=await r.json();assert.equal(payload.version,1);assert.equal(payload.legacy,false);
 r=await roomApi(await request('/api/rooms/'+a.id,'PUT',{...enc,version:1},'bad'),env);assert.equal(r.status,403);
 r=await roomApi(await request('/api/rooms/'+a.id,'PUT',{...enc,version:1},a.readToken),env);assert.equal(r.status,403);
 r=await roomApi(await request('/api/rooms/'+a.id,'DELETE',null,a.readToken),env);assert.equal(r.status,403);
 r=await roomApi(await request('/api/rooms/'+a.id,'PUT',{...enc,version:1},a.token),env);assert.equal(r.status,200);
 r=await roomApi(await request('/api/rooms/'+a.id,'PUT',{...enc,version:1},a.token),env);assert.equal(r.status,409);
 r=await roomApi(await request('/api/rooms/'+a.id,'DELETE',null,a.token),env);assert.equal(r.status,200);
 r=await roomApi(await request('/api/rooms/'+a.id),env);assert.equal(r.status,404);
});

test('conditional room reads save bytes without leaking access or hiding a new version',async()=>{
 const env={CARE_ROOMS:database()},a=await createCredentials(),enc=await encryptRoom(a,{version:1,items:[],settings:{theme:'dark'}});
 assert.equal((await roomApi(await request('/api/rooms','POST',{...enc,id:a.id,authHash:a.authHash,readHash:a.readHash}),env)).status,201);
 const h={'X-Room-Read-Token':a.readToken,'If-None-Match':'"v1"','Origin':base};
 let r=await roomApi(new Request(base+'/api/rooms/'+a.id,{headers:h}),env);
 assert.equal(r.status,304);assert.equal(await r.text(),'');
 r=await roomApi(new Request(base+'/api/rooms/'+a.id,{headers:{'If-None-Match':'"v1"','Origin':base}}),env);
 assert.equal(r.status,403);
 r=await roomApi(await request('/api/rooms/'+a.id,'PUT',{...enc,version:1},a.token),env);assert.equal(r.status,200);
 r=await roomApi(new Request(base+'/api/rooms/'+a.id,{headers:h}),env);
 assert.equal(r.status,200);assert.equal(r.headers.get('ETag'),'"v2"');
 assert.equal((await r.json()).version,2);
});
