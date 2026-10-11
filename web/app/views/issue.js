/* ============================================================
   views/issue.js — issue detail with timeline + comments
   ============================================================ */
(function () {
  'use strict';
  const C = window.C;
  const shade = function (h) { return window.__shade(h); };

  const Issue = {
    components: C,
    props: { route: Object, shell: Object },
    data: function () {
      return {
        loading: true, err: '',
        issue: null, comments: [], events: [], timeline: [],
        reply: '', posting: false, useTimeline: true
      };
    },
    computed: {
      o: function () { return this.route.params.owner; },
      r: function () { return this.route.params.repo; },
      full: function () { return this.o + '/' + this.r; },
      n: function () { return this.route.params.number; },
      merged: function () { return false; },
      closedBy: function () {
        const ev = this.events.filter(function (e) { return e.event === 'closed'; });
        return ev.length ? ev[ev.length - 1].actor : null;
      },
      commentCount: function () { return this.comments.length; },
      timelineItems: function () {
        if (!this.useTimeline || !this.timeline.length) return [];
        const self = this;
        return this.timeline.filter(function (it) {
          return it.event !== 'commented' || false;
        });
      }
    },
    watch: { '$route.params.number': function () { this.load(); } },
    created: function () { this.load(); },
    methods: {
      load: async function () {
        this.loading = true; this.err = ''; this.comments = []; this.timeline = []; this.events = [];
        const self = this;
        try {
          const [issue, comments] = await Promise.all([
            API.issue(this.o, this.r, this.n),
            API.issueComments(this.o, this.r, this.n).catch(function () { return []; })
          ]);
          self.issue = issue;
          self.comments = Array.isArray(comments) ? comments : [];
          if (issue.pull_request) {
            self.$emit('nav', '#/' + self.full + '/pulls/' + self.n);
            return;
          }
          API.issueEvents(this.o, this.r, this.n)
            .then(function (ev) { self.events = Array.isArray(ev) ? ev : []; }).catch(function () { });
          API.timeline(this.o, this.r, this.n, { accept: 'application/vnd.github.mockingbird-preview+json' })
            .then(function (tl) { if (Array.isArray(tl) && tl.length) self.timeline = tl; })
            .catch(function () { self.useTimeline = false; });
        } catch (e) {
          this.err = e.status === 404 ? '议题不存在或无法访问' : e.message;
        }
        this.loading = false;
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
      toggleState: async function () {
        const to = this.issue.state === 'open' ? 'closed' : 'open';
        try {
          const r = await API.req('PATCH', '/repos/' + this.o + '/' + this.r + '/issues/' + this.n, { state: to });
          this.issue = r.data;
          U.toast(to === 'closed' ? '议题已关闭' : '议题已重新开启');
        } catch (e) { U.toast('操作失败：' + e.message, 'bad'); }
      },
      copyRef: function () { U.copy('#' + this.n, '编号已复制'); },
      labelStyle: function (l) {
        if (!l || !l.color) return {};
        return { background: '#' + l.color + '1f', borderColor: '#' + l.color + '55', color: '#' + shade(l.color) };
      },
      evText: function (it) {
        const a = (it.actor && it.actor.login) || '某人';
        switch (it.event) {
          case 'closed': return a + ' 关闭了此议题';
          case 'reopened': return a + ' 重新开启了此议题';
          case 'labeled': return a + ' 添加了标签 ' + ((it.label && it.label.name) || '');
          case 'unlabeled': return a + ' 移除了标签 ' + ((it.label && it.label.name) || '');
          case 'assigned': return a + ' 指派给 ' + ((it.assignee && it.assignee.login) || '');
          case 'unassigned': return a + ' 取消了指派';
          case 'milestoned': return a + ' 加入了里程碑';
          case 'demilestoned': return a + ' 移除了里程碑';
          case 'referenced': return a + ' 在提交中引用了此议题：' + ((it.commit_id || '').slice(0, 7));
          case 'renamed': return a + ' 修改了标题';
          case 'locked': return a + ' 锁定了对话';
          case 'unlocked': return a + ' 解锁了对话';
          case 'cross-referenced': return a + ' 引用了 ' + (((it.source && it.source.issue && it.source.issue.title) || '另一个议题'));
          default: return a + ' ' + it.event;
        }
      },
      evIcon: function (it) {
        return { closed: 'check', reopened: 'issueOpen', labeled: 'tag', unlabeled: 'tag',
          assigned: 'users', referenced: 'commit', locked: 'lock', 'cross-referenced': 'link' }[it.event] || 'activity';
      },
      stateReason: function () {
        if (this.issue.state === 'open') return '';
        return this.issue.state_reason === 'not_planned' ? '未计划' : '已完成';
      }
    },
    template:
'<div v-if="loading"><div class="skel" style="height:20px;width:60%"></div>' +
'  <div style="margin-top:20px"><skel-rows :n="4"></skel-rows></div></div>' +

'<div v-else-if="err" class="card"><div class="empty" style="padding:56px">' +
'  <icon name="alert" :size="26"></icon><b>{{ err }}</b>' +
'  <button class="btn" @click="$emit(\'nav\', \'#/\' + full + \'/issues\')">返回议题列表</button></div></div>' +

'<div v-else-if="issue">' +
'  <div style="margin-bottom:14px">' +
'    <h1 style="font-size:22px;line-height:1.35">{{ issue.title }} ' +
'      <span class="tnum dimmer" style="font-weight:400">#{{ issue.number }}</span></h1>' +
'    <div style="display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap">' +
'      <state-badge kind="issue" :state="issue.state"></state-badge>' +
'      <span v-if="stateReason" class="badge">{{ stateReason }}</span>' +
'      <span class="sm dim" style="display:flex;align-items:center;gap:7px">' +
'        <avatar :src="issue.user && issue.user.avatar_url" :alt="issue.user && issue.user.login" :size="20"></avatar>' +
'        <b style="font-weight:600">{{ issue.user && issue.user.login }}</b>' +
'        <span>于 <rel-time :iso="issue.created_at"></rel-time> 创建 · {{ commentCount }} 条评论</span></span>' +
'      <span style="flex:1"></span>' +
'      <button class="btn btn-sm" @click="toggleState">' +
'        <icon :name="issue.state === \'open\' ? \'check\' : \'refresh\'" :size="13"></icon>' +
'        {{ issue.state === "open" ? "关闭议题" : "重新开启" }}</button>' +
'      <button class="btn btn-sm btn-quiet" @click="copyRef">' +
'        <icon name="copy" :size="13"></icon>#{{ issue.number }}</button>' +
'    </div>' +
'  </div>' +

'  <div class="issue-cols">' +
'    <div style="min-width:0">' +

/* body */
'      <div class="card" style="margin-bottom:14px">' +
'        <div class="card-head" style="background:var(--paper-2);border-radius:8px 8px 0 0">' +
'          <avatar :src="issue.user && issue.user.avatar_url" :alt="issue.user && issue.user.login" :size="20"></avatar>' +
'          <span class="sm"><b>{{ issue.user && issue.user.login }}</b></span>' +
'          <span class="xs dimmer">作者</span>' +
'          <span style="flex:1"></span>' +
'          <a class="btn btn-sm btn-quiet" :href="issue.html_url" target="_blank" rel="noopener noreferrer">' +
'            <icon name="external" :size="12"></icon>GitHub</a>' +
'        </div>' +
'        <div class="md-body" v-if="issue.body"><markdown :source="issue.body" :owner="o" :repo="r"></markdown></div>' +
'        <div v-else class="md-body dim" style="font-style:italic">（没有正文）</div>' +
'      </div>' +

/* comments */
'      <div v-for="c in comments" :key="c.id" class="card" style="margin-bottom:14px">' +
'        <div class="card-head" style="background:var(--paper-2);border-radius:8px 8px 0 0">' +
'          <avatar :src="c.user && c.user.avatar_url" :alt="c.user && c.user.login" :size="20"></avatar>' +
'          <span class="sm"><b>{{ c.user && c.user.login }}</b></span>' +
'          <span class="xs dimmer">评论于 <rel-time :iso="c.created_at"></rel-time></span>' +
'          <span style="flex:1"></span>' +
'          <a class="btn btn-sm btn-quiet" :href="c.html_url" target="_blank" rel="noopener noreferrer">' +
'            <icon name="link" :size="12"></icon></a>' +
'        </div>' +
'        <div class="md-body"><markdown :source="c.body" :owner="o" :repo="r"></markdown></div>' +
'      </div>' +

/* timeline of events */
'      <div v-if="events.length" class="card" style="margin-bottom:14px">' +
'        <div class="card-head"><icon name="activity" :size="14"></icon><h3>动态</h3></div>' +
'        <div class="card-pad"><div class="timeline">' +
'          <div v-for="(ev, i) in events" :key="i" class="tl-item">' +
'            <span class="tl-dot"></span>' +
'            <div style="display:flex;align-items:center;gap:8px">' +
'              <icon :name="evIcon(ev)" :size="13" style="color:var(--ink-4)"></icon>' +
'              <span class="sm">{{ evText(ev) }}</span></div>' +
'            <div class="xs dimmer" style="margin-top:2px"><rel-time :iso="ev.created_at"></rel-time></div>' +
'          </div>' +
'        </div></div>' +
'      </div>' +

/* reply */
'      <div v-if="issue.state === \'open\'" class="card">' +
'        <div class="card-head"><icon name="comment" :size="14"></icon><h3>发表评论</h3>' +
'          <span style="flex:1"></span>' +
'          <span class="xs dimmer mono">支持 Markdown</span></div>' +
'        <div class="card-pad">' +
'          <textarea class="input" rows="5" v-model="reply" ' +
'                    placeholder="写下你的回复…（⌘/Ctrl + Enter 提交）" ' +
'                    @keydown.meta.enter="post" @keydown.ctrl.enter="post"></textarea>' +
'          <div style="display:flex;align-items:center;gap:9px;margin-top:11px">' +
'            <button class="btn btn-dark" :disabled="posting || !reply.trim()" @click="post">' +
'              <span v-if="posting" class="spin" style="border-top-color:#fff"></span>' +
'              <icon v-else name="comment" :size="13"></icon>提交评论</button>' +
'            <span class="xs dimmer">将直接写入 GitHub，请在正式仓库中谨慎操作</span>' +
'          </div>' +
'        </div>' +
'      </div>' +
'      <div v-else class="banner" style="margin-top:4px">' +
'        <icon name="info" :size="14"></icon>' +
'        <span>议题已关闭。重新开启后可继续评论。</span></div>' +
'    </div>' +

/* sidebar */
'    <div style="min-width:0">' +
'      <div class="card" style="margin-bottom:14px">' +
'        <div class="card-head"><h3>标签</h3></div>' +
'        <div class="card-pad" v-if="issue.labels && issue.labels.length" ' +
'             style="display:flex;flex-wrap:wrap;gap:6px">' +
'          <span v-for="l in issue.labels" :key="l.id" class="lbl" :style="labelStyle(l)">' +
'            <span class="dot"></span>{{ l.name }}</span></div>' +
'        <div v-else class="card-pad sm dim">没有标签</div>' +
'      </div>' +
'      <div class="card" style="margin-bottom:14px">' +
'        <div class="card-head"><h3>信息</h3></div>' +
'        <div class="card-pad">' +
'          <div class="kv"><span class="k">指派人</span>' +
'            <span v-if="issue.assignee" style="display:flex;align-items:center;gap:6px">' +
'              <avatar :src="issue.assignee.avatar_url" :alt="issue.assignee.login" :size="16"></avatar>' +
'              {{ issue.assignee.login }}</span>' +
'            <span v-else class="dimmer">未指派</span></div>' +
'          <div class="kv" v-if="issue.milestone"><span class="k">里程碑</span>' +
'            <span>{{ issue.milestone.title }}</span></div>' +
'          <div class="kv"><span class="k">评论</span><span class="mono">{{ commentCount }}</span></div>' +
'          <div class="kv"><span class="k">创建</span><span><rel-time :iso="issue.created_at"></rel-time></span></div>' +
'          <div class="kv"><span class="k">更新</span><span><rel-time :iso="issue.updated_at"></rel-time></span></div>' +
'          <div class="kv" v-if="issue.closed_at"><span class="k">关闭于</span>' +
'            <span><rel-time :iso="issue.closed_at"></rel-time></span></div>' +
'        </div>' +
'      </div>' +
'      <a class="btn" style="width:100%" :href="\'#/\' + full + \'/issues\'">' +
'        <icon name="left" :size="13"></icon>全部议题</a>' +
'    </div>' +
'  </div>' +
'</div>'
  };

  window.VIEWS.issue = Issue;
})();
