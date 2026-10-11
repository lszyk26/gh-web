/* ============================================================
   util.js — formatting, markdown, storage, toast
   ============================================================ */
(function () {
  'use strict';

  /* 视图注册表：必须最先建立，各 views/*.js 会往这里挂组件 */
  window.VIEWS = window.VIEWS || {};

  const U = {};

  /* ---------- html ---------- */
  U.esc = function (s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ---------- numbers ---------- */
  U.compact = function (n) {
    n = Number(n) || 0;
    if (n < 1000) return String(n);
    if (n < 1000000) return (n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, '') + 'k';
    return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
  };
  U.num = function (n) { return (Number(n) || 0).toLocaleString('en-US'); };
  U.bytes = function (b) {
    b = Number(b) || 0;
    const u = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
    return (i === 0 ? b : b.toFixed(i === 1 ? 0 : 1)) + ' ' + u[i];
  };

  /* ---------- time ---------- */
  const MIN = 60000, HR = 3600000, DAY = 86400000, MON = 2592000000, YR = 31536000000;
  U.rel = function (iso) {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (isNaN(t)) return '';
    const d = Date.now() - t;
    const fut = d < 0, a = Math.abs(d);
    let s;
    if (a < MIN) s = 'just now';
    else if (a < HR) s = Math.round(a / MIN) + 'm';
    else if (a < DAY) s = Math.round(a / HR) + 'h';
    else if (a < 30 * DAY) s = Math.round(a / DAY) + 'd';
    else if (a < YR) s = Math.round(a / MON) + 'mo';
    else s = (a / YR).toFixed(1).replace(/\.0$/, '') + 'y';
    return fut ? 'in ' + s : s;
  };
  U.relZh = function (iso) {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (isNaN(t)) return '';
    const d = Date.now() - t, fut = d < 0, a = Math.abs(d);
    let s;
    if (a < MIN) s = '刚刚';
    else if (a < HR) s = Math.round(a / MIN) + ' 分钟' + (fut ? '后' : '前');
    else if (a < DAY) s = Math.round(a / HR) + ' 小时' + (fut ? '后' : '前');
    else if (a < 30 * DAY) s = Math.round(a / DAY) + ' 天' + (fut ? '后' : '前');
    else if (a < YR) s = Math.round(a / MON) + ' 个月' + (fut ? '后' : '前');
    else s = (a / YR).toFixed(1).replace(/\.0$/, '') + ' 年' + (fut ? '后' : '前');
    return s;
  };
  U.date = function (iso, withTime) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const p = function (n) { return String(n).padStart(2, '0'); };
    const s = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    return withTime ? s + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) : s;
  };
  U.abs = function (iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  };

  /* ---------- language colours (github-ish, deliberately no purple) ---------- */
  const LANG = {
    JavaScript: '#a8700a', TypeScript: '#1d4ed8', Python: '#3f6212', Go: '#0e7490',
    Rust: '#8a4b08', Java: '#9a3412', C: '#6c6862', 'C++': '#8f2410', 'C#': '#2c6b3f',
    Ruby: '#b4260c', PHP: '#3f5b78', Swift: '#a16207', Kotlin: '#7c4a03',
    Shell: '#4b5563', HTML: '#b45309', CSS: '#1d4ed8', SCSS: '#9a3412',
    Vue: '#2f7d5b', Svelte: '#b4260c', Dart: '#0e7490', Lua: '#2b4c8c',
    Perl: '#31527a', Haskell: '#5b4636', Elixir: '#7a3e1d', Erlang: '#8f2410',
    Clojure: '#2c6b3f', Scala: '#9a3412', R: '#1d4ed8', Julia: '#9c4221',
    'Objective-C': '#31527a', Assembly: '#6c6862', Dockerfile: '#0e7490',
    Makefile: '#6c6862', JSON: '#6c6862', YAML: '#31527a', Markdown: '#4b5563',
    SQL: '#7c4a03', Terraform: '#4b5563', Vim: '#3f6212', Nix: '#31527a'
  };
  U.langColor = function (name) { return LANG[name] || '#9a958c'; };

  U.license = function (l) {
    if (!l) return '';
    return l.spdx_id && l.spdx_id !== 'NOASSERTION' ? l.spdx_id : (l.name || '');
  };

  /* ---------- storage ---------- */
  const NS = 'ghw.';
  U.store = {
    get: function (k, dflt) {
      try {
        const v = localStorage.getItem(NS + k);
        return v === null ? dflt : JSON.parse(v);
      } catch (e) { return dflt; }
    },
    set: function (k, v) {
      try { localStorage.setItem(NS + k, JSON.stringify(v)); return true; }
      catch (e) { return false; }
    },
    del: function (k) { try { localStorage.removeItem(NS + k); } catch (e) { } },
    clear: function () {
      try {
        Object.keys(localStorage)
          .filter(function (k) { return k.indexOf(NS) === 0; })
          .forEach(function (k) { localStorage.removeItem(k); });
      } catch (e) { }
    }
  };

  /* ---------- toast ---------- */
  U.toast = function (msg, kind) {
    const root = document.getElementById('toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast' + (kind === 'bad' ? ' toast-bad' : '');
    el.innerHTML = '<svg class="ic" viewBox="0 0 24 24">' +
      (kind === 'bad'
        ? '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>'
        : '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.4l2.3 2.3 4.7-5"/>') +
      '</svg><span></span>';
    el.querySelector('span').textContent = msg;
    root.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .22s,transform .22s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(5px)';
      setTimeout(function () { el.remove(); }, 240);
    }, kind === 'bad' ? 4200 : 2400);
  };

  /* ---------- clipboard ---------- */
  U.copy = function (text, label) {
    const done = function () { U.toast((label || '已复制') ); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(function () { U.copyFallback(text, done); });
    } else { U.copyFallback(text, done); }
  };
  U.copyFallback = function (text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); }
    catch (e) { U.toast('复制失败', 'bad'); }
    ta.remove();
  };

  /* ---------- markdown ---------- */
  let mdReady = false;
  function initMd() {
    if (mdReady || typeof marked === 'undefined') return;
    mdReady = true;
    marked.setOptions({
      gfm: true, breaks: false, headerIds: false, mangle: false,
      highlight: function (code, lang) {
        try {
          if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang }).value;
          if (window.hljs) return hljs.highlightAuto(code).value;
        } catch (e) { }
        return U.esc(code);
      }
    });
  }
  U.md = function (src) {
    if (!src) return '';
    initMd();
    if (typeof marked === 'undefined') return '<p>' + U.esc(src) + '</p>';
    let html;
    try { html = marked.parse(String(src)); }
    catch (e) { return '<p>' + U.esc(src) + '</p>'; }
    // harden: strip script/iframe/on* attributes
    html = html.replace(/<\s*(script|iframe|object|embed|form|style|link|meta)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
      .replace(/<\s*(script|iframe|object|embed|form|style|link|meta)[^>]*>/gi, '')
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/javascript:/gi, '');
    return html;
  };

  /* ---------- text ---------- */
  U.firstLine = function (s, n) {
    if (!s) return '';
    const line = String(s).split('\n').find(function (l) { return l.trim() !== ''; }) || '';
    const clean = line.replace(/^#+\s*/, '').replace(/[*_`>]/g, '').trim();
    return clean.length > (n || 110) ? clean.slice(0, n || 110) + '…' : clean;
  };
  U.initials = function (s) {
    s = (s || '?').trim();
    return s.slice(0, 2).toUpperCase();
  };

  /* ---------- path ---------- */
  U.dirOf = function (p) {
    const i = (p || '').lastIndexOf('/');
    return i < 0 ? '' : p.slice(0, i);
  };
  U.baseOf = function (p) {
    const i = (p || '').lastIndexOf('/');
    return i < 0 ? (p || '') : p.slice(i + 1);
  };
  U.extOf = function (p) {
    const b = U.baseOf(p);
    const i = b.lastIndexOf('.');
    return i <= 0 ? '' : b.slice(i + 1).toLowerCase();
  };
  U.rawUrl = function (owner, repo, ref, path) {
    return 'https://raw.githubusercontent.com/' + owner + '/' + repo + '/' + ref + '/' + path;
  };

  window.U = U;
})();
