import test from 'node:test';
import assert from 'node:assert/strict';
import {createCredentials} from '../room.mjs';
import {createChatMessage,openChatMessage,validChatText,chatMarkup,limitChatAlias,chatControlsState} from '../chat.mjs';
import {roomApi} from '../cloudflare/worker.mjs';

const base='https://cuidadora.example';
const makeReq=(path,method='GET',body,token,readToken)=>new Request(base+path,{method,headers:{'Content-Type':'application/json','Origin':base,...(token?{'X-Room-Token':token}:{}),...(readToken?{'X-Room-Read-Token':readToken}:{})},...(body?{body:JSON.stringify(body)}:{})});
function makeDB(){
 const rooms=new Map(),messages=[];
 return {prepare(sql){
   let args=[];
   return {
    bind(...a){args=a;return this},
    async first(){
      if(sql.startsWith('SELECT id,auth_hash'))return rooms.get(args[0])||null;
      if(sql.startsWith('SELECT COUNT'))return {count:messages.filter(x=>x.room_id===args[0]&&x.created_at>args[1]).length};
      throw Error('unexpected first '+sql);
    },
    async all(){
      if(!sql.includes('FROM room_messages'))throw Error('unexpected all '+sql);
      const list=messages.filter(x=>x.room_id===args[0]);
      if(sql.includes('created_at>?'))return {results:list.filter(x=>x.created_at>args[1]||(x.created_at===args[1]&&x.id>args[3])).sort((a,b)=>a.created_at-b.created_at||a.id.localeCompare(b.id)).slice(0,60)};
      return {results:list.slice().reverse().slice(0,60)};
    },
    async run(){
      if(sql.startsWith('INSERT INTO rooms')){
        rooms.set(args[0],{id:args[0],auth_hash:args[1],read_hash:args[2],iv:args[3],ciphertext:args[4],version:1,updated_at:args[5]});return {meta:{changes:1}};
      }
      if(sql.startsWith('INSERT OR IGNORE INTO room_messages')){
        if(messages.some(x=>x.room_id===args[0]&&x.id===args[1]))return {meta:{changes:0}};
        messages.push({room_id:args[0],id:args[1],iv:args[2],ciphertext:args[3],created_at:args[4]});return {meta:{changes:1}};
      }
      if(sql.startsWith('DELETE FROM room_messages')&&sql.includes('NOT IN'))return {meta:{changes:0}};
      if(sql.startsWith('DELETE FROM room_messages')){const copy=messages.filter(x=>x.room_id!==args[0]);messages.splice(0,messages.length,...copy);return {meta:{changes:1}};}
      if(sql.startsWith('DELETE FROM rooms')){rooms.delete(args[0]);return {meta:{changes:1}};}
      throw Error('unexpected run '+sql);
    }
   };
 }};
}
test('chat encrypts user text and author, authenticated with room and message id',async()=>{
 const a=await createCredentials(),message=await createChatMessage(a,{text:'Medicação reservada',author:'Ana'});
 assert.match(message.id,/^[\w-]{16}$/);assert.ok(!JSON.stringify(message).includes('reservada'));
 const opened=await openChatMessage(a,{...message,createdAt:Date.now()});assert.equal(opened.text,'Medicação reservada');assert.equal(opened.author,'Ana');
 await assert.rejects(openChatMessage({...a,id:'AAAAAAAAAAAAAAAAAAAAAA'},{...message,createdAt:Date.now()}));
 assert.equal(validChatText('   '),false);assert.equal(validChatText('a'.repeat(501)),false);assert.equal(validChatText('Olá'),true);
});
test('room chat requires read token to read, editor token to send, validates payload and does not return plaintext',async()=>{
 const a=await createCredentials(),db=makeDB(),env={CARE_ROOMS:db},message=await createChatMessage(a,{text:'Conversa confidencial',author:'Cuidado'});
 const enc=await import('../room.mjs').then(({encryptRoom})=>encryptRoom(a,{version:1,items:[],settings:{theme:'dark'}}));
 assert.equal((await roomApi(makeReq('/api/rooms','POST',{...enc,id:a.id,authHash:a.authHash,readHash:a.readHash}),env)).status,201);
 const route='/api/rooms/'+a.id+'/messages';
 assert.equal((await roomApi(makeReq(route),env)).status,403);
 assert.equal((await roomApi(makeReq(route,'POST',message,a.readToken),env)).status,403);
 assert.equal((await roomApi(makeReq(route,'POST',{...message,ciphertext:'plaintext'},a.token),env)).status,400);
 assert.equal((await roomApi(makeReq(route,'POST',message,a.token),env)).status,201);
 assert.equal((await roomApi(makeReq(route,'POST',message,a.token),env)).status,200);
 const got=await roomApi(makeReq(route,'GET',undefined,undefined,a.readToken),env);assert.equal(got.status,200);
 const received=await got.json();assert.equal(received.messages.length,1);assert.equal(received.messages[0].ciphertext,message.ciphertext);assert.ok(!JSON.stringify(received).includes('confidencial'));
 const text=await openChatMessage(a,received.messages[0]);assert.equal(text.text,'Conversa confidencial');
 const later=await roomApi(makeReq(route+'?after='+encodeURIComponent(received.cursor),'GET',undefined,undefined,a.readToken),env);assert.equal((await later.json()).messages.length,0);
 assert.equal((await roomApi(makeReq(route,'DELETE',undefined,a.readToken),env)).status,403);
 assert.equal((await roomApi(makeReq(route,'DELETE',undefined,a.token),env)).status,200);
 assert.equal((await (await roomApi(makeReq(route,'GET',undefined,undefined,a.readToken),env)).json()).messages.length,0);
 assert.equal((await roomApi(makeReq('/api/rooms/'+a.id,'DELETE',undefined,a.token),env)).status,200);
 assert.equal((await roomApi(makeReq(route,'GET',undefined,undefined,a.readToken),env)).status,404);
});

