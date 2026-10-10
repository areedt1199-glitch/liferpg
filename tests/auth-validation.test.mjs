import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('signup rejects missing or mismatched confirmation before calling Supabase Auth', async () => {
  let requests = 0;
  const exports = {};
  const dependencies = {
    'next/headers': {},
    'next/navigation': {},
    '@/lib/supabase/server': { serverClient: async () => ({auth:{signUp:async()=>{requests++;throw new Error('Must not send invalid signup');}}}) },
    './messages': {},
  };
  const source = fs.readFileSync('src/features/account/actions.ts', 'utf8');
  const code = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(code, {exports, require: name => {
    assert.ok(name in dependencies); return dependencies[name];
  }});
  for (const confirmation of [null, 'different-password']) {
    const form = new FormData();
    form.set('action', 'signup'); form.set('email', 'test@example.com'); form.set('password', 'example-password');
    if (confirmation !== null) form.set('confirmPassword', confirmation);
    const result = await exports.authenticate({}, form);
    assert.equal(result.error, true);
    assert.match(result.message, /ไม่ตรงกัน/);
  }
  assert.equal(requests, 0);
});
