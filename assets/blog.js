(function () {
  // barra de progresso de leitura
  var bar = document.querySelector('.bprog i');
  var art = document.querySelector('.prose');
  if (bar && art) {
    var tick = function () {
      var r = art.getBoundingClientRect();
      var total = r.height - window.innerHeight * 0.6;
      var p = Math.min(1, Math.max(0, (-r.top + window.innerHeight * 0.25) / (total > 0 ? total : 1)));
      bar.style.transform = 'scaleX(' + p + ')';
    };
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
    tick();
  }

  // copiar link do artigo
  document.querySelectorAll('.bcopy').forEach(function (b) {
    b.addEventListener('click', function () {
      var url = b.getAttribute('data-url') || location.href;
      var ok = function () {
        b.classList.add('ok');
        b.setAttribute('aria-label', 'Link copiado');
        setTimeout(function () { b.classList.remove('ok'); b.setAttribute('aria-label', 'Copiar link'); }, 2200);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, ok);
      else { var t = document.createElement('textarea'); t.value = url; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) {} t.remove(); ok(); }
      if (typeof window.gtag === 'function') window.gtag('event', 'blog_compartilhar', { rede: 'copiar_link' });
    });
  });

  // compartilhamentos (GA4)
  document.querySelectorAll('[data-share]').forEach(function (a) {
    a.addEventListener('click', function () {
      if (typeof window.gtag === 'function') window.gtag('event', 'blog_compartilhar', { rede: a.getAttribute('data-share') });
    });
  });
})();
