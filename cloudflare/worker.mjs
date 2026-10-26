/** Cloudflare Workers Free + D1: private ciphertext only. No plaintext health data on server. */
export const SOURCE_REVISION='__PINNED_SHA__';
const SOURCE=`https://raw.githubusercontent.com/pabloguilherme1121/Cuidador-a-/${SOURCE_REVISION}/`;
const ASSETS=new Set(['index.html','app.js','core.mjs','room.mjs','timeline.mjs','chat.mjs','styles.css','sw.js','manifest.webmanifest','robots.txt','assets/icon.svg','assets/icon-maskable.svg','assets/icon-192.png','assets/icon-512.png','assets/apple-touch-icon.png','assets/icon-maskable-512.png','assets/pg-bot.webp']);
const TYPES={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',mjs:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',webmanifest:'application/manifest+json; charset=utf-8',txt:'text/plain; charset=utf-8',png:'image/png',webp:'image/webp',svg:'image/svg+xml; charset=utf-8'};
const CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'";
const JSON_HEADERS={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const CHAT_ID=/^[\w-]{16}$/;const CHAT_IV=/^[\w-]{16}$/;const CHAT_CIPHER=/^[\w-]{22,2500}$/;
const OK_ID=/^[\w-]{22}$/; const OK_HASH=/^[\w-]{43}$/;const OK_IV=/^[\w-]{16}$/;const OK_CIPHER=/^[\w-]{22,140000}$/;
export const isValidEnvelope=e=>e&&typeof e==='object'&&OK_IV.test(e.iv||'')&&OK_CIPHER.test(e.ciphertext||'');
const response=(o,status=200)=>new Response(JSON.stringify(o),{status,headers:JSON_HEADERS});
const parse=async req=>{if(Number(req.headers.get('content-length'))>145000)throw new Error('Arquivo muito grande');const s=await req.text();if(s.length>145000)throw new Error('Arquivo muito grande');return JSON.parse(s)};
const checkOrigin=req=>{const origin=req.headers.get('Origin');return !origin||origin===new URL(req.url).origin};
// Only pseudonymous, time-bucketed HMACs enter D1; the raw IP is never stored.
// This deters casual automation; shared IPs and botnets can cause false positives/evasion.
export const CREATE_LIMITS=Object.freeze([{windowMs:900000,max:8},{windowMs:86400000,max:32}]);
export async function creationGuard(req,env,now=Date.now()){
 const ip=req.headers.get('CF-Connecting-IP');
 if(!env.CARE_ROOMS||typeof env.ABUSE_SALT!=='string'||env.ABUSE_SALT.length<24||!ip||ip.length>80)return {allowed:false,status:503};
 try{
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.ABUSE_SALT),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  for(const {windowMs,max} of CREATE_LIMITS){
   const slot=Math.floor(now/windowMs),value=new TextEncoder().encode(`${windowMs}:${slot}:${ip}`);
   const digest=await crypto.subtle.sign('HMAC',key,value);
   const bucket=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
   const expiry=(slot+1)*windowMs;
   const result=await env.CARE_ROOMS.prepare('INSERT INTO creation_quotas (bucket, used, expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET used=used+1 WHERE used < ? RETURNING used').bind(bucket,expiry,max).first();
   if(!result)return {allowed:false,status:429,retryAfter:Math.ceil(windowMs/1000)};
  }
  // Opportunistic bounded cleanup; rate checks never depend on cleanup success.
  if(Math.random()<0.03){
   try{await env.CARE_ROOMS.prepare('DELETE FROM creation_quotas WHERE bucket IN (SELECT bucket FROM creation_quotas WHERE expires_at < ? LIMIT 128)').bind(now).run()}catch{}
  }
  return {allowed:true};
 }catch{return {allowed:false,status:503}}
}
export function requestCategory(path){
 if(path==='/api/health')return 'health';
 if(path==='/api/rooms')return 'rooms';
 if(/^\/api\/rooms\/[^/]+\/messages$/.test(path))return 'room-messages';
 if(/^\/api\/rooms\/[^/]+$/.test(path))return 'room';
 return path.startsWith('/api/')?'unknown-api':'asset';
}
export function healthPayload(){return {status:'ok',service:'cuidadora',revision:SOURCE_REVISION}}
export function responseWithOperations(res,{requestId,retryAfter}={}){
 const headers=new Headers(res.headers);
 if(requestId)headers.set('X-Request-ID',requestId);
 if(retryAfter)headers.set('Retry-After',String(retryAfter));
 return new Response(res.body,{status:res.status,statusText:res.statusText,headers});
}

