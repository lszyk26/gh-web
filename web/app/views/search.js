/* ============================================================
   views/search.js — repositories / code / issues / users / commits
   ============================================================ */
(function () {
  'use strict';
  const C = window.C;

  const Search = {
    components: C,
    props: { route: Object, shell: Object },
    data: function () {
      return {
        q: '', type: 'repositories',
        loading: false, err: '',
        items: [], total: 0, page: 1, hasNext: false, hasPrev: false,
        sort: '', incomplete: false, took: null
      };
    },
    computed: {
      placeholders: function () { return ''; },
      ph: function () {
        return {
          repositories: '按名称、描述、主题搜索仓库…',
          code: '搜索代码，例如 "useEffect repo:vuejs/core"',
          issues: '搜索议题与拉取请求，例如 "is:open label:bug"',
          users: '搜索用户或组织…',
          commits: '搜索提交信息…'
        }[this.type];
      },
      hint: function () {
        return {
          repositories: '支持限定：language:go stars:>100 user:openai org:vuejs topic:cli',
          code: '需要限定仓库，例如 repo:owner/name 或 org:name',
          issues: '支持 is:open is:closed author:me label:x type:pr',
          users: '支持 type:user / type:org / location:china / followers:>100',
          commits: '支持 author: / committer: / repo: / merge:false'
        }[this.type];
      }
    },
    watch: {
      '$route.query.q': function () { this.sync(); }
    },
    created: function () { this.sync(); },
    methods: {
      sync: function () {
        const q = this.route.query.q || '';
        const t = this.route.query.type || 'repositories';
        this.page = Number(this.route.query.page || 1);
        this.q = q; this.type = t;
        if (q) this.run();
        else { this.items = []; this.total = 0; }
      },
      setType: function (t) {
        this.type = t;
        this.$emit('nav', '#/search?q=' + encodeURIComponent(this.q) + '&type=' + t);
      },
      submit: function () {
        if (!this.q.trim()) return;
        this.$emit('nav', '#/search?q=' + encodeURIComponent(this.q.trim()) + '&type=' + this.type);
      },
      run: async function () {
        this.loading = true; this.err = ''; this.items = [];
        const self = this;
        const q = this.q;
        const p = this.page;
        try {
          let r;
          if (this.type === 'repositories') r = await API.searchRepos(q, p, this.sort || undefined);
          else if (this.type === 'code') r = await API.searchCode(q, p);
          else if (this.type === 'issues') r = await API.searchIssues(q, p, this.sort || undefined);
          else if (this.type === 'users') r = await API.searchUsers(q, p);
          else r = await API.searchCommits(q, p);
          self.total = r.data.total_count || 0;
          self.incomplete = !!r.data.incomplete_results;
          self.items = r.data.items || [];
          const l = API.links(r);
          self.hasNext = !!l.next; self.hasPrev = p > 1;
          self.$emit('cache', r.cache);
        } catch (e) {
          self.err = e.status === 403
            ? '搜索接口限流（每分钟 30 次）。稍等片刻再试。'
            : (e.status === 422 ? '搜索语法不合法，检查限定词拼写。' : e.message);
        }
        self.loading = false;
      },
      go: function (p) {
        this.$emit('nav', '#/search?q=' + encodeURIComponent(this.q) + '&type=' + this.type + '&page=' + p);
      },
      open: function (path) { this.$emit('nav', path); },
      repoHref: function (it) { return '#/' + it.full_name; },
      issueHref: function (it) {
        const m = (it.repository_url || '').match(/repos\/([^/]+)\/([^/]+)$/);
        if (!m) return '#/';
        const base = m[1] + '/' + m[2];
        return '#/' + base + (it.pull_request ? '/pulls/' : '/issues/') + it.number;
      }
    },
    template:
'<div>' +
'  <div style="margin-bottom:16px">' +
'    <div class="eyebrow">检索</div>' +
'    <h1 style="margin-top:5px">搜索 GitHub</h1>' +
'  </div>' +

'  <div class="card" style="margin-bottom:16px">' +
'    <div class="card-body">' +
'      <div style="display:flex;gap:9px">' +
'        <span style="position:relative;display:flex;align-items:center;flex:1">' +
'          <icon name="search" :size="15" style="position:absolute;left:11px;color:var(--ink-4)"></icon>' +
'          <input id="global-q" class="input" v-model="q" :placeholder="ph" ' +
'                 style="height:38px;padding-left:35px" @keydown.enter="submit">' +
'        </span>' +
'        <button class="btn btn-dark" style="height:38px;padding:0 18px" @click="submit">搜索</button>' +
'      </div>' +
'      <div style="display:flex;align-items:center;gap:10px;margin-top:11px;flex-wrap:wrap">' +
'        <span class="seg">' +
'          <button :class="{on: type===\'repositories\'}" @click="setType(\'repositories\')">仓库</button>' +
'          <button :class="{on: type===\'code\'}" @click="setType(\'code\')">代码</button>' +
'          <button :class="{on: type===\'issues\'}" @click="setType(\'issues\')">议题/PR</button>' +
'          <button :class="{on: type===\'commits\'}" @click="setType(\'commits\')">提交</button>' +
'          <button :class="{on: type===\'users\'}" @click="setType(\'users\')">用户</button>' +
'        </span>' +
'        <span v-if="type===\'repositories\' || type===\'issues\'" class="seg">' +
'          <button :class="{on: sort===\'\'}" @click="sort=\'\'; run()">最佳匹配</button>' +
'          <button :class="{on: sort===\'stars\'}" @click="sort=\'stars\'; run()">星标</button>' +
'          <button :class="{on: sort===\'updated\'}" @click="sort=\'updated\'; run()">更新</button>' +
'        </span>' +
'        <span style="flex:1"></span>' +
'        <span class="xs dimmer mono">{{ hint }}</span>' +
'      </div>' +
'    </div>' +
'  </div>' +

'  <div v-if="err" class="banner banner-bad" style="margin-bottom:14px">' +
'    <icon name="alert" :size="14"></icon><span>{{ err }}</span></div>' +

'  <div v-if="!q && !loading" class="empty" style="padding:60px 20px">' +
'    <icon name="search" :size="26"></icon><b>输入关键词开始搜索</b>' +
'    <p>提示：按 / 键可以直接聚焦搜索框</p></div>' +

'  <div v-else-if="loading"><skel-rows :n="8"></skel-rows></div>' +

'  <template v-else-if="items.length">' +
'    <div style="display:flex;align-items:center;gap:8px;margin-bottom:11px">' +
'      <span class="mono-num">{{ U.num(total) }}</span>' +
'      <span class="sm dim">条结果</span>' +
'      <span v-if="incomplete" class="badge badge-warn">结果可能不完整</span>' +
'    </div>' +

'    <div class="card">' +

    /* --- repositories --- */
'      <div v-if="type===\'repositories\'" class="row-list">' +
'        <a v-for="it in items" :key="it.id" class="row" :href="repoHref(it)">' +
'          <avatar :src="it.owner && it.owner.avatar_url" :alt="it.owner && it.owner.login" :size="24" square></avatar>' +
'          <div class="row-main">' +
'            <div class="row-title"><span class="t">{{ it.full_name }}</span>' +
'              <span v-if="it.private" class="badge"><icon name="lock" :size="10"></icon>私有</span>' +
'              <span v-if="it.fork" class="badge">fork</span></div>' +
'            <div v-if="it.description" class="dim" style="font-size:12.5px;margin-top:3px">{{ it.description }}</div>' +
'            <div class="row-meta"><lang-dot v-if="it.language" :lang="it.language"></lang-dot>' +
'              <span v-if="it.updated_at">· <rel-time :iso="it.updated_at"></rel-time></span></div>' +
'          </div>' +
'          <div class="row-side">' +
'            <span class="stars"><icon name="star" :size="12"></icon>{{ U.compact(it.stargazers_count) }}</span>' +
'            <span class="stars" style="color:var(--ink-4)"><icon name="fork" :size="12"></icon>{{ U.compact(it.forks_count) }}</span>' +
'          </div>' +
'        </a>' +
'      </div>' +

    /* --- code --- */
'      <div v-else-if="type===\'code\'" class="row-list">' +
'        <a v-for="(it, i) in items" :key="i" class="row" ' +
'           :href="\'#/\' + it.repository.full_name + \'/blob/HEAD/\' + it.path">' +
'          <icon name="file" :size="15" style="color:var(--ink-4);margin-top:2px"></icon>' +
'          <div class="row-main">' +
'            <div class="row-title"><span class="t mono" style="font-size:12.5px">{{ it.path }}</span></div>' +
'            <div class="row-meta"><span>{{ it.repository.full_name }}</span>' +
'              <span v-if="it.name">·</span><span class="mono">{{ it.name }}</span></div>' +
'          </div>' +
'          <icon name="right" :size="14" style="color:var(--rule-3)"></icon>' +
'        </a>' +
'      </div>' +

    /* --- issues / PR --- */
'      <div v-else-if="type===\'issues\'" class="row-list">' +
'        <a v-for="it in items" :key="it.id" class="row" :href="issueHref(it)">' +
'          <state-badge :kind="it.pull_request ? \'pr\' : \'issue\'" :state="it.state" ' +
'                       :draft="it.draft" :merged-at="it.pull_request && it.pull_request.merged_at"></state-badge>' +
'          <div class="row-main">' +
'            <div class="row-title"><span class="t">{{ it.title }}</span></div>' +
'            <div class="row-meta">' +
'              <span>{{ (it.repository_url || "").replace(/.*repos\//, "") }}</span>' +
'              <span>·</span><span>#{{ it.number }}</span>' +
'              <span>·</span><span>{{ it.user && it.user.login }}</span>' +
'              <span>·</span><rel-time :iso="it.updated_at"></rel-time>' +
'              <span v-if="it.comments">·</span>' +
'              <span v-if="it.comments"><icon name="comment" :size="11"></icon> {{ it.comments }}</span></div>' +
'          </div>' +
'          <div class="row-side">' +
'            <span v-for="l in (it.labels || []).slice(0,3)" :key="l.id" class="lbl lbl-tag">{{ l.name }}</span>' +
'          </div>' +
'        </a>' +
'      </div>' +

    /* --- commits --- */
'      <div v-else-if="type===\'commits\'" class="row-list">' +
'        <a v-for="it in items" :key="it.sha" class="row" ' +
'           :href="\'#/\' + it.repository.full_name + \'/commit/\' + it.sha">' +
'          <avatar :src="it.author && it.author.avatar_url" :alt="it.author && it.author.login" :size="22" square></avatar>' +
'          <div class="row-main">' +
'            <div class="row-title"><span class="t" style="font-size:13.5px">{{ U.firstLine(it.commit.message, 96) }}</span></div>' +
'            <div class="row-meta"><span>{{ it.repository.full_name }}</span><span>·</span>' +
'              <span class="mono">{{ (it.sha || "").slice(0, 7) }}</span><span>·</span>' +
'              <span>{{ (it.commit.author || {}).name }}</span><span>·</span>' +
'              <rel-time :iso="(it.commit.author || {}).date"></rel-time></div>' +
'          </div>' +
'        </a>' +
'      </div>' +

    /* --- users --- */
'      <div v-else class="row-list">' +
'        <a v-for="it in items" :key="it.id" class="row" :href="\'#/users/\' + it.login">' +
'          <avatar :src="it.avatar_url" :alt="it.login" :size="30"></avatar>' +
'          <div class="row-main">' +
'            <div class="row-title"><span class="t">{{ it.login }}</span>' +
'              <span v-if="it.type === \'Organization\'" class="badge">组织</span></div>' +
'            <div class="row-meta"><span class="mono">uid {{ it.id }}</span></div>' +
'          </div>' +
'          <icon name="right" :size="14" style="color:var(--rule-3)"></icon>' +
'        </a>' +
'      </div>' +

'    </div>' +
'    <pager :page="page" :has-next="hasNext" :has-prev="hasPrev" :label="U.num(total) + \' 条\'" @go="go"></pager>' +
'  </template>' +

'  <div v-else class="empty" style="padding:56px 20px">' +
'    <icon name="filter" :size="24"></icon><b>没有找到结果</b>' +
'    <p>换个关键词，或减少限定条件试试</p></div>' +
'</div>'
  };

  window.VIEWS.search = Search;
})();
