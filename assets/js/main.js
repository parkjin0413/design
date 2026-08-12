(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------
   * Nav state: 히어로를 지나면 sticky nav를 solid 배경으로 전환.
   * window scroll 리스너 대신 IntersectionObserver 사용 (연속 스크롤 계산 금지 규칙 준수).
   * ------------------------------------------------------------------ */
  var nav = document.getElementById("siteNav");
  var hero = document.getElementById("top");
  if (nav && hero) {
    var navObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          nav.classList.toggle("is-scrolled", !entry.isIntersecting);
        });
      },
      { rootMargin: "-76px 0px 0px 0px", threshold: 0 }
    );
    navObserver.observe(hero);
  }

  /* ------------------------------------------------------------------
   * Mobile menu
   * ------------------------------------------------------------------ */
  var menuOpen = document.getElementById("menuOpen");
  var menuClose = document.getElementById("menuClose");
  var mobileMenu = document.getElementById("mobileMenu");
  if (menuOpen && menuClose && mobileMenu) {
    menuOpen.addEventListener("click", function () {
      mobileMenu.classList.add("is-open");
      document.body.style.overflow = "hidden";
    });
    menuClose.addEventListener("click", closeMenu);
    mobileMenu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
  }
  function closeMenu() {
    mobileMenu.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  /* ------------------------------------------------------------------
   * Scroll reveal (whileInView 대체): 진입 시 한 번만 페이드업.
   * ------------------------------------------------------------------ */
  var revealEls = document.querySelectorAll(".reveal");
  if (reduceMotion) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else if ("IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry, i) {
          if (entry.isIntersecting) {
            var delay = Math.min(i, 4) * 60;
            setTimeout(function () { entry.target.classList.add("is-visible"); }, delay);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { revealObserver.observe(el); });
    /* 안전장치: 옵저버가 어떤 이유로든 못 잡아내도 콘텐츠가 영구히
       숨겨지지 않도록 일정 시간 후 전부 노출 처리 */
    setTimeout(function () {
      revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    }, 2500);
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ------------------------------------------------------------------
   * Detail gallery: GSAP 가로 스크롤 핀(Horizontal-Pan canonical skeleton).
   * 목적: 마감재/디테일 자재를 순서대로 보여주는 스토리텔링용 모션.
   * reduced-motion, 모바일, GSAP 미로딩 시 가로 스크롤 스냅 리스트로 대체.
   * ------------------------------------------------------------------ */
  function initDetailGallery() {
    var wrap = document.getElementById("panWrap");
    var track = document.getElementById("panTrack");
    if (!wrap || !track) return;

    var isSmall = window.matchMedia("(max-width: 860px)").matches;
    var hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

    if (reduceMotion || isSmall || !hasGsap) {
      wrap.setAttribute("data-mode", "scroll");
      return;
    }

    window.gsap.registerPlugin(window.ScrollTrigger);
    var ctx = window.gsap.context(function () {
      var distance = track.scrollWidth - window.innerWidth;
      if (distance <= 0) {
        wrap.setAttribute("data-mode", "scroll");
        return;
      }
      window.gsap.to(track, {
        x: -distance,
        ease: "none",
        scrollTrigger: {
          trigger: wrap,
          start: "top top",
          end: "+=" + distance,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true
        }
      });
    }, wrap);

    window.addEventListener("beforeunload", function () { ctx.revert(); });
  }

  /* ------------------------------------------------------------------
   * Testimonials: 크로스페이드 캐러셀. 모든 슬라이드는 항상 DOM에 있고,
   * JS는 opacity 토글만 담당 (콘텐츠는 JS 없이도 읽을 수 있음).
   * 자동 재생은 hover/focus 중 정지, prefers-reduced-motion에서는
   * 아예 자동재생하지 않고 화살표/점으로만 넘어갑니다.
   * ------------------------------------------------------------------ */
  function initTestimonials() {
    var carousel = document.getElementById("quoteCarousel");
    var track = document.getElementById("quoteTrack");
    var dotsWrap = document.getElementById("quoteDots");
    var prevBtn = document.getElementById("quotePrev");
    var nextBtn = document.getElementById("quoteNext");
    if (!carousel || !track) return;

    var slides = Array.prototype.slice.call(track.querySelectorAll(".testimonial-slide"));
    if (slides.length === 0) return;

    var AUTOPLAY_MS = 6000;
    var current = 0;
    var timer = null;

    var dots = slides.map(function (slide, i) {
      if (!dotsWrap) return null;
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "testimonials__dot";
      dot.setAttribute("aria-label", "후기 " + (i + 1) + "번으로 이동");
      dot.addEventListener("click", function () {
        goTo(i);
        restart();
      });
      dotsWrap.appendChild(dot);
      return dot;
    });

    function show(index) {
      current = (index + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        var active = i === current;
        slide.classList.toggle("is-visible", active);
        slide.setAttribute("aria-hidden", active ? "false" : "true");
      });
      dots.forEach(function (dot, i) {
        if (dot) dot.setAttribute("aria-current", i === current ? "true" : "false");
      });
    }

    function goTo(index) { show(index); }
    function next() { show(current + 1); }
    function prev() { show(current - 1); }

    function start() {
      if (reduceMotion || slides.length < 2) return;
      stop();
      timer = setInterval(next, AUTOPLAY_MS);
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }
    function restart() { stop(); start(); }

    if (nextBtn) nextBtn.addEventListener("click", function () { next(); restart(); });
    if (prevBtn) prevBtn.addEventListener("click", function () { prev(); restart(); });

    carousel.addEventListener("mouseenter", stop);
    carousel.addEventListener("mouseleave", start);
    carousel.addEventListener("focusin", stop);
    carousel.addEventListener("focusout", start);

    show(0);
    start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initDetailGallery();
      initTestimonials();
    });
  } else {
    initDetailGallery();
    initTestimonials();
  }
})();
