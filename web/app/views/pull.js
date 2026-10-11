/* ============================================================
   views/pull.js — pull request detail: conversation / files / commits / checks
   ============================================================ */
(function () {
  'use strict';
  const C = window.C;
  const shade = function (h) { return window.__shade(h); };

  const Pull = {
    components: C,
    props: { route: Object, shell: Object },
    data: function () {
      return {
        loading: true, err: '',
        pr: null, comments: [], files: [], commits: [], reviews: [],
        reviewComments: [], checks: null, status: null,
        reply: '', posting: false, diffStat: { add: 0, del: 0 },
        filter: '', tab: 'conversation', merged: false, merging: false
      };
    },
    computed: {
      o: function () { return this.route.params.owner; },
      r: function () { return this.route.params.repo; },
      full: function () { return this.o + '/' + this.r; },
      n: function () { return this.route.params.number; },
      isMerged: function () { return !!(this.pr && this.pr.merged); },
      mergeState: function () {
        if (!this.pr) return '';
        if (this.pr.merged) return 'merged';
        return this.pr.state;
      },
      tabs: function () {
        return [
          { k: 'conversation', l: '对话', icon: 'comment', n: this.comments.length },
          { k: 'files', l: '文件变更', icon: 'diff', n: this.files.length },
          { k: 'commits', l: '提交', icon: 'commit', n: this.commits.length },
          { k: 'checks', l: '检查', icon: 'shield' }
        ];
      },
      filteredFiles: function () {
        const f = this.filter.trim().toLowerCase();
        if (!f) return this.files;
        return this.files.filter(function (x) { return (x.filename || '').toLowerCase().indexOf(f) >= 0; });
      },
      headLabel: function () {
        return this.pr && this.pr.head ? this.pr.head.label : '';
      },
      baseLabel: function () {
        return this.pr && this.pr.base ? this.pr.base.label : '';
      },
      checkSummary: function () {
        if (!this.checks || !this.checks.check_runs) return null;
        const runs = this.checks.check_runs;
        const m = { success: 0, failure: 0, neutral: 0, pending: 0, skipped: 0 };
        runs.forEach(function (c) {
          const s = c.status === 'completed' ? (c.conclusion || 'neutral') : 'pending';
          if (m[s] !== undefined) m[s]++; else if (s === 'cancelled' || s === 'timed_out' || s === 'action_required' || s === 'stale') m.failure++;
          else m.pending++;
        });
        return { total: runs.length, map: m, runs: runs };
      }
    },
    watch: {
      '$route.params.number': function () { this.tab = this.route.query.tab || 'conversation'; this.load(); }
    },
    created: function () {
      this.tab = this.route.query.tab || 'conversation';
      this.load();
    },
    methods: {
      load: async function () {
        this.loading = true; this.err = '';
        this.comments = []; this.files = []; this.commits = []; this.reviews = [];
        this.reviewComments = []; this.checks = null;
        const self = this;
        try {
          const pr = await API.pull(this.o, this.r, this.n);
          self.pr = pr;
          API.issueComments(this.o, this.r, this.n)
            .then(function (c) { self.comments = Array.isArray(c) ? c : []; }).catch(function () { });
          API.pullFiles(this.o, this.r, this.n)
            .then(function (r) {
              self.files = r.data || [];
              let a = 0, d = 0;
              self.files.forEach(function (f) { a += f.additions || 0; d += f.deletions || 0; });
              self.diffStat = { add: a, del: d };
            }).catch(function () { });
          API.pullCommits(this.o, this.r, this.n)
            .then(function (r) { self.commits = r.data || []; }).catch(function () { });
          API.pullReviews(this.o, this.r, this.n)
            .then(function (rv) { self.reviews = Array.isArray(rv) ? rv : []; }).catch(function () { });
          API.pullReviewComments(this.o, this.r, this.n)
            .then(function (rc) { self.reviewComments = Array.isArray(rc) ? rc : []; }).catch(function () { });
          API.checkRuns(this.o, this.r, (pr.head && pr.head.sha) || '')
            .then(function (c) { self.checks = c; }).catch(function () { });
          API.checkStatus(this.o, this.r, (pr.head && pr.head.sha) || '')
            .then(function (s) { self.status = s; }).catch(function () { });
        } catch (e) {
          this.err = e.status === 404 ? '拉取请求不存在或无法访问' : e.message;
        }
        this.loading = false;
      },
      setTab: function (k) {
        this.tab = k;
        this.$emit('nav', '#/' + this.full + '/pulls/' + this.n + '?tab=' + k);
      },
      post: async function () {
        const body = (this.reply || '').trim();
        if (!body) return;
        this.posting = true;
        try {
          const c = await API.req('POST', '/repos/' + this.o + '/' + this.r + '/issues/' + this.n + '/comments', { body: body });
          this.comments.push(c.data);
          this.reply = '';
          U.toast('评论已发布');
        } catch (e) { U.toast('发布失败：' + e.message, 'bad'); }
        this.posting = false;
      },
      toggleMerge: async function () {
        if (this.pr.merged) return;
        if (this.pr.state === 'open') {
          if (!window.confirm('将把 ' + this.headLabel + ' 合并到 ' + this.baseLabel + '，确定继续？')) return;
          this.merging = true;
          try {
            const r = await API.req('PUT', '/repos/' + this.o + '/' + this.r + '/pulls/' + this.n + '/merge',
              { merge_method: 'merge' });
            U.toast('已合并'); this.reload();
          } catch (e) {
            U.toast('合并失败：' + (e.data && e.data.message || e.message), 'bad');
          }
          this.merging = false;
        } else {
          try {
            await API.req('PATCH', '/repos/' + this.o + '/' + this.r + '/pulls/' + this.n, { state: 'open' });
            U.toast('已重新开启'); this.reload();
          } catch (e) { U.toast('操作失败：' + e.message, 'bad'); }
        }
      },
      closePr: async function () {
        try {
          await API.req('PATCH', '/repos/' + this.o + '/' + this.r + '/pulls/' + this.n, { state: 'closed' });
          U.toast('已关闭'); this.reload();
        } catch (e) { U.toast('操作失败：' + e.message, 'bad'); }
      },
      reload: function () { API.forget('/repos/' + this.full + '/pulls/' + this.n); this.load(); },
      labelStyle: function (l) {
        if (!l || !l.color) return {};
        return { background: '#' + l.color + '1f', borderColor: '#' + l.color + '55', color: '#' + shade(l.color) };
      },
      reviewLabel: function (s) {
        return { APPROVED: '已批准', CHANGES_REQUESTED: '请求修改', COMMENTED: '留下评论', DISMISSED: '已驳回', PENDING: '待处理' }[s] || s;
      },
      reviewCls: function (s) {
        return s === 'APPROVED' ? 'badge-ok' : (s === 'CHANGES_REQUESTED' ? 'badge-alarm' : '');
      },
      checkCls: function (c) {
        const conc = c.status === 'completed' ? c.conclusion : 'pending';
        if (conc === 'success') return 'badge-ok';
        if (['failure', 'timed_out', 'cancelled', 'action_required', 'startup_failure'].indexOf(conc) >= 0) return 'badge-alarm';
        if (conc === 'pending' || c.status !== 'completed') return 'badge-warn';
        return '';
      },
      checkText: function (c) {
        return c.status === 'completed' ? (c.conclusion || '完成') : (c.status || '进行中');
      },
      copyRef: function () { U.copy('#' + this.n, '编号已复制'); }
    },
    template:
'<div v-if="loading"><div class="skel" style="height:20px;width:62%"></div>' +
'  <div style="margin-top:20px"><skel-rows :n="4"></skel-rows></div></div>' +

'<div v-else-if="err" class="card"><div class="empty" style="padding:56px">' +
'  <icon name="alert" :size="26"></icon><b>{{ err }}</b>' +
'  <button class="btn" @click="$emit(\'nav\', \'#/\' + full + \'/pulls\')">返回列表</button></div></div>' +

'<div v-else-if="pr">' +
'  <div style="margin-bottom:12px">' +
'    <h1 style="font-size:22px;line-height:1.35">{{ pr.title }} ' +
'      <span class="tnum dimmer" style="font-weight:400">#{{ pr.number }}</span></h1>' +
'    <div style="display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap">' +
'      <state-badge kind="pr" :state="pr.state" :draft="pr.draft" :merged="pr.merged" ' +
'                   :merged-at="pr.merged_at"></state-badge>' +
'      <span class="sm dim" style="display:flex;align-items:center;gap:7px">' +
'        <avatar :src="pr.user && pr.user.avatar_url" :alt="pr.user && pr.user.login" :size="20"></avatar>' +
'        <b>{{ pr.user && pr.user.login }}</b>' +
'        <span>想把 <code class="mono" style="font-size:11.5px">{{ headLabel }}</code> ' +
'          合入 <code class="mono" style="font-size:11.5px">{{ baseLabel }}</code></span>' +
'        <span>· <rel-time :iso="pr.created_at"></rel-time></span></span>' +
'      <span style="flex:1"></span>' +
'      <button v-if="pr.state === \'open\' && !pr.draft" class="btn btn-sm btn-dark" ' +
'              :disabled="merging" @click="toggleMerge">' +
'        <icon name="gitMerge" :size="13"></icon>合并</button>' +
'      <button v-if="pr.state === \'open\'" class="btn btn-sm" @click="closePr">' +
'        <icon name="x" :size="13"></icon>关闭</button>' +
'      <button v-if="pr.state === \'closed\' && !pr.merged" class="btn btn-sm" @click="toggleMerge">' +
'        <icon name="refresh" :size="13"></icon>重新开启</button>' +
'      <button class="btn btn-sm btn-quiet" @click="copyRef"><icon name="copy" :size="13"></icon>#{{ pr.number }}</button>' +
'    </div>' +
'  </div>' +

'  <div class="tabs">' +
'    <div v-for="t in tabs" :key="t.k" class="tab" :class="{on: tab === t.k}" @click="setTab(t.k)">' +
'      <icon :name="t.icon" :size="14"></icon>{{ t.l }}' +
'      <span v-if="t.n" class="n">{{ t.n }}</span></div>' +
'  </div>' +

'  <div class="pr-cols">' +
'    <div style="min-width:0">' +

      /* ---------- conversation ---------- */
'      <template v-if="tab === \'conversation\'">' +
'        <div class="card" style="margin-bottom:14px">' +
'          <div class="card-head" style="background:var(--paper-2);border-radius:8px 8px 0 0">' +
'            <avatar :src="pr.user && pr.user.avatar_url" :alt="pr.user && pr.user.login" :size="20"></avatar>' +
'            <span class="sm"><b>{{ pr.user && pr.user.login }}</b></span>' +
'            <span class="xs dimmer">发起于 <rel-time :iso="pr.created_at"></rel-time></span>' +
'            <span style="flex:1"></span>' +
'            <a class="btn btn-sm btn-quiet" :href="pr.html_url" target="_blank" rel="noopener noreferrer">' +
'              <icon name="external" :size="12"></icon>GitHub</a>' +
'          </div>' +
'          <div class="md-body" v-if="pr.body"><markdown :source="pr.body"></markdown></div>' +
'          <div v-else class="md-body dim" style="font-style:italic">（没有描述）</div>' +
'        </div>' +

'        <div v-for="c in comments" :key="c.id" class="card" style="margin-bottom:14px">' +
'          <div class="card-head" style="background:var(--paper-2);border-radius:8px 8px 0 0">' +
'            <avatar :src="c.user && c.user.avatar_url" :alt="c.user && c.user.login" :size="20"></avatar>' +
'            <span class="sm"><b>{{ c.user && c.user.login }}</b></span>' +
'            <span class="xs dimmer">评论于 <rel-time :iso="c.created_at"></rel-time></span>' +
'            <span style="flex:1"></span>' +
'            <a class="btn btn-sm btn-quiet" :href="c.html_url" target="_blank" rel="noopener noreferrer">' +
'              <icon name="link" :size="12"></icon></a>' +
'          </div>' +
'          <div class="md-body"><markdown :source="c.body"></markdown></div>' +
'        </div>' +

'        <div v-if="reviews.length" class="card" style="margin-bottom:14px">' +
'          <div class="card-head"><icon name="shield" :size="14"></icon><h3>评审</h3></div>' +
'          <div class="row-list">' +
'            <div v-for="rv in reviews" :key="rv.id" class="row">' +
'              <avatar :src="rv.user && rv.user.avatar_url" :alt="rv.user && rv.user.login" :size="22"></avatar>' +
'              <div class="row-main"><div class="row-title">' +
'                <span class="t" style="font-size:13.5px">{{ rv.user && rv.user.login }}</span>' +
'                <span class="badge" :class="reviewCls(rv.state)">{{ reviewLabel(rv.state) }}</span></div>' +
'                <div v-if="rv.body" class="sm dim" style="margin-top:5px">{{ U.firstLine(rv.body, 160) }}</div>' +
'                <div class="row-meta"><rel-time :iso="rv.submitted_at"></rel-time>' +
'                  <span v-if="rv.commit_id">· {{ (rv.commit_id||"").slice(0,7) }}</span></div></div>' +
'            </div>' +
'          </div>' +
'        </div>' +

'        <div class="card">' +
'          <div class="card-head"><icon name="comment" :size="14"></icon><h3>发表评论</h3>' +
'            <span style="flex:1"></span><span class="xs dimmer mono">支持 Markdown</span></div>' +
'          <div class="card-pad">' +
'            <textarea class="input" rows="5" v-model="reply" placeholder="写下你的评论…（⌘/Ctrl + Enter 提交）" ' +
'                      @keydown.meta.enter="post" @keydown.ctrl.enter="post"></textarea>' +
'            <div style="display:flex;gap:9px;margin-top:11px;align-items:center">' +
'              <button class="btn btn-dark" :disabled="posting || !reply.trim()" @click="post">' +
'                <span v-if="posting" class="spin" style="border-top-color:#fff"></span>' +
'                <icon v-else name="comment" :size="13"></icon>提交评论</button>' +
'              <span class="xs dimmer">将直接写入 GitHub</span></div>' +
'          </div>' +
'        </div>' +
'      </template>' +

      /* ---------- files ---------- */
'      <template v-else-if="tab === \'files\'">' +
'        <div class="card" style="margin-bottom:14px">' +
'          <div class="card-head" style="gap:10px;flex-wrap:wrap">' +
'            <span class="mono-num" style="color:var(--ok)">+{{ diffStat.add }}</span>' +
'            <span class="mono-num" style="color:var(--alarm)">-{{ diffStat.del }}</span>' +
'            <span class="sm dim">共 {{ files.length }} 个文件</span>' +
'            <span style="flex:1"></span>' +
'            <span style="position:relative;display:flex;align-items:center;min-width:180px">' +
'              <icon name="search" :size="13" style="position:absolute;left:9px;color:var(--ink-4)"></icon>' +
'              <input class="input" v-model="filter" placeholder="筛选文件名…" style="padding-left:28px"></span>' +
'          </div>' +
'          <div v-if="!files.length" class="empty" style="padding:40px">' +
'            <icon name="diff" :size="22"></icon><b>没有文件变更</b></div>' +
'          <template v-else>' +
'            <div v-for="f in filteredFiles" :key="f.sha || f.filename" class="diff-file" ' +
'                 style="border-bottom:1px solid var(--rule)">' +
'              <div class="diff-file-head" style="position:static">' +
'                <span class="badge" :class="{ \'badge-ok\': f.status === \'added\', \'badge-alarm\': f.status === \'removed\', \'badge-warn\': f.status === \'modified\' || f.status === \'renamed\' }">' +
'                  {{ f.status }}</span>' +
'                <span class="mono trunc" style="color:var(--ink-2);min-width:0">{{ f.filename }}</span>' +
'                <span class="mono dimmer xs">+{{ f.additions }} −{{ f.deletions }}</span>' +
'                <span style="flex:1"></span>' +
'                <a class="btn btn-sm btn-quiet" :href="\'#/\' + full + \'/code/blob/\' + (pr.head && pr.head.sha) + \'/\' + f.filename">' +
'                  <icon name="eye" :size="12"></icon>查看</a>' +
'              </div>' +
'              <diff-view v-if="f.patch" :patch="\'diff --git a/\' + f.filename + \' b/\' + f.filename + \'\\n\' + f.patch"></diff-view>' +
'              <div v-else class="diff-empty">' +
'                {{ f.additions === 0 && f.deletions === 0 ? "文件内容未变（权限或重命名）" : "差异过大，GitHub 未返回补丁，请点「查看」阅读文件" }}</div>' +
'            </div>' +
'          </template>' +
'        </div>' +
'      </template>' +

      /* ---------- commits ---------- */
'      <template v-else-if="tab === \'commits\'">' +
'        <div class="card">' +
'          <div v-if="!commits.length" class="empty" style="padding:40px">' +
'            <icon name="commit" :size="22"></icon><b>没有提交</b></div>' +
'          <div v-else class="row-list">' +
'            <a v-for="c in commits" :key="c.sha" class="row" :href="\'#/\' + full + \'/commit/\' + c.sha">' +
'              <avatar :src="c.author && c.author.avatar_url" :alt="c.author && c.author.login" :size="22" square></avatar>' +
'              <div class="row-main">' +
'                <div class="row-title"><span class="t" style="font-size:13.5px">{{ U.firstLine(c.commit.message, 96) }}</span></div>' +
'                <div class="row-meta"><span>{{ (c.commit.author||{}).name }}</span><span>·</span>' +
'                  <span class="mono">{{ (c.sha||"").slice(0,7) }}</span><span>·</span>' +
'                  <rel-time :iso="(c.commit.author||{}).date"></rel-time></div></div>' +
'              <icon name="right" :size="14" style="color:var(--rule-3)"></icon>' +
'            </a>' +
'          </div>' +
'        </div>' +
'      </template>' +

      /* ---------- checks ---------- */
'      <template v-else>' +
'        <div class="card">' +
'          <div class="card-head"><icon name="shield" :size="14"></icon><h3>状态检查</h3>' +
'            <span style="flex:1"></span>' +
'            <span v-if="checkSummary" class="sm dim">{{ checkSummary.total }} 项</span></div>' +
'          <div v-if="!checkSummary || !checkSummary.total" class="empty" style="padding:44px">' +
'            <icon name="info" :size="22"></icon><b>没有检查项</b>' +
'            <p>这个提交尚未配置或运行状态检查</p></div>' +
'          <div v-else class="row-list">' +
'            <div class="row" style="align-items:center">' +
'              <span class="badge" :class="checkCls(checkSummary.runs[0])" ' +
'                    :style="{display:\'inline-flex\'}"><span class="dot"></span>汇总</span>' +
'              <span style="flex:1"></span>' +
'              <span class="mono sm">成功 {{ checkSummary.map.success }} · 失败 {{ checkSummary.map.failure }} · ' +
'                进行中 {{ checkSummary.map.pending }} · 跳过 {{ checkSummary.map.skipped }}</span>' +
'            </div>' +
'            <a v-for="c in checkSummary.runs" :key="c.id" class="row" :href="c.html_url" target="_blank" rel="noopener noreferrer">' +
'              <span class="badge" :class="checkCls(c)"><span class="dot"></span>{{ checkText(c) }}</span>' +
'              <div class="row-main"><div class="row-title"><span class="t" style="font-size:13px;font-weight:500">{{ c.name }}</span></div>' +
'                <div class="row-meta"><span>{{ c.app && c.app.name }}</span>' +
'                <span v-if="c.started_at">· <rel-time :iso="c.started_at"></rel-time></span></div></div>' +
'              <icon name="external" :size="13" style="color:var(--rule-3)"></icon>' +
'            </a>' +
'          </div>' +
'        </div>' +
'      </template>' +
'    </div>' +

    /* ---------- sidebar ---------- */
'    <div style="min-width:0">' +
'      <div class="card" style="margin-bottom:14px">' +
'        <div class="card-head"><icon name="diff" :size="14"></icon><h3>变更规模</h3></div>' +
'        <div class="card-pad">' +
'          <div class="stat-inline" style="gap:20px">' +
'            <div class="s"><div class="n" style="color:var(--ok)">+{{ diffStat.add }}</div><div class="l">新增</div></div>' +
'            <div class="s"><div class="n" style="color:var(--alarm)">−{{ diffStat.del }}</div><div class="l">删除</div></div>' +
'            <div class="s"><div class="n">{{ files.length }}</div><div class="l">文件</div></div>' +
'          </div>' +
'        </div>' +
'      </div>' +
'      <div class="card" style="margin-bottom:14px">' +
'        <div class="card-head"><h3>合并信息</h3></div>' +
'        <div class="card-pad">' +
'          <div class="kv"><span class="k">可合并</span>' +
'            <span>{{ pr.mergeable === null || pr.mergeable === undefined ? "计算中" : (pr.mergeable ? "是" : "有冲突") }}</span></div>' +
'          <div class="kv"><span class="k">状态</span>' +
'            <span>{{ pr.mergeable_state || "—" }}</span></div>' +
'          <div class="kv"><span class="k">提交数</span><span class="mono">{{ pr.commits }}</span></div>' +
'          <div class="kv"><span class="k">改动</span><span class="mono">+{{ pr.additions }} −{{ pr.deletions }}</span></div>' +
'          <div class="kv"><span class="k">文件</span><span class="mono">{{ pr.changed_files }}</span></div>' +
'          <div class="kv"><span class="k">评论</span><span class="mono">{{ pr.comments + pr.review_comments }}</span></div>' +
'          <div class="kv" v-if="pr.merged_at"><span class="k">合并于</span>' +
'            <span><rel-time :iso="pr.merged_at"></rel-time></span></div>' +
'        </div>' +
'      </div>' +
'      <div class="card" style="margin-bottom:14px" v-if="pr.labels && pr.labels.length">' +
'        <div class="card-head"><h3>标签</h3></div>' +
'        <div class="card-pad" style="display:flex;flex-wrap:wrap;gap:6px">' +
'          <span v-for="l in pr.labels" :key="l.id" class="lbl" :style="labelStyle(l)">' +
'            <span class="dot"></span>{{ l.name }}</span></div>' +
'      </div>' +
'      <a class="btn" style="width:100%;margin-bottom:8px" :href="\'#/\' + full + \'/pulls\'">' +
'        <icon name="left" :size="13"></icon>全部拉取请求</a>' +
'      <a class="btn" style="width:100%" :href="pr.html_url" target="_blank" rel="noopener noreferrer">' +
'        <icon name="external" :size="13"></icon>在 GitHub 上评审</a>' +
'    </div>' +
'  </div>' +
'</div>'
  };

  window.VIEWS.pull = Pull;
})();
