/* ============================================================
   views/stars.js — starred repositories
   ============================================================ */
(function () {
  'use strict';
  const C = window.C;

  const Stars = {
    components: C,
    props: { route: Object, shell: Object },
    data: function () {
      return {
        loading: true, err: '', items: [], page: 1,
        hasNext: false, hasPrev: false, filter: '', lang: ''
      };
    },
    computed: {
      langs: function () {
        const m = {};
        this.items.forEach(function (r) { if (r.language) m[r.language] = (m[r.language] || 0) + 1; });
        return Object.keys(m).sort(function (a, b) { return m[b] - m[a]; }).slice(0, 12);
      },
      shown: function () {
        const f = this.filter.trim().toLowerCase(), lang = this.lang;
        return this.items.filter(function (r) {
          if (lang && r.language !== lang) return false;
          if (f && (r.full_name + ' ' + (r.description || '') + ' ' + (r.language || '')).toLowerCase().indexOf(f) < 0) return false;
          return true;
        });
      }
    },
    created: function () { this.load(1); },
    methods: {
      load: async function (p) {
        this.loading = true; this.err = '';
        try {
          const r = await API.starred(p);
          this.items = r.data || [];
          const l = API.links(r);
          this.page = p; this.hasNext = !!l.next; this.hasPrev = p > 1;
          this.$emit('cache', r.cache);
        } catch (e) { this.err = e.message; }
        this.loading = false;
      },
      go: function (p) { this.load(p); },
      unstar: async function (r, ev) {
        ev.stopPropagation(); ev.preventDefault();
        try {
          await API.unstar(r.owner.login, r.name);
          if (this.shell) this.shell.starOn[r.full_name] = false;
          this.items = this.items.filter(function (x) { return x.id !== r.id; });
          U.toast('已取消星标 ' + r.full_name);
        } catch (e) { U.toast('操作失败：' + e.message, 'bad'); }
      }
    },
    template:
'<div>' +
'  <div style="display:flex;align-items:flex-end;gap:16px;margin-bottom:18px;flex-wrap:wrap">' +
'    <div style="flex:1;min-width:200px">' +
'      <div class="eyebrow">收藏</div>' +
'      <h1 style="margin-top:5px">星标仓库</h1>' +
'      <p class="muted-line" style="margin:5px 0 0">你收藏过的仓库，按收藏时间倒序</p>' +
'    </div>' +
'  </div>' +

'  <div class="card">' +
'    <div class="card-head" style="gap:9px;flex-wrap:wrap">' +
'      <span style="position:relative;display:flex;align-items:center;flex:1;min-width:170px;max-width:300px">' +
'        <icon name="search" :size="13" style="position:absolute;left:9px;color:var(--ink-4)"></icon>' +
'        <input class="input" v-model="filter" placeholder="筛选本页…" style="padding-left:28px"></span>' +
'      <span style="flex:1"></span>' +
'      <button class="btn btn-sm" :style="lang ? {borderColor:\'var(--ink-3)\'} : {}" ' +
'              @click="lang = \'\'">{{ lang ? "清除语言筛选" : "按语言筛选" }}</button>' +
'    </div>' +
'    <div v-if="langs.length" class="card-head" style="gap:6px;flex-wrap:wrap;background:var(--paper-2)">' +
'      <span v-for="l in langs" :key="l" class="lbl lbl-tag" ' +
'            :style="{cursor:\'pointer\', background: lang === l ? \'var(--paper)\' : \'\', borderColor: lang === l ? \'var(--ink-3)\' : \'\'}" ' +
'            @click="lang = (lang === l ? \'\' : l)">' +
'        <span class="lang-dot" :style="{background: U.langColor(l)}"></span>{{ l }}</span>' +
'    </div>' +

'    <div v-if="err" class="banner banner-bad" style="margin:14px">' +
'      <icon name="alert" :size="14"></icon><span>{{ err }}</span></div>' +

'    <div v-if="loading"><skel-rows :n="7"></skel-rows></div>' +
'    <div v-else-if="!shown.length" class="empty">' +
'      <icon name="star" :size="24"></icon><b>没有匹配的仓库</b>' +
'      <p v-if="filter || lang">试试清除筛选条件</p>' +
'      <p v-else>还没有收藏任何仓库</p></div>' +

'    <div v-else class="row-list">' +
'      <a v-for="r in shown" :key="r.id" class="row" :href="\'#/\' + r.full_name">' +
'        <avatar :src="r.owner && r.owner.avatar_url" :alt="r.owner && r.owner.login" :size="24" square></avatar>' +
'        <div class="row-main">' +
'          <div class="row-title"><span class="t">{{ r.full_name }}</span>' +
'            <span v-if="r.archived" class="badge">已归档</span></div>' +
'          <div v-if="r.description" class="dim" style="font-size:12.5px;margin-top:3px">{{ r.description }}</div>' +
'          <div class="row-meta"><lang-dot v-if="r.language" :lang="r.language"></lang-dot>' +
'            <span v-if="r.license && r.license.spdx_id && r.license.spdx_id !== \'NOASSERTION\'">· {{ U.license(r.license) }}</span></div>' +
'        </div>' +
'        <div class="row-side">' +
'          <span class="stars"><icon name="star" :size="12"></icon>{{ U.compact(r.stargazers_count) }}</span>' +
'          <span class="stars u-fork" style="color:var(--ink-4)"><icon name="fork" :size="12"></icon>{{ U.compact(r.forks_count) }}</span>' +
'          <button class="btn btn-sm btn-quiet" title="取消星标" @click="unstar(r, $event)">' +
'            <icon name="starFill" :size="13" style="color:var(--warn)"></icon></button>' +
'        </div>' +
'      </a>' +
'    </div>' +
'    <pager v-if="!loading && shown.length" :page="page" :has-next="hasNext" :has-prev="hasPrev" @go="go"></pager>' +
'  </div>' +
'</div>'
  };

  window.VIEWS.stars = Stars;
})();
