#!/usr/bin/env node
/* ============================================================
   GH·WEB 自包含服务器
   ------------------------------------------------------------
   一个文件、零依赖、Node >= 18 即可运行。
   同时提供三件事：
     1. 静态站点（web/ 目录）
     2. /api/* → api.github.com 的反向代理 + 内存缓存
     3. 可选的访问口令（Cookie / Basic 任选其一）

   这样同一份代码可以跑在：
     · 手机   Termux + node
     · 电脑   Windows / macOS / Linux + node
     · 服务器 node / systemd / Docker / nginx 反代

   用法：
     node server.js
     PORT=8788 GHW_PASSWORD=自定义口令 node server.js
     node server.js --help
   ============================================================ */
'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

/* ---------- 0. 配置 ---------- */

// 读同目录下的 .env（可选，不覆盖已有环境变量）
(function loadDotEnv() {
  const file = path.join(__dirname, '.env');
  if (!fs.existsSync(file)) return;
  let text = '';
  try { text = fs.readFileSync(file, 'utf8'); } catch (e) { return; }
  text.split(/\r?\n/).forEach(function (line) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) return;
    if (process.env[m[1]] !== undefined) return;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  });
})();

const ROOT = path.resolve(process.env.GHW_ROOT || path.join(__dirname, 'web'));
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 8787);
const PASSWORD = process.env.GHW_PASSWORD || '';
const TLS_CERT = process.env.GHW_TLS_CERT || '';
const TLS_KEY = process.env.GHW_TLS_KEY || '';
const API_ORIGIN = process.env.GHW_API_ORIGIN || 'https://api.github.com';
const CACHE_TTL = Number(process.env.GHW_CACHE_TTL || 300);        // 秒
const CACHE_MAX_MB = Number(process.env.GHW_CACHE_MAX_MB || 128);  // 内存缓存上限
const UPSTREAM_TIMEOUT = Number(process.env.GHW_UPSTREAM_TIMEOUT || 20000);

const CACHE_MAX_BYTES = CACHE_MAX_MB * 1024 * 1024;
const VERSION = '1.1.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.wasm': 'application/wasm'
};

const COMPRESSIBLE = /^(text\/|application\/(javascript|json|xml)|image\/svg)/;

/* ---------- 1. 工具 ---------- */

function log() {
  const args = Array.prototype.slice.call(arguments);
  console.log.apply(console, [new Date().toISOString()].concat(args));
}

function send(res, status, body, headers) {
  const h = Object.assign({ 'Content-Type': 'text/plain; charset=utf-8' }, headers || {});
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  h['Content-Length'] = buf.length;
  res.writeHead(status, h);
  res.end(buf);
}

