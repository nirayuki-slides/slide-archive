(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initCollapsibles();
    initCopyButtons();
    initChecklists();
    initSideNavActive();
    initScrollTop();
    initSearch();
    initMobileMenu();
  });

  /* ---------------- Collapsible ---------------- */
  function initCollapsibles() {
    var collapsibles = document.querySelectorAll('.collapsible');
    collapsibles.forEach(function (el) {
      var header = el.querySelector('.collapsible-header');
      if (!header) return;
      header.addEventListener('click', function () {
        toggleCollapse(el);
      });
      header.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleCollapse(el);
        }
      });
    });
  }

  function toggleCollapse(el) {
    var open = el.classList.toggle('open');
    var header = el.querySelector('.collapsible-header');
    if (header) header.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  /* ---------------- Copy buttons ---------------- */
  function initCopyButtons() {
    var buttons = document.querySelectorAll('.copy-btn');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var sel = btn.getAttribute('data-copy-target');
        if (!sel) return;
        var target = document.querySelector(sel);
        if (!target) return;
        var text = target.innerText || target.textContent || '';
        copyText(text).then(function () {
          flashCopied(btn);
          showToast('コピーしました');
        }).catch(function () {
          showToast('コピーに失敗しました');
        });
      });
    });
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.setAttribute('readonly', '');
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        ok ? resolve() : reject();
      } catch (err) {
        reject(err);
      }
    });
  }

  function flashCopied(btn) {
    var original = btn.textContent;
    btn.textContent = 'コピー済み';
    btn.classList.add('copied');
    setTimeout(function () {
      btn.textContent = original;
      btn.classList.remove('copied');
    }, 1400);
  }

  /* ---------------- Toast ---------------- */
  var toastTimer = null;
  function showToast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove('show');
    }, 1600);
  }

  /* ---------------- Checklists ---------------- */
  function initChecklists() {
    var items = document.querySelectorAll('.checklist li');
    items.forEach(function (li) {
      li.setAttribute('role', 'checkbox');
      li.setAttribute('aria-checked', 'false');
      li.setAttribute('tabindex', '0');
      li.addEventListener('click', function () {
        toggleCheck(li);
      });
      li.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleCheck(li);
        }
      });
    });
  }

  function toggleCheck(li) {
    var checked = li.classList.toggle('checked');
    li.setAttribute('aria-checked', checked ? 'true' : 'false');
  }

  /* ---------------- Side nav active state ---------------- */
  function initSideNavActive() {
    var links = document.querySelectorAll('.sidenav a.nav-link');
    if (!links.length) return;
    var idToLink = {};
    var sections = [];
    links.forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) !== '#') return;
      var id = href.substring(1);
      var sec = document.getElementById(id);
      if (sec) {
        idToLink[id] = a;
        sections.push(sec);
      }
      a.addEventListener('click', function () {
        var nav = document.getElementById('sidenav');
        if (nav && nav.classList.contains('open')) {
          nav.classList.remove('open');
        }
      });
    });

    if (!('IntersectionObserver' in window) || !sections.length) {
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
          setActive(idToLink, id);
        }
      });
    }, {
      root: null,
      rootMargin: '-30% 0px -60% 0px',
      threshold: 0
    });

    sections.forEach(function (sec) { observer.observe(sec); });
  }

  function setActive(map, id) {
    Object.keys(map).forEach(function (k) {
      var a = map[k];
      if (k === id) a.classList.add('active');
      else a.classList.remove('active');
    });
  }

  /* ---------------- Scroll to top ---------------- */
  function initScrollTop() {
    var btn = document.getElementById('scroll-top');
    if (!btn) return;
    var onScroll = function () {
      if (window.scrollY > 400) btn.classList.add('visible');
      else btn.classList.remove('visible');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    btn.addEventListener('click', function () {
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  /* ---------------- Search ---------------- */
  function initSearch() {
    var input = document.getElementById('search-input');
    var hits = document.getElementById('search-hits');
    if (!input) return;

    var sections = Array.prototype.slice.call(document.querySelectorAll('main section'));

    var debounceTimer = null;
    input.addEventListener('input', function () {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        runSearch(input.value, sections, hits);
      }, 120);
    });
  }

  function runSearch(query, sections, hits) {
    var q = (query || '').trim().toLowerCase();

    sections.forEach(function (sec) {
      clearHighlights(sec);
      sec.classList.remove('search-hidden');
    });

    if (!q) {
      if (hits) hits.textContent = '';
      return;
    }

    var matchCount = 0;
    sections.forEach(function (sec) {
      var text = (sec.innerText || sec.textContent || '').toLowerCase();
      if (text.indexOf(q) !== -1) {
        highlightInElement(sec, q);
        matchCount++;
      } else {
        sec.classList.add('search-hidden');
      }
    });

    if (hits) {
      hits.textContent = matchCount + ' 件のセクションに一致';
    }
  }

  function clearHighlights(root) {
    var marks = root.querySelectorAll('mark.search-mark');
    marks.forEach(function (m) {
      var parent = m.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(m.textContent), m);
      parent.normalize();
    });
  }

  function highlightInElement(root, query) {
    var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, INPUT: 1, TEXTAREA: 1, MARK: 1 };
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.parentNode) return NodeFilter.FILTER_REJECT;
        if (SKIP_TAGS[node.parentNode.nodeName]) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) nodes.push(n);

    nodes.forEach(function (textNode) {
      var raw = textNode.nodeValue;
      var lower = raw.toLowerCase();
      var idx = lower.indexOf(query);
      if (idx === -1) return;

      var frag = document.createDocumentFragment();
      var last = 0;
      while (idx !== -1) {
        if (idx > last) frag.appendChild(document.createTextNode(raw.slice(last, idx)));
        var mark = document.createElement('mark');
        mark.className = 'search-mark';
        mark.textContent = raw.slice(idx, idx + query.length);
        frag.appendChild(mark);
        last = idx + query.length;
        idx = lower.indexOf(query, last);
      }
      if (last < raw.length) frag.appendChild(document.createTextNode(raw.slice(last)));
      textNode.parentNode.replaceChild(frag, textNode);
    });
  }

  /* ---------------- Mobile menu ---------------- */
  function initMobileMenu() {
    var btn = document.getElementById('menu-toggle');
    var nav = document.getElementById('sidenav');
    if (!btn || !nav) return;
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('open')) return;
      if (nav.contains(e.target) || btn.contains(e.target)) return;
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    });
  }
})();
