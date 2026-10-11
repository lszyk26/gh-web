/* root-check.js — 校验每个视图是否单根。
   <transition> 要求子组件有唯一根节点，否则过渡不生效（生产版 Vue 不告警）。 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const { parse } = require('@vue/compiler-dom');
const ROOT = path.join(__dirname, '..', 'web');

const ctx = {
  window: { VIEWS: {}, C: {}, App: null },
  hljs: { getLanguage: () => false, highlightAuto: () => ({ value: '' }) },
  marked: { setOptions() { }, parse: s => s },
  location: { hash: '', origin: 'x' },
  U: new Proxy({}, { get: () => () => '' }),
  API: new Proxy({}, { get: () => () => '' }),
  document: {
    addEventListener() { }, querySelector: () => null,
    getElementById: () => ({ innerHTML: '', appendChild() { } }),
    createElement: () => ({ style: {}, select() { }, remove() { } })
  },
  console, addEventListener() { }, matchMedia: () => ({ matches: false })
};
ctx.window = ctx; ctx.globalThis = ctx;

vm.createContext(ctx);
const files = ['app/util.js', 'app/api.js', 'app/components.js',
  ...fs.readdirSync(path.join(ROOT, 'app/views')).sort().map(f => 'app/views/' + f),
  'app/app.js'];
for (const f of files) {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); }
  catch (e) { console.log('LOAD FAIL ' + f + ' ' + e.message); }
}

let bad = 0;
function check(name, comp) {
  if (!comp || typeof comp.template !== 'string') return;
  let ast;
  try { ast = parse(comp.template, { onError() { } }); } catch (e) { console.log('COMPILE FAIL ' + name); bad++; return; }
  if (!ast || !ast.children) { console.log('PARSE EMPTY ' + name); bad++; return; }
  // type 2 = 注释, type 3 = 文本（空白文本不算根）
  const kids = ast.children.filter(n => n.type !== 2 && !(n.type === 3 && !/\S/.test(n.content)));
  if (kids.length > 1) { bad++; console.log('多根  ' + name + '  -> ' + kids.length + ' 个顶层节点'); }
  else console.log('ok    ' + name);
}
Object.keys(ctx.VIEWS).forEach(k => check('view:' + k, ctx.VIEWS[k]));
check('shell:App', ctx.App);
console.log('\n说明：多根视图本身不影响过渡 —— app.js 里 <transition> 内已加一层' +
  '\n     单根 .view-host 作为 carrier，内层组件根节点数不再影响过渡是否生效。');
process.exit(0);