function json(res, status, obj, headers) {
  send(res, status, JSON.stringify(obj), Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  }, headers || {}));
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach(function (part) {
    const i = part.indexOf('=');
    if (i < 0) return;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

async function readBody(req, limit) {
  const max = limit || 1024 * 1024;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw new Error('request body too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/* ---------- 2. 访问口令 ---------- */

const SESSION_COOKIE = 'ghw_s';
const SESSION_VALUE = PASSWORD
  ? crypto.createHmac('sha256', PASSWORD).update('ghw-session-v1').digest('hex').slice(0, 32)
  : '';

function isAuthed(req) {
  if (!PASSWORD) return true;

  const cookie = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (cookie && safeEqual(cookie, SESSION_VALUE)) return true;

  const auth = req.headers.authorization;
  if (auth && /^Basic\s+/i.test(auth)) {
    const raw = Buffer.from(auth.replace(/^Basic\s+/i, ''), 'base64').toString('utf8');
    const idx = raw.indexOf(':');
    const pass = idx >= 0 ? raw.slice(idx + 1) : raw;
    if (safeEqual(pass, PASSWORD)) return true;
  }
  return false;
}

function wantsHtml(req) {
  const accept = req.headers.accept || '';
  return accept.indexOf('text/html') >= 0;
}

function loginPage(error) {
  return `<!doctype html>
<html lang="zh-CN"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>登录 · GH·WEB</title>
<style>
  :root{--paper:#fbfaf7;--ink:#171614;--line:#e0ddd4;--muted:#6c6862;--accent:#c2410c}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--paper);
       color:var(--ink);font:15px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
  .box{width:min(360px,88vw)}
  h1{font-size:18px;letter-spacing:.14em;margin:0 0 4px;font-weight:600}
  p.sub{margin:0 0 28px;color:var(--muted);font-size:13px}
  label{display:block;font-size:12px;letter-spacing:.08em;color:var(--muted);margin-bottom:6px;text-transform:uppercase}
  input{width:100%;padding:10px 12px;border:1px solid var(--line);background:#fff;color:var(--ink);
        font:14px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;outline:none;border-radius:2px}
  input:focus{border-color:var(--accent)}
  button{margin-top:16px;width:100%;padding:10px 12px;border:1px solid var(--ink);background:var(--ink);
         color:var(--paper);font-size:14px;letter-spacing:.06em;cursor:pointer;border-radius:2px}
  button:hover{background:var(--accent);border-color:var(--accent)}
  .err{margin-top:14px;padding:8px 10px;border-left:2px solid var(--accent);background:#fff4ef;
       color:var(--accent);font-size:13px}
  .tip{margin-top:26px;color:var(--muted);font-size:12px;line-height:1.7}
  code{font-family:ui-monospace,Menlo,monospace}
</style></head>
<body><form class="box" method="post" action="/login">
  <h1>GH·WEB</h1>
  <p class="sub">GitHub 的高速只读镜像</p>
  <label for="pw">访问口令</label>
  <input id="pw" name="password" type="password" autocomplete="current-password" autofocus placeholder="••••••••">
  <button type="submit">进入</button>
  ${error ? `<div class="err">${error}</div>` : ''}
  <p class="tip">口令由部署者设置（环境变量 <code>GHW_PASSWORD</code>）。<br>
  进入后再填入自己的 GitHub Token 即可使用。</p>
</form></body></html>`;
}

/* ---------- 3. 静态文件 ---------- */

const gzipCache = new Map();
const GZIP_CACHE_MAX = 64 * 1024 * 1024;
let gzipBytes = 0;

function gzipCached(key, buf) {
  const hit = gzipCache.get(key);
  if (hit) return hit;
  const packed = zlib.gzipSync(buf, { level: 6 });
  if (packed.length < buf.length && gzipBytes + packed.length < GZIP_CACHE_MAX) {
    gzipCache.set(key, packed);
    gzipBytes += packed.length;
    if (gzipCache.size > 256) {
      const first = gzipCache.keys().next().value;
      const old = gzipCache.get(first);
      gzipCache.delete(first);
      gzipBytes -= old.length;
    }
  }
  return packed;
}

function cacheControlFor(ext) {
  if (ext === '.html') return 'no-cache';
  if (/^\.(js|css|woff2?|ttf|svg|png|jpg|jpeg|gif|webp|ico)$/.test(ext)) {
    return 'public, max-age=604800, immutable';
  }
  return 'public, max-age=3600';
}

async function serveStatic(req, res, pathname) {
  let rel;
  try { rel = decodeURIComponent(pathname); } catch (e) { return send(res, 400, 'Bad Request'); }

  if (rel === '/' || rel === '') rel = '/index.html';

  // 防目录穿越：解析后必须仍在 ROOT 内
  const full = path.resolve(ROOT, '.' + rel);
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) {
    return send(res, 403, 'Forbidden');
  }

  let stat = null;
  try { stat = await fsp.stat(full); } catch (e) { stat = null; }

  // 目录 → 目录下 index.html
  if (stat && stat.isDirectory()) {
    try {
      const idx = path.join(full, 'index.html');
      const s2 = await fsp.stat(idx);
      if (s2.isFile()) return sendFile(req, res, idx, s2);
    } catch (e) { /* fallthrough */ }
    return send(res, 404, 'Not Found');
  }

  // 无扩展名 → SPA 路由，回 index.html
  if (!stat) {
    if (path.extname(rel) === '') {
      const idx = path.join(ROOT, 'index.html');
      try {
        const s2 = await fsp.stat(idx);
        return sendFile(req, res, idx, s2);
      } catch (e) { return send(res, 404, 'Not Found'); }
    }
    return send(res, 404, 'Not Found');
  }

  if (!stat.isFile()) return send(res, 404, 'Not Found');
  return sendFile(req, res, full, stat);
}

async function sendFile(req, res, file, stat) {
  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const etag = 'W/"' + stat.size.toString(16) + '-' + Math.floor(stat.mtimeMs).toString(16) + '"';

  const headers = {
    'Content-Type': type,
    'Cache-Control': cacheControlFor(ext),
    'ETag': etag,
    'Last-Modified': stat.mtime.toUTCString(),
    'X-Content-Type-Options': 'nosniff'
  };

  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers);
    return res.end();
  }

  let body;
  try { body = await fsp.readFile(file); } catch (e) { return send(res, 404, 'Not Found'); }

  const accept = req.headers['accept-encoding'] || '';
  if (COMPRESSIBLE.test(type) && body.length > 1024 && /\bgzip\b/.test(accept)) {
    body = gzipCached(file + ':' + etag, body);
    headers['Content-Encoding'] = 'gzip';
    headers['Vary'] = 'Accept-Encoding';
  }

  headers['Content-Length'] = body.length;
  res.writeHead(200, headers);
  if (req.method === 'HEAD') return res.end();
  res.end(body);
}

/* ---------- 4. GitHub API 代理 + 缓存 ---------- */

const apiCache = new Map();   // key -> { status, headers, body, exp }
let apiCacheBytes = 0;
const inflight = new Map();   // key -> Promise

const PASS_HEADERS = new Set([
  'content-type', 'content-language', 'content-disposition', 'link', 'location',
  'etag', 'last-modified', 'x-ratelimit-limit', 'x-ratelimit-remaining',
  'x-ratelimit-reset', 'x-ratelimit-used', 'x-ratelimit-resource',
  'x-github-request-id', 'x-oauth-scopes', 'x-accepted-oauth-scopes'
]);

function cacheGet(key) {
  const hit = apiCache.get(key);
  if (!hit) return null;
  if (hit.exp < Date.now()) {
    apiCache.delete(key);
    apiCacheBytes -= hit.body.length;
    return null;
  }
  // LRU：命中后挪到队尾
  apiCache.delete(key);
  apiCache.set(key, hit);
  return hit;
}

function cacheSet(key, entry) {
  if (entry.body.length > CACHE_MAX_BYTES / 8) return; // 单个超大响应不缓存
  const old = apiCache.get(key);
  if (old) {
    apiCacheBytes -= old.body.length;
    apiCache.delete(key);
  }
  while (apiCacheBytes + entry.body.length > CACHE_MAX_BYTES && apiCache.size) {
    const first = apiCache.keys().next().value;
    const evicted = apiCache.get(first);
    apiCache.delete(first);
    apiCacheBytes -= evicted.body.length;
  }
  apiCache.set(key, entry);
  apiCacheBytes += entry.body.length;
}

function ttlFor(status) {
  if (status === 200) return CACHE_TTL * 1000;
  if (status === 404) return 60 * 1000;
  if (status === 301 || status === 302) return 60 * 1000;
  return 30 * 1000;
}

async function callUpstream(method, target, headers, body) {
  const init = {
    method: method,
    headers: headers,
    redirect: 'manual',
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT)
  };
  if (body && body.length) {
    init.body = body;
    init.duplex = 'half';
  }
  const upstream = await fetch(target, init);

  const outHeaders = {};
  upstream.headers.forEach(function (value, name) {
    if (PASS_HEADERS.has(name.toLowerCase())) outHeaders[name] = value;
  });
  const buf = Buffer.from(await upstream.arrayBuffer());
  return { status: upstream.status, headers: outHeaders, body: buf };
}

