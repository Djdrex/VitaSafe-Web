'use strict';

const crypto = require('node:crypto');
const recovery = require('./db/recovery');
const format = 'VitaSafe-backup-v1';
const tagBytes = 16;

function decode(value, length) {
  if (typeof value !== 'string' || !value.length) throw Error('Invalid encoded backup field');
  const bytes = Buffer.from(value, 'base64');
  if ((length !== undefined && bytes.length !== length) || bytes.toString('base64') !== value)
    throw Error('Invalid encoded backup field');
  return bytes;
}

function configured(key64) {
  try {
    decode(key64, 32);
    return true;
  } catch {
    return false;
  }
}

function encrypt(bytes, key64) {
  recovery.validate(bytes);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', decode(key64, 32), iv, {authTagLength: tagBytes});
  cipher.setAAD(Buffer.from(format));
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.from(JSON.stringify({
    format, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64')
  }));
}

function decrypt(bytes, key64) {
  const envelope = JSON.parse(bytes);
  if (envelope?.format !== format) throw Error('Invalid encrypted backup format');
  const iv = decode(envelope.iv, 12);
  const tag = decode(envelope.tag, tagBytes);
  const ciphertext = decode(envelope.ciphertext);
  const decipher = crypto.createDecipheriv('aes-256-gcm', decode(key64, 32), iv, {authTagLength: tagBytes});
  decipher.setAAD(Buffer.from(format));
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  recovery.validate(plaintext);
  return plaintext;
}

module.exports = {encrypt, decrypt, configured};
