'use strict';
const crypto=require('node:crypto'),recovery=require('./db/recovery');
function key(value){const b=Buffer.from(value||'','base64');if(b.length!==32)throw Error('A separate 32-byte backup key is required');return b;}
function encrypt(bytes,key64){recovery.validate(bytes);const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key(key64),iv);c.setAAD(Buffer.from('VitaSafe-backup-v1'));const ciphertext=Buffer.concat([c.update(bytes),c.final()]);return Buffer.from(JSON.stringify({format:'VitaSafe-backup-v1',iv:iv.toString('base64'),tag:c.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')}));}
function decrypt(bytes,key64){const e=JSON.parse(bytes);if(e.format!=='VitaSafe-backup-v1')throw Error('Invalid encrypted backup format');const d=crypto.createDecipheriv('aes-256-gcm',key(key64),Buffer.from(e.iv,'base64'));d.setAAD(Buffer.from(e.format));d.setAuthTag(Buffer.from(e.tag,'base64'));const plaintext=Buffer.concat([d.update(Buffer.from(e.ciphertext,'base64')),d.final()]);recovery.validate(plaintext);return plaintext;}
module.exports={encrypt,decrypt};