async function proxyApi(req, res, rawUrl) {
  const parsed = new URL(rawUrl, 'http://localhost');
  const upstreamPath = parsed.pathname.replace(/^\/api/, '') + parsed.search;
  const target = API_ORIGIN.replace(/\/$/, '') + upstreamPath;

  const bucket = String(req.headers['x-gh-cache-bucket'] || 'anon').slice(0, 32);
  const bypass = parsed.searchParams.get('nocache') === '1';
  const method = req.method.toUpperCase();
  const cacheable = method === 'GET' || method === 'HEAD';
  const key = bucket + '|' + method + '|' + upstreamPath;

  if (cacheable && !bypass) {
    const hit = cacheGet(key);
    if (hit) {
      const headers = Object.assign({}, hit.headers, {
        'X-GHW-Cache': 'HIT',
        'Cache-Control': 'no-store'
      });
      res.writeHead(hit.status, headers);
      return res.end(method === 'HEAD' ? undefined : hit.body);
    }
  }

  // 同一份数据并发只回源一次
  if (cacheable && !bypass && inflight.has(key)) {
    try {
      const shared = await inflight.get(key);
      const headers = Object.assign({}, shared.headers, {
        'X-GHW-Cache': 'HIT',
        'Cache-Control': 'no-store'
      });
      res.writeHead(shared.status, headers);
      return res.end(method === 'HEAD' ? undefined : shared.body);
    } catch (e) { /* 落到下面自己再请求一次 */ }
  }

  let body = null;
  if (method !== 'GET' && method !== 'HEAD') {
    try { body = await readBody(req, 8 * 1024 * 1024); } catch (e) {
      return json(res, 413, { message: '请求体过大' });
    }
  }

  const headers = {
    'accept': req.headers.accept || 'application/vnd.github+json',
    'user-agent': 'gh-web/' + VERSION,
    'x-github-api-version': '2022-11-28'
  };
  const pat = req.headers['x-gh-token'];
  if (pat) headers.authorization = 'Bearer ' + pat;
  if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];

  const task = callUpstream(method, target, headers, body);
  if (cacheable && !bypass) inflight.set(key, task);

  let result;
  try {
    result = await task;
  } catch (e) {
    const msg = e && e.name === 'TimeoutError' ? '上游超时' : (e && e.message) || '上游请求失败';
    return json(res, 502, { message: msg }, { 'X-GHW-Cache': 'MISS' });
  } finally {
    inflight.delete(key);
  }

  if (cacheable && !bypass) {
    cacheSet(key, {
      status: result.status,
      headers: result.headers,
      body: result.body,
      exp: Date.now() + ttlFor(result.status)
    });
  }

  const outHeaders = Object.assign({}, result.headers, {
    'X-GHW-Cache': bypass ? 'BYPASS' : (cacheable ? 'MISS' : 'BYPASS'),
    'Cache-Control': 'no-store'
  });
  res.writeHead(result.status, outHeaders);
  res.end(method === 'HEAD' ? undefined : result.body);
}

