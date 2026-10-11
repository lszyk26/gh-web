#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""gh-web 相对图片修复
问题：Markdown 里的图片若是相对路径（<img src="assets/x.png"> 或 ![](assets/x.png)），
      浏览器会按「当前页面地址」解析 → 变成 https://ghs.0lt.top/<owner>/<repo>/assets/x.png
      → 404 → 破图。GitHub 官方页面靠 /raw/ 端点服务这些相对资源，我们得自己改写。
方案：
  1. util.js 新增 U.imgContext / U.resolveImgSrc / U.rewriteImg，U.md 返回前统一改写
     <img src> 为 raw.githubusercontent.com 绝对地址（线上实测可达）。
  2. components.js 的 Markdown 组件新增 owner/repo/ref 三个 prop。
  3. 各视图把仓库上下文传进去。
  4. 上下文缺失时（隐私模式、非仓库页）从 hash 路由里兜底解析；再不行退回
     GitHub 的 /raw/ 端点（靠 Referer 猜仓库，总比留个死链好）。
"""
import io, sys, os

ROOT = '/opt/gh-web/web'
changed = []


def rw(rel, fn):
    p = os.path.join(ROOT, rel)
    s = io.open(p, encoding='utf-8').read()
    orig = s
    s = fn(s)
    if s != orig:
        io.open(p, 'w', encoding='utf-8').write(s)
        changed.append(rel)
    else:
        print('  (no change) ' + rel)


def must(s, old, new, label):
    if old not in s:
        print('  !! ANCHOR MISS: ' + label)
        sys.exit(1)
    return s.replace(old, new, 1)


# ---------------- 1) util.js ----------------
def fix_util(s):
    anchor = "  /* ---------- text ---------- */"
    add = r"""  /* ---------- markdown 里的相对图片 ---------- */
  // Markdown 中的图片常写成相对路径（<img src="assets/showcase/hero.png">，
  // 这是 GitHub 官方 README 的常见写法）。SPA 里浏览器会按「当前页面地址」解析，
  // 于是跑到本站 /<owner>/<repo>/assets/... 去要图，必然 404 —— 这就是「图片不见了」。
  // 这里统一改写成 raw.githubusercontent.com 的绝对地址。
  // 必须在 marked 解析之后做：marked 的 gfm 允许正文里直接写 <img> HTML 标签，
  // 而它只会对 Markdown 语法 ![]() 的地址做编码，不会解析相对路径。
  let imgCtx = null;

  U.imgContext = function (o, r, ref) {
    if (o && r) imgCtx = { o: o, r: r, ref: ref || 'HEAD' };
    return imgCtx;
  };

  // 兜底：组件没传上下文时，直接从 hash 路由里解析出 owner/repo/ref
  const RESERVED = ['repos', 'stars', 'trends', 'notifications', 'search',
    'settings', 'users', 'orgs', 'login', 'logout'];
  U.ctxFromHash = function () {
    const h = String((window.location && window.location.hash) || '').replace(/^#\/?/, '');
    const parts = h.split('/').filter(function (x) { return x !== ''; }).map(decodeURIComponent);
    if (parts.length < 2 || RESERVED.indexOf(parts[0]) >= 0) return null;
    const ctx = { o: parts[0], r: parts[1], ref: 'HEAD' };
    if (parts[2] === 'code') { if (parts[4]) ctx.ref = parts[4]; }
    else if (parts[2] === 'tree' || parts[2] === 'blob') { if (parts[3]) ctx.ref = parts[3]; }
    return ctx;
  };

  U.resolveImgSrc = function (src) {
    const raw = String(src == null ? '' : src).trim();
    if (!raw) return '';
    // 已是绝对地址 / 协议相对 / 数据 / 锚点 → 原样保留
    if (/^(https?:|data:|blob:|mailto:|#|\/\/)/i.test(raw)) return raw;
    const path = raw.replace(/^\.\//, '').replace(/^\//, '');
    const ctx = imgCtx || U.ctxFromHash();
    if (ctx) {
      return 'https://raw.githubusercontent.com/' + ctx.o + '/' + ctx.r + '/' +
        encodeURIComponent(ctx.ref) + '/' +
        path.split('/').map(encodeURIComponent).join('/');
    }
    // 完全取不到仓库信息：退回 GitHub 的 raw 端点，它会按 Referer 猜仓库并跳转
    return 'https://github.com/raw/' + path;
  };

  // 只改 src= 属性，别碰 alt/title 里的内容
  U.rewriteImg = function (html) {
    return String(html || '')
      .replace(/(<img\b[^>]*?)\ssrc=(["'])([^"']*)\2/gi, function (m, head, q, src) {
        const abs = U.resolveImgSrc(src);
        return abs === src ? m : head + ' src=' + q + abs + q;
      })
      .replace(/(<img\b[^>]*?)\ssrc=([^\s"'>]+)/gi, function (m, head, src) {
        const abs = U.resolveImgSrc(src);
        return abs === src ? m : head + ' src="' + abs + '"';
      });
  };

"""
    s = must(s, anchor, add + anchor, 'util.js 插入点')
    s = must(s,
             "      .replace(/javascript:/gi, '');\n    return html;",
             "      .replace(/javascript:/gi, '');\n    return U.rewriteImg(html);",
             'util.js U.md 返回处')
    return s


# ---------------- 2) components.js ----------------
def fix_components(s):
    old = """  const Markdown = {
    props: { source: String },
    computed: {
      html: function () {
        let h = U.md(this.source || '');"""
    new = """  const Markdown = {
    // 除 source 外，把「这份 Markdown 属于哪个仓库的哪个分支」也传进来：
    // 相对路径图片要靠它换算成 raw 绝对地址（见 U.resolveImgSrc）
    props: { source: String, owner: String, repo: String, ref: String },
    computed: {
      html: function () {
        // 先设上下文再解析，保证 U.rewriteImg 拿得到仓库信息
        U.imgContext(this.owner, this.repo, this.ref);
        let h = U.md(this.source || '');"""
    return must(s, old, new, 'components.js Markdown')


# ---------------- 3) 各视图传上下文 ----------------
ML = ' :owner="o" :repo="r"'


def add_ctx(rel, pairs):
    def f(s):
        for old, new in pairs:
            s = must(s, old, new, rel + ' :: ' + old[:70])
        return s
    rw(rel, f)


add_ctx('app/views/repo.js', [
    ('<markdown :source="readme"></markdown>',
     '<markdown :source="readme"' + ML + '></markdown>'),
])
add_ctx('app/views/code.js', [
    ('<markdown :source="fileText"></markdown>',
     '<markdown :source="fileText"' + ML + ' :ref="ref"></markdown>'),
])
add_ctx('app/views/issue.js', [
    ('<markdown :source="issue.body"></markdown>',
     '<markdown :source="issue.body"' + ML + '></markdown>'),
    ('<markdown :source="c.body"></markdown>',
     '<markdown :source="c.body"' + ML + '></markdown>'),
])
add_ctx('app/views/pull.js', [
    ('<markdown :source="pr.body"></markdown>',
     '<markdown :source="pr.body"' + ML + '></markdown>'),
    ('<markdown :source="c.body"></markdown>',
     '<markdown :source="c.body"' + ML + '></markdown>'),
])
add_ctx('app/views/commit.js', [
    ('<markdown :source="msg.body"></markdown>',
     '<markdown :source="msg.body"' + ML + '></markdown>'),
    ('<markdown :source="c.body"></markdown>',
     '<markdown :source="c.body"' + ML + '></markdown>'),
])
add_ctx('app/views/releases.js', [
    ("<markdown :source=\"rel.body.length > 1400 ? rel.body.slice(0, 1400) + '\\\\n\\\\n…' : rel.body\"></markdown>",
     "<markdown :source=\"rel.body.length > 1400 ? rel.body.slice(0, 1400) + '\\\\n\\\\n…' : rel.body\""
     + ML + "></markdown>"),
    ('<markdown :source="single.body"></markdown>',
     '<markdown :source="single.body"' + ML + '></markdown>'),
])

# ---------------- 4) main.css ----------------
rw('styles/main.css', lambda s: must(
    s,
    ".md img{max-width:100%;border-radius:6px;border:1px solid var(--rule)}",
    ".md img{max-width:100%;border-radius:6px;border:1px solid var(--rule);background:var(--paper-3)}",
    'main.css .md img'))

rw('app/util.js', fix_util)
rw('app/components.js', fix_components)

print('changed: ' + (', '.join(changed) if changed else '(none)'))
