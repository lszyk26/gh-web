/* render-check.js — 用 jsdom 真跑一遍：挂载 App，喂假的 API 数据，
   逐个路由渲染，捕获任何运行时错误 / Vue 警告 / 未解析组件。 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = require('path').join(__dirname, '..', 'web');
const routes = process.argv.slice(2);
const ROUTES = routes.length ? routes : [
  '#/', '#/repos', '#/stars', '#/notifications', '#/search?q=test&type=repositories',
  '#/trends', '#/trends?period=today&mode=active&lang=Go',
  '#/settings', '#/users/lszyk26',
  '#/lszyk26/gh-mcp', '#/lszyk26/gh-mcp/code/tree/main', '#/lszyk26/gh-mcp/code/blob/main/README.md',
  '#/lszyk26/gh-mcp/issues', '#/lszyk26/gh-mcp/issues/3',
  '#/lszyk26/gh-mcp/pulls', '#/lszyk26/gh-mcp/pulls/12',
  '#/lszyk26/gh-mcp/commits', '#/lszyk26/gh-mcp/commit/abc1234def',
  '#/lszyk26/gh-mcp/branches', '#/lszyk26/gh-mcp/releases', '#/lszyk26/gh-mcp/releases/v1.0.0',
  '#/lszyk26/gh-mcp/actions', '#/lszyk26/gh-mcp/actions/991',
  '#/lszyk26/gh-mcp/compare/main...dev'
];

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function dummyRepo(o, n) {
  return {
    id: 1, name: n, full_name: o + '/' + n, private: false, owner: { login: o, avatar_url: '' },
    description: '一个测试仓库，用于渲染校验', language: 'JavaScript', stargazers_count: 128,
    forks_count: 12, subscribers_count: 4, open_issues_count: 3, default_branch: 'main',
    pushed_at: new Date().toISOString(), created_at: '2025-01-01T00:00:00Z', updated_at: new Date().toISOString(),
    topics: ['tooling', 'cli'], license: { spdx_id: 'MIT', name: 'MIT License' },
    html_url: 'https://github.com/x', archived: false, fork: false, is_template: false,
    size: 2048, watchers_count: 4, has_issues: true, mergeable: true, mergeable_state: 'clean'
  };
}
function user(login) {
  return { login: login, id: 7, avatar_url: '', name: 'Test ' + login, bio: 'hi', followers: 12,
    following: 3, public_repos: 9, created_at: '2024-01-01T00:00:00Z', updated_at: new Date().toISOString(),
    html_url: 'https://github.com/' + login, type: 'User', location: 'CN', company: '@x', blog: 'https://x.dev', email: 'a@b.c' };
}
function commit(sha) {
  return { sha: sha || 'abc1234def5678', html_url: 'https://github.com/x', commit: { message: 'feat: 修复了一个问题\n\n详细说明在此', author: { name: 'Dev', email: 'd@x.io', date: new Date().toISOString() }, verification: { verified: true } }, author: { login: 'dev', avatar_url: '' }, parents: [{ sha: '0001112' }], stats: { additions: 12, deletions: 3, total: 15 }, files: [{ filename: 'src/a.js', status: 'modified', additions: 12, deletions: 3, patch: '@@ -1,3 +1,5 @@\n-old\n+new\n+line\n context' }] };
}
function issue(n, isPr) {
  return { id: n, number: n, title: '示例议题 ' + n, state: 'open', user: user('dev'),
    created_at: '2026-09-01T00:00:00Z', updated_at: new Date().toISOString(), closed_at: null,
    body: '# 标题\n\n正文 **加粗** 与 `代码`。\n\n- 列表\n- 项目\n\n```js\nconsole.log(1)\n```',
    labels: [{ id: 1, name: 'bug', color: 'd73a4a' }], comments: 2, assignee: user('dev'),
    milestone: { title: 'v1' }, html_url: 'https://github.com/x', locked: false,
    pull_request: isPr ? { merged_at: null } : undefined, draft: false, state_reason: 'completed',
    head: { label: o => '', sha: 'abc123', ref: 'dev' }, base: { label: '', ref: 'main' },
    mergeable: true, mergeable_state: 'clean', additions: 10, deletions: 2, changed_files: 2,
    review_comments: 1, commits: 3, merged: false, merged_at: null };
}
function pr(n) {
  const x = issue(n, true);
  x.head = { label: 'dev', sha: 'abc1234', ref: 'dev' };
  x.base = { label: 'main', ref: 'main' };
  return x;
}
function comment(id) { return { id: id, user: user('dev'), created_at: new Date().toISOString(), body: '这是一条评论\n\n> 引用', html_url: 'https://github.com/x', updated_at: new Date().toISOString() }; }
function notif(id) { return { id: id, unread: true, reason: 'mention', updated_at: new Date().toISOString(),
  subject: { title: '有人提到了你', type: 'Issue', url: 'https://api.github.com/repos/a/b/issues/' + id }, repository: { full_name: 'a/b' } }; }

function fixture(pathname, params) {
  const p = params;
  const enc = (o) => ({ data: o, status: 200, cache: 'HIT', headers: { get: () => null } });
  const link = (res, o) => { res.headers = { get: (k) => (k === 'Link' ? '' : null) }; return res; };

  if (/^\/user\/repos/.test(pathname)) return enc([dummyRepo('lszyk26', 'gh-mcp'), dummyRepo('lszyk26', 'ssh-mcp')]);
  if (/^\/user\/starred/.test(pathname)) return enc([dummyRepo('vuejs', 'core'), dummyRepo('golang', 'go')]);
  if (/^\/user\/following/.test(pathname)) return enc([user('dev')]);
  if (/^\/user$/.test(pathname)) return enc(user('lszyk26'));
  if (/^\/rate_limit/.test(pathname)) return enc({ rate: { limit: 5000, remaining: 4820, reset: Math.floor(Date.now() / 1000) + 1800, used: 180 }, resources: {} });
  if (/^\/notifications/.test(pathname)) return enc([notif(1), notif(2)]);
  if (/^\/search\/repositories/.test(pathname)) return enc({ total_count: 2, incomplete_results: false, items: [dummyRepo('vuejs', 'core')] });
  if (/^\/search\/code/.test(pathname)) return enc({ total_count: 1, incomplete_results: false, items: [{ name: 'a.js', path: 'src/a.js', repository: { full_name: 'lszyk26/gh-mcp' } }] });
  if (/^\/search\/issues/.test(pathname)) return enc({ total_count: 2, incomplete_results: false, items: [issue(1, false), issue(2, true)] });
  if (/^\/search\/commits/.test(pathname)) return enc({ total_count: 1, incomplete_results: false, items: [{ sha: 'abc', repository: { full_name: 'a/b' }, commit: { message: 'x', author: { name: 'd', date: new Date().toISOString() } }, author: user('d') }] });
  if (/^\/search\/users/.test(pathname)) return enc({ total_count: 1, incomplete_results: false, items: [{ login: 'vuejs', id: 3, avatar_url: '', type: 'Organization' }] });
  if (/^\/users\/[^/]+\/repos/.test(pathname)) return enc([dummyRepo('vuejs', 'vue'), dummyRepo('vuejs', 'core')]);
  if (/^\/users\/[^/]+$/.test(pathname)) return enc(user(pathname.split('/').pop()));
  if (/\/gists/.test(pathname)) return enc([]);
  if (/\/repos\/[^/]+\/[^/]+\/languages/.test(pathname)) return enc({ JavaScript: 12000, CSS: 3000, Shell: 200 });
  if (/\/repos\/[^/]+\/[^/]+\/contributors/.test(pathname)) return enc([user('dev')]);
  if (/\/repos\/[^/]+\/[^/]+\/readme/.test(pathname)) return enc({ content: Buffer.from('# Hello\n\n这是 README 的一段说明。\n\n```js\nvar a=1\n```').toString('base64'), encoding: 'base64' });
  if (/\/repos\/[^/]+\/[^/]+\/branches\/[^/]+$/.test(pathname)) return enc({ name: 'main', commit: { sha: 'abc1234' }, protected: true });
  if (/\/repos\/[^/]+\/[^/]+\/branches/.test(pathname)) return enc([{ name: 'main', commit: { sha: 'abc1234' }, protected: true }, { name: 'dev', commit: { sha: 'def5678' } }]);
  if (/\/repos\/[^/]+\/[^/]+\/tags/.test(pathname)) return enc([{ name: 'v1.0.0', commit: { sha: 'abc1234', commit: { message: '稳定版发布' } } }]);
  if (/\/repos\/[^/]+\/[^/]+\/labels/.test(pathname)) return enc([{ id: 1, name: 'bug', color: 'd73a4a' }, { id: 2, name: 'good first issue', color: '7057ff' }]);
  if (/\/repos\/[^/]+\/[^/]+\/subscription/.test(pathname)) return enc({ subscribed: true });
  if (/\/repos\/[^/]+\/[^/]+\/contributors/.test(pathname)) return enc([user('dev')]);
  if (/\/repos\/[^/]+\/[^/]+\/commits\/[^/]+\/check-runs/.test(pathname)) return enc({ total_count: 2, check_runs: [{ id: 1, name: 'build', status: 'completed', conclusion: 'success', app: { name: 'Actions' }, started_at: new Date().toISOString(), html_url: '#' }, { id: 2, name: 'lint', status: 'completed', conclusion: 'failure', app: { name: 'Actions' }, started_at: new Date().toISOString(), html_url: '#' }] });
  if (/\/repos\/[^/]+\/[^/]+\/commits\/[^/]+\/comments/.test(pathname)) return enc([comment(1)]);
  if (/\/repos\/[^/]+\/[^/]+\/commits\/[^/]+$/.test(pathname)) return enc(commit('abc1234def5678'));
  if (/\/repos\/[^/]+\/[^/]+\/commits/.test(pathname)) return enc([commit('a1'), commit('b2')]);
  if (/\/repos\/[^/]+\/[^/]+\/issues\/\d+\/comments/.test(pathname)) return enc([comment(1), comment(2)]);
  if (/\/repos\/[^/]+\/[^/]+\/issues\/\d+\/events/.test(pathname)) return enc([{ event: 'labeled', actor: user('dev'), label: { name: 'bug' }, created_at: new Date().toISOString() }]);
  if (/\/repos\/[^/]+\/[^/]+\/issues\/\d+\/timeline/.test(pathname)) return enc([{ event: 'commented', actor: user('dev') }]);
  if (/\/repos\/[^/]+\/[^/]+\/issues\/\d+$/.test(pathname)) return enc(issue(3, false));
  if (/\/repos\/[^/]+\/[^/]+\/issues/.test(pathname)) return enc([issue(1, false), issue(2, false)]);
  if (/\/repos\/[^/]+\/[^/]+\/pulls\/\d+\/files/.test(pathname)) return enc([{ filename: 'src/a.js', status: 'modified', additions: 12, deletions: 3, patch: '@@ -1,4 +1,6 @@\n const a = 1\n-old\n+new\n+extra\n const b = 2\n' }]);
  if (/\/repos\/[^/]+\/[^/]+\/pulls\/\d+\/commits/.test(pathname)) return enc([commit('c3')]);
  if (/\/repos\/[^/]+\/[^/]+\/pulls\/\d+\/reviews/.test(pathname)) return enc([{ id: 1, user: user('dev'), state: 'APPROVED', body: '看起来不错', submitted_at: new Date().toISOString(), commit_id: 'abc123' }]);
  if (/\/repos\/[^/]+\/[^/]+\/pulls\/\d+\/comments/.test(pathname)) return enc([comment(9)]);
  if (/\/repos\/[^/]+\/[^/]+\/pulls\/\d+$/.test(pathname)) return enc(pr(12));
  if (/\/repos\/[^/]+\/[^/]+\/pulls/.test(pathname)) return enc([pr(12), pr(13)]);
  if (/\/repos\/[^/]+\/[^/]+\/releases\/tags\//.test(pathname)) return enc(releaseBody());
  if (/\/repos\/[^/]+\/[^/]+\/releases\/\d+\/assets/.test(pathname)) return enc([{ id: 1, name: 'app.zip', size: 123456, download_count: 42, content_type: 'application/zip', created_at: new Date().toISOString(), browser_download_url: '#' }]);
  if (/\/repos\/[^/]+\/[^/]+\/releases/.test(pathname)) return enc([releaseBody()]);
  if (/\/repos\/[^/]+\/[^/]+\/actions\/runs\/\d+\/jobs/.test(pathname)) return enc({ jobs: [{ id: 1, name: 'build', status: 'completed', conclusion: 'success', started_at: new Date().toISOString(), completed_at: new Date().toISOString(), runner_name: 'ubuntu-latest', steps: [{ name: 'checkout', status: 'completed', conclusion: 'success', started_at: new Date().toISOString(), completed_at: new Date().toISOString() }, { name: 'test', status: 'completed', conclusion: 'failure', started_at: new Date().toISOString(), completed_at: new Date().toISOString() }] }] });
  if (/\/repos\/[^/]+\/[^/]+\/actions\/runs\/\d+$/.test(pathname)) return enc({ id: 991, name: 'CI', run_number: 42, status: 'completed', conclusion: 'success', head_branch: 'main', head_sha: 'abc1234', event: 'push', run_attempt: 1, created_at: new Date().toISOString(), run_started_at: new Date().toISOString(), updated_at: new Date().toISOString(), actor: user('dev'), head_commit: { message: 'ci: 修复构建' }, html_url: '#' });
  if (/\/repos\/[^/]+\/[^/]+\/actions\/runs/.test(pathname)) return enc({ total_count: 1, workflow_runs: [{ id: 991, name: 'CI', run_number: 42, status: 'completed', conclusion: 'success', head_branch: 'main', head_sha: 'abc1234', created_at: new Date().toISOString(), run_started_at: new Date().toISOString(), updated_at: new Date().toISOString(), actor: user('dev'), head_commit: { message: 'ci' }, html_url: '#' }] });
  if (/\/repos\/[^/]+\/[^/]+\/actions\/workflows/.test(pathname)) return enc({ workflows: [{ id: 1, name: 'CI', path: '.github/workflows/ci.yml', state: 'active' }] });
  if (/\/repos\/[^/]+\/[^/]+\/compare\//.test(pathname)) return enc({ status: 'ahead', ahead_by: 3, behind_by: 0, total_commits: 3, files: [{ filename: 'src/b.js', status: 'added', additions: 5, deletions: 0, patch: '@@ -0,0 +1,5 @@\n+a\n+b\n+c\n+d\n+e' }], commits: [commit('d4')] });
  if (/\/repos\/[^/]+\/[^/]+\/git\/blobs\//.test(pathname)) return enc({ content: Buffer.from('blob content').toString('base64'), encoding: 'base64' });
  if (/\/repos\/[^/]+\/[^/]+\/contents\//.test(pathname)) {
    if (/README\.md/i.test(pathname) || /\.js$/.test(pathname)) return enc({ type: 'file', name: 'a.js', path: 'src/a.js', sha: 'aaa', size: 240, content: Buffer.from('export function add(a, b) {\n  return a + b;\n}\n').toString('base64'), encoding: 'base64', download_url: '#' });
    return enc([
      { type: 'dir', name: 'src', path: 'src', sha: 'd1' },
      { type: 'file', name: 'README.md', path: 'README.md', sha: 'f1', size: 1204 },
      { type: 'file', name: 'package.json', path: 'package.json', sha: 'f2', size: 512 }
    ]);
  }
  if (/\/repos\/[^/]+\/[^/]+\/git\/trees\//.test(pathname)) return enc({ tree: [] });
  if (/\/repos\/[^/]+\/[^/]+$/.test(pathname)) return enc(dummyRepo('lszyk26', 'gh-mcp'));
  return enc({});
}
function releaseBody() {
  return { id: 5, tag_name: 'v1.0.0', name: 'v1.0.0 稳定版', body: '## 更新内容\n\n- 新增功能 A\n- 修复问题 B', draft: false, prerelease: false, published_at: '2026-10-01T00:00:00Z', zipball_url: '#', tarball_url: '#', assets: [{ id: 1, name: 'app.zip', size: 123456, download_count: 42 }] };
}

async function main() {
  const dom = new JSDOM(html.replace(/<script src="[^"]*"><\/script>/g, ''), {
    url: 'http://127.0.0.1/',
    pretendToBeVisual: true, runScripts: 'outside-only'
  });
  const w = dom.window;
  global.window = w; global.document = w.document;
  global.navigator = w.navigator; global.location = w.location;
  global.HTMLElement = w.HTMLElement; global.Node = w.Node; global.getComputedStyle = w.getComputedStyle;
  w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() { }, removeListener() { } }));

  const warnings = [], errors = [];
  const noise = /Not implemented|Error: Uncaught \[/;
  w.console.warn = (...a) => { const s = a.join(' '); if (!noise.test(s)) warnings.push(s); };
  w.console.error = (...a) => { const s = a.join(' '); if (!noise.test(s)) errors.push(s); };
  console.warn = w.console.warn; console.error = w.console.error;
  w.scrollTo = () => { };
  w.addEventListener('error', (e) => { errors.push('window.onerror: ' + (e.message || e.error)); });

  // jsdom 的 localStorage 是只读访问器：必须直接写它，不能重新赋值
  w.localStorage.setItem('ghw.pat', JSON.stringify('ghp_faketoken_for_render_check_0123456789'));

  // 假 fetch：把 /api/xxx 交给 fixture
  w.fetch = async (url, init) => {
    const u = String(url).replace(/^https?:\/\/[^/]+/, '');
    const p = u.replace(/^\/api/, '').split('?')[0];
    const body = fixture(p, {});
    return {
      ok: true, status: body.status, headers: { get: (k) => (k === 'X-GHW-Cache' ? body.cache : null) },
      text: async () => JSON.stringify(body.data)
    };
  };

  // 加载脚本
  const load = (rel) => {
    const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    w.eval(code);
  };
  load('vendor/vue.global.prod.js');
  w.hljs = { getLanguage: () => false, highlightAuto: () => ({ value: '' }), highlight: () => ({ value: '' }) };
  w.marked = { setOptions: () => { }, parse: (s) => '<p>' + String(s) + '</p>' };

  const files = ['app/util.js', 'app/api.js', 'app/components.js',
    ...fs.readdirSync(path.join(ROOT, 'app/views')).sort().map(f => 'app/views/' + f), 'app/app.js'];
  for (const f of files) {
    try { load(f); } catch (e) { errors.push('LOAD ' + f + ': ' + e.message); }
  }

  // 走 app.js 自带的 boot 挂载（与线上完全一致）
  await new Promise(r => setTimeout(r, 300));
  // 让视图里的 await 走完
  for (let i = 0; i < 12; i++) await new Promise(r => setTimeout(r, 120));

  const EXPECT = {
    '#/': ['工作台', '语言构成'],
    '#/repos': ['我的仓库', 'lszyk26/gh-mcp'],
    '#/stars': ['星标仓库'],
    '#/notifications': ['通知', '有人提到了你'],
    '#/search?q=test&type=repositories': ['搜索 GitHub', 'vuejs/core'],
    '#/trends': ['发现', '全部语言', 'vuejs/core'],
    '#/trends?period=today&mode=active&lang=Go': ['发现', '搜索式', 'created:>=|pushed:>='.replace('|', '')],
    '#/settings': ['访问凭证', '接口额度', '缓存'],
    '#/users/lszyk26': ['正在关注', '获得星标'],
    '#/lszyk26/gh-mcp': ['README', '语言', '贡献者'],
    '#/lszyk26/gh-mcp/code/tree/main': ['package.json', 'README.md'],
    '#/lszyk26/gh-mcp/code/blob/main/README.md': ['README.md'],
    '#/lszyk26/gh-mcp/issues': ['议题', '示例议题 1'],
    '#/lszyk26/gh-mcp/issues/3': ['发表评论', '动态'],
    '#/lszyk26/gh-mcp/pulls': ['拉取请求', '示例议题 1'],
    '#/lszyk26/gh-mcp/pulls/12': ['对话', '文件变更', '合并信息'],
    '#/lszyk26/gh-mcp/commits': ['提交历史', 'feat:'],
    '#/lszyk26/gh-mcp/commit/abc1234def': ['父提交', 'src/a.js'],
    '#/lszyk26/gh-mcp/branches': ['分支与标签', 'main'],
    '#/lszyk26/gh-mcp/releases': ['v1.0.0', '更新内容'],
    '#/lszyk26/gh-mcp/releases/v1.0.0': ['附件', 'app.zip'],
    '#/lszyk26/gh-mcp/actions': ['流水线', 'CI'],
    '#/lszyk26/gh-mcp/actions/991': ['任务', 'build'],
    '#/lszyk26/gh-mcp/compare/main...dev': ['比较', '领先']
  };

  let pass = 0, fail = 0;
  for (const r of ROUTES) {
    const before = errors.length + warnings.length;
    try {
      w.location.hash = r;
      // 触发 hashchange 处理
      w.dispatchEvent(new w.Event('hashchange'));
    } catch (e) { errors.push('NAV ' + r + ': ' + e.message); }
    for (let i = 0; i < 10; i++) await new Promise(r2 => setTimeout(r2, 90));
    const htmlNow = w.document.getElementById('app').innerHTML;
    const newMsgs = errors.length + warnings.length - before;
    const unresolved = /<[a-z]+-[a-z-]+/.test(htmlNow) ? (htmlNow.match(/<([a-z]+-[a-z0-9-]+)/g) || []).filter(t => !/^-?(div|span|svg|button|input|a)-/.test(t)).slice(0, 3) : [];
    const empty = htmlNow.length < 40;
    const want = EXPECT[r] || [];
    const missing = want.filter(t => htmlNow.indexOf(t) < 0);
    if (newMsgs === 0 && !empty && unresolved.length === 0 && missing.length === 0) {
      pass++; console.log('  PASS  ' + r + '  (' + htmlNow.length + ' 字节, ' + want.length + ' 项断言)');
    } else {
      fail++;
      console.log('  FAIL  ' + r + (empty ? '  [渲染为空]' : '') +
        (unresolved.length ? '  [未解析组件: ' + unresolved.join(',') + ']' : '') +
        (missing.length ? '  [缺少内容: ' + missing.join(' / ') + ']' : '') +
        (newMsgs ? '  [' + newMsgs + ' 条控制台输出]' : ''));
    }
  }

  console.log('\n路由渲染: ' + pass + ' 通过 / ' + fail + ' 失败');
  if (errors.length) {
    console.log('\n--- 错误 (' + errors.length + ') ---');
    [...new Set(errors)].slice(0, 20).forEach(e => console.log('  ' + String(e).split('\n').slice(0, 3).join('\n     ')));
  }
  if (warnings.length) {
    console.log('\n--- 警告 (' + warnings.length + ') ---');
    [...new Set(warnings)].slice(0, 20).forEach(e => console.log('  ' + String(e).split('\n').slice(0, 3).join('\n     ')));
  }
  process.exit(fail || errors.length ? 1 : 0);
}
main().catch(e => { console.error('FATAL', e); process.exit(2); });
