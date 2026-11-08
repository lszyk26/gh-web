/* ============================================================
   views/issues.js — issue list
   ============================================================ */
(function () {
  'use strict';
  const C = window.C;

  const Issues = {
    components: C,
    props: { route: Object, shell: Object },
    data: function () {
      return {
        loading: true, err: '',
        items: [], page: 1, hasNext: false, hasPrev: false,
        state: 'open', sort: 'created', labels: [], labelFilter: '',
        q: '', counts: { open: null, closed: null }
      };
    },
    computed: {
      o: function () { return this.route.params.owner; },
      r: function () { return this.route.params.repo; },
      full: function () { return this.o + '/' + this.r; },
      query: function () {
        const p = [];
        p.push('repo:' + this.full);
        p.push('is:issue');
        p.push(this.state === 'open' ? 'is:open' : 'is:closed');
        this.labelFilter.split(',').forEach(function (l) {
          if (l.trim()) p.push('label:"' + l.trim() + '"');
        });
        if (this.q.trim()) p.push(this.q.trim());
        return p.join(' ');
      },
      sortOpts: function () {
        return [
          { k: 'created', l: '最新创建' },
          { k: 'updated', l: '最近更新' },
          { k: 'comments', l: '评论最多' }
        ];
      }
    },
    created: function () { this.load(1); this.loadLabels(); },
    methods: {
      loadLabels: function () {
        const self = this;
        API.getData('/repos/' + this.o + '/' + this.r + '/labels', { per_page: 100 })
          .then(function (l) { self.labels = Array.isArray(l) ? l : []; }).catch(function () { });
      },
      load: async function (p) {
        this.loading = true; this.err = '';
        const self = this;
        try {
          const r = await API.searchIssues(this.query, p, this.sort);
          self.items = (r.data.items || []);
          self.page = p;
          const l = API.links(r);
          self.hasNext = !!l.next; self.hasPrev = p > 1;
          self.$emit('cache', r.cache);
          self.countIn('./');
        } catch (e) {
          self.err = e.status === 403 ? '搜索接口限流，请稍后再试' : e.message;
        }
        self.loading = false;
      },
      countIn: function () {
        const self = this;
        API.searchIssues('repo:' + this.full + ' is:issue is:open', 1)
          .then(function (x) { self.counts.open = x.data.total_count; }).catch(function () { });
        API.searchIssues('repo:' + this.full + ' is:issue is:closed', 1)
          .then(function (x) { self.counts.closed = x.data.total_count; }).catch(function () { });
      },
      setState: function (s) { this.state = s; this.load(1); },
      toggleLabel: function (name) {
        const cur = this.labelFilter.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        const i = cur.indexOf(name);
        if (i >= 0) cur.splice(i, 1); else cur.push(name);
        this.labelFilter = cur.join(',');
        this.load(1);
      },
      isLabelOn: function (name) {
        return this.labelFilter.split(',').map(function (s) { return s.trim(); }).indexOf(name) >= 0;
      },
      go: function (p) { this.load(p); },
      open: function (it) { this.$emit('nav', '#/' + this.full + '/issues/' + it.number); },
      href: function (it) { return '#/' + this.full + '/issues/' + it.number; },
      labelStyle: function (l) {
        if (!l || !l.color) return {};
        const h = l.color;
        return { background: '#' + h + '1f', borderColor: '#' + h + '55', color: '#' + shade(h) };
      }
    },
    template:
'<div>' +
'  <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">' +
'    <h1 style="font-size:19px"><a :href="\'#/\' + o" style="color:var(--ink-3);font-weight:400">{{ o }}</a>' +
'      <span class="dimmer" style="font-weight:300">/</span>' +
'      <a :href="\'#/\' + full" style="font-weight:700">{{ r }}</a>' +
'      <span class="dimmer" style="font-weight:300">/</span>议题</h1>' +
'    <span style="flex:1"></span>' +
'    <a class="btn btn-sm btn-quiet" :href="\'#/\' + full + \'/pulls\'">' +
'      <icon name="pr" :size="13"></icon>拉取请求</a>' +
'  </div>' +

'  <div class="card">' +
'    <div class="card-head" style="gap:9px;flex-wrap:wrap">' +
'      <span class="seg">' +
'        <button :class="{on: state===\'open\'}" @click="setState(\'open\')">' +
'          <icon name="issueOpen" :size="12" :sw="2.2"></icon>开启' +
'          <template v-if="counts.open !== null"> {{ counts.open }}</template></button>' +
'        <button :class="{on: state===\'closed\'}" @click="setState(\'closed\')">' +
'          <icon name="check" :size="12"></icon>已关闭' +
'          <template v-if="counts.closed !== null"> {{ counts.closed }}</template></button>' +
'      </span>' +
'      <span style="position:relative;display:flex;align-items:center;flex:1;min-width:150px;max-width:280px">' +
'        <icon name="search" :size="13" style="position:absolute;left:9px;color:var(--ink-4)"></icon>' +
'        <input class="input" v-model="q" placeholder="筛选标题与正文…" style="padding-left:28px" ' +
'               @keydown.enter="load(1)"></span>' +
'      <span style="flex:1"></span>' +
'      <dropdown align="right" :width="180">' +
'        <template #trigger><button class="btn btn-sm">' +
'          <icon name="sort" :size="13"></icon>{{ sortOpts.find(function(o){return o.k===sort}).l }}</button></template>' +
'        <template #menu><div v-for="s in sortOpts" :key="s.k" class="pop-item" @click="sort=s.k; load(1)">' +
'          <icon v-if="sort===s.k" name="check" :size="13"></icon>' +
'          <span v-else style="width:13px"></span>{{ s.l }}</div></template>' +
'      </dropdown>' +
'      <dropdown v-if="labels.length" align="right" :width="240">' +
'        <template #trigger><button class="btn btn-sm">' +
'          <icon name="filter" :size="13"></icon>标签{{ labelFilter ? " · " + labelFilter.split(",").filter(Boolean).length : "" }}</button></template>' +
'        <template #menu>' +
'          <div class="pop-head">按标签筛选</div>' +
'          <div style="max-height:260px;overflow:auto">' +
'            <div v-for="l in labels" :key="l.id" class="pop-item" @click.stop="toggleLabel(l.name)">' +
'              <span class="lbl" :style="labelStyle(l)"><span class="dot"></span>{{ l.name }}</span>' +
'              <span style="flex:1"></span>' +
'              <icon v-if="isLabelOn(l.name)" name="check" :size="13"></icon></div>' +
'          </div>' +
'          <div v-if="labelFilter" class="pop-sep"></div>' +
'          <div v-if="labelFilter" class="pop-item" @click="labelFilter=\'\'; load(1)">' +
'            <icon name="x" :size="13"></icon>清除筛选</div>' +
'        </template>' +
'      </dropdown>' +
'    </div>' +

'    <div v-if="err" class="banner banner-bad" style="margin:14px">' +
'      <icon name="alert" :size="14"></icon><span>{{ err }}</span></div>' +

'    <div v-if="loading"><skel-rows :n="8"></skel-rows></div>' +
'    <div v-else-if="!items.length" class="empty">' +
'      <icon name="issue" :size="24"></icon>' +
'      <b>{{ state === "open" ? "没有开启中的议题" : "没有已关闭的议题" }}</b>' +
'      <p>{{ state === "open" ? "一切都在掌控之中" : "还没有关闭过任何议题" }}</p></div>' +

'    <div v-else class="row-list">' +
'      <a v-for="it in items" :key="it.id" class="row" :href="href(it)">' +
'        <span style="margin-top:1px">' +
'          <icon :name="it.state === \'open\' ? \'issueOpen\' : \'check\'" :size="15" :sw="2.2" ' +
'                :style="{color: it.state === \'open\' ? \'var(--ok)\' : \'var(--alarm)\'}"></icon></span>' +
'        <div class="row-main">' +
'          <div class="row-title"><span class="t">{{ it.title }}</span>' +
'            <span v-if="it.locked" class="badge"><icon name="lock" :size="9"></icon></span></div>' +
'          <div class="row-meta">' +
'            <span class="mono">#{{ it.number }}</span><span>·</span>' +
'            <span>{{ it.user && it.user.login }}</span><span>·</span>' +
'            <rel-time :iso="it.created_at"></rel-time>' +
'            <template v-if="it.comments"><span>·</span>' +
'              <span><icon name="comment" :size="11"></icon> {{ it.comments }}</span></template></div>' +
'          <div v-if="it.labels && it.labels.length" style="display:flex;gap:5px;flex-wrap:wrap;margin-top:7px">' +
'            <span v-for="l in it.labels.slice(0, 6)" :key="l.id" class="lbl" :style="labelStyle(l)">' +
'              <span class="dot"></span>{{ l.name }}</span>' +
'            <span v-if="it.labels.length > 6" class="lbl lbl-neutral">+{{ it.labels.length - 6 }}</span></div>' +
'        </div>' +
'        <div v-if="it.assignee" class="row-side">' +
'          <avatar :src="it.assignee.avatar_url" :alt="it.assignee.login" :size="20"></avatar></div>' +
'      </a>' +
'    </div>' +
'    <pager v-if="!loading && items.length" :page="page" :has-next="hasNext" :has-prev="hasPrev" @go="go"></pager>' +
'  </div>' +
'</div>'
  };

  /* label 文字色。
     前景是原色的 12%（叠在白纸上，非常浅），所以文字必须明显更深才有对比。
     旧实现把「亮色压暗、暗色提亮」：深色 label（如 bug #d73a4a）被提亮到接近白色，
     配浅粉底等于隐形，列表里只剩一个空色块（2026-11-08 反馈的「议题界面显示异常」）。
     现在统一把颜色按明度压到 ~0.28，暗色保持原样，任何色值在淡底上都可读。 */
  function shade(hex) {
    try {
      let h = String(hex || '').replace(/^#/, '');
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      if (!/^[0-9a-fA-F]{6}$/.test(h)) return '6c6862';
      const n = parseInt(h, 16);
      let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const k = lum > 0.28 ? 0.28 / lum : 1;
      r = Math.round(r * k); g = Math.round(g * k); b = Math.round(b * k);
      return [r, g, b].map(function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    } catch (e) { return '6c6862'; }
  }
  window.__shade = shade;

  window.VIEWS.issues = Issues;
})();
