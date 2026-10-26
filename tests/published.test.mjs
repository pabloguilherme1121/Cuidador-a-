import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
const root='dist';
test('public output only includes whitelisted static files',()=>{
 const files=readdirSync(root).sort();
 assert.deepEqual(files,['\u005fheaders','app.js','assets','core.mjs','room.mjs','chat.mjs','timeline.mjs','index.html','manifest.webmanifest','robots.txt','styles.css','sw.js'].sort());
 assert.ok(statSync(join(root,'index.html')).isFile());
 assert.ok(readFileSync(join(root,'_headers'),'utf8').includes('Content-Security-Policy'));
 assert.ok(!files.includes('supabase')&&!files.includes('README.md')&&!files.includes('tests'));
});
test('PWA uses scope-relative URLs compatible with subdirectory and project hostname',()=>{
 const m=JSON.parse(readFileSync(join(root,'manifest.webmanifest'),'utf8'));
 assert.equal(m.start_url,'./');assert.equal(m.scope,'./');
 for(const i of m.icons){assert.ok(i.src.startsWith('./'));assert.ok(statSync(join(root,i.src)).isFile())}
 const html=readFileSync(join(root,'index.html'),'utf8');
 for(const file of ['./app.js','./styles.css','./manifest.webmanifest'])assert.ok(html.includes(file));
});

test('service worker refreshes executable assets online and falls back to cached files offline',()=>{
 const sw=readFileSync(join(root,'sw.js'),'utf8');
 assert.ok(sw.includes("cuidadora-cache-v12-pg-bot"),'SW cache version must update for the new release');
 assert.ok(sw.includes("const NETWORK_FIRST"),'Scripts and CSS should prefer network to avoid stale health reminders');
 assert.ok(sw.includes("if(path.startsWith('/api/'))return"),'Private room endpoints must not be cached by service worker');
 assert.ok(sw.includes('caches.match(req)'),'Offline cache remains available when offline');
});


test('light and dark eyebrow labels meet WCAG AA contrast without changing hero palette',()=>{
 const css=readFileSync(join(root,'styles.css'),'utf8');
 const light=css.match(/\.eyebrow\{[^}]*\bcolor:\s*(#[0-9a-f]{6})/i)?.[1];
 const dark=css.match(/:root\[data-theme=dark\]\s+\.eyebrow\{[^}]*\bcolor:\s*(#[0-9a-f]{6})/i)?.[1];
 assert.ok(light,'light eyebrow color is specified');
 assert.ok(dark,'dark eyebrow override is specified');
 function luminance(hex){
  const components=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4);
  return components[0]*0.2126+components[1]*0.7152+components[2]*0.0722;
 }
 function contrast(a,b){
  const [high,low]=[luminance(a),luminance(b)].sort((x,y)=>y-x);
  return (high+0.05)/(low+0.05);
 }
 assert.ok(contrast(light,'#f7faf7')>=4.5,'light eyebrow requires contrast >= 4.5:1');
 assert.ok(contrast(dark,'#14231e')>=4.5,'dark eyebrow requires contrast >= 4.5:1');
});
