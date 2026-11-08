/* ============================================================
   app.js — shell: hash router, navigation, topbar readouts
   ============================================================ */
(function () {
  'use strict';

  /* ---------- router ---------- */
  function parse(hash) {
    let h = (hash || '').replace(/^#/, '');
    if (!h || h === '/') return { name: 'dashboard', params: {}, query: {} };
    const qi = h.indexOf('?');
    let qs = '';
    if (qi >= 0) { qs = h.slice(qi + 1); h = h.slice(0, qi); }
    const query = {};
    qs.split('&').forEach(function (kv) {
      if (!kv) return;
      const i = kv.indexOf('=');
      const k = decodeURIComponent(i < 0 ? kv : kv.slice(0, i));
      query[k] = decodeURIComponent(i < 0 ? '' : kv.slice(i + 1));
    });
    const parts = h.split('/').filter(function (s) { return s !== ''; }).map(decodeURIComponent);
    const p = {};
    let name = 'dashboard';

    const R = function (n, keys) {
      name = n;
      keys.forEach(function (k, i) { p[k] = parts[i + 1]; });
    };

    switch (parts[0]) {
      case undefined: name = 'dashboard'; break;
      case 'repos': name = 'repos'; p.page = Number(query.page || 1); break;
      case 'stars': name = 'stars'; p.page = Number(query.page || 1); break;
      case 'trends': name = 'trends'; p.period = query.period; p.mode = query.mode; p.lang = query.lang; break;
      case 'notifications': name = 'notifications'; break;
      case 'search': name = 'search'; p.q = query.q || ''; p.page = Number(query.page || 1); p.type = query.type || 'repositories'; break;
      case 'settings': name = 'settings'; break;
      case 'users': R('user', ['login']); break;
      case 'orgs': R('user', ['login']); break;
      default:
        // /:owner/:repo[/...]
        p.owner = parts[0];
        if (parts[1]) {
          p.repo = parts[1];
          const sub = parts[2];
          if (!sub) { name = 'repo'; p.tab = query.tab || 'code'; }
          else if (sub === 'code' || sub === 'tree' || sub === 'blob') {
            name = 'code';
            if (sub === 'blob') { p.mode = 'blob'; p.ref = parts[3]; p.path = parts.slice(4).join('/'); }
            else if (sub === 'tree') { p.mode = 'tree'; p.ref = parts[3]; p.path = parts.slice(4).join('/'); }
            else { p.mode = parts[3] === 'blob' ? 'blob' : 'tree'; p.ref = parts[4]; p.path = parts.slice(5).join('/'); }
          }
          else if (sub === 'issues') { name = parts[3] ? 'issue' : 'issues'; p.number = Number(parts[3] || 0); p.tab = query.tab; }
          else if (sub === 'pulls' || sub === 'pull') { name = parts[3] ? 'pull' : 'pulls'; p.number = Number(parts[3] || 0); p.tab = query.tab || 'conversation'; p.sub = query.sub; }
          else if (sub === 'commits') { name = parts[3] ? 'commit' : 'commits'; p.sha = parts[3]; p.ref = query.ref; }
          else if (sub === 'commit') { name = 'commit'; p.sha = parts[3]; }
          else if (sub === 'branches') { name = 'branches'; }
          else if (sub === 'releases') { name = parts[3] ? 'release' : 'releases'; p.tag = parts[3]; }
          else if (sub === 'actions') { name = parts[3] ? 'run' : 'actions'; p.runId = parts[3]; }
          else if (sub === 'blame') { name = 'code'; p.mode = 'blame'; p.ref = parts[3]; p.path = parts.slice(4).join('/'); }
          else if (sub === 'compare') { name = 'compare'; p.spec = parts.slice(3).join('/'); }
          else { name = 'repo'; p.tab = sub; }
        } else {
          name = 'user';
          p.login = parts[0];
        }
        break;
    }
    return { name: name, params: p, query: query };
  }

  function build(route) {
    return '#/' + objToPath(route);
  }
  function objToPath(r) { return r; }

  window.__parseRoute = parse;

  /* ---------- shell component ---------- */
  const App = {
    components: window.C,
    data: function () {
      return {
        route: parse(location.hash),
        ready: false,
        user: null,
        bootErr: null,
        counts: { repos: null, stars: null, notif: null },
        navOpen: false,
        rate: null,
        cache: { hit: 0, miss: 0 },
        q: '',
        searchScope: 'repositories',
        starOn: {},
        busy: false
      };
    },
    provide: function () {
      return {
        nav: this.go,
        route: function () { return this.route; },
        shell: this
      };
    },
    computed: {
      authed: function () { return !!this.user; },
      crate: function () {
        const p = this.route.params;
        return p.owner && p.repo ? { owner: p.owner, repo: p.repo } : null;
      },
      viewKey: function () {
        const p = this.route.params;
        return [this.route.name, p.owner, p.repo, p.ref, p.path, p.number, p.sha, p.login, p.tag, p.runId, this.route.query.q, this.route.query.page, this.route.query.type, p.tab, p.mode].join('|');
      },
      viewComp: function () {
        const v = (window.VIEWS || {})[this.route.name];
        return v ? v : (window.VIEWS || {}).dashboard;
      },
      crumbs: function () {
        const p = this.route.params, out = [];
        const names = {
          dashboard: '概览', repos: '仓库', stars: '星标', notifications: '通知',
          search: '搜索', settings: '设置', user: '用户', repo: '仓库', code: '代码',
          issues: '议题', issue: '议题', pulls: '拉取请求', pull: '拉取请求',
          commits: '提交', commit: '提交', branches: '分支', releases: '发布',
          release: '发布', actions: '流水线', run: '流水线', compare: '比较',
          trends: '热门'
        };
        out.push({ label: names[this.route.name] || '概览', to: null });
        if (p.owner) out.unshift({ label: p.owner, to: '#/users/' + p.owner });
        return out;
      },
      cacheRate: function () {
        const t = this.cache.hit + this.cache.miss;
        if (!t) return null;
        return Math.round((this.cache.hit / t) * 100);
      },
      loginComp: function () { return (window.VIEWS || {}).login; },
      shellSelf: function () { return this; },
      ratePct: function () {
        if (!this.rate || !this.rate.limit) return null;
        return Math.max(0, Math.min(100, (this.rate.remaining / this.rate.limit) * 100));
      }
    },
    created: function () {
      const self = this;
      API.onRate = function (r) { self.rate = r; };
      API.loadToken();
      window.addEventListener('hashchange', this.onHash);
      if (!location.hash) location.replace('#/');
    },
    mounted: function () {
      const self = this;
      this.boot();
      document.addEventListener('keydown', function (e) {
        if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName)) {
          e.preventDefault();
          const box = document.querySelector('#global-q');
          if (box) box.focus();
        }
      });
    },
    methods: {
      onHash: function () { this.route = parse(location.hash); this.navOpen = false; window.scrollTo(0, 0); },
      go: function (path) {
        if (typeof path === 'string' && path.charAt(0) === '#') {
          if (location.hash === path) this.onHash();
          else location.hash = path;
        } else {
          location.hash = '#/' + String(path).replace(/^\/?/, '');
        }
      },
      back: function () { history.back(); },
      boot: async function () {
        if (!API.hasToken()) { this.ready = true; return; }
        try {
          this.user = await API.me();
          this.ready = true;
          this.loadCounts();
        } catch (e) {
          this.ready = true;
          if (e.status === 401) {
            API.setToken(null);
            this.user = null;
            U.toast('Token 已失效，请重新登录', 'bad');
          } else {
            this.bootErr = e.message;
          }
        }
      },
      loadCounts: async function () {
        const self = this;
        API.getData('/user/repos', { per_page: 1 }).then(function () { }).catch(function () { });
        API.myRepos(1).then(function (r) {
          const l = API.links(r);
          self.counts.repos = l.last ? l.last * 30 : (r.data ? r.data.length : 0);
        }).catch(function () { });
        API.starred(1).then(function (r) {
          const l = API.links(r);
          self.counts.stars = l.last ? l.last * 30 : (r.data ? r.data.length : 0);
        }).catch(function () { });
        // fresh=true：未读角标必须实时，不能被 /api/ 的 5 分钟缓存拖住
        API.notifications(1, null, true).then(function (r) {
          self.counts.notif = (r.data || []).length;
        }).catch(function () { });
      },
      doLogin: function () {
        const self = this;
        this.ready = false;
        API.me().then(function (u) {
          self.user = u; self.ready = true; U.toast('已连接 ' + u.login);
          self.loadCounts();
          if (self.route.name === 'dashboard') self.route = parse(location.hash);
        }).catch(function (e) {
          API.setToken(null);
          self.ready = true;
          self.user = null;
          U.toast(e.status === 401 ? 'Token 无效或权限不足' : ('连接失败：' + e.message), 'bad');
        });
      },
      doLogout: function () {
        API.setToken(null);
        API.forget();
        this.user = null;
        location.hash = '#/';
        this.route = parse(location.hash);
        U.toast('已断开');
      },
      submitSearch: function () {
        const q = (this.q || '').trim();
        if (!q) return;
        this.go('#/search?q=' + encodeURIComponent(q) + '&type=' + this.searchScope);
      },
      refresh: function () {
        API.forget();
        this.onHash();
        U.toast('已刷新（内存缓存已清）');
      },
      noteCache: function (c) {
        if (c === 'HIT' || c === 'STALE' || c === 'REVALIDATED' || c === 'UPDATING') this.cache.hit++;
        else if (c === 'MISS' || c === 'EXPIRED' || c === 'BYPASS') this.cache.miss++;
      },
      toggleStar: async function (o, r) {
        const key = o + '/' + r;
        const on = !!this.starOn[key];
        try {
          if (on) { await API.unstar(o, r); this.starOn[key] = false; U.toast('已取消星标'); }
          else { await API.star(o, r); this.starOn[key] = true; U.toast('已加星标'); }
        } catch (e) { U.toast('操作失败：' + e.message, 'bad'); }
      },
      copyPat: function () { }
    },
    template:
'<div class="app" :class="{ \'nav-open\': navOpen }">' +

  /* ---------- login ---------- */
  '  <template v-if="!authed">' +
  '    <component :is="loginComp" v-if="ready" :boot-err="bootErr" @authed="doLogin" class="login-host"></component>' +
  '    <div v-else class="login-wrap"><div class="center-pad" style="grid-column:1/-1"><span class="spin"></span></div></div>' +
  '  </template>' +

  /* ---------- shell ---------- */
  '  <template v-else>' +
  '    <aside class="sidebar">' +
  '      <div class="brand">' +
  '        <span class="brand-mark">G</span>' +
  '        <span><span class="brand-name">GH·WEB</span>' +
  '        <span class="brand-sub" style="display:block">read-only mirror</span></span>' +
  '      </div>' +
  '      <nav class="nav">' +
  '        <div class="nav-group">' +
  '          <div class="nav-label">工作台</div>' +
  '          <div class="nav-item" :class="{on: route.name===\'dashboard\'}" @click="go(\'#/\')">' +
  '            <icon name="dashboard" :size="15"></icon><span class="lbl">概览</span></div>' +
  '          <div class="nav-item" :class="{on: route.name===\'notifications\'}" @click="go(\'#/notifications\')">' +
  '            <icon name="bell" :size="15"></icon><span class="lbl">通知</span>' +
  '            <span v-if="counts.notif" class="nav-count">{{ counts.notif }}</span></div>' +
  '          <div class="nav-item" :class="{on: route.name===\'search\'}" @click="go(\'#/search\')">' +
  '            <icon name="search" :size="15"></icon><span class="lbl">搜索</span></div>' +
  '        </div>' +
  '        <div class="nav-group">' +
  '          <div class="nav-label">发现</div>' +
  '          <div class="nav-item" :class="{on: route.name===\'trends\'}" @click="go(\'#/trends\')">' +
  '            <icon name="trending" :size="15"></icon><span class="lbl">热门项目</span></div>' +
  '        </div>' +
  '        <div class="nav-group">' +
  '          <div class="nav-label">我的</div>' +
  '          <div class="nav-item" :class="{on: route.name===\'repos\'}" @click="go(\'#/repos\')">' +
  '            <icon name="repo" :size="15"></icon><span class="lbl">仓库</span>' +
  '            <span v-if="counts.repos" class="nav-count">{{ counts.repos }}</span></div>' +
  '          <div class="nav-item" :class="{on: route.name===\'stars\'}" @click="go(\'#/stars\')">' +
  '            <icon name="star" :size="15"></icon><span class="lbl">星标</span>' +
  '            <span v-if="counts.stars" class="nav-count">{{ counts.stars }}</span></div>' +
  '        </div>' +
  '        <div class="nav-group">' +
  '          <div class="nav-label">系统</div>' +
  '          <div class="nav-item" :class="{on: route.name===\'settings\'}" @click="go(\'#/settings\')">' +
  '            <icon name="gear" :size="15"></icon><span class="lbl">设置</span></div>' +
  '        </div>' +
  '      </nav>' +
  '      <div class="side-foot">' +
  '        <avatar :src="user.avatar_url" :alt="user.login" :size="26"></avatar>' +
  '        <span class="side-user"><b>{{ user.name || user.login }}</b>' +
  '        <span>@{{ user.login }}</span></span>' +
  '        <dropdown align="left">' +
  '          <template #trigger><button class="btn btn-sm btn-quiet" style="padding:0 6px">' +
  '            <icon name="down" :size="13"></icon></button></template>' +
  '          <template #menu>' +
  '            <div class="pop-head">账号</div>' +
  '            <div class="pop-item" @click="go(\'#/users/\' + user.login)">' +
  '              <icon name="users" :size="14"></icon>我的主页</div>' +
  '            <div class="pop-item" @click="go(\'#/settings\')">' +
  '              <icon name="key" :size="14"></icon>Token 与设置</div>' +
  '            <div class="pop-item" @click="refresh">' +
  '              <icon name="refresh" :size="14"></icon>清缓存刷新</div>' +
  '            <div class="pop-sep"></div>' +
  '            <div class="pop-item" @click="doLogout" style="color:var(--alarm)">' +
  '              <icon name="logout" :size="14"></icon>断开连接</div>' +
  '          </template>' +
  '        </dropdown>' +
  '      </div>' +
  '    </aside>' +

  '    <div class="rail-scrim" v-if="navOpen" @click="navOpen=false"></div>' +

  '    <div class="main">' +
  '      <header class="topbar">' +
  '        <button class="btn btn-sm btn-quiet rail-btn" @click="navOpen=true" style="padding:0 6px">' +
  '          <icon name="menu" :size="16"></icon></button>' +
  '        <div class="crumb">' +
  '          <template v-for="(c, i) in crumbs" :key="i">' +
  '            <span v-if="i" class="sep">/</span>' +
  '            <a v-if="c.to" :href="c.to" style="color:var(--ink-3)">{{ c.label }}</a>' +
  '            <span v-else>{{ c.label }}</span>' +
  '          </template>' +
  '          <template v-if="crate">' +
  '            <span class="sep">/</span>' +
  '            <a :href="\'#/users/\' + crate.owner" style="color:var(--ink-3)">{{ crate.owner }}</a>' +
  '            <span class="sep">/</span>' +
  '            <a :href="\'#/\' + crate.owner + \'/\' + crate.repo"><b>{{ crate.repo }}</b></a>' +
  '          </template>' +
  '        </div>' +
  '        <div class="topbar-spacer"></div>' +
  '        <span class="mono hide-sm" v-if="cacheRate !== null" style="font-size:10.5px;color:var(--ink-4)" ' +
  '              :title="\'本次会话缓存命中 \' + cache.hit + \' / \' + (cache.hit + cache.miss) + \' 次请求\'">' +
  '          cache {{ cacheRate }}%</span>' +
  '        <span v-if="rate" class="hide-sm" style="display:flex;align-items:center;gap:6px" ' +
  '              :title="\'API 额度 \' + rate.remaining + \'/\' + rate.limit + \'，重置于 \' + new Date(rate.reset).toLocaleTimeString()">' +
  '          <span class="bar" style="width:34px">' +
  '            <i :style="{width: ratePct + \'%\', background: ratePct < 15 ? \'var(--alarm)\' : \'var(--ink-3)\'}"></i>' +
  '          </span>' +
  '          <span class="mono" style="font-size:10.5px;color:var(--ink-4)">{{ rate.remaining }}</span>' +
  '        </span>' +
  '        <button class="btn btn-sm btn-quiet" @click="refresh" title="清缓存并刷新">' +
  '          <icon name="refresh" :size="14"></icon></button>' +
  '      </header>' +
  '      <main class="content">' +
  /* 注意：<transition> 的直接子节点必须是「单根」。
     而 run/commit/compare/issue/pull/user 这 6 个详情页模板是
     v-if 加载态 / v-else-if 错误态 / v-else 正文 三个并列根，
     直接套过渡会静默失效。所以这里插一层单根 div 作为 carrier：
     内层组件根节点数量从此不再影响过渡是否生效。 */
  '        <transition name="view" mode="out-in">' +
  '          <div class="view-host" :key="viewKey">' +
  '            <component :is="viewComp" :route="route" :shell="shellSelf" ' +
  '                       @nav="go" @cache="noteCache"></component>' +
  '          </div>' +
  '        </transition>' +
  '      </main>' +
  '    </div>' +
  '  </template>' +
  '</div>',
  };

  window.VIEWS = window.VIEWS || {};
  window.App = App;

  /* ---------- boot ---------- */
  window.__BOOT_TS = Date.now();
  (function boot() {
    if (typeof Vue === 'undefined') {
      document.getElementById('app').innerHTML =
        '<div style="padding:40px;font:14px system-ui">前端运行时未加载（/vendor/vue.global.prod.js 缺失）。</div>';
      return;
    }
    const app = Vue.createApp(App);
    // 全局注册，保证任何组件模板里都能解析到这些原语
    Object.keys(window.C).forEach(function (k) { app.component(k, window.C[k]); });
    // 模板里要用到的工具（Vue 只放行 Math/Date/JSON 等内置全局）
    app.config.globalProperties.U = window.U;
    app.config.globalProperties.API = window.API;
    app.config.globalProperties.hljs = window.hljs;
    app.config.errorHandler = function (err, instance, info) {
      if (window.console) console.error('[gh-web]', info, (err && err.stack) || err);
    };
    app.mount('#app');
  })();
})();
