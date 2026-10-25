'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {DatabaseSync,backup}=require('node:sqlite');
const schema=require('./schema.json');
const quote=x=>'"'+String(x).replaceAll('"','""')+'"';
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const SCHEMA_DIGEST=digest(schema);
function schemaName(name){if(!/^vitasafe_stage_[a-z0-9_]{1,40}$/.test(name))throw Error('Use an isolated vitasafe_stage_* schema');return quote(name)}
function checkSQLite(db){
 const integrity=db.prepare('PRAGMA integrity_check').all();if(integrity.length!==1||Object.values(integrity[0])[0]!=='ok')throw Error('SQLite integrity check failed');
 if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('SQLite foreign-key check failed');
 const actual=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(x=>x.name);
 if(digest(actual)!==digest(schema.map(x=>x.name)))throw Error('Schema drift: table set differs; stop and update the migration');
 for(const table of schema){const definition=db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(table.name);if(definition.sql!==table.sql)throw Error('Schema drift: '+table.name);const columns=db.prepare(`PRAGMA table_info(${quote(table.name)})`).all();if(digest(columns)!==digest(table.columns))throw Error('Schema drift: '+table.name)}
 const relations=[['order_events','order_id','orders','id'],['idempotency','order_id','orders','id'],['customer_sessions','user_id','users','id'],['inventory_events','product_id','products','id']];
 for(const [child,col,parent,key] of relations){if(db.prepare(`SELECT COUNT(*) n FROM ${quote(child)} c LEFT JOIN ${quote(parent)} p ON c.${quote(col)}=p.${quote(key)} WHERE p.${quote(key)} IS NULL`).get().n)throw Error('Orphan records: '+child)}
 if(db.prepare('SELECT COUNT(*) n FROM products WHERE stock<0 OR price<0').get().n)throw Error('Invalid stock or prices');
 for(const row of db.prepare('SELECT items,subtotal,total,delivery_fee FROM orders').all()){let items;try{items=JSON.parse(row.items)}catch{throw Error('Invalid order JSON')}if(!Array.isArray(items)||row.total!==row.subtotal+row.delivery_fee)throw Error('Invalid order totals or items')}
}
function snapshot(db){checkSQLite(db);const tables={};for(const table of schema){const stmt=db.prepare(`SELECT rowid AS _sqlite_rowid,* FROM ${quote(table.name)} ORDER BY rowid`);stmt.setReadBigInts(true);const columns=['_sqlite_rowid',...table.columns.map(c=>c.name)];const rows=stmt.all().map(r=>columns.map(c=>typeof r[c]==='bigint'?String(r[c]):r[c]));tables[table.name]={columns,rows,sha256:digest(rows)}}return {version:1,schemaDigest:SCHEMA_DIGEST,tables}}
function validateManifest(m){if(m.version!==1||m.schemaDigest!==SCHEMA_DIGEST||digest(Object.keys(m.tables).sort())!==digest(schema.map(t=>t.name)))throw Error('Invalid manifest schema');for(const t of schema){const d=m.tables[t.name];if(digest(d.columns)!==digest(['_sqlite_rowid',...t.columns.map(c=>c.name)])||d.sha256!==digest(d.rows)||d.rows.some(r=>r.length!==d.columns.length))throw Error('Corrupted manifest: '+t.name);for(const row of d.rows){for(let i=0;i<t.columns.length;i++){const c=t.columns[i],v=row[i+1];if((c.notnull||c.pk)&&v===null)throw Error('NULL required value: '+t.name);if(v!==null&&c.type==='INTEGER'&&!/^-?\d+$/.test(String(v)))throw Error('Invalid integer: '+t.name)}}}return m}
async function exportSQLite(source,destination){
 if(!fs.existsSync(source))throw Error('Source database does not exist');
 fs.mkdirSync(destination,{mode:0o700});
 const sourceDb=new DatabaseSync(source,{readOnly:true});const backupPath=path.join(destination,'snapshot.sqlite');
 try{await backup(sourceDb,backupPath)}finally{sourceDb.close()}
 fs.chmodSync(backupPath,0o600);const copy=new DatabaseSync(backupPath,{readOnly:true});let manifest;try{manifest=snapshot(copy)}finally{copy.close()}
 fs.writeFileSync(path.join(destination,'manifest.json'),JSON.stringify(manifest)+'\n',{mode:0o600,flag:'wx'});
 const checksum=crypto.createHash('sha256').update(fs.readFileSync(backupPath)).digest('hex');
 const report={schemaDigest:SCHEMA_DIGEST,backupSHA256:checksum,manifestSHA256:digest(manifest),counts:Object.fromEntries(schema.map(t=>[t.name,manifest.tables[t.name].rows.length]))};
 fs.writeFileSync(path.join(destination,'report.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600,flag:'wx'});return report;
}

function loadBackup(directory){const manifest=validateManifest(JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8')));const report=JSON.parse(fs.readFileSync(path.join(directory,'report.json'),'utf8'));const checksum=crypto.createHash('sha256').update(fs.readFileSync(path.join(directory,'snapshot.sqlite'))).digest('hex');if(report.backupSHA256!==checksum||report.manifestSHA256!==digest(manifest))throw Error('Backup checksum mismatch');return manifest}
function restoreSQLite(directory,destination){const manifest=loadBackup(directory);if(fs.existsSync(destination))throw Error('Recovery destination already exists');fs.copyFileSync(path.join(directory,'snapshot.sqlite'),destination,fs.constants.COPYFILE_EXCL);fs.chmodSync(destination,0o600);const db=new DatabaseSync(destination,{readOnly:true});try{if(digest(snapshot(db))!==digest(manifest))throw Error('Recovered database mismatch')}finally{db.close()}return {restored:true,counts:Object.fromEntries(schema.map(t=>[t.name,manifest.tables[t.name].rows.length]))}}

function columnDDL(c,t){let type=c.type==='INTEGER'?'BIGINT':'TEXT';if(c.type!=='INTEGER'&&c.type!=='TEXT')throw Error('Unsupported type');if(c.pk&&c.type==='INTEGER')type+=' GENERATED BY DEFAULT AS IDENTITY';let sql=quote(c.name)+' '+type;if(c.pk)sql+=' PRIMARY KEY';else if(c.notnull)sql+=' NOT NULL';if(c.dflt_value!==null&&!(c.pk&&c.type==='INTEGER')){let d=c.dflt_value;if(d==='CURRENT_TIMESTAMP')d="(to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'))";else if(!/^(?:-?\d+|'(?:[^']|'')*')$/.test(d))throw Error('Unsupported default');sql+=' DEFAULT '+d}return sql}
function postgresDDL(name){const q=schemaName(name);return schema.map(t=>{const defs=t.columns.map(c=>columnDDL(c,t));defs.push('"_sqlite_rowid" BIGINT NOT NULL UNIQUE');for(const u of t.unique){if(u.length===1&&t.columns.find(c=>c.name===u[0]).pk)continue;defs.push('UNIQUE ('+u.map(quote).join(',')+')')}for(const check of t.sql.match(/CHECK\([^)]*\)/g)||[])defs.push(check);return `CREATE TABLE ${q}.${quote(t.name)} (${defs.join(',')})`})}
function canonicalPG(rows,table,columns){return rows.map(r=>columns.map(name=>{const c=table.columns.find(c=>c.name===name);const v=r[name];return v!==null&&(name==='_sqlite_rowid'||c?.type==='INTEGER')?String(v):v}))}
async function verifyPostgres(client,manifest,name){validateManifest(manifest);const q=schemaName(name);const counts={};for(const table of schema){const data=manifest.tables[table.name];const result=await client.query(`SELECT ${data.columns.map(quote).join(',')} FROM ${q}.${quote(table.name)} ORDER BY _sqlite_rowid`);const rows=canonicalPG(result.rows,table,data.columns);if(digest(rows)!==data.sha256)throw Error('PostgreSQL content mismatch: '+table.name);counts[table.name]=rows.length}return counts}
async function importPostgres(client,manifest,name,{apply=false}={}){
 validateManifest(manifest);const q=schemaName(name);await client.query('BEGIN');
 try{await client.query('SET LOCAL statement_timeout = 120000');await client.query(`CREATE SCHEMA ${q}`);for(const ddl of postgresDDL(name))await client.query(ddl);
 for(const table of schema){const data=manifest.tables[table.name];for(const row of data.rows)await client.query(`INSERT INTO ${q}.${quote(table.name)} (${data.columns.map(quote).join(',')}) VALUES (${row.map((_,i)=>'$'+(i+1)).join(',')})`,row);
 for(const c of table.columns.filter(c=>c.pk&&c.type==='INTEGER')){const last=await client.query(`SELECT MAX(${quote(c.name)}) n FROM ${q}.${quote(table.name)}`);const max=last.rows[0].n;if(max!==null)await client.query('SELECT setval(pg_get_serial_sequence($1,$2),$3,true)',[q+'.'+quote(table.name),c.name,String(max)])}}
 const counts=await verifyPostgres(client,manifest,name);await client.query(apply?'COMMIT':'ROLLBACK');return {applied:apply,schema:name,counts};
 }catch(error){await client.query('ROLLBACK');throw error}
}
module.exports={loadBackup,restoreSQLite,schema,snapshot,validateManifest,exportSQLite,postgresDDL,verifyPostgres,importPostgres,digest};
