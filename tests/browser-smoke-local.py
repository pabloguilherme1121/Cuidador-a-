from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
(ROOT/'test-results').mkdir(exist_ok=True)
html=(ROOT/'index.html').read_text()
html=html.replace('<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:; connect-src \'self\'; base-uri \'self\'; object-src \'none\'; frame-ancestors \'none\'" />','').replace('<script src="./app.js" type="module"></script>','').replace('<link rel="stylesheet" href="./styles.css" />','')
app=(ROOT/'app.js').read_text()
assert app.startswith('import {')
app='\n'.join(line for line in app.splitlines() if not line.startswith('import '))
room=(ROOT/'room.mjs').read_text().replace('export ','')
timeline=(ROOT/'timeline.mjs').read_text().replace('export ','')
core=(ROOT/'core.mjs').read_text().replace('export ','')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w in [320,360,390,430,844]:
  page=b.new_page(viewport={'width':w,'height':820})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html)
  page.evaluate('''() => { const db=new Map(); Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>db.get(k)||null,setItem:(k,v)=>db.set(k,v),removeItem:k=>db.delete(k)}}); }''')
  page.add_style_tag(content=(ROOT/'styles.css').read_text())
  page.add_script_tag(content=core)
  page.add_script_tag(content=room)
  page.add_script_tag(content=timeline)
  page.add_script_tag(content=app)
  assert not errors, f'JS error on {w}px: {errors}'
  assert page.locator('h1').count()>=1, f'No heading at {w}'
  page.locator('#onboard-form button[type=submit]').click()
  assert page.locator('.tabbtn').count()==6
  # As seis abas devem caber na mesma linha, sem sobrepor o conteúdo do celular.
  nav_positions=page.locator('.tabbtn').evaluate_all('(nodes)=>nodes.map(n=>({top:n.getBoundingClientRect().top,width:n.getBoundingClientRect().width}))')
  assert max(x['top'] for x in nav_positions)-min(x['top'] for x in nav_positions)<2, f'Navegação em duas linhas: {w}px'
  assert min(x['width'] for x in nav_positions)>=44, f'Alvo estreito na navegação: {w}px'
  min_nav_font=page.locator('.tabbtn').evaluate_all('(nodes)=>Math.min(...nodes.map(n=>parseFloat(getComputedStyle(n).fontSize)))')
  assert min_nav_font>=10, f'Rótulo da navegação ilegível em {w}px: {min_nav_font}px'
  assert page.locator('h1').count()>=1
  if w==390:page.screenshot(path=str(ROOT/'test-results'/'cuidadora-hoje.png'),full_page=True)
  assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),f'Horizontal overflow at {w}'
  small_target=page.locator('.btn.small').first
  assert small_target.evaluate('(el)=>el.getBoundingClientRect().height>=44'), f'Botão pequeno menor que 44px em {w}px'
  status_target=page.locator('.chip-filter').first
  assert status_target.evaluate('(el)=>el.getBoundingClientRect().height>=44'), f'Filtro de situação menor que 44px em {w}px'
  # Keyboard activation must keep focus on the replacement button after render().
  page.locator('.tabbtn[data-tab="routine"]').focus()
  page.keyboard.press('Enter')
  assert page.locator('.tabbtn[data-tab="routine"]').evaluate('(el)=>document.activeElement===el'), f'Tab focus lost at {w}px'
  page.locator('[data-action="routine-filter"][data-filter="med"]').focus()
  page.keyboard.press('Enter')
  assert page.locator('[data-action="routine-filter"][data-filter="med"]').evaluate('(el)=>document.activeElement===el'), f'Filter focus lost at {w}px'
  # Creating from a medication filter must open a medication form and display the new item.
  page.locator('.toolRow [data-action="add"]').click()
  assert page.locator('#item-type').input_value()=='med', f'Adicionar ignorou filtro Medicamentos em {w}px'
  page.locator('#item-title').fill('Medicamento fictício filtro')
  page.locator('#item-dose').fill('Conforme prescrição')
  page.locator('#item-times').fill('11:15')
  page.locator('#item-form button[type="submit"]').click()
  new_card=page.locator('.routine-card').filter(has_text='Medicamento fictício filtro')
  assert new_card.is_visible(), f'Medicamento cadastrado não aparece sob filtro ativo em {w}px'
  assert page.locator('[data-action="routine-filter"][data-filter="med"]').get_attribute('aria-pressed')=='true'
  # A nonmatching search should not make the item just added disappear.
  page.locator('#routine-search').fill('outro cadastro')
  page.locator('.toolRow [data-action="add"]').click()
  assert page.locator('#item-type').input_value()=='med'
  page.locator('#item-title').fill('Segundo medicamento fictício')
  page.locator('#item-times').fill('11:45')
  page.locator('#item-form button[type="submit"]').click()
  assert page.locator('#routine-search').input_value()=='', f'Busca ocultou novo cadastro em {w}px'
  assert page.locator('.routine-card').filter(has_text='Segundo medicamento fictício').is_visible()
  assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'), f'Cadastro filtrado causou overflow em {w}px'
  # Remove only the two synthetic entries to preserve the existing smoke fixture.
  for title in ['Medicamento fictício filtro','Segundo medicamento fictício']:
   page.locator('.routine-card').filter(has_text=title).locator('[data-action="delete"]').click()
   page.locator('#confirmDialog [data-action="confirm-delete"]').click()
   assert page.locator('.routine-card').filter(has_text=title).count()==0
  page.locator('[data-action="routine-filter"][data-filter="all"]').click()
  assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'), f'Keyboard navigation overflow at {w}px'
  page.get_by_role('button',name='Timer',exact=True).click()
  assert page.locator('#timer-display').inner_text()=='15:00'
  assert page.locator('.timer-ring').evaluate("el=>el.style.getPropertyValue('--timer-progress')")=='100%'
  if w==390:
   # Timer idle should not replace identical text every 400ms (layout/paint and accessibility churn).
   page.evaluate("""() => {
     window.__timerMutations = 0;
     window.__timerObserver = new MutationObserver(list => window.__timerMutations += list.length);
     window.__timerObserver.observe(document.getElementById('timer-display'), {childList:true,characterData:true,subtree:true});
   }""")
   page.wait_for_timeout(1100)
   count=page.evaluate("() => { window.__timerObserver.disconnect(); return window.__timerMutations; }")
   assert count==0, f'Timer ocioso alterou texto idêntico {count} vezes'
  preset=page.locator('[data-action="timer-preset"][data-minutes="5"]')
  preset.focus()
  page.keyboard.press('Enter')
  assert preset.evaluate('(el)=>document.activeElement===el'), f'Timer preset lost keyboard focus at {w}px'
  assert page.locator('#timer-display').inner_text()=='05:00'
  assert page.locator('.timer-ring').evaluate("el=>el.style.getPropertyValue('--timer-progress')")=='100%'
  toggle=page.locator('[data-action="timer-toggle"]')
  toggle.focus()
  page.keyboard.press('Enter')
  assert toggle.evaluate('(el)=>document.activeElement===el'), f'Timer toggle lost keyboard focus at {w}px'
  assert toggle.locator('#timer-action').inner_text()=='Pausar'
  # Pausing before the first second elapses correctly still shows the full
  # preset; wait for a real tick so "Continuar" has a meaningful remainder.
  page.wait_for_function("document.getElementById('timer-display')?.textContent !== '05:00'")
  page.keyboard.press('Enter')
  assert toggle.evaluate('(el)=>document.activeElement===el'), f'Timer pause lost keyboard focus at {w}px'
  assert toggle.locator('#timer-action').inner_text()=='Continuar'
  reset=page.locator('[data-action="timer-reset"]')
  reset.focus()
  page.keyboard.press('Enter')
  assert reset.evaluate('(el)=>document.activeElement===el'), f'Timer reset lost keyboard focus at {w}px'
  assert page.locator('.timer-ring').evaluate("el=>el.style.getPropertyValue('--timer-progress')")=='100%'
  custom=page.locator('#timer-minutes')
  custom.fill('17')
  custom.focus()
  page.keyboard.press('Enter')
  assert page.locator('#timer-display').inner_text()=='17:00', 'Duração personalizada não aplicada'
  assert custom.evaluate('(el)=>document.activeElement===el'), f'Campo de duração perdeu foco após Enter em {w}px'
  page.locator('.tabbtn[data-tab="room"]').click()
  assert page.get_by_text('Sala de Pacientes').count()>0
  page.locator('.tabbtn[data-tab="settings"]').click()
  assert page.locator('h1').inner_text()=='Personalização'
  assert page.locator('#sound-preset').count()==1
  assert page.locator('#vibration-choice').count()==1
  assert page.locator('#private-notification-choice').is_checked(), 'Private lock-screen notifications must default to enabled'
  palette=page.locator('[data-action="accent"][data-accent="ocean"]')
  palette.focus()
  page.keyboard.press('Enter')
  assert page.evaluate('document.documentElement.dataset.accent')=='ocean'
  assert palette.get_attribute('aria-pressed')=='true'
  assert palette.evaluate('(el)=>document.activeElement===el'), f'Paleta perdeu foco após mudança de cor: {w}px'
  theme=page.locator('#theme-choice')
  theme.focus()
  theme.select_option('dark')
  assert page.evaluate('document.documentElement.dataset.theme')=='dark'
  assert theme.evaluate('(el)=>document.activeElement===el'), f'Tema perdeu foco após seleção em {w}px'
  text_size=page.locator('#font-scale')
  text_size.focus()
  text_size.select_option('large')
  assert page.evaluate('document.documentElement.dataset.scale')=='large'
  assert text_size.evaluate('(el)=>document.activeElement===el'), f'Tamanho do texto perdeu foco em {w}px'
  vibration=page.locator('#vibration-choice')
  vibration.focus()
  vibration.check()
  assert vibration.is_checked()
  assert vibration.evaluate('(el)=>document.activeElement===el'), f'Vibração perdeu foco após alteração em {w}px'
  profile=page.locator('#profile-name')
  profile.fill('Teste mobile')
  profile.focus()
  page.keyboard.press('Enter')
  assert profile.input_value()=='Teste mobile'
  assert profile.evaluate('(el)=>document.activeElement===el'), f'Salvar perfil perdeu foco após Enter em {w}px'
  page.locator('[data-action="legal"][data-page="privacidade"]').click()
  assert page.locator('#legalDialog').evaluate('(e)=>e.open')
  page.locator('[data-action="close-legal"]').click()
  page.locator('.tabbtn[data-tab="routine"]').click()
  page.locator('[data-action="add"]').first.click()
  page.locator('#item-title').fill('Almoço teste')
  page.locator('#item-times').fill('12:30')
  # Two near-simultaneous form submit events must not create duplicate care reminders.
  page.locator('#item-form').evaluate("""form => {form.requestSubmit();form.requestSubmit()}""")
  assert page.locator('.routine-card').filter(has_text='Almoço teste').count()==1, f'Envios repetidos criaram rotinas duplicadas em {w}px'
  assert page.get_by_text('Almoço teste').count()>0
  page.locator('#routine-search').fill('Almoco')
  assert page.locator('.routine-card:visible').count()==2, 'Busca deveria ignorar acentos'
  assert page.locator('#routine-active-count').inner_text()=='2'
  page.locator('#routine-search').fill('12:30')
  assert page.locator('.routine-card:visible').count()==0, 'Busca durante digitação não deve usar horários se o filtro não usa'
  assert page.locator('#routine-active-count').inner_text()=='0'
  page.locator('#routine-search').fill('inexistente')
  assert page.locator('.routine-card:visible').count()==0
  assert page.locator('#routine-search-empty').is_visible()
  page.locator('.tabbtn[data-tab="today"]').click()
  page.locator('.tabbtn[data-tab="routine"]').click()
  assert page.locator('#routine-search-empty').is_visible(), 'Busca vazia deve sobreviver à navegação'
  assert page.locator('.empty:visible').count()==0, 'Não mostrar rotina inexistente quando há somente filtro sem resultado'
  page.get_by_role('button',name='Limpar busca',exact=True).click()
  assert page.locator('#routine-search').input_value()==''
  assert page.locator('#routine-search').evaluate('(el)=>document.activeElement===el')
  assert not page.locator('#routine-search-empty').is_visible()
  assert page.locator('.routine-card:visible').count()>=5
  # Keyboard flow: archive and restore the same fictitious item without losing focus.
  sample=page.locator('.routine-card').filter(has_text='Almoço teste')
  archive=sample.locator('[data-action="archive"]')
  archive.focus()
  page.keyboard.press('Enter')
  assert 'Reativar' in sample.locator('[data-action="archive"]').inner_text()
  assert sample.locator('[data-action="archive"]').evaluate('(el)=>document.activeElement===el'), f'Arquivar perdeu foco em {w}px'
  page.keyboard.press('Enter')
  assert 'Arquivar' in sample.locator('[data-action="archive"]').inner_text()
  assert sample.locator('[data-action="archive"]').evaluate('(el)=>document.activeElement===el'), f'Reativar perdeu foco em {w}px'
  sample.locator('[data-action="delete"]').focus()
  page.keyboard.press('Enter')
  assert page.locator('#confirmDialog').evaluate('(el)=>el.open')
  confirm=page.locator('#confirmDialog [data-action="confirm-delete"]')
  confirm.focus()
  page.keyboard.press('Enter')
  assert sample.count()==0, 'Exclusão não removeu o cartão de teste'
  assert page.locator('.toolRow [data-action="add"]').evaluate('(el)=>document.activeElement===el'), f'Exclusão deixou foco perdido em {w}px'
  assert page.locator('.routine-card:visible').count()>=4, 'Exclusão afetou outras rotinas'
  page.locator('.tabbtn[data-tab="today"]').click()
  page.locator('[data-action="add"][data-type="med"]').first.click()
  page.locator('#item-title').fill('Medicamento teste')
  page.locator('#item-dose').fill('Conforme receita')
  page.locator('#item-times').fill('08:00, 20:00')
  page.locator('#item-form button[type=submit]').click()
  page.locator('[data-action="filter"][data-filter="med"]').click()
  assert page.locator('.entry').count()==2
  page.locator('.entry[data-occ-key$="08:00"] [data-action="timeline-edit"]').click()
  assert page.locator('#confirmDialog').evaluate('(e)=>e.open')
  page.locator('#timeline-time-value').fill('09:15')
  page.locator('#timeline-time-form button[type=submit]').focus()
  page.keyboard.press('Enter')
  assert page.locator('.entry-time').all_inner_texts()==['09:15','20:00']
  assert page.locator('.entry[data-occ-key$="09:15"] [data-action="timeline-edit"]').evaluate('(el)=>document.activeElement===el'), f'Alterar horário perdeu foco na linha do tempo em {w}px'
  done_button=page.locator('.entry[data-occ-key$="09:15"] [data-action="toggle"]')
  done_button.focus()
  page.keyboard.press('Enter')
  assert page.locator('.entry[data-occ-key$="09:15"] .status').inner_text()=='Concluído'
  assert done_button.evaluate('(el)=>document.activeElement===el'), f'Concluir horário perdeu foco: {w}px'
  page.locator('.entry[data-occ-key$="09:15"] [data-action="timeline-edit"]').click()
  page.locator('#timeline-time-value').fill('10:00')
  page.locator('#timeline-time-form button[type=submit]').click()
  assert page.locator('.entry-time').all_inner_texts()==['09:15','10:00','20:00']
  page.locator('.entry[data-occ-key$="20:00"] [data-action="timeline-remove"]').focus()
  page.keyboard.press('Enter')
  assert page.locator('#confirmDialog').evaluate('(el)=>el.open')
  page.locator('[data-action="timeline-confirm-remove"]').focus()
  page.keyboard.press('Enter')
  assert page.locator('.entry-time').all_inner_texts()==['09:15','10:00']
  assert page.locator('.entry[data-occ-key$="10:00"] [data-action="timeline-edit"]').evaluate('(el)=>document.activeElement===el'), f'Excluir um horário perdeu foco em {w}px'
  assert page.locator('.entry[data-occ-key$="09:15"] .status').inner_text()=='Concluído'
  assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),f'Timeline overflow {w}px'

  page.locator('.tabbtn[data-tab="history"]').click()
  assert page.get_by_text('Medicamento teste').count()>=2
  today=page.locator('#history-date').input_value()
  previous=page.locator('[data-action="day"][data-delta="-1"]')
  previous.focus()
  page.keyboard.press('Enter')
  assert page.locator('#history-date').input_value()!=today
  assert previous.evaluate('(el)=>document.activeElement===el'), f'Voltar um dia perdeu foco: {w}px'
  next_day=page.locator('[data-action="day"][data-delta="1"]')
  next_day.focus()
  page.keyboard.press('Enter')
  assert page.locator('#history-date').input_value()==today
  assert next_day.is_disabled(), 'Próximo dia deve ficar desabilitado no dia atual'
  assert page.locator('#history-date').evaluate('(el)=>document.activeElement===el'), f'Foco não voltou à data quando Próximo dia foi desabilitado: {w}px'
  chosen_date=page.evaluate("() => {const d=new Date();d.setDate(d.getDate()-2);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}")
  picker=page.locator('#history-date')
  picker.fill(chosen_date)
  assert picker.input_value()==chosen_date
  assert picker.evaluate('(el)=>document.activeElement===el'), f'Seletor de data perdeu foco após escolher data em {w}px'
  page.locator('.tabbtn[data-tab="settings"]').click()
  page.locator('[data-action="wipe"]').click()
  assert page.locator('#confirmDialog').evaluate('(e)=>e.open')
  page.locator('[data-action="cancel-delete"]').click()
  assert page.locator('#confirmDialog').evaluate('(e)=>!e.open')
  if w==390:
   # Separate fixture: set fake local viewer data before bootstrapping the app.
   # set_content() lives on about:blank; page.reload() would discard the fixture.
   viewer=b.new_page(viewport={'width':390,'height':820})
   viewer_errors=[]
   viewer.on('pageerror',lambda e:viewer_errors.append(str(e)))
   viewer.set_content(html)
   viewer.evaluate("""() => {
     const db=new Map([
       ['cuidadora-room-v1',JSON.stringify({id:'A'.repeat(22),key:'B'.repeat(43),role:'viewer'})],
       ['cuidadora-data-v2',JSON.stringify({version:1,profile:{name:'Teste',onboarded:true},items:[],settings:{},logs:{},noticeLog:{}})]
     ]);
     Object.defineProperty(window,'localStorage',{configurable:true,value:{
       getItem:k=>db.get(k)||null,
       setItem:(k,v)=>db.set(k,v),
       removeItem:k=>db.delete(k)
     }});
   }""")
   viewer.add_style_tag(content=(ROOT/'styles.css').read_text())
   viewer.add_script_tag(content=core)
   viewer.add_script_tag(content=room)
   viewer.add_script_tag(content=timeline)
   viewer.add_script_tag(content=app)
   assert viewer.locator('.tabbtn').count()==6
   viewer.locator('.tabbtn[data-tab="settings"]').click()
   assert viewer.locator('[data-action="import"]').is_disabled()
   assert viewer.locator('#import-file').is_disabled()
   assert viewer.locator('[data-action="wipe-routines"]').is_disabled()
   assert viewer.locator('[data-action="backup"]').is_enabled()
   assert viewer.locator('[data-action="wipe"]').is_enabled()
   assert viewer.get_by_text('Somente visualização: para trocar ou apagar suas rotinas, desconecte esta sala primeiro.').is_visible()
   assert viewer.evaluate('document.documentElement.scrollWidth<=window.innerWidth'), 'Leitura overflow em 390px'
   assert not viewer_errors, f'Sala de leitura teve erro JS: {viewer_errors}'
   viewer.close()
   # Isolated editor with an unresolved synchronization conflict, using fictitious data.
   conflicted=b.new_page(viewport={'width':390,'height':820})
   conflict_errors=[]
   conflicted.on('pageerror',lambda e:conflict_errors.append(str(e)))
   conflicted.set_content(html)
   conflicted.evaluate("""() => {
     const db=new Map([
       ['cuidadora-room-v1',JSON.stringify({id:'A'.repeat(22),key:'B'.repeat(43),editorSecret:'C'.repeat(43),role:'editor',version:1,dirty:true,conflict:true})],
       ['cuidadora-data-v2',JSON.stringify({version:1,profile:{name:'Teste',onboarded:true},settings:{},items:[{id:'med001',type:'med',title:'Teste fictício',dose:'',note:'',days:[0,1,2,3,4,5,6],times:['08:00'],archived:false,createdAt:'2026-10-20T10:00:00.000Z'}],logs:{},noticeLog:{}})]
     ]);
     Object.defineProperty(window,'localStorage',{configurable:true,value:{
       getItem:k=>db.get(k)||null,
       setItem:(k,v)=>db.set(k,v),
       removeItem:k=>db.delete(k)
     }});
   }""")
   conflicted.add_style_tag(content=(ROOT/'styles.css').read_text())
   conflicted.add_script_tag(content=core)
   conflicted.add_script_tag(content=room)
   conflicted.add_script_tag(content=timeline)
   conflicted.add_script_tag(content=app)
   assert conflicted.locator('[data-action="add"]').first.is_disabled(), 'Conflito ainda permite novos horários'
   assert conflicted.locator('[data-action="room-open"]').is_enabled(), 'Resolver conflito deve seguir acessível'
   conflicted.locator('.tabbtn[data-tab="routine"]').click()
   assert conflicted.locator('.routine-card [data-action="edit"]').first.is_disabled()
   assert conflicted.locator('.routine-card [data-action="archive"]').first.is_disabled()
   assert conflicted.locator('.routine-card [data-action="delete"]').first.is_disabled()
   assert conflicted.get_by_text('Conflito de sincronização.',exact=False).is_visible()
   previous_data=conflicted.evaluate("localStorage.getItem('cuidadora-data-v2')")
   conflicted.evaluate("""() => {const stale=document.createElement('button');stale.dataset.action='archive';stale.dataset.id='med001';document.body.append(stale);stale.click();stale.remove();}""")
   assert conflicted.evaluate("localStorage.getItem('cuidadora-data-v2')")==previous_data, 'Ação antiga não deve alterar rotinas no conflito'
   conflicted.locator('.tabbtn[data-tab="settings"]').click()
   assert conflicted.locator('[data-action="backup"]').is_enabled()
   assert conflicted.locator('[data-action="import"]').is_disabled()
   assert conflicted.locator('[data-action="wipe-routines"]').is_disabled()
   assert conflicted.locator('#theme-choice').is_disabled(), 'Preferências compartilhadas não devem mudar durante conflito'
   assert conflicted.locator('#reminder-switch').is_disabled(), 'Lembretes compartilhados não devem mudar durante conflito'
   assert conflicted.locator('[data-action="wipe"]').is_enabled(), 'Apagar dados só do aparelho deve continuar disponível'
   assert conflicted.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
   assert not conflict_errors, f'Conflito gerou erro JS: {conflict_errors}'
   conflicted.close()
   # Simulate a slow first chat read colliding with a send, using fictitious data.
   chat_page=b.new_page(viewport={'width':390,'height':820})
   chat_errors=[]
   chat_page.on('pageerror',lambda e:chat_errors.append(str(e)))
   chat_page.set_content('<div id="chat-host"></div>')
   chat_page.evaluate("""() => {
     const sent=[];
     let firstReadResolve;
     window.__chatSent=false;
     window.__releaseFirstRead=()=>firstReadResolve?.({ok:true,json:async()=>({messages:[],cursor:''})});
     let reads=0;
     window.__chatReads=()=>reads;
     window.fetch=async (url,options={})=>{
       if(options.method==='POST'){
         sent.push({...JSON.parse(options.body),createdAt:Date.now()});
         window.__chatSent=true;
         return {ok:true,json:async()=>({})};
       }
       if(++reads===1)return new Promise(resolve=>{firstReadResolve=resolve});
       return {ok:true,json:async()=>({messages:sent.slice(),cursor:''})};
     };
     Object.defineProperty(window,'localStorage',{configurable:true,value:{
       getItem:()=>null,setItem:()=>{},removeItem:()=>{}
     }});
   }""")
   chat_code=(ROOT/'chat.mjs').read_text()
   chat_code='\n'.join(line for line in chat_code.splitlines() if not line.startswith('import ')).replace('export ','')
   chat_page.add_script_tag(content="const roomCanEdit=()=>true;const completeCredentials=async()=>({readToken:'test-read',token:'test-write'});"+chat_code)
   chat_page.evaluate("""() => {
     // Exercise the actual chat DOM/requests without real cryptography or credentials.
     window.createChatMessage=async(_,{author,text})=>({id:'M'.repeat(16),author,text});
     window.openChatMessage=async(_,data)=>data;
     const root=document.getElementById('chat-host');
     root.innerHTML=chatMarkup(true);
     window.__chatErrors=[];
     window.__stopChat=mountRoomChat(root,{id:'A'.repeat(22),key:'B'.repeat(43),editorSecret:'C'.repeat(43)},{onError:e=>window.__chatErrors.push(e.message)});
   }""")
   chat_page.locator('#chat-text').fill('Mensagem fictícia enviada')
   chat_page.locator('#chat-send').click()
   chat_page.wait_for_function('window.__chatSent===true',timeout=4000)
   chat_page.wait_for_function("document.querySelector('#chat-status')?.textContent==='Mensagem enviada.'",timeout=4000)
   chat_page.evaluate('window.__releaseFirstRead()')
   try:
    chat_page.wait_for_function("document.querySelector('.chat-message p')?.textContent==='Mensagem fictícia enviada'",timeout=2200)
   except Exception as ex:
    diagnostic=chat_page.evaluate("""() => ({status:document.querySelector('#chat-status')?.textContent,reads:window.__chatReads(),errors:window.__chatErrors,posted:window.__chatSent,messages:[...document.querySelectorAll('.chat-message p')].map(e=>e.textContent)})""")
    raise AssertionError(f'Chat não exibiu envio depois de GET lento: {diagnostic}') from ex
   assert chat_page.locator('.chat-message').count()==1, 'Chat deve mostrar o envio sem duplicar cartões'
   assert not chat_errors, f'Erro JS no envio concorrente: {chat_errors}'
   chat_page.evaluate('window.__stopChat()')
   chat_page.close()
  assert not errors, f'JS errors at {w}: {errors}'
  print(f'{w}px: onboarding, tabs, timer, theme, palette, legal, CRUD and search passed')
  if w==390:page.screenshot(path=str(ROOT/'test-results'/'cuidadora-mobile.png'),full_page=True)
  page.close()
 b.close()
