/* ============================================================
   views/pulls.js — pull request list
   ============================================================ */
(function () {
  'use strict';
  const C = window.C;

  const Pulls = {
    components: C,
    props: { route: Object, shell: Object },
    data: function () {
      return {
        loading: true, err: '',
        items: [], page: 1, hasNext: false, hasPrev: false,
        state: 'open', sort: 'created', q: '',
        counts: { open: null, closed: null, merged: null }
      };
    },
    computed: {
      o: function () { return this.route.params.owner; },
      r: function () { return this.route.params.repo; },
      full: function () { return this.o + '/' + this.r; },
      query: function () {
        const p = ['repo:' + this.full, 'is:pr'];
        if (this.state === 'open') p.push('is:open');
        else if (this.state === 'closed') p.push('is:closed', 'is:unmerged');
        else p.push('is:merged');
        if (this.q.trim()) p.push(this.q.trim());
        return p.join(' ');
      },
      sortOpts: function () {
        return [
          { k: 'created', l: '最新创建' },
          { k: 'updated', l: '最近更新' },
          { k: 'popularity', l: '热度最高' },
          { k: 'long-running', l: '最久未合' }
        ];
      },
      spark: function () { return null; }
    },
    created: function () { this.load(1); },
    methods: {
      load: async function (p) {
        this.loading = true; this.err = '';
        const self = this;
        try {
          const r = await API.searchIssues(this.query, p, this.sort);
          self.items = r.data.items || [];
          self.page = p;
          const l = API.links(r);
          self.hasNext = !!l.next; self.hasPrev = p > 1;
          self.$emit('cache', r.cache);
          self.loadCounts();
        } catch (e) {
          self.err = e.status === 403 ? '搜索接口限流，请稍后再试' : e.message;
        }
        self.loading = false;
      },
      loadCounts: function () {
        const self = this, base = 'repo:' + this.full + ' is:pr ';
        API.searchIssues(base + 'is:open', 1).then(function (x) { self.counts.open = x.data.total_count; }).catch(function () { });
        API.searchIssues(base + 'is:closed is:unmerged', 1).then(function (x) { self.counts.closed = x.data.total_count; }).catch(function () { });
        API.searchIssues(base + 'is:merged', 1).then(function (x) { self.counts.merged = x.data.total_count; }).catch(function () { });
      },
      setState: function (s) { this.state = s; this.load(1); },
      go: function (p) { this.load(p); },
      href: function (it) { return '#/' + this.full + '/pulls/' + it.number; },
      checkState: function (it) {
        const pr = it.pull_request || {};
        if (pr.merged_at) return 'merged';
        return it.state === 'open' ? 'open' : 'closed';
      }
    },
    template:
'<div>' +
'  <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">' +
'    <h1 style="font-size:19px"><a :href="\'#/\' + o" style="color:var(--ink-3);font-weight:400">{{ o }}</a>' +
'      <span class="dimmer" style="font-weight:300">/</span>' +
'      <a :href="\'#/\' + full" style="font-weight:700">{{ r }}</a>' +
'      <span class="dimmer" style="font-weight:300">/</span>拉取请求</h1>' +
'    <span style="flex:1"></span>' +
'    <a class="btn btn-sm btn-quiet" :href="\'#/\' + full + \'/issues\'">' +
'      <icon name="issue" :size="13"></icon>议题</a>' +
'  </div>' +

'  <div class="card">' +
'    <div class="card-head" style="gap:9px;flex-wrap:wrap">' +
'      <span class="seg">' +
'        <button :class="{on: state===\'open\'}" @click="setState(\'open\')">' +
'          <icon name="pr" :size="12"></icon>开放<template v-if="counts.open!==null"> {{ counts.open }}</template></button>' +
'        <button :class="{on: state===\'merged\'}" @click="setState(\'merged\')">' +
'          <icon name="gitMerge" :size="12"></icon>已合并<template v-if="counts.merged!==null"> {{ counts.merged }}</template></button>' +
'        <button :class="{on: state===\'closed\'}" @click="setState(\'closed\')">' +
'          <icon name="x" :size="12"></icon>已关闭<template v-if="counts.closed!==null"> {{ counts.closed }}</template></button>' +
'      </span>' +
'      <span style="position:relative;display:flex;align-items:center;flex:1;min-width:150px;max-width:280px">' +
'        <icon name="search" :size="13" style="position:absolute;left:9px;color:var(--ink-4)"></icon>' +
'        <input class="input" v-model="q" placeholder="筛选标题…" style="padding-left:28px" ' +
'               @keydown.enter="load(1)"></span>' +
'      <span style="flex:1"></span>' +
'      <dropdown align="right" :width="180">' +
'        <template #trigger><button class="btn btn-sm">' +
'          <icon name="sort" :size="13"></icon>{{ sortOpts.find(function(o){return o.k===sort}).l }}</button></template>' +
'        <template #menu><div v-for="s in sortOpts" :key="s.k" class="pop-item" @click="sort=s.k; load(1)">' +
'          <icon v-if="sort===s.k" name="check" :size="13"></icon>' +
'          <span v-else style="width:13px"></span>{{ s.l }}</div></template>' +
'      </dropdown>' +
'    </div>' +

'    <div v-if="err" class="banner banner-bad" style="margin:14px">' +
'      <icon name="alert" :size="14"></icon><span>{{ err }}</span></div>' +

'    <div v-if="loading"><skel-rows :n="8"></skel-rows></div>' +
'    <div v-else-if="!items.length" class="empty">' +
'      <icon name="pr" :size="24"></icon>' +
'      <b>没有{{ state === "open" ? "开放中" : (state === "merged" ? "已合并" : "已关闭") }}的拉取请求</b></div>' +

'    <div v-else class="row-list">' +
'      <a v-for="it in items" :key="it.id" class="row" :href="href(it)">' +
'        <span style="margin-top:1px" :title="checkState(it)">' +
'          <icon :name="checkState(it) === \'merged\' ? \'gitMerge\' : \'pr\'" :size="15" :sw="2.1" ' +
'                :style="{color: checkState(it) === \'merged\' ? \'var(--accent)\' : (checkState(it) === \'open\' ? \'var(--ok)\' : \'var(--alarm)\')}"></icon></span>' +
'        <div class="row-main">' +
'          <div class="row-title"><span class="t">{{ it.title }}</span>' +
'            <span v-if="it.draft" class="lbl lbl-draft">草稿</span></div>' +
'          <div class="row-meta">' +
'            <span class="mono">#{{ it.number }}</span><span>·</span>' +
'            <span>{{ it.user && it.user.login }}</span><span>·</span>' +
'            <rel-time :iso="it.created_at"></rel-time>' +
'            <template v-if="it.comments"><span>·</span>' +
'              <span><icon name="comment" :size="11"></icon> {{ it.comments }}</span></template></div>' +
'          <div v-if="it.labels && it.labels.length" style="display:flex;gap:5px;flex-wrap:wrap;margin-top:7px">' +
'            <span v-for="l in it.labels.slice(0, 6)" :key="l.id" class="lbl" ' +
'                  :style="{background: \'#\' + l.color + \'1f\', borderColor: \'#\' + l.color + \'55\', color: \'#\' + l.color}">' +
'              <span class="dot"></span>{{ l.name }}</span></div>' +
'        </div>' +
'        <div v-if="it.assignee" class="row-side">' +
'          <avatar :src="it.assignee.avatar_url" :alt="it.assignee.login" :size="20"></avatar></div>' +
'      </a>' +
'    </div>' +
'    <pager v-if="!loading && items.length" :page="page" :has-next="hasNext" :has-prev="hasPrev" @go="go"></pager>' +
'  </div>' +
'</div>'
  };

  window.VIEWS.pulls = Pulls;
})();
