import test from 'node:test';
import assert from 'node:assert/strict';
import {createCredentials,parseRoomFragment,encryptRoom,decryptRoom,sharedSnapshot,buildRoomFragment} from '../room.mjs';

test('room credentials use high-entropy URL-safe values, no plaintext in URL',async()=>{
 const a=await createCredentials(); const b=await createCredentials();
 assert.match(a.id,/^[a-zA-Z0-9_-]{22}$/);assert.match(a.key,/^[a-zA-Z0-9_-]{43}$/);
 assert.notEqual(a.key,b.key);assert.match(a.authHash,/^[a-zA-Z0-9_-]{43}$/);
 assert.equal(parseRoomFragment(buildRoomFragment(a)).id,a.id);
 assert.equal(parseRoomFragment('#sala=bad'),null);
});
test('encrypted snapshot has authenticated cipher, cannot decrypt without link key',async()=>{
 const room=await createCredentials();
 const payload={version:1,items:[{id:'abc',title:'Medicamento privado',type:'med',times:['12:30'],days:[1]}],settings:{theme:'dark'}};
 const enc=await encryptRoom(room,payload);
 assert.ok(!JSON.stringify(enc).includes('Medicamento privado'));
 assert.deepEqual(await decryptRoom(room,enc),payload);
 const stranger=await createCredentials();
 await assert.rejects(()=>decryptRoom({...room,key:stranger.key},enc));
});
test('shared snapshot strips personal history and notification logs',()=>{
 const data={version:1,items:[{title:'Água'}],settings:{theme:'dark'},profile:{name:'Paciente X'},logs:{a:'secret'},noticeLog:{b:true}};
 assert.deepEqual(sharedSnapshot(data),{version:1,items:[{title:'Água'}],settings:{theme:'dark'}});
});
