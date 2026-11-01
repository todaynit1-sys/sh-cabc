/* 재단법인 맑고푸른곶 — 단독 HTML 버전 모션
   React 컴포넌트(Header · NetCanvas · Film · Story · AxisFlow · SiteEffects)와 같은 동작을
   미리 그려진 마크업 위에서 순수 JS로 수행한다. 장면·카메라 값은 #cabc-motion JSON에서 읽는다. */
(function () {
  "use strict";
  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var REDUCE = !!(mq && mq.matches);
  var root = document.documentElement;
  var cfgEl = document.getElementById("cabc-motion");
  var CFG = cfgEl ? JSON.parse(cfgEl.textContent) : { film: [], story: [] };
  var hd = document.querySelector(".hd");

  function hdH() { return hd ? hd.offsetHeight : 58; }
  function camStr(c) { return "translate(" + c[0] + "px," + c[1] + "px) scale(" + c[2] + ")"; }
  function pad(n) { return ("0" + n).slice(-2); }
  function onVisible(el, cb, th) {
    if (!("IntersectionObserver" in window)) { cb(true); return; }
    new IntersectionObserver(function (es) { es.forEach(function (e) { cb(e.isIntersecting); }); }, { threshold: th || 0.05 }).observe(el);
  }
  function restart(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

  /* ---------------- 1. 헤더 ---------------- */
  function setHd() { root.style.setProperty("--hd-h", hdH() + "px"); }
  setHd();
  window.addEventListener("resize", setHd);
  if (hd) {
    var onScrollHd = function () { hd.classList.toggle("is-scrolled", window.scrollY > 6); };
    onScrollHd();
    window.addEventListener("scroll", onScrollHd, { passive: true });
  }
  var burger = document.querySelector(".burger");
  var drawer = document.getElementById("drawer");
  if (burger && drawer) {
    var setDrawer = function (open) {
      drawer.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
    };
    burger.addEventListener("click", function () { setDrawer(!drawer.classList.contains("open")); });
    drawer.querySelectorAll('a[href^="#"]').forEach(function (a) { a.addEventListener("click", function () { setDrawer(false); }); });
  }

  /* ---------------- 2. 입자망 배경 ---------------- */
  function net(cv, line, dot, rise) {
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext("2d"), pts = [], W = 0, H = 0, on = true, raf = 0;
    var draw = function () {
      ctx.clearRect(0, 0, W, H);
      var D = Math.min(150, W / 6.5), D2 = D * D;
      for (var i = 0; i < pts.length; i++) {
        var a = pts[i];
        for (var j = i + 1; j < pts.length; j++) {
          var b = pts[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < D2) {
            ctx.strokeStyle = "rgba(" + line + "," + (0.16 * (1 - d2 / D2)).toFixed(3) + ")";
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      ctx.fillStyle = dot;
      for (var k = 0; k < pts.length; k++) { var p = pts[k]; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
    };
    var resize = function () {
      var r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(64, Math.max(26, (W * H) / 16000)));
      pts = [];
      for (var i = 0; i < n; i++) pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22 - rise, r: Math.random() * 1.6 + 0.8 });
      draw();
    };
    var tick = function () {
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i]; p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20; if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
      }
      draw(); raf = requestAnimationFrame(tick);
    };
    resize();
    var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(resize, 150); });
    if (!REDUCE) {
      var go = function () { cancelAnimationFrame(raf); if (!document.hidden && on) raf = requestAnimationFrame(tick); };
      onVisible(cv, function (v) { on = v; go(); });
      document.addEventListener("visibilitychange", go);
    }
  }
  net(document.querySelector(".mkv__net"), "140,212,240", "rgba(170,226,248,.55)", 0.06);
  net(document.querySelector(".aix__net"), "126,227,180", "rgba(126,227,180,.5)", 0);

  /* ---------------- 3. 첫 화면 모션 필름 ---------------- */
  var film = document.querySelector(".film");
  if (film && CFG.film.length) {
    var SC = CFG.film;
    var fsvg = film.querySelector(".world"), fcam = fsvg.querySelector(".cam");
    var no = film.querySelector(".film__no"), tag = film.querySelector(".film__tag");
    var ft = film.querySelector(".film__t"), fd = film.querySelector(".film__d");
    var bars = [].slice.call(film.querySelectorAll(".film__ch i"));
    var btns = [].slice.call(film.querySelectorAll(".film__ch button"));
    var pp = film.querySelector(".film__pp");
    var idx = 0, el = 0, last = null, userPaused = false, inView = true;

    var words = function (node, text) {
      node.innerHTML = "";
      text.split(" ").forEach(function (w, i) {
        if (i) node.appendChild(document.createTextNode(" "));
        var o = document.createElement("span"); o.className = "w";
        var n = document.createElement("span"); n.textContent = w; n.style.animationDelay = i * 55 + "ms";
        o.appendChild(n); node.appendChild(o);
      });
    };
    var apply = function () {
      var s = SC[idx];
      film.setAttribute("data-scene", idx);
      fsvg.setAttribute("data-s", s.s);
      fcam.style.transform = camStr(s.cam);
      no.textContent = pad(idx + 1); tag.textContent = s.tag;
      words(ft, s.t); fd.textContent = s.d; restart(fd, "in");
      btns.forEach(function (b, j) { b.setAttribute("aria-current", j === idx ? "step" : "false"); });
      fsvg.classList.remove("is-drawing");
      if (s.draw && !REDUCE) { void fsvg.getBoundingClientRect(); fsvg.classList.add("is-drawing"); }
    };
    var paint = function () {
      for (var j = 0; j < bars.length; j++) {
        var v = j < idx ? 1 : j > idx ? 0 : REDUCE ? 1 : Math.min(1, el / SC[idx].ms);
        bars[j].style.transform = "scaleX(" + v + ")";
      }
    };
    var go = function (i) { idx = (i + SC.length) % SC.length; el = 0; apply(); paint(); };
    var running = function () { return !REDUCE && !userPaused && inView && !document.hidden; };
    var loop = function (ts) {
      if (last === null) last = ts;
      var dt = Math.min(100, ts - last); last = ts;
      if (running()) { el += dt; if (el >= SC[idx].ms) go(idx + 1); paint(); }
      requestAnimationFrame(loop);
    };
    var idle = function () { film.classList.toggle("is-idle", !running()); };

    btns.forEach(function (b, j) { b.addEventListener("click", function () { go(j); }); });
    if (pp) {
      pp.addEventListener("click", function () {
        userPaused = !userPaused;
        pp.setAttribute("aria-pressed", userPaused ? "true" : "false");
        pp.setAttribute("aria-label", userPaused ? "모션 재생" : "모션 일시정지");
        film.classList.toggle("is-paused", userPaused); idle();
      });
    }
    onVisible(film, function (v) { inView = v; idle(); });
    document.addEventListener("visibilitychange", idle);

    if (REDUCE) { idx = SC.length - 1; apply(); paint(); if (pp) pp.hidden = true; }
    else { apply(); paint(); requestAnimationFrame(loop); }
  }

  /* ---------------- 4. 업무 스크롤 스토리 ---------------- */
  var stage = document.querySelector(".stage");
  var steps = [].slice.call(document.querySelectorAll(".story__steps > .step"));
  if (stage && steps.length && CFG.story.length) {
    var ST = CFG.story;
    var ssvg = stage.querySelector(".world"), scam = ssvg.querySelector(".cam");
    var sno = stage.querySelector(".stage__no b"), slaw = stage.querySelector(".stage__law");
    var dots = [].slice.call(stage.querySelectorAll(".stage__dots button"));
    var wrapSt = stage.parentElement;
    var dq = window.matchMedia("(min-width: 960px)");
    var cur = -1, ticking = false, total = steps.length - 1;

    var set = function (i) {
      if (i === cur) return; cur = i;
      var s = ST[i];
      ssvg.setAttribute("data-s", s.s); scam.style.transform = camStr(s.cam);
      stage.setAttribute("data-step", i);
      sno.textContent = i < total ? pad(i + 1) : "—";
      slaw.textContent = s.law; restart(slaw, "in");
      steps.forEach(function (x, j) { x.classList.toggle("is-on", j === i); });
      dots.forEach(function (d, j) { d.setAttribute("aria-current", j === i ? "step" : "false"); });
    };
    var line = function () {
      var vh = window.innerHeight;
      if (dq.matches) return vh * 0.52;
      var b = hdH() + wrapSt.offsetHeight;
      return b + (vh - b) * 0.34;
    };
    var pick = function () {
      ticking = false;
      var L = line(), k = 0;
      for (var i = 0; i < steps.length; i++) { if (steps[i].getBoundingClientRect().top < L) k = i; }
      set(k);
    };
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(pick); } }, { passive: true });
    var setSh = function () { root.style.setProperty("--stage-h", (dq.matches ? 0 : wrapSt.offsetHeight) + "px"); };
    window.addEventListener("resize", function () { setSh(); pick(); });
    dots.forEach(function (d, j) {
      d.addEventListener("click", function () {
        var r = steps[j].getBoundingClientRect();
        var y = dq.matches ? window.scrollY + r.top - window.innerHeight * 0.52 + Math.min(r.height / 2, 160) : window.scrollY + r.top - (hdH() + wrapSt.offsetHeight) + 2;
        window.scrollTo({ top: y, behavior: REDUCE ? "auto" : "smooth" });
      });
    });
    onVisible(stage, function (v) { stage.classList.toggle("is-idle", !v); });
    setSh(); pick();
  }

  /* ---------------- 5. 4대 전략 축 — 순환 ---------------- */
  var flow = document.querySelector(".axflow");
  var aix = document.querySelector(".aix");
  if (flow && aix) {
    var axs = [].slice.call(flow.querySelectorAll(".axs"));
    var rail = flow.querySelector(".axflow__rail i");
    var ai = 0, aT = 0, aOn = false;
    var setA = function (i) {
      ai = i;
      axs.forEach(function (x, j) {
        x.classList.toggle("is-on", j === i); x.classList.toggle("is-done", j < i);
        x.querySelector(".axs__btn").setAttribute("aria-pressed", j === i ? "true" : "false");
      });
      if (rail) rail.style.transform = "scaleX(" + (i + 0.5) / axs.length + ")";
    };
    var run = function () { clearInterval(aT); if (!REDUCE && aOn && !document.hidden) aT = setInterval(function () { setA((ai + 1) % axs.length); }, 2800); };
    axs.forEach(function (x, j) {
      x.querySelector(".axs__btn").addEventListener("click", function () { setA(j); run(); });
      x.addEventListener("mouseenter", function () { if (window.matchMedia("(hover:hover)").matches) { setA(j); run(); } });
    });
    setA(0);
    onVisible(aix, function (v) { aOn = v; if (v) aix.classList.add("is-in"); aix.classList.toggle("is-idle", !v); run(); });
    document.addEventListener("visibilitychange", run);
  }

  /* ---------------- 6. 하위 페이지 미니 월드 — data-cycle 장면 순환 ---------------- */
  if (!REDUCE) {
    [].slice.call(document.querySelectorAll(".world[data-cycle]")).forEach(function (svg) {
      var list = (svg.getAttribute("data-cycle") || "").split(",").filter(Boolean);
      if (list.length < 2) return;
      var ci = 0, ct = 0, vis = false;
      var cyc = function () {
        clearInterval(ct);
        if (vis && !document.hidden) ct = setInterval(function () { ci = (ci + 1) % list.length; svg.setAttribute("data-s", list[ci]); }, 3600);
      };
      onVisible(svg, function (v) { vis = v; cyc(); });
      document.addEventListener("visibilitychange", cyc);
    });
  }

  /* ---------------- 7. 주요장비 — 분류 필터 ---------------- */
  var eqf = document.querySelector(".eqf");
  if (eqf) {
    var fbtns = [].slice.call(eqf.querySelectorAll("button[data-f]"));
    var cards = [].slice.call(document.querySelectorAll(".eqc"));
    fbtns.forEach(function (b) {
      b.addEventListener("click", function () {
        var f = b.getAttribute("data-f");
        fbtns.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        cards.forEach(function (c) {
          c.hidden = f !== "전체" && c.getAttribute("data-cat") !== f;
          c.style.animation = "none"; void c.offsetWidth; c.style.animation = "";
        });
      });
    });
  }

  /* ---------------- 8. 스크롤 리빌 · 카운트업 · 연혁 레일 ---------------- */
  var SEL = ".sec__head, .news a, .quick a, .desig li, .gate, .btnrow, .tl__item, .ov li, .axc__i, .vals li, .photos a, .contact, .aix__head > *, " +
    ".target > *, .pcard, .field li, .eqteaser li, .eqf, .flow";
  if (!REDUCE && "IntersectionObserver" in window) {
    var els = [].slice.call(document.querySelectorAll(SEL)).filter(function (e) { return !e.closest(".mkv, .story"); });
    els.forEach(function (e) { e.setAttribute("data-rv", ""); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var t = e.target;
        var sibs = t.parentElement ? [].slice.call(t.parentElement.children).indexOf(t) : 0;
        t.style.transitionDelay = Math.min(sibs, 3) * 60 + "ms";
        t.classList.add("in"); io.unobserve(t);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach(function (e) { io.observe(e); });
    setTimeout(function () { document.querySelectorAll("[data-rv]:not(.in)").forEach(function (e) { e.classList.add("in"); }); }, 2200);
  }

  var nums = [].slice.call(document.querySelectorAll("[data-count]"));
  var fmt = function (n) { return n.toLocaleString("ko-KR"); };
  if (REDUCE || !("IntersectionObserver" in window)) {
    nums.forEach(function (e) { e.textContent = fmt(Number(e.dataset.count)); });
  } else {
    nums.forEach(function (e) { e.textContent = "0"; });
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var t = e.target; cio.unobserve(t);
        var to = Number(t.dataset.count), t0 = performance.now();
        var step = function (now) {
          var p = Math.min(1, (now - t0) / 1400);
          t.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    nums.forEach(function (e) { cio.observe(e); });
  }

  var tl = document.querySelector(".tl");
  if (tl) {
    var items = [].slice.call(tl.querySelectorAll(".tl__item"));
    var tk = false;
    var upd = function () {
      tk = false;
      var r = tl.getBoundingClientRect(), mark = window.innerHeight * 0.62;
      tl.style.setProperty("--tl-p", Math.max(0, Math.min(1, (mark - r.top) / r.height)).toFixed(4));
      items.forEach(function (it) { it.classList.toggle("is-past", it.getBoundingClientRect().top + 14 < mark); });
    };
    var onTl = function () { if (!tk) { tk = true; requestAnimationFrame(upd); } };
    upd();
    window.addEventListener("scroll", onTl, { passive: true });
    window.addEventListener("resize", onTl);
  }
})();
