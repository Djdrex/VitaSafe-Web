'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {verifyStartup} = require('../scripts/verify-isolated');
const env = {DEMO_MODE:'true', VITASAFE_TEST_ENV:'true', DATABASE_URL:'postgres://dpg-dbep767avr4c73bll9u0-a/example'};
test('Render startup checks the existing catalogue in a read-only transaction', async () => {
  const calls = [];
  class Client {
    async connect() { calls.push('connect'); }
    async query(sql) { calls.push(sql); }
    async end() { calls.push('end'); }
  }
  await verifyStartup(env, Client);
  assert.deepEqual(calls, ['connect','BEGIN READ ONLY','SELECT id FROM vitasafe_stage_app.products LIMIT 1','COMMIT','end']);
  await assert.rejects(verifyStartup({...env, DEMO_MODE:'false'}, Client));
  await assert.rejects(verifyStartup({...env, DATABASE_URL:'postgres://unrelated/db'}, Client));
  assert.equal(calls.length, 5);
});
