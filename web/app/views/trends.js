/* ============================================================
   views/trends.js — 今日 / 本周 / 本月 热门项目
   ------------------------------------------------------------
   GitHub 官方 API 没有 trending 端点，这里用搜索语法「模拟」：
     新晋项目  created:>=<日期> + stars:>=N    按星标排序
                 → 时间窗内新建、已经快速涨粉的（含已沉寂的）
     活跃项目  pushed:>=<日期> + stars:>=N     按「最近更新」排序
                 → 不管哪年建的，只要时间窗内还在推送就上榜，
                   再配星标门槛滤掉纯索引/机器人仓库
     两者都带 fork:false archived:false

   ⚠️ 两个坑（都实测过）：
     1. 不能用 stars:<=N 收窄 —— GitHub 不认这个语法，会当成普通文本词匹配，
        结果不是收窄而是暴涨（实测 11 万 → 3.4 亿）。要用区间 stars:a..b。
     2. 「活跃」不能混用 created:>=窗 + pushed:>=窗 —— 时间窗内新建的仓库
        推送时间必然也在窗内，条件完全冗余，结果与「新晋」一模一样。
   时间窗用本地日期算，格式 YYYY-MM-DD（GitHub 搜索要求）。
   注意：搜索接口限流较严（约 30 次/分钟），因此本页不做自动轮询。
   ============================================================ */
