/* ============================================================
   views/compare.js — compare two refs
   ============================================================ */
(function () {
  'use strict';
  const C = window.C;

  const Compare = {
    components: C,
    props: { route: Object, shell: Object },
    data: function () {
      return { loading: true, err: '', cmp: null, files: [], filter: '' };
    },
    computed: {
      o: function () { return this.route.params.owner; },
      r: function () { return this.route.params.repo; },
      full: function () { return this.o + '/' + this.r; },
      spec: function () {
        const s = this.route.params.spec || '';
        const i = s.indexOf('...');
        return i < 0 ? { base: s, head: '' } : { base: s.slice(0, i), head: s.slice(i + 3) };
      },
      filtered: function () {
        const f = this.filter.trim().toLowerCase();
        return f ? this.files.filter(function (x) { return (x.filename || '').toLowerCase().indexOf(f) >= 0; }) : this.files;
      }
    },
    created: function () { this.load(); },
    methods: {
      load: async function () {
        this.loading = true; this.err = '';
        const self = this;
        const s = this.spec;
        if (!s.base || !s.head) { this.err = '比较格式应为 base...head'; this.loading = false; return; }
        try {
          const c = await API.compare(this.o, this.r, s.base, s.head);
          self.cmp = c;
          self.files = c.files || [];
        } catch (e) { this.err = e.message; }
        this.loading = false;
      }
    },
    template:
'<div v-if="loading"><div class="skel" style="height:20px;width:44%"></div>' +
'  <div style="margin-top:18px"><skel-rows :n="5"></skel-rows></div></div>' +

'<div v-else-if="err" class="card"><div class="empty" style="padding:52px">' +
'  <icon name="alert" :size="24"></icon><b>{{ err }}</b></div></div>' +

'<div v-else-if="cmp">' +
'  <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">' +
'    <h1 style="font-size:19px">比较 <span class="mono">{{ spec.base }}</span> ← ' +
'      <span class="mono">{{ spec.head }}</span></h1>' +
'    <span style="flex:1"></span>' +
'    <span class="badge" :class="{ \'badge-ok\': cmp.status === \'ahead\' }">' +
'      {{ cmp.status === "ahead" ? "领先 " + cmp.ahead_by + " 个提交" : (cmp.status === "behind" ? "落后" : cmp.status) }}</span>' +
'  </div>' +

'  <div class="card" style="margin-bottom:14px">' +
'    <div class="card-head" style="gap:10px;flex-wrap:wrap">' +
'      <span class="mono-num" style="color:var(--ok)">+{{ cmp.files.reduce(function(s,f){return s+f.additions},0) }}</span>' +
'      <span class="mono-num" style="color:var(--alarm)">−{{ cmp.files.reduce(function(s,f){return s+f.deletions},0) }}</span>' +
'      <span class="sm dim">{{ cmp.files.length }} 个文件 · {{ cmp.total_commits }} 个提交</span>' +
'      <span style="flex:1"></span>' +
'      <span style="position:relative;display:flex;align-items:center;min-width:170px">' +
'        <icon name="search" :size="13" style="position:absolute;left:9px;color:var(--ink-4)"></icon>' +
'        <input class="input" v-model="filter" placeholder="筛选文件…" style="padding-left:28px"></span>' +
'    </div>' +
'    <div v-if="!files.length" class="empty" style="padding:40px">' +
'      <icon name="check" :size="22"></icon><b>两个引用之间没有差异</b></div>' +
'    <div v-for="f in filtered" :key="f.sha || f.filename" class="diff-file" style="border-bottom:1px solid var(--rule)">' +
'      <div class="diff-file-head" style="position:static">' +
'        <span class="badge" :class="{ \'badge-ok\': f.status === \'added\', \'badge-alarm\': f.status === \'removed\', \'badge-warn\': f.status === \'modified\' }">{{ f.status }}</span>' +
'        <span class="mono trunc" style="color:var(--ink-2);min-width:0">{{ f.filename }}</span>' +
'        <span class="mono dimmer xs">+{{ f.additions }} −{{ f.deletions }}</span></div>' +
'      <diff-view v-if="f.patch" :patch="\'diff --git a/\' + f.filename + \' b/\' + f.filename + \'\\n\' + f.patch"></diff-view>' +
'      <div v-else class="diff-empty">差异过大，GitHub 未返回补丁</div>' +
'    </div>' +
'  </div>' +

'  <div class="card" v-if="cmp.commits && cmp.commits.length">' +
'    <div class="card-head"><icon name="commit" :size="14"></icon><h3>包含的提交</h3>' +
'      <span style="flex:1"></span><span class="mono-num dimmer">{{ cmp.commits.length }}</span></div>' +
'    <div class="row-list">' +
'      <a v-for="c in cmp.commits" :key="c.sha" class="row" :href="\'#/\' + full + \'/commit/\' + c.sha">' +
'        <avatar :src="c.author && c.author.avatar_url" :alt="c.author && c.author.login" :size="22" square></avatar>' +
'        <div class="row-main"><div class="row-title">' +
'          <span class="t" style="font-size:13.5px">{{ U.firstLine(c.commit.message, 96) }}</span></div>' +
'          <div class="row-meta"><span>{{ (c.commit.author||{}).name }}</span><span>·</span>' +
'          <span class="mono">{{ (c.sha||"").slice(0,7) }}</span><span>·</span>' +
'          <rel-time :iso="(c.commit.author||{}).date"></rel-time></div></div>' +
'        <icon name="right" :size="14" style="color:var(--rule-3)"></icon>' +
'      </a>' +
'    </div>' +
'  </div>' +
'</div>'
  };

  window.VIEWS.compare = Compare;
})();
