/* ============================================================
   views/dashboard.js
   ============================================================ */
(function () {
  'use strict';
  const C = window.C;

  const Dashboard = {
    components: C,
    props: { route: Object, shell: Object },
    data: function () {
      return {
        loading: true, err: '',
        repos: [], starred: [], notif: [], following: [],
        totalRepos: 0, totalStars: 0,
        trends: [], trendsLoading: true, trendsErr: ''
      };
    },
    computed: {
      user: function () { return this.shell && this.shell.user; },
      greeting: function () {
        const h = new Date().getHours();
        if (h < 5) return '深夜好';
        if (h < 11) return '早上好';
        if (h < 14) return '中午好';
        if (h < 18) return '下午好';
        return '晚上好';
      },
      privateCount: function () {
        return this.repos.filter(function (r) { return r.private; }).length;
      },
      topLangs: function () {
        const m = {}, total = this.repos.length || 1;
        this.repos.forEach(function (r) { if (r.language) m[r.language] = (m[r.language] || 0) + 1; });
        return Object.keys(m).map(function (k) {
          return { name: k, n: m[k], pct: Math.round(m[k] / total * 100) };
        }).sort(function (a, b) { return b.n - a.n; }).slice(0, 6);
      },
      recentPushed: function () {
        return this.repos.slice().sort(function (a, b) {
          return new Date(b.pushed_at) - new Date(a.pushed_at);
        }).slice(0, 6);
      },
      unread: function () { return this.notif.filter(function (n) { return n.unread; }); },
      unreadTop: function () { return this.unread.slice(0, 6); }
    },
    created: function () { this.load(); this.loadTrends(); },
    methods: {
      // 概览页的「今日热门」：与 #/trends 同一套搜索语法（created:>=今天 + 星标门槛）。
      // 失败时静默（搜索接口限流很严），不打断概览页主内容。
      loadTrends: async function () {
        this.trendsLoading = true;
        const self = this;
        try {
          const d = new Date();
          const p2 = function (n) { return String(n).padStart(2, '0'); };
          const today = d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
          const q = 'created:>=' + today + ' stars:>=5 fork:false archived:false';
          const r = await API.searchRepos(q, 1, 'stars');
          self.trends = ((r.data && r.data.items) || []).slice(0, 5);
        } catch (e) {
          self.trends = [];           // 限流等异常：整块卡片直接不显示
        }
        self.trendsLoading = false;
      },
      load: async function () {
        this.loading = true; this.err = '';
        const self = this;
        try {
          const r = await API.myRepos(1);
          self.repos = r.data || [];
          const l = API.links(r);
          self.totalRepos = l.last ? l.last * 30 : (r.data || []).length;
          self.$emit('cache', r.cache);
          const s = await API.starred(1);
          self.starred = s.data || [];
          const sl = API.links(s);
          self.totalStars = sl.last ? sl.last * 30 : (s.data || []).length;
          API.notifications(1).then(function (n) { self.notif = n.data || []; }).catch(function () { });
          API.following().then(function (f) { self.following = Array.isArray(f) ? f : []; }).catch(function () { });
        } catch (e) { this.err = e.message; }
        this.loading = false;
      },
      open: function (p) { this.$emit('nav', p); },
      notifHref: function (n) {
        const fn = n.repository && n.repository.full_name;
        if (!fn) return '#/notifications';
        const url = (n.subject && n.subject.url) || '';
        const im = url.match(/\/issues\/(\d+)$/);
        const pm = url.match(/\/pulls\/(\d+)$/);
        if (im) return '#/' + fn + '/issues/' + im[1];
        if (pm) return '#/' + fn + '/pulls/' + pm[1];
        return '#/' + fn;
      }
    },
    template:
'<div>' +
'  <div style="display:flex;align-items:flex-end;gap:16px;margin-bottom:20px;flex-wrap:wrap">' +
'    <div style="flex:1;min-width:240px">' +
'      <div class="eyebrow">工作台</div>' +
'      <h1 style="margin-top:5px">{{ greeting }}，{{ userName }}</h1>' +
'      <p class="muted-line" style="margin:5px 0 0">' +
'        {{ totalRepos }} 个仓库 · {{ totalStars }} 项星标 · {{ following.length }} 位关注 · ' +
'        {{ unread.length }} 条未读</p>' +
'    </div>' +
'    <div style="display:flex;gap:8px">' +
'      <button class="btn" @click="open(\'#/repos\')"><icon name="repo" :size="14"></icon>全部仓库</button>' +
'      <button class="btn" @click="open(\'#/notifications\')"><icon name="bell" :size="14"></icon>通知</button>' +
'    </div>' +
'  </div>' +

'  <div v-if="err" class="banner banner-bad" style="margin-bottom:16px">' +
'    <icon name="alert" :size="14"></icon><span>载入失败：{{ err }}</span></div>' +

'  <div class="grid-kpi" style="margin-bottom:22px">' +
'    <div class="kpi"><div class="k">仓库</div><div class="v">{{ totalRepos }}</div>' +
'      <div class="m">{{ privateCount ? "含 " + privateCount + " 个私有" : "全部公开" }}</div></div>' +
'    <div class="kpi"><div class="k">星标</div><div class="v">{{ totalStars }}</div>' +
'      <div class="m">已收藏的仓库</div></div>' +
'    <div class="kpi accent"><div class="k">未读通知</div><div class="v">{{ unread.length }}</div>' +
'      <div class="m">共 {{ notif.length }} 条</div></div>' +
'    <div class="kpi"><div class="k">关注</div><div class="v">{{ following.length }}</div>' +
'      <div class="m">正在关注的开发者</div></div>' +
'  </div>' +

'  <div class="dash-cols">' +
'    <div>' +
'      <div class="card" style="margin-bottom:16px">' +
'        <div class="card-head"><icon name="clock" :size="14"></icon><h3>最近推送</h3>' +
'          <span style="flex:1"></span><span class="dimmer xs mono">last 6</span></div>' +
'        <div v-if="loading"><skel-rows :n="5"></skel-rows></div>' +
'        <div v-else-if="!recentPushed.length" class="empty">' +
'          <icon name="repo" :size="24"></icon><b>还没有仓库</b>' +
'          <p>在 GitHub 上创建第一个仓库后回到这里刷新</p></div>' +
'        <div v-else class="row-list">' +
'          <a v-for="r in recentPushed" :key="r.id" class="row" :href="\'#/\' + r.full_name">' +
'            <avatar :src="r.owner && r.owner.avatar_url" :alt="r.owner && r.owner.login" :size="22" square></avatar>' +
'            <div class="row-main">' +
'              <div class="row-title"><span class="t">{{ r.name }}</span>' +
'                <span v-if="r.private" class="badge"><icon name="lock" :size="10"></icon>私有</span>' +
'                <span v-if="r.fork" class="badge">fork</span>' +
'                <span v-if="r.archived" class="badge">已归档</span></div>' +
'              <div class="row-meta">' +
'                <lang-dot v-if="r.language" :lang="r.language" :show-text="false"></lang-dot>' +
'                <span>{{ r.language || "—" }}</span>' +
'                <span v-if="r.description" class="trunc dimmer" style="max-width:260px;font-family:var(--sans)">{{ r.description }}</span>' +
'              </div>' +
'            </div>' +
'            <div class="row-side">' +
'              <span class="stars"><icon name="star" :size="12"></icon>{{ U.compact(r.stargazers_count) }}</span>' +
'              <rel-time :iso="r.pushed_at"></rel-time>' +
'            </div>' +
'          </a>' +
'        </div>' +
'      </div>' +

'      <div class="card">' +
'        <div class="card-head"><icon name="star" :size="14"></icon><h3>最近星标</h3>' +
'          <span style="flex:1"></span>' +
'          <a class="btn btn-sm btn-quiet" href="#/stars">全部<icon name="right" :size="12"></icon></a></div>' +
'        <div v-if="loading"><skel-rows :n="3"></skel-rows></div>' +
'        <div v-else-if="!starred.length" class="empty" style="padding:30px">' +
'          <icon name="star" :size="22"></icon><b>暂无星标</b></div>' +
'        <div v-else class="row-list">' +
'          <a v-for="r in starred.slice(0,5)" :key="r.id" class="row" :href="\'#/\' + r.full_name">' +
'            <avatar :src="r.owner && r.owner.avatar_url" :alt="r.owner && r.owner.login" :size="22" square></avatar>' +
'            <div class="row-main">' +
'              <div class="row-title"><span class="t">{{ r.full_name }}</span></div>' +
'              <div class="row-meta"><span v-if="r.description" class="trunc dimmer" style="max-width:320px;font-family:var(--sans)">{{ r.description }}</span></div></div>' +
'            <div class="row-side">' +
'              <span class="stars"><icon name="star" :size="12"></icon>{{ U.compact(r.stargazers_count) }}</span></div>' +
'          </a>' +
'        </div>' +
'      </div>' +
'    </div>' +

'    <div>' +
'      <div class="card" style="margin-bottom:16px" v-if="trendsLoading || trends.length">' +
'        <div class="card-head"><icon name="trending" :size="14"></icon><h3>今日热门</h3>' +
'          <span style="flex:1"></span>' +
'          <a class="btn btn-sm btn-quiet" href="#/trends">更多<icon name="right" :size="12"></icon></a></div>' +
'        <div v-if="trendsLoading"><skel-rows :n="4"></skel-rows></div>' +
'        <div v-else class="row-list">' +
'          <a v-for="(r, i) in trends" :key="r.id" class="row" :href="\'#/\' + r.full_name">' +
'            <span class="rank" :class="{top: i < 3}">{{ i + 1 }}</span>' +
'            <div class="row-main">' +
'              <div class="row-title"><span class="t" style="font-size:13px;font-weight:600">{{ r.full_name }}</span></div>' +
'              <div class="row-meta">' +
'                <lang-dot v-if="r.language" :lang="r.language" :show-text="false"></lang-dot>' +
'                <span>{{ r.language || "—" }}</span></div>' +
'            </div>' +
'            <div class="row-side">' +
'              <span class="stars"><icon name="star" :size="12"></icon>{{ U.compact(r.stargazers_count) }}</span></div>' +
'          </a>' +
'        </div>' +
'      </div>' +

'      <div class="card" style="margin-bottom:16px">' +
'        <div class="card-head"><icon name="activity" :size="14"></icon><h3>语言构成</h3></div>' +
'        <div class="card-pad" v-if="topLangs.length">' +
'          <div v-for="l in topLangs" :key="l.name" style="margin-bottom:11px">' +
'            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">' +
'              <span class="lang-dot" :style="{background: U.langColor(l.name)}"></span>' +
'              <span style="font-size:12.5px">{{ l.name }}</span>' +
'              <span style="flex:1"></span>' +
'              <span class="mono-num dimmer">{{ l.pct }}%</span></div>' +
'            <div class="bar"><i :style="{width: l.pct + \'%\', background: U.langColor(l.name)}"></i></div>' +
'          </div>' +
'        </div>' +
'        <div v-else class="empty" style="padding:26px"><span class="sm dim">暂无数据</span></div>' +
'      </div>' +

'      <div class="card">' +
'        <div class="card-head"><icon name="bell" :size="14"></icon><h3>未读通知</h3>' +
'          <span style="flex:1"></span><span class="mono-num dimmer">{{ unread.length }}</span></div>' +
'        <div v-if="unreadTop.length" class="row-list">' +
'          <a v-for="n in unreadTop" :key="n.id" class="row" :href="notifHref(n)">' +
'            <span class="row-main">' +
'              <div class="row-title"><span class="t" style="font-size:13px;font-weight:500">{{ n.subject.title }}</span></div>' +
'              <div class="row-meta"><span>{{ n.repository.full_name }}</span><span>·</span>' +
'              <span>{{ n.subject.type }}</span><span>·</span><rel-time :iso="n.updated_at"></rel-time></div>' +
'            </span>' +
'          </a>' +
'        </div>' +
'        <div v-else class="empty" style="padding:28px">' +
'          <icon name="check" :size="22"></icon><b>没有未读</b><p>收件箱是空的</p></div>' +
'      </div>' +
'    </div>' +
'  </div>' +
'</div>'
  };

  Dashboard.computed.userName = function () {
    const u = this.user;
    return (u && (u.name || u.login)) || '';
  };

  window.VIEWS.dashboard = Dashboard;
})();
