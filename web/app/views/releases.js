/* ============================================================
   views/releases.js — releases list + single release
   ============================================================ */
(function () {
  'use strict';
  const C = window.C;

  const Releases = {
    components: C,
    props: { route: Object, shell: Object },
    data: function () {
      return {
        loading: true, err: '', items: [], page: 1, hasNext: false, hasPrev: false,
        single: null, assets: [], assetsLoading: false
      };
    },
    computed: {
      o: function () { return this.route.params.owner; },
      r: function () { return this.route.params.repo; },
      full: function () { return this.o + '/' + this.r; },
      tag: function () { return this.route.params.tag; },
      detail: function () { return this.route.name === 'release'; },
      totalDownloads: function () {
        let n = 0;
        (this.detail ? this.assets : []).forEach(function (a) { n += a.download_count || 0; });
        return n;
      }
    },
    watch: { '$route.params.tag': function () { this.route.name === 'release' ? this.loadOne() : this.load(1); } },
    created: function () { this.detail ? this.loadOne() : this.load(1); },
    methods: {
      load: async function (p) {
        this.loading = true; this.err = '';
        try {
          const r = await API.releases(this.o, this.r, p);
          this.items = r.data || [];
          const l = API.links(r);
          this.page = p; this.hasNext = !!l.next; this.hasPrev = p > 1;
          this.$emit('cache', r.cache);
        } catch (e) { this.err = e.message; }
        this.loading = false;
      },
      loadOne: async function () {
        this.loading = true; this.err = ''; this.assets = [];
        const self = this;
        try {
          const rel = await API.release(this.o, this.r, this.tag);
          self.single = rel;
          if (rel && rel.id) {
            self.assetsLoading = true;
            API.releaseAssets(this.o, this.r, rel.id)
              .then(function (a) { self.assets = Array.isArray(a) ? a : []; })
              .catch(function () { }).then(function () { self.assetsLoading = false; });
          }
        } catch (e) { this.err = e.status === 404 ? '找不到这个发行版' : e.message; }
        this.loading = false;
      },
      go: function (p) { this.load(p); },
      open: function (rel) { this.$emit('nav', '#/' + this.full + '/releases/' + encodeURIComponent(rel.tag_name)); },
      copyTag: function (t, ev) { ev.stopPropagation(); ev.preventDefault(); U.copy(t, '标签已复制'); },
      assetIcon: function (n) { return 'package'; }
    },
    template:
'<div>' +
'  <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">' +
'    <h1 style="font-size:19px"><a :href="\'#/\' + o" style="color:var(--ink-3);font-weight:400">{{ o }}</a>' +
'      <span class="dimmer" style="font-weight:300">/</span>' +
'      <a :href="\'#/\' + full" style="font-weight:700">{{ r }}</a>' +
'      <span class="dimmer" style="font-weight:300">/</span>' +
'      <a :href="\'#/\' + full + \'/releases\'">发布</a>' +
'      <template v-if="detail"><span class="dimmer" style="font-weight:300">/</span>{{ tag }}</template></h1>' +
'  </div>' +

'  <div v-if="err" class="card"><div class="empty" style="padding:50px">' +
'    <icon name="alert" :size="24"></icon><b>{{ err }}</b>' +
'    <button class="btn" @click="$emit(\'nav\', \'#/\' + full + \'/releases\')">返回列表</button></div></div>' +

    /* ---------- list ---------- */
'  <template v-else-if="!detail">' +
'    <div v-if="loading"><skel-rows :n="5"></skel-rows></div>' +
'    <div v-else-if="!items.length" class="card"><div class="empty" style="padding:50px">' +
'      <icon name="tag" :size="24"></icon><b>还没有发布版本</b>' +
'      <p>在 GitHub 上创建 Release 后会显示在这里</p></div></div>' +
'    <div v-else>' +
'      <div v-for="rel in items" :key="rel.id" class="card" style="margin-bottom:14px">' +
'        <div class="card-head" style="gap:9px;flex-wrap:wrap">' +
'          <icon name="tag" :size="15" style="color:var(--accent)"></icon>' +
'          <a class="t" style="font-weight:700;font-size:14px" :href="\'#/\' + full + \'/releases/\' + encodeURIComponent(rel.tag_name)">{{ rel.tag_name }}</a>' +
'          <span v-if="rel.name && rel.name !== rel.tag_name" class="dim sm">{{ rel.name }}</span>' +
'          <span v-if="rel.prerelease" class="badge badge-warn">预发布</span>' +
'          <span v-if="rel.draft" class="badge">草稿</span>' +
'          <span style="flex:1"></span>' +
'          <span class="xs dimmer">' +
'            <template v-if="rel.published_at"><rel-time :iso="rel.published_at"></rel-time></template>' +
'            <template v-else>未发布</template></span>' +
'          <button class="btn btn-sm btn-quiet" @click="copyTag(rel.tag_name, $event)">' +
'            <icon name="copy" :size="12"></icon></button>' +
'        </div>' +
'        <div class="card-pad" v-if="rel.body">' +
'          <markdown :source="rel.body.length > 1400 ? rel.body.slice(0, 1400) + \'\\n\\n…\' : rel.body"></markdown>' +
'          <a v-if="rel.body.length > 1400" class="btn btn-sm" style="margin-top:8px" ' +
'             :href="\'#/\' + full + \'/releases/\' + encodeURIComponent(rel.tag_name)">阅读全文</a></div>' +
'        <div class="card-head" style="border-top:1px solid var(--rule);border-bottom:0;gap:12px;flex-wrap:wrap">' +
'          <span class="sm dim"><icon name="package" :size="13"></icon> {{ (rel.assets || []).length }} 个附件</span>' +
'          <span class="sm dim"><icon name="download" :size="13"></icon> ' +
'            {{ U.num((rel.assets || []).reduce(function(s,a){return s + (a.download_count||0)}, 0)) }} 次下载</span>' +
'          <span style="flex:1"></span>' +
'          <a class="btn btn-sm btn-quiet" :href="\'#/\' + full + \'/code/tree/\' + encodeURIComponent(rel.tag_name)">' +
'            <icon name="code" :size="12"></icon>浏览源码</a>' +
'        </div>' +
'      </div>' +
'      <pager :page="page" :has-next="hasNext" :has-prev="hasPrev" @go="go"></pager>' +
'    </div>' +
'  </template>' +

    /* ---------- detail ---------- */
'  <template v-else-if="single">' +
'    <div class="card" style="margin-bottom:14px">' +
'      <div class="card-head" style="gap:9px;flex-wrap:wrap">' +
'        <icon name="tag" :size="16" style="color:var(--accent)"></icon>' +
'        <h2 style="font-size:17px">{{ single.tag_name }}</h2>' +
'        <span v-if="single.name && single.name !== single.tag_name" class="dim">{{ single.name }}</span>' +
'        <span v-if="single.prerelease" class="badge badge-warn">预发布</span>' +
'        <span v-if="single.draft" class="badge">草稿</span>' +
'        <span style="flex:1"></span>' +
'        <span class="xs dimmer">发布于 <rel-time :iso="single.published_at"></rel-time></span>' +
'      </div>' +
'      <div class="card-pad" v-if="single.body"><markdown :source="single.body"></markdown></div>' +
'      <div v-else class="card-pad dim" style="font-style:italic">此发行版没有说明</div>' +
'    </div>' +

'    <div class="card" style="margin-bottom:14px">' +
'      <div class="card-head"><icon name="package" :size="14"></icon><h3>附件</h3>' +
'        <span style="flex:1"></span>' +
'        <span class="xs dimmer">共 {{ U.num(totalDownloads) }} 次下载</span></div>' +
'      <div v-if="assetsLoading" class="center-pad"><span class="spin"></span></div>' +
'      <div v-else-if="!assets.length" class="empty" style="padding:36px">' +
'        <icon name="package" :size="22"></icon><b>没有可下载的附件</b>' +
'        <p>此发行版仅包含源码快照</p></div>' +
'      <div v-else class="row-list">' +
'        <a v-for="a in assets" :key="a.id" class="row" :href="a.browser_download_url" target="_blank" rel="noopener noreferrer">' +
'          <icon name="package" :size="15" style="color:var(--ink-4);margin-top:2px"></icon>' +
'          <div class="row-main"><div class="row-title"><span class="t mono" style="font-size:12.5px;font-weight:500">{{ a.name }}</span></div>' +
'            <div class="row-meta"><span>{{ U.bytes(a.size) }}</span>' +
'              <span>·</span><span>{{ a.content_type }}</span>' +
'              <span>·</span><span>下载 {{ U.num(a.download_count) }}</span>' +
'              <span>·</span><rel-time :iso="a.created_at"></rel-time></div></div>' +
'          <icon name="download" :size="14" style="color:var(--ink-4)"></icon>' +
'        </a>' +
'      </div>' +
'    </div>' +

'    <div class="card">' +
'      <div class="card-head"><h3>源码</h3></div>' +
'      <div class="card-pad" style="display:flex;gap:9px;flex-wrap:wrap">' +
'        <a class="btn" :href="single.zipball_url" target="_blank" rel="noopener noreferrer">' +
'          <icon name="download" :size="13"></icon>ZIP 快照</a>' +
'        <a class="btn" :href="single.tarball_url" target="_blank" rel="noopener noreferrer">' +
'          <icon name="download" :size="13"></icon>TAR.GZ 快照</a>' +
'        <a class="btn" :href="\'#/\' + full + \'/code/tree/\' + encodeURIComponent(single.tag_name)">' +
'          <icon name="code" :size="13"></icon>浏览此版本的代码</a>' +
'      </div>' +
'    </div>' +
'    <a class="btn" style="margin-top:14px" :href="\'#/\' + full + \'/releases\'">' +
'      <icon name="left" :size="13"></icon>全部发行版</a>' +
'  </template>' +
'</div>'
  };

  window.VIEWS.releases = Releases;
  /* 同一个组件既渲染列表也渲染详情：路由名 release / releases 都指向它 */
  window.VIEWS.release = Releases;
})();