/* ---------- 5. 路由 ---------- */

async function handle(req, res) {
  const rawUrl = req.url || '/';
  const parsed = new URL(rawUrl, 'http://localhost');
  const pathname = parsed.pathname;

  // 登录 / 登出不需要鉴权
  if (pathname === '/login') {
    if (!PASSWORD) {
      res.writeHead(302, { Location: '/' });
      return res.end();
    }
    if (req.method === 'POST') {
      let form;
      try { form = new URLSearchParams((await readBody(req, 8192)).toString('utf8')); } catch (e) {
        return send(res, 400, loginPage('请求格式不对'), { 'Content-Type': 'text/html; charset=utf-8' });
      }
      const pass = form.get('password') || '';
      if (safeEqual(pass, PASSWORD)) {
        const secure = (req.headers['x-forwarded-proto'] === 'https') || !!TLS_CERT;
        const cookie = SESSION_COOKIE + '=' + SESSION_VALUE +
          '; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000' + (secure ? '; Secure' : '');
        res.writeHead(302, { 'Set-Cookie': cookie, Location: '/' });
        return res.end();
      }
      return send(res, 401, loginPage('口令不对'), { 'Content-Type': 'text/html; charset=utf-8' });
    }
    return send(res, 200, loginPage(''), { 'Content-Type': 'text/html; charset=utf-8' });
  }

  if (pathname === '/logout') {
    res.writeHead(302, {
      'Set-Cookie': SESSION_COOKIE + '=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
      Location: '/login'
    });
    return res.end();
  }

  // 鉴权
  if (!isAuthed(req)) {
    if (pathname.startsWith('/api/')) {
      return json(res, 401, { message: '需要先登录' });
    }
    if (wantsHtml(req) && req.method === 'GET') {
      res.writeHead(302, { Location: '/login' });
      return res.end();
    }
    return send(res, 401, '需要先登录', {
      'WWW-Authenticate': 'Basic realm="gh-web", charset="UTF-8"'
    });
  }

  if (pathname === '/healthz') {
    return json(res, 200, {
      ok: true,
      version: VERSION,
      auth: !!PASSWORD,
      cache: { entries: apiCache.size, bytes: apiCacheBytes }
    });
  }

  if (pathname.startsWith('/api/') || pathname === '/api') {
    return proxyApi(req, res, rawUrl);
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
  }

  return serveStatic(req, res, pathname);
}

