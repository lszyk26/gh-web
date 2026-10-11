/* ============================================================
   views/actions.js — Actions workflows & run history (read-only)
   Note: job logs are streamed behind GitHub's private endpoints and
   cannot be fetched here; the UI links out to github.com for them.
   ============================================================ */
(function () {
  'use strict';
  const C = window.C;

  const Actions = {
    components: C,
    props: { route: Object, shell: Object },
    data: function () {
      return {
        loading: true, err: '',
        workflows: [], runs: [], page: 1, hasNext: false, hasPrev: false,
        status: '', branch: '', repo: null, repoBranches: [], branchOpen: false, branchFilter: ''
      };
    },
    computed: {
      o: function () { return this.route.params.owner; },
      r: function () { return this.route.params.repo; },
      full: function () { return this.o + '/' + this.r; },
      filteredBranches: function () {
        const f = this.branchFilter.trim().toLowerCase();
        const n = this.repoBranches.map(function (b) { return b.name; });
        return (f ? n.filter(function (x) { return x.toLowerCase().indexOf(f) >= 0; }) : n).slice(0, 60);
      },
      statuses: function () {
        return [
          { k: '', l: '全部' }, { k: 'completed', l: '已完成' },
          { k: 'in_progress', l: '进行中' }, { k: 'queued', l: '排队中' }
        ];
      }
    },
    watch: { '$route.params.repo': function () { this.boot(); } },
    created: function () { this.boot(); },
    methods: {
      boot: async function () {
        const self = this;
        try { self.repo = await API.repo(this.o, this.r); } catch (e) { }
        API.branches(this.o, this.r).then(function (b) { self.repoBranches = b.data || []; }).catch(function () { });
        API.workflows(this.o, this.r)
          .then(function (w) { self.workflows = (w && w.workflows) || []; }).catch(function () { });
        this.load(1);
      },
      load: async function (p) {
        this.loading = true; this.err = '';
        try {
          const params = { per_page: 25, page: p };
          if (this.status) params.status = this.status;
          if (this.branch) params.branch = this.branch;
          const r = await API.actionsRuns(this.o, this.r, params);
          this.runs = (r.data && r.data.workflow_runs) || [];
          this.total = (r.data && r.data.total_count) || 0;
          this.page = p;
          const l = API.links(r);
          this.hasNext = !!l.next; this.hasPrev = p > 1;
          this.$emit('cache', r.cache);
        } catch (e) {
          this.err = e.status === 404 ? '此仓库未启用 Actions，或 Token 无权读取' : e.message;
        }
        this.loading = false;
      },
      setStatus: function (s) { this.status = s; this.load(1); },
      pickBranch: function (b) { this.branchOpen = false; this.branchFilter = ''; this.branch = b; this.load(1); },
      go: function (p) { this.load(p); },
      runCls: function (run) {
        if (run.status !== 'completed') return 'badge-warn';
        return { success: 'badge-ok', failure: 'badge-alarm', cancelled: '', skipped: '', neutral: '', timed_out: 'badge-alarm', action_required: 'badge-warn' }[run.conclusion] || '';
      },
      runText: function (run) {
        if (run.status !== 'completed') return { in_progress: '进行中', queued: '排队中', requested: '已请求', waiting: '等待中', pending: '待处理' }[run.status] || run.status;
        return { success: '成功', failure: '失败', cancelled: '已取消', skipped: '已跳过', neutral: '中性', timed_out: '超时', action_required: '需操作', stale: '过期' }[run.conclusion] || run.conclusion;
      },
      dur: function (run) {
        if (!run.run_started_at || !run.updated_at) return '';
        const a = new Date(run.run_started_at), b = new Date(run.updated_at);
        const s = Math.max(0, Math.round((b - a) / 1000));
        if (s < 60) return s + 's';
        const m = Math.floor(s / 60);
        return m + 'm ' + (s % 60) + 's';
      },
      open: function (run) { this.$emit('nav', '#/' + this.full + '/actions/' + run.id); }
    },
    template:
'<div>' +
'  <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">' +
'    <h1 style="font-size:19px"><a :href="\'#/\' + o" style="color:var(--ink-3);font-weight:400">{{ o }}</a>' +
'      <span class="dimmer" style="font-weight:300">/</span>' +
'      <a :href="\'#/\' + full" style="font-weight:700">{{ r }}</a>' +
'      <span class="dimmer" style="font-weight:300">/</span>流水线</h1>' +
'  </div>' +

'  <div v-if="workflows.length" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;margin-bottom:16px">' +
'    <div v-for="w in workflows" :key="w.id" class="card card-pad" style="display:flex;align-items:center;gap:10px">' +
'      <icon name="zap" :size="15" style="color:var(--accent)"></icon>' +
'      <span style="min-width:0;flex:1"><span class="sm trunc" style="display:block;font-weight:500">{{ w.name }}</span>' +
'        <span class="xs dimmer mono trunc" style="display:block">{{ w.path }}</span></span>' +
'      <span class="badge" :class="{ \'badge-alarm\': w.state !== \'active\' }">{{ w.state === "active" ? "启用" : "停用" }}</span>' +
'    </div>' +
'  </div>' +

'  <div class="card">' +
'    <div class="card-head" style="gap:9px;flex-wrap:wrap">' +
'      <span class="seg">' +
'        <button v-for="s in statuses" :key="s.k" :class="{on: status === s.k}" @click="setStatus(s.k)">{{ s.l }}</button>' +
'      </span>' +
'      <dropdown align="left" :width="270">' +
'        <template #trigger><button class="btn btn-sm" style="max-width:220px">' +
'          <icon name="branch" :size="13"></icon>' +
'          <span class="trunc mono" style="max-width:150px">{{ branch || "全部分支" }}</span>' +
'          <icon name="down" :size="12"></icon></button></template>' +
'        <template #menu>' +
'          <div style="padding:5px 5px 6px">' +
'            <input class="input mono-input" v-model="branchFilter" placeholder="筛选分支…" style="height:28px" @click.stop></div>' +
'          <div class="pop-item" @click="branch=\'\'; branchOpen=false; load(1)">' +
'            <icon name="branch" :size="12"></icon>全部分支</div>' +
'          <div style="max-height:250px;overflow:auto">' +
'            <div v-for="b in filteredBranches" :key="b" class="pop-item mono" :style="{fontSize:\'12px\'}" ' +
'                 @click="pickBranch(b)"><icon name="branch" :size="12"></icon>{{ b }}</div></div>' +
'        </template>' +
'      </dropdown>' +
'      <span style="flex:1"></span>' +
'      <span class="xs dimmer mono">{{ total }} 次运行</span>' +
'      <button class="btn btn-sm btn-quiet" @click="load(page)"><icon name="refresh" :size="13"></icon></button>' +
'    </div>' +

'    <div v-if="err" class="banner banner-bad" style="margin:14px">' +
'      <icon name="alert" :size="14"></icon><span>{{ err }}</span></div>' +

'    <div v-if="loading"><skel-rows :n="8"></skel-rows></div>' +
'    <div v-else-if="!runs.length" class="empty">' +
'      <icon name="play" :size="24"></icon><b>没有运行记录</b>' +
'      <p>调整筛选条件，或此仓库尚未配置工作流</p></div>' +

'    <div v-else class="row-list">' +
'      <a v-for="run in runs" :key="run.id" class="row" :href="\'#/\' + full + \'/actions/\' + run.id">' +
'        <span class="badge" :class="runCls(run)" style="margin-top:1px">' +
'          <span class="dot"></span>{{ runText(run) }}</span>' +
'        <div class="row-main">' +
'          <div class="row-title"><span class="t" style="font-size:13.5px">{{ run.name }}' +
'            <span class="dimmer mono" style="font-weight:400">#{{ run.run_number }}</span></span></div>' +
'          <div class="row-meta">' +
'            <span>{{ U.firstLine(run.head_commit && run.head_commit.message, 60) }}</span>' +
'            <span>·</span><span class="mono">{{ run.head_branch }}</span>' +
'            <span>·</span><span class="mono">{{ (run.head_sha||"").slice(0,7) }}</span>' +
'            <span>·</span><rel-time :iso="run.created_at"></rel-time>' +
'            <template v-if="dur(run)"><span>·</span><span>{{ dur(run) }}</span></template></div>' +
'        </div>' +
'        <div class="row-side">' +
'          <avatar :src="run.actor && run.actor.avatar_url" :alt="run.actor && run.actor.login" :size="20"></avatar></div>' +
'      </a>' +
'    </div>' +
'    <pager v-if="!loading && runs.length" :page="page" :has-next="hasNext" :has-prev="hasPrev" @go="go"></pager>' +
'  </div>' +

'  <div class="banner" style="margin-top:14px">' +
'    <icon name="info" :size="14"></icon>' +
'    <span>GitHub 的任务日志通过私有接口实时流式传输，第三方站点无法读取；' +
'      点开某次运行可查看各步骤状态，日志请到 github.com 查看。</span></div>' +
'</div>'
  };

  const Run = {
    components: C,
    props: { route: Object, shell: Object },
    data: function () {
      return { loading: true, err: '', run: null, jobs: [], stepsOpen: {} };
    },
    computed: {
      o: function () { return this.route.params.owner; },
      r: function () { return this.route.params.repo; },
      full: function () { return this.o + '/' + this.r; },
      id: function () { return this.route.params.runId; }
    },
    created: function () { this.load(); },
    methods: {
      load: async function () {
        this.loading = true; this.err = '';
        const self = this;
        try {
          const run = await API.actionsRun(this.o, this.r, this.id);
          self.run = run;
          const jobs = await API.actionsJobs(this.o, this.r, this.id);
          self.jobs = (jobs && jobs.jobs) || [];
        } catch (e) { this.err = e.status === 404 ? '找不到这次运行' : e.message; }
        this.loading = false;
      },
      jobCls: function (j) {
        if (j.status !== 'completed') return 'badge-warn';
        return { success: 'badge-ok', failure: 'badge-alarm', cancelled: '', skipped: '' }[j.conclusion] || '';
      },
      jobText: function (j) {
        if (j.status !== 'completed') return '进行中';
        return { success: '成功', failure: '失败', cancelled: '已取消', skipped: '已跳过' }[j.conclusion] || j.conclusion;
      },
      stepCls: function (s) {
        if (s.status !== 'completed') return 'badge-warn';
        return { success: 'badge-ok', failure: 'badge-alarm', skipped: '' }[s.conclusion] || '';
      },
      dur: function (a, b) {
        if (!a || !b) return '';
        const s = Math.max(0, Math.round((new Date(b) - new Date(a)) / 1000));
        return s < 60 ? s + 's' : Math.floor(s / 60) + 'm ' + (s % 60) + 's';
      },
      toggle: function (id) { this.stepsOpen[id] = !this.stepsOpen[id]; }
    },
    template:
'<div v-if="loading"><div class="skel" style="height:20px;width:50%"></div>' +
'  <div style="margin-top:18px"><skel-rows :n="4"></skel-rows></div></div>' +

'<div v-else-if="err" class="card"><div class="empty" style="padding:52px">' +
'  <icon name="alert" :size="24"></icon><b>{{ err }}</b>' +
'  <button class="btn" @click="$emit(\'nav\', \'#/\' + full + \'/actions\')">返回流水线</button></div></div>' +

'<div v-else-if="run">' +
'  <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">' +
'    <a class="btn btn-sm btn-quiet" :href="\'#/\' + full + \'/actions\'">' +
'      <icon name="left" :size="13"></icon>流水线</a>' +
'    <h1 style="font-size:19px">{{ run.name }} <span class="dimmer mono" style="font-weight:400">#{{ run.run_number }}</span></h1>' +
'    <span class="badge" :class="{ \'badge-ok\': run.conclusion === \'success\', \'badge-alarm\': run.conclusion === \'failure\', \'badge-warn\': run.status !== \'completed\' }">' +
'      <span class="dot"></span>{{ run.conclusion || run.status }}</span>' +
'    <span style="flex:1"></span>' +
'    <a class="btn btn-sm" :href="run.html_url" target="_blank" rel="noopener noreferrer">' +
'      <icon name="external" :size="13"></icon>查看日志（GitHub）</a>' +
'  </div>' +

'  <div class="card" style="margin-bottom:14px">' +
'    <div class="card-pad" style="display:flex;gap:13px;align-items:center;flex-wrap:wrap">' +
'      <avatar :src="run.actor && run.actor.avatar_url" :alt="run.actor && run.actor.login" :size="28"></avatar>' +
'      <div><div class="sm" style="font-weight:600">{{ U.firstLine(run.head_commit && run.head_commit.message, 90) }}</div>' +
'        <div class="row-meta" style="margin-top:2px">' +
'          <span>{{ run.actor && run.actor.login }}</span><span>·</span>' +
'          <span class="mono">{{ run.head_branch }}</span><span>·</span>' +
'          <a class="mono" :href="\'#/\' + full + \'/commit/\' + run.head_sha">{{ (run.head_sha||"").slice(0,7) }}</a>' +
'          <span>·</span><rel-time :iso="run.created_at"></rel-time>' +
'          <span v-if="dur(run.run_started_at, run.updated_at)">·</span>' +
'          <span>{{ dur(run.run_started_at, run.updated_at) }}</span></div></div>' +
'      <span style="flex:1"></span>' +
'      <span class="kv"><span class="k">事件</span><span class="mono">{{ run.event }}</span></span>' +
'      <span class="kv"><span class="k">尝试</span><span class="mono">{{ run.run_attempt }}</span></span>' +
'    </div>' +
'  </div>' +

'  <div class="card">' +
'    <div class="card-head"><icon name="rows" :size="14"></icon><h3>任务</h3>' +
'      <span style="flex:1"></span><span class="mono-num dimmer">{{ jobs.length }}</span></div>' +
'    <div v-if="!jobs.length" class="empty" style="padding:40px">' +
'      <icon name="info" :size="22"></icon><b>暂无任务信息</b></div>' +
'    <div v-else class="row-list">' +
'      <div v-for="j in jobs" :key="j.id">' +
'        <div class="row" style="cursor:pointer" @click="toggle(j.id)">' +
'          <span class="badge" :class="jobCls(j)" style="margin-top:1px">' +
'            <span class="dot"></span>{{ jobText(j) }}</span>' +
'          <div class="row-main"><div class="row-title">' +
'            <span class="t" style="font-size:13.5px;font-weight:500">{{ j.name }}</span>' +
'            <span v-if="j.conclusion === \'failure\'" class="badge badge-alarm">失败</span></div>' +
'            <div class="row-meta">' +
'              <template v-for="(s, i) in (j.steps || [])" :key="i">' +
'                <span :style="{color: s.conclusion === \'failure\' ? \'var(--alarm)\' : (s.conclusion === \'success\' ? \'var(--ok)\' : \'inherit\')}">' +
'                  {{ i + 1 }}</span></template>' +
'              <span>· {{ (j.steps || []).length }} 个步骤</span>' +
'              <span v-if="dur(j.started_at, j.completed_at)">· {{ dur(j.started_at, j.completed_at) }}</span>' +
'              <span v-if="j.runner_name">· {{ j.runner_name }}</span></div></div>' +
'          <icon :name="stepsOpen[j.id] ? \'up\' : \'down\'" :size="14" style="color:var(--ink-4)"></icon>' +
'        </div>' +
'        <div v-if="stepsOpen[j.id]" style="padding:6px 14px 12px 44px;background:var(--paper-2)">' +
'          <div v-for="(s, i) in (j.steps || [])" :key="i" ' +
'               style="display:flex;align-items:center;gap:9px;padding:5px 0;font-size:12.5px">' +
'            <span class="mono dimmer" style="width:18px;text-align:right">{{ i + 1 }}</span>' +
'            <icon :name="s.conclusion === \'success\' ? \'check\' : (s.conclusion === \'failure\' ? \'x\' : \'clock\')" ' +
'                  :size="13" :style="{color: s.conclusion === \'success\' ? \'var(--ok)\' : (s.conclusion === \'failure\' ? \'var(--alarm)\' : \'var(--ink-4)\')}"></icon>' +
'            <span style="flex:1">{{ s.name }}</span>' +
'            <span v-if="dur(s.started_at, s.completed_at)" class="mono dimmer">{{ dur(s.started_at, s.completed_at) }}</span>' +
'          </div>' +
'        </div>' +
'      </div>' +
'    </div>' +
'  </div>' +
'</div>'
  };

  window.VIEWS.actions = Actions;
  window.VIEWS.run = Run;
})();
