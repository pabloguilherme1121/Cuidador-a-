/** Cloudflare Workers Free + D1: private ciphertext only. No plaintext health data on server. */
export const SOURCE_REVISION='__PINNED_SHA__';
const SOURCE=`https://raw.githubusercontent.com/pabloguilherme1121/Cuidador-a-/${SOURCE_REVISION}/`;
const ASSETS=new Set(['index.html','app.js','core.mjs','room.mjs','styles.css','sw.js','manifest.webmanifest','robots.txt','assets/icon.svg','assets/icon-maskable.svg','assets/icon-192.png','assets/icon-512.png','assets/apple-touch-icon.png','assets/icon-maskable-512.png']);
const TYPES={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',mjs:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',webmanifest:'application/manifest+json; charset=utf-8',txt:'text/plain; charset=utf-8',png:'image/png',svg:'image/svg+xml; charset=utf-8'};
const CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'";
const JSON_HEADERS={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const OK_ID=/^[\w-]{22}$/; const OK_HASH=/^[\w-]{43}$/;const OK_IV=/^[\w-]{16}$/;const OK_CIPHER=/^[\w-]{22,140000}$/;
export const isValidEnvelope=e=>e&&typeof e==='object'&&OK_IV.test(e.iv||'')&&OK_CIPHER.test(e.ciphertext||'');
const response=(o,status=200)=>new Response(JSON.stringify(o),{status,headers:JSON_HEADERS});
const parse=async req=>{if(Number(req.headers.get('content-length'))>145000)throw new Error('Arquivo muito grande');const s=await req.text();if(s.length>145000)throw new Error('Arquivo muito grande');return JSON.parse(s)};
const checkOrigin=req=>{const origin=req.headers.get('Origin');return !origin||origin===new URL(req.url).origin};
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
 const match=/^\/api\/rooms\/([\w-]{22})$/.exec(path);if(!match)return response({error:'Não encontrado'},404);
 const id=match[1],row=await env.CARE_ROOMS.prepare('SELECT id,auth_hash,read_hash,iv,ciphertext,version,updated_at FROM rooms WHERE id=?').bind(id).first();
 if(!row)return response({error:'Sala não encontrada'},404);
 if(req.method==='GET'){
  if(row.read_hash&&!await authorized(req,row.read_hash,'X-Room-Read-Token')&&!await authorized(req,row.auth_hash))return response({error:'Não autorizado'},403);
  // Authenticate before inspecting If-None-Match; never reveal whether a private room exists.
  const etag=`"v${row.version}"`;
  if(req.headers.get('If-None-Match')===etag)return new Response(null,{status:304,headers:{...JSON_HEADERS,ETag:etag}});
  const headers={...JSON_HEADERS,ETag:etag};
  return new Response(JSON.stringify({version:row.version,iv:row.iv,ciphertext:row.ciphertext,updatedAt:row.updated_at,legacy:!row.read_hash}),{status:200,headers});
 }
 if(!await authorized(req,row.auth_hash))return response({error:'Não autorizado'},403);
 if(req.method==='DELETE'){await env.CARE_ROOMS.prepare('DELETE FROM rooms WHERE id=? AND auth_hash=?').bind(id,row.auth_hash).run();return response({deleted:true})}
 if(req.method==='PUT'){
  let data;try{data=await parse(req)}catch{return response({error:'Arquivo inválido'},400)}
  if(!isValidEnvelope(data)||!Number.isSafeInteger(data.version)||data.version<1)return response({error:'Dados inválidos'},400);
  const result=await env.CARE_ROOMS.prepare('UPDATE rooms SET iv=?,ciphertext=?,version=version+1,updated_at=? WHERE id=? AND version=? AND auth_hash=?').bind(data.iv,data.ciphertext,Date.now(),id,data.version,row.auth_hash).run();
  if(result.meta?.changes!==1)return response({error:'A sala mudou em outro aparelho. Atualize antes de enviar.',conflict:true},409);
  return response({version:data.version+1});
 }
 return response({error:'Método não permitido'},405);
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
 headers.set('Cache-Control',['index.html','sw.js','app.js','room.mjs','core.mjs','styles.css'].includes(path)?'no-cache, must-revalidate':'public, max-age=600');
 if(path==='sw.js')headers.set('Service-Worker-Allowed','/');
 return new Response(req.method==='HEAD'?null:upstream.body,{status:200,headers});
}
export default {async fetch(req,env){try{return new URL(req.url).pathname.startsWith('/api/')?await roomApi(req,env):await staticAsset(req)}catch(err){console.error('Service error',String(err?.message||err));return response({error:'Serviço temporariamente indisponível'},503)}}};
