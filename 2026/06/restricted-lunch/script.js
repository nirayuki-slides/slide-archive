(function () {
  var sections = Array.prototype.slice.call(document.querySelectorAll("[data-slide]"));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll("[data-nav]"));

  if (!sections.length || !navLinks.length || !("IntersectionObserver" in window)) {
    return;
  }

  var navById = {};
  navLinks.forEach(function (link) {
    navById[link.getAttribute("data-nav")] = link;
  });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) {
        return;
      }

      navLinks.forEach(function (link) {
        link.classList.remove("is-active");
      });

      var active = navById[entry.target.id];
      if (active) {
        active.classList.add("is-active");
      }
    });
  }, {
    root: null,
    threshold: 0.45
  });

  sections.forEach(function (section) {
    observer.observe(section);
  });
})();
