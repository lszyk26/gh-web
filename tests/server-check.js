/* ============================================================
   server-check.js — 自包含服务器的端到端回归
   ------------------------------------------------------------
   不碰真实 GitHub：起一个假上游，把 GHW_API_ORIGIN 指过去，
   然后验证静态文件、SPA 兜底、目录穿越、口令流程、
   API 转发与缓存命中。

   跑： node tests/server-check.js
   ============================================================ */
'use strict';

const http = require('http');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const SERVER = path.join(__dirname, '..', 'server.js');
const PASSWORD = 'server-check-example-pass';

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra !== undefined ? '  -> ' + extra : '')); }
}

function freePort() {
  return new Promise(function (resolve, reject) {
    const s = net.createServer();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', function () {
      const p = s.address().port;
      s.close(function () { resolve(p); });
    });
  });
}

function startNode(env) {
  const child = spawn(process.execPath, [SERVER], {
    env: Object.assign({}, process.env, env),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let out = '';
  return new Promise(function (resolve, reject) {
    const timer = setTimeout(function () {
      reject(new Error('启动超时\n' + out));
    }, 8000);
    function onData(d) {
      out += d.toString();
      if (out.indexOf('已启动') >= 0) {
        clearTimeout(timer);
        resolve(child);
      }
    }
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', function (code) {
      clearTimeout(timer);
      reject(new Error('服务器退出 code=' + code + '\n' + out));
    });
  });
}

function stop(child) {
  return new Promise(function (resolve) {
    if (!child || child.killed) return resolve();
    child.once('exit', function () { resolve(); });
    child.kill('SIGTERM');
    setTimeout(function () { try { child.kill('SIGKILL'); } catch (e) { /* ignore */ } }, 2000).unref();
  });
}

