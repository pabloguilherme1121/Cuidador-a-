/** Immutable helpers for a recurring routine and its immutable local history. */
const timePattern=/^([01]\d|2[0-3]):[0-5]\d$/;
function hasTime(item,time){return Boolean(item&&Array.isArray(item.times)&&item.times.includes(time));}
export function changeOccurrenceTime(item,fromTime,toTime){
 if(!hasTime(item,fromTime)||!timePattern.test(toTime)||toTime===fromTime||item.times.includes(toTime)) throw new Error('Escolha um horário diferente e válido.');
 return {...item,times:[...item.times.filter(t=>t!==fromTime),toTime].sort()};
}
export function removeOccurrenceTime(item,time){
 if(!hasTime(item,time))throw new Error('Este horário não existe mais na rotina.');
 const times=item.times.filter(t=>t!==time);
 return times.length?{...item,times}:null;
}
export function occurrenceDisplay(item,day,time,record,nowMinutes=null){
 const snapshot=record?.snapshot&&typeof record.snapshot==='object'?record.snapshot:null;
 const minutes=Number(time.slice(0,2))*60+Number(time.slice(3));
 return {key:`${day}|${item.id}|${time}`,id:item.id,type:snapshot?.type||item.type,
 title:snapshot?.title||item.title,dose:snapshot?.dose??item.dose,note:snapshot?.note??item.note,
 time,doneAt:record?.doneAt||null,
 status:record?.doneAt?'done':(nowMinutes!==null&&minutes<nowMinutes?'late':'pending')};
}
