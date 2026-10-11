/* img-check.js — 专测「Markdown 相对路径图片」的改写逻辑
   复现的问题：README 里 <img src="assets/showcase/hero.png"> 这类相对路径，
   SPA 下浏览器按页面地址解析 → 跑到本站 /<owner>/<repo>/assets/... → 404 → 破图。
   这里用真实 marked + 真实 util.js 跑一遍，断言全部改写为可访问的绝对地址。 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..', 'web');
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://ghs.0lt.top/#/alchaincyf/huashu-art-motion',
  pretendToBeVisual: true, runScripts: 'outside-only'
});
const w = dom.window;
global.window = w; global.document = w.document; global.navigator = w.navigator;
global.location = w.location;

w.eval(fs.readFileSync(path.join(ROOT, 'vendor/marked.min.js'), 'utf8'));
w.eval(fs.readFileSync(path.join(ROOT, 'app/util.js'), 'utf8'));
const U = w.U;

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : '')); }
}

// ---------- 1) hash 兜底解析 ----------
const ctx = U.ctxFromHash();
ok('ctxFromHash 从路由解析出仓库',
  ctx && ctx.o === 'alchaincyf' && ctx.r === 'huashu-art-motion' && ctx.ref === 'HEAD',
  JSON.stringify(ctx));
w.location.hash = '#/lszyk26/gh-mcp/code/blob/dev/src/a.js';
const ctx2 = U.ctxFromHash();
ok('ctxFromHash 能解析非默认分支',
  ctx2 && ctx2.ref === 'dev', JSON.stringify(ctx2));
w.location.hash = '#/trends';
ok('ctxFromHash 对非仓库路由返回 null', U.ctxFromHash() === null);

// ---------- 2) 地址换算 ----------
U.imgContext('alchaincyf', 'huashu-art-motion', 'main');
const r1 = U.resolveImgSrc('assets/showcase/hero.png');
ok('相对路径 -> raw.githubusercontent.com',
  r1 === 'https://raw.githubusercontent.com/alchaincyf/huashu-art-motion/main/assets/showcase/hero.png', r1);
ok('./ 前缀也能处理', U.resolveImgSrc('./assets/a.png').indexOf('/main/assets/a.png') > 0);
ok('URL 编码：中文与非 ASCII 文件名',
  U.resolveImgSrc('assets/动画语法/y1_kurzgesagt_总览.jpg').indexOf('/main/assets/%E5%8A%A8%E7%94%BB%E8%AF%AD%E6%B3%95/') > 0,
  U.resolveImgSrc('assets/动画语法/y1_kurzgesagt_总览.jpg'));
ok('绝对地址不动', U.resolveImgSrc('https://example.com/a.png') === 'https://example.com/a.png');
ok('data: 不动', U.resolveImgSrc('data:image/png;base64,AAA') === 'data:image/png;base64,AAA');
ok('锚点不动', U.resolveImgSrc('#x') === '#x');
U.imgContext(null, null, null); // 清掉上下文，走兜底
w.location.hash = '#/trends';
ok('无上下文时退回 github.com/raw', U.resolveImgSrc('assets/a.png') === 'https://github.com/raw/assets/a.png',
  U.resolveImgSrc('assets/a.png'));

// ---------- 3) 真实 README 片段过一遍 marked ----------
U.imgContext('alchaincyf', 'huashu-art-motion', 'main');
const md = [
  '<div align="center">',
  '',
  '<img src="assets/showcase/hero.png" alt="总览图" width="100%" />',
  '',
  '![](assets/showcase/mario-claude.gif)',
  '',
  '<img src="https://raw.githubusercontent.com/alchaincyf/x/main/keep.png" />',
  '<img src="https://github.com/alchaincyf/x/raw/main/keep2.png" />',
  '',
  '</div>'
].join('\n');
const html = U.md(md);
ok('HTML 标签里的相对 src 被改写', html.indexOf('src="https://raw.githubusercontent.com/alchaincyf/huashu-art-motion/main/assets/showcase/hero.png"') > 0, html.slice(0, 400));
ok('Markdown 语法 ![]() 的相对 src 被改写', html.indexOf('src="https://raw.githubusercontent.com/alchaincyf/huashu-art-motion/main/assets/showcase/mario-claude.gif"') > 0);
ok('原有绝对地址保持不变', html.indexOf('alchaincyf/x/main/keep.png') > 0 && html.indexOf('alchaincyf/x/raw/main/keep2.png') > 0);
ok('不再残留站点内的相对图片路径', html.indexOf('src="assets/') < 0, html);
ok('图片的 alt 未被破坏', html.indexOf('alt="总览图"') > 0);


// ---------- 4) 相对链接改写 ----------
U.imgContext('alchaincyf', 'huashu-art-motion', 'main');
const l1 = U.resolveLinkHref('assets/showcase/mario-clips.md');
ok('相对链接 -> GitHub blob 地址',
  l1.indexOf('https://github.com/alchaincyf/huashu-art-motion/blob/main/assets/showcase/mario-clips.md') === 0, l1);
ok('相对链接保留 #fragment',
  U.resolveLinkHref('references/01.md#做法').indexOf('/blob/main/references/01.md#做法') > 0,
  U.resolveLinkHref('references/01.md#做法'));
ok('绝对链接不动', U.resolveLinkHref('https://example.com/x') === 'https://example.com/x');
const md2 = '[片段时间点与导出参数](assets/showcase/mario-clips.md)\n\n[已有绝对链接](https://x.com/y)';
const h2 = U.md(md2);
ok('Markdown 相对链接被改写', h2.indexOf('href="https://github.com/alchaincyf/huashu-art-motion/blob/main/assets/showcase/mario-clips.md"') > 0, h2);
ok('Markdown 绝对链接保持', h2.indexOf('href="https://x.com/y"') > 0);

console.log('\n图片改写: ' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
