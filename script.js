(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Theme ---------- */
  var root = document.documentElement;
  try {
    var saved = localStorage.getItem('theme');
    if (saved) root.setAttribute('data-theme', saved);
    else if (window.matchMedia('(prefers-color-scheme: light)').matches) root.setAttribute('data-theme', 'light');
  } catch (e) {}
  $('#theme-toggle').addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  /* ---------- Typed headline ---------- */
  var typed = $('#typed');
  var phrases = ['AI-enabled apps.', 'cloud-native systems.', 'full-stack products.', 'things that ship.'];
  if (reduce) {
    typed.textContent = phrases[0];
  } else {
    var pi = 0, ci = 0, deleting = false;
    (function tick() {
      var word = phrases[pi];
      typed.textContent = word.slice(0, ci);
      var delay = deleting ? 35 : 75;
      if (!deleting && ci === word.length) { deleting = true; delay = 1600; }
      else if (deleting && ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; delay = 350; }
      else ci += deleting ? -1 : 1;
      setTimeout(tick, delay);
    })();
  }

  /* ---------- Reveal on scroll + counters ---------- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.12 }) : null;
  $$('.reveal').forEach(function (el) { io ? io.observe(el) : el.classList.add('in'); });

  $$('[data-count]').forEach(function (el) {
    var target = parseInt(el.dataset.count, 10);
    if (reduce) { el.textContent = target; return; }
    var start = null;
    function step(ts) {
      if (!start) start = ts + 500;
      var t = Math.min(Math.max((ts - start) / 1100, 0), 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });

  /* ---------- Page progress, nav state, cursor glow ---------- */
  var bar = $('#page-progress'), nav = $('#nav');
  var navLinks = $$('.nav nav a');
  var sections = navLinks.map(function (a) { return $(a.getAttribute('href')); });
  function onScroll() {
    var max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? scrollY / max : 0) + ')';
    nav.classList.toggle('scrolled', scrollY > 20);
    var cur = -1;
    sections.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < innerHeight * 0.4) cur = i; });
    navLinks.forEach(function (a, i) { a.classList.toggle('active', i === cur); });
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var glow = $('#cursor-glow');
  if (!reduce) {
    addEventListener('pointermove', function (e) {
      glow.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
    }, { passive: true });
  }

  /* ---------- Magnetic buttons ---------- */
  if (!reduce && matchMedia('(hover: hover)').matches) {
    $$('.magnetic').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.25;
        var y = (e.clientY - r.top - r.height / 2) * 0.35;
        b.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  /* ---------- Card tilt + spotlight ---------- */
  var cards = $$('.card');
  cards.forEach(function (c) {
    c.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      c.style.setProperty('--mx', (px * 100) + '%');
      c.style.setProperty('--my', (py * 100) + '%');
      if (!reduce && e.pointerType === 'mouse') {
        c.style.transform = 'perspective(900px) rotateY(' + ((px - 0.5) * 6) + 'deg) rotateX(' + ((0.5 - py) * 6) + 'deg) translateY(-4px)';
      }
    });
    c.addEventListener('pointerleave', function () { c.style.transform = ''; });
  });

  /* ---------- Horizontal rail ---------- */
  var rail = $('#rail'), fill = $('#rail-fill'), counter = $('#counter');
  var prev = $('#prev'), next = $('#next');
  var total = cards.length, index = 0;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function nearest() {
    var mid = rail.scrollLeft + rail.clientWidth / 2, best = 0, dist = Infinity;
    cards.forEach(function (c, i) {
      var d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
      if (d < dist) { dist = d; best = i; }
    });
    return best;
  }
  function update() {
    var max = rail.scrollWidth - rail.clientWidth;
    fill.style.transform = 'scaleX(' + Math.max(0.06, max > 0 ? rail.scrollLeft / max : 1) + ')';
    index = nearest();
    cards.forEach(function (c, i) { c.classList.toggle('active', i === index); });
    counter.textContent = pad(index + 1) + ' / ' + pad(total);
    prev.disabled = index === 0;
    next.disabled = index === total - 1;
  }
  var pending = null, pendingTimer;
  function go(i) {
    i = Math.max(0, Math.min(total - 1, i));
    var c = cards[i];
    pending = i;
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(function () { pending = null; }, 700);
    rail.scrollTo({ left: c.offsetLeft - (rail.clientWidth - c.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
  }
  function current() { return pending !== null ? pending : index; }
  prev.addEventListener('click', function () { go(current() - 1); });
  next.addEventListener('click', function () { go(current() + 1); });
  rail.addEventListener('scroll', function () { requestAnimationFrame(update); }, { passive: true });
  addEventListener('resize', update);
  rail.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(current() + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(current() - 1); }
  });

  // Mouse drag to scroll (touch already scrolls natively)
  var down = false, startX = 0, startLeft = 0, moved = 0;
  rail.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    down = true; moved = 0; startX = e.clientX; startLeft = rail.scrollLeft;
  });
  addEventListener('pointermove', function (e) {
    if (!down) return;
    moved = e.clientX - startX;
    if (Math.abs(moved) > 5) rail.classList.add('dragging');
    rail.scrollLeft = startLeft - moved;
  });
  addEventListener('pointerup', function () {
    if (!down) return;
    down = false;
    if (rail.classList.contains('dragging')) {
      rail.classList.remove('dragging');
      go(nearest());
    }
  });
  rail.addEventListener('click', function (e) { if (Math.abs(moved) > 5) { e.preventDefault(); moved = 0; } }, true);

  // Vertical wheel stays vertical (page scroll); shift+wheel moves the rail natively.
  update();
  setTimeout(function () { go(0); update(); }, 50);

  /* ---------- Copy email ---------- */
  var copyBtn = $('#copy-email'), emailText = $('#email-text');
  copyBtn.addEventListener('click', function () {
    function done(label) { copyBtn.textContent = label; setTimeout(function () { copyBtn.textContent = 'Copy'; }, 2000); }
    function select() {
      var r = document.createRange(); r.selectNodeContents(emailText);
      var s = getSelection(); s.removeAllRanges(); s.addRange(r); done('Selected');
    }
    try { navigator.clipboard.writeText(emailText.textContent.trim()).then(function () { done('Copied'); }, select); }
    catch (e) { select(); }
  });


  /* ---------- Do not click ---------- */
  var dnc = $('#dnc');
  var toastEl = document.createElement('div');
  toastEl.className = 'toast'; toastEl.setAttribute('role', 'status');
  document.body.appendChild(toastEl);
  var toastTimer;
  function toast(msg, ms) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 3200);
  }
  var clicks = 0, dodges = 0, busy = false;
  var labels = ['Do not click', 'I said do not click', 'Seriously, stop', 'Last warning', 'Okay, you win'];

  // 1. "Delete System32" prank: fake command prompt, black screen, "gotchu"
  var sysFiles = ['ntoskrnl.exe', 'kernel32.dll', 'user32.dll', 'hal.dll', 'winlogon.exe', 'explorer.exe', 'drivers\\disk.sys', 'config\\SYSTEM', 'cmd.exe', 'notepad.exe', 'msvcrt.dll', 'tcpip.sys', 'ntdll.dll', 'svchost.exe', 'drivers\\ntfs.sys', 'shell32.dll', 'lsass.exe', 'wininit.exe'];
  function sysDemo(done) {
    var wrap = document.createElement('div');
    wrap.className = 'term-wrap';
    wrap.innerHTML = '<div class="term" role="dialog" aria-label="Command prompt"><div class="term-bar"><i></i><i></i><i></i><span>Administrator: Command Prompt</span></div><div class="term-body" id="sys-body"></div></div>';
    document.body.appendChild(wrap);
    var body = wrap.querySelector('#sys-body');
    var alive = true, timers = [], black = null;
    function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); }
    function finish() {
      if (!alive) return; alive = false;
      timers.forEach(clearTimeout);
      wrap.remove();
      if (black) { var bl = black; bl.classList.add('out'); setTimeout(function () { bl.remove(); }, 600); }
      document.removeEventListener('keydown', onKey);
      done && done();
    }
    function onKey(e) { if (e.key === 'Escape') finish(); }
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', finish);

    var cmd = 'C:\\> del /f /s /q C:\\Windows\\System32\\*';
    var line = document.createElement('div'); line.className = 'cmd'; body.appendChild(line);
    var i = 0;
    (function type() {
      if (!alive) return;
      i = reduce ? cmd.length : i + 1;
      line.textContent = cmd.slice(0, i);
      if (i < cmd.length) return later(type, 45);
      later(spill, 500);
    })();

    var n = 0;
    function spill() {
      if (!alive) return;
      var d = document.createElement('div');
      d.className = n % 7 === 6 ? 'err' : 'dim';
      d.textContent = (n % 7 === 6 ? 'Access is denied, continuing anyway: ' : 'Deleted file - C:\\Windows\\System32\\') + sysFiles[n % sysFiles.length];
      body.appendChild(d);
      body.scrollTop = body.scrollHeight;
      n++;
      if (n < (reduce ? 8 : 26)) later(spill, 70);
      else later(blackout, 400);
    }

    function blackout() {
      if (!alive) return;
      black = document.createElement('div');
      black.className = 'blackout';
      black.innerHTML = '<div class="blackout-text" id="gotchu"></div>';
      black.addEventListener('click', finish);
      document.body.appendChild(black);
      wrap.remove();
      later(function () {
        var t = black.querySelector('#gotchu');
        t.innerHTML = 'gotchu<span class="blackout-sub">Your files are fine. This is just a website. 😎</span>';
        t.classList.add('show');
        later(finish, 3800);
      }, reduce ? 300 : 1900);
    }
  }

  // 2. Bug squash
  function bugSquash(done) {
    var n = 8, left = n, bugs = [];
    toast('Bugs found in production. Squash them.', 3000);
    for (var i = 0; i < n; i++) {
      (function () {
        var b = document.createElement('div');
        b.className = 'bug'; b.textContent = '🐛'; b.setAttribute('role', 'button'); b.setAttribute('aria-label', 'Squash bug');
        var w = innerWidth - 50, h = innerHeight - 50;
        var x1 = Math.random() * w, y1 = Math.random() * h, x2 = Math.random() * w, y2 = Math.random() * h;
        b.style.transform = 'translate(' + x1 + 'px,' + y1 + 'px)';
        document.body.appendChild(b); bugs.push(b);
        if (b.animate && !reduce) {
          b.animate([
            { transform: 'translate(' + x1 + 'px,' + y1 + 'px) rotate(0deg)' },
            { transform: 'translate(' + x2 + 'px,' + y2 + 'px) rotate(180deg)' }
          ], { duration: 2200 + Math.random() * 2500, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
        }
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          if (b.classList.contains('dead')) return;
          b.classList.add('dead'); b.textContent = '💥';
          setTimeout(function () { b.remove(); }, 500);
          if (--left === 0) { toast('0 bugs remaining. Deployed on a Friday. 🚀', 3600); rainEmoji(['🚀', '✨', '🎉'], 26); finish(); }
        });
      })();
    }
    var timer = setTimeout(function () {
      bugs.forEach(function (b) { b.remove(); });
      if (left > 0) toast("They got away. That's how production works.", 3200);
      finish();
    }, 15000);
    function finish() { clearTimeout(timer); done && done(); }
  }

  // 3. Disco mode
  function disco(done) {
    toast('Disco mode. Productivity at an all-time high. 🪩', 4200);
    rainEmoji(['🪩', '🎶', '💃', '🕺'], 24);
    if (!reduce) {
      document.body.classList.add('disco');
      document.body.classList.add('shake');
      setTimeout(function () { document.body.classList.remove('shake'); }, 600);
    }
    setTimeout(function () { document.body.classList.remove('disco'); done && done(); }, 4200);
  }
  function rainEmoji(set, count) {
    if (reduce) return;
    for (var i = 0; i < count; i++) {
      (function (i) {
        setTimeout(function () {
          var e = document.createElement('div');
          e.className = 'rain'; e.textContent = set[i % set.length];
          e.style.left = Math.random() * 100 + 'vw';
          e.style.animationDuration = 2 + Math.random() * 2.5 + 's';
          document.body.appendChild(e);
          setTimeout(function () { e.remove(); }, 5000);
        }, i * 90);
      })(i);
    }
  }

  // 4. Dodging button
  function dodge() {
    if (dodges >= 6) return;
    dodges++;
    var x = (Math.random() - 0.5) * Math.min(420, innerWidth - 120);
    var y = -30 - Math.random() * 90;
    dnc.classList.add('dodging');
    dnc.style.transform = 'translate(' + x + 'px,' + y + 'px) rotate(' + ((Math.random() - 0.5) * 30) + 'deg)';
    dnc.textContent = ['Too slow', 'Nope', 'Missed me', 'Over here', 'Almost', 'Fine.'][dodges - 1];
    if (dodges >= 6) {
      setTimeout(function () { dnc.style.transform = ''; dnc.textContent = 'Fine. Click me.'; toast('Okay okay, you earned it.', 2600); }, 700);
    }
  }
  dnc.addEventListener('pointerenter', function (e) {
    if (e.pointerType === 'mouse' && stage() === 3 && dodges < 6 && !busy) dodge();
  });

  function stage() { return clicks % 4; }
  function setLabel() { dnc.textContent = labels[Math.min(clicks, labels.length - 1)]; }

  dnc.addEventListener('click', function () {
    if (busy) return;
    if (stage() === 3 && dodges < 6) { dodge(); return; }
    var s = stage();
    clicks++; busy = true;
    var release = function () { busy = false; if (stage() === 3) dodges = 0; setLabel(); };
    if (s === 0) sysDemo(release);
    else if (s === 1) bugSquash(release);
    else if (s === 2) disco(release);
    else { dodges = 0; busy = false; toast('You clicked it. Of course you did. Thanks for visiting. 👋', 3600); rainEmoji(['👋', '💙'], 16); setLabel(); }
  });

  $('#year').textContent = new Date().getFullYear();
})();
