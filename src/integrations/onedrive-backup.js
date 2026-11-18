'use strict';
const crypto=require('node:crypto');
const secure=require('../backup-secure'),recovery=require('../db/recovery'),oauth=require('./onedrive');
const ROOT='VitaSafe — Respaldos',LIMIT=25*1024*1024;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const pathURL=parts=>'https://graph.microsoft.com/v1.0/me/drive/special/approot:/'+parts.map(encodeURIComponent).join('/');
async function limited(response){const chunks=[];let size=0;for await(const c of response.body){size+=c.length;if(size>LIMIT)throw Error('Backup size limit');chunks.push(c)}return Buffer.concat(chunks)}
async function uploadVerified(encrypted,key,token,transport=fetch,period='Diarios'){
 // Reject plaintext, wrong keys and malformed envelopes before any network request.
 if(!['Diarios','Semanales'].includes(period)||encrypted.length>LIMIT)throw Error('Invalid backup request');
 const original=secure.decrypt(encrypted,key),sha256=hash(encrypted);
 const request=(url,options={})=>oauth.retryRequest(transport,url,{...options,redirect:'error',headers:{Authorization:'Bearer '+token,...options.headers}});
 const privateFolder=async parts=>{
  const url=parts.length?pathURL(parts):'https://graph.microsoft.com/v1.0/me/drive/special/approot';
  let r=await request(url);if(r.status===404&&parts.length){const parent=parts.slice(0,-1);r=await request((parent.length?pathURL(parent)+':':'https://graph.microsoft.com/v1.0/me/drive/special/approot')+'/children',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:parts.at(-1),folder:{},'@microsoft.graph.conflictBehavior':'fail'})});if(r.status===409)r=await request(url)}
  if(!r.ok)throw Error('OneDrive folder unavailable');const item=await r.json();if(!item.folder||item.shared)throw Error('Backup folder must be private');
  const permissions=await request('https://graph.microsoft.com/v1.0/me/drive/items/'+encodeURIComponent(item.id)+'/permissions');
  if(!permissions.ok)throw Error('Cannot verify folder privacy');const grants=await permissions.json();
  if(!Array.isArray(grants.value)||grants['@odata.nextLink']||grants.value.some(p=>p.link||p.invitation||!p.roles?.includes('owner')))throw Error('Shared backup folder refused');return item;
 };
 await privateFolder([]);await privateFolder([ROOT]);await privateFolder([ROOT,'PostgreSQL']);
 for(const p of ['Diarios','Semanales','Restauraciones-verificadas'])await privateFolder([ROOT,'PostgreSQL',p]);
 await privateFolder([ROOT,'Informes-de-integridad']);
 const file='vitasafe-'+sha256+'.enc',url=pathURL([ROOT,'PostgreSQL',period,file]);
 // Content-addressed names and fail-on-conflict: never replace another backup.
 let r=await request(url+':/content?%40microsoft.graph.conflictBehavior=fail',{method:'PUT',headers:{'Content-Type':'application/octet-stream'},body:encrypted});
 if(!r.ok&&r.status!==409)throw Error('Encrypted backup upload failed');
 r=await request(url);if(!r.ok)throw Error('Backup metadata unavailable');const item=await r.json();if(item.shared||item.size!==encrypted.length)throw Error('Backup metadata mismatch');
 // Microsoft content download is a redirect to a preauthenticated URL. Never forward the OAuth header.
 r=await transport(url+':/content',{redirect:'manual',headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});
 if(r.status===302){const target=new URL(r.headers.get('location'));if(target.protocol!=='https:'||target.username||target.password||!['.files.1drv.com','.sharepoint.com','.onedrive.com'].some(s=>target.hostname.endsWith(s)))throw Error('Unexpected download host');r=await transport(target.toString(),{redirect:'error',signal:AbortSignal.timeout(15000)})}
 if(!r.ok)throw Error('Backup download failed');const downloaded=await limited(r);
 if(hash(downloaded)!==sha256||!secure.decrypt(downloaded,key).equals(original))throw Error('Backup round-trip integrity failed');
 return {verified:true,restored:false,file,sha256,bytes:encrypted.length};
}
async function run(db,user,env,{transport=fetch,period='Diarios'}={}){
 if(user?.role!=='admin'||env.VITASAFE_BACKUP_UPLOAD_ENABLED!=='true')throw Error('Manual backup upload not enabled');
 if(!secure.configured(env.VITASAFE_BACKUP_KEY))throw Error('Backup key required');
 const plain=await recovery.snapshot(db),encrypted=secure.encrypt(plain,env.VITASAFE_BACKUP_KEY);
 const token=await oauth.accessToken(db,user,env,transport);
 return uploadVerified(encrypted,env.VITASAFE_BACKUP_KEY,token,transport,period);
}
module.exports={run,uploadVerified,ROOT,LIMIT};
