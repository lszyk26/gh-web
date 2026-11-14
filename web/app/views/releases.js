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
      snapTag: function () {
        return (this.single && this.single.tag_name) || this.tag || 'HEAD';
      },
      // 源码快照：github.com 的 archive 直链（302 由 Worker 跟随），再套一层边缘下载加速
      zipSrc: function () { return U.dlUrl('https://github.com/' + this.full + '/archive/refs/tags/' + encodeURIComponent(this.snapTag) + '.zip'); },
      tarSrc: function () { return U.dlUrl('https://github.com/' + this.full + '/archive/refs/tags/' + encodeURIComponent(this.snapTag) + '.tar.gz'); },
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
          // 列表页直接挂出附件：/releases 响应本身就带 assets，不用额外请求。
          // _showAll 是折叠开关，在建对象时就带上，避免动态加属性丢响应式。
          this.items = (r.data || []).map(function (x) {
            return Object.assign({}, x, {
              assets: Array.isArray(x.assets) ? x.assets : [],
              _showAll: false,   // 其余附件折叠
              _openBody: false   // 更新说明默认只露两行摘要
            });
          });
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
      assetIcon: function (n) { return 'package'; },
      // 更新说明摘要：去掉 markdown 标记压成一段纯文本，列表里只露两行
      preview: function (rel) {
        const s = String(rel.body || '')
          .replace(/```[\s\S]*?```/g, ' ')
          .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
          .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
          .replace(/<[^>]+>/g, ' ')
          .replace(/^\s*[-*+]\s+/gm, '· ')
          .replace(/^\s*#{1,6}\s+/gm, '')
          .replace(/[*_`~>|]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        return s.length > 170 ? s.slice(0, 170) + '…' : s;
      },
      toggleBody: function (rel) { rel._openBody = !rel._openBody; },
      // 安装包排前面：列表里先看到能直接装的那几个，签名/校验文件沉底
      sortedAssets: function (rel) {
        const a = rel.assets || [];
        const isPkg = function (n) {
          return /\.(apk|aab|apks|xapk|exe|msi|dmg|pkg|deb|rpm|appimage|zip|7z|tgz|tar\.gz)$/i.test(n || '');
        };
        return a.filter(function (x) { return isPkg(x.name); })
          .concat(a.filter(function (x) { return !isPkg(x.name); }));
      },
      headAssets: function (rel) { return this.sortedAssets(rel).slice(0, 4); },
      restAssets: function (rel) { return this.sortedAssets(rel).slice(4); },
      toggleAssets: function (rel) { rel._showAll = !rel._showAll; }
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
'    <div v-else class="stagger">' +
'      <div v-for="rel in items" :key="rel.id" class="card" style="margin-bottom:14px">' +
'        <div class="card-head" style="gap:9px;flex-wrap:wrap">' +
'          <a class="chip" :href="\'#/\' + full + \'/releases/\' + encodeURIComponent(rel.tag_name)">' +
'            <icon name="tag" :size="11"></icon>{{ rel.tag_name }}</a>' +
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
'        <div class="card-pad" v-if="rel.body" style="padding-bottom:10px">' +
'          <div v-if="!rel._openBody" class="sm dim clamp2" style="line-height:1.62">{{ preview(rel) }}</div>' +
'          <div class="fold" :class="{open: rel._openBody}"><div class="fold-inner">' +
'            <markdown :source="rel.body" :owner="o" :repo="r"></markdown></div></div>' +
'          <button class="btn btn-sm btn-quiet" style="margin-top:3px;padding:0 6px 0 0" @click="toggleBody(rel)">' +
'            <icon class="chev" :class="{up: rel._openBody}" name="down" :size="12"></icon>' +
'            {{ rel._openBody ? \'收起更新说明\' : \'展开更新说明\' }}</button>' +
'        </div>' +
'        <div v-if="rel.assets.length" class="row-list" style="border-top:1px solid var(--rule)">' +
'          <a v-for="a in headAssets(rel)" :key="a.id" class="row row-primary" :href="U.dlUrl(a.browser_download_url)" target="_blank" rel="noopener noreferrer">' +
'            <icon name="package" :size="14" style="color:var(--accent);margin-top:1px"></icon>' +
'            <div class="row-main"><div class="row-title"><span class="t mono" style="font-size:12.5px;font-weight:600">{{ a.name }}</span></div></div>' +
'            <span class="xs dimmer tnum" style="flex:none">{{ U.bytes(a.size) }}</span>' +
'            <span class="btn btn-sm" style="flex:none">下载</span></a>' +
'          <div class="fold" :class="{open: rel._showAll}"><div class="fold-inner">' +
'            <a v-for="a in restAssets(rel)" :key="a.id" class="row row-sub" :href="U.dlUrl(a.browser_download_url)" target="_blank" rel="noopener noreferrer">' +
'              <icon name="package" :size="14" style="color:var(--ink-4);margin-top:1px"></icon>' +
'              <div class="row-main"><div class="row-title"><span class="t mono" style="font-size:12.5px;font-weight:500">{{ a.name }}</span></div></div>' +
'              <span class="xs dimmer tnum" style="flex:none">{{ U.bytes(a.size) }}</span>' +
'              <icon name="download" :size="13" style="color:var(--ink-4)"></icon></a>' +
'          </div></div>' +
'          <div v-if="rel.assets.length > 4" class="row" style="justify-content:center;cursor:pointer;color:var(--accent-deep)" @click="toggleAssets(rel)">' +
'            <span class="sm" style="font-weight:600">{{ rel._showAll ? \'收起附件\' : \'其余 \' + (rel.assets.length - 4) + \' 个文件（签名 / 校验等）\' }}</span>' +
'            <icon class="chev" :class="{up: rel._showAll}" name="down" :size="12"></icon></div>' +
'        </div>' +
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
'        <a v-for="a in assets" :key="a.id" class="row" :href="U.dlUrl(a.browser_download_url)" target="_blank" rel="noopener noreferrer">' +
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
'        <a class="btn" :href="zipSrc" target="_blank" rel="noopener noreferrer">' +
'          <icon name="download" :size="13"></icon>ZIP 快照</a>' +
'        <a class="btn" :href="tarSrc" target="_blank" rel="noopener noreferrer">' +
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
