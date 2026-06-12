(function () {
  "use strict";

  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  var counter = document.getElementById("counter");
  var counterCur = counter ? counter.querySelector(".counter__cur") : null;
  var progressBar = document.getElementById("progressBar");
  var prevBtn = document.getElementById("prevBtn");
  var nextBtn = document.getElementById("nextBtn");
  var deck = document.getElementById("deck");
  var presentationCursor = document.getElementById("presentationCursor");
  var inkWipe = document.getElementById("inkWipe");
  var current = 0;

  if (!slides.length) return;

  // モーション軽減設定は都度判定（演出は全てこれでオフにできる）
  var prefersReduce = function () {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };

  // 陣営インクのカラーパレット（演出全体で共通利用）
  var INK_COLORS = ["#c8ff00", "#ff2ca8", "#18d9ff", "#ff8a00"];

  // 直近のポインタ位置（切替インクの中心に使う）
  var lastPointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  var setPointerFromEvent = function (e) {
    if (e && typeof e.clientX === "number" && (e.clientX || e.clientY)) {
      lastPointer.x = e.clientX;
      lastPointer.y = e.clientY;
    }
  };

  // --- 登場アニメーション用の下ごしらえ ---
  // 各スライド内の「ブロック」に .anim-item と登場順 --i を付与する。
  // カード/理由/チップ/まとめは“まとまり”ではなく中の各アイテムを個別に登場させる。
  var ANIM_GROUPS = ".cards, .reasons, .chips, .recap";
  var markAnimItems = function (host) {
    var idx = 0;
    Array.prototype.forEach.call(host.children, function (child) {
      if (child.matches && child.matches(ANIM_GROUPS)) {
        Array.prototype.forEach.call(child.children, function (item) {
          item.classList.add("anim-item");
          item.style.setProperty("--i", idx++);
        });
      } else {
        child.classList.add("anim-item");
        child.style.setProperty("--i", idx++);
      }
    });
  };
  slides.forEach(function (slide) {
    var host = slide.querySelector(".wrap") || slide.querySelector(".cover__overlay");
    if (host) markAnimItems(host);
  });

  var indexByHash = function () {
    var id = window.location.hash.replace(/^#/, "");
    if (!id) return 0;
    var found = slides.findIndex(function (slide) {
      return slide.id === id;
    });
    return found >= 0 ? found : 0;
  };

  // =========================================================
  // 演出3：数値カウントアップ
  // data-count を持つ要素を、スライド表示時に 0 から目標値へ数え上げる。
  // =========================================================
  var formatCount = function (v, decimals, pad, prefix, suffix) {
    var s = decimals > 0 ? v.toFixed(decimals) : String(Math.round(v));
    if (pad > 0) {
      var parts = s.split(".");
      var intPart = parts[0];
      while (intPart.length < pad) intPart = "0" + intPart;
      s = parts.length > 1 ? intPart + "." + parts[1] : intPart;
    }
    return prefix + s + suffix;
  };

  var runCountUp = function (slide) {
    var targets = slide.querySelectorAll("[data-count]");
    if (!targets.length) return;

    targets.forEach(function (el) {
      var to = parseFloat(el.getAttribute("data-count"));
      if (isNaN(to)) return;
      var decimals = parseInt(el.getAttribute("data-count-decimals") || "0", 10);
      var pad = parseInt(el.getAttribute("data-count-pad") || "0", 10);
      var prefix = el.getAttribute("data-count-prefix") || "";
      var suffix = el.getAttribute("data-count-suffix") || "";

      if (prefersReduce()) {
        el.textContent = formatCount(to, decimals, pad, prefix, suffix);
        return;
      }

      var duration = 900;
      var start = null;
      el.textContent = formatCount(0, decimals, pad, prefix, suffix);

      var step = function (ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = formatCount(to * eased, decimals, pad, prefix, suffix);
        if (p < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = formatCount(to, decimals, pad, prefix, suffix);
        }
      };
      requestAnimationFrame(step);
    });
  };

  // =========================================================
  // 演出1：インク塗り替えスライド切替
  // 切替の瞬間、直近のポインタ位置から陣営カラーのインク円が広がり、フェードする。
  // =========================================================
  var playInkWipe = function () {
    if (!inkWipe || prefersReduce()) return;
    inkWipe.style.setProperty("--ink-x", lastPointer.x + "px");
    inkWipe.style.setProperty("--ink-y", lastPointer.y + "px");
    inkWipe.style.setProperty("--ink-color", INK_COLORS[current % INK_COLORS.length]);
    inkWipe.classList.remove("is-wiping");
    void inkWipe.offsetWidth;
    inkWipe.classList.add("is-wiping");
  };

  // =========================================================
  // 演出4：フィナーレのインク紙吹雪（canvas）
  // 締めスライドが表示されている間だけ、インク滴が舞い落ちる。
  // canvas は CSS で画面全体に固定（.finale-confetti { position:fixed; inset:0 }）。
  // =========================================================
  var confettiCanvas = document.getElementById("finaleConfetti");
  var confettiCtx = confettiCanvas ? confettiCanvas.getContext("2d") : null;
  var confettiParticles = [];
  var confettiRAF = null;
  var confettiActive = false;

  var confettiResize = function () {
    if (!confettiCanvas) return;
    // 描画バッファを window 基準にする。これが無いと canvas 既定の 300x150 のまま
    // 画面左中央に小さく描画されてしまう（不具合の原因だった）。
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  };

  var spawnConfetti = function () {
    confettiParticles = [];
    var W = confettiCanvas.width;
    var H = confettiCanvas.height;
    var n = 80;
    for (var i = 0; i < n; i++) {
      confettiParticles.push({
        x: Math.random() * W,
        y: Math.random() * -H,
        r: 4 + Math.random() * 7,
        vy: 1 + Math.random() * 2.4,
        vx: -0.5 + Math.random() * 1,
        rot: Math.random() * Math.PI,
        vr: -0.05 + Math.random() * 0.1,
        wobble: Math.random() * Math.PI * 2,
        color: INK_COLORS[Math.floor(Math.random() * INK_COLORS.length)]
      });
    }
  };

  var drawConfetti = function () {
    if (!confettiCtx || !confettiActive) return;
    var W = confettiCanvas.width;
    var H = confettiCanvas.height;
    confettiCtx.clearRect(0, 0, W, H);
    confettiParticles.forEach(function (p) {
      p.y += p.vy;
      p.x += p.vx + Math.sin(p.wobble) * 0.6;
      p.wobble += 0.04;
      p.rot += p.vr;
      if (p.y > H + 20) {
        p.y = -20;
        p.x = Math.random() * W;
      }
      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate(p.rot);
      confettiCtx.globalAlpha = 0.9;
      confettiCtx.fillStyle = p.color;
      confettiCtx.beginPath();
      confettiCtx.ellipse(0, 0, p.r, p.r * 0.7, 0, 0, Math.PI * 2);
      confettiCtx.fill();
      confettiCtx.restore();
    });
    confettiRAF = requestAnimationFrame(drawConfetti);
  };

  var startConfetti = function () {
    if (!confettiCtx || confettiActive || prefersReduce()) return;
    confettiActive = true;
    confettiResize();
    spawnConfetti();
    drawConfetti();
  };

  var stopConfetti = function () {
    confettiActive = false;
    if (confettiRAF) {
      cancelAnimationFrame(confettiRAF);
      confettiRAF = null;
    }
    if (confettiCtx) {
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  };

  var updateConfetti = function () {
    if (slides[current].classList.contains("slide--thanks")) {
      startConfetti();
    } else {
      stopConfetti();
    }
  };

  window.addEventListener("resize", function () {
    if (confettiActive) {
      confettiResize();
      spawnConfetti();
    }
  });

  // =========================================================
  // スライド切替本体（演出フック付き）
  //   animate=true のときだけ切替インクを再生する（初期表示・hash 直リンクでは出さない）。
  // =========================================================
  var setSlide = function (index, updateHash, animate) {
    var prevIndex = current;
    current = Math.max(0, Math.min(slides.length - 1, index));
    var changed = current !== prevIndex;

    if (animate && changed) playInkWipe();

    slides.forEach(function (slide, i) {
      slide.classList.toggle("is-active", i === current);
      slide.setAttribute("aria-hidden", i === current ? "false" : "true");
    });

    if (counter) {
      var counterLabel = current + 1 + " / " + slides.length;
      counter.setAttribute("aria-label", "スライド " + counterLabel);
      if (counterCur) {
        // 構造化カウンター（01 / 12）の現在値だけをゼロ埋めで更新し、内部構造は壊さない
        counterCur.textContent = ("0" + (current + 1)).slice(-2);
      } else {
        counter.textContent = counterLabel;
      }
    }
    if (progressBar) progressBar.style.width = ((current + 1) / slides.length) * 100 + "%";
    if (prevBtn) prevBtn.disabled = current === 0;
    if (nextBtn) nextBtn.disabled = current === slides.length - 1;
    if (deck) deck.classList.toggle("cursor-on-light", slides[current].classList.contains("slide--plain"));

    runCountUp(slides[current]); // 演出3
    updateConfetti();            // 演出4

    if (updateHash !== false) {
      var id = slides[current].id;
      if (id) history.replaceState(null, "", "#" + id);
    }
  };

  var next = function () {
    setSlide(current + 1, true, true);
  };

  var prev = function () {
    setSlide(current - 1, true, true);
  };

  var isInteractive = function (target) {
    return target.closest("button, a, input, textarea, select, summary");
  };

  // =========================================================
  // 演出2：カーソル・インクトレイル
  // =========================================================
  var lastDropAt = 0;
  var spawnInkDrop = function (x, y) {
    if (prefersReduce()) return;
    var now = performance.now ? performance.now() : Date.now();
    if (now - lastDropAt < 45) return;
    lastDropAt = now;
    var drop = document.createElement("span");
    drop.className = "ink-drop";
    var size = 6 + Math.random() * 10;
    drop.style.left = x + "px";
    drop.style.top = y + "px";
    drop.style.width = size + "px";
    drop.style.height = size + "px";
    drop.style.background = INK_COLORS[Math.floor(Math.random() * INK_COLORS.length)];
    drop.style.marginLeft = (Math.random() * 10 - 5) + "px";
    drop.style.marginTop = (Math.random() * 10 - 5) + "px";
    document.body.appendChild(drop);
    setTimeout(function () { drop.remove(); }, 720);
  };

  // =========================================================
  // 操作イベント
  // =========================================================
  if (prevBtn) prevBtn.addEventListener("click", function (e) { setPointerFromEvent(e); prev(); });
  if (nextBtn) nextBtn.addEventListener("click", function (e) { setPointerFromEvent(e); next(); });

  document.querySelectorAll("[data-go]").forEach(function (el) {
    el.addEventListener("click", function (event) {
      event.preventDefault();
      setPointerFromEvent(event);
      setSlide(Number(el.getAttribute("data-go")) || 0, true, true);
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " " || event.key === "Enter") {
      event.preventDefault();
      next();
    } else if (event.key === "ArrowLeft" || event.key === "PageUp" || event.key === "Backspace") {
      event.preventDefault();
      prev();
    } else if (event.key === "Home") {
      event.preventDefault();
      setSlide(0, true, true);
    } else if (event.key === "End") {
      event.preventDefault();
      setSlide(slides.length - 1, true, true);
    }
  });

  if (deck) {
    var finePointer = presentationCursor && window.matchMedia && window.matchMedia("(pointer: fine)").matches;

    deck.addEventListener("pointermove", function (event) {
      lastPointer.x = event.clientX;
      lastPointer.y = event.clientY;
      if (finePointer) {
        presentationCursor.style.setProperty("--cursor-x", event.clientX + "px");
        presentationCursor.style.setProperty("--cursor-y", event.clientY + "px");
        presentationCursor.classList.add("is-visible");
        spawnInkDrop(event.clientX, event.clientY); // 演出2
      }
    });

    if (finePointer) {
      deck.addEventListener("pointerenter", function () {
        presentationCursor.classList.add("is-visible");
      });

      deck.addEventListener("pointerleave", function () {
        presentationCursor.classList.remove("is-visible", "is-pressing");
      });

      deck.addEventListener("pointerdown", function () {
        presentationCursor.classList.add("is-pressing");
      });

      window.addEventListener("pointerup", function () {
        presentationCursor.classList.remove("is-pressing");
      });

      window.addEventListener("blur", function () {
        presentationCursor.classList.remove("is-visible", "is-pressing");
      });
    }

    deck.addEventListener("click", function (event) {
      if (isInteractive(event.target)) return;
      setPointerFromEvent(event);
      next();
    });

    var startX = 0;
    var startY = 0;
    deck.addEventListener("touchstart", function (event) {
      if (!event.touches.length) return;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    }, { passive: true });

    deck.addEventListener("touchend", function (event) {
      if (!event.changedTouches.length) return;
      var touch = event.changedTouches[0];
      lastPointer.x = touch.clientX;
      lastPointer.y = touch.clientY;
      var dx = touch.clientX - startX;
      var dy = touch.clientY - startY;
      if (Math.abs(dx) < 36 && Math.abs(dy) < 36) {
        next();
      } else if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 48) {
        if (dx < 0) next();
        else prev();
      }
    }, { passive: true });
  }

  window.addEventListener("hashchange", function () {
    setSlide(indexByHash(), false, false);
  });

  setSlide(indexByHash(), false, false);
})();