/* ---------- 6. 启动 ---------- */

function help() {
  console.log(`
GH·WEB ${VERSION}

用法
  node server.js                 启动（默认 0.0.0.0:8787）
  node server.js --help          显示本帮助

环境变量
  PORT                 监听端口，默认 8787
  HOST                 监听地址，默认 0.0.0.0
  GHW_PASSWORD         访问口令；留空则不设防（仅建议在局域网/本机使用）
  GHW_ROOT             站点根目录，默认 ./web
  GHW_TLS_CERT         HTTPS 证书路径（与 GHW_TLS_KEY 同时设置才生效）
  GHW_TLS_KEY          HTTPS 私钥路径
  GHW_API_ORIGIN       上游地址，默认 https://api.github.com
  GHW_CACHE_TTL        API 缓存秒数，默认 300
  GHW_CACHE_MAX_MB     API 缓存内存上限，默认 128
  GHW_UPSTREAM_TIMEOUT 上游超时毫秒，默认 20000

示例
  GHW_PASSWORD='<你的口令>' node server.js
  PORT=80 node server.js
`);
}

function main() {
  if (process.argv.indexOf('--help') >= 0 || process.argv.indexOf('-h') >= 0) {
    help();
    return;
  }

  if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
    console.error('找不到站点入口：' + path.join(ROOT, 'index.html'));
    console.error('请确认 GHW_ROOT 指向正确的 web 目录，或在项目根目录运行。');
    process.exit(1);
  }

  let server;
  if (TLS_CERT && TLS_KEY) {
    server = https.createServer({
      cert: fs.readFileSync(TLS_CERT),
      key: fs.readFileSync(TLS_KEY)
    }, function (req, res) { handle(req, res).catch(onError(res)); });
  } else {
    server = http.createServer(function (req, res) {
      handle(req, res).catch(onError(res));
    });
  }

  server.on('error', function (err) {
    if (err.code === 'EADDRINUSE') {
      console.error('端口 ' + PORT + ' 已被占用，换一个：PORT=' + (PORT + 1) + ' node server.js');
    } else {
      console.error('服务器错误：', err);
    }
    process.exit(1);
  });

  server.listen(PORT, HOST, function () {
    const scheme = TLS_CERT && TLS_KEY ? 'https' : 'http';
    const shownHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
    log('GH·WEB ' + VERSION + ' 已启动');
    log('  本机   ' + scheme + '://' + shownHost + ':' + PORT + '/');
    log('  站点   ' + ROOT);
    log('  认证   ' + (PASSWORD ? '已开启（Cookie / Basic）' : '未设置（GHW_PASSWORD 可开启）'));
    log('  缓存   ' + CACHE_TTL + 's / ' + CACHE_MAX_MB + 'MB');
  });

  const shutdown = function (sig) {
    log('收到 ' + sig + '，正在退出');
    server.close(function () { process.exit(0); });
    setTimeout(function () { process.exit(0); }, 3000).unref();
  };
  process.on('SIGINT', function () { shutdown('SIGINT'); });
  process.on('SIGTERM', function () { shutdown('SIGTERM'); });
}

function onError(res) {
  return function (err) {
    log('请求处理失败：', err && err.stack || err);
    if (!res.headersSent) {
      try { json(res, 500, { message: '服务器内部错误' }); } catch (e) { /* ignore */ }
    } else {
      try { res.end(); } catch (e) { /* ignore */ }
    }
  };
}

main();
