import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { roomCanEdit } from '../room.mjs';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('sala de visualização não permite cadastrar nem pela ação do destaque Hoje',()=>{
 assert.equal(roomCanEdit({id:'A'.repeat(22),key:'B'.repeat(43)}),false);
 assert.equal(roomCanEdit({id:'A'.repeat(22),key:'B'.repeat(43),editorSecret:'C'.repeat(43)}),true);
 assert.match(app, /data-action="add" data-type="meal"\s+\$\{room&&!roomCanEdit\(room\)\?'disabled':''\}/,
  'O botão Novo horário do destaque precisa espelhar a permissão da sala');
 assert.match(app,/if\(action==='add'\)\{if\(room&&!roomCanEdit\(room\)\)\{toast\('Sala somente leitura\.'\);return\}/,
  'O clique não deve abrir um formulário de edição para o espectador');
});

test('configurações de sala somente leitura não oferecem exclusão nem restauração de rotinas',()=>{
 assert.match(app, /data-action="import"\s+\$\{room&&!roomCanEdit\(room\)\?'disabled':''\}/,
  'Restaurar backup deve respeitar acesso somente leitura');
 assert.match(app, /id="import-file"[\s\S]*?aria-label="Escolher backup JSON"\s+\$\{room&&!roomCanEdit\(room\)\?'disabled':''\}/,
  'Seletor oculto não deve permanecer acessível por teclado quando restauração está bloqueada');
 assert.match(app, /data-action="wipe-routines"\s+\$\{room&&!roomCanEdit\(room\)\?'disabled':''\}/,
  'Apagar rotinas não deve oferecer uma ação bloqueada');
 assert.match(app, /Somente visualização: para trocar ou apagar suas rotinas, desconecte esta sala primeiro\./,
  'Explicar por que os botões estão indisponíveis');
 assert.match(app, /async function importBackup\(file\)\{if\(room&&!roomCanEdit\(room\)\)\{toast\('Sala somente leitura\.'\);return\}/,
  'Seleção prévia de arquivo também deve respeitar permissões');
 assert.match(app, /dlg\.querySelector\('#apply-import'\)\.addEventListener\('click',\(\)=>\{if\(room&&!roomCanEdit\(room\)\)/,
  'Verificação deve ser repetida na confirmação da importação');
});

test('botão Enviar mostra estado de pendência e compartilha regra com o handler',()=>{
 assert.match(app,/data-action="room-push"\s+\$\{roomCanSend\(room,\{version:roomVersion,dirty:roomDirty,busy:roomBusy,conflict:roomConflict,online:navigator.onLine\}\)\?'':'disabled'\}/);
 assert.match(app,/if\(!roomCanSend\(room,\{version:roomVersion,dirty:roomDirty,busy:roomBusy,conflict:roomConflict,online:navigator.onLine\}\)\)return;roomBusy=true;/);
 assert.match(app,/Nenhuma alteração local pendente para enviar\./);
 assert.match(app,/Há um conflito\. Resolva antes de enviar\./);
});

test('botões manuais da Sala descrevem e respeitam o modo offline',()=>{
 assert.match(app,/data-action="room-pull"\s+\$\{roomCanReceive\(\{connected:!!room,online:navigator.onLine,busy:roomBusy\}\)\?'':'disabled'\}/);
 assert.match(app,/Sem conexão: use as rotinas locais e sincronize quando a internet voltar\./);
 assert.match(app,/if\(!roomCanReceive\(\{connected:!!room,online:navigator.onLine,busy:roomBusy\}\)\)\{toast\('Sem conexão ou sincronização já em andamento\.'\);return\}/);
});

test('atalho visual Resolver usa política diferente da sincronização offline',()=>{
 assert.match(app,/data-action="\$\{roomConflict\?'room-open':'room-sync'\}"\s+\$\{timelineActionDisabled\(\{busy:roomBusy,online:navigator.onLine,conflict:roomConflict\}\)\?'disabled':''\}/);
});
