import test from 'node:test';
import assert from 'node:assert/strict';
import {syncPlan, roomStatusLabel} from '../room.mjs';

test('sync plan avoids background and offline polling, and stops conflicted writes', () => {
  const ready={connected:true,visible:true,online:true,busy:false,pendingInvitation:false,conflict:false,dirty:false,canEdit:true};
  assert.equal(syncPlan(ready),'pull');
  assert.equal(syncPlan({...ready,dirty:true}),'push');
  assert.equal(syncPlan({...ready,visible:false}),'idle');
  assert.equal(syncPlan({...ready,online:false}),'offline');
  assert.equal(syncPlan({...ready,conflict:true,dirty:true}),'conflict');
  assert.equal(syncPlan({...ready,connected:false}),'idle');
  assert.equal(syncPlan({...ready,pendingInvitation:true}),'idle');
  assert.equal(syncPlan({...ready,busy:true}),'idle');
  assert.equal(syncPlan({...ready,dirty:true,canEdit:false}),'pull');
});
test('status label reflects stale, offline, and pending local changes',()=>{
  assert.match(roomStatusLabel({offline:true}),/Sem internet/);
  assert.match(roomStatusLabel({conflict:true}),/Conflito/);
  assert.match(roomStatusLabel({dirty:true}),/pendentes/);
  assert.match(roomStatusLabel({busy:true}),/Sincronizando/);
  assert.equal(roomStatusLabel({}), 'Atualizada');
});
