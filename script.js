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

  /* ---------- Mobile menu ---------- */
  (function () {
    var header = $('#nav'), btn = $('#menu-toggle');
    function setOpen(open) {
      header.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    btn.addEventListener('click', function () { setOpen(!header.classList.contains('open')); });
    $$('.nav nav a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    document.addEventListener('click', function (e) { if (!header.contains(e.target)) setOpen(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 720) setOpen(false); });
  })();

  /* ---------- Typed headline ---------- */
  var typed = $('#typed');
  var phrases = ['AI-enabled apps.', 'cloud-native systems.', 'full-stack products.', 'things that ship.'];
  // Keep the whole typed line on one row: shrink its font size just enough for the longest phrase to fit.
  var typedLine = typed.parentNode, heroH1 = typedLine.parentNode;
  function fitTypedLine() {
    typedLine.style.fontSize = '';
    var probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:-9999px;top:0;font:inherit;letter-spacing:inherit';
    typedLine.appendChild(probe);
    var widest = 0;
    phrases.forEach(function (p) { probe.textContent = 'I build ' + p; widest = Math.max(widest, probe.getBoundingClientRect().width); });
    typedLine.removeChild(probe);
    var caretW = 14;
    var avail = heroH1.clientWidth;
    if (widest + caretW > avail) typedLine.style.fontSize = (Math.floor((avail / (widest + caretW)) * 1000) / 1000) + 'em';
  }
  typedLine.style.whiteSpace = 'nowrap';
  fitTypedLine();
  window.addEventListener('resize', fitTypedLine);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTypedLine);
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

  function animateCount(el, delay) {
    var target = parseInt(el.dataset.count, 10);
    var pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    function fmt(v) { return pre + v.toLocaleString('en-US') + suf; }
    if (reduce) { el.textContent = fmt(target); return; }
    var start = null;
    function step(ts) {
      if (!start) start = ts + (delay || 0);
      var t = Math.min(Math.max((ts - start) / 1100, 0), 1);
      el.textContent = fmt(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  $$('.stats [data-count]').forEach(function (el) { animateCount(el, 500); });

  /* ---------- LeetCode stats ----------
     1. Live numbers come from the community API leetcode-stats.tashif.codes, fetched in the visitor's browser.
     2. leetcode-stats.json (refreshed daily by a GitHub Action) is the fallback and also supplies the global rank.
     3. If both fail, the figures written in the HTML are used. */
  var LC_USER = 'akshatmaheshwar78';
  var LC_API = 'https://leetcode-stats.tashif.codes/' + LC_USER;
  var lcTiles = $$('.lc-tile strong');
  function getJSON(url, ms) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, ms) : null;
    return fetch(url, ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { if (!r.ok) throw new Error('bad status'); return r.json(); })
      .then(function (j) { if (timer) clearTimeout(timer); return j; }, function (e) { if (timer) clearTimeout(timer); throw e; });
  }
  function liveStats() {
    return Promise.all([getJSON(LC_API + '/stats', 6000), getJSON(LC_API + '/contests', 6000)]).then(function (r) {
      var s = r[0] && r[0].data, c = r[1] && r[1].data;
      if (!s || typeof s.totalSolved !== 'number') throw new Error('no data');
      var out = { live: true, solved: s.totalSolved };
      if (s.byDifficulty) { out.easy = s.byDifficulty.easy; out.medium = s.byDifficulty.medium; out.hard = s.byDifficulty.hard; }
      if (c && typeof c.rating === 'number' && c.rating > 0) {
        out.rating = c.rating; out.contests = c.count;
        out.topPercentage = c.topPercentage; out.globalRanking = c.globalRanking;
        if (typeof c.maxRating === 'number' && c.maxRating > 0) out.maxRating = c.maxRating;
      }
      if (c && Array.isArray(c.history)) {
        c.history.forEach(function (h) {
          if (h && typeof h.ranking === 'number' && h.ranking > 0 && (!out.bestRank || h.ranking < out.bestRank)) { out.bestRank = h.ranking; out.bestName = h.name; }
        });
      }
      var rk = [s.ranking, s.profile && s.profile.ranking, r[0].ranking, r[0].data && r[0].data.ranking].filter(function (v) { return typeof v === 'number' && v > 0; })[0];
      if (rk) out.ranking = rk;
      return out;
    });
  }
  function loadLeetCode() {
    var live = liveStats().catch(function () { return null; });
    var file = getJSON('leetcode-stats.json', 4000).catch(function () { return null; });
    return Promise.all([live, file]).then(function (r) {
      var d = {}, k;
      for (k in (r[1] || {})) d[k] = r[1][k];
      for (k in (r[0] || {})) d[k] = r[0][k];
      var set = function (i, v, suffix) {
        if (typeof v !== 'number' || !isFinite(v) || !lcTiles[i]) return;
        lcTiles[i].dataset.count = Math.round(v);
        if (suffix !== undefined) lcTiles[i].dataset.suffix = suffix;
      };
      set(0, d.solved, '');
      set(1, d.rating);
      set(2, d.contests);
      set(3, d.topPercentage);
      if (typeof d.ranking === 'number' && d.ranking > 0) {
        set(4, d.ranking);
        var rt = $('#lc-rank-tile'); if (rt) rt.hidden = false;
      }
      var note = $('#lc-updated');
      if (note) {
        if (d.live) { note.textContent = 'Live from LeetCode'; note.hidden = false; }
        else if (d.updated) {
          var when = new Date(d.updated);
          if (!isNaN(when)) {
            note.textContent = 'From LeetCode, updated ' + when.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
            note.hidden = false;
          }
        }
      }
      var mx = $('#lc-max');
      if (mx && typeof d.maxRating === 'number') { mx.textContent = 'peak ' + Math.round(d.maxRating).toLocaleString('en-US'); mx.hidden = false; }
      var best = $('#lc-best');
      if (best) {
        var parts = [];
        if (typeof d.bestRank === 'number') parts.push('Best finish: rank <b>' + d.bestRank.toLocaleString('en-US') + '</b>' + (d.bestName ? ' in ' + String(d.bestName).replace(/</g, '&lt;') : '') + '.');
        if (typeof d.globalRanking === 'number' && d.globalRanking > 0) parts.push('Current contest ranking: <b>' + d.globalRanking.toLocaleString('en-US') + '</b> globally.');
        if (parts.length) best.innerHTML = parts.join(' ');
      }
    });
  }
  var lcReady = loadLeetCode();
  var lcSection = $('#leetcode');
  function runLcCounters() { lcTiles.forEach(function (el, i) { animateCount(el, i * 80); }); }
  if (lcSection && 'IntersectionObserver' in window && !reduce) {
    var lcIo = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      lcIo.disconnect();
      lcReady.then(runLcCounters);
    }, { threshold: 0.25 });
    lcIo.observe(lcSection);
  } else {
    lcReady.then(runLcCounters);
  }

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
    if (max > 0 && max - rail.scrollLeft < 6) index = total - 1;
    if (rail.scrollLeft < 6) index = 0;
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

  // 1. "Delete the system" prank. What the visitor sees matches their operating system:
  //    Windows, macOS and Linux get a terminal running a believable command; phones and tablets get an erase-data screen.
  function detectOS() {
    var forced = (location.search.match(/[?&]os=(mac|windows|linux|ios|android)/) || [])[1];
    if (forced) return forced;
    var ua = navigator.userAgent || '';
    var plat = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    if (/iPhone|iPad|iPod/i.test(ua) || (plat === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
    if (/Android/i.test(ua) || /Android/i.test(plat)) return 'android';
    if (/Win/i.test(plat) || /Windows/i.test(ua)) return 'windows';
    if (/Mac/i.test(plat) || /Mac OS/i.test(ua)) return 'mac';
    // A touch-first Linux browser is Android in "desktop site" mode, not a Linux laptop.
    if (/Linux|X11/i.test(plat + ua) && !/CrOS/i.test(ua) && (navigator.maxTouchPoints > 1 && window.matchMedia && matchMedia('(pointer: coarse)').matches)) return 'android';
    if (/Linux|CrOS|X11/i.test(plat + ua)) return 'linux';
    return 'mac';
  }
  function deviceName() {
    var ua = navigator.userAgent || '', plat = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    if (/iPad/i.test(ua) || (plat === 'MacIntel' && navigator.maxTouchPoints > 1) || /[?&]device=ipad/.test(location.search)) return 'iPad';
    if (/iPod/i.test(ua)) return 'iPod touch';
    return 'iPhone';
  }
  var W = 'Deleted file - C:\\Windows\\System32\\';
  function locked(f) { return 'C:\\Windows\\System32\\' + f + '\nThe process cannot access the file because it is being used by another process.'; }
  var OS = {
    mac: {
      title: 'user \u2014 -zsh \u2014 80\u00d724',
      banner: function () { return ['Last login: ' + lastLogin() + ' on ttys000']; },
      prompt: 'user@MacBook-Pro ~ % ',
      cmd: 'sudo rm -rfv ~/*',
      preamble: ['', 'WARNING: Improper use of the sudo command could lead to data loss', 'or the deletion of important system files. Please double-check your', 'typing when using sudo. Type "man sudo" for more information.', '', 'To proceed, enter your password, or type Ctrl-C to abort.', ''],
      password: 'Password:',
      lines: [
        '/Users/user/Desktop/Screenshot 2026-10-28 at 9.41.07 am.png', '/Users/user/Desktop/notes.txt', '/Users/user/Desktop',
        '/Users/user/Documents/Resume_final_v7.pdf', '/Users/user/Documents/Tax return.xlsx', '/Users/user/Documents/Projects/portfolio/index.html',
        '/Users/user/Documents/Projects/portfolio/styles.css', '/Users/user/Documents/Projects/portfolio', '/Users/user/Documents/Projects', '/Users/user/Documents',
        '/Users/user/Downloads/Installer.dmg', '/Users/user/Downloads/boarding-pass.pdf', '/Users/user/Downloads',
        'rm: /Users/user/Library/Safari: Operation not permitted', 'rm: /Users/user/Library/Mail: Operation not permitted',
        '/Users/user/Library/Preferences/com.apple.finder.plist', '/Users/user/Library/Application Support/Spotify/prefs',
        '/Users/user/Movies/holiday.mov', '/Users/user/Movies',
        '/Users/user/Music/Music/Media.localized/Music/Unknown Artist/Unknown Album/01 Track.m4a', '/Users/user/Music',
        '/Users/user/Pictures/Photos Library.photoslibrary/database/Photos.sqlite', '/Users/user/Pictures/Photos Library.photoslibrary/originals/0/0A1B2C3D.heic',
        '/Users/user/Pictures/Photos Library.photoslibrary', '/Users/user/Pictures',
        '/Users/user/Public/Drop Box', '/Users/user/Public', '/Users/user/Applications'
      ]
    },
    windows: {
      title: 'Command Prompt',
      banner: function () { return ['Microsoft Windows [Version 10.0.22631.4460]', '(c) Microsoft Corporation. All rights reserved.', '']; },
      prompt: 'C:\\Windows\\system32>',
      cmd: 'del /f /s /q C:\\Windows\\System32\\*.*',
      password: null,
      lines: [
        W + 'aadauthhelper.dll', W + 'accessibilitycpl.dll', W + 'advapi32.dll', W + 'bcrypt.dll', locked('cmd.exe'), W + 'combase.dll', W + 'crypt32.dll',
        locked('dwm.exe'), W + 'imm32.dll', W + 'kernel32.dll', W + 'KernelBase.dll', locked('lsass.exe'), W + 'msvcrt.dll', W + 'notepad.exe', W + 'ntdll.dll',
        locked('ntoskrnl.exe'), W + 'ole32.dll', W + 'rpcrt4.dll', W + 'shell32.dll', locked('svchost.exe'), W + 'user32.dll', W + 'win32k.sys', locked('winlogon.exe'),
        W + 'wininit.exe', W + 'drivers\\disk.sys', W + 'drivers\\ntfs.sys', W + 'drivers\\tcpip.sys', W + 'config\\SYSTEM', W + 'config\\SOFTWARE', W + 'en-US\\kernel32.dll.mui'
      ]
    },
    linux: {
      title: 'user@ubuntu: ~',
      banner: function () { return []; },
      prompt: 'user@ubuntu:~$ ',
      cmd: 'sudo rm -rfv --no-preserve-root /',
      password: '[sudo] password for user: ',
      lines: [
        "removed '/boot/vmlinuz-6.8.0-45-generic'", "removed '/boot/initrd.img-6.8.0-45-generic'", "rm: cannot remove '/boot/efi': Device or resource busy",
        "removed '/etc/passwd'", "removed '/etc/fstab'", "removed '/etc/hosts'", "removed '/etc/ssh/sshd_config'", "removed directory '/etc/ssh'",
        "removed '/usr/bin/python3'", "removed '/usr/bin/sudo'", "removed '/usr/bin/apt'", "removed '/usr/bin/gnome-shell'", "removed directory '/usr/bin'",
        "removed '/usr/lib/x86_64-linux-gnu/libc.so.6'", "removed directory '/usr/lib/x86_64-linux-gnu'", "removed '/bin/bash'", "removed '/sbin/init'",
        "rm: cannot remove '/sys/kernel/security': Operation not permitted", "removed '/lib/systemd/systemd'", "removed directory '/lib/systemd'",
        "removed '/var/log/syslog'", "removed '/var/log/auth.log'", "removed directory '/var/log'", "removed '/home/user/.bashrc'", "removed '/home/user/Documents/notes.txt'",
        "removed directory '/home/user/Documents'", "removed directory '/home/user'", "removed directory '/home'"
      ]
    }
  };
  function lastLogin() {
    var d = new Date(), days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], mons = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return days[d.getDay()] + ' ' + mons[d.getMonth()] + ' ' + d.getDate() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  function mobileMarkup(os) {
    if (os === 'ios') {
      return '<div class="mob ios"><div class="mob-dim"></div>' +
        '<div class="ios-sheet"><div class="ios-group"><p>This will delete all media and data, and reset all settings.</p>' +
        '<button type="button" class="ios-erase" tabindex="-1">Erase ' + deviceName() + '<i class="tap"></i></button></div>' +
        '<div class="ios-cancel">Cancel</div></div>' +
        '<div class="mob-erase"><div class="ios-bar"><b></b></div></div></div>';
    }
    return '<div class="mob android"><div class="mob-dim"></div>' +
      '<div class="and-dialog" role="alertdialog"><h4>Erase all data?</h4><p>All your personal information and downloaded apps will be deleted. You can\u2019t undo this action.</p>' +
      '<div class="and-btns"><span>Cancel</span><button type="button" class="and-erase" tabindex="-1">Erase all data<i class="tap"></i></button></div></div>' +
      '<div class="mob-erase"><div class="and-spin"></div><p>Erasing\u2026</p></div></div>';
  }

  function sysDemo(done) {
    var os = detectOS(), cfg = OS[os], mobile = (os === 'ios' || os === 'android');
    var wrap = document.createElement('div');
    wrap.className = (mobile ? 'mob-wrap ' : 'term-wrap ') + 'pending';
    if (mobile) {
      wrap.innerHTML = mobileMarkup(os);
    } else {
      var bar = os === 'windows'
        ? '<div class="term-bar"><b class="win-icon">C:\\</b><span>Administrator: ' + cfg.title + '</span><u class="win-ctl"><em>\u2013</em><em>\u25a1</em><em>\u2715</em></u></div>'
        : '<div class="term-bar"><i></i><i></i><i></i><span>' + cfg.title + '</span></div>';
      wrap.innerHTML = '<div class="term ' + os + '" role="dialog" aria-label="Terminal">' + bar + '<div class="term-body" id="sys-body"></div></div>';
    }
    document.body.appendChild(wrap);
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
    // Clicking the terminal or the erase warning does nothing; it plays through (Esc still closes it).
    wrap.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); });

    var START = reduce ? 0 : 1500, OPEN = reduce ? 0 : 450;
    later(function () { wrap.classList.remove('pending'); }, START);

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
        t.innerHTML = 'gotcha<span class="blackout-sub">Your files are fine. This is just a website. \ud83d\ude02</span>';
        t.classList.add('show');
        later(finish, 3800);
      }, reduce ? 300 : 1900);
    }

    if (mobile) {
      // Sheet appears, a finger "taps" the erase button, then the erasing screen runs.
      var press = wrap.querySelector(os === 'ios' ? '.ios-erase' : '.and-erase');
      later(function () { press.classList.add('pressed'); }, START + (reduce ? 100 : 1700));
      later(function () { wrap.classList.add('erasing'); }, START + (reduce ? 200 : 2100));
      later(blackout, START + (reduce ? 500 : 2100 + 4600));
      return;
    }

    var body = wrap.querySelector('#sys-body');
    var caret = document.createElement('span'); caret.className = 'mac-caret';
    function addLine(text, cls) {
      var d = document.createElement('div'); if (cls) d.className = cls;
      d.textContent = text; body.appendChild(d);
      body.scrollTop = body.scrollHeight;
      return d;
    }
    function park(el) { el.appendChild(caret); body.scrollTop = body.scrollHeight; }

    var cmd = cfg.cmd, line;
    later(function () {
      cfg.banner().forEach(function (t) { addLine(t || '\u00a0'); });
      line = addLine(cfg.prompt); park(line);
      var i = 0;
      (function type() {
        if (!alive) return;
        i = reduce ? cmd.length : i + 1;
        line.textContent = cfg.prompt + cmd.slice(0, i); park(line);
        if (i < cmd.length) return later(type, 55 + Math.random() * 40);
        later(afterEnter, 450);
      })();
    }, START + OPEN);

    function afterEnter() {
      if (!alive) return;
      (cfg.preamble || []).forEach(function (t) { addLine(t || '\u00a0'); });
      if (cfg.password) { var pw = addLine(cfg.password); park(pw); later(spill, reduce ? 200 : 1500); }
      else later(spill, reduce ? 100 : 500);
    }

    var n = 0, total = reduce ? 8 : cfg.lines.length;
    function spill() {
      if (!alive) return;
      addLine(cfg.lines[n]);
      n++;
      park(body.lastChild);
      if (n < total) later(spill, 70 + (n % 4) * 25);
      else later(blackout, 600);
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
    else { dodges = 0; busy = false; toast('You clicked it. Of course you did. Thanks for visiting. 👋', 3600); rainEmoji(['👋', '💙'], 16); setLabel(); dnc.disabled = true; dnc.setAttribute('aria-disabled', 'true'); }
  });

  $('#year').textContent = new Date().getFullYear();
})();
