(function () {
  var hd = document.querySelector('.hd');
  var secs = Array.prototype.slice.call(document.querySelectorAll('[data-theme]'));
  function tick() {
    if (!hd) return;
    hd.classList.toggle('solid', window.scrollY > 10);
    var y = 38, dark = false;
    for (var i = 0; i < secs.length; i++) {
      var r = secs[i].getBoundingClientRect();
      if (r.top <= y && r.bottom > y) { dark = secs[i].getAttribute('data-theme') === 'dark'; break; }
    }
    hd.classList.toggle('on-dark', dark);
  }
  window.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', tick);
  tick();

  var mb = document.querySelector('.menu-btn');
  if (mb) {
    mb.addEventListener('click', function () {
      var o = document.body.classList.toggle('menu-open');
      mb.setAttribute('aria-expanded', o ? 'true' : 'false');
    });
    document.querySelectorAll('.pills a').forEach(function (a) {
      a.addEventListener('click', function () { document.body.classList.remove('menu-open'); mb.setAttribute('aria-expanded', 'false'); });
    });
  }

  var els = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.14, rootMargin: '0px 0px -50px 0px' });
    els.forEach(function (el) { io.observe(el); });
  } else { els.forEach(function (el) { el.classList.add('in'); }); }

  var stage = document.querySelector('.stage');
  var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (stage && fine && !calm) {
    var items = stage.querySelectorAll('[data-depth]');
    stage.addEventListener('mousemove', function (e) {
      var r = stage.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      items.forEach(function (it) {
        var d = parseFloat(it.getAttribute('data-depth'));
        it.style.marginLeft = (x * d) + 'px';
        it.style.marginTop = (y * d) + 'px';
      });
    });
    stage.addEventListener('mouseleave', function () { items.forEach(function (it) { it.style.marginLeft = ''; it.style.marginTop = ''; }); });
  }

  var noHover = window.matchMedia && window.matchMedia('(hover: none)').matches;
  if (noHover && 'IntersectionObserver' in window) {
    var picks = document.querySelectorAll('.tc, .svc-row');
    var io2 = new IntersectionObserver(function (en) {
      en.forEach(function (e) { e.target.classList.toggle('is-on', e.isIntersecting); });
    }, { rootMargin: '-44% 0px -44% 0px', threshold: 0 });
    picks.forEach(function (el) { io2.observe(el); });
  }

  var yr = document.querySelector('[data-year]');
  if (yr) yr.textContent = new Date().getFullYear();
})();
