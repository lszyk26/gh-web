/* ============================================================
   views/code.js — file tree browser + file viewer
   ============================================================ */
(function () {
  'use strict';
  const C = window.C;

  const EXT_LANG = {
    js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript',
    ts: 'typescript', tsx: 'typescript', py: 'python', go: 'go', rs: 'rust',
    java: 'java', c: 'c', h: 'c', cc: 'cpp', cpp: 'cpp', hpp: 'cpp', cs: 'csharp',
    rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin', kts: 'kotlin',
    sh: 'bash', bash: 'bash', zsh: 'bash', ps1: 'powershell', bat: 'dos',
    html: 'xml', htm: 'xml', xml: 'xml', svg: 'xml', vue: 'xml',
    css: 'css', scss: 'scss', sass: 'scss', less: 'less',
    json: 'json', jsonc: 'json', yml: 'yaml', yaml: 'yaml', toml: 'ini', ini: 'ini',
    md: 'markdown', markdown: 'markdown', rst: 'markdown', tex: 'latex',
    sql: 'sql', graphql: 'graphql', gql: 'graphql', proto: 'protobuf',
    dockerfile: 'dockerfile', makefile: 'makefile', cmake: 'cmake',
    lua: 'lua', r: 'r', pl: 'perl', pm: 'perl', ex: 'elixir', exs: 'elixir',
    erl: 'erlang', hs: 'haskell', clj: 'clojure', scala: 'scala', dart: 'dart',
    vim: 'vim', nix: 'nix', tf: 'hcl', hcl: 'hcl', gradle: 'gradle',
    txt: 'plaintext', log: 'plaintext', conf: 'ini', cfg: 'ini', env: 'ini',
    diff: 'diff', patch: 'diff', csv: 'plaintext', tsv: 'plaintext'
  };
  const IMG = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'avif'];

  const Code = {
    components: C,
    props: { route: Object, shell: Object },
    data: function () {
      return {
        loading: true, err: '',
        repo: null, entries: [], file: null, fileText: '',
        branches: [], branchOpen: false, branchFilter: '',
        mdPreview: true, blobMode: 'code', tooBig: false
      };
    },
    computed: {
      o: function () { return this.route.params.owner; },
      r: function () { return this.route.params.repo; },
      full: function () { return this.o + '/' + this.r; },
      mode: function () { return this.route.params.mode === 'blob' ? 'blob' : 'tree'; },
      ref: function () { return this.route.params.ref || (this.repo && this.repo.default_branch) || 'HEAD'; },
      path: function () { return this.route.params.path || ''; },
      segs: function () { return this.path ? this.path.split('/') : []; },
      crumbs: function () {
        const out = [], p = this.path ? this.path.split('/') : [];
        let acc = '';
        p.forEach(function (s) { acc = acc ? acc + '/' + s : s; out.push({ name: s, path: acc }); });
        return out;
      },
      parentPath: function () {
        const i = this.path.lastIndexOf('/');
        return i < 0 ? '' : this.path.slice(0, i);
      },
      ext: function () { return this.file ? U.extOf(this.file.path || this.file.name) : ''; },
      lang: function () {
        if (!this.file) return '';
        const base = U.baseOf(this.file.path || this.file.name || '').toLowerCase();
        if (base === 'dockerfile') return 'dockerfile';
        if (base === 'makefile') return 'makefile';
        return EXT_LANG[this.ext] || this.ext || 'plaintext';
      },
      isImg: function () { return IMG.indexOf(this.ext) >= 0; },
      isMd: function () { return this.ext === 'md' || this.ext === 'markdown'; },
      isBinaryish: function () {
        return !this.isImg && ['pdf', 'zip', 'gz', 'tar', 'jar', 'exe', 'dll', 'so', 'o', 'a', 'bin', 'wasm', 'woff', 'woff2', 'ttf', 'otf', 'mp4', 'mp3', 'mov', 'webm'].indexOf(this.ext) >= 0;
      },
      filteredBranches: function () {
        const f = this.branchFilter.trim().toLowerCase();
        const arr = this.branches.map(function (b) { return b.name; });
        return f ? arr.filter(function (b) { return b.toLowerCase().indexOf(f) >= 0; }).slice(0, 60) : arr.slice(0, 60);
      },
      sortedEntries: function () {
        const d = [], f = [];
        this.entries.forEach(function (e) { (e.type === 'dir' ? d : f).push(e); });
        const key = function (x) { return (x.name || '').toLowerCase(); };
        d.sort(function (a, b) { return key(a) < key(b) ? -1 : 1; });
        f.sort(function (a, b) { return key(a) < key(b) ? -1 : 1; });
        return d.concat(f);
      },
      sizeLabel: function () {
        return this.file && this.file.size != null ? U.bytes(this.file.size) : '';
      }
    },
    watch: {
      '$route.params.path': function () { this.load(); },
      '$route.params.ref': function () { this.load(); },
      '$route.params.repo': function () { this.load(); }
    },
    created: function () { this.loadReadme(); this.load(); },
    methods: {
      loadReadme: async function () {
        const self = this;
        try {
          const repo = await API.repo(this.o, this.r);
          self.repo = repo;
          API.branches(this.o, this.r).then(function (b) { self.branches = b.data || []; }).catch(function () { });
        } catch (e) { /* repo error surfaces in load() */ }
      },
      load: async function () {
        this.loading = true; this.err = ''; this.file = null; this.fileText = ''; this.entries = [];
        const self = this;
        try {
          if (!self.repo) await self.loadReadme();
          const ref = self.ref;
          const data = await API.repoContent(self.o, self.r, self.path, ref);
          if (Array.isArray(data)) {
            self.entries = data;
          } else if (data && data.type === 'file') {
            self.file = data;
            if (data.size > 1048576) {
              self.tooBig = true;
              self.loadViaBlob(data);
            } else if (data.content) {
              self.fileText = window.__b64(data.content);
              self.tooBig = false;
            } else if (data.download_url) {
              fetch(data.download_url).then(function (x) { return x.text(); })
                .then(function (t) { self.fileText = t; }).catch(function () { });
            }
          } else if (data && data.type === 'symlink') {
            self.file = data; self.fileText = ''; self.err = '';
          }
        } catch (e) {
          this.err = e.status === 404 ? '路径不存在，或当前分支下没有这个文件'
            : (e.status === 403 ? '接口限流或 Token 权限不足' : e.message);
        }
        this.loading = false;
      },
      loadViaBlob: async function (f) {
        const self = this;
        try {
          const b = await API.blob(this.o, this.r, f.sha);
          if (b && b.content && b.encoding === 'base64') self.fileText = window.__b64(b.content);
        } catch (e) { }
      },
      treeHref: function (p) { return '#/' + this.full + '/code/tree/' + encodeURIComponent(this.ref) + (p ? '/' + p : ''); },
      blobHref: function (p) { return '#/' + this.full + '/code/blob/' + encodeURIComponent(this.ref) + '/' + p; },
      entryHref: function (e) {
        return e.type === 'dir' ? this.treeHref(e.path) : this.blobHref(e.path);
      },
      pickBranch: function (b) {
        this.branchOpen = false; this.branchFilter = '';
        const base = '#/' + this.full + '/code/' + this.mode + '/' + encodeURIComponent(b);
        this.$emit('nav', this.path ? base + '/' + this.path : base);
      },
      rawHref: function () {
        const f = this.file; if (!f) return '';
        return U.rawUrl(this.o, this.r, this.ref, f.path || f.name);
      },
      download: function () { window.open(this.rawHref(), '_blank', 'noopener'); },
      nav: function (p) { this.$emit('nav', p); },
      iconFor: function (e) { return e.type === 'dir' ? 'folder' : 'file'; }
    },
    template:
'<div>' +
'  <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">' +
'    <div style="display:flex;align-items:center;gap:8px;min-width:0">' +
'      <h1 style="font-size:18px"><a :href="\'#/\' + o" style="color:var(--ink-3);font-weight:400">{{ o }}</a>' +
'        <span class="dimmer" style="font-weight:300">/</span>' +
'        <a :href="\'#/\' + full" style="font-weight:700">{{ r }}</a></h1>' +
'      <span v-if="repo && repo.private" class="badge"><icon name="lock" :size="10"></icon>私有</span>' +
'    </div>' +
'    <span style="flex:1"></span>' +
'    <a class="btn btn-sm btn-quiet" :href="\'#/\' + full">' +
'      <icon name="info" :size="13"></icon>仓库概览</a>' +
'  </div>' +

'  <div class="tabs" style="margin-bottom:14px">' +
'    <a class="tab" :class="{on: mode===\'tree\'}" :href="treeHref(path)">' +
'      <icon name="code" :size="14"></icon>代码</a>' +
'    <a class="tab" :href="\'#/\' + full + \'/issues\'"><icon name="issue" :size="14"></icon>议题</a>' +
'    <a class="tab" :href="\'#/\' + full + \'/pulls\'"><icon name="pr" :size="14"></icon>拉取请求</a>' +
'    <a class="tab" :href="\'#/\' + full + \'/commits\'"><icon name="commit" :size="14"></icon>提交</a>' +
'  </div>' +

'  <div class="card">' +
'    <div class="card-head" style="gap:9px;flex-wrap:wrap">' +
'      <dropdown align="left" :width="280">' +
'        <template #trigger>' +
'          <button class="btn btn-sm" style="max-width:230px">' +
'            <icon name="branch" :size="13"></icon>' +
'            <span class="mono trunc" style="max-width:170px">{{ ref }}</span>' +
'            <icon name="down" :size="12"></icon></button>' +
'        </template>' +
'        <template #menu>' +
'          <div style="padding:5px 5px 6px">' +
'            <input class="input mono-input" v-model="branchFilter" placeholder="筛选分支…" ' +
'                   style="height:28px" @click.stop></div>' +
'          <div style="max-height:280px;overflow:auto">' +
'            <div v-for="b in filteredBranches" :key="b" class="pop-item mono" ' +
'                 :style="{fontSize: \'12px\'}" @click="pickBranch(b)">' +
'              <icon name="branch" :size="12"></icon>{{ b }}</div>' +
'            <div v-if="!filteredBranches.length" class="pop-item dimmer">没有匹配的分支</div>' +
'          </div>' +
'        </template>' +
'      </dropdown>' +

'      <span class="mono sm dim" style="display:flex;align-items:center;gap:3px;flex-wrap:wrap;min-width:0">' +
'        <a :href="treeHref(\'\')" style="color:var(--ink-3)">{{ r }}</a>' +
'        <template v-for="(c, i) in crumbs" :key="i">' +
'          <span class="dimmer">/</span>' +
'          <a :href="(i === crumbs.length - 1 && mode === \'blob\') ? blobHref(c.path) : treeHref(c.path)" ' +
'             :style="{color: i === crumbs.length - 1 ? \'var(--ink)\' : \'var(--ink-3)\', fontWeight: i === crumbs.length - 1 ? 600 : 400}">{{ c.name }}</a>' +
'        </template>' +
'      </span>' +
'      <span style="flex:1"></span>' +
'      <span v-if="mode===\'tree\' && path" class="xs dimmer mono">{{ entries.length }} 项</span>' +
'      <button v-if="mode===\'blob\' && isMd" class="btn btn-sm btn-quiet" @click="mdPreview = !mdPreview">' +
'        <icon name="eye" :size="13"></icon>{{ mdPreview ? "源码" : "预览" }}</button>' +
'      <button v-if="mode===\'blob\'" class="btn btn-sm btn-quiet" @click="download">' +
'        <icon name="download" :size="13"></icon>原始</button>' +
'    </div>' +

'    <div v-if="loading" style="padding:8px"><skel-rows :n="7"></skel-rows></div>' +

'    <div v-else-if="err" class="empty" style="padding:46px">' +
'      <icon name="alert" :size="24"></icon><b>{{ err }}</b>' +
'      <button class="btn btn-sm" @click="nav(treeHref(\'\'))">回到仓库根目录</button></div>' +

    /* ---------- tree ---------- */
'    <div v-else-if="mode===\'tree\'">' +
'      <a v-if="path" class="row" :href="treeHref(parentPath)" style="border-bottom:1px solid var(--rule)">' +
'        <icon name="left" :size="15" style="color:var(--ink-3);margin-top:2px"></icon>' +
'        <div class="row-main"><span class="mono" style="color:var(--ink-2)">..</span></div></a>' +
'      <div v-if="!sortedEntries.length" class="empty" style="padding:40px">' +
'        <icon name="folder" :size="22"></icon><b>空目录</b></div>' +
'      <div class="row-list">' +
'        <a v-for="e in sortedEntries" :key="e.path" class="row" :href="entryHref(e)">' +
'          <icon :name="iconFor(e)" :size="15" ' +
'                :style="{color: e.type === \'dir\' ? \'var(--warn)\' : \'var(--ink-4)\', marginTop: \'2px\'}"></icon>' +
'          <div class="row-main"><div class="row-title">' +
'            <span class="t mono" :style="{fontSize: \'12.5px\', fontWeight: e.type === \'dir\' ? 600 : 400}">{{ e.name }}</span></div></div>' +
'          <div class="row-side">' +
'            <span v-if="e.type === \'file\'" class="mono">{{ U.bytes(e.size) }}</span>' +
'            <span v-else class="dimmer xs">目录</span>' +
'            <span class="mono dimmer" style="width:56px;text-align:right">{{ (e.sha || "").slice(0, 7) }}</span>' +
'          </div>' +
'        </a>' +
'      </div>' +
'    </div>' +

    /* ---------- blob ---------- */
'    <div v-else>' +
'      <div v-if="isImg" style="padding:22px;text-align:center;background:var(--paper-2)">' +
'        <img :src="rawHref()" :alt="file && file.name" ' +
'             style="max-width:100%;max-height:620px;border:1px solid var(--rule);border-radius:6px;background:#fff">' +
'        <p class="dimmer xs mono" style="margin:10px 0 0">{{ sizeLabel }}</p></div>' +
'      <div v-else-if="isBinaryish" class="empty" style="padding:50px">' +
'        <icon name="package" :size="24"></icon><b>二进制文件</b>' +
'        <p>无法在浏览器中预览 {{ ext.toUpperCase() }} 文件（{{ sizeLabel }}）</p>' +
'        <button class="btn" @click="download"><icon name="download" :size="13"></icon>下载原始文件</button></div>' +
'      <div v-else-if="isMd && mdPreview" style="padding:16px">' +
'        <markdown :source="fileText" :owner="o" :repo="r" :branch="ref"></markdown></div>' +
'      <code-block v-else :code="fileText" :lang="lang" :path="(file && file.path) || path" ' +
'                  :head="false"></code-block>' +
'      <div v-if="tooBig" class="banner" style="margin:12px">' +
'        <icon name="info" :size="14"></icon>' +
'        <span>文件超过 1 MB，已通过 Blob 接口读取；若内容不完整请使用「原始」下载。</span></div>' +
'    </div>' +
'  </div>' +
'</div>'
  };

  window.VIEWS.code = Code;
})();
