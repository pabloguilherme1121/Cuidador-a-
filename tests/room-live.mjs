import assert from 'node:assert/strict';
import {createCredentials,encryptRoom,decryptRoom} from '../room.mjs';
const site=(process.env.SITE_URL||'').replace(/\/$/,'');
assert.match(site,/^https:\/\/[\w.-]+$/);
const room=await createCredentials(),url=`${site}/api/rooms/${room.id}`;
async function request(path,method='GET',body,token){
 const h={'Content-Type':'application/json'};if(token)h['X-Room-Token']=token;
 const r=await fetch(path,{method,headers:h,body:body?JSON.stringify(body):undefined});
 return {status:r.status,payload:await r.json().catch(()=>({}))};
}
const sample={version:1,items:[{id:'salaqa123',type:'meal',title:'Refeição fictícia QA',times:['12:00'],days:[0,1,2,3,4,5,6],dose:'',note:'',archived:false,createdAt:new Date().toISOString()}],settings:{theme:'dark'}};
let exists=false;
try{
 const encrypted=await encryptRoom(room,sample);
 const created=await request(site+'/api/rooms','POST',{...encrypted,id:room.id,authHash:room.authHash});assert.equal(created.status,201);
 exists=true;
 const read=await request(url);assert.equal(read.status,200);
 assert.deepEqual(await decryptRoom(room,read.payload),sample);
 const noauth=await request(url,'PUT',{...encrypted,version:1},'invalid');assert.equal(noauth.status,403);
 const updated=await request(url,'PUT',{...encrypted,version:1},room.token);assert.equal(updated.status,200);assert.equal(updated.payload.version,2);
 const conflict=await request(url,'PUT',{...encrypted,version:1},room.token);assert.equal(conflict.status,409);
 console.log('Sala: criar, ler, cifrar, editar, conflito e negar intruso — OK');
}finally{
 if(exists){
  const removed=await request(url,'DELETE',null,room.token);assert.equal(removed.status,200);
  const missing=await request(url);assert.equal(missing.status,404);
 }
}
