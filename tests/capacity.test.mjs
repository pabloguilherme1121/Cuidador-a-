import test from 'node:test';
import assert from 'node:assert/strict';
import {roomRefreshIntervalMs} from '../room.mjs';
import {chatRefreshIntervalMs} from '../chat.mjs';
import {todayHeroState} from '../core.mjs';

test('room auto-sync stays moderate on the free tier',()=>{
 assert.ok(roomRefreshIntervalMs()>=180000);
 assert.ok(roomRefreshIntervalMs()<=600000);
});
test('chat starts responsive but backs off on inactivity and errors',()=>{
 assert.equal(chatRefreshIntervalMs({idleCycles:0}),60000);
 assert.ok(chatRefreshIntervalMs({idleCycles:4})>=180000);
 assert.ok(chatRefreshIntervalMs({failures:3})>=240000);
 assert.ok(chatRefreshIntervalMs({rateLimited:true})>=600000);
 assert.ok(chatRefreshIntervalMs({idleCycles:100})<=600000);
});
test('today hero never announces completion when there are overdue or pending occurrences',()=>{
 assert.equal(todayHeroState([]).status,'empty');
 assert.equal(todayHeroState([{status:'done',doneAt:'2026-10-20'}]).status,'complete');
 assert.equal(todayHeroState([{status:'late',doneAt:null}]).status,'late');
 assert.equal(todayHeroState([{status:'done',doneAt:'x'},{status:'late',doneAt:null}]).status,'late');
 assert.equal(todayHeroState([{status:'pending',doneAt:null}]).status,'pending');
});

test('production package contains secure manual refresh without 15-second polls',async()=>{
 const {readFileSync}=await import('node:fs');
 const chat=readFileSync('chat.mjs','utf8'),app=readFileSync('app.js','utf8');
 assert.match(chat,/id="chat-refresh"/);
 assert.doesNotMatch(chat,/setInterval\(\(\)=>void refresh\(\),15000\)/);
 assert.match(app,/roomRefreshIntervalMs\(\)/);
});
