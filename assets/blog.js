(function () {
  var EN = document.documentElement.lang === 'en';

  // ---------- mensuração (GA4 via gtag, carregado pelo GTM-5QDKPNN9) ----------
  function track(nome, params) {
    params = params || {};
    params.idioma = EN ? 'en' : 'pt';
    if (typeof window.gtag === 'function') window.gtag('event', nome, params);
  }
  // dados do artigo: post_id é o endereço em português, igual nas duas versões, para somar PT e EN
  function dadosPost(el) {
    if (!el) return {};
    return {
      post_id: el.getAttribute('data-post-id') || '',
      post_titulo: el.getAttribute('data-post-titulo') || '',
      post_categoria: el.getAttribute('data-post-categoria') || ''
    };
  }
  function junta(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }

  var art = document.querySelector('.art[data-post-id]');
  var prose = document.querySelector('.prose');
  var post = dadosPost(art);

  // 1. artigo aberto
  if (art) track('blog_artigo_view', post);

  // 2. leitura: 25, 50 e 75% do texto, e leitura completa com o tempo ativo na página
  if (art && prose) {
    var marcos = [25, 50, 75], feitos = {}, completo = false;
    var ativoMs = 0, desde = document.hidden ? 0 : Date.now();
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { if (desde) ativoMs += Date.now() - desde; desde = 0; }
      else desde = Date.now();
    });
    var tempo = function () { return Math.round((ativoMs + (desde ? Date.now() - desde : 0)) / 1000); };
    var mede = function () {
      var r = prose.getBoundingClientRect();
      if (r.height <= 0) return;
      var lido = Math.min(100, Math.max(0, ((window.innerHeight - r.top) / r.height) * 100));
      marcos.forEach(function (m) {
        if (lido >= m && !feitos[m]) { feitos[m] = true; track('blog_leitura', junta(post, { progresso: m })); }
      });
      if (lido >= 98 && !completo) {
        completo = true;
        track('blog_leitura_completa', junta(post, { tempo_seg: tempo() }));
      }
    };
    window.addEventListener('scroll', mede, { passive: true });
    window.addEventListener('load', mede);
  }

  // 3. cliques em artigos (destaque, mais recentes, grade e continue lendo) e no filtro de categoria
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a');
    if (!a) return;
    if (a.hasAttribute('data-post-id') && !a.classList.contains('art')) {
      var origem = a.closest('.bf-main') ? 'destaque'
        : a.closest('.bf-side') ? 'mais_recentes'
        : a.closest('.brel') ? 'continue_lendo'
        : a.closest('.bl') ? 'grade' : 'outro';
      track('blog_card_click', junta(dadosPost(a), { origem: origem, origem_post: post.post_id || 'listagem' }));
    } else if (a.closest('.bcat-f')) {
      track('blog_categoria_filtro', { post_categoria: a.getAttribute('data-categoria') || 'todos' });
    }
  }, true);

  // ---------- barra de progresso de leitura ----------
  var bar = document.querySelector('.bprog i');
  if (bar && prose) {
    var tick = function () {
      var r = prose.getBoundingClientRect();
      var total = r.height - window.innerHeight * 0.6;
      var p = Math.min(1, Math.max(0, (-r.top + window.innerHeight * 0.25) / (total > 0 ? total : 1)));
      bar.style.transform = 'scaleX(' + p + ')';
    };
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
    tick();
  }

  // ---------- copiar link do artigo ----------
  document.querySelectorAll('.bcopy').forEach(function (b) {
    var rotulo = b.getAttribute('data-label') || b.getAttribute('aria-label');
    b.addEventListener('click', function () {
      var url = b.getAttribute('data-url') || location.href;
      var ok = function () {
        b.classList.add('ok');
        b.setAttribute('aria-label', EN ? 'Link copied' : 'Link copiado');
        setTimeout(function () { b.classList.remove('ok'); b.setAttribute('aria-label', rotulo); }, 2200);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, ok);
      else { var t = document.createElement('textarea'); t.value = url; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) {} t.remove(); ok(); }
      track('blog_compartilhar', junta(post, { rede: 'copiar_link', cta_local: 'fim_artigo' }));
    });
  });

  // ---------- compartilhamentos e newsletter ----------
  document.querySelectorAll('[data-share]').forEach(function (a) {
    a.addEventListener('click', function () {
      track('blog_compartilhar', junta(post, { rede: a.getAttribute('data-share'), cta_local: a.getAttribute('data-local') || 'fim_artigo' }));
    });
  });
})();
