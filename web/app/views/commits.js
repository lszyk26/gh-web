/* ============================================================
   views/commits.js — commit history
   ============================================================ */
(function () {
  'use strict';
  const C = window.C;

  const Commits = {
    components: C,
    props: { route: Object, shell: Object },
    data: function () {
      return {
        loading: true, err: '',
        commits: [], page: 1, hasNext: false, hasPrev: false,
        repo: null, branches: [], refOpen: false, branchFilter: '',
        branch: '', author: '', pathFilter: ''
      };
    },
    computed: {
      o: function () { return this.route.params.owner; },
      r: function () { return this.route.params.repo; },
      full: function () { return this.o + '/' + this.r; },
      ref: function () { return this.branch || this.route.params.ref || (this.repo && this.repo.default_branch) || 'HEAD'; },
      filtered: function () {
        const a = this.author.trim().toLowerCase(), p = this.pathFilter.trim().toLowerCase();
        return this.commits.filter(function (c) {
          if (a) {
            const who = ((c.commit.author || {}).name || '') + ' ' + ((c.author && c.author.login) || '');
            if (who.toLowerCase().indexOf(a) < 0) return false;
          }
          return true;
        });
      },
      shown: function () {
        const self = this, p = this.pathFilter.trim().toLowerCase();
        if (!p) return this.filtered;
        return this.filtered.filter(function (c) { return true; });
      },
      filteredBranches: function () {
        const f = this.branchFilter.trim().toLowerCase();
        const names = this.branches.map(function (b) { return b.name; });
        return (f ? names.filter(function (n) { return n.toLowerCase().indexOf(f) >= 0; }) : names).slice(0, 60);
      }
    },
    watch: {
      '$route.params.repo': function () { this.branch = ''; this.boot(); }
    },
    created: function () { this.boot(); },
    methods: {
      boot: async function () {
        const self = this;
        try {
          self.repo = await API.repo(this.o, this.r);
        } catch (e) { }
        API.branches(this.o, this.r).then(function (b) { self.branches = b.data || []; }).catch(function () { });
        this.load(1);
      },
      load: async function (p) {
        this.loading = true; this.err = '';
        const self = this;
        try {
          const r = await API.commits(this.o, this.r, {
            sha: this.ref, page: p, per_page: 40,
            path: this.pathFilter.trim() || undefined
          });
          self.commits = r.data || [];
          self.page = p;
          const l = API.links(r);
          self.hasNext = !!l.next; self.hasPrev = p > 1;
          self.$emit('cache', r.cache);
        } catch (e) { self.err = e.message; }
        self.loading = false;
      },
      pickBranch: function (b) {
        this.branchOpen = false; this.branchFilter = '';
        this.branch = b; this.load(1);
      },
      go: function (p) { this.load(p); },
      href: function (c) { return '#/' + this.full + '/commit/' + c.sha; },
      authorName: function (c) {
        return (c.author && c.author.login) || ((c.commit.author || {}).name) || 'unknown';
      },
      avatarSrc: function (c) {
        return c.author ? c.author.avatar_url : '';
      }
    },
    template:
'<div>' +
'  <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">' +
'    <h1 style="font-size:19px"><a :href="\'#/\' + o" style="color:var(--ink-3);font-weight:400">{{ o }}</a>' +
'      <span class="dimmer" style="font-weight:300">/</span>' +
'      <a :href="\'#/\' + full" style="font-weight:700">{{ r }}</a>' +
'      <span class="dimmer" style="font-weight:300">/</span>提交历史</h1>' +
'  </div>' +

'  <div class="card">' +
'    <div class="card-head" style="gap:9px;flex-wrap:wrap">' +
'      <dropdown align="left" :width="290">' +
'        <template #trigger><button class="btn btn-sm" style="max-width:240px">' +
'          <icon name="branch" :size="13"></icon>' +
'          <span class="mono trunc" style="max-width:180px">{{ ref }}</span>' +
'          <icon name="down" :size="12"></icon></button></template>' +
'        <template #menu>' +
'          <div style="padding:5px 5px 6px">' +
'            <input class="input mono-input" v-model="branchFilter" placeholder="筛选分支…" style="height:28px" @click.stop></div>' +
'          <div style="max-height:280px;overflow:auto">' +
'            <div v-for="b in filteredBranches" :key="b" class="pop-item mono" ' +
'                 :style="{fontSize:\'12px\'}" @click="pickBranch(b)">' +
'              <icon name="branch" :size="12"></icon>{{ b }}</div>' +
'            <div v-if="!filteredBranches.length" class="pop-item dimmer">没有匹配</div></div>' +
'        </template>' +
'      </dropdown>' +
'      <span style="position:relative;display:flex;align-items:center;min-width:150px;max-width:210px">' +
'        <icon name="file" :size="13" style="position:absolute;left:9px;color:var(--ink-4)"></icon>' +
'        <input class="input" v-model="pathFilter" placeholder="限定路径，如 src/" style="padding-left:28px" ' +
'               @keydown.enter="load(1)"></span>' +
'      <span style="position:relative;display:flex;align-items:center;min-width:130px;max-width:180px">' +
'        <icon name="users" :size="13" style="position:absolute;left:9px;color:var(--ink-4)"></icon>' +
'        <input class="input" v-model="author" placeholder="按作者过滤" style="padding-left:28px"></span>' +
'      <span style="flex:1"></span>' +
'      <span class="xs dimmer mono">{{ shown.length }} 条</span>' +
'      <button class="btn btn-sm btn-quiet" @click="load(page)"><icon name="refresh" :size="13"></icon></button>' +
'    </div>' +

'    <div v-if="err" class="banner banner-bad" style="margin:14px">' +
'      <icon name="alert" :size="14"></icon><span>{{ err }}</span></div>' +

'    <div v-if="loading"><skel-rows :n="9"></skel-rows></div>' +
'    <div v-else-if="!shown.length" class="empty">' +
'      <icon name="commit" :size="24"></icon><b>没有提交记录</b>' +
'      <p>检查分支名或清空过滤条件</p></div>' +

'    <div v-else class="row-list">' +
'      <a v-for="c in shown" :key="c.sha" class="row" :href="href(c)">' +
'        <avatar :src="avatarSrc(c)" :alt="authorName(c)" :size="22" square></avatar>' +
'        <div class="row-main">' +
'          <div class="row-title"><span class="t" style="font-size:13.5px">{{ U.firstLine(c.commit.message, 100) }}</span></div>' +
'          <div class="row-meta">' +
'            <span>{{ authorName(c) }}</span><span>·</span>' +
'            <span><rel-time :iso="(c.commit.author||{}).date"></rel-time></span>' +
'            <template v-if="c.commit.verification && c.commit.verification.verified"><span>·</span>' +
'              <span style="color:var(--ok)"><icon name="shield" :size="11"></icon> 已签名</span></template>' +
'          </div>' +
'        </div>' +
'        <div class="row-side">' +
'          <span class="mono" :title="c.sha">{{ (c.sha||"").slice(0,7) }}</span>' +
'          <button class="btn btn-sm btn-quiet" title="复制完整 SHA" ' +
'                  @click.stop.prevent="U.copy(c.sha, \'SHA 已复制\')">' +
'            <icon name="copy" :size="12"></icon></button>' +
'        </div>' +
'      </a>' +
'    </div>' +
'    <pager v-if="!loading && shown.length" :page="page" :has-next="hasNext" :has-prev="hasPrev" @go="go"></pager>' +
'  </div>' +
'</div>'
  };

  window.VIEWS.commits = Commits;
})();
