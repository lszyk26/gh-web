/* ============================================================
   views/settings.js — token, cache, session, about
   ============================================================ */
(function () {
  'use strict';
  const C = window.C;

  const Settings = {
    components: C,
    props: { route: Object, shell: Object },
    data: function () {
      return {
        tok: '', show: false, rate: null, me: null,
        masking: true, saved: false, apiOrigin: location.origin,
        version: '1.0.0', bootTs: window.__BOOT_TS || null
      };
    },
    computed: {
      shellC: function () { return this.shell; },
      patLine: function () {
        const t = API.pat || '';
        if (!t) return '—';
        if (this.masking) return t.slice(0, 7) + '•'.repeat(Math.max(0, Math.min(28, t.length - 11))) + t.slice(-4);
        return t;
      },
      ratePct: function () {
        if (!this.rate) return 0;
        return Math.round((this.rate.remaining / (this.rate.limit || 1)) * 100);
      },
      cacheStats: function () {
        const c = this.shell ? this.shell.cache : { hit: 0, miss: 0 };
        const t = c.hit + c.miss;
        return { hit: c.hit, miss: c.miss, total: t, pct: t ? Math.round(c.hit / t * 100) : 0 };
      },
      scopes: function () {
        return ['repo', 'read:user', 'user:email', 'notifications', 'gist'];
      }
    },
    created: function () {
      const self = this;
      API.rateLimit().then(function (r) {
        self.rate = {
          limit: r.rate.limit, remaining: r.rate.remaining,
          reset: r.rate.reset * 1000, used: r.rate.used
        };
      }).catch(function () { });
      this.me = this.shell ? this.shell.user : null;
      API.me().then(function (u) { self.me = u; }).catch(function () { });
    },
    methods: {
      save: function () {
        const t = (this.tok || '').trim();
        if (!t) { U.toast('请输入新的 Token', 'bad'); return; }
        API.setPat(t);
        const self = this;
        API.me().then(function (u) {
          self.me = u;
          self.tok = '';
          U.toast('Token 已更新，账号 ' + u.login);
          if (self.shell) { self.shell.user = u; self.shell.refresh(); }
        }).catch(function (e) {
          U.toast('Token 无效：' + e.message, 'bad');
        });
      },
      logout: function () {
        if (this.shell && this.shell.doLogout) this.shell.doLogout();
      },
      clearCache: function () {
        API.forget();
        if (this.shell) { this.shell.cache.hit = 0; this.shell.cache.miss = 0; this.shell.refresh(); }
        U.toast('本地内存缓存与浏览器缓存已清理');
      },
      wipe: function () {
        U.store.clear();
        API.setPat(null);
        U.toast('已清除本站在此设备上的全部数据');
        setTimeout(function () { location.reload(); }, 600);
      },
      copy: function (t, l) { U.copy(t, l); },
      refreshRate: function () {
        const self = this;
        API.rateLimit().then(function (r) {
          self.rate = { limit: r.rate.limit, remaining: r.rate.remaining, reset: r.rate.reset * 1000, used: r.rate.used };
          U.toast('额度已刷新');
        }).catch(function (e) { U.toast('刷新失败：' + e.message, 'bad'); });
      }
    },
    template:
'<div style="max-width:860px">' +
'  <div style="margin-bottom:20px">' +
'    <div class="eyebrow">配置</div>' +
'    <h1 style="margin-top:5px">设置</h1>' +
'    <p class="muted-line" style="margin:5px 0 0">凭证、缓存与本机会话</p>' +
'  </div>' +

'  <div class="card" style="margin-bottom:16px">' +
'    <div class="card-head"><icon name="key" :size="14"></icon><h3>访问凭证</h3>' +
'      <span style="flex:1"></span>' +
'      <span class="badge badge-ok"><span class="dot"></span>已连接</span></div>' +
'    <div class="card-pad">' +
'      <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px">' +
'        <avatar :src="me && me.avatar_url" :alt="me && me.login" :size="40"></avatar>' +
'        <div><div style="font-weight:600">{{ me && (me.name || me.login) }}</div>' +
'          <div class="mono dim">{{ me && "@" + me.login }} · {{ me && me.public_repos }} 公开仓库</div></div>' +
'      </div>' +
'      <div class="field">' +
'        <span class="lbl">当前 Token</span>' +
'        <div style="display:flex;gap:8px">' +
'          <input class="input mono-input" :value="patLine" readonly>' +
'          <button class="btn" @click="masking = !masking">{{ masking ? "显示" : "隐藏" }}</button>' +
'          <button class="btn" @click="copy(API.pat, \'Token 已复制\')">' +
'            <icon name="copy" :size="13"></icon></button>' +
'        </div>' +
'        <span class="hint">Token 只保存在本机 localStorage 中，不会经过本站服务端持久化。</span>' +
'      </div>' +
'      <hr class="rule" style="margin:16px 0">' +
'      <div class="field">' +
'        <span class="lbl">更换 Token</span>' +
'        <div style="display:flex;gap:8px">' +
'          <input class="input mono-input" :type="show ? \'text\' : \'password\'" v-model="tok" ' +
'                 placeholder="粘贴新的 ghp_… / github_pat_…" style="flex:1">' +
'          <button class="btn" @click="show = !show"><icon name="eye" :size="13"></icon></button>' +
'          <button class="btn btn-dark" @click="save">保存</button>' +
'        </div>' +
'        <span class="hint">所需权限：' +
'          <span v-for="s in scopes" :key="s" class="badge" style="margin-left:4px">{{ s }}</span></span>' +
'      </div>' +
'    </div>' +
'  </div>' +

'  <div class="card" style="margin-bottom:16px">' +
'    <div class="card-head"><icon name="zap" :size="14"></icon><h3>接口额度</h3>' +
'      <span style="flex:1"></span>' +
'      <button class="btn btn-sm btn-quiet" @click="refreshRate">' +
'        <icon name="refresh" :size="12"></icon>刷新</button></div>' +
'    <div class="card-pad" v-if="rate">' +
'      <div style="display:flex;gap:26px;flex-wrap:wrap;margin-bottom:13px">' +
'        <div class="stat-inline"><div class="s"><div class="n">{{ U.num(rate.remaining) }}</div><div class="l">剩余</div></div></div>' +
'        <div class="stat-inline"><div class="s"><div class="n">{{ U.num(rate.limit) }}</div><div class="l">每小时上限</div></div></div>' +
'        <div class="stat-inline"><div class="s"><div class="n">{{ U.num(rate.used || (rate.limit - rate.remaining)) }}</div><div class="l">已使用</div></div></div>' +
'        <div class="stat-inline"><div class="s"><div class="n">{{ U.rel(new Date(rate.reset).toISOString()) }}</div><div class="l">重置于</div></div></div>' +
'      </div>' +
'      <div class="bar" style="height:8px">' +
'        <i :style="{width: ratePct + \'%\', background: ratePct < 15 ? \'var(--alarm)\' : \'var(--ink-3)\'}"></i></div>' +
'      <p class="hint" style="margin-top:8px">该额度为 GitHub 官方判定；本站的本地缓存层会显著减少实际消耗。</p>' +
'    </div>' +
'    <div v-else class="center-pad"><span class="spin"></span></div>' +
'  </div>' +

'  <div class="card" style="margin-bottom:16px">' +
'    <div class="card-head"><icon name="cpu" :size="14"></icon><h3>缓存</h3>' +
'      <span style="flex:1"></span>' +
'      <span class="mono-num dimmer">本次会话</span></div>' +
'    <div class="card-pad">' +
'      <div style="display:flex;gap:26px;flex-wrap:wrap;margin-bottom:13px">' +
'        <div class="stat-inline"><div class="s"><div class="n">{{ cacheStats.hit }}</div><div class="l">命中</div></div></div>' +
'        <div class="stat-inline"><div class="s"><div class="n">{{ cacheStats.miss }}</div><div class="l">回源</div></div></div>' +
'        <div class="stat-inline"><div class="s"><div class="n">{{ cacheStats.total }}</div><div class="l">总请求</div></div></div>' +
'        <div class="stat-inline"><div class="s"><div class="n">{{ cacheStats.pct }}%</div><div class="l">命中率</div></div></div>' +
'      </div>' +
'      <div class="bar" style="height:8px"><i :style="{width: cacheStats.pct + \'%\', background: \'var(--ok)\'}"></i></div>' +
'      <div style="display:flex;gap:8px;margin-top:14px">' +
'        <button class="btn" @click="clearCache"><icon name="refresh" :size="13"></icon>清空缓存</button>' +
'        <button class="btn btn-quiet" @click="wipe" style="color:var(--alarm)">' +
'          <icon name="alert" :size="13"></icon>清除本机全部数据</button>' +
'      </div>' +
'    </div>' +
'  </div>' +

'  <div class="card">' +
'    <div class="card-head"><icon name="info" :size="14"></icon><h3>关于</h3></div>' +
'    <div class="card-pad">' +
'      <div class="kv"><span class="k">站点</span><span class="mono">{{ apiOrigin }}</span></div>' +
'      <div class="kv"><span class="k">数据源</span><span class="mono">api.github.com (REST v3)</span></div>' +
'      <div class="kv"><span class="k">架构</span><span>静态前端 + 本地反向代理缓存层</span></div>' +
'      <div class="kv"><span class="k">版本</span><span class="mono">v{{ version }}</span></div>' +
'      <hr class="rule" style="margin:12px 0">' +
'      <p class="sm dim" style="margin:0 0 8px">本站是只读镜像：不会对你的仓库发起任何写操作，' +
'        不加载第三方统计、不嵌入外部字体或脚本，所有静态资源均为本地文件。</p>' +
'      <p class="sm dim" style="margin:0">部分官方功能（Actions 实时日志流、Codespaces、' +
'        Copilot、Discussions、Projects、设置后台）依赖 GitHub 私有接口，无法在此实现。</p>' +
'    </div>' +
'  </div>' +
'</div>'
  };

  window.VIEWS.settings = Settings;
})();
