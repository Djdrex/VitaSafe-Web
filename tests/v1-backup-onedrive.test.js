'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite'),{openDatabase}=require('../src/db/database'),recovery=require('../src/db/recovery'),secure=require('../src/backup-secure'),backup=require('../src/integrations/onedrive-backup');
test('encrypted OneDrive round trip, private folders and empty restore preserve disposable data',async()=>{
 const db=await openDatabase({}, {pglite:new PGlite()}),key=crypto.randomBytes(32).toString('base64');let restored;
 try{await db.prepare('INSERT INTO sync_state(k,v) VALUES(?,?)').run('fictional','private-test');const plain=await recovery.snapshot(db),encrypted=secure.encrypt(plain,key);let stored,calls=0;
 const transport=async(url,opts={})=>{calls++;assert.ok(!url.includes('createLink'));if(url.endsWith('/permissions'))return Response.json({value:[]});if(opts.method==='PUT'){assert.ok(Buffer.isBuffer(opts.body));assert.ok(!opts.body.includes(Buffer.from('private-test')));stored=Buffer.from(opts.body);return Response.json({id:'backup'})}if(url.endsWith(':/content'))return new Response(stored);if(url.endsWith('.enc'))return Response.json({size:stored.length});return Response.json({id:'folder',folder:{}})};
 const result=await backup.uploadVerified(encrypted,key,'test-token',transport);assert.equal(result.verified,true);assert.equal(result.restored,false);
 const before=calls;await assert.rejects(backup.uploadVerified(plain,key,'test-token',transport));assert.equal(calls,before);
 restored=await openDatabase({}, {pglite:new PGlite()});await recovery.restoreEmpty(restored,secure.decrypt(stored,key));assert.equal((await restored.prepare('SELECT v FROM sync_state WHERE k=?').get('fictional')).v,'private-test');await assert.rejects(recovery.restoreEmpty(restored,plain),/empty/);
 const shared=async()=>Response.json({id:'folder',folder:{},shared:{scope:'anonymous'}});await assert.rejects(backup.uploadVerified(encrypted,key,'test-token',shared),/private/);
 const corrupt=async(u,o)=>u.endsWith(':/content')?new Response('tampered'):transport(u,o);await assert.rejects(backup.uploadVerified(encrypted,key,'test-token',corrupt),/integrity/);
 }finally{await db.close();if(restored)await restored.close()}
});
test('backup connection opens existing PostgreSQL schema without initialization and refuses writes',async()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vs-readonly-'));let db;
 try{db=await openDatabase({}, {pglite:new PGlite(dir)});await db.prepare('INSERT INTO sync_state(k,v) VALUES(?,?)').run('fictional','retained');await db.close();db=await openDatabase({}, {pglite:new PGlite(dir),readOnly:true});assert.equal((await db.prepare('SELECT v FROM sync_state WHERE k=?').get('fictional')).v,'retained');await assert.rejects(db.prepare('DELETE FROM sync_state').run(),/read.only/i);assert.ok(recovery.validate(await recovery.snapshot(db)).tables.sync_state.length)}finally{if(db)await db.close();fs.rmSync(dir,{recursive:true,force:true})}
});