(function () {
  'use strict';
  const C = window.C;

  /* 语言列表（覆盖 GitHub 上最常见的一批，刻意不含任何紫色系命名） */
  const LANGS = [
    'JavaScript', 'TypeScript', 'Python', 'Go', 'Rust', 'Java', 'C', 'C++', 'C#',
    'Ruby', 'PHP', 'Swift', 'Kotlin', 'Dart', 'Shell', 'HTML', 'CSS', 'SCSS',
    'Vue', 'Svelte', 'Lua', 'Perl', 'Haskell', 'Elixir', 'Erlang', 'Clojure',
    'Scala', 'R', 'Julia', 'Zig', 'Nim', 'Nix', 'Dockerfile', 'Makefile',
    'Jupyter Notebook', 'Objective-C', 'Assembly', 'PowerShell', 'TeX'
  ];

  const PERIODS = [
    { k: 'today', label: '今日', days: 0, min: 5, actMin: 300 },
    { k: 'week', label: '本周', days: 7, min: 20, actMin: 300 },
    { k: 'month', label: '本月', days: 30, min: 50, actMin: 150 },
    { k: '90d', label: '近 90 天', days: 90, min: 100, actMin: 80 }
  ];

  function isoDaysAgo(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    const p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  const Trends = {
    components: C,
    props: { route: Object, shell: Object },
    data: function () {
      return {
        loading: true, err: '',
        items: [], page: 1, hasNext: false, hasPrev: false,
        period: 'week', mode: 'created', lang: '',
        total: null, query: '', since: '', rateRemaining: null
      };
    },
    computed: {
      periods: function () { return PERIODS; },
      langs: function () { return LANGS; },
      curPeriod: function () {
        const k = this.period;
        return PERIODS.filter(function (p) { return p.k === k; })[0] || PERIODS[1];
      },
      // 已在结果里出现过的语言，置顶显示，方便连续筛选
      langOptions: function () {
        const seen = {};
        this.items.forEach(function (r) { if (r.language) seen[r.language] = 1; });
        const head = Object.keys(seen).sort();
        const rest = LANGS.filter(function (l) { return !seen[l]; });
        return head.concat(rest);
      },
      sub: function () {
        return this.mode === 'active'
          ? '时间窗内仍在推送的项目，按最近更新排序——不管它是哪年建的'
          : '时间窗内新建、且已快速积累星标的项目，按星标排序';
      },
      headline: function () {
        if (this.err) return '热门项目';
        return this.curPeriod.label + (this.mode === 'active' ? '活跃项目' : '新晋项目') +
          (this.lang ? ' · ' + this.lang : '');
      }
    },
    watch: {
      '$route.query': function () { this.syncFromRoute(); }
    },
    created: function () { this.syncFromRoute(); this.load(1); },
    methods: {
      syncFromRoute: function () {
        const q = this.route.query || {};
        const pk = PERIODS.filter(function (p) { return p.k === q.period; })[0];
        this.period = pk ? pk.k : 'week';
        this.mode = q.mode === 'active' ? 'active' : 'created';
        this.lang = q.lang || '';
      },
      buildQuery: function () {
        const days = this.curPeriod.days;
        const since = isoDaysAgo(days);
        const bits = [];
        if (this.mode === 'active') {
          // 「活跃」= 时间窗内仍在推送，不限创建时间；配星标门槛滤掉
          // 索引仓/机器人仓，并按「最近更新」排序，榜单每次都有新鲜感。
          bits.push('pushed:>=' + since);
          bits.push('stars:>=' + this.curPeriod.actMin);
        } else {
          // 「新晋」= 时间窗内新建 + 已涨粉，按星标排序。
          bits.push('created:>=' + since);
          bits.push('stars:>=' + this.curPeriod.min);
        }
        bits.push('fork:false');
        bits.push('archived:false');
        if (this.lang) bits.push('language:' + this.lang);
        return { q: bits.join(' '), since: since };
      },
      load: async function (p) {
        this.loading = true; this.err = '';
        const self = this;
        const built = this.buildQuery();
        self.query = built.q; self.since = built.since;
        try {
          const r = await API.searchRepos(built.q, p, this.mode === 'active' ? 'updated' : 'stars');
          self.items = (r.data && r.data.items) || [];
          self.total = (r.data && r.data.total_count) || 0;
          self.page = p;
          self.hasNext = self.items.length >= 30;
          self.hasPrev = p > 1;
          self.$emit('cache', r.cache);
        } catch (e) {
          // 搜索接口限流时给出可操作的解释，而不是干巴巴的 HTTP 403
          self.items = [];
          if (e.status === 403 || e.status === 429) {
            self.err = '搜索接口限流了（未登录约 10 次/分钟，登录后约 30 次/分钟）。等一分钟再试，或先点上方「刷新」。';
          } else {
            self.err = e.message;
          }
        }
        self.loading = false;
      },
      apply: function () {
        // 筛选条件写进 hash，这样刷新 / 分享 / 后退都保持状态
        const q = [];
        if (this.period !== 'week') q.push('period=' + this.period);
        if (this.mode !== 'created') q.push('mode=' + this.mode);
        if (this.lang) q.push('lang=' + encodeURIComponent(this.lang));
        this.$emit('nav', '#/trends' + (q.length ? '?' + q.join('&') : ''));
        this.load(1);
      },
      setPeriod: function (k) { this.period = k; this.apply(); },
      setMode: function (k) { this.mode = k; this.apply(); },
      onLang: function () { this.apply(); },
      go: function (p) { this.load(p); },
      open: function (r) { this.$emit('nav', '#/' + r.full_name); },
      starOn: function (r) {
        const sh = this.shell; if (!sh) return false;
        const k = r.full_name;
        return sh.starOn[k] !== undefined ? sh.starOn[k] : !!r.starred;
      },
      toggleStar: async function (r, ev) {
        ev.stopPropagation(); ev.preventDefault();
        const sh = this.shell; if (!sh) return;
        const k = r.full_name, on = this.starOn(r);
        try {
          if (on) { await API.unstar(r.owner.login, r.name); sh.starOn[k] = false; U.toast('已取消星标'); }
          else { await API.star(r.owner.login, r.name); sh.starOn[k] = true; U.toast('已加星标'); }
        } catch (e) { U.toast('操作失败：' + e.message, 'bad'); }
      }
    },
    /* 注意：整个模板必须是单根（外层一个 <div>），否则 <transition> 会静默失效 */
    template:
'<div>' +
'  <div style="display:flex;align-items:flex-end;gap:16px;margin-bottom:18px;flex-wrap:wrap">' +
'    <div style="flex:1;min-width:200px">' +
'      <div class="eyebrow">发现</div>' +
'      <h1 style="margin-top:5px">{{ headline }}</h1>' +
'      <p class="muted-line" style="margin:5px 0 0">{{ sub }}</p>' +
'    </div>' +
'    <div v-if="total !== null && !loading" class="stat-inline">' +
'      <span class="s"><span class="n tnum">{{ U.num(total) }}</span><span class="l">匹配项目</span></span>' +
'      <span class="s"><span class="n tnum">{{ U.date(since) }}</span><span class="l">起始日期</span></span>' +
'    </div>' +
'  </div>' +

'  <div class="card" style="margin-bottom:14px">' +
'    <div class="card-head" style="gap:10px;flex-wrap:wrap">' +
'      <span class="seg">' +
'        <button v-for="p in periods" :key="p.k" :class="{on: period === p.k}" ' +
'                @click="setPeriod(p.k)">{{ p.label }}</button>' +
'      </span>' +
'      <span class="seg">' +
'        <button :class="{on: mode === \'created\'}" @click="setMode(\'created\')">新晋</button>' +
'        <button :class="{on: mode === \'active\'}" @click="setMode(\'active\')">活跃</button>' +
'      </span>' +
'      <select class="input" style="width:auto;min-width:132px" v-model="lang" @change="onLang">' +
'        <option value="">全部语言</option>' +
'        <option v-for="l in langOptions" :key="l" :value="l">{{ l }}</option>' +
'      </select>' +
'      <span style="flex:1"></span>' +
'      <button class="btn btn-sm btn-quiet" :disabled="loading" @click="load(page)" title="重新拉取">' +
'        <icon name="refresh" :size="13"></icon></button>' +
'    </div>' +
'    <div class="card-pad" style="padding-top:9px;padding-bottom:9px;border-bottom:1px solid var(--rule)">' +
'      <span class="eyebrow" style="letter-spacing:.06em">搜索式</span>' +
'      <code class="mono" style="font-size:11.5px;color:var(--ink-3);margin-left:8px;word-break:break-all">{{ query }}</code>' +
'    </div>' +

'    <div v-if="err" class="banner banner-bad" style="margin:14px">' +
'      <icon name="alert" :size="14"></icon><span>{{ err }}</span></div>' +

'    <div v-if="loading"><skel-rows :n="8"></skel-rows></div>' +

'    <div v-else-if="!items.length && !err" class="empty">' +
'      <icon name="trending" :size="26"></icon>' +
'      <b>这个时间窗内没有符合条件的热门项目</b>' +
'      <p>把时间窗放宽到「本周」或「本月」，或清掉语言筛选后再看</p></div>' +

'    <div v-else class="row-list">' +
'      <a v-for="(r, i) in items" :key="r.id" class="row" :href="\'#/\' + r.full_name">' +
'        <span class="rank tnum" :class="{top: (page - 1) * 30 + i < 3}">{{ (page - 1) * 30 + i + 1 }}</span>' +
'        <avatar :src="r.owner && r.owner.avatar_url" :alt="r.owner && r.owner.login" :size="24" square></avatar>' +
'        <div class="row-main">' +
'          <div class="row-title">' +
'            <span class="t" style="font-weight:600">{{ r.full_name }}</span>' +
'            <span v-if="r.archived" class="badge">已归档</span>' +
'            <span v-if="r.is_template" class="badge">模板</span></div>' +
'          <div v-if="r.description" class="dim clamp2" style="font-size:12.5px;margin-top:4px;font-family:var(--sans)">' +
'            {{ r.description }}</div>' +
'          <div class="row-meta">' +
'            <lang-dot v-if="r.language" :lang="r.language"></lang-dot>' +
'            <span v-if="r.license && r.license.spdx_id && r.license.spdx_id !== \'NOASSERTION\'">· {{ U.license(r.license) }}</span>' +
'            <span v-if="r.topics && r.topics.length" style="display:flex;gap:5px;flex-wrap:wrap">' +
'              <span v-for="t in r.topics.slice(0, 3)" :key="t" class="lbl lbl-tag">{{ t }}</span></span>' +
'          </div>' +
'        </div>' +
'        <div class="row-side" style="gap:12px">' +
'          <span class="stars" :title="U.num(r.stargazers_count) + \' 星标\'">' +
'            <icon name="star" :size="12"></icon>{{ U.compact(r.stargazers_count) }}</span>' +
'          <span class="stars" style="color:var(--ink-4)" :title="U.num(r.forks_count) + \' 复刻\'">' +
'            <icon name="fork" :size="12"></icon>{{ U.compact(r.forks_count) }}</span>' +
'          <span class="nowrap" style="min-width:46px;text-align:right" :title="U.abs(r.pushed_at)">' +
'            {{ U.rel(r.pushed_at) }}</span>' +
'          <button class="btn btn-sm btn-quiet" :title="starOn(r) ? \'取消星标\' : \'加星标\'" ' +
'                  @click="toggleStar(r, $event)">' +
'            <icon :name="starOn(r) ? \'starFill\' : \'star\'" :size="13" ' +
'                  :style="{color: starOn(r) ? \'var(--warn)\' : \'var(--ink-4)\'}"></icon></button>' +
'        </div>' +
'      </a>' +
'    </div>' +

'    <pager v-if="!loading && items.length" :page="page" :has-next="hasNext" :has-prev="hasPrev" ' +
'           @go="go"></pager>' +
'  </div>' +

'  <p class="dimmer xs" style="margin:0">' +
'    GitHub 没有官方的「热门」接口，本页由搜索语法近似得出，结果与 github.com/trending 不会完全一致。' +
'    搜索接口限流较严，请勿频繁切换条件。</p>' +
'</div>'
  };

  window.VIEWS.trends = Trends;
})();