const hashToken=async token=>{const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));return btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
async function authorized(req,authHash,header='X-Room-Token'){const auth=req.headers.get(header)||'';if(!OK_HASH.test(auth))return false;const digest=await hashToken(auth);let diff=0;for(let i=0;i<43;i++)diff|=digest.charCodeAt(i)^authHash.charCodeAt(i);return diff===0}
export async function roomApi(req,env){
 if(!env.CARE_ROOMS)return response({error:'Salas temporariamente indisponíveis'},503);
 if(!checkOrigin(req))return response({error:'Origem não autorizada'},403);
 const url=new URL(req.url),path=url.pathname;
 if(path==='/api/rooms'&&req.method==='POST'){
  let data;try{data=await parse(req)}catch{return response({error:'Formato inválido ou muito grande'},400)}
  if(!OK_ID.test(data.id||'')||!OK_HASH.test(data.authHash||'')||!OK_HASH.test(data.readHash||'')||!isValidEnvelope(data))return response({error:'Sala inválida'},400);
  try{await env.CARE_ROOMS.prepare('INSERT INTO rooms (id,auth_hash,read_hash,iv,ciphertext,version,updated_at) VALUES (?,?,?,?,?,1,?)').bind(data.id,data.authHash,data.readHash,data.iv,data.ciphertext,Date.now()).run();return response({version:1},201)}catch{return response({error:'Não foi possível criar a sala'},409)}
 }
 const match=/^\/api\/rooms\/([\w-]{22})(\/messages)?$/.exec(path);if(!match)return response({error:'Não encontrado'},404);
 const id=match[1],isChat=Boolean(match[2]),row=await env.CARE_ROOMS.prepare('SELECT id,auth_hash,read_hash,iv,ciphertext,version,updated_at FROM rooms WHERE id=?').bind(id).first();
 if(!row)return response({error:'Sala não encontrada'},404);
 if(isChat)return chatApi(req,env,id,row);
 if(req.method==='GET'){
  if(row.read_hash){
   if(!await authorized(req,row.read_hash,'X-Room-Read-Token')&&!await authorized(req,row.auth_hash))return response({error:'Não autorizado'},403);
  }else if(!await authorized(req,row.auth_hash))return response({error:'Não autorizado'},403);
  // Authenticate before inspecting If-None-Match; never reveal whether a private room exists.
  const etag=`"v${row.version}"`;
  if(req.headers.get('If-None-Match')===etag)return new Response(null,{status:304,headers:{...JSON_HEADERS,ETag:etag}});
  const headers={...JSON_HEADERS,ETag:etag};
  return new Response(JSON.stringify({version:row.version,iv:row.iv,ciphertext:row.ciphertext,updatedAt:row.updated_at,legacy:!row.read_hash}),{status:200,headers});
 }
 if(!await authorized(req,row.auth_hash))return response({error:'Não autorizado'},403);
 if(req.method==='DELETE'){await env.CARE_ROOMS.prepare('DELETE FROM room_messages WHERE room_id=?').bind(id).run();await env.CARE_ROOMS.prepare('DELETE FROM rooms WHERE id=? AND auth_hash=?').bind(id,row.auth_hash).run();return response({deleted:true})}
 if(req.method==='PUT'){
  let data;try{data=await parse(req)}catch{return response({error:'Arquivo inválido'},400)}
  if(!isValidEnvelope(data)||!Number.isSafeInteger(data.version)||data.version<1)return response({error:'Dados inválidos'},400);
  const result=await env.CARE_ROOMS.prepare('UPDATE rooms SET iv=?,ciphertext=?,version=version+1,updated_at=? WHERE id=? AND version=? AND auth_hash=?').bind(data.iv,data.ciphertext,Date.now(),id,data.version,row.auth_hash).run();
  if(result.meta?.changes!==1)return response({error:'A sala mudou em outro aparelho. Atualize antes de enviar.',conflict:true},409);
  return response({version:data.version+1});
 }
 return response({error:'Método não permitido'},405);
}

