import test from 'node:test';
import assert from 'node:assert/strict';
import {roomRefreshIntervalMs} from '../room.mjs';
import {chatRefreshIntervalMs} from '../chat.mjs';
import {todayHeroState} from '../core.mjs';
test('room sync reduces polling on the free tier',()=>{assert.ok(roomRefreshIntervalMs()>=180000);assert.ok(roomRefreshIntervalMs()<=600000)});
test('chat backs off while idle and after transient failures',()=>{
 assert.equal(chatRefreshIntervalMs({idleCycles:0}),60000);
 assert.ok(chatRefreshIntervalMs({idleCycles:4})>=180000);
 assert.ok(chatRefreshIntervalMs({failures:3})>=240000);
 assert.ok(chatRefreshIntervalMs({rateLimited:true})>=600000);
 assert.ok(chatRefreshIntervalMs({idleCycles:100})<=600000);
});
test('the timeline never says completed while care remains overdue',()=>{
 assert.equal(todayHeroState([]).status,'empty');
 assert.equal(todayHeroState([{status:'done',doneAt:'x'}]).status,'complete');
 assert.equal(todayHeroState([{status:'late'}]).status,'late');
 assert.equal(todayHeroState([{status:'pending'}]).status,'pending');
});
test('manual chat update and configurable room intervals exist',async()=>{
 const {readFileSync}=await import('node:fs');
 const chat=readFileSync('chat.mjs','utf8'),app=readFileSync('app.js','utf8');
 assert.match(chat,/id="chat-refresh"/);
 assert.doesNotMatch(chat,/setInterval\(\(\)=>void refresh\(\),15000\)/);
 assert.match(app,/roomRefreshIntervalMs\(\)/);
});
