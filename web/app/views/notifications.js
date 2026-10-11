/* ============================================================
   views/notifications.js
   ============================================================ */
(function () {
  'use strict';
  const C = window.C;

  const Notifications = {
    components: C,
    props: { route: Object, shell: Object },
    data: function () {
      return {
        loading: true, err: '',
        items: [], page: 1, hasNext: false, hasPrev: false,
        only: 'all'
      };
    },
    computed: {
      reasons: function () {
        const m = {};
        this.items.forEach(function (n) { m[n.reason] = (m[n.reason] || 0) + 1; });
        return Object.keys(m).sort(function (a, b) { return m[b] - m[a]; }).slice(0, 6);
      },
      shown: function () {
        if (this.only === 'unread') return this.items.filter(function (n) { return n.unread; });
        if (this.only === 'participating') return this.items.filter(function (n) { return n.reason === 'participating' || n.reason === 'mention' || n.reason === 'team_mention'; });
        if (this.only === 'review') return this.items.filter(function (n) { return n.reason === 'review_requested'; });
        return this.items;
      },
      unreadCount: function () { return this.items.filter(function (n) { return n.unread; }).length; }
    },
    created: function () { this.load(1); },
    methods: {
      load: async function (p) {
        this.loading = true; this.err = '';
        const self = this;
        try {
          const r = await API.notifications(p, { all: this.only === 'all' });
          self.items = r.data || [];
          const l = API.links(r);
          self.page = p; self.hasNext = !!l.next; self.hasPrev = p > 1;
          self.$emit('cache', r.cache);
        } catch (e) {
          self.err = e.status === 403 ? 'Token 缺少 notifications 权限' : e.message;
        }
        self.loading = false;
      },
      go: function (p) { this.load(p); },
      href: function (n) {
        const fn = n.repository && n.repository.full_name;
        if (!fn) return '#/notifications';
        const url = (n.subject && n.subject.url) || '';
        const im = url.match(/\/issues\/(\d+)$/);
        const pm = url.match(/\/pulls\/(\d+)$/);
        const cm = url.match(/\/commits\/([0-9a-f]+)$/);
        if (pm) return '#/' + fn + '/pulls/' + pm[1];
        if (im) return '#/' + fn + '/issues/' + im[1];
        if (cm) return '#/' + fn + '/commit/' + cm[1];
        return '#/' + fn;
      },
      typeLabel: function (n) {
        return {
          Issue: '议题', PullRequest: '拉取请求', Release: '发布',
          Commit: '提交', Discussion: '讨论', RepositoryVulnerabilityAlert: '安全告警',
          CheckSuite: '检查', RepositoryInvitation: '邀请'
        }[n.subject.type] || n.subject.type;
      },
      reasonLabel: function (r) {
        return {
          subscribed: '已订阅', manual: '手动', author: '你是作者',
          comment: '有新评论', mention: '提到你', team_mention: '提到你的团队',
          review_requested: '请你评审', assign: '指派给你',
          ci_activity: 'CI 活动', state_change: '状态变化', security_alert: '安全告警',
          invitation: '邀请', push: '推送', participating: '你参与过'
        }[r] || r;
      },
      markRead: async function (n, ev) {
        ev.stopPropagation(); ev.preventDefault();
        try {
          await API.markRead(n.id);
          n.unread = false;
          U.toast('已标记为已读');
          if (this.shell) this.shell.counts.notif = Math.max(0, (this.shell.counts.notif || 1) - 1);
        } catch (e) { U.toast('操作失败：' + e.message, 'bad'); }
      },
      markAll: async function () {
        try {
          await API.markAllRead({ last_read_at: new Date().toISOString() });
          this.items.forEach(function (n) { n.unread = false; });
          U.toast('已全部标记为已读');
          if (this.shell) this.shell.counts.notif = 0;
        } catch (e) { U.toast('操作失败：' + e.message, 'bad'); }
      },
      mute: async function (n, ev) {
        ev.stopPropagation(); ev.preventDefault();
        try {
          await API.req('PUT', '/notifications/threads/' + n.id + '/subscription', { ignored: true });
          U.toast('已忽略该会话');
        } catch (e) { U.toast('操作失败：' + e.message, 'bad'); }
      }
    },
    template:
'<div>' +
'  <div style="display:flex;align-items:flex-end;gap:16px;margin-bottom:18px;flex-wrap:wrap">' +
'    <div style="flex:1;min-width:200px">' +
'      <div class="eyebrow">收件箱</div>' +
'      <h1 style="margin-top:5px">通知</h1>' +
'      <p class="muted-line" style="margin:5px 0 0">来自你关注仓库与议题的动态</p>' +
'    </div>' +
'    <div style="display:flex;gap:8px">' +
'      <button class="btn" @click="markAll"><icon name="check" :size="14"></icon>全部已读</button>' +
'      <button class="btn btn-quiet" @click="load(page)"><icon name="refresh" :size="14"></icon></button>' +
'    </div>' +
'  </div>' +

'  <div v-if="err" class="banner banner-bad" style="margin-bottom:14px">' +
'    <icon name="alert" :size="14"></icon><span>{{ err }}</span></div>' +

'  <div class="tabs">' +
'    <div class="tab" :class="{on: only===\'all\'}" @click="only=\'all\'; load(1)">' +
'      全部 <span class="n">{{ items.length }}</span></div>' +
'    <div class="tab" :class="{on: only===\'unread\'}" @click="only=\'unread\'">' +
'      未读 <span class="n">{{ unreadCount }}</span></div>' +
'    <div class="tab" :class="{on: only===\'participating\'}" @click="only=\'participating\'">提及我</div>' +
'    <div class="tab" :class="{on: only===\'review\'}" @click="only=\'review\'">待评审</div>' +
'  </div>' +

'  <div v-if="loading"><skel-rows :n="8"></skel-rows></div>' +

'  <div v-else-if="!shown.length" class="empty">' +
'    <icon name="inbox" :size="24"></icon><b>收件箱是空的</b>' +
'    <p>没有需要处理的通知了</p></div>' +

'  <div v-else class="card">' +
'    <div class="row-list">' +
'      <a v-for="n in shown" :key="n.id" class="row" :href="href(n)" ' +
'         :style="{background: n.unread ? \'var(--accent-soft)\' : \'\'}">' +
'        <span class="tl-dot" :class="{on: n.unread}" style="position:static;margin-top:7px"></span>' +
'        <div class="row-main">' +
'          <div class="row-title">' +
'            <span class="lbl lbl-neutral">{{ typeLabel(n) }}</span>' +
'            <span class="t" :style="{fontWeight: n.unread ? 650 : 500}">{{ n.subject.title }}</span></div>' +
'          <div class="row-meta">' +
'            <span>{{ n.repository.full_name }}</span><span>·</span>' +
'            <span>{{ reasonLabel(n.reason) }}</span><span>·</span>' +
'            <rel-time :iso="n.updated_at"></rel-time></div>' +
'        </div>' +
'        <div class="row-side">' +
'          <button v-if="n.unread" class="btn btn-sm btn-quiet" title="标记已读" @click="markRead(n, $event)">' +
'            <icon name="check" :size="13"></icon></button>' +
'          <button class="btn btn-sm btn-quiet" title="忽略这个会话" @click="mute(n, $event)">' +
'            <icon name="x" :size="13"></icon></button>' +
'        </div>' +
'      </a>' +
'    </div>' +
'    <pager v-if="shown.length" :page="page" :has-next="hasNext" :has-prev="hasPrev" @go="go"></pager>' +
'  </div>' +
'</div>'
  };

  window.VIEWS.notifications = Notifications;
})();
