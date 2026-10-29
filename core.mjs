/** Helpers without DOM access, exercised by node:test. */
const ACCENTS=['sage','ocean','lilac','coral','amber','mint'];
export const validTime=s=>typeof s==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
export function normalizePreferences(p={}) {
 const theme=['system','light','dark'].includes(p?.theme)?p.theme:'system';
 const accent=ACCENTS.includes(p?.accent)?p.accent:'sage';
 const scale=['normal','large','xlarge'].includes(p?.scale)?p.scale:'normal';
 const density=['comfortable','compact'].includes(p?.density)?p.density:'comfortable';
 const lead=[0,5,10,15,30].includes(Number(p?.lead))?Number(p.lead):0;
 return {theme,accent,scale,density,lead,soundPreset:['soft','chime','pulse'].includes(p?.soundPreset)?p.soundPreset:'soft',volume:[15,30,55].includes(Number(p?.volume))?Number(p.volume):30,vibration:p?.vibration===true,sound:p?.sound===true,reminders:p?.reminders===true,weekStart:p?.weekStart===0?0:1,quietStart:validTime(p?.quietStart)?p.quietStart:'22:00',quietEnd:validTime(p?.quietEnd)?p.quietEnd:'07:00',quiet:p?.quiet===true,privateNotifications:p?.privateNotifications!==false};
}
export function formatCountdown(n) {if(n<=0)return 'Agora';const hours=Math.floor(n/60),mins=n%60;return hours?`${hours}h${mins?' '+mins+'min':''}`:`${mins} min`;}
export function alarmDue(scheduledMinute,currentMinute,lead=0){return currentMinute>=scheduledMinute-lead&&currentMinute<=scheduledMinute&&currentMinute>=0&&currentMinute<1440;}
export function escapeCalendar(v){return String(v??'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');}
export function firstDayOfWeek(date,start=1){const d=new Date(date.getFullYear(),date.getMonth(),date.getDate());d.setDate(d.getDate()-((d.getDay()-start+7)%7));return d;}
export function rangeWeek(date,start=1){const first=firstDayOfWeek(date,start);return Array.from({length:7},(_,i)=>new Date(first.getFullYear(),first.getMonth(),first.getDate()+i));}
export function validateCareEntry(x){return Boolean(x && typeof x.title==='string' && x.title.trim().length>0 && x.title.length<=100 && Array.isArray(x.times) && x.times.length>0 && x.times.length<=24 && x.times.every(validTime) && Array.isArray(x.days) && x.days.length>0 && x.days.every(d=>Number.isInteger(d)&&d>=0&&d<=6));}
export function inQuietHours(time,start,end) {if(!validTime(time)||!validTime(start)||!validTime(end))return false;const m=x=>Number(x.slice(0,2))*60+Number(x.slice(3));const n=m(time),s=m(start),e=m(end);return s<=e?n>=s&&n<e:n>=s||n<e;}

/** Timer state is local to this browser; deadlines keep it correct when backgrounded. */
export function remainingSeconds(deadline, now=Date.now()) {
 if (!Number.isFinite(deadline) || !Number.isFinite(now)) return 0;
 return Math.max(0, Math.ceil((deadline-now)/1000));
}
export function restoreTimer(raw, now=Date.now()) {
 const empty=()=>({duration:900,remaining:900,running:false,deadline:null,finished:false});
 if (!raw || typeof raw!=='object' || !Number.isInteger(raw.duration) || raw.duration<60 || raw.duration>10800 || !Number.isInteger(raw.remaining) || raw.remaining<0 || raw.remaining>raw.duration) return empty();
 const running=raw.running===true;
 if (running) {
  if (!Number.isFinite(raw.deadline) || raw.deadline<=0) return empty();
  const remaining=Math.min(raw.duration,remainingSeconds(raw.deadline,now));
  return {duration:raw.duration,remaining,running:remaining>0,deadline:remaining>0?raw.deadline:null,finished:remaining===0};
 }
 return {duration:raw.duration,remaining:raw.remaining,running:false,deadline:null,finished:raw.finished===true&&raw.remaining===0};
}

/** Reminders are only checked in the foreground; never promise background alarms. */
export function isReminderWindow(now,scheduled,leadMinutes=0) {
 if(!Number.isFinite(now)||!Number.isFinite(scheduled)||![0,5,10,15,30].includes(leadMinutes))return false;
 return now>=scheduled-leadMinutes*60000 && now<scheduled+60000;
}
/** Minimize lock-screen disclosure of potentially sensitive medication data. */
export function reminderContent(occurrence,privateNotifications=true) {
 const title='Cuidador(a) — lembrete';
 if(privateNotifications)return {title,body:`Você tem um horário às ${occurrence.time}. Abra o aplicativo para conferir.`};
 return {title,body:`${occurrence.title} · ${occurrence.time}`};
}

/** Distinguish overdue care from completed schedules; UI never claims a missed dose was taken. */
export function todayHeroState(list=[]) {
 if(!list.length)return {status:'empty',title:'Um dia do seu jeito',description:'Comece cadastrando sua primeira refeição ou medicamento.'};
 if(list.every(o=>Boolean(o.doneAt)))return {status:'complete',title:'Tudo concluído por hoje!',description:'Todos os horários cadastrados foram marcados como concluídos.'};
 if(list.some(o=>!o.doneAt&&o.status==='late'))return {status:'late',title:'Existem horários atrasados',description:'Confira as pendências na linha do tempo. Marque apenas os cuidados realmente realizados.'};
 return {status:'pending',title:'Sua rotina ainda tem pendências',description:'Confira os horários pendentes na linha do tempo.'};
}

/** One shared search rule for the initial list and live input filtering. */
const foldSearch=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
export function routineMatches(item,query='') {
 if(!item||typeof item!=='object')return false;
 const needle=foldSearch(query).trim();
 return !needle||[item.title,item.note,item.dose].some(value=>foldSearch(value).includes(needle));
}

/** Refresh the Today dashboard on minute changes, without rebuilding it every poll. */
export function shouldRefreshToday(previousMinute,currentMinute,tab,visible,onboarded){
 return tab==='today'&&visible===true&&onboarded===true&&Number.isFinite(currentMinute)&&currentMinute!==previousMinute;
}