test('chat author names preserve whole emoji at the 28-character boundary',async()=>{
 const room=await createCredentials();
 const exact='A'.repeat(27)+'💊';
 const encrypted=await createChatMessage(room,{text:'Aviso de teste',author:exact});
 const opened=await openChatMessage(room,encrypted);
 assert.equal(opened.author,exact);
 assert.equal(Array.from(opened.author).length,28);
 assert.doesNotMatch(opened.author,/\uFFFD|[\uD800-\uDBFF]$(?![\uDC00-\uDFFF])/);
 const overflow=await createChatMessage(room,{text:'Outro teste',author:'💊'.repeat(29)});
 const checked=await openChatMessage(room,overflow);
 assert.equal(checked.author,'💊'.repeat(28));
});

test('chat alias form respects 28 Unicode code points, including emoji input',()=>{
 const html=chatMarkup(true);
 const aliasField=html.match(/<input[^>]*id="chat-alias"[^>]*>/)?.[0];
 assert.ok(aliasField,'editor alias input should exist');
 assert.doesNotMatch(aliasField,/maxlength="28"/,'HTML maxlength counts UTF-16 code units, not emoji characters');
 assert.match(aliasField,/maxlength="56"/);
 const name='A'.repeat(27)+'💊';
 assert.equal(limitChatAlias(name),name);
 assert.equal(limitChatAlias('💊'.repeat(29)),'💊'.repeat(28));
 assert.equal(limitChatAlias('Ana Maria'),'Ana Maria');
 assert.equal(limitChatAlias('X'.repeat(57)),'X'.repeat(28));
});

test('chat blocks requests offline without losing the editable draft',()=>{
 const active={online:true,loading:false,sending:false,canSend:true};
 assert.deepEqual(chatControlsState(active),{refreshDisabled:false,sendDisabled:false});
 assert.deepEqual(chatControlsState({...active,online:false}),{refreshDisabled:true,sendDisabled:true});
 assert.deepEqual(chatControlsState({...active,loading:true}),{refreshDisabled:true,sendDisabled:false});
 assert.deepEqual(chatControlsState({...active,sending:true}),{refreshDisabled:false,sendDisabled:true});
 assert.deepEqual(chatControlsState({...active,canSend:false}),{refreshDisabled:false,sendDisabled:true});
 const markup=chatMarkup(true);
 assert.match(markup, /id="chat-text"[^>]*>/);
 assert.match(markup, /id="chat-send"/);
 assert.match(markup, /id="chat-refresh"/);
});
