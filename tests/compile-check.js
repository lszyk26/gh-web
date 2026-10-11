/* compile-check.js — 用 node 的 vm 加载所有前端脚本，
   拦截 window.VIEWS / window.C / window.App，再用 vue 编译器逐个编译模板。
   目的：在上线前抓出所有模板语法错误。 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { compile } = require('@vue/compiler-dom');

const ROOT = require('path').join(__dirname, '..', 'web');

function makeWindow() {
  const views = {};
  const comps = {};
  const w = {
    VIEWS: views,
    C: comps,
    App: null,
    hljs: { getLanguage: () => false, highlightAuto: () => ({ value: '' }) },
    marked: { setOptions: () => { }, parse: (s) => s },
    location: { hash: '', origin: 'http://x' },
    navigator: { clipboard: null },
    localStorage: { getItem: () => null, setItem: () => { }, removeItem: () => { }, },
    console: console,
    addEventListener: () => { },
    matchMedia: () => ({ matches: false })
  };
  w.window = w;
  w.globalThis = w;
  w.document = {
    addEventListener: () => { },
    querySelector: () => null,
    getElementById: () => ({ innerHTML: '', appendChild: () => { } }),
    createElement: () => ({ style: {}, select: () => { }, remove: () => { } })
  };
  w.U = { copy: () => { }, toast: () => { }, num: (n) => n, compact: (n) => n, rel: () => '', relZh: () => '', abs: () => '', size: () => '', bytes: (n) => n, langColor: () => '#000', license: () => '', firstLine: (s) => s, initials: () => 'AB', md: (s) => s, esc: (s) => s, extOf: () => '', baseOf: (s) => s, rawUrl: () => '', store: { get: () => null, set: () => { }, del: () => { }, clear: () => { } }, date: () => '', objectKeys: (o) => Object.keys(o) };
  w.API = { token: null, onRate: null, get: () => { }, getData: () => { }, req: () => { }, forget: () => { }, links: () => ({}), hasToken: () => false, setToken: () => { }, loadToken: () => { } };
  return w;
}

const ctx = makeWindow();
vm.createContext(ctx);

const files = [
  'app/util.js', 'app/api.js', 'app/components.js',
  ...fs.readdirSync(path.join(ROOT, 'app/views')).sort().map(f => 'app/views/' + f),
  'app/app.js'
];

let loadErr = 0;
for (const f of files) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  try { vm.runInContext(src, ctx, { filename: f }); }
  catch (e) { console.log('LOAD FAIL  ' + f + '\n   ' + e.message); loadErr = 1; }
}
if (loadErr) process.exit(1);
console.log('全部脚本加载成功 (' + files.length + ' 个)\n');

const targets = [];
Object.keys(ctx.VIEWS).forEach(k => targets.push(['view:' + k, ctx.VIEWS[k]]));
Object.keys(ctx.C).forEach(k => targets.push(['comp:' + k, ctx.C[k]]));
if (ctx.App) targets.push(['shell:App', ctx.App]);

const ignoreTag = new Set(['view-login', 'login-host', 'icon', 'avatar', 'rel-time', 'markdown',
  'code-block', 'diff-view', 'pager', 'dropdown', 'empty-state', 'spin', 'skel-rows',
  'lang-dot', 'star-count', 'state-badge', 'count-chip', 'component']);

let bad = 0, warn = 0;
for (const [name, comp] of targets) {
  if (!comp) { console.log('MISSING  ' + name); bad++; continue; }
  const tpl = comp.template;
  if (typeof tpl !== 'string') { console.log('NO TPL   ' + name); bad++; continue; }
  try {
    const errs = [];
    const res = compile(tpl, {
      onError: (e) => errs.push(e),
      onWarn: (w) => errs.push(w)
    });
    if (errs.length) {
      bad++;
      console.log('TPL FAIL ' + name);
      errs.slice(0, 4).forEach(e => console.log('   ' + (e.message || e).toString().split('\n')[0]));
    } else {
      // inventory tags emitted (for the ignore list sanity)
      const tags = (tpl.match(/<[a-z][a-z0-9-]*/g) || []).map(s => s.slice(1));
      const unknown = [...new Set(tags)].filter(t => ignoreTag.has(t) === false && /-/.test(t));
      if (unknown.length) { warn++; console.log('yet   ' + name + '  自定义标签: ' + unknown.join(', ')); }
      console.log('ok       ' + name);
    }
  } catch (e) {
    bad++;
    console.log('TPL THROW ' + name + ' ' + e.message);
  }
}
console.log('\n结果: ' + targets.length + ' 个模板, 失败 ' + bad + ', 提示 ' + warn);
process.exit(bad ? 1 : 0);
