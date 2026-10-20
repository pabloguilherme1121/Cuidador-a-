import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
const root='dist';
test('public output only includes whitelisted static files',()=>{
 const files=readdirSync(root).sort();
 assert.deepEqual(files,['\u005fheaders','app.js','assets','core.mjs','room.mjs','index.html','manifest.webmanifest','robots.txt','styles.css','sw.js'].sort());
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
 assert.ok(sw.includes("cuidadora-cache-v6"),'SW cache version must update for the new release');
 assert.ok(sw.includes("const NETWORK_FIRST"),'Scripts and CSS should prefer network to avoid stale health reminders');
 assert.ok(sw.includes("if(path.startsWith('/api/'))return"),'Private room endpoints must not be cached by service worker');
 assert.ok(sw.includes('caches.match(req)'),'Offline cache remains available when offline');
});
