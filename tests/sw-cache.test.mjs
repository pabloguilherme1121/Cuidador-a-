import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
function boot({offline=false,quotaFull=false}={}){
 const callbacks={};
 const cached=new Response('cached',{status:200});
 let writes=0;
 const caches={
   async open(){return {async put(){writes++;if(quotaFull)throw Error('quota exceeded')}}},
   async match(){return cached.clone()},
   async keys(){return []}
 };
 const self={addEventListener(type,fn){callbacks[type]=fn}};
 const location={origin:'https://cuidadora.test'};
 const fetch=async()=>{if(offline)throw Error('offline');return new Response('fresh',{status:200})};
 runInNewContext(source,{self,location,caches,fetch,URL,Response,Set,Promise});
 async function request(path){
   let response;
   callbacks.fetch({request:{method:'GET',url:'https://cuidadora.test'+path,mode:'cors'},
     respondWith(p){response=p}});
   return response?await response:null;
 }
 return {request,get writes(){return writes}};
}
test('cache cheio não descarta arquivo JavaScript recebido da rede',async()=>{
 const sw=boot({quotaFull:true});
 const res=await sw.request('/app.js');
 assert.equal(await res.text(),'fresh');
 assert.equal(sw.writes,1);
});
test('arquivos permanecem disponíveis offline, sem servir respostas de API das salas',async()=>{
 const offline=boot({offline:true});
 assert.equal(await (await offline.request('/core.mjs')).text(),'cached');
 assert.equal(await offline.request('/api/rooms/identificador'),null);
});
test('cache saudável continua recebendo recursos atualizados',async()=>{
 const sw=boot();
 assert.equal(await (await sw.request('/styles.css')).text(),'fresh');
 assert.equal(sw.writes,1);
});
