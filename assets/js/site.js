// Gon landing page: reveals, the hero's live scan, the review list, the disk answer, task orbit, live metrics,
// sparkles, and videos that only play while on screen.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = (n, d = 1) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

  // ---------- Nav ----------
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 12);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- Headline ----------
  requestAnimationFrame(() => document.body.classList.add('ready'));

  // ---------- Reveal on scroll ----------
  const once = (els, fn, opts = { threshold: .18, rootMargin: '0px 0px -8% 0px' }) => {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { fn(e.target); io.unobserve(e.target); }
    }), opts);
    els.forEach(el => io.observe(el));
  };
  once($$('.reveal'), el => el.classList.add('in'), { threshold: .12, rootMargin: '0px 0px -6% 0px' });

  // ---------- Count-up numbers ----------
  const countUp = (el, to, { decimals = 1, duration = 1400, suffix = '' } = {}) => {
    if (reduce) { el.textContent = fmt(to, decimals) + suffix; return; }
    const start = performance.now();
    const step = t => {
      const p = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(to * e, decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  once($$('[data-count]'), el => countUp(el, parseFloat(el.dataset.count), { decimals: +el.dataset.decimals }));

  // ---------- Videos: load when near, play only while visible ----------
  const videos = $$('video.lazy-video');
  if (!reduce) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      const v = e.target;
      if (e.isIntersecting) {
        const s = v.querySelector('source[data-src]');
        if (s) { s.src = s.dataset.src; s.removeAttribute('data-src'); v.load(); }
        v.play().catch(() => {});
      } else if (!v.paused) v.pause();
    }), { rootMargin: '200px 0px' });
    videos.forEach(v => io.observe(v));
  }

  // ---------- Hero: tilt the window flat as it scrolls into view ----------
  const win = $('#heroWindow');
  const icon = $('#heroIcon');
  if (win && !reduce) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = win.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, 1 - (r.top - innerHeight * .25) / (innerHeight * .6)));
      win.style.setProperty('--tilt', `${14 * (1 - p)}deg`);
      win.style.setProperty('--lift', `${30 * (1 - p)}px`);
      win.style.setProperty('--zoom', `${.96 + .04 * p}`);
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
    addEventListener('pointermove', e => {
      const x = (e.clientX / innerWidth - .5), y = (e.clientY / innerHeight - .5);
      icon.style.transform = `rotateY(${x * 18}deg) rotateX(${-y * 18}deg) translateZ(0)`;
    }, { passive: true });
  }

  // ---------- Hero: the panel reads the recorded scan, so its numbers match the orb ----------
  // The movie is one 8 s cycle of the app's simulated scan (0 → 24.5 GB), recorded starting at 5.28 GB.
  const CYCLE = 8, TOTAL = 24.5, START = 5.28 / 24.5;
  const phases = [
    { title: 'App caches', path: '~/Library/Caches', chip: 'App Caches', gb: 4.8 },
    { title: 'Browsers', path: '~/Library/Caches/com.apple.Safari', chip: 'Browsers', gb: 1.6 },
    { title: 'Developer tools', path: '~/Library/Developer/Xcode/DerivedData', chip: 'Developer', gb: 12.4 },
    { title: 'Logs & crash reports', path: '~/Library/Logs', chip: 'Logs', gb: 0.6 },
    { title: 'Trash & Downloads', path: '~/Downloads', chip: 'Old installers', gb: 5.1 },
  ];
  const num = $('#foundNum'), bar = $('#foundBar'), chips = $('#chips');
  const title = $('#scanTitle'), path = $('#scanPath'), hv = $('#heroVideo');
  const showFound = found => {
    num.textContent = fmt(found);
    bar.style.width = `${(found / TOTAL) * 100}%`;
    let acc = 0, shown = 0;
    for (const [k, ph] of phases.entries()) {
      if (found <= acc && k > 0) break;
      const part = Math.min(ph.gb, Math.max(0, found - acc));
      let chip = chips.children[k];
      if (!chip) {
        chip = document.createElement('span');
        chip.className = 'chip';
        chip.innerHTML = `${ph.chip} · <b></b>`;
        chips.appendChild(chip);
      }
      chip.querySelector('b').textContent = fmt(part) + ' GB';
      title.textContent = ph.title;
      path.textContent = ph.path;
      acc += ph.gb; shown = k + 1;
    }
    while (chips.children.length > shown) chips.lastChild.remove();
  };
  if (num) {
    if (reduce || !hv) showFound(TOTAL);
    else {
      showFound(TOTAL * START);
      const follow = () => {
        if (!hv.paused && hv.readyState >= 2) showFound(TOTAL * ((START + hv.currentTime / CYCLE) % 1));
        requestAnimationFrame(follow);
      };
      requestAnimationFrame(follow);
    }

    // The page's glow takes the color of the section in view, as each tab in the app has its own.
    const glows = {
      cyan: ['rgba(45,212,191,.55)', 'rgba(91,140,255,.45)', 'rgba(34,211,238,.35)'],
      violet: ['rgba(192,132,252,.5)', 'rgba(99,102,241,.45)', 'rgba(232,121,249,.32)'],
      blue: ['rgba(99,102,241,.5)', 'rgba(56,189,248,.42)', 'rgba(167,139,250,.32)'],
      orange: ['rgba(251,113,133,.46)', 'rgba(251,191,36,.36)', 'rgba(251,146,60,.32)'],
      green: ['rgba(52,211,153,.48)', 'rgba(163,230,53,.32)', 'rgba(45,212,191,.3)'],
      pink: ['rgba(232,121,249,.46)', 'rgba(99,102,241,.4)', 'rgba(251,113,133,.32)'],
      emerald: ['rgba(52,211,153,.42)', 'rgba(45,212,191,.36)', 'rgba(56,189,248,.28)'],
    };
    const bySection = { clean: 'cyan', analyze: 'orange', apps: 'blue', optimize: 'green', status: 'pink',
                        safety: 'emerald', assistant: 'violet', download: 'cyan', tour: 'blue' };
    const aurora = $$('.aurora span');
    const paint = name => aurora.forEach((a, k) => a.style.setProperty('--c', glows[name][k]));
    const watch = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) paint(bySection[e.target.id] || 'cyan');
    }), { rootMargin: '-45% 0px -45% 0px' });
    $$('section[id]').forEach(s => watch.observe(s));
    watch.observe($('.hero'));
  }

  // ---------- Clean: rows arrive, Safe ones tick, totals count ----------
  const rows = $('#reviewRows');
  if (rows) once([rows], el => {
    el.classList.add('in');
    const list = $$('.row', el);
    list.forEach((r, k) => { r.style.transitionDelay = `${k * 90}ms`; });
    const all = list.reduce((a, r) => a + parseFloat(r.dataset.gb || 0), 0);
    countUp($('#cleanTotal'), all, { duration: 1600 });
    let selected = 0;
    const sel = $('#trashSel');
    sel.textContent = '0.0 GB';
    list.filter(r => r.dataset.tick).forEach((r, k) => {
      setTimeout(() => {
        $('.check', r).classList.add('on');
        const from = selected;
        selected += parseFloat(r.dataset.gb);
        const to = selected, t0 = performance.now();
        const step = t => {
          const p = Math.min(1, (t - t0) / 500);
          sel.textContent = fmt(from + (to - from) * p) + ' GB';
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }, reduce ? 0 : 700 + k * 260);
    });
    // Clicking a Review row ticks it, as in the app.
    list.filter(r => !r.dataset.tick && parseFloat(r.dataset.gb) > 0).forEach(r => {
      r.style.cursor = 'pointer';
      r.addEventListener('click', () => {
        const c = $('.check', r), on = c.classList.toggle('on');
        selected += (on ? 1 : -1) * parseFloat(r.dataset.gb);
        sel.textContent = fmt(Math.max(0, selected)) + ' GB';
      });
    });
  }, { threshold: .3 });

  // ---------- Analyze: the disk answer types itself in ----------
  const card = $('#diskCard');
  if (card) once([card], () => {
    const sum = $('#dcSum');
    const text = 'Most of the space is in your home folder: Docker’s disk image and old project build folders.';
    const items = $$('#dcList li');
    if (reduce) { sum.textContent = text; items.forEach(li => li.classList.add('in')); return; }
    let n = 0;
    sum.textContent = '';
    const caret = document.createElement('span');
    caret.className = 'caret';
    const type = () => {
      sum.textContent = text.slice(0, n);
      sum.appendChild(caret);
      if (n++ < text.length) setTimeout(type, 18 + Math.random() * 26);
      else { caret.remove(); items.forEach((li, k) => setTimeout(() => li.classList.add('in'), 220 + k * 260)); }
    };
    setTimeout(type, 500);
  }, { threshold: .4 });

  // ---------- Optimize: tasks take their turn ----------
  const tasks = $$('#tasks .task');
  if (tasks.length) once([$('#tasks')], () => {
    const results = ['Done', 'Skipped · Mail is open', 'Done', 'Done', 'Done', 'Done', 'Done'];
    let k = 0;
    const run = () => {
      if (k === tasks.length) {
        setTimeout(() => { tasks.forEach(t => { t.className = 'task'; $('.st', t).textContent = 'Waiting'; }); k = 0; run(); }, 3500);
        return;
      }
      const t = tasks[k];
      t.classList.add('run');
      $('.st', t).textContent = 'Running…';
      setTimeout(() => {
        t.classList.remove('run');
        t.classList.add(results[k].startsWith('Skipped') ? 'skip' : 'done');
        $('.st', t).textContent = results[k];
        k++;
        run();
      }, reduce ? 0 : 1100);
    };
    run();
  }, { threshold: .4 });

  // ---------- Status: live-looking metrics ----------
  const spark = (id, n = 30) => {
    const el = document.getElementById(id);
    if (!el) return null;
    const pts = Array.from({ length: n }, () => .3 + Math.random() * .3);
    const draw = () => {
      el.setAttribute('d', pts.map((v, i) => `${i ? 'L' : 'M'}${(i / (n - 1)) * 100},${34 - v * 30}`).join(' '));
    };
    draw();
    return v => { pts.shift(); pts.push(v); draw(); };
  };
  const cpu = spark('sCpu'), mem = spark('sMem'), net = spark('sNet');
  let c = .2, m = .55, w = .3;
  const clock = $('#clock');
  const tick = () => {
    c = Math.min(.95, Math.max(.05, c + (Math.random() - .5) * .18));
    m = Math.min(.8, Math.max(.45, m + (Math.random() - .5) * .04));
    w = Math.min(.95, Math.max(.02, w + (Math.random() - .5) * .3));
    cpu?.(c); mem?.(m); net?.(w);
    $('#mCpu') && ($('#mCpu').textContent = `${Math.round(c * 100)}%`);
    $('#mMem') && ($('#mMem').textContent = `${fmt(m * 20)} GB`);
    $('#mNet') && ($('#mNet').textContent = `${fmt(w * 6)} MB/s`);
    const ps = [$('#p1'), $('#p2'), $('#p3')];
    if (ps[0]) [Math.round(c * 60), Math.round(c * 22 + 3), Math.round(6 + Math.random() * 5)].forEach((v, i) => { ps[i].textContent = `${v}%`; });
    const d = new Date();
    if (clock) clock.textContent = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  tick();
  if (!reduce) setInterval(tick, 1100);

  // ---------- Cards: glow follows the pointer ----------
  $$('.card').forEach(el => el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  }));

  // ---------- Sparkles: Gon's four-point shine, twinkling slowly ----------
  const canvas = $('#sparkles');
  if (canvas && !reduce) {
    const ctx = canvas.getContext('2d');
    let W, H, dpr, stars = [];
    const resize = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      W = canvas.width = innerWidth * dpr; H = canvas.height = innerHeight * dpr;
      canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px';
      const n = Math.round((innerWidth * innerHeight) / 70000);
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H, r: (1.5 + Math.random() * 3.5) * dpr,
        p: Math.random() * Math.PI * 2, s: .4 + Math.random() * .9, v: (.04 + Math.random() * .12) * dpr,
      }));
    };
    const shine = (x, y, r, a) => {
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.moveTo(x, y - r * 2);
      ctx.quadraticCurveTo(x, y, x + r * 2, y);
      ctx.quadraticCurveTo(x, y, x, y + r * 2);
      ctx.quadraticCurveTo(x, y, x - r * 2, y);
      ctx.quadraticCurveTo(x, y, x, y - r * 2);
      ctx.fill();
    };
    let last = 0, visible = true;
    document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) requestAnimationFrame(frame); });
    const frame = t => {
      if (!visible) return;
      if (t - last > 33) {
        last = t;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#bff8ff';
        for (const s of stars) {
          s.y -= s.v; if (s.y < -10) { s.y = H + 10; s.x = Math.random() * W; }
          const a = Math.max(0, Math.sin(t / 1000 * s.s + s.p)) * .32;
          if (a > .02) shine(s.x, s.y, s.r, a);
        }
      }
      requestAnimationFrame(frame);
    };
    addEventListener('resize', resize);
    resize();
    requestAnimationFrame(frame);
  }

  // ---------- Download: point at the latest release's disk image ----------
  fetch('https://api.github.com/repos/caalabs/gon-app/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(rel => {
      const dmg = (rel.assets || []).find(a => a.name.endsWith('.dmg'));
      const version = (rel.tag_name || '').replace(/^v/, '');
      if (dmg) $$('.js-download').forEach(a => { a.href = dmg.browser_download_url; });
      if (version) {
        const mb = dmg ? ` · ${Math.round(dmg.size / 1e6)} MB` : '';
        $$('.js-version').forEach(el => { el.textContent = `Free · Version ${version}${mb}`; });
        $$('.js-download-label').forEach(el => { el.textContent = `Download Gon ${version}`; });
      }
    })
    .catch(() => {});
})();
