/* ============================================================
   views/user.js — user / org profile
   ============================================================ */
(function () {
  'use strict';
  const C = window.C;

  const User = {
    components: C,
    props: { route: Object, shell: Object },
    data: function () {
      return {
        loading: true, err: '',
        u: null, repos: [], gists: [], tab: 'repos',
        filter: '', sort: 'pushed', isSelf: false
      };
    },
    computed: {
      login: function () { return this.route.params.login; },
      shown: function () {
        const f = this.filter.trim().toLowerCase();
        const arr = this.repos.slice().sort(function (a, b) {
          return 0;
        });
        return arr.filter(function (r) {
          return !f || (r.name + ' ' + (r.description || '')).toLowerCase().indexOf(f) >= 0;
        });
      },
      langs: function () {
        const m = {};
        this.repos.forEach(function (r) { if (r.language) m[r.language] = (m[r.language] || 0) + 1; });
        return Object.keys(m).map(function (k) { return { name: k, n: m[k] }; })
          .sort(function (a, b) { return b.n - a.n; }).slice(0, 8);
      },
      totalStars: function () {
        return this.repos.reduce(function (s, r) { return s + (r.stargazers_count || 0); }, 0);
      },
      latestRepos: function () {
        return this.repos.slice().sort(function (a, b) {
          return new Date(b.pushed_at) - new Date(a.pushed_at);
        }).slice(0, 6);
      }
    },
    watch: { '$route.params.login': function () { this.load(); } },
    created: function () { this.load(); },
    methods: {
      load: async function () {
        this.loading = true; this.err = '';
        const self = this;
        try {
          self.u = await API.user(this.login);
          const me = this.shell && this.shell.user;
          self.isSelf = !!(me && me.login.toLowerCase() === this.login.toLowerCase());
          const r = await API.userRepos(this.login, 1);
          self.repos = r.data || [];
          self.$emit('cache', r.cache);
          if (self.isSelf) {
            API.gists(1).then(function (g) { self.gists = g.data || []; }).catch(function () { });
          }
        } catch (e) {
          this.err = e.status === 404 ? '用户不存在' : e.message;
        }
        this.loading = false;
      },
      openRepo: function (r) { this.$emit('nav', '#/' + r.full_name); },
      openOwn: function () { if (this.isSelf) this.$emit('nav', '#/'); }
    },
    template:
'<div v-if="loading"><div style="display:flex;gap:16px;align-items:center">' +
'  <div class="skel" style="width:74px;height:74px;border-radius:50%"></div>' +
'  <div><div class="skel" style="height:18px;width:180px"></div>' +
'  <div class="skel" style="height:12px;width:260px;margin-top:10px"></div></div></div>' +
'  <div style="margin-top:22px"><skel-rows :n="5"></skel-rows></div></div>' +

'<div v-else-if="err" class="card"><div class="empty" style="padding:56px">' +
'  <icon name="alert" :size="26"></icon><b>{{ err }}</b></div></div>' +

'<div v-else-if="u">' +
'  <div style="display:flex;gap:18px;align-items:flex-start;margin-bottom:22px;flex-wrap:wrap">' +
'    <avatar :src="u.avatar_url" :alt="u.login" :size="76"></avatar>' +
'    <div style="flex:1;min-width:260px">' +
'      <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap">' +
'        <h1 style="font-size:21px">{{ u.name || u.login }}</h1>' +
'        <span class="mono dim">{{ "@" + u.login }}</span>' +
'        <span v-if="u.type === \'Organization\'" class="badge">组织</span>' +
'        <span v-if="u.site_admin" class="badge badge-warn">管理员</span></div>' +
'      <p v-if="u.bio" class="dim" style="margin:8px 0 0;font-size:13.5px;max-width:640px">{{ u.bio }}</p>' +
'      <div style="display:flex;align-items:center;gap:14px;margin-top:11px;flex-wrap:wrap" class="sm dim">' +
'        <span v-if="u.company" style="display:flex;align-items:center;gap:5px">' +
'          <icon name="users" :size="13"></icon>{{ u.company }}</span>' +
'        <span v-if="u.location" style="display:flex;align-items:center;gap:5px">' +
'          <icon name="globe" :size="13"></icon>{{ u.location }}</span>' +
'        <a v-if="u.blog" :href="u.blog.indexOf(\'http\') === 0 ? u.blog : (\'https://\' + u.blog)" ' +
'           target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:5px;color:var(--accent-deep)">' +
'          <icon name="link" :size="13"></icon>{{ u.blog }}</a>' +
'        <span v-if="u.email" style="display:flex;align-items:center;gap:5px">' +
'          <icon name="inbox" :size="13"></icon>{{ u.email }}</span>' +
'        <span v-if="u.twitter_username" style="display:flex;align-items:center;gap:5px">' +
'          <icon name="users" :size="13"></icon>@{{ u.twitter_username }}</span>' +
'      </div>' +
'      <div class="stat-inline" style="margin-top:13px">' +
'        <div class="s"><div class="n">{{ U.num(u.followers) }}</div><div class="l">关注者</div></div>' +
'        <div class="s"><div class="n">{{ U.num(u.following) }}</div><div class="l">正在关注</div></div>' +
'        <a class="s" href="#/repos" style="color:inherit"><div class="n">{{ U.num(u.public_repos) }}</div><div class="l">公开仓库</div></a>' +
'        <div class="s"><div class="n">{{ U.num(totalStars) }}</div><div class="l">获得星标</div></div>' +
'      </div>' +
'      <div style="display:flex;gap:8px;margin-top:14px">' +
'        <button class="btn btn-sm" @click="openOwn" v-if="isSelf">' +
'          <icon name="dashboard" :size="13"></icon>我的工作台</button>' +
'        <a class="btn btn-sm" :href="u.html_url" target="_blank" rel="noopener noreferrer">' +
'          <icon name="external" :size="13"></icon>GitHub 主页</a></div>' +
'    </div>' +
'  </div>' +

'  <div class="tabs">' +
'    <div class="tab" :class="{on: tab===\'repos\'}" @click="tab=\'repos\'">' +
'      <icon name="repo" :size="14"></icon>仓库 <span class="n">{{ repos.length }}</span></div>' +
'    <div v-if="isSelf" class="tab" :class="{on: tab===\'gists\'}" @click="tab=\'gists\'">' +
'      <icon name="code" :size="14"></icon>代码片段 <span class="n">{{ gists.length }}</span></div>' +
'  </div>' +

'  <div v-if="tab === \'repos\'" style="display:grid;grid-template-columns:1fr 262px;gap:18px" class="user-cols">' +
'    <div style="min-width:0">' +
'      <div class="card">' +
'        <div class="card-head" style="gap:9px">' +
'          <span style="position:relative;display:flex;align-items:center;flex:1;max-width:300px">' +
'            <icon name="search" :size="13" style="position:absolute;left:9px;color:var(--ink-4)"></icon>' +
'            <input class="input" v-model="filter" placeholder="筛选仓库…" style="padding-left:28px"></span>' +
'          <span style="flex:1"></span>' +
'          <span class="xs dimmer mono">{{ shown.length }} 个</span></div>' +
'        <div v-if="!shown.length" class="empty" style="padding:38px">' +
'          <icon name="repo" :size="22"></icon><b>没有公开仓库</b></div>' +
'        <div v-else class="row-list">' +
'          <a v-for="r in shown" :key="r.id" class="row" :href="\'#/\' + r.full_name">' +
'            <div class="row-main">' +
'              <div class="row-title"><span class="t" style="font-weight:600">{{ r.name }}</span>' +
'                <span v-if="r.fork" class="badge">fork</span>' +
'                <span v-if="r.archived" class="badge">已归档</span></div>' +
'              <div v-if="r.description" class="dim" style="font-size:12.5px;margin-top:3px">{{ r.description }}</div>' +
'              <div class="row-meta"><lang-dot v-if="r.language" :lang="r.language"></lang-dot>' +
'                <span v-if="r.updated_at">· <rel-time :iso="r.pushed_at"></rel-time></span></div>' +
'            </div>' +
'            <div class="row-side">' +
'              <span class="stars"><icon name="star" :size="12"></icon>{{ U.compact(r.stargazers_count) }}</span>' +
'              <span class="stars" style="color:var(--ink-4)"><icon name="fork" :size="12"></icon>{{ U.compact(r.forks_count) }}</span>' +
'            </div>' +
'          </a>' +
'        </div>' +
'      </div>' +
'    </div>' +

'    <div style="min-width:0">' +
'      <div class="card" style="margin-bottom:14px" v-if="langs.length">' +
'        <div class="card-head"><h3>常用语言</h3></div>' +
'        <div class="card-pad">' +
'          <div v-for="l in langs" :key="l.name" style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
'            <span class="lang-dot" :style="{background: U.langColor(l.name)}"></span>' +
'            <span class="sm">{{ l.name }}</span><span style="flex:1"></span>' +
'            <span class="mono-num dimmer">{{ l.n }}</span></div>' +
'        </div>' +
'      </div>' +
'      <div class="card" style="margin-bottom:14px" v-if="latestRepos.length">' +
'        <div class="card-head"><h3>最近活跃</h3></div>' +
'        <div class="card-pad" style="display:flex;flex-direction:column;gap:9px">' +
'          <a v-for="r in latestRepos" :key="r.id" :href="\'#/\' + r.full_name" ' +
'             style="display:flex;align-items:center;gap:8px">' +
'            <icon name="repo" :size="13" style="color:var(--ink-4)"></icon>' +
'            <span class="sm trunc" style="font-weight:500">{{ r.name }}</span>' +
'            <span style="flex:1"></span>' +
'            <span class="xs dimmer mono"><rel-time :iso="r.pushed_at"></rel-time></span></a>' +
'        </div>' +
'      </div>' +
'      <div class="card">' +
'        <div class="card-head"><h3>资料</h3></div>' +
'        <div class="card-pad">' +
'          <div class="kv"><span class="k">ID</span><span class="mono">{{ u.id }}</span></div>' +
'          <div class="kv"><span class="k">类型</span><span>{{ u.type === "Organization" ? "组织" : "用户" }}</span></div>' +
'          <div class="kv"><span class="k">注册</span><span><rel-time :iso="u.created_at"></rel-time></span></div>' +
'          <div class="kv" v-if="u.updated_at"><span class="k">更新</span><span><rel-time :iso="u.updated_at"></rel-time></span></div>' +
'        </div>' +
'      </div>' +
'    </div>' +
'  </div>' +

'  <div v-else class="card">' +
'    <div v-if="!gists.length" class="empty" style="padding:40px">' +
'      <icon name="code" :size="22"></icon><b>没有代码片段</b></div>' +
'    <div v-else class="row-list">' +
'      <a v-for="g in gists" :key="g.id" class="row" :href="g.html_url" target="_blank" rel="noopener noreferrer">' +
'        <icon name="file" :size="15" style="color:var(--ink-4);margin-top:2px"></icon>' +
'        <div class="row-main"><div class="row-title"><span class="t mono" style="font-size:12.5px">' +
'          {{ Object.keys(g.files).join(", ") }}</span></div>' +
'          <div class="row-meta"><rel-time :iso="g.updated_at"></rel-time>' +
'          <span v-if="g.description">· {{ g.description }}</span></div></div>' +
'        <icon name="external" :size="13" style="color:var(--rule-3)"></icon>' +
'      </a>' +
'    </div>' +
'  </div>' +
'</div>'
  };

  window.VIEWS.user = User;
})();
