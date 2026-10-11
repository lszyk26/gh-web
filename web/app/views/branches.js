/* ============================================================
   views/branches.js — branches & tags
   ============================================================ */
(function () {
  'use strict';
  const C = window.C;

  const Branches = {
    components: C,
    props: { route: Object, shell: Object },
    data: function () {
      return {
        loading: true, err: '', tab: 'branches',
        branches: [], tags: [], repo: null, filter: '',
        counts: {}
      };
    },
    computed: {
      o: function () { return this.route.params.owner; },
      r: function () { return this.route.params.repo; },
      full: function () { return this.o + '/' + this.r; },
      def: function () { return this.repo ? this.repo.default_branch : ''; },
      list: function () {
        const self = this;
        const f = this.filter.trim().toLowerCase();
        const src = this.tab === 'branches' ? this.branches : this.tags;
        return src.filter(function (b) {
          return !f || (b.name || '').toLowerCase().indexOf(f) >= 0;
        });
      },
      shown: function () {
        const self = this;
        return this.list;
      }
    },
    watch: { '$route.params.repo': function () { this.boot(); } },
    created: function () { this.boot(); },
    methods: {
      boot: async function () {
        const self = this;
        try { self.repo = await API.repo(this.o, this.r); } catch (e) { }
        this.load();
      },
      load: async function () {
        this.loading = true; this.err = '';
        const self = this;
        try {
          const b = await API.branches(this.o, this.r);
          self.branches = b.data || [];
          self.$emit('cache', b.cache);
          const t = await API.tags(this.o, this.r);
          self.tags = t.data || [];
          self.branchPage = 1;
        } catch (e) { self.err = e.message; }
        this.loading = false;
      },
      isDefault: function (b) { return b.name === this.def; },
      behind: function (b) { return null; },
      tagCommit: function (t) { return t.commit && t.commit.sha; },
      tagMsg: function (t) {
        return (t.commit && t.commit.commit && t.commit.commit.message) || '';
      },
      openBranch: function (b) { this.$emit('nav', '#/' + this.full + '/code/tree/' + encodeURIComponent(b.name)); },
      openTag: function (t) { this.$emit('nav', '#/' + this.full + '/code/tree/' + encodeURIComponent(t.name)); },
      openCommit: function (sha) { this.$emit('nav', '#/' + this.full + '/commit/' + sha); }
    },
    template:
'<div>' +
'  <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">' +
'    <h1 style="font-size:19px"><a :href="\'#/\' + o" style="color:var(--ink-3);font-weight:400">{{ o }}</a>' +
'      <span class="dimmer" style="font-weight:300">/</span>' +
'      <a :href="\'#/\' + full" style="font-weight:700">{{ r }}</a>' +
'      <span class="dimmer" style="font-weight:300">/</span>分支与标签</h1>' +
'  </div>' +

'  <div class="tabs">' +
'    <div class="tab" :class="{on: tab===\'branches\'}" @click="tab=\'branches\'">' +
'      <icon name="branch" :size="14"></icon>分支 <span class="n">{{ branches.length }}</span></div>' +
'    <div class="tab" :class="{on: tab===\'tags\'}" @click="tab=\'tags\'">' +
'      <icon name="tag" :size="14"></icon>标签 <span class="n">{{ tags.length }}</span></div>' +
'  </div>' +

'  <div v-if="err" class="banner banner-bad" style="margin-bottom:14px">' +
'    <icon name="alert" :size="14"></icon><span>{{ err }}</span></div>' +

'  <div class="card">' +
'    <div class="card-head" style="gap:9px">' +
'      <span style="position:relative;display:flex;align-items:center;flex:1;max-width:320px">' +
'        <icon name="search" :size="13" style="position:absolute;left:9px;color:var(--ink-4)"></icon>' +
'        <input class="input" v-model="filter" :placeholder="tab === \'branches\' ? \'筛选分支…\' : \'筛选标签…\'" ' +
'               style="padding-left:28px"></span>' +
'      <span style="flex:1"></span>' +
'      <button class="btn btn-sm btn-quiet" @click="load"><icon name="refresh" :size="13"></icon></button>' +
'    </div>' +

'    <div v-if="loading"><skel-rows :n="8"></skel-rows></div>' +
'    <div v-else-if="!shown.length" class="empty">' +
'      <icon :name="tab === \'branches\' ? \'branch\' : \'tag\'" :size="24"></icon>' +
'      <b>{{ tab === "branches" ? "没有匹配的分支" : "没有匹配的标签" }}</b></div>' +

'    <div v-else class="row-list">' +
'      <div v-for="b in shown" :key="b.name" class="row">' +
'        <icon :name="tab === \'branches\' ? \'branch\' : \'tag\'" :size="15" ' +
'              :style="{color: tab === \'branches\' ? \'var(--ink-4)\' : \'var(--accent)\', marginTop:\'2px\'}"></icon>' +
'        <div class="row-main">' +
'          <div class="row-title">' +
'            <a class="t mono" style="font-size:12.5px" @click="openBranch(b)">{{ b.name }}</a>' +
'            <span v-if="tab === \'branches\' && isDefault(b)" class="badge badge-ink">默认</span>' +
'            <span v-if="tab === \'branches\' && b.protected" class="badge badge-warn">' +
'              <icon name="shield" :size="10"></icon>受保护</span></div>' +
'          <div class="row-meta" v-if="tab === \'tags\'">' +
'            <span>{{ U.firstLine(tagMsg(b), 90) }}</span></div>' +
'        </div>' +
'        <div class="row-side">' +
'          <a v-if="b.commit" class="mono" :href="\'#/\' + full + \'/commit/\' + b.commit.sha" ' +
'             :title="(b.commit.sha || \'\') + \' · \' + ((b.commit.commit && b.commit.commit.message) || \'\')">' +
'            {{ (b.commit.sha || "").slice(0, 7) }}</a>' +
'          <button class="btn btn-sm btn-quiet" title="复制名称" @click="U.copy(b.name, \'名称已复制\')">' +
'            <icon name="copy" :size="12"></icon></button>' +
'        </div>' +
'      </div>' +
'    </div>' +
'  </div>' +
'</div>'
  };

  window.VIEWS.branches = Branches;
})();
