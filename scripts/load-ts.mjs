// Loads app TypeScript modules (with their relative, "@/" and JSON imports) for Node scripts and tests.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const cache = new Map();
function resolve(from, name) {
  const base = name.startsWith('@/') ? path.join('src', name.slice(2)) : path.join(path.dirname(from), name);
  for (const file of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  throw new Error(`Cannot resolve ${name} from ${from}`);
}
export function loadTs(file) {
  file = path.normalize(file);
  if (cache.has(file)) return cache.get(file);
  if (file.endsWith('.json')) { const json = JSON.parse(fs.readFileSync(file, 'utf8')); cache.set(file, json); return json; } // esModuleInterop wraps it as { default }
  const exports = {};
  cache.set(file, exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports, require: name => loadTs(resolve(file, name)), Intl, URL, console });
  return exports;
}
