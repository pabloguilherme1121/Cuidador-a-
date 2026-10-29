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
 assert.match(app, /data-action="wipe-routines"\s+\$\{room&&!roomCanEdit\(room\)\?'disabled':''\}/,
  'Apagar rotinas não deve oferecer uma ação bloqueada');
 assert.match(app, /Somente visualização: para trocar ou apagar suas rotinas, desconecte esta sala primeiro\./,
  'Explicar por que os botões estão indisponíveis');
 assert.match(app, /async function importBackup\(file\)\{if\(room&&!roomCanEdit\(room\)\)\{toast\('Sala somente leitura\.'\);return\}/,
  'Seleção prévia de arquivo também deve respeitar permissões');
 assert.match(app, /id='apply-import'[\s\S]*?room&&!roomCanEdit\(room\)/,
  'Verificação deve ser repetida na confirmação da importação');
});
