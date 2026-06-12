/* ============================================================
   いなげ若者選挙プロジェクト 提案資料
   script.js
   ─ 外部ライブラリなし。軽いフェードインとナビ連動のみ。
   ============================================================ */

(function () {
  "use strict";

  /* ----------------------------------------------------------
     1. スクロールでの軽いフェードイン
     各セクションの主要要素に .reveal を付与し、
     画面に入ったら .is-visible を付ける
  ---------------------------------------------------------- */
  var revealTargets = document.querySelectorAll(
    ".section-head, .cover__poster, .cover__meta, .cover__assist, " +
    ".about__statement, .about__card, .flow__route, .figure, " +
    ".flow__step, .ui__text, .ui__shot, .shop-card, .visual__panel, " +
    ".compare__item, .closing__inner, .note"
  );

  revealTargets.forEach(function (el, i) {
    el.classList.add("reveal");
    // カードなどは少しずつ遅れて出す（軽いスタッガー）
    el.style.transitionDelay = (i % 6) * 60 + "ms";
  });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    revealTargets.forEach(function (el) { io.observe(el); });
  } else {
    // 非対応ブラウザはそのまま表示
    revealTargets.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ----------------------------------------------------------
     2. ドットナビ：現在表示中のセクションをハイライト
  ---------------------------------------------------------- */
  var navLinks = document.querySelectorAll(".dotnav a");
  var sections = [];
  navLinks.forEach(function (link) {
    var id = link.getAttribute("href").slice(1);
    var sec = document.getElementById(id);
    if (sec) sections.push({ link: link, sec: sec });
  });

  if ("IntersectionObserver" in window && sections.length) {
    var navIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            navLinks.forEach(function (l) { l.classList.remove("is-active"); });
            var match = sections.find(function (s) { return s.sec === entry.target; });
            if (match) match.link.classList.add("is-active");
          }
        });
      },
      { threshold: 0.5 }
    );
    sections.forEach(function (s) { navIo.observe(s.sec); });
  }

  /* ----------------------------------------------------------
     3. ドットナビのスムーズスクロール（保険）
     CSS の scroll-behavior が効かない環境向けのフォールバック
  ---------------------------------------------------------- */
  navLinks.forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = link.getAttribute("href").slice(1);
      var target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
})();
