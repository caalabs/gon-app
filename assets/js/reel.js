// Gon showreel: seven scenes on one GSAP timeline. Everything that moves — clips, counters, typing, particles —
// is a function of the timeline's time, so the reel can be scrubbed, jumped to, and rendered frame by frame.
(() => {
  const reel = document.getElementById('reel');
  if (!reel || !window.gsap) return;
  const stage = document.getElementById('reelStage');
  const $ = (s, r = stage) => r.querySelector(s);
  const $$ = (s, r = stage) => [...r.querySelectorAll(s)];
  const fmt = (n, d = 1) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const params = new URLSearchParams(location.search);
  const exporting = params.has('film');
  const reduce = !exporting && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let playing = false;

  // ---------- Scale the 1120×660 stage to its box ----------
  const fit = () => reel.style.setProperty('--k', reel.clientWidth / 1120);
  new ResizeObserver(fit).observe(reel);
  fit();

  // ---------- Scenes ----------
  const ACC = { clean: '#22d3ee', analyze: '#fb923c', apps: '#5b8cff', status: '#f472b6' };
  const scenes = [
    { id: 'sScan', tab: 'clean', dur: 5.5, label: 'Scan', caption: 'Gon finds what your Mac quietly gave away.' },
    { id: 'sReview', tab: 'clean', dur: 6.0, label: 'Review', caption: 'Every item explained. The safe ones ticked for you.' },
    { id: 'sClean', tab: 'clean', dur: 4.0, label: 'Clean', caption: 'One click. Everything goes to the Trash.' },
    { id: 'sDone', tab: 'clean', dur: 3.6, label: 'Done', caption: 'Space back — and nothing you needed.' },
    { id: 'sAnalyze', tab: 'analyze', dur: 6.0, label: 'Analyze', caption: 'See where the rest of your disk went.' },
    { id: 'sApps', tab: 'apps', dur: 5.6, label: 'Uninstall', caption: 'Remove an app, and everything it left behind.' },
    { id: 'sStatus', tab: 'status', dur: 5.4, label: 'Status', caption: 'Always know what your Mac is doing.' },
  ];
  if (exporting) {
    scenes.unshift({ id: 'sIntro', tab: 'clean', dur: 2.8, label: 'Gon', caption: '' });
    scenes.push({ id: 'sOutro', tab: 'clean', dur: 3.4, label: 'Get Gon', caption: 'Free for your Mac.' });
  }
  let t0 = 0;
  for (const s of scenes) { s.start = t0; t0 += s.dur; s.end = t0; s.el = document.getElementById(s.id); }
  const TOTAL = t0;
  function byId(id) { return scenes.find(s => s.id === id); }
  const sceneAt = t => scenes.find(s => t >= s.start && t < s.end) || scenes[scenes.length - 1];

  // ---------- Clips: each plays one stretch of a recording made in the app ----------
  // Scan: one 8 s cycle of the app's simulated scan (0 → 24.5 GB) starting at 18.32 GB; we show 0.5 → 7.8 GB.
  // Clean: 16 s, two cycles of 0 → 6.47 GB freed; the first full cycle starts at 3.67 s.
  // Done: the bloom restarts every 4 s, first at 0.4 s.
  const SCAN_P0 = 18.32 / 24.5;
  const clips = [
    { v: $('#rScanOrb video'), scene: byId('sScan'), from: 2.18, rate: 0.434 },
    { v: $('#rCleanOrb video'), scene: byId('sClean'), from: 3.69, rate: 1.985 },
    { v: $('#rDoneOrb video'), scene: byId('sDone'), from: 0.40, rate: 1 },
  ];
  const clipTime = (c, t) => c.from + (t - c.scene.start) * c.rate;
  const scanFound = t => 24.5 * ((SCAN_P0 + clipTime(clips[0], Math.min(Math.max(t, byId('sScan').start), byId('sScan').end)) / 8) % 1);

  // ---------- Tab pill ----------
  const tabEls = $$('#rTabs span');
  const pill = $('#rPill');
  const pillTo = tab => {
    const el = tabEls.find(e => e.dataset.tab === tab);
    return { left: () => el.offsetLeft, width: () => el.offsetWidth };
  };

  // ---------- Treemap of a sample home folder ----------
  const blocks = [
    ['Docker.raw', '61 GB', 0, 0, 300, 288, '#8b7cf6', '#5b3fd6'],
    ['Photos Library', '38 GB', 0, 294, 300, 186, '#f472b6', '#be3a7e'],
    ['Projects', '22 GB', 306, 0, 196, 228, '#22d3ee', '#0e8aa8'],
    ['Movies', '14 GB', 508, 0, 142, 228, '#5b8cff', '#3253c9'],
    ['Xcode', '12 GB', 306, 234, 176, 136, '#2dd4bf', '#0f8a7c'],
    ['Music', '6 GB', 488, 234, 162, 136, '#fbbf24', '#c27c0e'],
    ['Downloads', '4 GB', 306, 376, 120, 104, '#38bdf8', '#1679b8'],
    ['Mail', '3 GB', 432, 376, 104, 104, '#a3e635', '#5e8f17'],
    ['Other', '2 GB', 542, 376, 108, 104, '#94a3b8', '#556274'],
  ];
  const map = $('#rMap');
  const blockEls = blocks.map(([n, sz, x, y, w, h, c1, c2]) => {
    const d = document.createElement('div');
    d.className = 'r-blk';
    Object.assign(d.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    d.style.setProperty('--b1', c1); d.style.setProperty('--b2', c2);
    d.innerHTML = `<b>${n}</b><span>${sz}</span><i class="hl"></i>`;
    map.appendChild(d);
    return d;
  });

  // ---------- Deterministic randomness for particles and the treemap's flight ----------
  const rand = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // ---------- Particles (drawn from the timeline's time) ----------
  const fx = $('#rFx');
  const ctx = fx.getContext('2d');
  const dpr = Math.min(2, devicePixelRatio || 1) * (exporting ? 1.5 : 1);
  fx.width = 1120 * dpr; fx.height = 608 * dpr; ctx.scale(dpr, dpr);
  const r1 = rand(7);
  const motes = Array.from({ length: 46 }, () => ({ a: r1() * Math.PI * 2, r0: 210 + r1() * 150, sp: 40 + r1() * 70, ph: r1(), s: 1 + r1() * 2.2 }));
  const r2 = rand(19);
  const burst = Array.from({ length: 64 }, () => ({ a: r1() * Math.PI * 2, v: 160 + r2() * 360, s: 2 + r2() * 5, rot: r2() * 6, hue: r2() }));
  const star = (x, y, r, rot) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
    ctx.moveTo(0, -r * 2); ctx.quadraticCurveTo(0, 0, r * 2, 0); ctx.quadraticCurveTo(0, 0, 0, r * 2);
    ctx.quadraticCurveTo(0, 0, -r * 2, 0); ctx.quadraticCurveTo(0, 0, 0, -r * 2); ctx.fill(); ctx.restore();
  };
  const drawFx = t => {
    ctx.clearRect(0, 0, 1120, 608);
    const s1 = byId('sScan');
    if (t > s1.start - 0.2 && t < s1.end + 0.3) {
      // Motes drift into the scanning orb.
      const fade = Math.min(1, (t - s1.start + .2) / 0.6) * Math.min(1, (s1.end + 0.3 - t) / 0.6);
      const cx = 330, cy = 290;
      for (const m of motes) {
        const span = m.r0 - 110;
        const r = m.r0 - (((t - s1.start + 5) * m.sp + m.ph * span) % span);
        const k = (r - 110) / span;
        ctx.globalAlpha = fade * Math.min(1, k * 3) * (0.35 + 0.5 * (1 - k));
        ctx.fillStyle = k < 0.35 ? '#e6fdff' : '#7ff0ff';
        ctx.beginPath(); ctx.arc(cx + Math.cos(m.a) * r, cy + Math.sin(m.a) * r, m.s, 0, Math.PI * 2); ctx.fill();
      }
    }
    const s4 = byId('sDone');
    // Ripples spread from the orb as it blooms.
    for (let k = 0; k < 3; k++) {
      const rt = t - (s4.start + 0.3 + k * 0.22);
      if (rt > 0 && rt < 1.8) {
        const e = 1 - Math.pow(1 - rt / 1.8, 3);
        ctx.globalAlpha = 0.55 * (1 - rt / 1.8);
        ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2 - k * .4;
        ctx.beginPath(); ctx.arc(560, 195, 150 + e * 420, 0, Math.PI * 2); ctx.stroke();
      }
    }
    const bt = t - (s4.start + 0.25);
    if (bt > 0 && bt < 2.2) {
      // A burst of Gon sparkles as the bloom pops.
      for (const p of burst) {
        const d = p.v * (1 - Math.pow(1 - Math.min(1, bt / 1.6), 3));
        const x = 560 + Math.cos(p.a) * d, y = 195 + Math.sin(p.a) * d + 60 * bt * bt;
        ctx.globalAlpha = Math.max(0, 1 - bt / 2.2);
        ctx.fillStyle = p.hue < 0.5 ? '#bff8ff' : (p.hue < 0.8 ? '#22d3ee' : '#a78bfa');
        star(x, y, p.s * (1 - bt / 3), p.rot + bt * 3);
      }
    }
    ctx.globalAlpha = 1;
  };

  // ---------- Caption and chapters (outside the stage) ----------
  const cap = document.getElementById('reelCaption');
  const nav = document.getElementById('reelNav');
  const navBtns = scenes.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `${s.label}<i></i>`;
    b.addEventListener('click', () => jump(i));
    nav.appendChild(b);
    return b;
  });
  let shownCaption = -1;
  const setCaption = i => {
    if (i === shownCaption) return;
    shownCaption = i;
    cap.innerHTML = scenes[i].caption.split(' ').map(w => `<span class="w">${w} </span>`).join('');
    if (!reduce && !exporting) gsap.from(cap.querySelectorAll('.w'), { y: 14, opacity: 0, duration: .5, stagger: .035, ease: 'power3.out' });
    navBtns.forEach((b, k) => b.classList.toggle('on', k === i));
  };

  // ---------- The timeline ----------
  const tl = gsap.timeline({ paused: true, repeat: exporting ? 0 : -1, defaults: { ease: 'power3.out' } });
  const fin = (el, at, d = .45) => tl.fromTo(el, { opacity: 0, scale: 1.03 }, { opacity: 1, scale: 1, duration: d }, at);
  const fout = (el, at, d = .4) => tl.to(el, { opacity: 0, scale: .97, duration: d, ease: 'power2.in' }, at);
  const S = Object.fromEntries(scenes.map(s => [s.id, s]));

  // A sheen sweeps the window at every cut but the first.
  for (const s of scenes.slice(1)) {
    tl.fromTo('#rGlare', { x: -420, opacity: 0 }, { x: 1400, opacity: 1, duration: .9, ease: 'power2.inOut' }, s.start - .35);
    tl.to('#rGlare', { opacity: 0, duration: .2 }, s.start + .45);
  }
  // A slow push-in on every scene.
  for (const s of scenes) tl.fromTo(s.el, { scale: 1.035 }, { scale: 1, duration: s.dur, ease: 'none', immediateRender: false }, s.start);

  // Tab pill and accent per scene.
  const first = tabEls[0];
  gsap.set(pill, { left: first.offsetLeft, width: first.offsetWidth });
  gsap.set(reel, { '--accent': ACC.clean });
  for (const s of scenes) {
    tl.to(pill, { ...pillTo(s.tab), duration: .5, ease: 'power3.inOut' }, s.start);
    tl.to(reel, { '--accent': ACC[s.tab], duration: .6 }, s.start);
    tl.call(() => tabEls.forEach(e => e.classList.toggle('on', e.dataset.tab === s.tab)), null, s.start);
  }

  // Film title cards
  if (exporting) {
    for (const id of ['sIntro', 'sOutro']) {
      const s = S[id];
      fin(s.el, s.start, .6);
      tl.from(s.el.querySelector('img'), { scale: .4, opacity: 0, rotation: -12, duration: 1.1, ease: 'back.out(1.7)' }, s.start + .1);
      tl.from([...s.el.children].slice(1), { y: 24, opacity: 0, duration: .8, stagger: .15 }, s.start + .55);
      if (id === 'sIntro') fout(s.el, s.end - .45);
    }
  }

  // 1 · Scan
  {
    const s = S.sScan;
    fin(s.el, s.start);
    tl.from('#rScanOrb', { scale: .8, opacity: 0, duration: .8 }, s.start);
    tl.from($$('#rScanSide > *'), { x: 30, opacity: 0, duration: .6, stagger: .08 }, s.start + .15);
    const phases = [
      { title: 'App caches', path: '~/Library/Caches', chip: 'App Caches', gb: 2.1 },
      { title: 'Developer tools', path: '~/Library/Developer/Xcode/DerivedData', chip: 'Developer Tools', gb: 5.2 },
      { title: 'Trash & Downloads', path: '~/Downloads', chip: 'Downloads', gb: 0.5 },
    ];
    const found = $('#rFound'), bar = $('#rFoundBar'), chips = $('#rChips'), title = $('#rScanTitle'), path = $('#rScanPath');
    const chipEls = phases.map(p => {
      const c = document.createElement('span');
      c.className = 'r-chip'; c.innerHTML = `${p.chip} · <b>0.0 GB</b>`; c.style.opacity = 0;
      chips.appendChild(c); return c;
    });
    const draw = t => {
      const f = Math.min(7.8, scanFound(t));
      found.textContent = fmt(f);
      bar.style.width = `${(f / 7.8) * 100}%`;
      let acc = 0;
      phases.forEach((p, k) => {
        const part = Math.min(p.gb, Math.max(0, f - acc));
        const c = chipEls[k];
        const on = f > acc || k === 0;
        c.style.opacity = on ? 1 : 0;
        c.style.transform = on ? 'none' : 'scale(.8)';
        c.querySelector('b').textContent = fmt(part) + ' GB';
        if (on) { title.textContent = p.title; path.textContent = p.path; }
        acc += p.gb;
      });
    };
    tl.to({}, { duration: s.dur, onUpdate() { draw(tl.time()); } }, s.start);
    fout(s.el, s.end - .4);
  }

  // 2 · Review
  {
    const s = S.sReview;
    fin(s.el, s.start);
    tl.from('#rReview', { y: 50, opacity: 0, duration: .7 }, s.start);
    const rows = $$('#rReview .rr-row');
    tl.from(rows, { y: 14, opacity: 0, duration: .45, stagger: .08 }, s.start + .35);
    const safe = rows.filter(r => r.dataset.safe);
    const sel = $('#rSel');
    const selected = { v: 0 };
    tl.set(sel, { textContent: '0.0 GB' }, s.start);
    safe.forEach((r, k) => {
      const at = s.start + 1.3 + k * .32;
      tl.to(r.querySelector('.fill'), { scale: 1, duration: .3, ease: 'back.out(2.4)' }, at);
      tl.to(r.querySelector('svg'), { scale: 1, duration: .35, ease: 'back.out(3)' }, at + .05);
      tl.to(selected, { v: safe.slice(0, k + 1).reduce((a, x) => a + +x.dataset.gb, 0), duration: .3, ease: 'none',
        onUpdate: () => { sel.textContent = fmt(selected.v) + ' GB'; } }, at);
    });
    // The pointer comes in and presses Move to Trash.
    const btn = $('#rBtn');
    const cursor = $('#rCursor');
    const at = s.start + 3.0;
    const bx = () => 230 + 16 + btn.offsetLeft + btn.offsetWidth * .62;
    const by = () => 28 + 16 + btn.offsetTop + btn.offsetHeight * .55;
    tl.fromTo(cursor, { x: 1000, y: 560, opacity: 0 }, { x: bx, y: by, opacity: 1, duration: 1.1, ease: 'power2.inOut' }, at);
    tl.to(btn, { scale: .93, duration: .12, ease: 'power2.in' }, at + 1.2);
    tl.to(cursor, { scale: .85, duration: .12 }, at + 1.2);
    tl.fromTo(btn.querySelector('.rip'), { scale: 0, opacity: .7 }, { scale: 14, opacity: 0, duration: .6 }, at + 1.25);
    tl.to(btn, { scale: 1, duration: .3, ease: 'back.out(3)' }, at + 1.32);
    tl.to(cursor, { scale: 1, opacity: 0, duration: .3 }, at + 1.4);
    // The list gathers into the orb that comes next.
    tl.to(rows.filter(r => r.dataset.safe), { x: 60, opacity: 0, duration: .35, stagger: .05, ease: 'power2.in' }, at + 1.5);
    tl.to('#rReview', { scale: .2, opacity: 0, transformOrigin: '50% 60%', duration: .5, ease: 'power3.in' }, s.end - .55);
    tl.set(s.el, { opacity: 0 }, s.end);
  }

  // 3 · Clean
  {
    const s = S.sClean;
    fin(s.el, s.start, .3);
    tl.from('#rCleanOrb', { scale: .5, opacity: 0, duration: .7, ease: 'back.out(1.6)' }, s.start);
    const names = $$('#rCleanList span');
    tl.from(names, { y: 10, opacity: 0, duration: .4, stagger: .06 }, s.start + .3);
    names.forEach((n, k) => tl.call(() => n.classList.add('gone'), null, s.start + 1.0 + k * .7));
    tl.call(() => names.forEach(n => n.classList.remove('gone')), null, s.start);
    fout(s.el, s.end - .3, .3);
  }

  // 4 · Done
  {
    const s = S.sDone;
    fin(s.el, s.start, .2);
    tl.from('#rDoneText', { y: 30, opacity: 0, duration: .7 }, s.start + .5);
    const freed = { v: 0 };
    tl.fromTo(freed, { v: 0 }, { v: 6.4, duration: 1.2, ease: 'power2.out', onUpdate: () => { $('#rFreed').textContent = fmt(freed.v); } }, s.start + .5);
    fout(s.el, s.end - .4);
  }

  // 5 · Analyze
  {
    const s = S.sAnalyze;
    fin(s.el, s.start, .3);
    const rf = rand(41);
    blockEls.forEach((b, k) => {
      tl.from(b, { x: (rf() - .5) * 700, y: (rf() - .5) * 500 + 120, rotation: (rf() - .5) * 50, scale: .3, opacity: 0,
                   duration: .9, ease: 'expo.out' }, s.start + .1 + k * .07);
    });
    tl.fromTo(blockEls[0].querySelector('.hl'), { opacity: 0 }, { opacity: 1, duration: .3, yoyo: true, repeat: 3 }, s.start + 1.6);
    tl.from('#rDisk', { x: 60, opacity: 0, duration: .7 }, s.start + 1.7);
    const sum = $('#rDiskSum');
    const text = 'Most of the space is Docker’s disk image and your photo library. Old project builds come next.';
    const typed = { n: 0 };
    tl.fromTo(typed, { n: 0 }, { n: text.length, duration: 1.7, ease: 'none',
      onUpdate: () => { sum.innerHTML = text.slice(0, Math.round(typed.n)) + (typed.n < text.length ? '<span class="r-caret"></span>' : ''); } },
      s.start + 2.1);
    tl.from($$('#rDisk li'), { y: 10, opacity: 0, duration: .45, stagger: .25 }, s.start + 3.9);
    fout(s.el, s.end - .4);
  }

  // 6 · Apps
  {
    const s = S.sApps;
    fin(s.el, s.start, .3);
    tl.from('#rApp', { scale: 0, opacity: 0, duration: .7, ease: 'back.out(1.8)' }, s.start + .1);
    tl.from('#rTrash', { y: 30, opacity: 0, duration: .5 }, s.start + .3);
    const cursor = $('#rCursor');
    const at = s.start + .9;
    tl.fromTo(cursor, { x: 360, y: 520, opacity: 0 }, { x: 270, y: 260, opacity: 1, duration: .6, ease: 'power2.out' }, at);
    tl.to('#rLid', { rotation: -28, transformOrigin: '78px 20px', duration: .3 }, at + .8);
    tl.to('#rApp', { x: 300, y: 50, scale: .25, opacity: .9, duration: .7, ease: 'power3.in' }, at + .7);
    tl.to(cursor, { x: 520, y: 300, duration: .7, ease: 'power3.in' }, at + .7);
    tl.to('#rApp', { opacity: 0, duration: .12 }, at + 1.38);
    tl.to('#rLid', { rotation: 0, duration: .35, ease: 'back.out(3)' }, at + 1.45);
    tl.to(cursor, { opacity: 0, duration: .25 }, at + 1.5);
    tl.from('#rLeft .lh, #rLeft .r-evid', { y: 12, opacity: 0, duration: .45, stagger: .1 }, at + 1.5);
    const files = $$('#rLeft .r-file');
    tl.from(files, { x: -330, y: 60, scale: .4, opacity: 0, duration: .65, stagger: .14, ease: 'expo.out' }, at + 1.7);
    const tot = { v: 0 };
    tl.fromTo(tot, { v: 0 }, { v: 312, duration: 1.1, ease: 'power2.out', onUpdate: () => { $('#rLeftTot').textContent = Math.round(tot.v); } }, at + 1.8);
    tl.from('#rGone', { scale: .6, opacity: 0, duration: .5, ease: 'back.out(2)' }, at + 3.1);
    tl.from('#rTrashWrap p', { y: 10, opacity: 0, duration: .5 }, at + 1.6);
    tl.from('#rBadge', { scale: 0, duration: .45, ease: 'back.out(3)' }, at + 1.5);
    const badge = { v: 1 };
    tl.fromTo(badge, { v: 1 }, { v: 5, duration: 1.0, ease: 'none', onUpdate: () => { $('#rBadge').textContent = Math.round(badge.v); } }, at + 1.7);
    tl.to('#rTrash', { color: '#9db8ff', duration: .4 }, at + 1.5);
    fout(s.el, s.end - .4);
  }

  // 7 · Status
  {
    const s = S.sStatus;
    fin(s.el, s.start, .3);
    const health = { v: 0 };
    tl.fromTo(health, { v: 0 }, { v: 92, duration: 1.6, ease: 'power3.out', onUpdate: () => {
      $('#rHealthNum').textContent = Math.round(health.v);
      $('#rHealthArc').style.strokeDashoffset = 326.7 * (1 - health.v / 100);
    } }, s.start + .2);
    $$('#rTiles .r-spark').forEach(p => { p.setAttribute('pathLength', '1'); p.style.strokeDasharray = '1'; });
    tl.from($$('#rTiles .r-tile'), { y: 18, opacity: 0, duration: .5, stagger: .08 }, s.start + .3);
    tl.fromTo($$('#rTiles .r-spark'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.4, stagger: .1, ease: 'power2.inOut' }, s.start + .5);
    $$('#rTiles [data-to]').forEach(el => {
      const o = { v: 0 }, d = +(el.dataset.dec || 0);
      tl.fromTo(o, { v: 0 }, { v: +el.dataset.to, duration: 1.2, onUpdate: () => { el.textContent = fmt(o.v, d); } }, s.start + .5);
    });
    tl.from($$('#rProcs .r-proc'), { x: 20, opacity: 0, duration: .4, stagger: .1 }, s.start + 1.2);
    tl.fromTo('#rProcs .hi', { boxShadow: '0 0 0 1px rgba(244,114,182,.35) inset, 0 0 0 0 rgba(244,114,182,.4)' },
      { boxShadow: '0 0 0 1px rgba(244,114,182,.35) inset, 0 0 0 10px rgba(244,114,182,0)', duration: 1, repeat: 1 }, s.start + 2.2);
    fout(s.el, s.end - .45);
  }

  // Every frame: particles, caption and chapter progress follow the timeline's time.
  tl.eventCallback('onUpdate', () => {
    const t = tl.time();
    drawFx(t);
    const sc = sceneAt(t), i = scenes.indexOf(sc);
    setCaption(i);
    if (exporting) {
      // The film's caption rises word by word from the timeline's time, so every frame is reproducible.
      cap.querySelectorAll('.w').forEach((w, k) => {
        const p = Math.min(1, Math.max(0, (t - sc.start - k * .035) / .5));
        const e = 1 - Math.pow(1 - p, 3);
        w.style.opacity = e; w.style.transform = `translateY(${(1 - e) * 14}px)`;
      });
    }
    navBtns.forEach((b, k) => {
      const p = k < i ? 1 : k > i ? 0 : (t - sc.start) / sc.dur;
      b.querySelector('i').style.width = `${p * 100}%`;
    });
    if (!exporting) syncClips(t);
  });
  tl.set({}, {}, TOTAL);
  window.__reelTimeline = tl;

  // ---------- Clips follow the timeline ----------
  const syncClips = t => {
    for (const c of clips) {
      const inside = t >= c.scene.start - .2 && t < c.scene.end + .1;
      if (!inside) { if (!c.v.paused) c.v.pause(); continue; }
      const want = clipTime(c, Math.max(t, c.scene.start));
      if (c.v.playbackRate !== c.rate) c.v.playbackRate = c.rate;
      // Seeking needs the movie's metadata; until then just ask it to load.
      if (c.v.readyState < 1) { if (playing && c.v.paused) c.v.play().catch(() => {}); continue; }
      // A seek in progress restarts if currentTime is set again: correct drift only between seeks.
      if (c.v.seeking) continue;
      if (t < c.scene.start) { if (!c.v.paused) c.v.pause(); if (Math.abs(c.v.currentTime - c.from) > .05) c.v.currentTime = c.from; continue; }
      if (Math.abs(c.v.currentTime - want) > .3) c.v.currentTime = want;
      if (c.v.paused && playing) c.v.play().catch(() => {});
    }
  };

  // ---------- Playing, pausing, jumping ----------
  // The first time the reel shows, fetch every clip (about 3 MB in all), so each is ready before its scene.
  let warmed = false;
  const warm = () => {
    if (warmed) return; warmed = true;
    clips.forEach(c => { c.v.preload = 'auto'; if (c.v.readyState === 0) c.v.load(); });
  };
  const play = () => { if (reduce || exporting) return; warm(); playing = true; tl.play(); };
  const pause = () => { playing = false; tl.pause(); clips.forEach(c => c.v.pause()); };
  // With Reduce Motion each chapter shows one still moment: everything in place, no pointer mid-flight.
  const still = { sScan: 4.8, sReview: 2.9, sClean: 3.0, sDone: 2.4, sAnalyze: 4.9, sApps: 4.6, sStatus: 3.6 };
  const jump = i => {
    tl.seek(scenes[i].start + (reduce ? (still[scenes[i].id] ?? scenes[i].dur / 2) : 0.001), false);
    if (reduce) { tl.pause(); drawFx(tl.time()); } else if (!playing) play();
  };

  if (exporting) {
    // Frame-by-frame rendering for the film: seek the timeline and every clip, then wait for the frames.
    document.documentElement.classList.add('filming');
    const ready = Promise.all(clips.map(c => c.v.readyState >= 3 ? 0 : new Promise(res => {
      c.v.addEventListener('canplaythrough', res, { once: true }); c.v.load();
    })));
    window.__reel = {
      duration: TOTAL,
      async seek(t) {
        await ready;
        tl.seek(t, false);
        drawFx(t);
        await Promise.all(clips.map(c => new Promise(res => {
          const inside = t >= c.scene.start && t < c.scene.end + .1;
          const want = inside ? clipTime(c, t) : c.from;
          c.v.pause();
          if (Math.abs(c.v.currentTime - want) < 1e-3) return res();
          c.v.addEventListener('seeked', () => res(), { once: true });
          c.v.currentTime = want;
        })));
      },
    };
    tl.seek(0); setCaption(0);
    return;
  }

  if (reduce) {
    tl.seek(byId('sReview').start + still.sReview, false);
    tl.pause();
    return;
  }

  // Run only while the reel is on screen and the page is visible.
  let onScreen = false;
  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen && !document.hidden) play(); else pause();
  }, { threshold: .25 }).observe(reel);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else if (onScreen) play(); });
  setCaption(0);

  // ---------- The film ----------
  const film = document.getElementById('film');
  const openBtns = [...document.querySelectorAll('.js-film')];
  if (film && openBtns.length) {
    const v = document.getElementById('filmVideo');
    openBtns.forEach(b => b.addEventListener('click', () => {
      const src = v.querySelector('source[data-src]');
      if (src) { src.src = src.dataset.src; src.removeAttribute('data-src'); v.load(); }
      film.classList.add('open'); pause(); v.play().catch(() => {});
    }));
    const close = () => { film.classList.remove('open'); v.pause(); if (onScreen) play(); };
    document.getElementById('filmClose').addEventListener('click', close);
    film.addEventListener('click', e => { if (e.target === film) close(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && film.classList.contains('open')) close(); });
  }
})();