async function main() {
  // ---------- 假上游 ----------
  let upstreamHits = 0;
  const upstream = http.createServer(function (req, res) {
    upstreamHits++;
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'X-RateLimit-Limit': '5000',
      'X-RateLimit-Remaining': '4999',
      'X-RateLimit-Reset': '1800000000',
      'Cache-Control': 'private, max-age=60'
    });
    res.end(JSON.stringify({ ok: true, path: req.url, auth: req.headers.authorization || null }));
  });
  const upstreamPort = await freePort();
  await new Promise(function (r) { upstream.listen(upstreamPort, '127.0.0.1', r); });

  const port = await freePort();
  const child = await startNode({
    PORT: String(port),
    HOST: '127.0.0.1',
    GHW_PASSWORD: 'server-check-example-pass',
    GHW_API_ORIGIN: 'http://127.0.0.1:' + upstreamPort,
    GHW_CACHE_TTL: '60'
  });

  const base = 'http://127.0.0.1:' + port;

  try {
    // ---------- 1) 未登录 ----------
    let r = await fetch(base + '/', { headers: { Accept: 'text/html' }, redirect: 'manual' });
    ok('未登录访问首页 -> 302 /login',
      r.status === 302 && (r.headers.get('location') || '').endsWith('/login'), r.status + ' ' + r.headers.get('location'));

    r = await fetch(base + '/api/user', { redirect: 'manual' });
    ok('未登录访问 API -> 401 JSON',
      r.status === 401 && (r.headers.get('content-type') || '').includes('application/json'), r.status);

    r = await fetch(base + '/healthz');
    const healthAnon = await r.json();
    ok('健康检查免鉴权（供 Docker / 监控探活）',
      r.status === 200 && healthAnon.ok === true, r.status + ' ' + JSON.stringify(healthAnon));

    r = await fetch(base + '/login');
    const loginHtml = await r.text();
    ok('登录页可访问', r.status === 200 && loginHtml.indexOf('GH·WEB') >= 0, r.status);

    r = await fetch(base + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'password=wrong-example',
      redirect: 'manual'
    });
    ok('错误口令 -> 401', r.status === 401, r.status);

    r = await fetch(base + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'password=' + encodeURIComponent(PASSWORD),
      redirect: 'manual'
    });
    const setCookie = r.headers.get('set-cookie') || '';
    const cookie = setCookie.split(';')[0];
    ok('正确口令 -> 302 + HttpOnly Cookie',
      r.status === 302 && /ghw_s=/.test(setCookie) && /HttpOnly/i.test(setCookie), setCookie);

    const authHeaders = { Cookie: cookie };

    // ---------- 2) 静态文件 ----------
    r = await fetch(base + '/', { headers: Object.assign({ Accept: 'text/html' }, authHeaders) });
    const indexHtml = await r.text();
    ok('首页 200 且返回 index.html',
      r.status === 200 && indexHtml.indexOf('GH·WEB') >= 0, r.status);

    r = await fetch(base + '/app/api.js', { headers: authHeaders });
    ok('前端脚本 200 + 长缓存',
      r.status === 200 && (r.headers.get('cache-control') || '').includes('immutable'),
      r.status + ' ' + r.headers.get('cache-control'));

    r = await fetch(base + '/styles/main.css', {
      headers: Object.assign({ 'Accept-Encoding': 'gzip' }, authHeaders)
    });
    ok('CSS 支持 gzip', r.status === 200 && r.headers.get('content-encoding') === 'gzip',
      r.headers.get('content-encoding'));

    r = await fetch(base + '/nope.js', { headers: authHeaders });
    ok('缺失的静态文件 -> 404', r.status === 404, r.status);

    r = await fetch(base + '/some/deep/route', {
      headers: Object.assign({ Accept: 'text/html' }, authHeaders)
    });
    ok('无扩展名路径回落 SPA', r.status === 200 && (r.headers.get('content-type') || '').includes('text/html'), r.status);

    r = await fetch(base + '/%2e%2e/package.json', { headers: authHeaders, redirect: 'manual' });
    ok('目录穿越被拒绝', r.status === 403 || r.status === 404, r.status);

    // ---------- 3) API 转发与缓存 ----------
    const before = upstreamHits;
    r = await fetch(base + '/api/user', { headers: Object.assign({ 'X-GH-Token': 'ghp_fake_token_for_test' }, authHeaders) });
    const body1 = await r.json();
    ok('API 转发到上游', r.status === 200 && body1.ok === true, JSON.stringify(body1));
    ok('X-GH-Token 被翻译成 Bearer',
      body1.auth === 'Bearer ghp_fake_token_for_test', body1.auth);
    ok('首次请求 MISS', r.headers.get('x-ghw-cache') === 'MISS', r.headers.get('x-ghw-cache'));
    ok('上游配额头透传', r.headers.get('x-ratelimit-remaining') === '4999', r.headers.get('x-ratelimit-remaining'));

    r = await fetch(base + '/api/user', { headers: Object.assign({ 'X-GH-Token': 'ghp_fake_token_for_test' }, authHeaders) });
    await r.json();
    ok('第二次请求 HIT', r.headers.get('x-ghw-cache') === 'HIT', r.headers.get('x-ghw-cache'));
    ok('命中缓存时不再回源', upstreamHits === before + 1, upstreamHits + ' vs ' + (before + 1));

    r = await fetch(base + '/api/user?nocache=1', { headers: Object.assign({ 'X-GH-Token': 'ghp_fake_token_for_test' }, authHeaders) });
    await r.json();
    ok('nocache=1 绕过缓存', r.headers.get('x-ghw-cache') === 'BYPASS', r.headers.get('x-ghw-cache'));
    ok('绕过时确实回源', upstreamHits === before + 2, upstreamHits + ' vs ' + (before + 2));

    r = await fetch(base + '/api/user', { headers: authHeaders });
    const anonBody = await r.json();
    ok('不同凭证分桶（匿名不复用带 token 的缓存）',
      r.headers.get('x-ghw-cache') === 'MISS' && anonBody.auth === null,
      r.headers.get('x-ghw-cache') + ' ' + anonBody.auth);

    // ---------- 4) 其他 ----------
    r = await fetch(base + '/healthz', { headers: authHeaders });
    const health = await r.json();
    ok('/healthz 返回运行状态',
      r.status === 200 && health.ok === true && health.auth === true && health.cache.entries > 0,
      JSON.stringify(health));

    r = await fetch(base + '/logout', { redirect: 'manual' });
    ok('/logout 清 Cookie', r.status === 302 && /Max-Age=0/i.test(r.headers.get('set-cookie') || ''),
      r.headers.get('set-cookie'));
  } finally {
    await stop(child);
    await new Promise(function (r) { upstream.close(r); });
  }

  console.log('\n服务器回归: ' + pass + ' 通过 / ' + fail + ' 失败');
  process.exit(fail ? 1 : 0);
}

main().catch(function (err) {
  console.error(err && err.stack || err);
  process.exit(1);
});
