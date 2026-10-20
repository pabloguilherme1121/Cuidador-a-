import {createChatMessage,openChatMessage} from '../chat.mjs';
/** End-to-end test with synthetic data only; run after Workers + D1 is active. */
import assert from 'node:assert/strict';
import {createCredentials,encryptRoom,decryptRoom} from '../room.mjs';
const site=(process.env.SITE_URL||'').replace(/\/$/,'');
assert.ok(/^https:\/\/[\w.-]+$/.test(site),'SITE_URL must be a HTTPS origin');
const room=await createCredentials();
const url=`${site}/api/rooms/${room.id}`;
async function json(url,method='GET',body,token,readToken){
 const headers={'Content-Type':'application/json'};if(token)headers['X-Room-Token']=token;if(readToken)headers['X-Room-Read-Token']=readToken;
 const r=await fetch(url,{method,headers,body:body&&JSON.stringify(body)});
 let obj;try{obj=await r.json()}catch{obj={}};
 return {status:r.status,body:obj};
}
const synthetic={version:1,items:[{id:'roomsmoke',type:'meal',title:'Refeição fictícia de QA',dose:'',note:'Teste',days:[0,1,2,3,4,5,6],times:['12:00'],archived:false,createdAt:new Date().toISOString()}],settings:{theme:'dark'}};
let created=false;
try{
 const encrypted=await encryptRoom(room,synthetic);
 const first=await json(`${site}/api/rooms`,'POST',{...encrypted,id:room.id,authHash:room.authHash,readHash:room.readHash});
 assert.equal(first.status,201,`Create status ${first.status}`);created=true;
 const denied=await json(url);assert.equal(denied.status,403,'New rooms require a viewing token');
 const got=await json(url,'GET',null,null,room.readToken);assert.equal(got.status,200);assert.equal(got.body.legacy,false);
 assert.deepEqual(await decryptRoom(room,got.body),synthetic);
 // Conditional GET must authenticate first, then return empty 304 when unchanged.
 const cached=await fetch(url,{headers:{'X-Room-Read-Token':room.readToken,'If-None-Match':'"v1"'}});
 assert.equal(cached.status,304);assert.equal(await cached.text(),'');
 const deniedCached=await fetch(url,{headers:{'If-None-Match':'"v1"'}});
 assert.equal(deniedCached.status,403);
 const unauthorized=await json(url,'PUT',{...encrypted,version:1},'not-valid');assert.equal(unauthorized.status,403);
 const readonlyEdit=await json(url,'PUT',{...encrypted,version:1},room.readToken);assert.equal(readonlyEdit.status,403);
 const readonlyDelete=await json(url,'DELETE',null,room.readToken);assert.equal(readonlyDelete.status,403);
 // Encrypted chat: viewer can read, only an editor can send, and plaintext is never returned.
 const chatUrl=url+'/messages',msg=await createChatMessage(room,{author:'QA',text:'Mensagem fictícia de integração'});
 const noRead=await json(chatUrl);assert.equal(noRead.status,403);
 const noWrite=await json(chatUrl,'POST',msg,room.readToken);assert.equal(noWrite.status,403);
 const sent=await json(chatUrl,'POST',msg,room.token);assert.equal(sent.status,201);
 const duplicate=await json(chatUrl,'POST',msg,room.token);assert.equal(duplicate.status,200);
 const chatRead=await json(chatUrl,'GET',null,null,room.readToken);assert.equal(chatRead.status,200);
 assert.ok(!JSON.stringify(chatRead.body).includes('fictícia'));
 assert.equal((await openChatMessage(room,chatRead.body.messages[0])).text,'Mensagem fictícia de integração');
 const chatAfter=await json(chatUrl+'?after='+encodeURIComponent(chatRead.body.cursor),'GET',null,null,room.readToken);
 assert.equal(chatAfter.status,200);assert.deepEqual(chatAfter.body.messages,[]);
 const noClear=await json(chatUrl,'DELETE',null,room.readToken);assert.equal(noClear.status,403);
 const cleared=await json(chatUrl,'DELETE',null,room.token);assert.equal(cleared.status,200);
 assert.deepEqual((await json(chatUrl,'GET',null,null,room.readToken)).body.messages,[]);
 const edited=await json(url,'PUT',{...encrypted,version:got.body.version},room.token);assert.equal(edited.status,200);assert.equal(edited.body.version,2);
 const conflict=await json(url,'PUT',{...encrypted,version:1},room.token);assert.equal(conflict.status,409);
 console.log('Sala cifrada e chat Worker + D1: criação, leitura, edição, mensagens cifradas, limpeza, conflito: OK');
}finally{
 if(created){const gone=await json(url,'DELETE',null,room.token);assert.equal(gone.status,200);const missing=await json(url,'GET',null,null,room.readToken);assert.equal(missing.status,404)}
}
