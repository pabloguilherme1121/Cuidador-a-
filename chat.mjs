/** End-to-end encrypted room chat. All message content stays in the browser. */
import {roomCanEdit,completeCredentials} from './room.mjs';
const encoder=new TextEncoder(),decoder=new TextDecoder();
const to64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const from64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
const ID=/^[\w-]{16}$/;
export const validChatText=v=>typeof v==='string'&&v.trim().length>=1&&v.trim().length<=500;
/** Keep the chat actions consistent with network and request state. */
export const shouldPaintChat=({painted=false,full=false,changed=false}={})=>!painted||full||changed;
export function chatControlsState({online=true,loading=false,sending=false,canSend=false,hasDraft=true}={}){
 return {
  refreshDisabled:online!==true||loading===true,
  sendDisabled:online!==true||sending===true||canSend!==true||hasDraft!==true,
  clearDisabled:online!==true||sending===true||canSend!==true
 };
}
/** A draft is ephemeral and is never restored to a different shared room. */
export const chatDraftForRoom=(draft,roomId)=>draft&&draft.roomId===roomId?draft:null;
/** Only clear the exact text that the server accepted; preserve typing during pending sends. */
export const shouldClearSentDraft=(current,sent)=>current===sent;
/** Limit the alias using the same Unicode code-point contract as encrypted messages. */
export const limitChatAlias=value=>Array.from(String(value??'')).slice(0,28).join('');
export const validChatEnvelope=v=>Boolean(v&&ID.test(v.id||'')&&/^[\w-]{16}$/.test(v.iv||'')&&/^[\w-]{22,2500}$/.test(v.ciphertext||''));
async function aesKey(room){return crypto.subtle.importKey('raw',from64(room.key),'AES-GCM',false,['encrypt','decrypt'])}
export async function createChatMessage(room,{author,text}){
 if(!room||!validChatText(text))throw new Error('Escreva uma mensagem de até 500 caracteres.');
 const display=limitChatAlias(String(author||'Cuidador').trim())||'Cuidador';
 const id=to64(crypto.getRandomValues(new Uint8Array(12))),iv=crypto.getRandomValues(new Uint8Array(12));
 const payload=encoder.encode(JSON.stringify({v:1,author:display,text:text.trim()}));
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(`${room.id}:chat:${id}`)},await aesKey(room),payload);
 const result={id,iv:to64(iv),ciphertext:to64(new Uint8Array(encrypted))};
 if(!validChatEnvelope(result))throw new Error('Mensagem muito grande.');
 return result;
}
export async function openChatMessage(room,data){
 if(!validChatEnvelope(data))throw new Error('Mensagem recebida inválida.');
 const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(data.iv),additionalData:encoder.encode(`${room.id}:chat:${data.id}`)},await aesKey(room),from64(data.ciphertext));
 const payload=JSON.parse(decoder.decode(bytes));
 if(payload?.v!==1||!validChatText(payload.text)||typeof payload.author!=='string'||Array.from(payload.author).length>28)throw new Error('Conteúdo da mensagem inválido.');
 return {id:data.id,author:payload.author,text:payload.text,createdAt:data.createdAt};
}
/** Adaptive checks protect free-tier quotas; manual refresh remains available. */
export function chatRefreshIntervalMs({idleCycles=0,failures=0,rateLimited=false}={}){
 if(rateLimited)return 900000;
 if(failures>0)return Math.min(900000,60000*2**Math.min(failures,4));
 return Math.min(300000,60000+Math.max(0,idleCycles)*60000);
}
export function chatMarkup(canSend){
 return `<section class="panel setting-card chat-card" aria-labelledby="chat-title">
   <div class="chat-heading"><div><h2 id="chat-title">Conversa da sala</h2><p class="help">Mensagens criptografadas. As pessoas com o link de edição podem responder.</p></div><span class="chat-lock" aria-label="Criptografia de ponta a ponta">Privado</span></div>
   <div class="chat-messages" id="chat-messages" role="log" aria-label="Mensagens da sala" aria-live="polite" aria-relevant="additions text"><p class="help">Carregando conversa…</p></div>
   <div class="chat-sync"><p class="help" id="chat-status" role="status">A conversa é visível a quem possui o convite da sala.</p><button type="button" id="chat-refresh" class="btn small ghost">Atualizar mensagens</button></div>
   ${canSend?`<form id="chat-form" class="chat-form"><label for="chat-alias">Como quer aparecer</label><input id="chat-alias" name="alias" autocomplete="nickname" maxlength="56" aria-describedby="chat-alias-help" placeholder="Ex.: Familiar"><small id="chat-alias-help" class="help">Até 28 caracteres, inclusive emojis.</small><label for="chat-text">Mensagem</label><textarea id="chat-text" name="message" maxlength="500" rows="2" required placeholder="Escreva uma mensagem para os cuidadores…"></textarea><button type="submit" class="btn primary" id="chat-send">Enviar mensagem</button></form><button class="btn ghost chat-clear" id="chat-clear" type="button">Apagar conversa para todos</button>`:`<p class="mini-flag">Este convite permite acompanhar a conversa. Para enviar mensagens, peça um link de edição ao responsável.</p>`}
   <p class="help">Evite compartilhar dados desnecessários. Alertas de novas mensagens não são garantidos com o aplicativo fechado.</p>
 </section>`;
}
/** Mount only in Sala; stop polling when the tab is removed or browser is hidden. */
export function mountRoomChat(element,room,{onError=()=>{}}={}){
 if(!element||!room)return ()=>{};
 let alive=true,loading=false,refreshAfterLoad=false,cursor='',messages=[],timer=null,polls=0,idleCycles=0,failures=0,rateLimited=false,painted=false;
 const box=element.querySelector('#chat-messages'),status=element.querySelector('#chat-status'),form=element.querySelector('#chat-form');
 const refreshButton=element.querySelector('#chat-refresh'),sendButton=form?.querySelector('#chat-send'),clearButton=element.querySelector('#chat-clear');
 const alias=element.querySelector('#chat-alias'),draft=form?.querySelector('#chat-text');
 try{if(alias)alias.value=limitChatAlias(localStorage.getItem('cuidadora-chat-alias')||'')}catch{}
 const clampAlias=event=>{if(event?.isComposing)return;if(alias)alias.value=limitChatAlias(alias.value)};
 alias?.addEventListener('input',clampAlias);
 alias?.addEventListener('compositionend',clampAlias);
 const setStatus=text=>{if(alive&&status?.isConnected)status.textContent=text};
 const syncControls=()=>{
  if(!alive)return;
  const ui=chatControlsState({online:navigator.onLine,loading,sending:form?.dataset.sending==='yes',canSend:roomCanEdit(room),hasDraft:validChatText(draft?.value)});
  if(refreshButton)refreshButton.disabled=ui.refreshDisabled;
  if(sendButton){sendButton.disabled=ui.sendDisabled;sendButton.textContent=form?.dataset.sending==='yes'?'Enviando…':'Enviar mensagem';}
  if(clearButton)clearButton.disabled=ui.clearDisabled;
  if(status)status.dataset.offline=String(!navigator.onLine);
  if(!navigator.onLine)setStatus('Sem conexão. As mensagens já carregadas continuam visíveis; o texto digitado não será enviado até a rede voltar.');
 };
 const paint=()=>{
  if(!alive||!box?.isConnected)return;
  const nearBottom=box.scrollHeight-box.scrollTop-box.clientHeight<90;
  box.replaceChildren();
  if(!messages.length){const p=document.createElement('p');p.className='chat-empty';p.textContent='Nenhuma mensagem ainda. Inicie a conversa para organizar os cuidados.';box.append(p)}
  for(const m of messages){
   const article=document.createElement('article');article.className='chat-message';
   const meta=document.createElement('div');meta.className='chat-meta';
   const name=document.createElement('strong');name.textContent=m.author;
   const date=document.createElement('time');date.dateTime=new Date(m.createdAt).toISOString();date.textContent=new Date(m.createdAt).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
   meta.append(name,date);
   const content=document.createElement('p');content.textContent=m.text;article.append(meta,content);box.append(article);
  }
  if(nearBottom)box.scrollTop=box.scrollHeight;
 };
 const schedule=()=>{clearTimeout(timer);if(!alive)return;timer=setTimeout(()=>void refresh(),chatRefreshIntervalMs({idleCycles,failures,rateLimited}));};
 const refresh=async(force=false)=>{
  if(!alive||!navigator.onLine||document.visibilityState!=='visible')return;
  if(!box?.isConnected)return;
  if(loading){if(force)refreshAfterLoad=true;return;}
  loading=true;syncControls();
  try{
   const cred=await completeCredentials(room);
   const full=force||++polls%6===0;
   const url=`/api/rooms/${encodeURIComponent(room.id)}/messages${cursor&&!full?'?after='+encodeURIComponent(cursor):''}`;
   const res=await fetch(url,{headers:{'X-Room-Read-Token':cred.readToken,...(cred.token?{'X-Room-Token':cred.token}:{})},cache:'no-store'});
   if(!res.ok){rateLimited=res.status===429;throw Error(res.status===404?'Sala removida ou inacessível.':rateLimited?'Limite temporário de solicitações. Aguarde para atualizar.':'Não foi possível consultar o chat.');}
   const data=await res.json();if(!Array.isArray(data.messages))throw Error('Resposta de chat inválida.');
   const incoming=[];
   for(const item of data.messages){try{incoming.push(await openChatMessage(room,item))}catch{ /* bad ciphertext is never rendered */ }}
   if(!alive)return;
   if(full){messages=[];cursor=''}
   const ids=new Set(messages.map(x=>x.id));const hadNew=incoming.some(m=>!ids.has(m.id));for(const m of incoming)if(!ids.has(m.id)){messages.push(m);ids.add(m.id)}
   messages=messages.slice(-100);cursor=data.cursor||cursor;
   idleCycles=hadNew?0:Math.min(10,idleCycles+1);failures=0;rateLimited=false;
   if(shouldPaintChat({painted,full,changed:hadNew})){paint();painted=true}
   setStatus(hadNew?'Novas mensagens recebidas.':'Conversa atualizada.');
  }catch(e){failures=Math.min(5,failures+1);setStatus(e.message||'Chat temporariamente indisponível.');onError(e)}finally{
   loading=false;schedule();syncControls();
   // A send can finish while a GET is still in flight. Coalesce requests
   // and read again once the previous response has been processed.
   if(refreshAfterLoad&&alive){refreshAfterLoad=false;void refresh(true)}
  }
 };
 const submit=async e=>{
  e.preventDefault();if(!roomCanEdit(room)||!form||form.dataset.sending==='yes')return;
  if(!navigator.onLine){syncControls();return;}
  const field=form.querySelector('#chat-text');const message=field.value;
  if(!validChatText(message)){setStatus('Escreva uma mensagem de até 500 caracteres.');return}
  form.dataset.sending='yes';syncControls();
  try{
   const author=limitChatAlias(alias?.value?.trim()||'Cuidador');
   const encrypted=await createChatMessage(room,{author,text:message});
   const cred=await completeCredentials(room);
   const res=await fetch(`/api/rooms/${room.id}/messages`,{method:'POST',headers:{'Content-Type':'application/json','X-Room-Token':cred.token},body:JSON.stringify(encrypted),cache:'no-store'});
   if(!res.ok){const payload=await res.json().catch(()=>({}));throw Error(payload.error||'Falha ao enviar mensagem')}
   if(shouldClearSentDraft(field.value,message))field.value='';try{localStorage.setItem('cuidadora-chat-alias',limitChatAlias(author))}catch{}
   await refresh(true);setStatus('Mensagem enviada.');
  }catch(e){setStatus('Mensagem não enviada: '+e.message)}finally{delete form.dataset.sending;syncControls()}
 };
 const clear=async()=>{
  if(!navigator.onLine){syncControls();return;}
  if(!roomCanEdit(room)||!confirm('Apagar todas as mensagens da sala em todos os aparelhos? Esta ação não pode ser desfeita.'))return;
  try{const cred=await completeCredentials(room);const res=await fetch(`/api/rooms/${room.id}/messages`,{method:'DELETE',headers:{'X-Room-Token':cred.token},cache:'no-store'});if(!res.ok)throw Error('Falha ao apagar conversa');messages=[];cursor='';paint();setStatus('Conversa apagada para todos.')}catch(e){setStatus(e.message)}
 };
 draft?.addEventListener('input',syncControls);
 form?.addEventListener('submit',submit);
 clearButton?.addEventListener('click',clear);
 const manualRefresh=()=>{idleCycles=0;void refresh(true)};
 const visibility=()=>{if(document.visibilityState==='visible')void refresh();else clearTimeout(timer)};
 const onOnline=()=>{syncControls();void refresh()};
 const onOffline=()=>syncControls();
 refreshButton?.addEventListener('click',manualRefresh);
 document.addEventListener('visibilitychange',visibility);window.addEventListener('online',onOnline);window.addEventListener('offline',onOffline);
 syncControls();void refresh();
 return ()=>{alive=false;clearTimeout(timer);alias?.removeEventListener('input',clampAlias);alias?.removeEventListener('compositionend',clampAlias);window.removeEventListener('online',onOnline);window.removeEventListener('offline',onOffline);refreshButton?.removeEventListener('click',manualRefresh);document.removeEventListener('visibilitychange',visibility);draft?.removeEventListener('input',syncControls);form?.removeEventListener('submit',submit);clearButton?.removeEventListener('click',clear)};
}
