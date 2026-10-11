/* ============================================================
   components.js — icon set + shared UI primitives
   ============================================================ */
(function () {
  'use strict';

  /* ---------- icons (stroke, 24-box, hairline feel) ---------- */
  const ICONS = {
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    dashboard: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.4"/>',
    repo: '<path d="M4.5 4.5h11a2 2 0 0 1 2 2v13H6.5a2 2 0 0 1-2-2z"/><path d="M6.5 4.5v15"/><path d="M9 8.5h5.5M9 11.5h4"/>',
    star: '<path d="M12 3.6l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',
    starFill: '<path d="M12 3.6l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" fill="currentColor"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/>',
    fork: '<circle cx="7" cy="5.5" r="2.5"/><circle cx="17" cy="5.5" r="2.5"/><circle cx="12" cy="18.5" r="2.5"/><path d="M7 8v2.2a2.3 2.3 0 0 0 2.3 2.3h5.4A2.3 2.3 0 0 0 17 10.2V8"/><path d="M12 12.5v3.5"/>',
    branch: '<circle cx="7" cy="5.5" r="2.5"/><circle cx="7" cy="18.5" r="2.5"/><circle cx="17" cy="9" r="2.5"/><path d="M7 8v8"/><path d="M17 11.5c0 3-2.2 4.6-5 5"/>',
    commit: '<circle cx="12" cy="12" r="3.6"/><path d="M3.5 12h5M15.5 12h5"/>',
    pr: '<circle cx="6.5" cy="6" r="2.5"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="18" r="2.5"/><path d="M6.5 8.5v7"/><path d="M15.5 5.5h-4a5 5 0 0 0-5 5"/>',
    issue: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v4.4M12 15.8v.01"/>',
    issueOpen: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.2" fill="currentColor" stroke="none"/>',
    check: '<path d="M4.5 12.5l5 5 10-11"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    tag: '<path d="M11.6 3.6H5.2a1.6 1.6 0 0 0-1.6 1.6v6.4c0 .4.2.8.5 1.1l7.4 7.4a1.6 1.6 0 0 0 2.2 0l6.4-6.4a1.6 1.6 0 0 0 0-2.2L12.7 4.1a1.6 1.6 0 0 0-1.1-.5z"/><circle cx="8.4" cy="8.4" r="1.3"/>',
    package: '<path d="M12 3.2l8 4.3v9l-8 4.3-8-4.3v-9z"/><path d="M4 7.5l8 4.3 8-4.3"/><path d="M12 11.8V21"/>',
    users: '<circle cx="9" cy="8.6" r="3.2"/><path d="M3.6 19.4c.6-3 2.7-4.6 5.4-4.6s4.8 1.6 5.4 4.6"/><path d="M16.2 6.2a3 3 0 0 1 0 5.6"/><path d="M17.6 15.2c1.7.6 2.7 2 3 4.2"/>',
    bell: '<path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5s1.5-1.5 1.5-5.5z"/><path d="M10 18.5a2.2 2.2 0 0 0 4 0"/>',
    gear: '<circle cx="12" cy="12" r="2.9"/><path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18.1 5.9l-1.6 1.6M7.5 16.5l-1.6 1.6M18.1 18.1l-1.6-1.6M7.5 7.5L5.9 5.9"/>',
    logout: '<path d="M14 5.5H6.5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2H14"/><path d="M11 12h9"/><path d="M17.5 8.5L21 12l-3.5 3.5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 5.5H6.5a2 2 0 0 0-2 2v9"/>',
    external: '<path d="M14 4.5h5.5V10"/><path d="M19.5 4.5L11 13"/><path d="M18 14v4.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2h4.5"/>',
    right: '<path d="M9.5 5.5l6.5 6.5-6.5 6.5"/>',
    left: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
    down: '<path d="M5.5 9.5L12 16l6.5-6.5"/>',
    up: '<path d="M5.5 14.5L12 8l6.5 6.5"/>',
    file: '<path d="M13.5 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z"/><path d="M13.5 3.5V9H19"/>',
    folder: '<path d="M3.8 6.5a2 2 0 0 1 2-2h3.4l2 2.4h7a2 2 0 0 1 2 2v8.6a2 2 0 0 1-2 2H5.8a2 2 0 0 1-2-2z"/>',
    code: '<path d="M9 7.5L4.5 12 9 16.5"/><path d="M15 7.5L19.5 12 15 16.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    activity: '<path d="M3.5 12.5h4l2.5-7 3.5 13 2.5-6h4.5"/>',
    zap: '<path d="M13.5 3.5L5.5 13.5h6l-1 7 8-10h-6z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4.5V10h-5.5"/>',
    eye: '<path d="M2.8 12S6 6.5 12 6.5 21.2 12 21.2 12 18 17.5 12 17.5 2.8 12 2.8 12z"/><circle cx="12" cy="12" r="2.6"/>',
    comment: '<path d="M4.5 5.5h15a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H12l-4.5 3.5v-3.5h-3A1.5 1.5 0 0 1 3 15V7a1.5 1.5 0 0 1 1.5-1.5z"/>',
    diff: '<path d="M6 4.5v15"/><path d="M3.6 7.5h4.8M3.6 16.5h4.8"/><rect x="13" y="4.5" width="7.5" height="5" rx="1.4"/><rect x="13" y="14.5" width="7.5" height="5" rx="1.4"/>',
    download: '<path d="M12 4v10"/><path d="M8 10.5l4 4 4-4"/><path d="M4.5 19.5h15"/>',
    link: '<path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 1 0-5.7-5.7L11.6 6.7"/><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 1 0 5.7 5.7l1.5-1.5"/>',
    alert: '<path d="M12 4.2L21 19.5H3z"/><path d="M12 10v4M12 16.6v.01"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.01"/>',
    archive: '<rect x="3.5" y="4.5" width="17" height="4" rx="1.2"/><path d="M5 8.5v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9"/><path d="M10.5 12.5h3"/>',
    filter: '<path d="M4 6.5h16l-6.3 7v5.4L10.3 21v-7.5z"/>',
    hash: '<path d="M9.5 3.5L7.5 20.5M16.5 3.5l-2 17"/><path d="M4.5 8.5h15M3.5 15.5h15"/>',
    calendar: '<rect x="3.8" y="5" width="16.4" height="15.5" rx="2"/><path d="M3.8 9.6h16.4"/><path d="M8 3.5v3M16 3.5v3"/>',
    trending: '<path d="M3.5 17l6-6 4 4 7-7.5"/><path d="M15 7.5h5.5V13"/>',
    book: '<path d="M4.5 5a2 2 0 0 1 2-2H19v16H6.5a2 2 0 0 0-2 2z"/><path d="M6.5 3v14"/>',
    key: '<circle cx="8" cy="15" r="3.5"/><path d="M10.5 12.5L19 4M16.5 6.5l2 2M19 4l1.5 1.5"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5a12 12 0 0 1 0 17 12 12 0 0 1 0-17z"/>',
    wiki: '<rect x="4" y="4.5" width="16" height="15" rx="2"/><path d="M8 9h8M8 12.5h8M8 16h5"/>',
    milestones: '<path d="M6 3.5v17"/><path d="M6 4.5h11l-2.2 4 2.2 4H6z"/>',
    play: '<path d="M7.5 5.2l11 6.8-11 6.8z"/>',
    rows: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17"/>',
    star2: '<path d="M12 3.6l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',
    inbox: '<path d="M3.5 12.5L6 5.5h12l2.5 7v6a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M3.5 12.5H9l1 2h4l1-2h5.5"/>',
    gitMerge: '<circle cx="7" cy="6" r="2.5"/><circle cx="7" cy="18" r="2.5"/><circle cx="17" cy="12" r="2.5"/><path d="M7 8.5v7"/><path d="M14.6 11.2A6 6 0 0 0 9.2 7"/>',
    terminal: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M7.5 9.5l3 3-3 3M13 15.5h4"/>',
    cpu: '<rect x="7.5" y="7.5" width="9" height="9" rx="1.6"/><path d="M10.5 3.5v4M13.5 3.5v4M10.5 16.5v4M13.5 16.5v4M3.5 10.5h4M3.5 13.5h4M16.5 10.5h4M16.5 13.5h4"/>',
    shield: '<path d="M12 3.5l7 2.5v5.5c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z"/>',
    pencil: '<path d="M15.5 4.5l4 4L8 20H4v-4z"/><path d="M13.5 6.5l4 4"/>',
    sort: '<path d="M7 5v14M4 16l3 3 3-3"/><path d="M17 19V5M14 8l3-3 3 3"/>',
    sparkline: '<path d="M3.5 15l4-5 3.5 3 4-7 5 9"/>'
  };

  const Icon = {
    props: { name: String, size: { type: [Number, String], default: 16 }, sw: [Number, String] },
    computed: {
      path: function () { return ICONS[this.name] || ICONS.info; },
      style: function () {
        // strokeWidth 必须带单位：CSS 里 "2.4" 是非法值，浏览器会整条忽略，
        // 于是 :sw="2.4" 一直被静默丢掉。这里统一补 px。
        const sw = this.sw;
        const swCss = sw ? (/^\d*\.?\d+$/.test(String(sw)) ? sw + 'px' : String(sw)) : '';
        return { width: this.size + 'px', height: this.size + 'px', strokeWidth: swCss };
      }
    },
    template: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" :style="style" v-html="path"></svg>'
  };

  /* ---------- avatar ---------- */
  const Avatar = {
    props: {
      src: String, alt: String, user: String, square: Boolean,
      size: { type: Number, default: 24 }
    },
    data: function () { return { err: false }; },
    watch: { src: function () { this.err = false; } },
    computed: {
      ini: function () { return U.initials(this.alt || this.user); },
      box: function () {
        return {
          width: this.size + 'px', height: this.size + 'px',
          borderRadius: this.square ? Math.max(3, Math.round(this.size * .16)) + 'px' : '50%',
          fontSize: Math.round(this.size * .38) + 'px'
        };
      }
    },
    template:
      '<img v-if="src && !err" class="av" :src="src" :alt="alt || user || \'\'" ' +
      ':style="box" @error="err = true" loading="lazy" referrerpolicy="no-referrer">' +
      '<span v-else class="av av-fb" :style="box" :title="alt || user">{{ ini }}</span>'
  };

  /* ---------- relative time ---------- */
  const RelTime = {
    props: { iso: String, zh: Boolean },
    computed: {
      text: function () { return this.zh ? U.relZh(this.iso) : U.rel(this.iso); },
      title: function () { return U.abs(this.iso); }
    },
    template: '<span class="nowrap" :title="title">{{ text }}</span>'
  };

  /* ---------- markdown ---------- */
  const Markdown = {
    // 除 source 外，把「这份 Markdown 属于哪个仓库的哪个分支」也传进来：
    // 相对路径图片要靠它换算成 raw 绝对地址（见 U.resolveImgSrc）
    props: { source: String, owner: String, repo: String, ref: String },
    computed: {
      html: function () {
        // 先设上下文再解析，保证 U.rewriteImg 拿得到仓库信息
        U.imgContext(this.owner, this.repo, this.ref);
        let h = U.md(this.source || '');
        // make gh issue refs / user mentions quieter links
        h = h.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a target="_blank" rel="noopener noreferrer" href="$1"');
        return h;
      }
    },
    template: '<div class="md" v-html="html"></div>'
  };

  /* ---------- code block with line numbers ---------- */
  function splitHlSpans(html) {
    const out = [];
    let cur = '';
    const stack = [];
    const re = /(<span\b[^>]*>)|(<\/span>)|([^<]+)|(<[^>]+>)/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      if (m[1]) { stack.push(m[1]); cur += m[1]; }
      else if (m[2]) { stack.pop(); cur += m[2]; }
      else if (m[3]) {
        const parts = m[3].split('\n');
        for (let i = 0; i < parts.length; i++) {
          if (i > 0) {
            out.push(cur + stack.map(function () { return '</span>'; }).join(''));
            cur = stack.join('');
          }
          cur += parts[i];
        }
      } else if (m[4]) { cur += m[4]; }
    }
    out.push(cur);
    return out;
  }

  const CodeBlock = {
    props: {
      code: String, lang: String, path: String, head: { type: Boolean, default: true },
      numbered: { type: Boolean, default: true }, start: { type: Number, default: 1 },
      maxLines: { type: Number, default: 4000 }
    },
    computed: {
      hl: function () {
        const src = this.code == null ? '' : String(this.code);
        if (window.hljs) {
          try {
            if (this.lang && hljs.getLanguage(this.lang)) {
              return hljs.highlight(src, { language: this.lang, ignoreIllegals: true }).value;
            }
            if (src.length < 60000) return hljs.highlightAuto(src).value;
          } catch (e) { }
        }
        return U.esc(src);
      },
      rows: function () {
        return splitHlSpans(this.hl).slice(0, this.maxLines);
      },
      clipped: function () {
        return splitHlSpans(this.hl).length > this.maxLines;
      },
      label: function () { return this.path || this.lang || 'text'; }
    },
    methods: {
      copy: function () { U.copy(this.code || '', '代码已复制'); }
    },
    template:
      '<div class="code-block">' +
      '  <div class="code-head" v-if="head">' +
      '    <icon name="file" :size="13"></icon>' +
      '    <span class="path" :title="label">{{ label }}</span>' +
      '    <button class="btn btn-sm btn-quiet" @click="copy">' +
      '      <icon name="copy" :size="12"></icon>复制</button>' +
      '  </div>' +
      '  <div class="code-scroll">' +
      '    <table class="code"><tbody>' +
      '      <tr v-for="(l, i) in rows" :key="i">' +
      '        <td class="ln" v-if="numbered">{{ start + i }}</td>' +
      '        <td class="src" v-html="l || \'&#8203;\'"></td>' +
      '      </tr>' +
      '    </tbody></table>' +
      '  </div>' +
      '  <div v-if="clipped" class="code-head" style="border-top:1px solid var(--rule);border-bottom:0;color:var(--ink-4)">' +
      '    文件过长，仅渲染前 {{ maxLines }} 行 — 下载查看完整内容' +
      '  </div>' +
      '</div>'
  };

  /* ---------- unified diff ---------- */
  const DiffView = {
    props: { patch: String },
    computed: {
      files: function () {
        const out = [];
        const raw = (this.patch || '').split('\n');
        let cur = null;
        for (let i = 0; i < raw.length; i++) {
          const ln = raw[i];
          if (ln.indexOf('diff --git ') === 0) {
            const m = ln.match(/b\/(.+)$/);
            cur = { path: m ? m[1] : ln.slice(11), oldPath: '', hunks: [], add: 0, del: 0, binary: false, mode: '' };
            out.push(cur);
          } else if (!cur) { continue; }
          else if (ln.indexOf('--- ') === 0) { cur.oldPath = ln.slice(4).replace(/^a\//, ''); }
          else if (ln.indexOf('+++ ') === 0) { }
          else if (ln.indexOf('Binary files') === 0) { cur.binary = true; }
          else if (/^(new file mode|deleted file mode|old mode|new mode|similarity index|rename from|rename to|index) /.test(ln)) {
            if (/mode/.test(ln)) cur.mode = ln;
          } else if (/^@@/.test(ln)) {
            const m = ln.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
            cur.hunks.push({ header: ln, oStart: m ? Number(m[1]) : 1, nStart: m ? Number(m[2]) : 1, lines: [] });
          } else if (ln === '\\ No newline at end of file') {
            continue;
          } else if (cur.hunks.length) {
            const h = cur.hunks[cur.hunks.length - 1];
            const c = ln.charAt(0);
            let kind = 'ctx', text = ln;
            if (c === '+') { kind = 'add'; text = ln.slice(1); cur.add++; }
            else if (c === '-') { kind = 'del'; text = ln.slice(1); cur.del++; }
            else if (c === ' ') { text = ln.slice(1); }
            else if (c === '' && ln === '') { text = ''; }
            else { text = ln.replace(/^\\/, ''); }
            h.lines.push({ kind: kind, text: text });
          }
        }
        // assign gutter numbers
        out.forEach(function (f) {
          f.hunks.forEach(function (h) {
            let o = h.oStart, n = h.nStart;
            h.lines.forEach(function (l) {
              if (l.kind === 'del') { l.o = o++; l.n = ''; }
              else if (l.kind === 'add') { l.o = ''; l.n = n++; }
              else { l.o = o++; l.n = n++; }
            });
          });
        });
        return out;
      },
      stat: function () {
        let a = 0, d = 0;
        this.files.forEach(function (f) { a += f.add; d += f.del; });
        return { add: a, del: d };
      }
    },
    template:
      '<div>' +
      '  <div class="diff">' +
      '    <div v-for="(f, fi) in files" :key="fi" class="diff-file">' +
      '      <div class="diff-file-head">' +
      '        <span class="mono" style="color:var(--ink-2);min-width:0;overflow:hidden;text-overflow:ellipsis">{{ f.path }}</span>' +
      '        <span class="topbar-spacer" style="flex:1"></span>' +
      '        <span class="mono" style="color:var(--ok)">+{{ f.add }}</span>' +
      '        <span class="mono" style="color:var(--alarm)">-{{ f.del }}</span>' +
      '      </div>' +
      '      <div v-if="f.binary" class="diff-empty">二进制文件不展示差异</div>' +
      '      <div v-else-if="!f.hunks.length" class="diff-empty">无文本差异（仅元数据变更）</div>' +
      '      <template v-else>' +
      '        <template v-for="(h, hi) in f.hunks" :key="hi">' +
      '          <div class="diff-hunk mono">{{ h.header }}</div>' +
      '          <div v-for="(l, li) in h.lines" :key="li" class="diff-line" :class="{\'diff-add\': l.kind===\'add\', \'diff-del\': l.kind===\'del\', \'diff-ctx\': l.kind===\'ctx\'}">' +
      '            <span class="g">{{ l.o }}</span><span class="g">{{ l.n }}</span>' +
      '            <span class="t">{{ l.text || \' \' }}</span>' +
      '          </div>' +
      '        </template>' +
      '      </template>' +
      '    </div>' +
      '  </div>' +
      '</div>'
  };

  /* ---------- pager ---------- */
  const Pager = {
    props: { page: Number, hasNext: Boolean, hasPrev: Boolean, loading: Boolean, label: String },
    emits: ['go'],
    template:
      '<div class="pager">' +
      '  <button class="btn btn-sm" :disabled="!hasPrev || loading" @click="$emit(\'go\', page - 1)">' +
      '    <icon name="left" :size="12"></icon>上一页</button>' +
      '  <span class="pg">第 {{ page }} 页{{ label ? \' · \' + label : \'\' }}</span>' +
      '  <span style="flex:1"></span>' +
      '  <span v-if="loading" class="spin"></span>' +
      '  <button class="btn btn-sm" :disabled="!hasNext || loading" @click="$emit(\'go\', page + 1)">' +
      '    下一页<icon name="right" :size="12"></icon></button>' +
      '</div>'
  };

  /* ---------- dropdown ---------- */
  const Dropdown = {
    props: { align: { type: String, default: 'right' }, width: Number },
    data: function () { return { open: false }; },
    methods: {
      toggle: function () { this.open = !this.open; },
      close: function () { this.open = false; },
      onDoc: function (e) { if (this.$el && !this.$el.contains(e.target)) this.close(); }
    },
    mounted: function () { document.addEventListener('click', this.onDoc); },
    unmounted: function () { document.removeEventListener('click', this.onDoc); },
    computed: {
      style: function () {
        const s = { top: 'calc(100% + 6px)' };
        s[this.align] = '0';
        if (this.width) s.width = this.width + 'px';
        return s;
      }
    },
    template:
      '<span class="dd">' +
      '  <span @click.stop="toggle"><slot name="trigger" :open="open"></slot></span>' +
      '  <transition name="fade">' +
      '    <div v-if="open" class="pop" :style="style" @click.stop="close"><slot name="menu"></slot></div>' +
      '  </transition>' +
      '</span>'
  };

  /* ---------- empty / loading ---------- */
  const EmptyState = {
    props: { icon: { type: String, default: 'inbox' }, title: String, text: String },
    template:
      '<div class="empty">' +
      '  <icon :name="icon" :size="26"></icon>' +
      '  <b v-if="title">{{ title }}</b>' +
      '  <p v-if="text">{{ text }}</p>' +
      '  <slot></slot>' +
      '</div>'
  };

  const Spin = {
    props: { label: String },
    template: '<div class="center-pad"><div style="display:flex;align-items:center;gap:9px">' +
      '<span class="spin"></span><span class="dim sm">{{ label || \'载入中\' }}</span></div></div>'
  };

  const SkelRows = {
    props: { n: { type: Number, default: 6 } },
    template: '<div class="row-list" style="border:1px solid var(--rule);border-radius:8px;background:#fff">' +
      '<div v-for="i in n" :key="i" class="row">' +
      '  <div class="skel" style="width:22px;height:22px;border-radius:4px"></div>' +
      '  <div class="row-main"><div class="skel" style="height:12px;width:42%"></div>' +
      '  <div class="skel" style="height:10px;width:26%;margin-top:8px"></div></div>' +
      '</div></div>'
  };

  /* ---------- small chips ---------- */
  const LangDot = {
    props: { lang: String, showText: { type: Boolean, default: true } },
    computed: { color: function () { return U.langColor(this.lang); } },
    template: '<span class="nowrap" style="display:inline-flex;align-items:center;gap:5px">' +
      '<span class="lang-dot" :style="{background: color}"></span>' +
      '<span v-if="showText">{{ lang }}</span></span>'
  };

  const StarCount = {
    props: { repo: Object },
    template: '<span class="stars" :title="U.num(repo && repo.stargazers_count) + \' stars\'">' +
      '<icon name="star" :size="12"></icon>{{ U.compact(repo && repo.stargazers_count) }}</span>'
  };

  const StateBadge = {
    props: { kind: String, state: String, draft: Boolean, merged: Boolean, mergedAt: String },
    computed: {
      cls: function () {
        if (this.kind === 'pr' && (this.merged || this.mergedAt)) return 'lbl-merged';
        if (this.draft) return 'lbl-draft';
        return this.state === 'open' ? 'lbl-open' : 'lbl-closed';
      },
      label: function () {
        if (this.kind === 'pr' && (this.merged || this.mergedAt)) return '已合并';
        if (this.draft) return '草稿';
        if (this.kind === 'pr') return this.state === 'open' ? '开放中' : '已关闭';
        return this.state === 'open' ? '开启' : '已关闭';
      },
      icon: function () {
        if (this.kind === 'pr' && (this.merged || this.mergedAt)) return 'gitMerge';
        if (this.state === 'open') return 'issueOpen';
        return 'issue';
      }
    },
    template: '<span class="lbl" :class="cls">' +
      '<icon :name="icon" :size="12" :sw="2.4"></icon>{{ label }}</span>'
  };

  const CountChip = {
    props: { n: Number, label: String, icon: String },
    template: '<span class="kv" style="align-items:center"><icon v-if="icon" :name="icon" :size="13"></icon>' +
      '<span class="k" v-if="label">{{ label }}</span>' +
      '<span class="tnum" style="color:var(--ink-2)">{{ U.compact(n) }}</span></span>'
  };

  window.C = {
    Icon: Icon, Avatar: Avatar, RelTime: RelTime, Markdown: Markdown,
    CodeBlock: CodeBlock, DiffView: DiffView, Pager: Pager, Dropdown: Dropdown,
    EmptyState: EmptyState, Spin: Spin, SkelRows: SkelRows, LangDot: LangDot,
    StarCount: StarCount, StateBadge: StateBadge, CountChip: CountChip
  };
})();
