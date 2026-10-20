import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePreferences,formatCountdown,alarmDue,validTime,escapeCalendar,firstDayOfWeek,rangeWeek,validateCareEntry} from '../core.mjs';
test('native theme and safe accent defaults',()=>{assert.equal(normalizePreferences({theme:'system'}).theme,'system');assert.equal(normalizePreferences({accent:'unknown'}).accent,'sage');});
test('countdown cannot show negative remaining minutes',()=>{assert.equal(formatCountdown(0),'Agora');assert.equal(formatCountdown(-3),'Agora');assert.equal(formatCountdown(125),'2h 5min');});
test('alarm only when inside configured lead window',()=>{assert.equal(alarmDue(720,715,5),true);assert.equal(alarmDue(720,712,5),false);assert.equal(alarmDue(720,721,5),false);});
test('times are validated',()=>{assert.equal(validTime('23:59'),true);assert.equal(validTime('25:70'),false);});
test('ics fields escape injected newlines',()=>{assert.equal(escapeCalendar('x\nBEGIN:VEVENT'), 'x\\nBEGIN:VEVENT');assert.equal(escapeCalendar('a,b;c\\d'),'a\\,b\\;c\\\\d');});
test('Monday-based week is stable at DST and year boundaries',()=>{assert.equal(firstDayOfWeek(new Date(2026,9,18),1).getDate(),12);assert.equal(rangeWeek(new Date(2026,9,18),1).length,7);});
test('safe care entry rejects harmful malformed data',()=>{assert.equal(validateCareEntry({title:' ', times:['10:00'], days:[1]}),false);assert.equal(validateCareEntry({title:'Consulta',times:['10:00'],days:[1,3]}),true);});

// A paused/running timer must survive reload and must not gain time when a tab sleeps.
import {remainingSeconds,restoreTimer} from '../core.mjs';
test('timer uses absolute deadlines and rounds up partial seconds',()=>{
 assert.equal(remainingSeconds(16_250,15_500),1);
 assert.equal(remainingSeconds(16_250,14_000),3);
 assert.equal(remainingSeconds(16_250,18_000),0);
});
test('running timer resumes with elapsed real time after a reload',()=>{
 const s=restoreTimer({duration:900,remaining:900,running:true,deadline:100_000,finished:false},40_000);
 assert.equal(s.running,true);assert.equal(s.remaining,60);assert.equal(s.deadline,100_000);
});
test('timer finishing during a closed tab is shown as completed on return',()=>{
 const s=restoreTimer({duration:300,remaining:300,running:true,deadline:50_000,finished:false},51_000);
 assert.equal(s.running,false);assert.equal(s.remaining,0);assert.equal(s.finished,true);
});
test('timer restore rejects broken or impossible data',()=>{
 for(const invalid of [null,{}, {duration:180*60+1,remaining:1},{duration:30,remaining:-1},{duration:300,remaining:400}]){
  const s=restoreTimer(invalid,1000);assert.deepEqual({duration:s.duration,remaining:s.remaining,running:s.running}, {duration:900,remaining:900,running:false});
 }
});

// v2.2 regression coverage: reminders crossing midnight and private notifications.
import {isReminderWindow, reminderContent} from '../core.mjs';
test('notifications conceal sensitive titles and doses by default',()=>{
 assert.equal(normalizePreferences({}).privateNotifications,true);
 assert.deepEqual(reminderContent({title:'Medicamento particular',time:'20:00',type:'med',dose:'10 mg'},true),{title:'Cuidador(a) — lembrete',body:'Você tem um horário às 20:00. Abra o aplicativo para conferir.'});
 assert.deepEqual(reminderContent({title:'Almoço',time:'12:00',type:'meal'},false),{title:'Cuidador(a) — lembrete',body:'Almoço · 12:00'});
});
test('reminder window recognizes next-day schedule before midnight',()=>{
 const scheduled=new Date(2026,9,21,0,2,0).getTime();
 assert.equal(isReminderWindow(new Date(2026,9,20,23,58,30).getTime(),scheduled,5),true);
 assert.equal(isReminderWindow(new Date(2026,9,20,23,55,0).getTime(),scheduled,5),false);
 assert.equal(isReminderWindow(new Date(2026,9,21,0,2,45).getTime(),scheduled,5),true);
 assert.equal(isReminderWindow(new Date(2026,9,21,0,3,0).getTime(),scheduled,5),false);
});
test('reminder window has 60 seconds at exact schedule and respects disabled offset',()=>{
 const at=new Date(2026,9,20,10,0,0).getTime();
 assert.equal(isReminderWindow(at+30_000,at,0),true);
 assert.equal(isReminderWindow(at+60_000,at,0),false);
 assert.equal(isReminderWindow(at-60_000,at,0),false);
});
