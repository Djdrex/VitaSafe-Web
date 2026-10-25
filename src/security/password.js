'use strict';
const crypto=require('node:crypto');
const PARAMS={N:16384,r:8,p:1,maxmem:32*1024*1024};
function createPasswordHash(password){if(typeof password!=='string'||password.length<12||password.length>256)throw new Error('La contraseña debe tener entre 12 y 256 caracteres');const salt=crypto.randomBytes(16);const key=crypto.scryptSync(password,salt,64,PARAMS);return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;}
function verifyPassword(password,stored){if(typeof password!=='string'||!stored||!stored.startsWith('scrypt$'))return false;const parts=stored.split('$');if(parts.length!==3)return false;try{const expected=Buffer.from(parts[2],'hex');if(expected.length!==64)return false;const actual=crypto.scryptSync(password,Buffer.from(parts[1],'hex'),64,PARAMS);return crypto.timingSafeEqual(actual,expected)}catch{return false}}
module.exports={createPasswordHash,verifyPassword};
