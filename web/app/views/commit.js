/* ============================================================
   views/commit.js — single commit: message, diff, comments
   ============================================================ */
(function () {
  'use strict';
  const C = window.C;

  const Commit = {
    components: C,
    props: { route: Object, shell: Object },
    data: function () {
      return {
        loading: true, err: '',
        commit: null, comments: [], comment: '', posting: false
      };
    },
    computed: {
      o: function () { return this.route.params.owner; },
      r: function () { return this.route.params.repo; },
      full: function () { return this.o + '/' + this.r; },
      sha: function () { return this.route.params.sha; },
      msg: function () {
        if (!this.commit) return { title: '', body: '' };
        const raw = (this.commit.commit && this.commit.commit.message) || '';
        const i = raw.indexOf('\n');
        return i < 0 ? { title: raw, body: '' } : { title: raw.slice(0, i), body: raw.slice(i + 1).trim() };
      },
      stat: function () {
        return (this.commit && this.commit.stats) || { additions: 0, deletions: 0, total: 0 };
      },
      files: function () { return (this.commit && this.commit.files) || []; },
      parents: function () { return (this.commit && this.commit.parents) || []; }
    },
    watch: { '$route.params.sha': function () { this.load(); } },
    created: function () { this.load(); },
    methods: {
      load: async function () {
        this.loading = true; this.err = ''; this.comments = [];
        const self = this;
        try {
          const c = await API.commit(this.o, this.r, this.sha);
          self.commit = c;
          API.commitComments(this.o, this.r, this.sha)
            .then(function (x) { self.comments = Array.isArray(x) ? x : []; }).catch(function () { });
        } catch (e) {
          this.err = e.status === 404 ? '找不到这个提交' : e.message;
        }
        this.loading = false;
      },
      post: async function () {
        const body = (this.comment || '').trim();
        if (!body) return;
        this.posting = true;
        try {
          const c = await API.req('POST', '/repos/' + this.o + '/' + this.r + '/commits/' + this.sha + '/comments', { body: body });
          this.comments.push(c.data); this.comment = '';
          U.toast('评论已发布');
        } catch (e) { U.toast('发布失败：' + e.message, 'bad'); }
        this.posting = false;
      },
      title: function (f) { return 'diff --git a/' + f.filename + ' b/' + f.filename + '\n' + (f.patch || ''); },
      short: function (s) { return (s || '').slice(0, 7); }
    },
    template:
'<div v-if="loading"><div class="skel" style="height:20px;width:56%"></div>' +
'  <div style="margin-top:18px"><skel-rows :n="4"></skel-rows></div></div>' +

'<div v-else-if="err" class="card"><div class="empty" style="padding:56px">' +
'  <icon name="alert" :size="26"></icon><b>{{ err }}</b>' +
'  <button class="btn" @click="$emit(\'nav\', \'#/\' + full + \'/commits\')">返回提交历史</button></div></div>' +

'<div v-else-if="commit">' +
'  <div style="margin-bottom:14px">' +
'    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
'      <span class="lbl lbl-neutral mono"><icon name="commit" :size="12"></icon>{{ short(sha) }}</span>' +
'      <span v-if="commit.commit.verification && commit.commit.verification.verified" class="badge badge-ok">' +
'        <span class="dot"></span>签名已验证</span>' +
'      <span style="flex:1"></span>' +
'      <button class="btn btn-sm btn-quiet" @click="U.copy(sha, \'SHA 已复制\')">' +
'        <icon name="copy" :size="12"></icon>复制 SHA</button>' +
'      <a class="btn btn-sm btn-quiet" :href="commit.html_url" target="_blank" rel="noopener noreferrer">' +
'        <icon name="external" :size="12"></icon>GitHub</a>' +
'    </div>' +
'    <h1 style="margin-top:11px;font-size:20px;line-height:1.4">{{ msg.title }}</h1>' +
'    <div v-if="msg.body" class="card" style="margin-top:11px">' +
'      <div class="md-body"><markdown :source="msg.body"></markdown></div></div>' +
'    <div style="display:flex;align-items:center;gap:9px;margin-top:11px;flex-wrap:wrap">' +
'      <avatar :src="commit.author && commit.author.avatar_url" :alt="(commit.commit.author||{}).name" :size="24"></avatar>' +
'      <span class="sm"><b>{{ (commit.commit.author || {}).name }}</b>' +
'        <span class="dimmer mono">{{ (commit.commit.author||{}).email }}</span></span>' +
'      <span class="sm dim">提交于 <rel-time :iso="(commit.commit.author||{}).date"></rel-time></span>' +
'      <span style="flex:1"></span>' +
'      <span class="mono-num" style="color:var(--ok)">+{{ stat.additions }}</span>' +
'      <span class="mono-num" style="color:var(--alarm)">−{{ stat.deletions }}</span>' +
'      <span class="sm dim">{{ files.length }} 个文件</span>' +
'    </div>' +
'    <div v-if="parents.length" style="display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap">' +
'      <span class="xs dimmer mono">父提交</span>' +
'      <a v-for="p in parents" :key="p.sha" class="lbl lbl-tag" :href="\'#/\' + full + \'/commit/\' + p.sha">' +
'        {{ short(p.sha) }}</a>' +
'      <a v-if="parents.length === 1" class="btn btn-sm btn-quiet" ' +
'         :href="\'#/\' + full + \'/compare/\' + parents[0].sha + \'...\' + sha">' +
'        <icon name="diff" :size="12"></icon>查看此提交的差异</a>' +
'    </div>' +
'  </div>' +

'  <div class="diff" style="margin-bottom:14px">' +
'    <div v-if="!files.length" class="diff-empty">没有文件变更</div>' +
'    <div v-for="f in files" :key="f.sha || f.filename" class="diff-file">' +
'      <div class="diff-file-head">' +
'        <span class="badge" :class="{ \'badge-ok\': f.status === \'added\', \'badge-alarm\': f.status === \'removed\', \'badge-warn\': f.status === \'modified\' }">{{ f.status }}</span>' +
'        <span class="mono trunc" style="color:var(--ink-2);min-width:0">{{ f.filename }}</span>' +
'        <span class="mono dimmer xs">+{{ f.additions }} −{{ f.deletions }}</span>' +
'        <span style="flex:1"></span>' +
'        <a class="btn btn-sm btn-quiet" :href="\'#/\' + full + \'/code/blob/\' + sha + \'/\' + f.filename">' +
'          <icon name="eye" :size="12"></icon></a>' +
'      </div>' +
'      <diff-view v-if="f.patch" :patch="title(f)"></diff-view>' +
'      <div v-else class="diff-empty">' +
'        {{ (f.additions + f.deletions === 0) ? "内容未变（二进制或权限变更）" : "差异过大，未返回补丁" }}</div>' +
'    </div>' +
'  </div>' +

'  <div class="card">' +
'    <div class="card-head"><icon name="comment" :size="14"></icon><h3>提交评论</h3>' +
'      <span style="flex:1"></span><span class="mono-num dimmer">{{ comments.length }}</span></div>' +
'    <div v-for="c in comments" :key="c.id" class="card-pad" style="border-bottom:1px solid var(--rule)">' +
'      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
'        <avatar :src="c.user && c.user.avatar_url" :alt="c.user && c.user.login" :size="20"></avatar>' +
'        <span class="sm"><b>{{ c.user && c.user.login }}</b></span>' +
'        <span class="xs dimmer"><rel-time :iso="c.created_at"></rel-time></span></div>' +
'      <markdown :source="c.body"></markdown>' +
'    </div>' +
'    <div class="card-pad">' +
'      <textarea class="input" rows="3" v-model="comment" placeholder="对这个提交发表评论…"></textarea>' +
'      <div style="display:flex;gap:9px;margin-top:10px;align-items:center">' +
'        <button class="btn btn-dark btn-sm" :disabled="posting || !comment.trim()" @click="post">' +
'          <span v-if="posting" class="spin" style="border-top-color:#fff"></span>' +
'          <icon v-else name="comment" :size="12"></icon>提交</button>' +
'        <span class="xs dimmer">将直接写入 GitHub</span></div>' +
'    </div>' +
'  </div>' +
'</div>'
  };

  window.VIEWS.commit = Commit;
})();
