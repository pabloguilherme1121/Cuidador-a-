/** Client-only encrypted room protocol. Keys live only in URL fragment and the local device. */
const encoder=new TextEncoder();
const decoder=new TextDecoder();
export const ROOM_STORAGE='cuidadora-room-v1';
const roomPattern=/^[\w-]{22}$/;
const keyPattern=/^[\w-]{43}$/;
const to64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const from64=s=>{if(typeof s!=='string'||!/^[\w-]+$/.test(s))throw new Error('Código da sala inválido');const t=s.replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(t+'='.repeat((4-t.length%4)%4)),c=>c.charCodeAt(0))};
async function sha256(data){return new Uint8Array(await crypto.subtle.digest('SHA-256',data))}
async function hashText(value){return to64(await sha256(encoder.encode(value)))}
async function writerAuth(secret){const token=await hashText('Cuidadora room write:v2:'+secret);return {token,authHash:await hashText(token)}}
async function readerAuth(key){const readToken=await hashText('Cuidadora room read:v1:'+key);return {readToken,readHash:await hashText(readToken)}}
/** Distinct editor secret is not derivable from the decryption key in the viewer link. */
export async function createCredentials(){
 const id=to64(crypto.getRandomValues(new Uint8Array(16)));
 const key=to64(crypto.getRandomValues(new Uint8Array(32)));
 const editorSecret=to64(crypto.getRandomValues(new Uint8Array(32)));
 return {id,key,editorSecret,role:'editor',...await writerAuth(editorSecret),...await readerAuth(key)};
}
export const roomCanEdit=room=>Boolean(room&&(room.editorSecret||room.legacy));
/** Shared rule for the send button and the write handler: avoid no-op clicks. */
export function roomCanSend(room,{version=0,dirty=false,busy=false,conflict=false,online=true}={}){
 return roomCanEdit(room)&&Number.isSafeInteger(version)&&version>0&&dirty===true&&busy===false&&conflict===false&&online===true;
}
/** A manual receive cannot run while offline or already handling a request. */
export function roomCanReceive({connected=false,online=true,busy=false}={}){
 return connected===true&&online===true&&busy===false;
}
export async function completeCredentials(raw){
 if(!raw||!roomPattern.test(raw.id)||!keyPattern.test(raw.key))throw new Error('Link da sala inválido');
 if(raw.editorSecret&&!keyPattern.test(raw.editorSecret))throw new Error('Convite de edição inválido');
 const auth=raw.editorSecret?await writerAuth(raw.editorSecret):raw.legacy?await (async()=>{const token=await hashText('Cuidadora room write:v1:'+raw.key);return {token,authHash:await hashText(token)}})():{token:null,authHash:null};
 return {id:raw.id,key:raw.key,...(raw.editorSecret?{editorSecret:raw.editorSecret}:{}),...(raw.legacy?{legacy:true}:{}),role:roomCanEdit(raw)?'editor':'viewer',...auth,...await readerAuth(raw.key)};
}
export function buildRoomFragment(room,role='edit'){
 if(role==='view')return `#sala=${room.id}.${room.key}`;
 if(!roomCanEdit(room))return null;
 return `#sala=${room.id}.${room.key}${room.editorSecret?'.'+room.editorSecret:''}`;
}
export function parseRoomFragment(hash){
 const match=/^#sala=([\w-]{22})\.([\w-]{43})(?:\.([\w-]{43}))?$/.exec(hash||'');
 return match?{id:match[1],key:match[2],...(match[3]?{editorSecret:match[3]}:{})}:null;
}
export function sharedSnapshot(data){return {version:1,items:data.items,settings:data.settings}}
async function importAES(room){return crypto.subtle.importKey('raw',from64(room.key),'AES-GCM',false,['encrypt','decrypt'])}
export async function encryptRoom(room,shared){const json=JSON.stringify(shared);if(encoder.encode(json).length>100000)throw new Error('Esta rotina supera o limite seguro de 100 KB. Remova cadastros antigos.');const iv=crypto.getRandomValues(new Uint8Array(12));const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(room.id)},await importAES(room),encoder.encode(json));return {iv:to64(iv),ciphertext:to64(new Uint8Array(cipher))}}
export async function decryptRoom(room,encrypted){if(typeof encrypted?.iv!=='string'||encrypted.iv.length!==16||typeof encrypted.ciphertext!=='string'||encrypted.ciphertext.length>140000)throw new Error('Dados criptografados inválidos');const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(encrypted.iv),additionalData:encoder.encode(room.id)},await importAES(room),from64(encrypted.ciphertext));const obj=JSON.parse(decoder.decode(bytes));if(!obj||obj.version!==1||!Array.isArray(obj.items)||obj.items.length>1000||!obj.settings||typeof obj.settings!=='object')throw new Error('Formato da sala inválido');return obj}

/** Pure sync policy: no polling in background; never keep retrying conflicted writes. */
export function syncPlan({connected=false,visible=true,online=true,busy=false,pendingInvitation=false,conflict=false,dirty=false,canEdit=false}={}){
 if(!connected||!visible||busy||pendingInvitation)return 'idle';
 if(!online)return 'offline';
 if(conflict)return 'conflict';
 return dirty&&canEdit?'push':'pull';
}
export function roomStatusLabel({busy=false,offline=false,conflict=false,dirty=false}={}){
 if(busy)return 'Sincronizando…';
 if(offline)return 'Sem internet';
 if(conflict)return 'Conflito de edição';
 if(dirty)return 'Alterações locais pendentes';
 return 'Atualizada';
}

/** Deliberate polling budget for the Workers Free tier; user actions still sync immediately. */
export const roomRefreshIntervalMs = () => 240000;
