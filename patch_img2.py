#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""gh-web 图片修复 · 第二批（releases.js 行内补丁 + util.js/components.js/main.css）"""
import io, os, sys

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


# 1) releases.js：只在含 "markdown :source=\"rel.body" 的那一行末尾补上下文，
#    避免去猜那串被转义得稀碎的 JS 字面量
def fix_releases(s):
    out, hit = [], 0
    for line in s.split('\n'):
        if 'markdown :source="rel.body' in line and '</markdown>' in line and 'owner="o"' not in line:
            line = line.replace('"></markdown>', '" :owner="o" :repo="r"></markdown>', 1)
            hit += 1
        out.append(line)
    if hit != 1:
        print('  !! releases.js 行匹配数异常: %d' % hit)
        sys.exit(1)
    return '\n'.join(out)


rw('app/views/releases.js', fix_releases)


# 2) util.js：新增 U.imgContext / U.ctxFromHash / U.resolveImgSrc / U.rewriteImg
def fix_util(s):
    anchor = "  /* ---------- text ---------- */"
    add = r"""  /* ---------- markdown 里的相对图片 ---------- */
  // Markdown 中的图片常写成相对路径（<img src="assets/showcase/hero.png">，
  // 这是 GitHub 官方 README 的常见写法）。SPA 里浏览器会按「当前页面地址」解析，
  // 于是跑到本站 /<owner>/<repo>/assets/... 去要图，必然 404 —— 即「图片不见了」。
  // 这里统一改写成 raw.githubusercontent.com 的绝对地址。
  // 必须在 marked 解析之后做：marked 的 gfm 允许正文里直接写 <img> HTML 标签，
  // 它不会为这类标签解析相对路径。
  let imgCtx = null;

  U.imgContext = function (o, r, ref) {
    if (o && r) imgCtx = { o: o, r: r, ref: ref || 'HEAD' };
    return imgCtx;
  };

  // 兜底：组件没传上下文时，从 hash 路由里解析出 owner/repo/ref
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

  // 只改 src= 属性，不碰 alt/title 里的内容
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


# 3) components.js：Markdown 组件新增 owner/repo/ref 并设置上下文
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


# 4) main.css：给 .md img 加点底色，图还没到时不至于是一片空白
def fix_css(s):
    return must(s,
                ".md img{max-width:100%;border-radius:6px;border:1px solid var(--rule)}",
                ".md img{max-width:100%;border-radius:6px;border:1px solid var(--rule);background:var(--paper-3)}",
                'main.css .md img')


rw('app/util.js', fix_util)
rw('app/components.js', fix_components)
rw('styles/main.css', fix_css)

print('changed: ' + (', '.join(changed) if changed else '(none)'))
