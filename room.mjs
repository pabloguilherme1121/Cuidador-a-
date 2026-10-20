/** Client-only encrypted room protocol. Keys live only in URL fragment and the local device. */
const encoder=new TextEncoder();
const decoder=new TextDecoder();
export const ROOM_STORAGE='cuidadora-room-v1';
const roomPattern=/^[\w-]{22}$/;
const keyPattern=/^[\w-]{43}$/;
const to64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const from64=s=>{if(typeof s!=='string'||!/^[\w-]+$/.test(s))throw new Error('Código da sala inválido');const t=s.replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(t+'='.repeat((4-t.length%4)%4)),c=>c.charCodeAt(0))};
async function sha256(data){return new Uint8Array(await crypto.subtle.digest('SHA-256',data))}
async function authFrom(key){const token=to64(await sha256(encoder.encode('Cuidadora room write:v1:'+key)));return {token,authHash:to64(await sha256(encoder.encode(token)))}}
export async function createCredentials(){const id=to64(crypto.getRandomValues(new Uint8Array(16)));const key=to64(crypto.getRandomValues(new Uint8Array(32)));return {id,key,...await authFrom(key)}}
export async function completeCredentials(raw){if(!raw||!roomPattern.test(raw.id)||!keyPattern.test(raw.key))throw new Error('Link da sala inválido');return {id:raw.id,key:raw.key,...await authFrom(raw.key)}}
export const buildRoomFragment=room=>`#sala=${room.id}.${room.key}`;
export function parseRoomFragment(hash){const match=/^#sala=([\w-]{22})\.([\w-]{43})$/.exec(hash||'');return match?{id:match[1],key:match[2]}:null}
export function sharedSnapshot(data){return {version:1,items:data.items,settings:data.settings}}
async function importAES(room){return crypto.subtle.importKey('raw',from64(room.key),'AES-GCM',false,['encrypt','decrypt'])}
export async function encryptRoom(room,shared){const json=JSON.stringify(shared);if(encoder.encode(json).length>100000)throw new Error('Esta rotina supera o limite seguro de 100 KB. Remova cadastros antigos.');const iv=crypto.getRandomValues(new Uint8Array(12));const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(room.id)},await importAES(room),encoder.encode(json));return {iv:to64(iv),ciphertext:to64(new Uint8Array(cipher))}}
export async function decryptRoom(room,encrypted){if(typeof encrypted?.iv!=='string'||encrypted.iv.length!==16||typeof encrypted.ciphertext!=='string'||encrypted.ciphertext.length>140000)throw new Error('Dados criptografados inválidos');const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(encrypted.iv),additionalData:encoder.encode(room.id)},await importAES(room),from64(encrypted.ciphertext));const obj=JSON.parse(decoder.decode(bytes));if(!obj||obj.version!==1||!Array.isArray(obj.items)||obj.items.length>1000||!obj.settings||typeof obj.settings!=='object')throw new Error('Formato da sala inválido');return obj}
