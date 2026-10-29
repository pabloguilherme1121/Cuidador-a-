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
  assert page.locator('h1').count()>=1
  if w==390:page.screenshot(path=str(ROOT/'test-results'/'cuidadora-hoje.png'),full_page=True)
  assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),f'Horizontal overflow at {w}'
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
  page.locator('[data-action="timer-preset"][data-minutes="5"]').click()
  assert page.locator('#timer-display').inner_text()=='05:00'
  assert page.locator('.timer-ring').evaluate("el=>el.style.getPropertyValue('--timer-progress')")=='100%'
  page.locator('[data-action="timer-toggle"]').click()
  assert page.locator('[data-action="timer-toggle"]').count()==1
  page.locator('[data-action="timer-reset"]').click()
  assert page.locator('.timer-ring').evaluate("el=>el.style.getPropertyValue('--timer-progress')")=='100%'
  page.locator('.tabbtn[data-tab="room"]').click()
  assert page.get_by_text('Sala de Pacientes').count()>0
  page.locator('.tabbtn[data-tab="settings"]').click()
  assert page.locator('h1').inner_text()=='Personalização'
  assert page.locator('#sound-preset').count()==1
  assert page.locator('#vibration-choice').count()==1
  assert page.locator('#private-notification-choice').is_checked(), 'Private lock-screen notifications must default to enabled'
  page.locator('[data-action="accent"][data-accent="ocean"]').click()
  assert page.evaluate('document.documentElement.dataset.accent')=='ocean'
  page.locator('#theme-choice').select_option('dark')
  assert page.evaluate('document.documentElement.dataset.theme')=='dark'
  page.locator('[data-action="legal"][data-page="privacidade"]').click()
  assert page.locator('#legalDialog').evaluate('(e)=>e.open')
  page.locator('[data-action="close-legal"]').click()
  page.locator('.tabbtn[data-tab="routine"]').click()
  page.locator('[data-action="add"]').first.click()
  page.locator('#item-title').fill('Almoço teste')
  page.locator('#item-times').fill('12:30')
  page.locator('#item-form button[type=submit]').click()
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
  page.locator('#timeline-time-form button[type=submit]').click()
  assert page.locator('.entry-time').all_inner_texts()==['09:15','20:00']
  page.locator('.entry[data-occ-key$="09:15"] [data-action="toggle"]').click()
  page.locator('.entry[data-occ-key$="09:15"] [data-action="timeline-edit"]').click()
  page.locator('#timeline-time-value').fill('10:00')
  page.locator('#timeline-time-form button[type=submit]').click()
  assert page.locator('.entry-time').all_inner_texts()==['09:15','10:00','20:00']
  page.locator('.entry[data-occ-key$="20:00"] [data-action="timeline-remove"]').click()
  page.locator('[data-action="timeline-confirm-remove"]').click()
  assert page.locator('.entry-time').all_inner_texts()==['09:15','10:00']
  assert page.locator('.entry[data-occ-key$="09:15"] .status').inner_text()=='Concluído'
  assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),f'Timeline overflow {w}px'

  page.locator('.tabbtn[data-tab="history"]').click()
  assert page.get_by_text('Medicamento teste').count()>=2
  page.locator('.tabbtn[data-tab="settings"]').click()
  page.locator('[data-action="wipe"]').click()
  assert page.locator('#confirmDialog').evaluate('(e)=>e.open')
  page.locator('[data-action="cancel-delete"]').click()
  assert page.locator('#confirmDialog').evaluate('(e)=>!e.open')
  if w==390:
   # Fake, local-only viewer credentials. No patient data or external API.
   page.evaluate("() => localStorage.setItem('cuidadora-room-v1', JSON.stringify({id:'A'.repeat(22),key:'B'.repeat(43),role:'viewer'}))")
   page.reload(wait_until='load')
   page.locator('.tabbtn[data-tab="settings"]').click()
   assert page.locator('[data-action="import"]').is_disabled()
   assert page.locator('#import-file').is_disabled()
   assert page.locator('[data-action="wipe-routines"]').is_disabled()
   assert page.locator('[data-action="wipe"]').is_enabled()
   assert page.get_by_text('Somente visualização: para trocar ou apagar suas rotinas, desconecte esta sala primeiro.').is_visible()
   assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'), 'Leitura overflow em 390px'
  assert not errors, f'JS errors at {w}: {errors}'
  print(f'{w}px: onboarding, tabs, timer, theme, palette, legal, CRUD and search passed')
  if w==390:page.screenshot(path=str(ROOT/'test-results'/'cuidadora-mobile.png'),full_page=True)
  page.close()
 b.close()