/** Chat is ciphertext-only, and never grants editor permissions to viewing invitations. */
async function chatApi(req,env,id,row){
 const db=env.CARE_ROOMS;
 if(req.method==='GET'){
  if(row.read_hash&&!await authorized(req,row.read_hash,'X-Room-Read-Token')&&!await authorized(req,row.auth_hash))return response({error:'Não autorizado'},403);
  // Legacy rooms used the editing token to read and did not support read-only links.
  if(!row.read_hash&&!await authorized(req,row.auth_hash))return response({error:'Não autorizado'},403);
  const cursor=new URL(req.url).searchParams.get('after')||'';
  if(cursor&&!/^\d{12,14}\.[\w-]{16}$/.test(cursor))return response({error:'Cursor inválido'},400);
  let list;
  if(cursor){const [timestamp,msgId]=cursor.split('.');
   const r=await db.prepare('SELECT id,iv,ciphertext,created_at FROM room_messages WHERE room_id=? AND (created_at>? OR (created_at=? AND id>?)) ORDER BY created_at ASC,id ASC LIMIT 60').bind(id,Number(timestamp),Number(timestamp),msgId).all();list=r.results||[];
  }else{
   const r=await db.prepare('SELECT id,iv,ciphertext,created_at FROM room_messages WHERE room_id=? ORDER BY created_at DESC,id DESC LIMIT 60').bind(id).all();list=(r.results||[]).reverse();
  }
  const messages=list.map(m=>({id:m.id,iv:m.iv,ciphertext:m.ciphertext,createdAt:m.created_at}));
  const last=list.at(-1),nextCursor=last?`${last.created_at}.${last.id}`:cursor;
  return response({messages,cursor:nextCursor});
 }
 if(!await authorized(req,row.auth_hash))return response({error:'Somente quem pode editar consegue enviar ou apagar mensagens'},403);
 if(req.method==='DELETE'){
  await db.prepare('DELETE FROM room_messages WHERE room_id=?').bind(id).run();return response({deleted:true});
 }
 if(req.method!=='POST')return response({error:'Método não permitido'},405);
 let msg;try{msg=await parse(req)}catch{return response({error:'Mensagem inválida'},400)}
 if(!msg||!CHAT_ID.test(msg.id||'')||!CHAT_IV.test(msg.iv||'')||!CHAT_CIPHER.test(msg.ciphertext||''))return response({error:'Mensagem cifrada inválida'},400);
 const now=Date.now();
 const rate=await db.prepare('SELECT COUNT(*) AS count FROM room_messages WHERE room_id=? AND created_at>?').bind(id,now-60000).first();
 if(Number(rate?.count)>=12)return response({error:'Aguarde antes de enviar novas mensagens.'},429);
 const inserted=await db.prepare('INSERT OR IGNORE INTO room_messages (room_id,id,iv,ciphertext,created_at) VALUES (?,?,?,?,?)').bind(id,msg.id,msg.iv,msg.ciphertext,now).run();
 if(inserted.meta?.changes===0)return response({saved:true,duplicate:true});
 // Keep at most 200 encrypted messages per room, without collecting usage profiles.
 await db.prepare('DELETE FROM room_messages WHERE room_id=? AND id NOT IN (SELECT id FROM room_messages WHERE room_id=? ORDER BY created_at DESC,id DESC LIMIT 200)').bind(id,id).run();
 return response({saved:true},201);
}
async function staticAsset(req){
 if(!['GET','HEAD'].includes(req.method))return new Response('Método não permitido',{status:405});
 const url=new URL(req.url),path=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';
 if(!ASSETS.has(path))return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}});
 const upstream=await fetch(SOURCE+path,{cf:{cacheEverything:true,cacheTtl:180}});
 if(!upstream.ok)return new Response('Recurso temporariamente indisponível',{status:502});
 const ext=path.slice(path.lastIndexOf('.')+1),headers=new Headers();
 headers.set('Content-Type',TYPES[ext]||'application/octet-stream');headers.set('X-Content-Type-Options','nosniff');
 headers.set('X-Frame-Options','DENY');headers.set('Referrer-Policy','no-referrer');
 headers.set('Permissions-Policy','camera=(),microphone=(),geolocation=()');
 headers.set('Content-Security-Policy',CSP);headers.set('Strict-Transport-Security','max-age=31536000');
 headers.set('Cache-Control',['index.html','sw.js','app.js','room.mjs','chat.mjs','core.mjs','timeline.mjs','styles.css'].includes(path)?'no-cache, must-revalidate':'public, max-age=600');
 if(path==='sw.js')headers.set('Service-Worker-Allowed','/');
 return new Response(req.method==='HEAD'?null:upstream.body,{status:200,headers});
}
export default {async fetch(req,env){
 const start=Date.now(),url=new URL(req.url),category=requestCategory(url.pathname),requestId=crypto.randomUUID();
 let result, retryAfter;
 try{
  if(url.protocol!=='https:'){
   if(url.protocol==='http:'&&(req.method==='GET'||req.method==='HEAD')){
    url.protocol='https:';
    result=new Response(null,{status:308,headers:{Location:url.href,'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
   }else result=response({error:'HTTPS obrigatório'},403);
  }
  else if(category==='health'&&req.method==='GET')result=response(healthPayload());
  else if(url.pathname==='/api/rooms'&&req.method==='POST'){
   const gate=await creationGuard(req,env);
   if(!gate.allowed){retryAfter=gate.retryAfter;result=response({error:gate.status===429?'Limite temporário de criação de salas. Aguarde.':'Criação de salas temporariamente indisponível.'},gate.status)}
   else result=await roomApi(req,env);
  }else result=url.pathname.startsWith('/api/')?await roomApi(req,env):await staticAsset(req);
 }catch{
  result=response({error:'Serviço temporariamente indisponível'},503);
 }
 // No tokens, room IDs, patient details, IP addresses, URL queries or bodies in application logs.
 if(category!=='asset'&&(result.status>=500||result.status===429||Math.random()<0.01))
  console.log(JSON.stringify({type:'request',route:category,method:req.method,status:result.status,elapsedMs:Date.now()-start}));
 return responseWithOperations(result,{requestId,retryAfter});
}};
