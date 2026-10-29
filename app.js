import {chatMarkup,mountRoomChat,chatDraftForRoom} from './chat.mjs';
import {changeOccurrenceTime,removeOccurrenceTime,occurrenceDisplay} from './timeline.mjs';
import {normalizePreferences,formatCountdown,isReminderWindow,reminderContent,inQuietHours,remainingSeconds,restoreTimer,todayHeroState,routineMatches,shouldRefreshToday,timerProgressPercent} from './core.mjs';
import {createCredentials,completeCredentials,parseRoomFragment,buildRoomFragment,roomCanEdit,roomCanSend,roomCanReceive,timelineActionDisabled,sharedSnapshot,encryptRoom,decryptRoom,syncPlan,roomStatusLabel,roomRefreshIntervalMs,ROOM_STORAGE} from './room.mjs';
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
    eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    shield:'<path d="M12 2l9 4v6c0 6-4 9-9 10-5-1-9-4-9-10V6z"/><path d="m9 12 2 2 4-4"/>',
    leaf:'<path d="M20 4C10 4 5 8 4 15c-1 7 8 8 12 2 3-5 4-13 4-13Z"/><path d="M4 20c3-7 7-10 12-12"/>',
    users:'<circle cx="9" cy="8" r="3"/><path d="M2 21v-2a7 7 0 0 1 14 0v2M17 11a3 3 0 1 0-2-5M17 16a5 5 0 0 1 5 5"/>',
    link:'<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    volume:'<path d="M11 5 6 9H3v6h3l5 4V5ZM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>'
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
  let room=null,roomVersion=0,roomDirty=false,roomConflict=false,roomSyncedAt=0,roomSnapshot='',roomBusy=false,roomError='',roomDebounce=null,pendingInvitation=parseRoomFragment(location.hash);
  try{const r=JSON.parse(localStorage.getItem(ROOM_STORAGE)||'null');if(r&&/^[\w-]{22}$/.test(r.id)&&/^[\w-]{43}$/.test(r.key)){room={id:r.id,key:r.key,...(r.editorSecret?{editorSecret:r.editorSecret}:(r.role==='viewer'?(r.unsafeReadOnly?{unsafeReadOnly:true}:{}):{legacy:true}))};roomVersion=Number(r.version)||0;roomDirty=r.dirty===true;roomConflict=r.conflict===true;roomSyncedAt=Number(r.syncedAt)||0;}}catch{}
  const persistRoom=()=>{try{if(room)localStorage.setItem(ROOM_STORAGE,JSON.stringify({id:room.id,key:room.key,...(room.editorSecret?{editorSecret:room.editorSecret}:{}),...(room.unsafeReadOnly?{unsafeReadOnly:true}:{}),role:roomCanEdit(room)?'editor':'viewer',...(!room.editorSecret&&room.legacy?{legacy:true}:{}),version:roomVersion,dirty:roomDirty,conflict:roomConflict,syncedAt:roomSyncedAt}));else localStorage.removeItem(ROOM_STORAGE)}catch{}};
  let stopChat=()=>{},chatRoomMounted=null,chatDraftMemory=null;
  let state=initial();
  try {const raw=localStorage.getItem(KEY)||localStorage.getItem(LEGACY);if(raw)state=validate(JSON.parse(raw))}catch(err){console.warn('Armazenamento recuperado com padrão seguro:',err)}
  let tab='today',filter='all',statusFilter='all',routineFilter='all',historyDay=dateKey(new Date()),deferredInstall=null,toastTimer=0,storageWarned=false,searchQuery='';
  const CONFLICT_BLOCKED_ACTIONS=new Set(['add','edit','archive','delete','confirm-delete','timeline-edit','timeline-remove','timeline-confirm-remove','timeline-full-edit','wipe-routines','wipe-routines-confirm','import','accent']);
  const conflictMessage='Conflito de sincronização. Faça um backup e resolva o conflito na aba Sala antes de editar horários.';
  let recoveredTimer;
  try {recoveredTimer=restoreTimer(JSON.parse(localStorage.getItem(TIMERKEY)),Date.now())}catch{recoveredTimer=restoreTimer(null)}
  let timerDuration=recoveredTimer.duration,timerRemaining=recoveredTimer.remaining,timerRunning=recoveredTimer.running,timerDeadline=recoveredTimer.deadline,timerFinished=recoveredTimer.finished;
  function saveTimer(){try{localStorage.setItem(TIMERKEY,JSON.stringify({duration:timerDuration,remaining:timerRemaining,running:timerRunning,deadline:timerDeadline,finished:timerFinished}))}catch{}}
  function updateTimer(){if(timerRunning&&timerDeadline){timerRemaining=remainingSeconds(timerDeadline,Date.now());if(timerRemaining===0){timerRunning=false;timerDeadline=null;timerFinished=true;saveTimer();return true}}return false}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{if(!storageWarned){toast('Não foi possível salvar. Exporte um backup e libere espaço.');storageWarned=true}}
    if(room&&roomCanEdit(room)&&roomVersion&&JSON.stringify(sharedSnapshot(state))!==roomSnapshot){roomDirty=true;persistRoom();clearTimeout(roomDebounce);roomDebounce=setTimeout(()=>void pushRoom(),1400)}
  }
  function setState(changer){state=changer(state);save();render()}
  function notifyTitle(s){return s.type==='med'?'Medicamento':'Refeição'}
  function todayOccs(day){
    const d=parseDate(day),dow=d.getDay(),minutes=new Date().getHours()*60+new Date().getMinutes(),isToday=day===dateKey(new Date()),found=new Map();
    for(const item of state.items){if(item.archived||!item.days.includes(dow))continue;
      for(const time of item.times){const key=`${day}|${item.id}|${time}`;
        found.set(key,occurrenceDisplay(item,day,time,state.logs[key],isToday?minutes:null));
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
    const canManage=!readOnly&&!o.historical&&(!room||roomCanEdit(room))&&!roomConflict&&state.items.some(x=>x.id===o.id&&!x.archived);
    return `<article class="entry timeline-entry" data-occ-key="${esc(o.key)}"><div class="entry-head">${mealIcon(o)}<div class="entry-info"><strong>${esc(o.title)}${o.dose?' · '+esc(o.dose):''}</strong><p>${esc(notifyTitle(o))}${timeDone}</p></div><div class="entry-right"><span class="entry-time">${esc(o.time)}</span><span class="status ${o.status==='done'?'done':o.status==='late'?'late':'future'}">${statusText(o)}</span></div>${!readOnly?`<button class="iconbutton ${o.doneAt?'checked':''}" data-action="toggle" data-key="${esc(o.key)}" aria-label="${o.doneAt?'Desfazer conclusão de':'Marcar como concluído'} ${esc(o.title)} às ${esc(o.time)}" title="${o.doneAt?'Desfazer':'Concluir'}">${icon(o.doneAt?'undo':'check',18)}</button>`:''}</div>${canManage?`<div class="timeline-manage"><button class="btn small ghost" data-action="timeline-edit" data-id="${esc(o.id)}" data-time="${esc(o.time)}" aria-label="Alterar horário ${esc(o.time)} da rotina ${esc(o.title)}">${icon('pencil',16)} Alterar</button><button class="btn small ghost timeline-delete" data-action="timeline-remove" data-id="${esc(o.id)}" data-time="${esc(o.time)}" aria-label="Excluir horário ${esc(o.time)} da rotina ${esc(o.title)}">${icon('trash',16)} Excluir</button></div>`:''}</article>`;
  }
  const safety=`<aside class="disclaimer">${icon('leaf',16)} <strong>Saúde em primeiro lugar.</strong> Siga sempre a receita e as orientações do profissional de saúde. Em caso de dose esquecida, consulte a bula ou seu profissional — não dobre a dose.</aside>`;
  function empty(title,detail,kind='clock') {return `<div class="empty"><div class="emptyicon">${icon(kind,27)}</div><h3>${esc(title)}</h3><p>${esc(detail)}</p></div>`}
  function header(){return `<header class="topbar"><a class="brand" href="#hoje" data-action="tab" data-tab="today" aria-label="Cuidador(a), início"><span class="brandmark">${icon('sun',24)}</span><span>cuidador(a)<small>um cuidado de cada vez</small></span></a><div class="topbar-actions"><span class="date-chip">${firstUpper(new Intl.DateTimeFormat('pt-BR',{day:'numeric',month:'short'}).format(new Date()))}</span><button type="button" class="header-help" data-action="help" aria-label="Abrir ajuda PG Bot"><img src="./assets/pg-bot.webp" alt="" width="26" height="30" decoding="async"><span>Ajuda</span></button></div></header>`}
  function bottomNav(){return `<nav class="tabbar" aria-label="Navegação principal"><div class="tabbar-inner">${[['today','home','Hoje'],['routine','list','Rotina'],['room','users','Sala'],['timer','timer','Timer'],['history','history','Histórico'],['settings','settings','Ajustes']].map(([id,ico,title])=>`<button class="tabbtn" data-action="tab" data-tab="${id}" ${tab===id?'aria-current="page"':''}>${icon(ico,20)}<span>${title}</span></button>`).join('')}</div></nav>`}
  function greeting(){const h=new Date().getHours();return h<12?'Bom dia':h<18?'Boa tarde':'Boa noite'}
  function renderToday(){
    const day=dateKey(new Date()),list=todayOccs(day),done=list.filter(o=>o.doneAt).length,percentage=list.length?Math.round(done/list.length*100):0,now=new Date(),mins=now.getHours()*60+now.getMinutes();
    const next=list.find(o=>!o.doneAt&&Number(o.time.slice(0,2))*60+Number(o.time.slice(3))>=mins);
    const filtered=list.filter(o=>(filter==='all'||o.type===filter)&&(statusFilter==='all'||statusFilter===o.status));
    const intro=state.profile.name.trim()?`, ${esc(state.profile.name.trim().split(/\s+/)[0])}`:'';
    const nextHero=next?`<div class="hero-kicker">${icon(next.type==='med'?'med':'meal',17)} Próximo horário</div><div class="bigtime">${next.time}</div><h2>${esc(next.title)}</h2><div class="hero-meta">${next.dose?esc(next.dose)+' · ':''}${formatCountdown(Number(next.time.slice(0,2))*60+Number(next.time.slice(3))-mins)}</div><div class="hero-footer"><span class="pill white">${icon('clock',15)} ${esc(notifyTitle(next))}</span></div>`:`<div class="hero-kicker">${icon('sun',17)} Rotina do dia</div><h2 style="margin-top:32px">${esc(todayHeroState(list).title)}</h2><p class="hero-meta">${esc(todayHeroState(list).description)}</p><div class="hero-footer"><button class="btn" data-action="add" data-type="meal" ${room&&!roomCanEdit(room)?'disabled':''}>${icon('add',17)} Novo horário</button></div>`;
    return `<div><p class="eyebrow">${firstUpper(longDate(new Date()))}</p><h1>${greeting()}${intro}<span style="color:#85aa91">.</span></h1><p class="page-subtitle">Sua rotina organizada, um horário de cada vez.</p><div class="dashboard"><section class="hero" aria-label="Próximo compromisso">${nextHero}</section><section class="panel progresscard"><div class="statrow"><strong>Seu progresso hoje</strong><span class="subtle counter">${done} de ${list.length}</span></div><div class="progressTrack" role="progressbar" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="${list.length}" aria-label="Compromissos concluídos"><span style="width:${percentage}%"></span></div><p class="subtle" style="font-size:.81rem;margin:14px 0 0">${list.length?`${percentage}% da rotina concluída. Cada cuidado conta.`:'Seus horários vão aparecer aqui.'}</p><div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:20px"><button class="btn small" data-action="add" data-type="meal" ${room&&!roomCanEdit(room)?'disabled':''}>${icon('meal',16)} Refeição</button><button class="btn small" data-action="add" data-type="med" ${room&&!roomCanEdit(room)?'disabled':''}>${icon('med',16)} Remédio</button></div></section></div>${room?`<div class="timeline-sync" role="status"><span>${icon('users',16)} ${esc(roomStatusLabel({busy:roomBusy,offline:!navigator.onLine,conflict:roomConflict,dirty:roomDirty}))}</span><button class="btn small" data-action="${roomConflict?'room-open':'room-sync'}" ${timelineActionDisabled({busy:roomBusy,online:navigator.onLine,conflict:roomConflict})?'disabled':''}>${icon('refresh',15)} ${roomConflict?'Resolver':'Sincronizar'}</button></div>`:''}<div class="sectionhead"><h2>Linha do tempo</h2><span class="subtle" style="font-size:.77rem">${list.length} horários</span></div><div class="filterRow" role="group" aria-label="Filtrar horários">${[['all','Todos'],['meal','Refeições'],['med','Remédios']].map(([v,label])=>`<button class="filter" data-action="filter" data-filter="${v}" aria-pressed="${filter===v}">${label}</button>`).join('')}</div><div class="filterRow secondaryFilters" role="group" aria-label="Filtrar por situação">${[['all','Todas'],['pending','Pendentes'],['late','Atrasadas'],['done','Concluídas']].map(([v,label])=>`<button class="chip-filter" data-action="status-filter" data-filter="${v}" aria-pressed="${statusFilter===v}">${label}</button>`).join('')}</div><div class="stack" style="margin-top:15px">${filtered.length?filtered.map(o=>row(o)).join(''):empty('Nada por aqui','Adicione um horário ou escolha outro filtro.','sun')}</div>${safety}</div>`;
  }
  function routineCard(item){return `<article class="panel routine-card" data-routine-id="${esc(item.id)}" ${routineMatches(item,searchQuery)?'':'hidden'}><div class="routine-details">${mealIcon(item)}<div class="entry-info"><strong>${esc(item.title)}${item.dose?' · '+esc(item.dose):''}</strong><p>${item.times.map(esc).join(' • ')} · ${esc(daysLabel(item.days))}</p></div></div>${item.note?`<p class="routine-note">${esc(item.note)}</p>`:''}<div class="routine-more" ${room&&!roomCanEdit(room)?'hidden':''}><button class="btn small ghost" data-action="edit" data-id="${item.id}">${icon('pencil',15)} Editar</button><button class="btn small ghost" data-action="archive" data-id="${item.id}">${icon(item.archived?'restore':'archive',15)} ${item.archived?'Reativar':'Arquivar'}</button><button class="btn small danger" data-action="delete" data-id="${item.id}">${icon('trash',15)} Excluir</button></div></article>`}
  function renderRoutine(){const list=state.items.filter(x=>routineFilter==='all'||x.type===routineFilter),active=list.filter(x=>!x.archived),archived=list.filter(x=>x.archived);const visibleActive=active.filter(x=>routineMatches(x,searchQuery)).length,visibleArchived=archived.filter(x=>routineMatches(x,searchQuery)).length;
    return `<section><p class="eyebrow">Organize sua semana</p><h1 class="page-title">Minha rotina</h1><p class="page-subtitle">Você decide os horários e pode mudar quando precisar.</p><div class="toolRow"><div class="filterRow">${[['all','Tudo'],['meal','Refeições'],['med','Remédios']].map(([v,label])=>`<button class="filter" data-action="routine-filter" data-filter="${v}" aria-pressed="${routineFilter===v}">${label}</button>`).join('')}</div><button class="btn primary" data-action="add" data-type="${routineFilter==='med'?'med':'meal'}" aria-label="${routineFilter==='med'?'Adicionar medicamento':'Adicionar refeição'}" ${room&&!roomCanEdit(room)?'disabled':''}>${icon('add',17)} Adicionar</button></div><div class="field search-field"><label for="routine-search">Buscar na rotina</label><input id="routine-search" type="search" value="${esc(searchQuery)}" placeholder="Ex.: almoço, remédio, observação" autocomplete="off"><button type="button" class="btn small ghost routine-clear" data-action="clear-routine-search" ${searchQuery?'':'hidden'}>Limpar busca</button></div><p class="group-title">Ativos <span class="subtle" id="routine-active-count">${visibleActive}</span></p><div class="stack">${active.length?active.map(routineCard).join(''):searchQuery.trim()?'':empty('Sua rotina está livre','Cadastre o primeiro horário de refeição ou medicamento.','meal')}</div>${archived.length?`<p class="group-title">Arquivados <span class="subtle" id="routine-archived-count">${visibleArchived}</span></p><div class="stack">${archived.map(routineCard).join('')}</div>`:''}<p id="routine-search-empty" class="search-empty" role="status" ${!searchQuery.trim()||visibleActive+visibleArchived?'hidden':''}>Nenhum resultado para sua busca. Tente outro termo.</p>${safety}</section>`;
  }
  function renderHistory(){const day=historyDay,today=dateKey(new Date()),d=parseDate(day),list=todayOccs(day),done=list.filter(x=>x.doneAt).length;
    return `<section><p class="eyebrow">Passo a passo</p><h1 class="page-title">Histórico</h1><p class="page-subtitle">Veja os registros de cada dia, com os horários concluídos.</p><div class="panel date-nav"><button class="iconbutton" data-action="day" data-delta="-1" aria-label="Dia anterior">${icon('left',20)}</button><label class="field" style="text-align:center;gap:1px"><strong class="date-header">${day===today?'Hoje':firstUpper(longDate(d))}</strong><input type="date" id="history-date" value="${day}" max="${today}" aria-label="Escolher data do histórico"></label><button class="iconbutton" data-action="day" data-delta="1" aria-label="Próximo dia" ${day>=today?'disabled':''}>${icon('right',20)}</button></div><section class="panel progresscard" style="margin:0 0 16px"><div class="statrow"><strong>Concluídos neste dia</strong><span class="counter">${done} de ${list.length}</span></div><div class="progressTrack"><span style="width:${list.length?100*done/list.length:0}%"></span></div></section><div class="stack">${list.length?list.map(o=>row(o,day!==today)).join(''):empty('Sem horários registrados','Não há registros para esta data.','history')}</div>${safety}</section>`;
  }
  function renderInvitation(){const readOnly=!roomCanEdit(pendingInvitation);return `<section class="onboard"><div class="onboard-header"><span class="brandmark">${icon('users',28)}</span><p class="eyebrow">Convite privado</p><h1>Entrar na Sala de Pacientes</h1><p class="page-subtitle">Este convite dá acesso <strong>${readOnly?'somente para consultar':'para consultar e editar'}</strong> os horários e preferências compartilhados. Confirme que você confia em quem o enviou.</p></div><div class="panel setting-card"><h2>Antes de entrar</h2><p>As rotinas e os modos desta sala substituirão os do seu aparelho. Seu histórico local não será enviado para a sala. Exporte um backup se precisar guardar seus cadastros atuais.</p><p class="mini-flag">Não publique o convite. Links de edição permitem mudar horários; links de leitura permitem ver os dados. Ambos contêm informações de acesso privadas.</p><div class="inline-actions"><button class="btn primary" data-action="join-room">${icon('users',16)} Entrar e sincronizar</button><button class="btn" data-action="ignore-invite">Usar sem entrar</button></div></div></section>`}
  function renderRoom(){
   const connected=Boolean(room),editor=roomCanEdit(room),legacyRoom=Boolean(room&&(room.legacy||room.unsafeReadOnly));
   return `<section class="room-page"><p class="eyebrow">Vários aparelhos, um só cuidado</p><h1 class="page-title">Sala de Pacientes</h1><p class="page-subtitle">Compartilhe os horários e modos que você configurou, sem precisar repetir o cadastro em cada celular.</p><div class="room-hero"><span class="room-symbol">${icon('users',30)}</span><div><strong>${connected?'Sua sala está conectada':'Crie sua sala particular'}</strong><p>${connected?'Rotinas e preferências sincronizadas com criptografia.':'Um link privado conecta os aparelhos da família ou de quem presta cuidados.'}</p></div></div>
    ${roomError?`<p class="mini-flag" role="alert">${esc(roomError)}</p>`:''}
    ${connected?`<section class="panel setting-card"><div class="room-role">${icon(editor?'shield':'eye',18)} <strong>${editor?'Acesso de edição':'Somente visualização'}</strong></div><h2>Convites de acesso</h2><p>${editor?'Envie o link de leitura para quem só acompanha e o de edição apenas para cuidadores de confiança.':'Você pode acompanhar a rotina sem modificar os horários compartilhados.'}</p>${legacyRoom?`<p class="mini-flag" role="alert">Sala criada na versão anterior: links antigos podem permitir edição. ${editor?'Use Revogar links e criar novos antes de compartilhar acesso de leitura.':'Peça ao titular que renove os convites para ter uma sala com permissão de leitura protegida.'}</p>`:`<div class="room-link">${icon('eye',20)} <span>Link privado de visualização</span></div><div class="inline-actions"><button class="btn primary" data-action="room-copy" data-role="view">${icon('link',17)} Copiar leitura</button><button class="btn" data-action="room-share" data-role="view">Compartilhar leitura</button></div>`}${editor?`<div class="room-link">${icon('shield',20)} <span>Link restrito de edição</span></div><div class="inline-actions"><button class="btn" data-action="room-copy" data-role="edit">${icon('link',17)} Copiar edição</button><button class="btn" data-action="room-share" data-role="edit">Compartilhar edição</button></div>`:''}<div class="room-meta" aria-live="polite"><span class="room-status" data-testid="room-status">${icon(navigator.onLine&&!roomConflict?'check':'refresh',16)} <strong>${roomStatusLabel({busy:roomBusy,offline:!navigator.onLine,conflict:roomConflict,dirty:roomDirty})}</strong></span><span>Versão ${roomVersion} · ${roomSyncedAt?'Verificada às '+new Date(roomSyncedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'Não verificada'}</span></div><div class="inline-actions"><button class="btn" data-action="room-pull" ${roomCanReceive({connected:!!room,online:navigator.onLine,busy:roomBusy})?'':'disabled'}>${icon('refresh',16)} Receber alterações</button>${editor?`<button class="btn" data-action="room-push" ${roomCanSend(room,{version:roomVersion,dirty:roomDirty,busy:roomBusy,conflict:roomConflict,online:navigator.onLine})?'':'disabled'}>Enviar minhas alterações</button>`:''}</div><p class="help" id="room-send-help">${!navigator.onLine?'Sem conexão: use as rotinas locais e sincronize quando a internet voltar.':roomConflict?'Há um conflito. Resolva antes de enviar.':roomDirty?'Existem alterações locais aguardando envio.':'Nenhuma alteração local pendente para enviar.'} A sincronização funciona com internet. Seu histórico de conclusões continua apenas neste aparelho.</p></section><section class="panel setting-card"><h2>Gerenciar acesso</h2><div class="inline-actions">${editor?`<button class="btn danger" data-action="room-rotate">${icon('refresh',16)} Revogar links e criar novos</button><button class="btn danger" data-action="room-delete">${icon('trash',16)} Excluir sala para todos</button>`:''}<button class="btn ghost" data-action="room-leave">Sair só deste aparelho</button></div><p>${editor?'Revogar links cria outra sala com novos segredos. Os aparelhos antigos perdem acesso até receberem novo convite.':'Seu link de leitura não pode alterar ou excluir a sala.'} A saída deste aparelho preserva os horários locais.</p></section>`:
    `<section class="panel setting-card"><h2>Compartilhar minhas configurações</h2><p>A sala compartilha as refeições, os medicamentos e os modos visuais. Seu nome pessoal, histórico de conclusão e alarmes tocados não são enviados.</p><button class="btn primary full" data-action="room-create">${icon('add',19)} Criar sala com minha rotina</button><p class="help">Dados de saúde da sala ficam criptografados antes de sair do navegador. Sem login. Não há recuperação do link se você perdê-lo.</p></section>`}
    ${connected?chatMarkup(editor):''}
    <aside class="disclaimer">${icon('shield',17)} A sincronização exige conexão. Links de leitura e edição têm permissões diferentes. Não substitui a supervisão dos medicamentos nem garante alertas com app fechado.</aside></section>`;
  }
  function renderHelp(){
    return `<section class="panel setting-card pg-help" aria-labelledby="pg-help-title">
      <div class="pg-help-head"><img src="./assets/pg-bot.webp" alt="" width="48" height="56" loading="lazy" decoding="async"><div><h2 id="pg-help-title" tabindex="-1">PG Bot · Ajuda rápida</h2><p class="help">Orientações simples para cuidar da sua rotina.</p></div></div>
      <p class="help">O guia funciona sem IA e não envia dados. Nenhuma informação sobre medicamentos é analisada aqui.</p>
      <div class="pg-help-shortcuts" role="group" aria-label="Atalhos de ajuda">
        <button class="btn small ghost" type="button" data-action="tab" data-tab="routine">Abrir Rotina</button>
        <button class="btn small ghost" type="button" data-action="tab" data-tab="room">Abrir Sala</button>
        <button class="btn small ghost" type="button" data-action="tab" data-tab="timer">Abrir Timer</button>
      </div>
      <details><summary>Como cadastrar ou alterar um horário?</summary><p>Abra Rotina e toque em Adicionar. Para modificar um cadastro, escolha Editar no cartão. Registre doses de medicamentos somente conforme a prescrição.</p></details>
      <details><summary>Como compartilhar uma Sala com segurança?</summary><p>Na aba Sala, compartilhe o link de leitura com quem apenas acompanha. O link de edição permite modificar horários. Se um link vazar, use Revogar links e criar novos.</p></details>
      <details><summary>Como guardar minha rotina ao trocar de aparelho?</summary><p>Em Ajustes, selecione Exportar backup. Guarde o arquivo em um local privado. A restauração substitui os dados existentes e pede confirmação.</p></details>
      <details><summary>Os alarmes tocam com o aplicativo fechado?</summary><p>Não há garantia de alarmes web com o app fechado. Para horários importantes, exporte o calendário e confirme os avisos no aplicativo nativo do aparelho.</p></details>
    </section>`;
  }
  function renderSettings(){const supported='Notification' in window,perm=supported?Notification.permission:'indisponível',installed=window.matchMedia('(display-mode: standalone)').matches,p=state.settings;
    const options=(arr,current)=>arr.map(([v,t])=>`<option value="${v}" ${String(current)===String(v)?'selected':''}>${t}</option>`).join('');
    return `<section><p class="eyebrow">Seu espaço, suas escolhas</p><h1 class="page-title">Personalização</h1><p class="page-subtitle">Cuide da rotina do seu jeito. As escolhas ficam neste aparelho.</p><div class="desktop-columns"><div><section class="panel setting-card"><h2>Identidade e visual</h2><form id="profile-form" class="fieldgrid"><div class="field"><label for="profile-name">Como quer ser chamado(a)</label><input id="profile-name" name="name" type="text" maxlength="60" value="${esc(state.profile.name)}" placeholder="Seu nome" autocomplete="nickname"></div><div class="field"><label for="theme-choice">Aparência</label><select id="theme-choice" data-setting="theme">${options([['system','Acompanhar sistema'],['light','Claro'],['dark','Escuro']],p.theme)}</select></div><div><span class="group-label">Cor do aplicativo</span><div class="palette" role="group" aria-label="Escolher cor">${[['sage','Floresta'],['ocean','Oceano'],['lilac','Lilás'],['coral','Coral'],['amber','Âmbar'],['mint','Menta']].map(([v,label])=>`<button type="button" class="swatch ${v}" data-action="accent" data-accent="${v}" aria-label="${label}" aria-pressed="${p.accent===v}" title="${label}">${p.accent===v?icon('check',18):''}</button>`).join('')}</div></div><div class="fieldrow"><div class="field"><label for="font-scale">Texto</label><select id="font-scale" data-setting="scale">${options([['normal','Padrão'],['large','Grande'],['xlarge','Extra grande']],p.scale)}</select></div><div class="field"><label for="density">Espaçamento</label><select id="density" data-setting="density">${options([['comfortable','Confortável'],['compact','Compacto']],p.density)}</select></div></div><div class="field"><label for="week-start">Primeiro dia da semana</label><select id="week-start" data-setting="weekStart">${options([[1,'Segunda-feira'],[0,'Domingo']],p.weekStart)}</select></div><button class="btn primary" type="submit">Salvar nome</button></form></section><section class="panel setting-card"><h2>Lembretes e alarmes</h2><div class="toggleline"><label for="reminder-switch">Avisos enquanto o app estiver aberto</label><input id="reminder-switch" class="switch" type="checkbox" ${p.reminders?'checked':''}></div><div class="field"><label for="lead-choice">Avisar com antecedência</label><select id="lead-choice" data-setting="lead">${options([[0,'No horário'],[5,'5 minutos antes'],[10,'10 minutos antes'],[15,'15 minutos antes'],[30,'30 minutos antes']],p.lead)}</select></div><div class="toggleline"><label for="private-notification-choice">Ocultar nomes nos avisos da tela bloqueada</label><input id="private-notification-choice" data-setting="privateNotifications" type="checkbox" class="switch" ${p.privateNotifications?'checked':''}></div><p>Por privacidade, notificações do sistema ocultam nomes de medicamentos por padrão. Os detalhes continuam visíveis dentro do aplicativo.</p><div class="toggleline"><label for="sound-choice">Som nos avisos</label><input id="sound-choice" data-setting="sound" type="checkbox" class="switch" ${p.sound?'checked':''}></div><div class="fieldrow"><div class="field"><label for="sound-preset">Melodia</label><select id="sound-preset" data-setting="soundPreset">${options([['soft','Suave'],['chime','Sinos'],['pulse','Pulsos']],p.soundPreset)}</select></div><div class="field"><label for="volume-choice">Volume do app</label><select id="volume-choice" data-setting="volume">${options([[15,'Baixo'],[30,'Médio'],[55,'Alto']],p.volume)}</select></div></div><div class="toggleline"><label for="vibration-choice">Vibração (se disponível no aparelho)</label><input id="vibration-choice" data-setting="vibration" type="checkbox" class="switch" ${p.vibration?'checked':''}></div><div class="toggleline"><label for="quiet-choice">Modo silencioso à noite</label><input id="quiet-choice" data-setting="quiet" type="checkbox" class="switch" ${p.quiet?'checked':''}></div><div class="fieldrow"><div class="field"><label for="quiet-start">De</label><input id="quiet-start" data-setting="quietStart" type="time" value="${esc(p.quietStart)}"></div><div class="field"><label for="quiet-end">Até</label><input id="quiet-end" data-setting="quietEnd" type="time" value="${esc(p.quietEnd)}"></div></div><p>A permissão atual é <strong>${esc(perm)}</strong>. No celular, avisos usam o Service Worker, quando permitido pelo navegador; não há garantia com o app fechado.</p><button class="btn" data-action="test-alarm">${icon('bell',17)} Testar aviso e som</button></section></div><div><section class="panel setting-card"><h2>Instale como aplicativo</h2><p>${installed?'Está aberto como aplicativo instalado.':'Instale na tela inicial para funcionar offline após a primeira visita.'}</p>${!installed?`<button class="btn primary" data-action="install">${icon('phone',18)} Instalar Cuidador(a)</button>`:''}<p><strong>Android:</strong> Chrome → menu ⋮ → Instalar app. <strong>iOS:</strong> Safari → Compartilhar → Adicionar à Tela de Início.</p></section><section class="panel setting-card"><h2>Alarmes com o app fechado</h2><p>Exporte um calendário recorrente, que usa os lembretes do próprio Android ou iPhone. Confirme as notificações no app de calendário. O arquivo pode conter nomes de medicamentos: trate-o como sensível.</p><button class="btn" data-action="ics" ${!state.items.some(x=>!x.archived)?'disabled':''}>${icon('history',18)} Exportar calendário (.ics)</button></section><section class="panel setting-card"><h2>Seus dados, sob seu controle</h2><p>Por padrão, os dados ficam neste navegador. Ao criar uma Sala, rotinas e modos passam a ser sincronizados cifrados na Cloudflare. O histórico não é compartilhado. Faça backup antes de trocar de aparelho.</p><div class="inline-actions"><button class="btn" data-action="backup">${icon('download',18)} Exportar backup</button><button class="btn" data-action="import" ${room&&!roomCanEdit(room)?'disabled':''}>Restaurar backup</button><button class="btn danger" data-action="wipe-routines" ${room&&!roomCanEdit(room)?'disabled':''}>Apagar rotinas</button><button class="btn danger" data-action="wipe">Apagar dados deste aparelho</button></div>${room&&!roomCanEdit(room)?'<p class="room-readonly-hint" role="status">Somente visualização: para trocar ou apagar suas rotinas, desconecte esta sala primeiro.</p>':''}<input class="sr-only" type="file" id="import-file" accept="application/json,.json" aria-label="Escolher backup JSON" ${room&&!roomCanEdit(room)?'disabled':''}></section><section class="panel setting-card"><h2>Transparência e privacidade</h2><p>Consulte como funciona, quais são os limites dos avisos e como os dados são armazenados.</p><div class="inline-actions"><button class="btn small" data-action="legal" data-page="privacidade">Privacidade</button><button class="btn small" data-action="legal" data-page="termos">Termos de uso</button><button class="btn small" data-action="legal" data-page="acessibilidade">Acessibilidade</button></div></section></div></div>${renderHelp()}${safety}</section>`;
  }
  function renderTimer(){updateTimer();const mm=String(Math.floor(timerRemaining/60)).padStart(2,'0'),ss=String(timerRemaining%60).padStart(2,'0');
   return `<section><p class="eyebrow">Pequenas pausas também são cuidado</p><h1 class="page-title">Timer de cuidados</h1><p class="page-subtitle">Uma contagem simples para descanso, preparo da refeição ou qualquer atividade. Não substitui alarmes de medicamentos.</p><div class="timer-panel panel"><div class="timer-ring" style="--timer-progress:${timerProgressPercent(timerRemaining,timerDuration)}%" role="timer" aria-label="Tempo restante" aria-live="off"><span id="timer-display">${mm}:${ss}</span></div><p id="timer-status" class="subtle" aria-live="polite">${timerRunning?'Contagem em andamento':timerFinished?'Tempo encerrado':'Pronto para começar'}</p><div class="timer-actions"><button class="btn primary" data-action="timer-toggle">${icon(timerRunning?'pause':'play',18)} <span id="timer-action">${timerRunning?'Pausar':timerFinished?'Reiniciar timer':timerRemaining!==timerDuration?'Continuar':'Iniciar timer'}</span></button><button class="btn" data-action="timer-reset">${icon('refresh',18)} Reiniciar</button></div><p class="group-label">Duração rápida</p><div class="filterRow timer-presets">${[5,10,15,20,25,30,45,60].map(m=>`<button class="filter" data-action="timer-preset" data-minutes="${m}" aria-pressed="${timerDuration===m*60}">${m} min</button>`).join('')}</div><form id="timer-custom-form" class="fieldrow timer-custom"><div class="field"><label for="timer-minutes">Outro tempo (1 a 180 min)</label><input id="timer-minutes" name="minutes" type="number" min="1" max="180" step="1" value="${Math.round(timerDuration/60)}" required></div><button type="submit" class="btn">Aplicar duração</button></form></div></section>`;
  }
  const legalContent={
    privacidade:`<h2 id="legalTitle">Privacidade</h2><p>Por padrão o Cuidador(a) mantém seus dados somente neste navegador. Ao optar pela Sala de Pacientes, os horários e preferências são cifrados neste dispositivo antes de serem guardados na Cloudflare D1. Links privados de leitura e edição têm permissões diferentes: ambos revelam informações de saúde, mas apenas o segundo autoriza mudanças. O titular pode revogar todos os convites ao gerar uma nova sala. Nome e histórico de conclusão não são sincronizados. Você pode excluir a sala pelo aplicativo, mas backups em outros dispositivos continuam sob controle de quem os possui. Quem acessar o mesmo perfil do navegador pode acessar os dados. Backups JSON e calendários ICS podem conter informações de saúde e devem ser armazenados com cuidado.</p><p>Para excluir seus registros, limpe os dados do site no navegador. O fechamento da aba não exclui os registros. Recursos de notificação dependem de permissão explícita e da plataforma. Esta ferramenta não comercializa dados pessoais.</p>`,
    termos:`<h2 id="legalTitle">Termos de uso</h2><p>O Cuidador(a) é um organizador pessoal de compromissos, refeições e medicamentos, não um serviço médico. Não prescreve tratamento, não recomenda doses e não verifica interações entre medicamentos. Cadastre exclusivamente os horários informados pelo profissional responsável.</p><p>Os alarmes web podem falhar se o sistema suspender a execução, bloquear notificações ou o dispositivo estiver sem energia. Não dependa deste aplicativo como seu único mecanismo de lembrete de medicamentos. Para doses esquecidas, consulte o profissional ou a bula; nunca dobre por orientação do aplicativo.</p>`,
    acessibilidade:`<h2 id="legalTitle">Acessibilidade</h2><p>Use a personalização de texto grande, o modo escuro, os alvos de toque ampliados, o teclado e os indicadores textuais de estado. Para melhorias, registre um relato no repositório oficial quando publicado. O projeto respeita a preferência de redução de movimento do sistema.</p>`
  };
  function renderOnboard(){const options=[['Café da manhã','07:30'],['Almoço','12:00'],['Lanche','16:00'],['Jantar','19:00']];return `<section class="onboard"><div class="onboard-header"><span class="brandmark">${icon('sun',30)}</span><p class="eyebrow">Boas-vindas</p><h1>Mais leveza para sua rotina.</h1><p class="subtle">Refeições e medicamentos no seu tempo, sem complicação.</p></div><div class="panel"><form id="onboard-form" class="fieldgrid"><div class="field"><label for="onboard-name">Como podemos chamar você?</label><input id="onboard-name" name="name" maxlength="60" placeholder="Seu nome (opcional)" autocomplete="nickname"></div><div><p class="group-label">Quer começar com refeições?</p><p class="help">São apenas sugestões editáveis. Desmarque o que não quiser.</p>${options.map(([label,time],i)=>`<div class="meal-preset"><input type="checkbox" checked id="meal-${i}" name="meal-${i}"><span><label for="meal-${i}">${label}</label></span><input type="time" id="time-${i}" name="time-${i}" value="${time}" aria-label="Horário de ${label}"></div>`).join('')}</div><p class="help">Não adicionamos medicamentos automaticamente. Cadastre somente conforme sua prescrição.</p><button class="btn primary full" type="submit">Criar minha rotina ${icon('right',18)}</button><button class="btn ghost full" type="button" data-action="skip">Começar sem horários</button></form></div></section>`}
  function render(){
    // Preserve unsent text in memory across room updates, never localStorage.
    const previousRoot=document.getElementById('app');
    const oldText=previousRoot?.querySelector('.chat-card #chat-text');
    const oldAlias=previousRoot?.querySelector('.chat-card #chat-alias');
    const priorFocus=oldText&&document.activeElement===oldText?'text':oldAlias&&document.activeElement===oldAlias?'alias':null;
    if(oldText&&room&&chatRoomMounted===room.id)chatDraftMemory={roomId:room.id,text:oldText.value,alias:oldAlias?.value||''};
    else if(!room||chatDraftMemory?.roomId!==room.id)chatDraftMemory=null;
    stopChat();stopChat=()=>{};const prefs=normalizePreferences(state.settings);const dark=prefs.theme==='dark'||(prefs.theme==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.dataset.accent=prefs.accent;document.documentElement.dataset.scale=prefs.scale;document.documentElement.dataset.density=prefs.density;document.querySelector('meta[name="theme-color"]').content=dark?'#14231e':'#17483f';const root=document.getElementById('app');
    if(pendingInvitation){root.innerHTML=`<div class="app-frame">${renderInvitation()}</div>`;return}
    if(!state.profile.onboarded){root.innerHTML=`<div class="app-frame">${renderOnboard()}</div>`;return}
    root.innerHTML=`<div class="app-frame">${header()}<main id="main-content">${tab==='routine'?renderRoutine():tab==='history'?renderHistory():tab==='settings'?renderSettings():tab==='room'?renderRoom():tab==='timer'?renderTimer():renderToday()}</main></div>${bottomNav()}`;
    if(room&&roomConflict){
      root.querySelectorAll('[data-action]').forEach(button=>{if(CONFLICT_BLOCKED_ACTIONS.has(button.dataset.action))button.disabled=true});
      root.querySelectorAll('[data-setting],#reminder-switch,#import-file').forEach(control=>{control.disabled=true});
      if(tab==='routine'||tab==='settings')root.querySelector('#main-content')?.insertAdjacentHTML('afterbegin',`<aside class="room-conflict-hint" role="alert"><strong>Conflito de sincronização.</strong> Faça backup antes de descartar alterações. Edição de rotinas e ajustes compartilhados está temporariamente bloqueada. <button type="button" class="btn small" data-action="room-open">Resolver na Sala</button></aside>`);
    }
    if(tab==='room'&&room){
      stopChat=mountRoomChat(root.querySelector('.chat-card'),room);
      chatRoomMounted=room.id;
      const draft=chatDraftForRoom(chatDraftMemory,room.id);
      if(draft){
        const text=root.querySelector('.chat-card #chat-text'),alias=root.querySelector('.chat-card #chat-alias');
        if(alias)alias.value=draft.alias;
        if(text){text.value=draft.text;text.dispatchEvent(new Event('input',{bubbles:true}))}
        if(priorFocus==='text')text?.focus({preventScroll:true});
        else if(priorFocus==='alias')alias?.focus({preventScroll:true});
      }
    }else chatRoomMounted=null;
  }
  function storeRoom(roomData,version){room=roomData;roomVersion=version;roomDirty=false;roomConflict=false;roomSyncedAt=Date.now();roomError='';roomSnapshot=JSON.stringify(sharedSnapshot(state));persistRoom()}
  const roomUrl=id=>`/api/rooms/${encodeURIComponent(id)}`;
  async function roomRequest(url,options={}){
    const res=await fetch(url,{cache:'no-store',...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
    if(res.status===304)return {unchanged:true};
    const payload=await res.json().catch(()=>({}));
    if(!res.ok)throw Object.assign(new Error(payload.error||'Não foi possível sincronizar.'),{status:res.status});
    return payload;
  }
  function applyRoomSnapshot(snapshot){const updated=validate({...state,items:snapshot.items,settings:snapshot.settings,version:1});state={...updated,profile:{...state.profile,onboarded:true},logs:state.logs,noticeLog:state.noticeLog};roomSnapshot=JSON.stringify(sharedSnapshot(state));roomDirty=false;save();render()}
  async function makeRoom(){if(roomBusy)return;roomBusy=true;roomError='';render();try{
    const credential=await createCredentials(),encrypted=await encryptRoom(credential,sharedSnapshot(state));
    const response=await roomRequest('/api/rooms',{method:'POST',body:JSON.stringify({...encrypted,id:credential.id,authHash:credential.authHash,readHash:credential.readHash})});
    storeRoom({id:credential.id,key:credential.key,editorSecret:credential.editorSecret},response.version);tab='room';toast('Sala criada! Copie o link e envie somente a pessoas autorizadas.');
  }catch(e){roomError=e.message;toast('A sala não pôde ser criada.')}finally{roomBusy=false;render()}}
  async function acceptInvitation(){if(!pendingInvitation||roomBusy)return;roomBusy=true;try{
    const candidate=await completeCredentials(pendingInvitation),r=await roomRequest(roomUrl(candidate.id),{headers:{'X-Room-Read-Token':candidate.readToken}});
    const payload=await decryptRoom(candidate,r);pendingInvitation=null;
    history.replaceState(null,'',location.pathname+location.search);
    applyRoomSnapshot(payload);storeRoom({id:candidate.id,key:candidate.key,...(candidate.editorSecret?{editorSecret:candidate.editorSecret}:{}),...(r.legacy?{unsafeReadOnly:true}:{})},r.version);tab='room';toast('Sala conectada e rotinas recebidas.');
  }catch(e){roomError=e.message;toast('Não foi possível entrar: '+e.message)}finally{roomBusy=false;render()}}
  async function pullRoom(silent=false,force=false){if(!room||roomBusy)return;roomBusy=true;try{
    const currentId=room.id,reader=await completeCredentials(room);
    const headers={'X-Room-Read-Token':reader.readToken};
    if(roomVersion&&!force)headers['If-None-Match']=`"v${roomVersion}"`;
    const r=await roomRequest(roomUrl(currentId),{headers});
    if(!room||room.id!==currentId)return;
    if(r.unchanged){roomSyncedAt=Date.now();persistRoom();if(!silent)toast(roomDirty?'Sala sem novas alterações; seu envio ainda está pendente.':'Sala já está atualizada.');return}
    if(r.version!==roomVersion||force){
      if(roomDirty&&!force){roomConflict=true;roomError='Outro aparelho alterou esta sala. Exporte um backup, depois escolha Receber e substituir. Seus dados locais não foram apagados.';persistRoom();if(!silent)toast(roomError);return}
      const payload=await decryptRoom(room,r);applyRoomSnapshot(payload);
      roomVersion=r.version;roomConflict=false;roomSyncedAt=Date.now();roomSnapshot=JSON.stringify(sharedSnapshot(state));persistRoom();
      if(!silent)toast('Alterações recebidas da sala.');
    }else if(!silent)toast('Sala já está atualizada.');
    roomError='';roomSyncedAt=Date.now();persistRoom();
  }catch(e){roomError=e.message;if(!silent)toast('Falha ao receber: '+e.message)}finally{roomBusy=false;if(tab==='room')render()}}
  async function pushRoom(){if(!roomCanSend(room,{version:roomVersion,dirty:roomDirty,busy:roomBusy,conflict:roomConflict,online:navigator.onLine}))return;roomBusy=true;try{
    const currentId=room.id,credential=await completeCredentials(room),encrypted=await encryptRoom(credential,sharedSnapshot(state)),current=JSON.stringify(sharedSnapshot(state));
    const r=await roomRequest(roomUrl(currentId),{method:'PUT',headers:{'X-Room-Token':credential.token},body:JSON.stringify({...encrypted,version:roomVersion})});
    if(!room||room.id!==currentId)return;
    roomVersion=r.version;roomSnapshot=current;roomDirty=JSON.stringify(sharedSnapshot(state))!==current;roomConflict=false;roomSyncedAt=Date.now();roomError='';persistRoom();
  }catch(e){roomConflict=e.status===409;roomError=roomConflict?'Conflito: outro aparelho alterou a sala. Salve backup antes de receber a nova versão.':e.message;persistRoom();toast(roomError)}finally{roomBusy=false;if(tab==='room')render()}}
  async function deleteRoom(){if(!room||!roomCanEdit(room)||roomBusy)return;roomBusy=true;try{
    const credential=await completeCredentials(room);await roomRequest(roomUrl(room.id),{method:'DELETE',headers:{'X-Room-Token':credential.token}});
    room=null;roomVersion=0;roomDirty=false;roomConflict=false;roomSyncedAt=0;roomSnapshot='';persistRoom();roomError='';toast('Sala removida do servidor. Seus dados locais foram preservados.');
  }catch(e){roomError=e.message;toast('Falha ao excluir sala: '+e.message)}finally{roomBusy=false;render()}}
  async function rotateRoom(){
    if(!room||!roomCanEdit(room)||roomBusy)return;
    roomBusy=true;roomError='';const previous=room;
    try{
      if(roomDirty)throw new Error('Envie as alterações pendentes antes de revogar os convites.');
      const next=await createCredentials(),encrypted=await encryptRoom(next,sharedSnapshot(state));
      const created=await roomRequest('/api/rooms',{method:'POST',body:JSON.stringify({...encrypted,id:next.id,authHash:next.authHash,readHash:next.readHash})});
      try{
        const owner=await completeCredentials(previous);
        await roomRequest(roomUrl(previous.id),{method:'DELETE',headers:{'X-Room-Token':owner.token}});
      }catch(error){
        try{await roomRequest(roomUrl(next.id),{method:'DELETE',headers:{'X-Room-Token':next.token}})}catch{}
        throw new Error('Os links antigos NÃO foram revogados. Tente novamente ou exclua a sala original.');
      }
      storeRoom({id:next.id,key:next.key,editorSecret:next.editorSecret},created.version);
      toast('Links antigos revogados. Compartilhe os novos convites.');
    }catch(error){roomError=error.message;toast(roomError)}finally{roomBusy=false;render()}
  }
  function leaveRoom(){clearTimeout(roomDebounce);room=null;roomVersion=0;roomDirty=false;roomConflict=false;roomSyncedAt=0;roomSnapshot='';roomError='';persistRoom();render();toast('Você saiu da sala. Rotinas permanecem neste aparelho.')}
  function toast(message){const elem=document.getElementById('toast');elem.textContent=message;elem.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>elem.classList.remove('show'),3800)}
  function mark(key){const [day,id,time]=key.split('|');if(day!==dateKey(new Date())){toast('Altere somente os registros do dia atual.');return}let item=state.items.find(x=>x.id===id);const prev=state.logs[key];if(!prev&&!item){toast('Esse item já foi removido.');return}
    setState(s=>{const logs={...s.logs};if(logs[key])delete logs[key];else logs[key]={doneAt:new Date().toISOString(),snapshot:{title:item.title,type:item.type,dose:item.dose,note:item.note}};return {...s,logs}});toast(prev?'Conclusão desfeita.':'Horário marcado como concluído.');
  }
  const openDialog=dialog=>{if(!dialog.open)dialog.showModal()};
  function focusChangedTimelineItem(id,preferredTime=''){
    const cards=[...document.querySelectorAll('.timeline-entry[data-occ-key]')]
      .filter(card=>card.dataset.occKey?.split('|')[1]===id);
    const available=cards.filter(card=>card.querySelector('[data-action="timeline-edit"]'));
    const selected=available.find(card=>card.dataset.occKey?.endsWith('|'+preferredTime))||available[0];
    const target=selected?.querySelector('[data-action="timeline-edit"]')
      ||document.querySelector('.progresscard [data-action="add"]:not(:disabled)')
      ||document.querySelector('.secondaryFilters [data-action="status-filter"][aria-pressed="true"]');
    target?.focus({preventScroll:true});
  }
  function openEditor(item=null,type='meal'){
    const box=document.getElementById('editDialog'),current=item||{type,title:'',dose:'',note:'',days:[0,1,2,3,4,5,6],times:[new Date().toTimeString().slice(0,5)]};
    box.innerHTML=`<form id="item-form" class="fieldgrid"><h2 id="dialogTitle">${item?'Editar horário':'Novo horário'}</h2><div class="field"><label for="item-type">Categoria</label><select id="item-type" name="type"><option value="meal" ${current.type==='meal'?'selected':''}>Refeição</option><option value="med" ${current.type==='med'?'selected':''}>Medicamento</option></select></div><div class="field"><label for="item-title">${current.type==='med'?'Nome do medicamento':'Nome da refeição'}</label><input id="item-title" name="title" type="text" maxlength="100" placeholder="Ex.: ${current.type==='med'?'Medicamento prescrito':'Café da manhã'}" value="${esc(current.title)}" required></div><div class="field" id="dose-field" ${current.type==='med'?'':'hidden'}><label for="item-dose">Dose escrita na receita (opcional)</label><input id="item-dose" type="text" name="dose" maxlength="100" placeholder="Copie exatamente a prescrição" value="${esc(current.dose)}"></div><div class="field"><label for="item-times">Horário${current.type==='med'?'s':''}</label><input id="item-times" name="times" type="text" inputmode="text" placeholder="08:00${current.type==='med'?', 20:00':''}" value="${esc(current.times.join(', '))}" required><p class="help" id="times-help">Use formato 24h (HH:mm). Para vários horários, separe com vírgula.</p></div><div><span class="group-label">Dias da semana</span><div class="daysrow" style="margin-top:9px">${WEEK.map((x,i)=>`<span class="daybox"><input id="dow-${i}" type="checkbox" name="days" value="${i}" ${current.days.includes(i)?'checked':''}><label for="dow-${i}" aria-label="${WEEKLONG[i]}">${x}</label></span>`).join('')}</div></div><div class="field"><label for="item-note">Observações (opcional)</label><textarea id="item-note" name="note" maxlength="500" placeholder="Detalhes que você quer lembrar">${esc(current.note)}</textarea></div><p class="help">Horários e doses de medicamentos devem vir de sua prescrição, nunca de sugestões do aplicativo.</p><div class="form-actions"><button class="btn ghost" type="button" data-action="close-edit">Cancelar</button><button class="btn primary" type="submit">Salvar horário</button></div></form>`;
    box.dataset.id=item?.id||'';openDialog(box);box.querySelector('#item-title').focus();
    const sel=box.querySelector('#item-type');sel.addEventListener('change',()=>{box.querySelector('#dose-field').hidden=sel.value!=='med';box.querySelector('label[for="item-title"]').textContent=sel.value==='med'?'Nome do medicamento':'Nome da refeição';box.querySelector('label[for="item-times"]').textContent=sel.value==='med'?'Horários':'Horário'});
    box.querySelector('form').addEventListener('submit',e=>{
      e.preventDefault();
      if(!box.open||e.currentTarget.dataset.submitted==='true')return;
      if(room&&!roomCanEdit(room)){toast('Sala somente leitura.');box.close();return}
      if(room&&roomConflict){toast(conflictMessage);return}
      const data=new FormData(e.target),timesRaw=String(data.get('times')).split(',').map(t=>t.trim()),times=[...new Set(timesRaw)];const days=data.getAll('days').map(Number),title=String(data.get('title')).trim(),type=String(data.get('type'));
      if(!title||times.length<1||times.length>24||times.some(t=>!isTime(t))){toast('Preencha um nome e horários válidos (HH:mm).');return}
      if(type==='meal'&&times.length!==1){toast('Para cada refeição, informe um único horário.');return}
      if(days.length===0){toast('Selecione pelo menos um dia.');return}
      // Mark successful validation before mutating state: repeat submits must be idempotent.
      e.currentTarget.dataset.submitted='true';
      const entry={id:item?.id||uid(),type,title,dose:type==='med'?String(data.get('dose')||'').trim():'',note:String(data.get('note')||'').trim(),days:days.sort(),times:times.sort(),archived:item?.archived||false,createdAt:item?.createdAt||new Date().toISOString()};
      // Keep the new entry visible under any active routine filter or search.
      if(!item&&tab==='routine'){
        if(routineFilter!=='all'&&routineFilter!==entry.type)routineFilter=entry.type;
        if(searchQuery.trim()&&!routineMatches(entry,searchQuery))searchQuery='';
      }
      setState(s=>({...s,items:item?s.items.map(x=>x.id===item.id?entry:x):[...s.items,entry]}));box.close();toast(item?'Horário atualizado.':'Horário adicionado.');
    });
  }
  function editTimelineOccurrence(item,time){
    if(!item||!item.times.includes(time))return toast('Horário não encontrado.');
    const dlg=document.getElementById('confirmDialog');
    dlg.innerHTML=`<form id="timeline-time-form" class="fieldgrid"><h2 id="confirmTitle">Alterar horário de ${esc(item.title)}</h2><p class="help">A mudança vale para todos os dias da semana em que esta rotina ocorre. Os registros já concluídos permanecem no histórico.</p><div class="field"><label for="timeline-time-value">Novo horário</label><input type="time" name="time" id="timeline-time-value" value="${esc(time)}" required></div><div class="form-actions"><button type="button" class="btn ghost" data-action="cancel-delete">Cancelar</button><button type="button" class="btn ghost" data-action="timeline-full-edit" data-id="${esc(item.id)}">Editar rotina completa</button><button type="submit" class="btn primary">Salvar horário</button></div></form>`;
    dlg.dataset.id=item.id;dlg.dataset.time=time;openDialog(dlg);dlg.querySelector('input').focus();
  }
  function removeTimelineOccurrence(item,time){
    if(!item||!item.times.includes(time))return toast('Horário não encontrado.');
    const dlg=document.getElementById('confirmDialog'),multiple=item.times.length>1;
    dlg.innerHTML=`<h2 id="confirmTitle">Excluir ${esc(item.title)} às ${esc(time)}?</h2><p>Esta alteração será aplicada a todos os dias cadastrados ${room?'e sincronizada na Sala quando você estiver online':''}. As conclusões anteriores continuarão no histórico.</p><div class="form-actions"><button class="btn ghost" data-action="cancel-delete">Cancelar</button>${multiple?`<button class="btn danger" data-action="timeline-confirm-remove" data-id="${esc(item.id)}" data-time="${esc(time)}">Excluir só ${esc(time)}</button>`:''}<button class="btn danger" data-action="confirm-delete" data-id="${esc(item.id)}">Excluir rotina inteira</button></div>`;
    openDialog(dlg);
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
  async function importBackup(file){if(room&&!roomCanEdit(room)){toast('Sala somente leitura.');return}if(room&&roomConflict){toast(conflictMessage);return}if(!file)return;try{if(file.size>2e6)throw new Error('O arquivo é grande demais (máximo 2 MB).');const parsed=validate(JSON.parse(await file.text()));const dlg=document.getElementById('confirmDialog');dlg.innerHTML=`<h2 id="confirmTitle">Substituir seus dados?</h2><p class="subtle">Importar este backup substituirá os cadastros e o histórico atuais deste navegador. Exporte um backup antes, se quiser guardá-los.</p><div class="form-actions"><button class="btn ghost" type="button" data-action="cancel-delete">Cancelar</button><button class="btn primary" type="button" id="apply-import">Importar backup</button></div>`;openDialog(dlg);dlg.querySelector('#apply-import').addEventListener('click',()=>{if(room&&!roomCanEdit(room)){toast('Sala somente leitura.');dlg.close();return}if(room&&roomConflict){toast(conflictMessage);dlg.close();return}state=parsed;save();dlg.close();tab='today';render();toast('Backup importado com sucesso.')},{once:true})}catch(err){toast('Não foi possível importar: '+err.message)}}
  function renderKeepingControlFocus(id,wasFocused=document.activeElement?.id===id){render();if(wasFocused)document.getElementById(id)?.focus({preventScroll:true})}
  async function activateReminders(enabled){if(room&&roomConflict){toast(conflictMessage);render();return}const wasFocused=document.activeElement?.id==='reminder-switch';state.settings.reminders=enabled;save();if(enabled&&'Notification' in window&&Notification.permission==='default'){try{await Notification.requestPermission()}catch{}}renderKeepingControlFocus('reminder-switch',wasFocused);toast(enabled?'Avisos ativados enquanto o aplicativo estiver aberto.':'Avisos desativados.')}
  async function showSystemNotice(title,body,tag){try{if(!('serviceWorker' in navigator))return;const reg=await navigator.serviceWorker.ready;await reg.showNotification(title,{body,icon:'./assets/icon-192.png',badge:'./assets/icon-192.png',tag,renotify:false});}catch(err){console.warn('Notificação indisponível:',err)}}
  function beep(){
    const sound=state.settings.soundPreset||'soft',volume=Number(state.settings.volume||30)/100;
    if(state.settings.vibration&&navigator.vibrate)navigator.vibrate(sound==='pulse'?[110,80,110]:[85]);
    if(!state.settings.sound)return;
    try{const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;const ctx=new Ctx();if(ctx.state==='suspended')void ctx.resume();
      const patterns={soft:[[660,0,.16],[880,.18,.24]],chime:[[523,0,.14],[659,.16,.14],[784,.32,.32]],pulse:[[750,0,.2],[750,.3,.2],[750,.6,.2]]};
      let finish=0;for(const [freq,offset,duration] of patterns[sound]||patterns.soft){const osc=ctx.createOscillator(),gain=ctx.createGain(),at=ctx.currentTime+offset;
        osc.type=sound==='pulse'?'triangle':'sine';osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(Math.max(.001,volume*.18),at+.025);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);osc.connect(gain);gain.connect(ctx.destination);osc.start(at);osc.stop(at+duration+.03);finish=Math.max(finish,offset+duration)}setTimeout(()=>void ctx.close(),(finish+.3)*1000)
    }catch{}
  }
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
    if(el){const display=`${String(Math.floor(timerRemaining/60)).padStart(2,'0')}:${String(timerRemaining%60).padStart(2,'0')}`;if(el.textContent!==display){el.textContent=display;el.closest('.timer-ring')?.style.setProperty('--timer-progress',`${timerProgressPercent(timerRemaining,timerDuration)}%`);}}
    if(finished){toast('O timer terminou.');beep();if(state.settings.reminders&&'Notification' in window&&Notification.permission==='granted')void showSystemNotice('Timer concluído','Seu tempo terminou.','cuidadora-timer-fim');if(tab==='timer')render()}
  }
  function setTimerMinutes(min){if(!Number.isInteger(min)||min<1||min>180){toast('Escolha entre 1 e 180 minutos.');return}timerRunning=false;timerDeadline=null;timerFinished=false;timerDuration=min*60;timerRemaining=timerDuration;saveTimer();render()}
  document.addEventListener('click',async e=>{const el=e.target.closest('[data-action]');if(!el)return;const action=el.dataset.action,id=el.dataset.id;
    if(room&&!roomCanEdit(room)&&new Set(['room-rotate-confirm','add','edit','archive','delete','confirm-delete','timeline-edit','timeline-remove','timeline-confirm-remove','timeline-full-edit','wipe-routines','wipe-routines-confirm','accent','room-push','room-delete','room-delete-confirm','room-rotate','import']).has(action)){toast('Convite somente leitura: não é permitido alterar as rotinas desta sala.');return}
    if(room&&roomConflict&&CONFLICT_BLOCKED_ACTIONS.has(action)){toast(conflictMessage);return}
    if(action==='room-open'){tab='room';render();return}
    if(action==='room-sync'){if(!room||roomBusy)return;if(roomDirty){if(roomConflict){toast('Resolva o conflito na aba Sala.');tab='room';render()}else await pushRoom()}else await pullRoom();return}
    if(action==='room-create'){await makeRoom();return}
    if(action==='join-room'){await acceptInvitation();return}
    if(action==='ignore-invite'){pendingInvitation=null;history.replaceState(null,'',location.pathname+location.search);roomError='';render();return}
    if(action==='room-copy'||action==='room-share'){
      if(!room)return;if((room.legacy||room.unsafeReadOnly)&&el.dataset.role==='view'){toast('Renove os links antigos antes de compartilhar só leitura.');return}const linkFragment=buildRoomFragment(room,el.dataset.role==='view'?'view':'edit');if(!linkFragment){toast('Você não tem permissão de edição.');return}const link=location.origin+location.pathname+linkFragment;
      try{if(action==='room-share'&&navigator.share)await navigator.share({title:'Sala Cuidador(a)',text:'Acesse a rotina compartilhada comigo. Não encaminhe o link.',url:link});else{await navigator.clipboard.writeText(link);toast('Link privado copiado.')}}catch(e){if(e.name!=='AbortError')toast('Use Copiar link para compartilhar.')}return
    }
    if(action==='room-rotate'){const dlg=document.getElementById('confirmDialog');dlg.innerHTML=`<h2 id="confirmTitle">Revogar TODOS os convites antigos?</h2><p>Uma nova sala criptografada será criada e a anterior será excluída. Todos os aparelhos conectados perderão acesso até receberem os novos links. Faça backup e confira se as alterações estão sincronizadas.</p><div class="form-actions"><button class="btn" data-action="cancel-delete">Cancelar</button><button class="btn danger" data-action="room-rotate-confirm">Revogar e gerar novos</button></div>`;openDialog(dlg);return}
    if(action==='room-rotate-confirm'){document.getElementById('confirmDialog').close();await rotateRoom();return}
    if(action==='room-pull'){if(!roomCanReceive({connected:!!room,online:navigator.onLine,busy:roomBusy})){toast('Sem conexão ou sincronização já em andamento.');return}if(roomDirty){const dlg=document.getElementById('confirmDialog');dlg.innerHTML=`<h2 id="confirmTitle">Descartar mudanças deste aparelho?</h2><p>Você possui alterações ainda não enviadas. Faça backup antes. Ao receber a sala, os horários locais serão substituídos pelos do servidor.</p><div class="form-actions"><button class="btn" data-action="cancel-delete">Cancelar</button><button class="btn danger" data-action="room-force-pull">Receber e substituir</button></div>`;openDialog(dlg)}else await pullRoom();return}
    if(action==='room-force-pull'){document.getElementById('confirmDialog').close();await pullRoom(false,true);return}
    if(action==='room-push'){if(roomConflict){toast('Conflito de edição: salve backup e receba a versão atual antes de editar.');return}if(roomDirty)await pushRoom();else toast('Nada novo para enviar.');return}
    if(action==='room-leave'){const dlg=document.getElementById('confirmDialog');dlg.innerHTML=`<h2 id="confirmTitle">Sair da sala?</h2><p>Os horários continuam neste aparelho. Você perderá a sincronização até usar novamente o link.</p><div class="form-actions"><button class="btn" data-action="cancel-delete">Cancelar</button><button class="btn danger" data-action="room-leave-confirm">Sair</button></div>`;openDialog(dlg);return}
    if(action==='room-leave-confirm'){document.getElementById('confirmDialog').close();leaveRoom();return}
    if(action==='room-delete'){const dlg=document.getElementById('confirmDialog');dlg.innerHTML=`<h2 id="confirmTitle">Excluir sala de todos os aparelhos?</h2><p>O link deixará de funcionar e os dados criptografados serão excluídos da sala. Outros aparelhos manterão suas cópias locais.</p><div class="form-actions"><button class="btn" data-action="cancel-delete">Cancelar</button><button class="btn danger" data-action="room-delete-confirm">Excluir sala</button></div>`;openDialog(dlg);return}
    if(action==='room-delete-confirm'){document.getElementById('confirmDialog').close();await deleteRoom();return}
    if(action==='help'){e.preventDefault();tab='settings';render();const title=document.getElementById('pg-help-title');title?.focus({preventScroll:true});title?.scrollIntoView({block:'start',behavior:'instant'});return}
    if(action==='tab'){e.preventDefault();tab=el.dataset.tab;render();document.querySelector('.tabbar .tabbtn[aria-current="page"]')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});return}
    if(action==='skip'){state.profile.onboarded=true;save();render();return}
    if(action==='filter'){filter=el.dataset.filter;render();document.querySelector('.filterRow [data-action="filter"][aria-pressed="true"]')?.focus({preventScroll:true});return}
    if(action==='routine-filter'){routineFilter=el.dataset.filter;render();document.querySelector('.filterRow [data-action="routine-filter"][aria-pressed="true"]')?.focus({preventScroll:true});return}
    if(action==='clear-routine-search'){const input=document.getElementById('routine-search');if(input){input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));input.focus()}return}
    if(action==='status-filter'){statusFilter=el.dataset.filter;render();document.querySelector('.secondaryFilters [data-action="status-filter"][aria-pressed="true"]')?.focus({preventScroll:true});return}
    if(action==='timer-toggle'){updateTimer();if(timerRunning){timerRunning=false;timerDeadline=null}else{if(timerRemaining===0)timerRemaining=timerDuration;timerRunning=true;timerDeadline=Date.now()+timerRemaining*1000;timerFinished=false}saveTimer();render();document.querySelector('[data-action="timer-toggle"]')?.focus({preventScroll:true});return}
    if(action==='timer-reset'){timerRunning=false;timerDeadline=null;timerRemaining=timerDuration;timerFinished=false;saveTimer();render();document.querySelector('[data-action="timer-reset"]')?.focus({preventScroll:true});return}
    if(action==='timer-preset'){const minutes=Number(el.dataset.minutes);setTimerMinutes(minutes);document.querySelector(`.timer-presets [data-minutes="${minutes}"]`)?.focus({preventScroll:true});return}
    if(action==='accent'){state.settings.accent=el.dataset.accent;save();render();document.querySelector('[data-action="accent"][aria-pressed="true"]')?.focus({preventScroll:true});return}
    if(action==='wipe-routines'){const dlg=document.getElementById('confirmDialog');dlg.innerHTML=`<h2 id="confirmTitle">Apagar todas as rotinas salvas?</h2><p>As refeições e medicamentos serão removidos deste aparelho. O histórico de horários concluídos será preservado. Se você estiver em uma sala, a exclusão será sincronizada.</p><div class="form-actions"><button class="btn" data-action="cancel-delete">Cancelar</button><button class="btn danger" data-action="wipe-routines-confirm">Apagar rotinas</button></div>`;openDialog(dlg);return}
    if(action==='wipe-routines-confirm'){state.items=[];save();document.getElementById('confirmDialog').close();render();toast('Todas as rotinas foram apagadas.');return}
    if(action==='wipe'){const dlg=document.getElementById('confirmDialog');dlg.innerHTML=`<h2 id="confirmTitle">Apagar todos os dados?</h2><p>Essa ação apaga definitivamente horários, medicamentos, histórico e preferências neste navegador. Antes, exporte um backup se quiser. Isso também desconecta este aparelho de qualquer Sala, mas não exclui a sala na nuvem.</p><div class="form-actions"><button class="btn" data-action="cancel-delete">Cancelar</button><button class="btn danger" data-action="wipe-confirm">Apagar permanentemente</button></div>`;openDialog(dlg);return}
    if(action==='wipe-confirm'){localStorage.removeItem(KEY);localStorage.removeItem(LEGACY);localStorage.removeItem(TIMERKEY);localStorage.removeItem(ROOM_STORAGE);clearTimeout(roomDebounce);room=null;roomVersion=0;roomDirty=false;roomConflict=false;roomSyncedAt=0;roomSnapshot='';state=initial();timerRunning=false;timerDeadline=null;timerFinished=false;timerDuration=15*60;timerRemaining=timerDuration;tab='today';document.getElementById('confirmDialog').close();render();toast('Dados apagados deste navegador.');return}
    if(action==='test-alarm'){toast('Este é um aviso de teste.');beep();if('Notification' in window&&Notification.permission==='granted')void showSystemNotice('Cuidador(a) — teste','Notificação de teste',`test-${Date.now()}`);return}
    if(action==='legal'){const dlg=document.getElementById('legalDialog');dlg.innerHTML=(legalContent[el.dataset.page]||legalContent.privacidade)+`<div class="form-actions"><button class="btn primary" data-action="close-legal">Entendi</button></div>`;openDialog(dlg);return}
    if(action==='close-legal'){document.getElementById('legalDialog').close();return}
    if(action==='add'){if(room&&!roomCanEdit(room)){toast('Sala somente leitura.');return}openEditor(null,el.dataset.type||'meal');return}
    if(action==='edit'){const item=state.items.find(x=>x.id===id);if(item)openEditor(item);return}
    if(action==='archive'){
      const item=state.items.find(x=>x.id===id);if(!item)return;
      const hadFocus=document.activeElement===el;
      setState(s=>({...s,items:s.items.map(x=>x.id===id?{...x,archived:!x.archived}:x)}));
      if(hadFocus)[...document.querySelectorAll('.routine-card [data-action="archive"]')].find(button=>button.dataset.id===id)?.focus({preventScroll:true});
      toast(item.archived?'Rotina reativada.':'Rotina arquivada.');return
    }
    if(['timeline-edit','timeline-remove'].includes(action)){
      if(roomConflict){tab='room';render();toast('Resolva o conflito da sala antes de alterar.');return}
      const item=state.items.find(x=>x.id===id&&!x.archived);
      if(!item||!item.times.includes(el.dataset.time)){toast('Este horário mudou. Atualize a rotina.');return}
      if(action==='timeline-edit')editTimelineOccurrence(item,el.dataset.time);else removeTimelineOccurrence(item,el.dataset.time);return;
    }
    if(action==='timeline-full-edit'){const item=state.items.find(x=>x.id===id);document.getElementById('confirmDialog').close();if(item)openEditor(item);return}
    if(action==='timeline-confirm-remove'){
      const item=state.items.find(x=>x.id===id);
      if(!item){toast('Horário não encontrado.');return}
      try{const update=removeOccurrenceTime(item,el.dataset.time);setState(s=>({...s,items:update?s.items.map(x=>x.id===id?update:x):s.items.filter(x=>x.id!==id)}));document.getElementById('confirmDialog').close();focusChangedTimelineItem(id);toast('Horário removido. Histórico preservado.')}catch(err){toast(err.message)}return;
    }
    if(action==='delete'){const item=state.items.find(x=>x.id===id);if(item)confirmDelete(item);return}
    if(action==='confirm-delete'){setState(s=>({...s,items:s.items.filter(x=>x.id!==id)}));document.getElementById('confirmDialog').close();document.querySelector('.toolRow [data-action="add"]:not(:disabled)')?.focus({preventScroll:true});toast('Horário removido.');return}
    if(action==='cancel-delete'){document.getElementById('confirmDialog').close();return}
    if(action==='close-edit'){document.getElementById('editDialog').close();return}
    if(action==='toggle'){const key=el.dataset.key;mark(key);[...document.querySelectorAll('[data-action="toggle"]')].find(button=>button.dataset.key===key)?.focus({preventScroll:true});return}
    if(action==='day'){const d=parseDate(historyDay);d.setDate(d.getDate()+Number(el.dataset.delta));if(dateKey(d)<=dateKey(new Date())){historyDay=dateKey(d);render();const next=document.querySelector(`[data-action="day"][data-delta="${el.dataset.delta}"]`);if(next&&!next.disabled)next.focus({preventScroll:true});else document.querySelector('#history-date')?.focus({preventScroll:true})}return}
    if(action==='backup'){downloadBackup();return}
    if(action==='import'){document.getElementById('import-file').click();return}
    if(action==='ics'){makeICS();return}
    if(action==='install'){if(deferredInstall){deferredInstall.prompt();const r=await deferredInstall.userChoice;deferredInstall=null;if(r?.outcome==='accepted')toast('Instalação iniciada.')}else toast('Abra o menu do navegador e escolha Instalar app ou Adicionar à tela inicial.');return}
  });
  document.addEventListener('submit',e=>{
    if(e.target?.id==='timeline-time-form'){
      e.preventDefault();if(room&&(!roomCanEdit(room)||roomConflict)){toast('Não é possível editar esta sala agora.');return}
      const dlg=document.getElementById('confirmDialog');const id=dlg.dataset.id,from=dlg.dataset.time;
      const item=state.items.find(x=>x.id===id&&!x.archived);
      if(!item){toast('Essa rotina não existe mais.');return}
      try{const to=String(new FormData(e.target).get('time'));const next=changeOccurrenceTime(item,from,to);setState(s=>({...s,items:s.items.map(x=>x.id===id?next:x)}));dlg.close();focusChangedTimelineItem(id,to);toast('Horário atualizado em todos os dias. Histórico preservado.')}catch(err){toast(err.message)}
      return;
    }
    if(e.target?.id==='onboard-form'){e.preventDefault();const data=new FormData(e.target);const times=['Café da manhã','Almoço','Lanche','Jantar'];const items=[];for(let i=0;i<4;i++){if(!data.get('meal-'+i))continue;const time=data.get('time-'+i);if(!isTime(time)){toast('Corrija os horários das refeições.');return}items.push({id:uid(),type:'meal',title:times[i],dose:'',note:'',times:[time],days:[0,1,2,3,4,5,6],archived:false,createdAt:new Date().toISOString()})}state.profile={name:String(data.get('name')||'').trim().slice(0,60),onboarded:true};state.items=items;save();render();toast('Sua rotina começou! Os horários podem ser editados.');}
    if(e.target?.id==='timer-custom-form'){e.preventDefault();const minutes=Number(new FormData(e.target).get('minutes'));const fromInput=document.activeElement?.id==='timer-minutes';setTimerMinutes(minutes);(fromInput?document.getElementById('timer-minutes'):document.querySelector('#timer-custom-form button[type="submit"]'))?.focus({preventScroll:true});return}
    if(e.target?.id==='profile-form'){e.preventDefault();if(room&&!roomCanEdit(room)){toast('Sala somente leitura.');return}state.profile.name=String(new FormData(e.target).get('name')||'').trim().slice(0,60);save();renderKeepingControlFocus('profile-name',true);toast('Perfil atualizado.')}
  });
  document.addEventListener('change',e=>{
    if(e.target.dataset?.setting){if(room&&!roomCanEdit(room)){toast('Sala somente leitura.');renderKeepingControlFocus(e.target.id);return}if(room&&roomConflict){toast(conflictMessage);renderKeepingControlFocus(e.target.id);return}const k=e.target.dataset.setting;const v=e.target.type==='checkbox'?e.target.checked:(['lead','weekStart','volume'].includes(k)?Number(e.target.value):e.target.value);state.settings=normalizePreferences({...state.settings,[k]:v});save();renderKeepingControlFocus(e.target.id);return}
    if(e.target.id==='reminder-switch'){if(room&&!roomCanEdit(room)){toast('Sala somente leitura.');render();return}if(room&&roomConflict){toast(conflictMessage);render();return}void activateReminders(e.target.checked);return}
    if(e.target.id==='history-date'){const d=e.target.value;if(/^\d{4}-\d\d-\d\d$/.test(d)&&dateKey(parseDate(d))===d&&d<=dateKey(new Date())){historyDay=d;renderKeepingControlFocus('history-date',true)}return}
    if(e.target.id==='import-file'){void importBackup(e.target.files?.[0]);e.target.value='';return}
  });
  document.addEventListener('input',e=>{
    if(e.target.id!=='routine-search')return;
    searchQuery=e.target.value;
    const root=document.getElementById('main-content');
    if(!root)return;
    const items=new Map(state.items.map(item=>[item.id,item]));
    let active=0,archived=0;
    for(const card of root.querySelectorAll('.routine-card')){
      const item=items.get(card.dataset.routineId);
      const visible=routineMatches(item,searchQuery);
      card.hidden=!visible;
      if(visible){if(item.archived)archived++;else active++}
    }
    const activeCount=root.querySelector('#routine-active-count');
    const archivedCount=root.querySelector('#routine-archived-count');
    if(activeCount)activeCount.textContent=String(active);
    if(archivedCount)archivedCount.textContent=String(archived);
    const empty=root.querySelector('#routine-search-empty');
    if(empty)empty.hidden=!searchQuery.trim()||active+archived>0;
    const clear=root.querySelector('.routine-clear');
    if(clear)clear.hidden=!searchQuery.trim();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(state.settings.theme==='system')render()});
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e});
  window.addEventListener('appinstalled',()=>{deferredInstall=null;toast('Cuidador(a) instalado.')});
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Service Worker:',err)));
  window.addEventListener('storage',e=>{
    // Access credentials are shared between tabs. A removed/rotated room must not
    // remain active in memory on another tab; ordinary version updates are safe.
    if(e.key===ROOM_STORAGE||e.key===null){
      let stored=null;
      try{stored=JSON.parse(e.key===ROOM_STORAGE?e.newValue:localStorage.getItem(ROOM_STORAGE))}catch{}
      const sameAccess=room&&stored&&stored.id===room.id&&stored.key===room.key
        &&(stored.editorSecret||'')===(room.editorSecret||'')
        &&Boolean(stored.unsafeReadOnly)===Boolean(room.unsafeReadOnly);
      if(room&&!sameAccess){
        clearTimeout(roomDebounce);roomDebounce=null;
        room=null;roomVersion=0;roomDirty=false;roomConflict=false;roomSyncedAt=0;roomSnapshot='';
        roomError='A Sala foi desconectada ou os convites mudaram em outra aba. Seus horários locais foram preservados.';
        tab='room';render();
      }
    }
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
  let lastDay=dateKey(new Date()),lastTodayMinute=Math.floor(Date.now()/60000);setInterval(()=>{const now=new Date(),day=dateKey(now),minute=Math.floor(now.getTime()/60000);if(day!==lastDay){lastDay=day;historyDay=day;render()}else if(shouldRefreshToday(lastTodayMinute,minute,tab,document.visibilityState==='visible',state.profile.onboarded))render();lastTodayMinute=minute;checkReminders()},30000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){if(tab==='today')render();checkReminders()}});
  function autoSyncRoom(){
    const plan=syncPlan({connected:!!room,visible:document.visibilityState==='visible',online:navigator.onLine,busy:roomBusy,pendingInvitation:!!pendingInvitation,conflict:roomConflict,dirty:roomDirty,canEdit:roomCanEdit(room)});
    if(plan==='push')void pushRoom();else if(plan==='pull')void pullRoom(true);
    if(tab==='room'&&!roomBusy)render();
  }
  setInterval(autoSyncRoom,roomRefreshIntervalMs());
  window.addEventListener('online',autoSyncRoom);
  window.addEventListener('offline',()=>{if(tab==='room')render()});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')autoSyncRoom()});
  if(room&&!pendingInvitation){roomSnapshot=JSON.stringify(sharedSnapshot(state));setTimeout(autoSyncRoom,1800)}
  setInterval(timerTick,400);render();checkReminders();
})();
