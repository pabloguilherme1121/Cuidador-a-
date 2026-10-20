/** Minimal static whitelist for Cloudflare Pages. Do not publish internal docs or data. */
import {cpSync, mkdirSync, rmSync, statSync} from 'node:fs';
import {join} from 'node:path';
const root=process.cwd(),output=join(root,'dist');
rmSync(output,{recursive:true,force:true});mkdirSync(output,{recursive:true});
const files=['index.html','styles.css','app.js','core.mjs','room.mjs','sw.js','manifest.webmanifest'];
for (const file of files) {
 if (!statSync(join(root,file)).isFile()) throw new Error(`${file} não encontrado`);
 cpSync(join(root,file),join(output,file));
}
cpSync(join(root,'assets'),join(output,'assets'),{recursive:true});
cpSync(join(root,'deploy/_headers'),join(output,'_headers'));
cpSync(join(root,'deploy/robots.txt'),join(output,'robots.txt'));
console.log('Pacote estático dist/ gerado sem dados privados ou código de servidor.');
