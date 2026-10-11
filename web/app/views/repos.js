/* ============================================================
   views/repos.js — my repositories + starred (shares row layout)
   ============================================================ */
(function () {
  'use strict';
  const C = window.C;

  const Repos = {
    components: C,
    props: { route: Object, shell: Object },
    data: function () {
      return {
        loading: true, err: '',
        items: [], page: 1, hasNext: false, hasPrev: false,
        filter: '', type: 'all', sort: 'pushed', lang: ''
      };
    },
    computed: {
      isStars: function () { return this.route.name === 'stars'; },
      title: function () { return this.isStars ? '星标仓库' : '我的仓库'; },
      sub: function () {
        return this.isStars
          ? '你收藏过的所有仓库，按收藏顺序排列'
          : '你名下与参与的所有仓库，按最近推送排序';
      },
      langs: function () {
        const m = {};
        this.items.forEach(function (r) { if (r.language) m[r.language] = 1; });
        return Object.keys(m).sort();
      },
      shown: function () {
        const f = this.filter.trim().toLowerCase();
        return this.items.filter(function (r) {
          if (f && (r.full_name + ' ' + (r.description || '')).toLowerCase().indexOf(f) < 0) return false;
          return true;
        });
      }
    },
    created: function () { this.load(1); },
    methods: {
      load: async function (p) {
        this.loading = true; this.err = '';
        const self = this;
        try {
          const r = this.isStars
            ? await API.starred(p)
            : await API.myRepos(p, { type: this.type === 'all' ? undefined : this.type, sort: this.sort });
          self.items = r.data || [];
          const l = API.links(r);
          self.page = p;
          self.hasNext = !!l.next;
          self.hasPrev = p > 1;
          self.$emit('cache', r.cache);
        } catch (e) { self.err = e.message; }
        self.loading = false;
      },
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
          if (on) { await API.unstar(r.owner.login, r.name); sh.starOn[k] = false; }
          else { await API.star(r.owner.login, r.name); sh.starOn[k] = true; }
          U.toast(on ? '已取消星标' : '已加星标');
        } catch (e) { U.toast('操作失败：' + e.message, 'bad'); }
      }
    },
    template:
'<div>' +
'  <div style="display:flex;align-items:flex-end;gap:16px;margin-bottom:18px;flex-wrap:wrap">' +
'    <div style="flex:1;min-width:200px">' +
'      <div class="eyebrow">{{ isStars ? "收藏" : "项目" }}</div>' +
'      <h1 style="margin-top:5px">{{ title }}</h1>' +
'      <p class="muted-line" style="margin:5px 0 0">{{ sub }}</p>' +
'    </div>' +
'  </div>' +

'  <div class="card">' +
'    <div class="card-head" style="gap:8px;flex-wrap:wrap">' +
'      <span style="position:relative;display:flex;align-items:center;flex:1;min-width:170px;max-width:300px">' +
'        <icon name="search" :size="14" style="position:absolute;left:9px;color:var(--ink-4)"></icon>' +
'        <input class="input" v-model="filter" placeholder="在本页筛选…" style="padding-left:30px">' +
'      </span>' +
'      <span style="flex:1"></span>' +
'      <span v-if="!isStars" class="seg">' +
'        <button :class="{on: type===\'all\'}" @click="type=\'all\'; load(1)">全部</button>' +
'        <button :class="{on: type===\'public\'}" @click="type=\'public\'; load(1)">公开</button>' +
'        <button :class="{on: type===\'private\'}" @click="type=\'private\'; load(1)">私有</button>' +
'        <button :class="{on: type===\'forks\'}" @click="type=\'forks\'; load(1)">Fork</button>' +
'        <button :class="{on: type===\'archived\'}" @click="type=\'archived\'; load(1)">归档</button>' +
'      </span>' +
'      <span v-if="!isStars" class="seg">' +
'        <button :class="{on: sort===\'pushed\'}" @click="sort=\'pushed\'; load(1)">推送</button>' +
'        <button :class="{on: sort===\'updated\'}" @click="sort=\'updated\'; load(1)">更新</button>' +
'        <button :class="{on: sort===\'created\'}" @click="sort=\'created\'; load(1)">创建</button>' +
'        <button :class="{on: sort===\'full_name\'}" @click="sort=\'full_name\'; load(1)">名称</button>' +
'      </span>' +
'    </div>' +

'    <div v-if="err" class="banner banner-bad" style="margin:14px">' +
'      <icon name="alert" :size="14"></icon><span>{{ err }}</span></div>' +

'    <div v-if="loading"><skel-rows :n="7"></skel-rows></div>' +
'    <div v-else-if="!shown.length" class="empty">' +
'      <icon name="repo" :size="24"></icon>' +
'      <b>没有匹配的仓库</b>' +
'      <p v-if="filter">试试清空筛选条件</p>' +
'      <p v-else>{{ isStars ? "还没有收藏任何仓库" : "这个分类下没有仓库" }}</p></div>' +

'    <div v-else class="row-list">' +
'      <a v-for="r in shown" :key="r.id" class="row" :href="\'#/\' + r.full_name">' +
'        <avatar :src="r.owner && r.owner.avatar_url" :alt="r.owner && r.owner.login" :size="24" square></avatar>' +
'        <div class="row-main">' +
'          <div class="row-title">' +
'            <span class="t" style="font-weight:600">{{ r.full_name }}</span>' +
'            <span v-if="r.private" class="badge"><icon name="lock" :size="10"></icon>私有</span>' +
'            <span v-if="r.fork" class="badge">fork</span>' +
'            <span v-if="r.archived" class="badge">已归档</span>' +
'            <span v-if="r.is_template" class="badge">模板</span></div>' +
'          <div class="row-meta">' +
'            <lang-dot v-if="r.language" :lang="r.language"></lang-dot>' +
'            <span v-else>—</span>' +
'            <span v-if="r.license && r.license.spdx_id && r.license.spdx_id !== \'NOASSERTION\'">·</span>' +
'            <span v-if="r.license">{{ U.license(r.license) }}</span>' +
'          </div>' +
'          <div v-if="r.description" class="dim" style="font-size:12.5px;margin-top:4px;font-family:var(--sans)">{{ r.description }}</div>' +
'        </div>' +
'        <div class="row-side" style="gap:12px">' +
'          <span class="stars" :title="U.num(r.stargazers_count) + \' 星标\'"><icon name="star" :size="12"></icon>{{ U.compact(r.stargazers_count) }}</span>' +
'          <span class="stars u-fork" :title="U.num(r.forks_count) + \' 复刻\'" style="color:var(--ink-4)">' +
'            <icon name="fork" :size="12"></icon>{{ U.compact(r.forks_count) }}</span>' +
'          <span class="nowrap" style="min-width:46px;text-align:right" :title="U.abs(r.pushed_at)">' +
'            {{ U.rel(r.pushed_at) }}</span>' +
'          <button class="btn btn-sm btn-quiet" :title="starOn(r) ? \'取消星标\' : \'加星标\'" @click="toggleStar(r, $event)">' +
'            <icon :name="starOn(r) ? \'starFill\' : \'star\'" :size="13" ' +
'                  :style="{color: starOn(r) ? \'var(--warn)\' : \'var(--ink-4)\'}"></icon></button>' +
'        </div>' +
'      </a>' +
'    </div>' +

'    <pager v-if="!loading && shown.length" :page="page" :has-next="hasNext" :has-prev="hasPrev" ' +
'           @go="go"></pager>' +
'  </div>' +
'</div>'
  };

  window.VIEWS.repos = Repos;
})();
