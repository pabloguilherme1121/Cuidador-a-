import test from 'node:test';
import assert from 'node:assert/strict';
import {createCredentials,completeCredentials,parseRoomFragment,buildRoomFragment,roomCanEdit,roomCanSend,roomCanReceive,timelineActionDisabled} from '../room.mjs';

test('new room creates distinct viewing and editing invitations',async()=>{
 const owner=await createCredentials();
 const viewer=await completeCredentials(parseRoomFragment(buildRoomFragment(owner,'view')));
 const editor=await completeCredentials(parseRoomFragment(buildRoomFragment(owner,'edit')));
 assert.equal(roomCanEdit(viewer),false);
 assert.equal(roomCanEdit(editor),true);
 assert.equal(viewer.id,editor.id);
 assert.equal(viewer.key,editor.key);
 assert.equal(viewer.token,null);
 assert.equal(editor.token,owner.token);
 assert.match(viewer.readHash,/^[\w-]{43}$/);
 assert.notEqual(editor.authHash,viewer.readHash);
 assert.equal(buildRoomFragment(viewer,'edit'),null);
});

test('link alone without editor secret cannot derive write permission',async()=>{
 const owner=await createCredentials();
 const viewer=await completeCredentials({id:owner.id,key:owner.key});
 assert.equal(viewer.role,'viewer');
 assert.equal(viewer.token,null);
 assert.equal(parseRoomFragment('#sala=invalid'),null);
});

test('enviar alterações só é possível para editor com versão e mudanças sem conflito',()=>{
 const editor={id:'a'.repeat(22),key:'b'.repeat(43),editorSecret:'c'.repeat(43)};
 const viewer={id:editor.id,key:editor.key};
 const ready={version:2,dirty:true,busy:false,conflict:false};
 assert.equal(roomCanSend(editor,ready),true);
 assert.equal(roomCanSend(viewer,ready),false);
 assert.equal(roomCanSend(editor,{...ready,version:0}),false);
 assert.equal(roomCanSend(editor,{...ready,dirty:false}),false);
 assert.equal(roomCanSend(editor,{...ready,busy:true}),false);
 assert.equal(roomCanSend(editor,{...ready,conflict:true}),false);
 assert.equal(roomCanSend(null,ready),false);
});

test('controles manuais de sincronização respeitam conexão e processamento',()=>{
 const editor={id:'a'.repeat(22),key:'b'.repeat(43),editorSecret:'c'.repeat(43)};
 const ready={version:2,dirty:true,busy:false,conflict:false,online:true};
 assert.equal(roomCanSend(editor,ready),true);
 assert.equal(roomCanSend(editor,{...ready,online:false}),false);
 assert.equal(roomCanReceive({connected:true,online:true,busy:false}),true);
 assert.equal(roomCanReceive({connected:true,online:false,busy:false}),false);
 assert.equal(roomCanReceive({connected:true,online:true,busy:true}),false);
 assert.equal(roomCanReceive({connected:false,online:true,busy:false}),false);
});

test('resolver conflito pode abrir Sala offline, sem permitir sincronizar',()=>{
 assert.equal(timelineActionDisabled({busy:false,online:false,conflict:true}),false);
 assert.equal(timelineActionDisabled({busy:false,online:false,conflict:false}),true);
 assert.equal(timelineActionDisabled({busy:false,online:true,conflict:false}),false);
 assert.equal(timelineActionDisabled({busy:true,online:true,conflict:true}),true);
});
