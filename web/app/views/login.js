/* ============================================================
   views/login.js
   ============================================================ */
(function () {
  'use strict';
  const C = window.C;

  const Login = {
    components: C,
    props: { bootErr: String },
    emits: ['authed'],
    data: function () {
      return {
        tok: '',
        show: false,
        remember: true,
        busy: false,
        err: '',
        probe: null
      };
    },
    computed: {
      looksOk: function () { return /^(gh[pousr]_[A-Za-z0-9]{20,}|[A-Za-z0-9_]{40})$/.test((this.tok || '').trim()); },
      scopeUrl: function () {
        return 'https://github.com/settings/tokens/new?description=gh-web&scopes=repo,read:user,user:email,notifications,gist';
      }
    },
    methods: {
      submit: async function () {
        const t = (this.tok || '').trim();
        if (!t) { this.err = '请填写 Personal Access Token'; return; }
        this.busy = true; this.err = '';
        API.setPat(t);
        try {
          this.probe = await API.me();
          if (!this.remember) {
            // keep in session only → drop the persisted copy, keep in-memory
            U.store.del('pat');
          } else {
            U.store.set('pat', t);
          }
          this.$emit('authed');
        } catch (e) {
          API.setPat(null);
          this.err = e.status === 401
            ? 'Token 无效，或缺少必要权限（需要 repo / read:user / notifications）。'
            : '连接失败：' + e.message;
        } finally {
          this.busy = false;
        }
      },
      paste: async function () {
        try {
          const txt = await navigator.clipboard.readText();
          if (txt) this.tok = txt.trim();
        } catch (e) { U.toast('浏览器不允许读取剪贴板，请手动粘贴', 'bad'); }
      }
    },
    template:
'<div class="login-wrap">' +
'  <div class="login-art">' +
'    <div class="login-grid"></div>' +
'    <div class="login-art-in">' +
'      <div style="display:flex;align-items:center;gap:11px">' +
'        <svg class="gh-mark" viewBox="0 0 24 24" style="width:40px;height:40px">' +
'          <path fill="currentColor" d="M12 1.8a10.2 10.2 0 0 0-3.23 19.9c.51.1.7-.22.7-.49l-.01-1.72c-2.84.62-3.44-1.37-3.44-1.37-.46-1.18-1.13-1.5-1.13-1.5-.93-.63.07-.62.07-.62 1.02.07 1.56 1.05 1.56 1.05.9 1.55 2.38 1.1 2.96.84.09-.66.35-1.1.64-1.35-2.27-.26-4.65-1.14-4.65-5.03 0-1.11.4-2.02 1.05-2.73-.11-.26-.46-1.3.1-2.7 0 0 .86-.28 2.8 1.04a9.7 9.7 0 0 1 2.55-.34c.87 0 1.74.12 2.55.34 1.94-1.32 2.8-1.04 2.8-1.04.56 1.4.21 2.44.1 2.7.65.71 1.05 1.62 1.05 2.73 0 3.9-2.39 4.76-4.67 5.02.37.32.7.94.7 1.9l-.01 2.81c0 .27.18.6.71.49A10.2 10.2 0 0 0 12 1.8z"/>' +
'        </svg>' +
'        <div>' +
'          <div style="font-family:var(--mono);font-weight:700;font-size:22px;letter-spacing:.05em">GH·WEB</div>' +
'          <div style="font-family:var(--mono);font-size:10.5px;letter-spacing:.18em;opacity:.6;text-transform:uppercase">github · local mirror</div>' +
'        </div>' +
'      </div>' +
'      <div style="margin-top:34px;max-width:430px">' +
'        <div style="font-family:var(--mono);font-size:10px;letter-spacing:.2em;opacity:.5;text-transform:uppercase;margin-bottom:12px">为什么快</div>' +
'        <div style="display:flex;flex-direction:column;gap:13px">' +
'          <div style="display:flex;gap:11px"><span class="mono" style="color:var(--accent);opacity:.95">01</span>' +
'            <span style="font-size:13px;opacity:.82;line-height:1.5">页面与前端资源全部本地直出，不加载 GitHub 的整页脚本</span></div>' +
'          <div style="display:flex;gap:11px"><span class="mono" style="color:var(--accent);opacity:.95">02</span>' +
'            <span style="font-size:13px;opacity:.82;line-height:1.5">API 响应经本地缓存层，重复浏览命中缓存，通常在十毫秒内返回</span></div>' +
'          <div style="display:flex;gap:11px"><span class="mono" style="color:var(--accent);opacity:.95">03</span>' +
'            <span style="font-size:13px;opacity:.82;line-height:1.5">只读镜像：不写入、不改动你的任何仓库数据</span></div>' +
'        </div>' +
'      </div>' +
'    </div>' +
'    <div class="login-art-in" style="font-family:var(--mono);font-size:10.5px;opacity:.45;letter-spacing:.05em">' +
'      ' + (location.host || 'GH·WEB') + ' · 自建实例</div>' +
'  </div>' +

'  <div class="login-form">' +
'    <div class="login-card">' +
'      <div class="eyebrow" style="margin-bottom:12px">身份凭证</div>' +
'      <h1 style="margin-bottom:7px">接入 GitHub</h1>' +
'      <p class="muted-line" style="margin:0 0 20px">' +
'        填入 Personal Access Token 即可。凭证只保存在这台设备的 localStorage 中，' +
'        只会发往 api.github.com，本站服务端不做任何记录。</p>' +

'      <div v-if="bootErr" class="banner banner-bad" style="margin-bottom:14px">' +
'        <icon name="alert" :size="14"></icon><span>{{ bootErr }}</span></div>' +
'      <div v-if="err" class="banner banner-bad" style="margin-bottom:14px">' +
'        <icon name="alert" :size="14"></icon><span>{{ err }}</span></div>' +

'      <label class="field">' +
'        <span class="lbl">Personal Access Token</span>' +
'        <span style="position:relative;display:block">' +
'          <input class="input mono-input" :type="show ? \'text\' : \'password\'" v-model="tok" ' +
'                 placeholder="ghp_… 或 github_pat_…" autocomplete="off" spellcheck="false" ' +
'                 @keydown.enter="submit" style="padding-right:66px">' +
'          <span style="position:absolute;right:5px;top:4px;display:flex;gap:2px">' +
'            <button class="btn btn-sm btn-quiet" @click="show = !show" :title="show ? \'隐藏\' : \'显示\'">' +
'              <icon name="eye" :size="13"></icon></button>' +
'            <button class="btn btn-sm btn-quiet" @click="paste" title="从剪贴板粘贴">' +
'              <icon name="link" :size="13"></icon></button>' +
'          </span>' +
'        </span>' +
'        <span class="hint" v-if="tok && !looksOk" style="color:var(--warn)">' +
'          格式看起来不像 GitHub token，确认没有多复制了空格或换行</span>' +
'      </label>' +

'      <button class="btn btn-dark" style="width:100%;height:36px" :disabled="busy" @click="submit">' +
'        <span v-if="busy" class="spin" style="border-top-color:#fff"></span>' +
'        <icon v-else name="zap" :size="14"></icon>' +
'        {{ busy ? \'正在校验…\' : \'连接\' }}</button>' +

'      <label style="display:flex;align-items:center;gap:8px;margin-top:13px;cursor:pointer">' +
'        <input type="checkbox" v-model="remember" style="accent-color:var(--ink)">' +
'        <span class="sm dim">在这台设备上记住（不勾则仅本次会话有效）</span></label>' +

'      <hr class="rule" style="margin:20px 0 15px">' +
'      <div class="eyebrow" style="margin-bottom:9px">需要的权限</div>' +
'      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">' +
'        <span class="badge">repo</span><span class="badge">read:user</span>' +
'        <span class="badge">notifications</span><span class="badge">gist</span></div>' +
'      <a class="btn btn-sm" :href="scopeUrl" target="_blank" rel="noopener noreferrer">' +
'        <icon name="key" :size="13"></icon>新建带这些权限的 Token' +
'        <icon name="external" :size="12"></icon></a>' +

'      <p class="xs dimmer" style="margin-top:16px;line-height:1.6">' +
'        不支持账号密码或 Cookie 登录：GitHub 的会话 Cookie 绑定在 github.com 域上，' +
'        跨站无法使用，浏览器也不会允许。Token 是唯一可靠且可随时吊销的方式。</p>' +
'    </div>' +
'  </div>' +
'</div>'
  };

  window.VIEWS.login = Login;
})();
