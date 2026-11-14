/* ============================================================
   dl.js — 多连接分片下载
   ------------------------------------------------------------
   为什么需要它：国内到 Cloudflare 边缘的长连接经常被 QoS 降速，
   单个 TCP 连接会「开头很快、越下越慢」。把文件切成 N 片并发拉取
   （每片一个独立 Range 请求），再拼成一个 Blob 交给浏览器保存，
   通常能把总速度拉回好几倍。

   兜底原则：任何一步不符合预期 —— 不支持 Range、文件太小/太大、
   请求失败、用户取消 —— 都退回普通导航下载，绝不把人卡死。
   ============================================================ */
(function () {
  'use strict';

  const CONN = 6;                       // 并发连接数
  const MIN = 6 * 1024 * 1024;          // 小于 6MB 不值得分片
  const MAX = 400 * 1024 * 1024;        // 太大不吃内存，交给浏览器
  const CHUNK_MIN = 4 * 1024 * 1024;    // 单片下限，避免请求太碎

  const DL = { job: null };
  let box = null, els = null;

  function fmt(n) {
    if (!n || n < 0) return '0 B';
    const u = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (i === 0 ? Math.round(n) : n.toFixed(n < 10 ? 1 : 0)) + ' ' + u[i];
  }

  function ui(name) {
    if (!box) {
      box = document.createElement('div');
      box.className = 'dlbox';
      box.innerHTML =
        '<div class="dlbox-t"><span class="nm"></span>' +
        '<button class="dlbox-x alt" type="button" title="改走浏览器单连接下载">直连</button>' +
        '<button class="dlbox-x" type="button">取消</button></div>' +
        '<div class="dlbox-bar"><i></i></div>' +
        '<div class="dlbox-meta"><span class="pct"></span><span class="spd"></span></div>';
      document.body.appendChild(box);
      els = {
        nm: box.querySelector('.nm'),
        bar: box.querySelector('.dlbox-bar i'),
        pct: box.querySelector('.pct'),
        spd: box.querySelector('.spd'),
        x: box.querySelector('.dlbox-x:not(.alt)'),
        alt: box.querySelector('.dlbox-x.alt')
      };
      els.x.addEventListener('click', function () { DL.cancel(); });
      // 兜底出口：分片反而更慢时，一键退回浏览器单连接下载
      els.alt.addEventListener('click', function () {
        const u = DL.job && DL.job.url;
        DL.cancel();
        if (u) window.location.href = u;
      });
    }
    els.nm.textContent = name || '下载';
    els.bar.style.width = '0%';
    els.pct.textContent = '连接中…';
    els.spd.textContent = '';
    box.style.display = '';
    return els;
  }

  function teardown() {
    if (box) { box.remove(); box = null; els = null; }
  }

  /* 探一下总大小和 Range 支持：只要 1 个字节 */
  async function probe(url) {
    const r = await fetch(url, { headers: { Range: 'bytes=0-0' } });
    if (r.status !== 206 && r.status !== 200) throw new Error('HTTP ' + r.status);
    const cr = r.headers.get('content-range') || '';
    const m = /\/(\d+)\s*$/.exec(cr);
    const total = m ? parseInt(m[1], 10) : parseInt(r.headers.get('content-length') || '0', 10);
    try { if (r.body && r.body.cancel) r.body.cancel(); } catch (e) { /* 1 字节，忽略 */ }
    return { total: total, range: r.status === 206 && !!m };
  }

  async function chunk(url, s, e, job, onProgress) {
    const r = await fetch(url, { headers: { Range: 'bytes=' + s + '-' + e } });
    if (r.status !== 206) throw new Error('该文件不支持分片（HTTP ' + r.status + '）');
    const reader = r.body.getReader();
    const parts = [];
    for (;;) {
      const d = await reader.read();
      if (d.done) break;
      if (job.cancelled) { try { reader.cancel(); } catch (x) { /* 已取消 */ } throw new Error('cancelled'); }
      parts.push(d.value);
      job.loaded += d.value.length;
      onProgress();
    }
    return new Blob(parts);
  }

  DL.cancel = function () {
    if (DL.job) DL.job.cancelled = true;
    teardown();
    DL.job = null;
  };

  DL.start = async function (url, name, size) {
    if (DL.job) { if (window.U && U.toast) U.toast('已有一个下载在进行'); return; }

    // 元数据已经知道大小且不在分片区间内（.sig / .asc 这类），连探测都省掉
    if (size && (size < MIN || size > MAX)) { window.location.href = url; return; }

    let meta = null;
    try { meta = await probe(url); } catch (e) { meta = null; }
    const total = (meta && meta.total) || size || 0;

    // 不分片的情况直接交给浏览器（同样是 /dl/ 加速链路，只是单连接）
    if (!meta || !meta.range || total < MIN || total > MAX) {
      window.location.href = url;
      return;
    }

    const job = { cancelled: false, loaded: 0, parts: [], url: url };
    DL.job = job;
    const e = ui(name);

    const n = Math.max(2, Math.min(CONN, Math.ceil(total / CHUNK_MIN)));
    const step = Math.ceil(total / n);
    const t0 = performance.now();
    let lastPaint = 0;

    const paint = function (force) {
      const now = performance.now();
      if (!force && now - lastPaint < 100) return;
      lastPaint = now;
      const pct = Math.min(100, job.loaded / total * 100);
      e.bar.style.width = pct.toFixed(1) + '%';
      e.pct.textContent = pct.toFixed(0) + '%  ' + fmt(job.loaded) + ' / ' + fmt(total);
      const spd = job.loaded / Math.max((now - t0) / 1000, 0.2);
      e.spd.textContent = fmt(spd) + '/s';
    };

    const tasks = [];
    for (let i = 0; i < n; i++) {
      const s = i * step, en = Math.min(total - 1, s + step - 1);
      if (s > en) break;
      tasks.push(chunk(url, s, en, job, paint).then(function (b) { job.parts[i] = b; }));
    }

    try {
      await Promise.all(tasks);
    } catch (err) {
      const wasCancelled = job.cancelled;
      teardown(); DL.job = null;
      if (!wasCancelled) {
        if (window.U && U.toast) U.toast('分片下载失败，改用浏览器直接下载');
        window.location.href = url;
      }
      return;
    }

    if (job.cancelled) { teardown(); DL.job = null; return; }

    paint(true);
    const blob = new Blob(job.parts, { type: 'application/octet-stream' });
    job.parts = null;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name || 'download';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 60000);

    e.nm.textContent = '已完成 · ' + (name || '');
    e.spd.textContent = '已保存';
    setTimeout(function () { if (!DL.job) teardown(); }, 2600);
    DL.job = null;
  };

  window.DL = DL;
})();
