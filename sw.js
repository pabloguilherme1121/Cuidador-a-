// No personal routine data is sent to or cached by this Service Worker.
const CACHE='cuidadora-cache-v12-pg-bot';
const ASSETS=['./','./index.html','./styles.css','./app.js','./core.mjs','./room.mjs','./chat.mjs','./timeline.mjs','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png','./assets/apple-touch-icon.png','./assets/pg-bot.webp'];
// Always seek fresh executable assets; if there is no connection, use the offline copy.
const NETWORK_FIRST=new Set(['index.html','app.js','core.mjs','room.mjs','chat.mjs','timeline.mjs','styles.css','manifest.webmanifest']);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([
 caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('meu-ritmo-')||k.startsWith('cuidadora-'))&&k!==CACHE).map(k=>caches.delete(k)))),
 self.clients.claim()
])));
async function networkFirst(req){
 try{
  const res=await fetch(req);
  if(res.ok){const copy=res.clone();const cache=await caches.open(CACHE);await cache.put(req,copy)}
  return res;
 }catch{
  const hit=await caches.match(req);
  if(hit)return hit;
  if(req.mode==='navigate')return caches.match('./index.html');
  return Response.error();
 }
}
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==location.origin)return;
 const path=new URL(req.url).pathname;
 // Never cache room API responses (even ciphertext). Offline edits remain local.
 if(path.startsWith('/api/'))return;
 const asset=path.split('/').pop();
 if(req.mode==='navigate'||NETWORK_FIRST.has(asset)){
  event.respondWith(networkFirst(req));
 }else{
  event.respondWith(caches.match(req).then(hit=>hit||networkFirst(req)));
 }
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>clients.length?clients[0].focus():self.clients.openWindow('./')));
});
