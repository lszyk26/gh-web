/* ============================================================
   api.js — token custody + cached transport + github endpoints
   The token never leaves this browser and goes only to api.github.com
   (via the local nginx cache layer, which stores nothing sticky).
   ============================================================ */
(function () {
  'use strict';

  const KEY = 'pat';
  const BASE = '/api';

  const API = {
    token: null,
    cacheHits: 0,
    cacheMisses: 0,
    onRate: null,
    rate: null
  };

  /* ---------- token ---------- */
  API.loadToken = function () {
    API.token = U.store.get(KEY, null);
    return API.token;
  };
  API.setToken = function (t) {
    API.token = t ? String(t).trim() : null;
    if (API.token) U.store.set(KEY, API.token);
    else U.store.del(KEY);
  };
  API.hasToken = function () { return !!API.token; };

  /* ---------- transport ---------- */
  function buildPath(path, params) {
    let p = path;
    if (params) {
      const q = Object.keys(params)
        .filter(function (k) { return params[k] !== undefined && params[k] !== null && params[k] !== ''; })
        .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
        .join('&');
      if (q) p += (p.indexOf('?') >= 0 ? '&' : '?') + q;
    }
    return p;
  }

  API.raw = async function (path, opts) {
    opts = opts || {};
    const url = BASE + path;
    const headers = { 'Accept': opts.accept || 'application/vnd.github+json' };
    // 注意：不能用 Authorization 头传 PAT —— 那会和 nginx 的 basic auth 抢同一个头，
    // 结果 basic auth 直接把请求拒掉。所以走自定义头，由 nginx 翻成 Bearer 转发给 GitHub。
    if (API.token) headers['X-GH-Token'] = API.token;
    if (opts.headers) Object.keys(opts.headers).forEach(function (k) { headers[k] = opts.headers[k]; });

    const init = { method: opts.method || 'GET', headers: headers };
    if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }

    const res = await fetch(url, init);

    const cache = res.headers.get('X-GHW-Cache');
    if (cache === 'HIT' || cache === 'STALE' || cache === 'UPDATING' || cache === 'REVALIDATED') API.cacheHits++;
    else if (cache === 'MISS' || cache === 'EXPIRED' || cache === 'BYPASS') API.cacheMisses++;

    const lim = res.headers.get('X-RateLimit-Limit');
    if (lim) {
      API.rate = {
        limit: Number(lim),
        remaining: Number(res.headers.get('X-RateLimit-Remaining') || 0),
        reset: Number(res.headers.get('X-RateLimit-Reset') || 0) * 1000,
        resource: res.headers.get('X-RateLimit-Resource') || ''
      };
      if (API.onRate) API.onRate(API.rate);
    }

    const text = await res.text();
    let data = null;
    if (text) { try { data = JSON.parse(text); } catch (e) { data = text; } }

    if (!res.ok) {
      const err = new Error((data && data.message) || ('HTTP ' + res.status));
      err.status = res.status;
      err.data = data;
      err.rate = API.rate;
      throw err;
    }
    return { data: data, status: res.status, cache: cache, headers: res.headers };
  };

  /* GET with well-behaved caching of *our* own layer too */
  const mem = new Map();
  API.get = async function (path, params, opts) {
    opts = opts || {};
    const full = buildPath(path, params);
    if (!opts.force && mem.has(full) && !opts.noMem) {
      const hit = mem.get(full);
      if (Date.now() - hit.t < (opts.ttl || 45000)) return hit.v;
    }
    const r = await API.raw(full, opts);
    r._path = full;
    if (!opts.noMem) mem.set(full, { t: Date.now(), v: r });
    return r;
  };
  API.getData = async function (path, params, opts) {
    const r = await API.get(path, params, opts);
    return r.data;
  };
  API.req = async function (method, path, body, opts) {
    opts = opts || {};
    const r = await API.raw(path, { method: method, body: body, accept: opts.accept });
    mem.clear();
    return r;
  };
  API.forget = function (prefix) {
    if (!prefix) { mem.clear(); return; }
    Array.from(mem.keys()).forEach(function (k) { if (k.indexOf(prefix) === 0) mem.delete(k); });
  };

  /* handle link header → returns {last, next, prev, first} page numbers */
  API.links = function (res) {
    const out = {};
    const h = res && res.headers && res.headers.get && res.headers.get('Link');
    if (!h) return out;
    h.split(',').forEach(function (seg) {
      const m = seg.match(/<([^>]+)>;\s*rel="(\w+)"/);
      if (m) {
        const pm = m[1].match(/[?&]page=(\d+)/);
        if (pm) out[m[2]] = Number(pm[1]);
      }
    });
    return out;
  };

  /* ---------- endpoints ---------- */
  API.me = function () { return API.getData('/user'); };
  API.rateLimit = function () { return API.getData('/rate_limit'); };
  API.myRepos = function (page, extra) {
    return API.get('/user/repos', Object.assign({
      per_page: 30, sort: 'pushed', direction: 'desc', page: page || 1
    }, extra || {}));
  };
  API.starred = function (page) {
    return API.get('/user/starred', { per_page: 30, page: page || 1, sort: 'created' });
  };
  API.following = function () { return API.getData('/user/following', { per_page: 100 }); };
  API.notifications = function (page, opts) {
    return API.get('/notifications', Object.assign({ per_page: 30, page: page || 1 }, opts || {}), { noMem: true });
  };
  API.repo = function (o, r) { return API.getData('/repos/' + o + '/' + r); };
  API.readme = function (o, r, ref) {
    return API.getData('/repos/' + o + '/' + r + '/readme', ref ? { ref: ref } : null);
  };
  API.tree = function (o, r, sha, rec) {
    return API.getData('/repos/' + o + '/' + r + '/git/trees/' + sha, rec ? { recursive: 1 } : null);
  };
  API.branches = function (o, r, page) {
    return API.get('/repos/' + o + '/' + r + '/branches', { per_page: 100, page: page || 1 });
  };
  API.branch = function (o, r, b) { return API.getData('/repos/' + o + '/' + r + '/branches/' + encodeURIComponent(b)); };
  API.commits = function (o, r, params) {
    return API.get('/repos/' + o + '/' + r + '/commits', Object.assign({ per_page: 30 }, params || {}));
  };
  API.commit = function (o, r, sha) { return API.getData('/repos/' + o + '/' + r + '/commits/' + sha); };
  API.commitComments = function (o, r, sha) {
    return API.getData('/repos/' + o + '/' + r + '/commits/' + sha + '/comments', { per_page: 100 });
  };
  API.issues = function (o, r, params) {
    return API.get('/repos/' + o + '/' + r + '/issues', Object.assign({ per_page: 30, state: 'open' }, params || {}), { noMem: true });
  };
  API.issue = function (o, r, n) { return API.getData('/repos/' + o + '/' + r + '/issues/' + n, null, { noMem: true }); };
  API.issueComments = function (o, r, n) {
    return API.getData('/repos/' + o + '/' + r + '/issues/' + n + '/comments', { per_page: 100 }, { noMem: true });
  };
  API.issueEvents = function (o, r, n) {
    return API.getData('/repos/' + o + '/' + r + '/issues/' + n + '/events', { per_page: 100 });
  };
  API.timeline = function (o, r, n) {
    return API.getData('/repos/' + o + '/' + r + '/issues/' + n + '/timeline', { per_page: 100 });
  };
  API.pulls = function (o, r, params) {
    return API.get('/repos/' + o + '/' + r + '/pulls', Object.assign({ per_page: 30, state: 'open' }, params || {}), { noMem: true });
  };
  API.pull = function (o, r, n) { return API.getData('/repos/' + o + '/' + r + '/pulls/' + n, null, { noMem: true }); };
  API.pullFiles = function (o, r, n) {
    return API.get('/repos/' + o + '/' + r + '/pulls/' + n + '/files', { per_page: 100 });
  };
  API.pullCommits = function (o, r, n) {
    return API.get('/repos/' + o + '/' + r + '/pulls/' + n + '/commits', { per_page: 100 });
  };
  API.pullReviews = function (o, r, n) {
    return API.getData('/repos/' + o + '/' + r + '/pulls/' + n + '/reviews', { per_page: 100 });
  };
  API.pullReviewComments = function (o, r, n) {
    return API.getData('/repos/' + o + '/' + r + '/pulls/' + n + '/comments', { per_page: 100 });
  };
  API.pullMergeable = function (o, r, n) {
    return API.getData('/repos/' + o + '/' + r + '/pulls/' + n, null, { noMem: true, force: true });
  };
  API.releases = function (o, r, page) {
    return API.get('/repos/' + o + '/' + r + '/releases', { per_page: 20, page: page || 1 });
  };
  API.release = function (o, r, tag) {
    return API.getData('/repos/' + o + '/' + r + '/releases/tags/' + encodeURIComponent(tag));
  };
  API.releaseAssets = function (o, r, id) {
    return API.getData('/repos/' + o + '/' + r + '/releases/' + id + '/assets', { per_page: 100 });
  };
  API.tags = function (o, r, page) {
    return API.get('/repos/' + o + '/' + r + '/tags', { per_page: 100, page: page || 1 });
  };
  API.contributors = function (o, r) {
    return API.getData('/repos/' + o + '/' + r + '/contributors', { per_page: 100 });
  };
  API.languages = function (o, r) { return API.getData('/repos/' + o + '/' + r + '/languages'); };
  API.repoContent = function (o, r, path, ref) {
    return API.getData('/repos/' + o + '/' + r + '/contents/' + (path || ''), ref ? { ref: ref } : null);
  };
  API.blob = function (o, r, sha) { return API.getData('/repos/' + o + '/' + r + '/git/blobs/' + sha); };
  API.compare = function (o, r, base, head) {
    return API.getData('/repos/' + o + '/' + r + '/compare/' + base + '...' + head);
  };
  API.checkRuns = function (o, r, ref) {
    return API.getData('/repos/' + o + '/' + r + '/commits/' + ref + '/check-runs', { per_page: 100 });
  };
  API.checkStatus = function (o, r, ref) {
    return API.getData('/repos/' + o + '/' + r + '/commits/' + ref + '/status');
  };
  API.combinedStatus = API.checkStatus;
  API.actionsRuns = function (o, r, params) {
    return API.get('/repos/' + o + '/' + r + '/actions/runs', Object.assign({ per_page: 20 }, params || {}));
  };
  API.actionsRun = function (o, r, id) {
    return API.getData('/repos/' + o + '/' + r + '/actions/runs/' + id);
  };
  API.actionsJobs = function (o, r, id) {
    return API.getData('/repos/' + o + '/' + r + '/actions/runs/' + id + '/jobs', { per_page: 100 });
  };
  API.workflows = function (o, r) {
    return API.getData('/repos/' + o + '/' + r + '/actions/workflows', { per_page: 100 });
  };
  API.searchRepos = function (q, page, sort) {
    return API.get('/search/repositories', { q: q, per_page: 30, page: page || 1, sort: sort || undefined }, { noMem: true });
  };
  API.searchCode = function (q, page) {
    return API.get('/search/code', { q: q, per_page: 30, page: page || 1 }, { noMem: true });
  };
  API.searchIssues = function (q, page, sort) {
    return API.get('/search/issues', { q: q, per_page: 30, page: page || 1, sort: sort || undefined }, { noMem: true });
  };
  API.searchUsers = function (q, page) {
    return API.get('/search/users', { q: q, per_page: 30, page: page || 1 }, { noMem: true });
  };
  API.searchCommits = function (q, page) {
    return API.get('/search/commits', { q: q, per_page: 30, page: page || 1 }, { accept: 'application/vnd.github.cloak-preview+json', noMem: true });
  };
  API.user = function (login) { return API.getData('/users/' + login); };
  API.userRepos = function (login, page) {
    return API.get('/users/' + login + '/repos', { per_page: 30, page: page || 1, sort: 'pushed' });
  };
  API.gists = function (page) { return API.get('/gists', { per_page: 30, page: page || 1 }); };
  API.star = function (o, r) { return API.req('PUT', '/user/starred/' + o + '/' + r); };
  API.unstar = function (o, r) { return API.req('DELETE', '/user/starred/' + o + '/' + r); };
  API.isStarred = function (o, r) { return API.raw('/user/starred/' + o + '/' + r, { method: 'GET' }); };
  API.markRead = function (id) {
    return API.req('PATCH', '/notifications/threads/' + id);
  };
  API.markAllRead = function (body) {
    return API.req('PUT', '/notifications', body || {});
  };

  window.API = API;
})();
