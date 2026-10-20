import {normalizePreferences,formatCountdown,isReminderWindow,reminderContent,inQuietHours,remainingSeconds,restoreTimer} from './core.mjs';
(() => {
  'use strict';
  const KEY='cuidadora-data-v2';
  const LEGACY='meu-ritmo-data-v1';
  const TIMERKEY='cuidadora-timer-v1';
  const WEEK=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const WEEKLONG=['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
  const ICON={
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    meal:'<path d="M4 2v7m3-7v7m3-7v7M4 9h6M7 9v13M17 2v20M17 2c-4 2-4 10 0 11"/>',
    med:'<path d="m10 4 10 10a5 5 0 0 1-7 7L3 11a5 5 0 0 1 7-7Z"/><path d="m7 15 8-8"/>',
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-7h6v7"/>',
    list:'<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
    history:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 3"/>',
    settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>',
    add:'<path d="M12 4v16M4 12h16"/>',check:'<path d="m5 12 5 5L20 7"/>',
    left:'<path d="m15 18-6-6 6-6"/>',right:'<path d="m9 18 6-6-6-6"/>',
    pencil:'<path d="m15 5 4 4M4 20l4-1 12-12a3 3 0 0 0-4-4L4 15z"/>',
    trash:'<path d="M4 7h16M10 7V4h4v3M6 7l1 14h10l1-14M10 11v6m4-6v6"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
    bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    phone:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    undo:'<path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-2"/>',
    archive:'<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v12h14V8M9 13h6"/>',
    restore:'<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v12h14V8M12 12v6m-3-3h6"/>',
    timer:'<circle cx="12" cy="13" r="9"/><path d="M12 8v5l4 2M9 2h6"/>',
    pause:'<path d="M7 5v14M17 5v14"/>',
    play:'<path d="m8 5 11 7-11 7z"/>',
    refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 9a7 7 0 0 1 12-2l2 5M4 12l2 5a7 7 0 0 0 12-2"/>',
    shield:'<path d="M12 2l9 4v6c0 6-4 9-9 10-5-1-9-4-9-10V6z"/><path d="m9 12 2 2 4-4"/>',
    leaf:'<path d="M20 4C10 4 5 8 4 15c-1 7 8 8 12 2 3-5 4-13 4-13Z"/><path d="M4 20c3-7 7-10 12-12"/>'
  };
  const icon=(name,size=20)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]||ICON.clock}</svg>`;
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const uid=()=>((typeof crypto!=='undefined'&&crypto.randomUUID)?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now().toString(36)).replace(/-/g,'');
  const isTime=s=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
  const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const parseDate=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
  const longDate=d=>new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long'}).format(d);
  const firstUpper=s=>s.charAt(0).toUpperCase()+s.slice(1);
  const initial=()=>({version:1,profile:{name:'',onboarded:false},settings:normalizePreferences({theme:'system'}),items:[],logs:{},noticeLog:{}});
  const safeText=(v,max=200)=>typeof v==='string'?v.slice(0,max):'';
  function validate(input){
    if(!input||typeof input!=='object'||input.version!==1)throw new Error('Formato ou versão do backup não reconhecido.');
    if(!Array.isArray(input.items)||input.items.length>1000)throw new Error('Lista de horários inválida.');
    const seen=new Set();
    const items=input.items.map(raw=>{
      if(!raw||typeof raw!=='object'||!['meal','med'].includes(raw.type)||typeof raw.id!=='string'||!/^[\w-]{3,90}$/.test(raw.id)||seen.has(raw.id))throw new Error('Um cadastro está inválido.');
      seen.add(raw.id);
      const title=safeText(raw.title,100).trim();
      if(!title||!Array.isArray(raw.days)||!raw.days.length||raw.days.some(x=>!Number.isInteger(x)||x<0||x>6)||!Array.isArray(raw.times)||!raw.times.length||raw.times.length>24||raw.times.some(x=>!isTime(x)))throw new Error('Título, dias ou horários inválidos.');
      return {id:raw.id,type:raw.type,title,dose:safeText(raw.dose,100),note:safeText(raw.note,500),days:[...new Set(raw.days)].sort(),times:[...new Set(raw.times)].sort(),archived:raw.archived===true,createdAt:safeText(raw.createdAt,40)||new Date().toISOString()};
    });
    const logs={};
    if(input.logs&&typeof input.logs==='object'&&!Array.isArray(input.logs)){
      for(const [k,v] of Object.entries(input.logs).slice(-15000)){
        if(!/^\d{4}-\d\d-\d\d\|[\w-]{3,90}\|([01]\d|2[0-3]):[0-5]\d$/.test(k)||!v||typeof v!=='object'||typeof v.doneAt!=='string')continue;
        const s=v.snapshot||{};
        logs[k]={doneAt:safeText(v.doneAt,40),snapshot:{title:safeText(s.title,100),type:s.type==='med'?'med':'meal',dose:safeText(s.dose,100),note:safeText(s.note,500)}};
      }
    }
    const noticeLog={};
    if(input.noticeLog&&typeof input.noticeLog==='object'&&!Array.isArray(input.noticeLog)){
      for(const [k,v] of Object.entries(input.noticeLog).slice(-3000))if(/^\d{4}-\d\d-\d\d\|[\w-]{3,90}\|\d\d:\d\d$/.test(k)&&v===true)noticeLog[k]=true;
    }
    return {version:1,profile:{name:safeText(input.profile?.name,60),onboarded:input.profile?.onboarded===true},settings:normalizePreferences(input.settings),items,logs,noticeLog};
  }
  let state=initial();
  try {const raw=localStorage.getItem(KEY)||localStorage.getItem(LEGACY);if(raw)state=validate(JSON.parse(raw))}catch(err){console.warn('Armazenamento recuperado com padrão seguro:',err)}
  let tab='today',filter='all',statusFilter='all',routineFilter='all',historyDay=dateKey(new Date()),deferredInstall=null,toastTimer=0,storageWarned=false,searchQuery='';
  let recoveredTimer;
  try {recoveredTimer=restoreTimer(JSON.parse(localStorage.getItem(TIMERKEY)),Date.now())}catch{recoveredTimer=restoreTimer(null)}
  let timerDuration=recoveredTimer.duration,timerRemaining=recoveredTimer.remaining,timerRunning=recoveredTimer.running,timerDeadline=recoveredTimer.deadline,timerFinished=recoveredTimer.finished;
  function saveTimer(){try{localStorage.setItem(TIMERKEY,JSON.stringify({duration:timerDuration,remaining:timerRemaining,running:timerRunning,deadline:timerDeadline,finished:timerFinished}))}catch{}}
  function updateTimer(){if(timerRunning&&timerDeadline){timerRemaining=remainingSeconds(timerDeadline,Date.now());if(timerRemaining===0){timerRunning=false;timerDeadline=null;timerFinished=true;saveTimer();return true}}return false}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{if(!storageWarned){toast('Não foi possível salvar. Exporte um backup e libere espaço.');storageWarned=true}}}
  function setState(changer){state=changer(state);save();render()}
  function notifyTitle(s){return s.type==='med'?'Medicamento':'Refeição'}
  function todayOccs(day){
    const d=parseDate(day),dow=d.getDay(),minutes=new Date().getHours()*60+new Date().getMinutes(),isToday=day===dateKey(new Date()),found=new Map();
    for(const item of state.items){if(item.archived||!item.days.includes(dow))continue;
      for(const time of item.times){const key=`${day}|${item.id}|${time}`;
        found.set(key,{key,id:item.id,type:item.type,title:item.title,dose:item.dose,note:item.note,time,doneAt:state.logs[key]?.doneAt||null,status:state.logs[key]?'done':(isToday&&Number(time.slice(0,2))*60+Number(time.slice(3))<minutes?'late':'pending')});
      }
    }
    for(const [key,val] of Object.entries(state.logs))if(key.startsWith(day+'|')&&!found.has(key)){
      const [,id,time]=key.split('|');found.set(key,{key,id,type:val.snapshot.type,title:val.snapshot.title||'Registro anterior',dose:val.snapshot.dose,note:val.snapshot.note,time,doneAt:val.doneAt,status:'done',historical:true});
    }
    return [...found.values()].sort((a,b)=>a.time.localeCompare(b.time)||a.title.localeCompare(b.title));
  }
  function daysLabel(days){return days.length===7?'Todos os dias':days.length===5&&[1,2,3,4,5].every(x=>days.includes(x))?'Seg a sex':days.map(x=>WEEK[x]).join(', ')}
  function mealIcon(item){return `<span class="entry-icon ${item.type==='med'?'med':''}">${icon(item.type==='med'?'med':'meal',23)}</span>`}
  function statusText(o){return o.status==='done'?'Concluído':o.status==='late'?'Atrasado':'Pendente'}
  function row(o,readOnly=false){
    const timeDone=o.doneAt?` · feito às ${new Date(o.doneAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:'';
    return `<article class="entry" data-occ-key="${esc(o.key)}">${mealIcon(o)}<div class="entry-info"><strong>${esc(o.title)}${o.dose?' · '+esc(o.dose):''}</strong><p>${esc(notifyTitle(o))}${timeDone}</p></div><div class="entry-right"><span class="entry-time">${esc(o.time)}</span><span class="status ${o.status==='done'?'done':o.status==='late'?'late':'future'}">${statusText(o)}</span></div>${!readOnly?`<button class="iconbutton ${o.doneAt?'checked':''}" data-action="toggle" data-key="${esc(o.key)}" aria-label="${o.doneAt?'Desfazer conclusão de':'Marcar como concluído'} ${esc(o.title)} às ${esc(o.time)}" title="${o.doneAt?'Desfazer':'Concluir'}">${icon(o.doneAt?'undo':'check',18)}</button>`:''}</article>`;
  }
  const safety=`<aside class="disclaimer">${icon('leaf',16)} <strong>Saúde em primeiro lugar.</strong> Siga sempre a receita e as orientações do profissional de saúde. Em caso de dose esquecida, consulte a bula ou seu profissional — não dobre a dose.</aside>`;
  function empty(title,detail,kind='clock') {return `<div class="empty"><div class="emptyicon">${icon(kind,27)}</div><h3>${esc(title)}</h3><p>${esc(detail)}</p></div>`}
  function header(){return `<header class="topbar"><a class="brand" href="#hoje" data-action="tab" data-tab="today" aria-label="Cuidador(a), início"><span class="brandmark">${icon('sun',24)}</span><span>cuidador(a)<small>um cuidado de cada vez</small></span></a><span class="date-chip">${firstUpper(new Intl.DateTimeFormat('pt-BR',{day:'numeric',month:'short'}).format(new Date()))}</span></header>`}
  function bottomNav(){return `<nav class="tabbar" aria-label="Navegação principal"><div class="tabbar-inner">${[['today','home','Hoje'],['routine','list','Rotina'],['timer','timer','Timer'],['history','history','Histórico'],['settings','settings','Ajustes']].map(([id,ico,title])=>`<button class="tabbtn" data-action="tab" data-tab="${id}" ${tab===id?'aria-current="page"':''}>${icon(ico,20)}<span>${title}</span></button>`).join('')}</div></nav>`}
  function greeting(){const h=new Date().getHours();return h<12?'Bom dia':h<18?'Boa tarde':'Boa noite'}
  function renderToday(){
    const day=dateKey(new Date()),list=todayOccs(day),done=list.filter(o=>o.doneAt).length,percentage=list.length?Math.round(done/list.length*100):0,now=new Date(),mins=now.getHours()*60+now.getMinutes();
    const next=list.find(o=>!o.doneAt&&Number(o.time.slice(0,2))*60+Number(o.time.slice(3))>=mins);
    const filtered=list.filter(o=>(filter==='all'||o.type===filter)&&(statusFilter==='all'||statusFilter===o.status));
    const intro=state.profile.name.trim()?`, ${esc(state.profile.name.trim().split(/\s+/)[0])}`:'';
    const nextHero=next?`<div class="hero-kicker">${icon(next.type==='med'?'med':'meal',17)} Próximo horário</div><div class="bigtime">${next.time}</div><h2>${esc(next.title)}</h2><div class="hero-meta">${next.dose?esc(next.dose)+' · ':''}${formatCountdown(Number(next.time.slice(0,2))*60+Number(next.time.slice(3))-mins)}</div><div class="hero-footer"><span class="pill white">${icon('clock',15)} ${esc(notifyTitle(next))}</span></div>`:`<div class="hero-kicker">${icon('sun',17)} Rotina do dia</div><h2 style="margin-top:32px">${list.length?'Todos os próximos horários atendidos!':'Um dia do seu jeito'}</h2><p class="hero-meta">${list.length?'Você não tem novos compromissos programados para hoje.':'Comece cadastrando sua primeira refeição ou medicamento.'}</p><div class="hero-footer"><button class="btn" data-action="add" data-type="meal">${icon('add',17)} Novo horário</button></div>`;
    return `<div><p class="eyebrow">${firstUpper(longDate(new Date()))}</p><h1>${greeting()}${intro}<span style="color:#85aa91">.</span></h1><p class="page-subtitle">Sua rotina organizada, um horário de cada vez.</p><div class="dashboard"><section class="hero" aria-label="Próximo compromisso">${nextHero}</section><section class="panel progresscard"><div class="statrow"><strong>Seu progresso hoje</strong><span class="subtle counter">${done} de ${list.length}</span></div><div class="progressTrack" role="progressbar" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="${list.length}" aria-label="Compromissos concluídos"><span style="width:${percentage}%"></span></div><p class="subtle" style="font-size:.81rem;margin:14px 0 0">${list.length?`${percentage}% da rotina concluída. Cada cuidado conta.`:'Seus horários vão aparecer aqui.'}</p><div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:20px"><button class="btn small" data-action="add" data-type="meal">${icon('meal',16)} Refeição</button><button class="btn small" data-action="add" data-type="med">${icon('med',16)} Remédio</button></div></section></div><div class="sectionhead"><h2>Linha do tempo</h2><span class="subtle" style="font-size:.77rem">${list.length} horários</span></div><div class="filterRow" role="group" aria-label="Filtrar horários">${[['all','Todos'],['meal','Refeições'],['med','Remédios']].map(([v,label])=>`<button class="filter" data-action="filter" data-filter="${v}" aria-pressed="${filter===v}">${label}</button>`).join('')}</div><div class="filterRow secondaryFilters" role="group" aria-label="Filtrar por situação">${[['all','Todas'],['pending','Pendentes'],['late','Atrasadas'],['done','Concluídas']].map(([v,label])=>`<button class="chip-filter" data-action="status-filter" data-filter="${v}" aria-pressed="${statusFilter===v}">${label}</button>`).join('')}</div><div class="stack" style="margin-top:15px">${filtered.length?filtered.map(o=>row(o)).join(''):empty('Nada por aqui','Adicione um horário ou escolha outro filtro.','sun')}</div>${safety}</div>`;
  }
  function routineCard(item){return `<article class="panel routine-card"><div class="routine-details">${mealIcon(item)}<div class="entry-info"><strong>${esc(item.title)}${item.dose?' · '+esc(item.dose):''}</strong><p>${item.times.map(esc).join(' • ')} · ${esc(daysLabel(item.days))}</p></div></div>${item.note?`<p class="routine-note">${esc(item.note)}</p>`:''}<div class="routine-more"><button class="btn small ghost" data-action="edit" data-id="${item.id}">${icon('pencil',15)} Editar</button><button class="btn small ghost" data-action="archive" data-id="${item.id}">${icon(item.archived?'restore':'archive',15)} ${item.archived?'Reativar':'Arquivar'}</button><button class="btn small danger" data-action="delete" data-id="${item.id}">${icon('trash',15)} Excluir</button></div></article>`}
  function renderRoutine(){let list=state.items.filter(x=>(routineFilter==='all'||x.type===routineFilter)&&(!searchQuery||[x.title,x.note,x.dose].join(' ').toLocaleLowerCase('pt-BR').includes(searchQuery.toLocaleLowerCase('pt-BR'))));const active=list.filter(x=>!x.archived),archived=list.filter(x=>x.archived);
    return `<section><p class="eyebrow">Organize sua semana</p><h1 class="page-title">Minha rotina</h1><p class="page-subtitle">Você decide os horários e pode mudar quando precisar.</p><div class="toolRow"><div class="filterRow">${[['all','Tudo'],['meal','Refeições'],['med','Remédios']].map(([v,label])=>`<button class="filter" data-action="routine-filter" data-filter="${v}" aria-pressed="${routineFilter===v}">${label}</button>`).join('')}</div><button class="btn primary" data-action="add" data-type="meal">${icon('add',17)} Adicionar</button></div><div class="field search-field"><label for="routine-search">Buscar na rotina</label><input id="routine-search" type="search" value="${esc(searchQuery)}" placeholder="Ex.: almoço, remédio, observação" autocomplete="off"></div><p class="group-title">Ativos <span class="subtle">${active.length}</span></p><div class="stack">${active.length?active.map(routineCard).join(''):empty('Sua rotina está livre','Cadastre o primeiro horário de refeição ou medicamento.','meal')}</div>${archived.length?`<p class="group-title">Arquivados <span class="subtle">${archived.length}</span></p><div class="stack">${archived.map(routineCard).join('')}</div>`:''}${safety}</section>`;
  }
  function renderHistory(){const day=historyDay,today=dateKey(new Date()),d=parseDate(day),list=todayOccs(day),done=list.filter(x=>x.doneAt).length;
    return `<section><p class="eyebrow">Passo a passo</p><h1 class="page-title">Histórico</h1><p class="page-subtitle">Veja os registros de cada dia, com os horários concluídos.</p><div class="panel date-nav"><button class="iconbutton" data-action="day" data-delta="-1" aria-label="Dia anterior">${icon('left',20)}</button><label class="field" style="text-align:center;gap:1px"><strong class="date-header">${day===today?'Hoje':firstUpper(longDate(d))}</strong><input type="date" id="history-date" value="${day}" max="${today}" aria-label="Escolher data do histórico"></label><button class="iconbutton" data-action="day" data-delta="1" aria-label="Próximo dia" ${day>=today?'disabled':''}>${icon('right',20)}</button></div><section class="panel progresscard" style="margin:0 0 16px"><div class="statrow"><strong>Concluídos neste dia</strong><span class="counter">${done} de ${list.length}</span></div><div class="progressTrack"><span style="width:${list.length?100*done/list.length:0}%"></span></div></section><div class="stack">${list.length?list.map(o=>row(o,day!==today)).join(''):empty('Sem horários registrados','Não há registros para esta data.','history')}</div>${safety}</section>`;
  }
  function renderSettings(){const supported='Notification' in window,perm=supported?Notification.permission:'indisponível',installed=window.matchMedia('(display-mode: standalone)').matches,p=state.settings;
    const options=(arr,current)=>arr.map(([v,t])=>`<option value="${v}" ${String(current)===String(v)?'selected':''}>${t}</option>`).join('');
    return `<section><p class="eyebrow">Seu espaço, suas escolhas</p><h1 class="page-title">Personalização</h1><p class="page-subtitle">Cuide da rotina do seu jeito. As escolhas ficam neste aparelho.</p><div class="desktop-columns"><div><section class="panel setting-card"><h2>Identidade e visual</h2><form id="profile-form" class="fieldgrid"><div class="field"><label for="profile-name">Como quer ser chamado(a)</label><input id="profile-name" name="name" type="text" maxlength="60" value="${esc(state.profile.name)}" placeholder="Seu nome" autocomplete="nickname"></div><div class="field"><label for="theme-choice">Aparência</label><select id="theme-choice" data-setting="theme">${options([['system','Acompanhar sistema'],['light','Claro'],['dark','Escuro']],p.theme)}</select></div><div><span class="group-label">Cor do aplicativo</span><div class="palette" role="group" aria-label="Escolher cor">${[['sage','Floresta'],['ocean','Oceano'],['lilac','Lilás'],['coral','Coral'],['amber','Âmbar'],['mint','Menta']].map(([v,label])=>`<button type="button" class="swatch ${v}" data-action="accent" data-accent="${v}" aria-label="${label}" aria-pressed="${p.accent===v}" title="${label}">${p.accent===v?icon('check',18):''}</button>`).join('')}</div></div><div class="fieldrow"><div class="field"><label for="font-scale">Texto</label><select id="font-scale" data-setting="scale">${options([['normal','Padrão'],['large','Grande'],['xlarge','Extra grande']],p.scale)}</select></div><div class="field"><label for="density">Espaçamento</label><select id="density" data-setting="density">${options([['comfortable','Confortável'],['compact','Compacto']],p.density)}</select></div></div><div class="field"><label for="week-start">Primeiro dia da semana</label><select id="week-start" data-setting="weekStart">${options([[1,'Segunda-feira'],[0,'Domingo']],p.weekStart)}</select></div><button class="btn primary" type="submit">Salvar nome</button></form></section><section class="panel setting-card"><h2>Lembretes e alarmes</h2><div class="toggleline"><label for="reminder-switch">Avisos enquanto o app estiver aberto</label><input id="reminder-switch" class="switch" type="checkbox" ${p.reminders?'checked':''}></div><div class="field"><label for="lead-choice">Avisar com antecedência</label><select id="lead-choice" data-setting="lead">${options([[0,'No horário'],[5,'5 minutos antes'],[10,'10 minutos antes'],[15,'15 minutos antes'],[30,'30 minutos antes']],p.lead)}</select></div><div class="toggleline"><label for="private-notification-choice">Ocultar nomes nos avisos da tela bloqueada</label><input id="private-notification-choice" data-setting="privateNotifications" type="checkbox" class="switch" ${p.privateNotifications?'checked':''}></div><p>Por privacidade, notificações do sistema ocultam nomes de medicamentos por padrão. Os detalhes continuam visíveis dentro do aplicativo.</p><div class="toggleline"><label for="sound-choice">Som nos avisos</label><input id="sound-choice" data-setting="sound" type="checkbox" class="switch" ${p.sound?'checked':''}></div><div class="toggleline"><label for="quiet-choice">Modo silencioso à noite</label><input id="quiet-choice" data-setting="quiet" type="checkbox" class="switch" ${p.quiet?'checked':''}></div><div class="fieldrow"><div class="field"><label for="quiet-start">De</label><input id="quiet-start" data-setting="quietStart" type="time" value="${esc(p.quietStart)}"></div><div class="field"><label for="quiet-end">Até</label><input id="quiet-end" data-setting="quietEnd" type="time" value="${esc(p.quietEnd)}"></div></div><p>A permissão atual é <strong>${esc(perm)}</strong>. No celular, avisos usam o Service Worker, quando permitido pelo navegador; não há garantia com o app fechado.</p><button class="btn" data-action="test-alarm">${icon('bell',17)} Testar aviso e som</button></section></div><div><section class="panel setting-card"><h2>Instale como aplicativo</h2><p>${installed?'Está aberto como aplicativo instalado.':'Instale na tela inicial para funcionar offline após a primeira visita.'}</p>${!installed?`<button class="btn primary" data-action="install">${icon('phone',18)} Instalar Cuidador(a)</button>`:''}<p><strong>Android:</strong> Chrome → menu ⋮ → Instalar app. <strong>iOS:</strong> Safari → Compartilhar → Adicionar à Tela de Início.</p></section><section class="panel setting-card"><h2>Alarmes com o app fechado</h2><p>Exporte um calendário recorrente, que usa os lembretes do próprio Android ou iPhone. Confirme as notificações no app de calendário. O arquivo pode conter nomes de medicamentos: trate-o como sensível.</p><button class="btn" data-action="ics" ${!state.items.some(x=>!x.archived)?'disabled':''}>${icon('history',18)} Exportar calendário (.ics)</button></section><section class="panel setting-card"><h2>Seus dados, sob seu controle</h2><p>Os registros ficam apenas neste navegador, sem contas, anúncios, rastreamento ou servidor. Faça backup antes de trocar de aparelho.</p><div class="inline-actions"><button class="btn" data-action="backup">${icon('download',18)} Exportar backup</button><button class="btn" data-action="import">Restaurar backup</button><button class="btn danger" data-action="wipe">Apagar dados</button></div><input class="sr-only" type="file" id="import-file" accept="application/json,.json" aria-label="Escolher backup JSON"></section><section class="panel setting-card"><h2>Transparência e privacidade</h2><p>Consulte como funciona, quais são os limites dos avisos e como os dados são armazenados.</p><div class="inline-actions"><button class="btn small" data-action="legal" data-page="privacidade">Privacidade</button><button class="btn small" data-action="legal" data-page="termos">Termos de uso</button><button class="btn small" data-action="legal" data-page="acessibilidade">Acessibilidade</button></div></section></div></div>${safety}</section>`;
  }
  function renderTimer(){updateTimer();const mm=String(Math.floor(timerRemaining/60)).padStart(2,'0'),ss=String(timerRemaining%60).padStart(2,'0');
   return `<section><p class="eyebrow">Pequenas pausas também são cuidado</p><h1 class="page-title">Timer de cuidados</h1><p class="page-subtitle">Uma contagem simples para descanso, preparo da refeição ou qualquer atividade. Não substitui alarmes de medicamentos.</p><div class="timer-panel panel"><div class="timer-ring" role="timer" aria-label="Tempo restante" aria-live="off"><span id="timer-display">${mm}:${ss}</span></div><p id="timer-status" class="subtle" aria-live="polite">${timerRunning?'Contagem em andamento':timerFinished?'Tempo encerrado':'Pronto para começar'}</p><div class="timer-actions"><button class="btn primary" data-action="timer-toggle">${icon(timerRunning?'pause':'play',18)} <span id="timer-action">${timerRunning?'Pausar':timerFinished?'Reiniciar timer':timerRemaining!==timerDuration?'Continuar':'Iniciar timer'}</span></button><button class="btn" data-action="timer-reset">${icon('refresh',18)} Reiniciar</button></div><p class="group-label">Duração rápida</p><div class="filterRow timer-presets">${[5,10,15,20,25,30,45,60].map(m=>`<button class="filter" data-action="timer-preset" data-minutes="${m}" aria-pressed="${timerDuration===m*60}">${m} min</button>`).join('')}</div><form id="timer-custom-form" class="fieldrow timer-custom"><div class="field"><label for="timer-minutes">Outro tempo (1 a 180 min)</label><input id="timer-minutes" name="minutes" type="number" min="1" max="180" step="1" value="${Math.round(timerDuration/60)}" required></div><button type="submit" class="btn">Aplicar duração</button></form></div></section>`;
  }
  const legalContent={
    privacidade:`<h2 id="legalTitle">Privacidade</h2><p>O Cuidador(a) mantém os dados cadastrados no armazenamento deste navegador e não os transmite para um servidor de cadastro, anúncios ou análise. Sem login e sem sincronização em nuvem nesta versão. Quem acessar o mesmo perfil do navegador pode acessar os dados. Backups JSON e calendários ICS podem conter informações de saúde e devem ser armazenados com cuidado.</p><p>Para excluir seus registros, limpe os dados do site no navegador. O fechamento da aba não exclui os registros. Recursos de notificação dependem de permissão explícita e da plataforma. Esta ferramenta não comercializa dados pessoais.</p>`,
    termos:`<h2 id="legalTitle">Termos de uso</h2><p>O Cuidador(a) é um organizador pessoal de compromissos, refeições e medicamentos, não um serviço médico. Não prescreve tratamento, não recomenda doses e não verifica interações entre medicamentos. Cadastre exclusivamente os horários informados pelo profissional responsável.</p><p>Os alarmes web podem falhar se o sistema suspender a execução, bloquear notificações ou o dispositivo estiver sem energia. Não dependa deste aplicativo como seu único mecanismo de lembrete de medicamentos. Para doses esquecidas, consulte o profissional ou a bula; nunca dobre por orientação do aplicativo.</p>`,
    acessibilidade:`<h2 id="legalTitle">Acessibilidade</h2><p>Use a personalização de texto grande, o modo escuro, os alvos de toque ampliados, o teclado e os indicadores textuais de estado. Para melhorias, registre um relato no repositório oficial quando publicado. O projeto respeita a preferência de redução de movimento do sistema.</p>`
  };
  function renderOnboard(){const options=[['Café da manhã','07:30'],['Almoço','12:00'],['Lanche','16:00'],['Jantar','19:00']];return `<section class="onboard"><div class="onboard-header"><span class="brandmark">${icon('sun',30)}</span><p class="eyebrow">Boas-vindas</p><h1>Mais leveza para sua rotina.</h1><p class="subtle">Refeições e medicamentos no seu tempo, sem complicação.</p></div><div class="panel"><form id="onboard-form" class="fieldgrid"><div class="field"><label for="onboard-name">Como podemos chamar você?</label><input id="onboard-name" name="name" maxlength="60" placeholder="Seu nome (opcional)" autocomplete="nickname"></div><div><p class="group-label">Quer começar com refeições?</p><p class="help">São apenas sugestões editáveis. Desmarque o que não quiser.</p>${options.map(([label,time],i)=>`<div class="meal-preset"><input type="checkbox" checked id="meal-${i}" name="meal-${i}"><span><label for="meal-${i}">${label}</label></span><input type="time" id="time-${i}" name="time-${i}" value="${time}" aria-label="Horário de ${label}"></div>`).join('')}</div><p class="help">Não adicionamos medicamentos automaticamente. Cadastre somente conforme sua prescrição.</p><button class="btn primary full" type="submit">Criar minha rotina ${icon('right',18)}</button><button class="btn ghost full" type="button" data-action="skip">Começar sem horários</button></form></div></section>`}
  function render(){const prefs=normalizePreferences(state.settings);const dark=prefs.theme==='dark'||(prefs.theme==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.dataset.accent=prefs.accent;document.documentElement.dataset.scale=prefs.scale;document.documentElement.dataset.density=prefs.density;document.querySelector('meta[name="theme-color"]').content=dark?'#14231e':'#17483f';const root=document.getElementById('app');
    if(!state.profile.onboarded){root.innerHTML=`<div class="app-frame">${renderOnboard()}</div>`;return}
    root.innerHTML=`<div class="app-frame">${header()}<main id="main-content">${tab==='routine'?renderRoutine():tab==='history'?renderHistory():tab==='settings'?renderSettings():tab==='timer'?renderTimer():renderToday()}</main></div>${bottomNav()}`;
  }
  function toast(message){const elem=document.getElementById('toast');elem.textContent=message;elem.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>elem.classList.remove('show'),3800)}
  function mark(key){const [day,id,time]=key.split('|');if(day!==dateKey(new Date())){toast('Altere somente os registros do dia atual.');return}let item=state.items.find(x=>x.id===id);const prev=state.logs[key];if(!prev&&!item){toast('Esse item já foi removido.');return}
    setState(s=>{const logs={...s.logs};if(logs[key])delete logs[key];else logs[key]={doneAt:new Date().toISOString(),snapshot:{title:item.title,type:item.type,dose:item.dose,note:item.note}};return {...s,logs}});toast(prev?'Conclusão desfeita.':'Horário marcado como concluído.');
  }
  const openDialog=dialog=>{if(!dialog.open)dialog.showModal()};
  function openEditor(item=null,type='meal'){
    const box=document.getElementById('editDialog'),current=item||{type,title:'',dose:'',note:'',days:[0,1,2,3,4,5,6],times:[new Date().toTimeString().slice(0,5)]};
    box.innerHTML=`<form id="item-form" class="fieldgrid"><h2 id="dialogTitle">${item?'Editar horário':'Novo horário'}</h2><div class="field"><label for="item-type">Categoria</label><select id="item-type" name="type"><option value="meal" ${current.type==='meal'?'selected':''}>Refeição</option><option value="med" ${current.type==='med'?'selected':''}>Medicamento</option></select></div><div class="field"><label for="item-title">${current.type==='med'?'Nome do medicamento':'Nome da refeição'}</label><input id="item-title" name="title" type="text" maxlength="100" placeholder="Ex.: ${current.type==='med'?'Medicamento prescrito':'Café da manhã'}" value="${esc(current.title)}" required></div><div class="field" id="dose-field" ${current.type==='med'?'':'hidden'}><label for="item-dose">Dose escrita na receita (opcional)</label><input id="item-dose" type="text" name="dose" maxlength="100" placeholder="Copie exatamente a prescrição" value="${esc(current.dose)}"></div><div class="field"><label for="item-times">Horário${current.type==='med'?'s':''}</label><input id="item-times" name="times" type="text" inputmode="text" placeholder="08:00${current.type==='med'?', 20:00':''}" value="${esc(current.times.join(', '))}" required><p class="help" id="times-help">Use formato 24h (HH:mm). Para vários horários, separe com vírgula.</p></div><div><span class="group-label">Dias da semana</span><div class="daysrow" style="margin-top:9px">${WEEK.map((x,i)=>`<span class="daybox"><input id="dow-${i}" type="checkbox" name="days" value="${i}" ${current.days.includes(i)?'checked':''}><label for="dow-${i}" aria-label="${WEEKLONG[i]}">${x}</label></span>`).join('')}</div></div><div class="field"><label for="item-note">Observações (opcional)</label><textarea id="item-note" name="note" maxlength="500" placeholder="Detalhes que você quer lembrar">${esc(current.note)}</textarea></div><p class="help">Horários e doses de medicamentos devem vir de sua prescrição, nunca de sugestões do aplicativo.</p><div class="form-actions"><button class="btn ghost" type="button" data-action="close-edit">Cancelar</button><button class="btn primary" type="submit">Salvar horário</button></div></form>`;
    box.dataset.id=item?.id||'';openDialog(box);box.querySelector('#item-title').focus();
    const sel=box.querySelector('#item-type');sel.addEventListener('change',()=>{box.querySelector('#dose-field').hidden=sel.value!=='med';box.querySelector('label[for="item-title"]').textContent=sel.value==='med'?'Nome do medicamento':'Nome da refeição';box.querySelector('label[for="item-times"]').textContent=sel.value==='med'?'Horários':'Horário'});
    box.querySelector('form').addEventListener('submit',e=>{
      e.preventDefault();const data=new FormData(e.target),timesRaw=String(data.get('times')).split(',').map(t=>t.trim()),times=[...new Set(timesRaw)];const days=data.getAll('days').map(Number),title=String(data.get('title')).trim(),type=String(data.get('type'));
      if(!title||times.length<1||times.length>24||times.some(t=>!isTime(t))){toast('Preencha um nome e horários válidos (HH:mm).');return}
      if(type==='meal'&&times.length!==1){toast('Para cada refeição, informe um único horário.');return}
      if(days.length===0){toast('Selecione pelo menos um dia.');return}
      const entry={id:item?.id||uid(),type,title,dose:type==='med'?String(data.get('dose')||'').trim():'',note:String(data.get('note')||'').trim(),days:days.sort(),times:times.sort(),archived:item?.archived||false,createdAt:item?.createdAt||new Date().toISOString()};
      setState(s=>({...s,items:item?s.items.map(x=>x.id===item.id?entry:x):[...s.items,entry]}));box.close();toast(item?'Horário atualizado.':'Horário adicionado.');
    });
  }
  function confirmDelete(item){const dlg=document.getElementById('confirmDialog');dlg.innerHTML=`<h2 id="confirmTitle">Excluir ${esc(item.title)}?</h2><p class="subtle">O horário sairá da sua rotina. Registros já concluídos continuarão no histórico.</p><div class="form-actions"><button class="btn ghost" type="button" data-action="cancel-delete">Cancelar</button><button class="btn danger" type="button" data-action="confirm-delete" data-id="${item.id}">Excluir</button></div>`;openDialog(dlg)}
  function exportFile(filename,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
  function icsEscape(v){return String(v).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;')}
  function icsFold(line){let buffer='',out='',bytes=0;const enc=new TextEncoder();for(const ch of line){const n=enc.encode(ch).length;if(bytes+n>73){out+=buffer+'\r\n ';buffer='';bytes=1}buffer+=ch;bytes+=n}return out+buffer}
  const fmtICS=d=>`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}00`;
  function makeICS(){const days=['SU','MO','TU','WE','TH','FR','SA'],parts=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Cuidador(a)//Rotina//PT-BR','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Cuidador(a)'];let count=0;
    for(const item of state.items.filter(x=>!x.archived))for(const time of item.times){const next=new Date(),diff=Array.from({length:7},(_,i)=>i).find(i=>item.days.includes(new Date(next.getFullYear(),next.getMonth(),next.getDate()+i).getDay()));if(diff===undefined)continue;
      const start=new Date(next.getFullYear(),next.getMonth(),next.getDate()+diff,Number(time.slice(0,2)),Number(time.slice(3))),end=new Date(start.getTime()+10*60*1000);
      parts.push('BEGIN:VEVENT',`UID:${item.id}-${time.replace(':','')}@meu-ritmo.local`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART:${fmtICS(start)}`,`DTEND:${fmtICS(end)}`,`RRULE:FREQ=WEEKLY;BYDAY=${item.days.map(x=>days[x]).join(',')}`,`SUMMARY:${icsEscape(item.title)}`,`DESCRIPTION:${icsEscape([item.type==='med'?'Medicamento':'Refeição',item.dose,item.note].filter(Boolean).join(' | '))}`,'BEGIN:VALARM',`TRIGGER:${state.settings.lead===0?'PT0M':`-PT${state.settings.lead}M`}`,'ACTION:DISPLAY',`DESCRIPTION:${icsEscape('Lembrete: '+item.title)}`,'END:VALARM','END:VEVENT');count++}
    parts.push('END:VCALENDAR');if(!count){toast('Cadastre um horário antes de exportar.');return}exportFile('cuidadora-calendario.ics',parts.map(icsFold).join('\r\n')+'\r\n','text/calendar;charset=utf-8');toast('Calendário exportado. Ative os avisos no app de calendário.');
  }
  function downloadBackup(){exportFile('cuidadora-backup-'+dateKey(new Date())+'.json',JSON.stringify(state,null,2),'application/json;charset=utf-8');toast('Backup salvo.')}
  async function importBackup(file){if(!file)return;try{if(file.size>2e6)throw new Error('O arquivo é grande demais (máximo 2 MB).');const parsed=validate(JSON.parse(await file.text()));const dlg=document.getElementById('confirmDialog');dlg.innerHTML=`<h2 id="confirmTitle">Substituir seus dados?</h2><p class="subtle">Importar este backup substituirá os cadastros e o histórico atuais deste navegador. Exporte um backup antes, se quiser guardá-los.</p><div class="form-actions"><button class="btn ghost" type="button" data-action="cancel-delete">Cancelar</button><button class="btn primary" type="button" id="apply-import">Importar backup</button></div>`;openDialog(dlg);dlg.querySelector('#apply-import').addEventListener('click',()=>{state=parsed;save();dlg.close();tab='today';render();toast('Backup importado com sucesso.')},{once:true})}catch(err){toast('Não foi possível importar: '+err.message)}}
  async function activateReminders(enabled){state.settings.reminders=enabled;save();if(enabled&&'Notification' in window&&Notification.permission==='default'){try{await Notification.requestPermission()}catch{}}render();toast(enabled?'Avisos ativados enquanto o aplicativo estiver aberto.':'Avisos desativados.')}
  async function showSystemNotice(title,body,tag){try{if(!('serviceWorker' in navigator))return;const reg=await navigator.serviceWorker.ready;await reg.showNotification(title,{body,icon:'./assets/icon-192.png',badge:'./assets/icon-192.png',tag,renotify:false});}catch(err){console.warn('Notificação indisponível:',err)}}
  function beep(){if(!state.settings.sound)return;try{const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;const ctx=new Context();const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.value=680;gain.gain.setValueAtTime(.0001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.12,ctx.currentTime+.02);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.27);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.3);osc.onended=()=>void ctx.close()}catch{}}
  function checkReminders(){
    if(!state.settings.reminders||document.visibilityState!=='visible'||!state.profile.onboarded)return;
    const d=new Date(),now=d.getTime();let changed=false;
    // Include next day's schedules so a 00:02 reminder with 5-minute lead can fire at 23:57.
    const days=[0,1].map(offset=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+offset));
    for(const date of days)for(const o of todayOccs(dateKey(date))){
      const scheduled=new Date(date.getFullYear(),date.getMonth(),date.getDate(),Number(o.time.slice(0,2)),Number(o.time.slice(3))).getTime();
      if(o.doneAt||!isReminderWindow(now,scheduled,state.settings.lead)||state.noticeLog[o.key])continue;
      state.noticeLog[o.key]=true;changed=true;
      toast(`Lembrete: ${o.title} (${o.time}).`);
      if(!(state.settings.quiet&&inQuietHours(d.toTimeString().slice(0,5),state.settings.quietStart,state.settings.quietEnd))){
        beep();
        if('Notification' in window&&Notification.permission==='granted'){
          const notice=reminderContent(o,state.settings.privateNotifications);
          void showSystemNotice(notice.title,notice.body,o.key);
        }
      }
    }
    if(changed){const cutoff=dateKey(new Date(d.getFullYear(),d.getMonth(),d.getDate()-14));state.noticeLog=Object.fromEntries(Object.entries(state.noticeLog).filter(([key])=>key.slice(0,10)>=cutoff));save()}
  }
  function timerTick(){
    const finished=updateTimer();
    const el=document.getElementById('timer-display');
    if(el)el.textContent=`${String(Math.floor(timerRemaining/60)).padStart(2,'0')}:${String(timerRemaining%60).padStart(2,'0')}`;
    if(finished){toast('O timer terminou.');beep();if(state.settings.reminders&&'Notification' in window&&Notification.permission==='granted')void showSystemNotice('Timer concluído','Seu tempo terminou.','cuidadora-timer-fim');if(tab==='timer')render()}
  }
  function setTimerMinutes(min){if(!Number.isInteger(min)||min<1||min>180){toast('Escolha entre 1 e 180 minutos.');return}timerRunning=false;timerDeadline=null;timerFinished=false;timerDuration=min*60;timerRemaining=timerDuration;saveTimer();render()}
  document.addEventListener('click',async e=>{const el=e.target.closest('[data-action]');if(!el)return;const action=el.dataset.action,id=el.dataset.id;
    if(action==='tab'){e.preventDefault();tab=el.dataset.tab;render();window.scrollTo({top:0,behavior:'instant'});return}
    if(action==='skip'){state.profile.onboarded=true;save();render();return}
    if(action==='filter'){filter=el.dataset.filter;render();return}
    if(action==='routine-filter'){routineFilter=el.dataset.filter;render();return}
    if(action==='status-filter'){statusFilter=el.dataset.filter;render();return}
    if(action==='timer-toggle'){updateTimer();if(timerRunning){timerRunning=false;timerDeadline=null}else{if(timerRemaining===0)timerRemaining=timerDuration;timerRunning=true;timerDeadline=Date.now()+timerRemaining*1000;timerFinished=false}saveTimer();render();return}
    if(action==='timer-reset'){timerRunning=false;timerDeadline=null;timerRemaining=timerDuration;timerFinished=false;saveTimer();render();return}
    if(action==='timer-preset'){setTimerMinutes(Number(el.dataset.minutes));return}
    if(action==='accent'){state.settings.accent=el.dataset.accent;save();render();return}
    if(action==='wipe'){const dlg=document.getElementById('confirmDialog');dlg.innerHTML=`<h2 id="confirmTitle">Apagar todos os dados?</h2><p>Essa ação apaga definitivamente horários, medicamentos, histórico e preferências neste navegador. Antes, exporte um backup se quiser.</p><div class="form-actions"><button class="btn" data-action="cancel-delete">Cancelar</button><button class="btn danger" data-action="wipe-confirm">Apagar permanentemente</button></div>`;openDialog(dlg);return}
    if(action==='wipe-confirm'){localStorage.removeItem(KEY);localStorage.removeItem(LEGACY);localStorage.removeItem(TIMERKEY);state=initial();timerRunning=false;timerDeadline=null;timerFinished=false;timerDuration=15*60;timerRemaining=timerDuration;tab='today';document.getElementById('confirmDialog').close();render();toast('Dados apagados deste navegador.');return}
    if(action==='test-alarm'){toast('Este é um aviso de teste.');beep();if('Notification' in window&&Notification.permission==='granted')void showSystemNotice('Cuidador(a) — teste','Notificação de teste',`test-${Date.now()}`);return}
    if(action==='legal'){const dlg=document.getElementById('legalDialog');dlg.innerHTML=(legalContent[el.dataset.page]||legalContent.privacidade)+`<div class="form-actions"><button class="btn primary" data-action="close-legal">Entendi</button></div>`;openDialog(dlg);return}
    if(action==='close-legal'){document.getElementById('legalDialog').close();return}
    if(action==='add'){openEditor(null,el.dataset.type||'meal');return}
    if(action==='edit'){const item=state.items.find(x=>x.id===id);if(item)openEditor(item);return}
    if(action==='archive'){setState(s=>({...s,items:s.items.map(x=>x.id===id?{...x,archived:!x.archived}:x)}));toast('Rotina atualizada.');return}
    if(action==='delete'){const item=state.items.find(x=>x.id===id);if(item)confirmDelete(item);return}
    if(action==='confirm-delete'){setState(s=>({...s,items:s.items.filter(x=>x.id!==id)}));document.getElementById('confirmDialog').close();toast('Horário removido.');return}
    if(action==='cancel-delete'){document.getElementById('confirmDialog').close();return}
    if(action==='close-edit'){document.getElementById('editDialog').close();return}
    if(action==='toggle'){mark(el.dataset.key);return}
    if(action==='day'){const d=parseDate(historyDay);d.setDate(d.getDate()+Number(el.dataset.delta));if(dateKey(d)<=dateKey(new Date())){historyDay=dateKey(d);render()}return}
    if(action==='backup'){downloadBackup();return}
    if(action==='import'){document.getElementById('import-file').click();return}
    if(action==='ics'){makeICS();return}
    if(action==='install'){if(deferredInstall){deferredInstall.prompt();const r=await deferredInstall.userChoice;deferredInstall=null;if(r?.outcome==='accepted')toast('Instalação iniciada.')}else toast('Abra o menu do navegador e escolha Instalar app ou Adicionar à tela inicial.');return}
  });
  document.addEventListener('submit',e=>{if(e.target?.id==='onboard-form'){e.preventDefault();const data=new FormData(e.target);const times=['Café da manhã','Almoço','Lanche','Jantar'];const items=[];for(let i=0;i<4;i++){if(!data.get('meal-'+i))continue;const time=data.get('time-'+i);if(!isTime(time)){toast('Corrija os horários das refeições.');return}items.push({id:uid(),type:'meal',title:times[i],dose:'',note:'',times:[time],days:[0,1,2,3,4,5,6],archived:false,createdAt:new Date().toISOString()})}state.profile={name:String(data.get('name')||'').trim().slice(0,60),onboarded:true};state.items=items;save();render();toast('Sua rotina começou! Os horários podem ser editados.');}
    if(e.target?.id==='timer-custom-form'){e.preventDefault();setTimerMinutes(Number(new FormData(e.target).get('minutes')));return}
    if(e.target?.id==='profile-form'){e.preventDefault();state.profile.name=String(new FormData(e.target).get('name')||'').trim().slice(0,60);save();render();toast('Perfil atualizado.')}
  });
  document.addEventListener('change',e=>{
    if(e.target.dataset?.setting){const k=e.target.dataset.setting;const v=e.target.type==='checkbox'?e.target.checked:(['lead','weekStart'].includes(k)?Number(e.target.value):e.target.value);state.settings=normalizePreferences({...state.settings,[k]:v});save();render();return}
    if(e.target.id==='reminder-switch'){void activateReminders(e.target.checked);return}
    if(e.target.id==='history-date'){const d=e.target.value;if(/^\d{4}-\d\d-\d\d$/.test(d)&&dateKey(parseDate(d))===d&&d<=dateKey(new Date())){historyDay=d;render()}return}
    if(e.target.id==='import-file'){void importBackup(e.target.files?.[0]);e.target.value='';return}
  });
  document.addEventListener('input',e=>{if(e.target.id==='routine-search'){const value=e.target.value,caret=e.target.selectionStart;searchQuery=value;const root=document.getElementById('main-content');if(root){const cards=root.querySelectorAll('.routine-card');cards.forEach(c=>{c.hidden=!c.textContent.toLocaleLowerCase('pt-BR').includes(value.toLocaleLowerCase('pt-BR'))})}}});
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(state.settings.theme==='system')render()});
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e});
  window.addEventListener('appinstalled',()=>{deferredInstall=null;toast('Cuidador(a) instalado.')});
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Service Worker:',err)));
  window.addEventListener('storage',e=>{
    if(e.key===KEY){
      if(e.newValue===null){state=initial();render();return}
      try{state=validate(JSON.parse(e.newValue));render()}catch{}
    }
    if(e.key===TIMERKEY){
      let next;try{next=restoreTimer(JSON.parse(e.newValue),Date.now())}catch{next=restoreTimer(null)}
      timerDuration=next.duration;timerRemaining=next.remaining;timerRunning=next.running;timerDeadline=next.deadline;timerFinished=next.finished;
      if(tab==='timer')render();
    }
  });
  let lastDay=dateKey(new Date());setInterval(()=>{const day=dateKey(new Date());if(day!==lastDay){lastDay=day;historyDay=day;render()}else if(tab==='today'&&state.profile.onboarded)render();checkReminders()},30000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){if(tab==='today')render();checkReminders()}});
  setInterval(timerTick,400);render();checkReminders();
})();
