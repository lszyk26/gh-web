/* ============================================================
   views/repo.js — repository overview
   ============================================================ */
(function () {
  'use strict';
  const C = window.C;

  const Repo = {
    components: C,
    props: { route: Object, shell: Object },
    data: function () {
      return {
        loading: true, err: '',
        repo: null, langs: null, readme: '', readmeLoading: false, contributors: [],
        lastCommit: null, counts: { issues: null, pulls: null, stars: null },
        topicsOpen: false, watching: false, starBusy: false
      };
    },
    computed: {
      o: function () { return this.route.params.owner; },
      r: function () { return this.route.params.repo; },
      full: function () { return this.o + '/' + this.r; },
      tab: function () { return this.route.params.tab || 'code'; },
      starred: function () {
        const sh = this.shell;
        if (!sh) return !!(this.repo && this.repo.starred);
        const k = this.full;
        return sh.starOn[k] !== undefined ? sh.starOn[k] : !!(this.repo && this.repo.starred);
      },
      langRows: function () {
        if (!this.langs) return [];
        const m = this.langs, total = Object.keys(m).reduce(function (s, k) { return s + m[k]; }, 0) || 1;
        return Object.keys(m).map(function (k) {
          return { name: k, v: m[k], bytes: U.bytes(m[k]), pct: (m[k] / total * 100) };
        }).sort(function (a, b) { return b.v - a.v; }).slice(0, 8);
      },
      tabs: function () {
        return [
          { k: 'code', label: '代码', icon: 'code' },
          { k: 'issues', label: '议题', icon: 'issue', n: this.counts.issues },
          { k: 'pulls', label: '拉取请求', icon: 'pr', n: this.counts.pulls },
          { k: 'commits', label: '提交', icon: 'commit' },
          { k: 'branches', label: '分支', icon: 'branch' },
          { k: 'releases', label: '发布', icon: 'tag' },
          { k: 'actions', label: '流水线', icon: 'play' }
        ];
      }
    },
    watch: {
      '$route.params.repo': function () { this.load(); }
    },
    created: function () { this.load(); },
    methods: {
      load: async function () {
        this.loading = true; this.err = ''; this.readme = ''; this.readmeLoading = true;
        const self = this;
        const key = this.o + '/' + this.r;
        try {
          // README 与仓库元数据并行取：此前必须先等 /repos/:o/:r 返回、
          // 再从它拿到 default_branch 才发 README 请求，白等一个 RTT，
          // 用户就会先看到「这个仓库没有 README」，等一下才刷出内容。
          const pReadme = API.readme(this.o, this.r).then(function (rd) {
            if (rd && rd.content) return decodeB64(rd.content);
            if (rd && rd.download_url) {
              return fetch(rd.download_url).then(function (x) { return x.text(); });
            }
            return '';
          }).catch(function () { return ''; });
          // 无论成功失败都要收掉骨架屏，并用 key 判定，避免切换仓库时串内容
          pReadme.then(function (txt) {
            if (key === self.o + '/' + self.r) { self.readme = txt || ''; self.readmeLoading = false; }
          });

          const repo = await API.repo(this.o, this.r);
          self.repo = repo;
          self.lastCommit = null;
          API.languages(this.o, this.r).then(function (l) { self.langs = l; }).catch(function () { });
          API.contributors(this.o, this.r).then(function (c) {
            self.contributors = Array.isArray(c) ? c : [];
          }).catch(function () { });
          API.commits(this.o, this.r, { sha: repo.default_branch, per_page: 1 })
            .then(function (c) { self.lastCommit = (c.data || [])[0] || null; }).catch(function () { });
          API.searchIssues('repo:' + self.full + ' is:issue is:open', 1)
            .then(function (x) { self.counts.issues = x.data.total_count; }).catch(function () { });
          API.searchIssues('repo:' + self.full + ' is:pr is:open', 1)
            .then(function (x) { self.counts.pulls = x.data.total_count; }).catch(function () { });
          API.getData('/repos/' + self.o + '/' + self.r + '/subscription')
            .then(function (s) { self.watching = !!s.subscribed; }).catch(function () { });
        } catch (e) {
          this.err = e.status === 404 ? '仓库不存在，或 Token 没有访问权限' : e.message;
        }
        this.loading = false;
      },
      nav: function (p) { this.$emit('nav', p); },
      tabTo: function (k) { return '#/' + this.full + '/' + k; },
      subTab: function (k) { return '#/' + this.full + '/' + k; },
      toggleStar: async function () {
        this.starBusy = true;
        const k = this.full, on = this.starred;
        try {
          if (on) { await API.unstar(this.o, this.r); this.setStar(false); U.toast('已取消星标'); }
          else { await API.star(this.o, this.r); this.setStar(true); U.toast('已加星标'); }
        } catch (e) { U.toast('操作失败：' + e.message, 'bad'); }
        this.starBusy = false;
      },
      setStar: function (v) {
        if (this.repo) {
          this.repo.stargazers_count += v ? 1 : -1;
          this.repo.starred = v;
        }
        if (this.shell) this.shell.starOn[this.full] = v;
      },
      toggleWatch: async function () {
        const self = this;
        if (this.watching) {
          try { await API.req('DELETE', '/repos/' + this.o + '/' + this.r + '/subscription'); this.watching = false; U.toast('已取消关注'); }
          catch (e) { U.toast('操作失败：' + e.message, 'bad'); }
        } else {
          try {
            await API.req('PUT', '/repos/' + this.o + '/' + this.r + '/subscription', { subscribed: true });
            this.watching = true; U.toast('已关注'); self.load();
          } catch (e) {
            try {
              await API.req('PUT', '/repos/' + this.o + '/' + this.r + '/subscription', { subscribed: true, ignored: false });
              this.watching = true; U.toast('已关注'); self.load();
            } catch (e2) { U.toast('操作失败：' + e2.message, 'bad'); }
          }
        }
      }
    },
    template:
'<div>' +
'  <div v-if="loading"><div class="skel" style="height:22px;width:260px"></div>' +
'    <div class="skel" style="height:13px;width:420px;margin-top:12px"></div>' +
'    <div style="margin-top:22px"><skel-rows :n="5"></skel-rows></div></div>' +

'  <div v-else-if="err" class="card"><div class="empty" style="padding:56px">' +
'    <icon name="alert" :size="26"></icon><b>{{ err }}</b>' +
'    <p>确认仓库名拼写正确，并检查 Token 是否有该仓库的访问权限</p>' +
'    <button class="btn" @click="nav(\'#/repos\')">返回仓库列表</button></div></div>' +

'  <template v-else-if="repo">' +
'    <div style="margin-bottom:14px">' +
'      <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap">' +
'        <icon name="book" :size="17" style="color:var(--ink-3)"></icon>' +
'        <h1 style="font-size:20px">' +
'          <a :href="\'#/users/\' + o" style="color:var(--ink-3);font-weight:400">{{ o }}</a>' +
'          <span class="dimmer" style="font-weight:300"> / </span>' +
'          <a :href="\'#/\' + full" style="font-weight:700">{{ r }}</a></h1>' +
'        <span v-if="repo.private" class="badge badge-lg"><icon name="lock" :size="11"></icon>私有</span>' +
'        <span v-else class="badge badge-lg">公开</span>' +
'        <span v-if="repo.fork" class="badge badge-lg">fork</span>' +
'        <span v-if="repo.archived" class="badge badge-lg badge-warn"><icon name="archive" :size="11"></icon>已归档</span>' +
'        <span v-if="repo.is_template" class="badge badge-lg">模板</span>' +
'      </div>' +
'      <p v-if="repo.description" class="dim" style="margin:9px 0 0;font-size:13.5px;max-width:760px">{{ repo.description }}</p>' +
'      <div style="display:flex;align-items:center;gap:12px;margin-top:10px;flex-wrap:wrap">' +
'        <a v-if="repo.homepage" class="sm" :href="repo.homepage" target="_blank" rel="noopener noreferrer" ' +
'           style="color:var(--accent-deep);display:inline-flex;align-items:center;gap:5px">' +
'          <icon name="globe" :size="13"></icon>{{ repo.homepage }}</a>' +
'        <span v-if="repo.topics && repo.topics.length" style="display:flex;gap:5px;flex-wrap:wrap">' +
'          <span v-for="t in repo.topics" :key="t" class="lbl lbl-tag">{{ t }}</span></span>' +
'      </div>' +
'    </div>' +

'    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap">' +
'      <span class="seg">' +
'        <button class="active" @click="toggleStar" :disabled="starBusy" style="height:32px;display:inline-flex;align-items:center;gap:6px;padding:0 12px">' +
'          <icon :name="starred ? \'starFill\' : \'star\'" :size="14" ' +
'                :style="{color: starred ? \'var(--warn)\' : \'inherit\'}"></icon>' +
'          {{ starred ? "已关注" : "关注" }}</button>' +
'      </span>' +
'      <button class="btn" style="height:32px" @click="toggleWatch">' +
'        <icon name="eye" :size="14"></icon>{{ watching ? "已订阅" : "订阅" }}</button>' +
'      <button class="btn" style="height:32px" ' +
'              @click="nav(\'#/\' + full + \'/code/tree/\' + repo.default_branch)">' +
'        <icon name="code" :size="14"></icon>浏览代码</button>' +
'      <span style="flex:1"></span>' +
'      <a class="btn" :href="repo.html_url" target="_blank" rel="noopener noreferrer">' +
'        <icon name="external" :size="13"></icon>在 GitHub 打开</a>' +
'    </div>' +

'    <div class="tabs">' +
'      <a v-for="t in tabs" :key="t.k" class="tab" :class="{on: tab === t.k}" :href="tabTo(t.k)">' +
'        <icon :name="t.icon" :size="14"></icon>{{ t.label }}' +
'        <span v-if="t.n !== null && t.n !== undefined" class="n">{{ t.n }}</span></a>' +
'    </div>' +

'    <div class="repo-cols">' +
'      <div style="min-width:0">' +
'        <div class="card" style="margin-bottom:16px">' +
'          <div class="card-head">' +
'            <span class="badge"><icon name="branch" :size="11"></icon>{{ repo.default_branch }}</span>' +
'            <span v-if="lastCommit" class="trunc" style="flex:1;font-size:13px;color:var(--ink-2)">' +
'              {{ U.firstLine(lastCommit.commit.message, 80) }}</span>' +
'            <span v-if="lastCommit" class="dimmer xs mono nowrap">' +
'              {{ (lastCommit.sha || "").slice(0, 7) }} · <rel-time :iso="lastCommit.commit.author.date"></rel-time></span>' +
'          </div>' +
'          <div class="card-body" v-if="readme"><markdown :source="readme"></markdown>' +
'            <p class="dimmer xs" style="margin-top:16px;padding-top:12px;border-top:1px solid var(--rule)">' +
'              README.md · 渲染自仓库默认分支</p></div>' +
'          <div v-else-if="readmeLoading" class="card-body" style="display:flex;flex-direction:column;gap:10px">' +
'            <div class="skel" style="height:20px;width:44%"></div>' +
'            <div class="skel" style="height:12px;width:100%"></div>' +
'            <div class="skel" style="height:12px;width:92%"></div>' +
'            <div class="skel" style="height:12px;width:97%"></div>' +
'            <div class="skel" style="height:12px;width:68%"></div></div>' +
'          <div v-else class="empty" style="padding:36px">' +
'            <icon name="book" :size="22"></icon><b>这个仓库没有 README</b>' +
'            <p>浏览代码目录查看全部文件</p></div>' +
'        </div>' +
'      </div>' +

'      <div style="min-width:0">' +
'        <div class="card" style="margin-bottom:14px" v-if="repo.description || repo.topics || repo.homepage || repo.license">' +
'          <div class="card-head"><h3>关于</h3></div>' +
'          <div class="card-pad">' +
'            <p v-if="repo.description" class="sm" style="margin:0 0 11px;color:var(--ink-2)">{{ repo.description }}</p>' +
'            <div v-if="repo.homepage" class="kv"><span class="k">主页</span>' +
'              <a :href="repo.homepage" target="_blank" rel="noopener noreferrer" style="color:var(--accent-deep)" class="trunc">{{ repo.homepage }}</a></div>' +
'            <div v-if="repo.license" class="kv"><span class="k">许可</span><span>{{ U.license(repo.license) }}</span></div>' +
'            <div v-if="repo.default_branch" class="kv"><span class="k">默认分支</span><span class="mono">{{ repo.default_branch }}</span></div>' +
'            <div class="kv"><span class="k">创建</span><span><rel-time :iso="repo.created_at"></rel-time></span></div>' +
'            <div class="kv"><span class="k">最近推送</span><span><rel-time :iso="repo.pushed_at"></rel-time></span></div>' +
'            <div v-if="repo.topics && repo.topics.length" style="display:flex;gap:5px;flex-wrap:wrap;margin-top:10px">' +
'              <span v-for="t in repo.topics" :key="t" class="lbl lbl-tag">{{ t }}</span></div>' +
'          </div>' +
'        </div>' +

'        <div class="card" style="margin-bottom:14px">' +
'          <div class="card-head"><h3>统计</h3></div>' +
'          <div class="card-pad" style="display:flex;flex-direction:column;gap:9px">' +
'            <count-chip icon="star" label="星标" :n="repo.stargazers_count"></count-chip>' +
'            <count-chip icon="fork" label="复刻" :n="repo.forks_count"></count-chip>' +
'            <count-chip icon="eye" label="订阅" :n="repo.subscribers_count"></count-chip>' +
'            <count-chip icon="issue" label="待办议题" :n="repo.open_issues_count"></count-chip>' +
'          </div>' +
'        </div>' +

'        <div class="card" style="margin-bottom:14px" v-if="langRows.length">' +
'          <div class="card-head"><h3>语言</h3></div>' +
'          <div class="card-pad">' +
'            <div class="bar" style="height:7px;margin-bottom:12px">' +
'              <i v-for="l in langRows" :key="l.name" :style="{width: l.pct + \'%\', background: U.langColor(l.name)}"></i></div>' +
'            <div v-for="l in langRows" :key="l.name" style="display:flex;align-items:center;gap:8px;margin-bottom:7px">' +
'              <span class="lang-dot" :style="{background: U.langColor(l.name)}"></span>' +
'              <span class="sm">{{ l.name }}</span><span style="flex:1"></span>' +
'              <span class="mono-num dimmer">{{ l.pct.toFixed(1) }}%</span></div>' +
'          </div>' +
'        </div>' +

'        <div class="card" v-if="contributors.length">' +
'          <div class="card-head"><h3>贡献者</h3>' +
'            <span style="flex:1"></span><span class="mono-num dimmer">{{ contributors.length }}</span></div>' +
'          <div class="card-pad" style="display:flex;flex-wrap:wrap;gap:8px">' +
'            <a v-for="c in contributors.slice(0,20)" :key="c.id" :href="\'#/users/\' + c.login" :title="c.login + \' · \' + c.contributions + \' 次提交\'">' +
'              <avatar :src="c.avatar_url" :alt="c.login" :size="30"></avatar></a>' +
'          </div>' +
'        </div>' +
'      </div>' +
'    </div>' +
'  </template>' +
'</div>'
  };

  function decodeB64(s) {
    try {
      const bin = atob(String(s).replace(/\s/g, ''));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder('utf-8').decode(bytes);
    } catch (e) { return ''; }
  }
  window.__b64 = decodeB64;

  window.VIEWS.repo = Repo;
})();
