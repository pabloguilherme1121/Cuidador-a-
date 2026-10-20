import test from 'node:test';
import assert from 'node:assert/strict';
import {createCredentials,completeCredentials,parseRoomFragment,buildRoomFragment,roomCanEdit} from '../room.mjs';

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
