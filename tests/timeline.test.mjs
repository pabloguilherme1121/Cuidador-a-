import test from 'node:test';
import assert from 'node:assert/strict';
import {changeOccurrenceTime, removeOccurrenceTime, occurrenceDisplay} from '../timeline.mjs';

const med={id:'med001',type:'med',title:'Medicamento conforme receita',times:['08:00','20:00'],days:[0,1,2,3,4,5,6],dose:'prescrita'};
test('alterar um horario recorrente preserva outros horários e dados da rotina',()=>{
 const next=changeOccurrenceTime(med,'08:00','09:15');
 assert.deepEqual(next.times,['09:15','20:00']);
 assert.deepEqual(med.times,['08:00','20:00']);
 assert.equal(next.days.length,7);
 assert.equal(next.title,med.title);
});
test('troca invalida, duplicada ou com horario ausente e recusada',()=>{
 for(const [before,after] of [['08:00','25:20'],['08:00','20:00'],['06:00','07:00']]) assert.throws(()=>changeOccurrenceTime(med,before,after));
});
test('salvar o mesmo horario nao altera a rotina nem confirma mudanca inexistente',()=>{
 assert.throws(()=>changeOccurrenceTime(med,'08:00','08:00'),/horário diferente/);
 assert.deepEqual(med.times,['08:00','20:00']);
});
test('remover somente um horario conserva outros; remover ultimo exclui a rotina',()=>{
 assert.deepEqual(removeOccurrenceTime(med,'08:00').times,['20:00']);
 assert.equal(removeOccurrenceTime({...med,times:['08:00']},'08:00'),null);
 assert.throws(()=>removeOccurrenceTime(med,'23:59'));
});
test('registros concluidos exibem o snapshot original mesmo apos edicao',()=>{
 const record={doneAt:'2026-10-20T12:00:00.000Z',snapshot:{title:'Nome antigo',type:'med',dose:'instrucao antiga',note:'original'}};
 const row=occurrenceDisplay({...med,title:'Nome novo',dose:'nova instrucao',note:'alterada'},'2026-10-20','08:00',record);
 assert.equal(row.title,'Nome antigo'); assert.equal(row.dose,'instrucao antiga');
 assert.equal(row.time,'08:00');assert.equal(row.doneAt,record.doneAt); assert.equal(row.status,'done');
});
