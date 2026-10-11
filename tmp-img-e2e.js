/* 端到端验证：真跑一遍前端，喂一份「含相对路径图片」的 README，
   断言最终 DOM 里的 <img src> 已是 raw.githubusercontent.com 绝对地址。
   （一次性验证脚本，正式回归用 tests/img-check.js） */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = '/opt/gh-web/web';
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const README = [
  '<div align="center">',
  '',
  '<img src="assets/showcase/hero.png" alt="hero" width="100%" />',
  '',
  '# huashu-art-motion',
  '',
  '![](assets/showcase/mario-claude.gif)',
  '',
  '| | |',
  '|---|---|',
  '| <img src="assets/动画语法/y1_kurzgesagt_总览.jpg" alt="k" /> | <img src="https://github.com/alchaincyf/fanbox/raw/master/assets/promo-banner.jpg" alt="abs" /> |',
  '</div>'
].join('\n');

const dom = new JSDOM(html.replace(/<script src="[^"]*"><\/script>/g, ''), {
  url: 'https://ghs.0lt.top/#/alchaincyf/huashu-art-motion',
  pretendToBeVisual: true, runScripts: 'outside-only'
});
const w = dom.window;
global.window = w; global.document = w.document; global.navigator = w.navigator;
global.location = w.location;
global.HTMLElement = w.HTMLElement; global.Node = w.Node; global.getComputedStyle = w.getComputedStyle;
w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
w.scrollTo = () => {};
w.TextDecoder = global.TextDecoder;  // jsdom 的 window 里没有 TextDecoder，repo.js 解 base64 会静默失败
w.localStorage.setItem('ghw.pat', JSON.stringify('ghp_faketoken'));

const repo = {
  id: 1, name: 'huashu-art-motion', full_name: 'alchaincyf/huashu-art-motion', private: false,
  owner: { login: 'alchaincyf', avatar_url: '' }, description: 'd', language: 'JavaScript',
  stargazers_count: 1, forks_count: 0, subscribers_count: 0, open_issues_count: 0,
  default_branch: 'main', pushed_at: new Date().toISOString(), topics: [], archived: false, fork: false,
  size: 10, watchers_count: 0, has_issues: true
};
const enc = (o) => ({ ok: true, status: 200, headers: { get: () => null }, text: async () => JSON.stringify(o) });
w.fetch = async (url) => {
  const p = String(url).replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '').split('?')[0];
  if (process.env.LOGFETCH) console.log('  FETCH ' + p);
  if (/\/repos\/[^/]+\/[^/]+\/readme$/.test(p)) return enc({ content: Buffer.from(README).toString('base64'), encoding: 'base64' });
  if (/^\/repos\/[^/]+\/[^/]+$/.test(p)) return enc(repo);
  if (/\/languages$/.test(p)) return enc({ JavaScript: 100 });
  if (/\/contributors$/.test(p)) return enc([]);
  if (/\/commits/.test(p)) return enc([]);
  if (/\/search\/issues/.test(p)) return enc({ total_count: 0, items: [] });
  if (/\/subscription$/.test(p)) return enc({ subscribed: false });
  return enc({});
};

const load = (rel) => w.eval(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
load('vendor/vue.global.prod.js');
w.hljs = { getLanguage: () => false, highlightAuto: () => ({ value: '' }), highlight: () => ({ value: '' }) };
load('vendor/marked.min.js');
const files = ['app/util.js', 'app/api.js', 'app/components.js',
  ...fs.readdirSync(path.join(ROOT, 'app/views')).sort().map(f => 'app/views/' + f), 'app/app.js'];
files.forEach(load);

(async () => {
  for (let i = 0; i < 25; i++) await new Promise(r => setTimeout(r, 120));
  const appEl = w.document.getElementById('app');
  const domHtml = appEl ? appEl.innerHTML : '';
  console.log('app 节点: ' + (appEl ? 'ok' : '缺失') + '  innerHTML 长度: ' + domHtml.length);
  console.log('片段: ' + JSON.stringify(domHtml.slice(0, 300)));
  console.log('含 README 标题: ' + (domHtml.indexOf('huashu-art-motion') >= 0));
  console.log('含 assets/: ' + (domHtml.match(/assets\//g) || []).length + ' 处');
  console.log('hash: ' + w.location.hash);
  const i = domHtml.indexOf('card-body');
  console.log('card-body 位置: ' + i);
  console.log('README 卡片区: ' + JSON.stringify(domHtml.slice(Math.max(0,i-400), i+900)));
  console.log('含 class="md": ' + (domHtml.indexOf('class=\"md\"') >= 0));
  console.log('空状态文案: ' + (domHtml.indexOf('没有 README') >= 0));
  console.log('骨架屏: ' + (domHtml.indexOf('skel') >= 0));
  console.log('__b64 存在: ' + (typeof w.__b64) + '  atob: ' + (typeof w.atob));
  try { console.log('__b64 试解: ' + JSON.stringify(w.__b64(Buffer.from(README).toString('base64')).slice(0, 40))); }
  catch (e) { console.log('__b64 抛错: ' + e.message); }
  const srcs = (domHtml.match(/<img\b[^>]*?src=("[^"]*"|'[^']*'|[^\s>]+)/gi) || [])
    .map(s => s.replace(/^<img\b[^>]*?src=("|')?/i, '').replace(/("|')?$/,''));
  console.log('页面上共 ' + srcs.length + ' 个 <img>：');
  srcs.forEach(s => console.log('   ' + (s.length > 110 ? s.slice(0, 110) + '…' : s)));
  const bad = srcs.filter(s => !/^(https?:|data:|blob:)/.test(s));
  const rel = srcs.filter(s => /^https:\/\/raw\.githubusercontent\.com\/alchaincyf\/huashu-art-motion\/(main|HEAD)\/assets\//.test(s));
  console.log('\n非绝对地址（应为 0）: ' + bad.length + (bad.length ? ' -> ' + bad.join(', ') : ''));
  console.log('已改写为 raw 绝对地址: ' + rel.length + ' 个');
  console.log(bad.length === 0 && rel.length >= 3 ? '\n结果: OK' : '\n结果: FAIL');
  process.exit(bad.length === 0 && rel.length >= 3 ? 0 : 1);
})();
