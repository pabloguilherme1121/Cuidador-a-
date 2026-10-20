import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateRequests} from '../scripts/capacity-model.mjs';
test('budget projection is deterministic and includes static traffic',()=>{
 const r=estimateRequests({users:3000});
 assert.equal(r.total,3000*(3+2)+Math.ceil(3000*30*0.5/4)+Math.ceil(3000*30*60*0.2/180));
 assert.ok(r.total>0);assert.ok(r.share>0);
});
test('higher activity causes budget overrun and invalid inputs cannot hide costs',()=>{
 assert.ok(estimateRequests({users:10000,minutesPerDay:180}).share>1);
 assert.throws(()=>estimateRequests({users:100,chatPollSeconds:0}));
 assert.throws(()=>estimateRequests({users:100,roomOpenFraction:2}));
});
