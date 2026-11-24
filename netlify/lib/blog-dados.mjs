// Métricas do blog "Além do Logo" para o painel /metricas.
// Tudo por artigo (post_id soma português e inglês), sem mínimo de leitores.
// Eventos usados (assets/blog.js e GTM): blog_artigo_view, blog_leitura (progresso 25/50/75),
// blog_leitura_completa, blog_compartilhar (rede), blog_card_click, cta_click, link_interno_click, rede_social_click.
import { ga4Lote, ga4Dimensoes, searchConsole, linhas } from './google.mjs';

const evento = (nome) => ({ filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: nome } } });
const eventos = (nomes) => ({ filter: { fieldName: 'eventName', inListFilter: { values: nomes } } });
const dims = (...n) => n.map((name) => ({ name }));
const mets = (...n) => n.map((name) => ({ name }));
const e = (...x) => ({ andGroup: { expressions: x } });
const NAO = (v) => !v || v === '(not set)';
const naBlog = { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'FULL_REGEXP', value: '/(en/)?blog/[^/]+/?' } } };
const CANAIS = { 'Organic Search': 'Google e buscadores', Direct: 'Direto', 'Organic Social': 'Redes sociais', Referral: 'Outros sites', Unassigned: 'Não identificado', Email: 'E-mail', 'Paid Search': 'Busca paga', 'Paid Social': 'Social pago', 'Organic Video': 'Vídeo', 'Cross-network': 'Campanhas' };
const canal = (c) => CANAIS[c] || c;

function porPeriodo(rel) {
  const out = { atual: [], ant: [] };
  for (const l of linhas(rel)) {
    const p = l.dims[l.dims.length - 1];
    (out[p] || out.atual).push({ dims: l.dims.slice(0, -1), mets: l.mets });
  }
  return out;
}
const ymd = (d) => d.toISOString().slice(0, 10);
const menos = (d, dias) => new Date(d.getTime() - dias * 864e5);

export async function dadosBlog(P, diasSerie, erros) {
  const ini = ymd(menos(P.hoje, diasSerie - 1));
  const fim = ymd(P.hoje);

  const [leit, ev, engaj, cliques, origem] = await ga4Lote([
    { dateRanges: [P.atual, P.ant], dimensions: dims('customEvent:post_id', 'customEvent:post_titulo', 'customEvent:post_categoria'), metrics: mets('activeUsers', 'eventCount'), dimensionFilter: evento('blog_artigo_view'), limit: 600 },
    { dateRanges: [P.atual], dimensions: dims('customEvent:post_id', 'eventName'), metrics: mets('eventCount', 'activeUsers'), dimensionFilter: eventos(['blog_leitura', 'blog_leitura_completa', 'blog_compartilhar', 'blog_card_click']), limit: 1000 },
    { dateRanges: [P.atual], dimensions: dims('pagePath'), metrics: mets('userEngagementDuration', 'activeUsers', 'screenPageViews'), dimensionFilter: naBlog, limit: 600 },
    { dateRanges: [P.atual], dimensions: dims('pagePath', 'eventName'), metrics: mets('eventCount'), dimensionFilter: e(naBlog, eventos(['cta_click', 'link_interno_click', 'rede_social_click', 'blog_card_click'])), limit: 1000 },
    { dateRanges: [P.atual], dimensions: dims('pagePath', 'sessionDefaultChannelGroup'), metrics: mets('activeUsers'), dimensionFilter: naBlog, limit: 1000 },
  ]);
  const [tot, serieEv, serieLeit, entradas, mapa] = await ga4Lote([
    { dateRanges: [P.atual, P.ant], dimensions: dims('eventName'), metrics: mets('eventCount', 'activeUsers'), dimensionFilter: eventos(['blog_artigo_view', 'blog_leitura_completa', 'blog_compartilhar']) },
    { dateRanges: [{ startDate: ini, endDate: fim }], dimensions: dims('date', 'eventName'), metrics: mets('eventCount'), dimensionFilter: eventos(['blog_artigo_view', 'blog_leitura_completa']), limit: 1000 },
    { dateRanges: [{ startDate: ini, endDate: fim }], dimensions: dims('date'), metrics: mets('activeUsers'), dimensionFilter: evento('blog_artigo_view'), limit: 400 },
    { dateRanges: [P.atual], dimensions: dims('landingPage'), metrics: mets('sessions'), dimensionFilter: { filter: { fieldName: 'landingPage', stringFilter: { matchType: 'FULL_REGEXP', value: '/(en/)?blog/[^/]+/?' } } }, limit: 600 },
    { dateRanges: [P.atual], dimensions: dims('pagePath', 'customEvent:post_id'), metrics: mets('eventCount'), dimensionFilter: evento('blog_artigo_view'), limit: 600 },
  ]);
  const [ctaTot] = await ga4Lote([
    { dateRanges: [P.atual, P.ant], metrics: mets('eventCount'), dimensionFilter: e(naBlog, evento('cta_click')) },
  ]);

  // caminho da página -> artigo
  const doPath = {};
  for (const l of linhas(mapa)) if (!NAO(l.dims[1])) doPath[l.dims[0]] = l.dims[1];
  const idDe = (path) => {
    const limpo = String(path || '').split('?')[0];
    if (doPath[limpo]) return doPath[limpo];
    if (doPath[`${limpo.replace(/\/$/, '')}/`]) return doPath[`${limpo.replace(/\/$/, '')}/`];
    const m = limpo.match(/^\/blog\/([^/]+)\/?$/);
    return m ? m[1] : null;
  };

  const posts = {};
  const post = (id) => (posts[id] = posts[id] || {
    id, t: id, c: '', l: 0, lAnt: 0, views: 0, viewsAnt: 0, p25: 0, p50: 0, p75: 0, completas: 0, sh: 0, shRede: {}, news: 0, cardIn: 0,
    engaj: 0, usuariosPag: 0, ct: 0, interno: 0, redes: 0, continuar: 0, origem: {}, entradas: 0, ctaLocais: {}, g: null,
  });

  const lp = porPeriodo(leit);
  for (const per of ['atual', 'ant']) {
    for (const l of lp[per]) {
      if (NAO(l.dims[0])) continue;
      const p = post(l.dims[0]);
      if (per === 'atual') { p.l += l.mets[0]; p.views += l.mets[1]; } else { p.lAnt += l.mets[0]; p.viewsAnt += l.mets[1]; }
      if (!NAO(l.dims[1])) p.t = l.dims[1];
      if (!NAO(l.dims[2])) p.c = l.dims[2];
    }
  }
  for (const l of linhas(ev)) {
    if (NAO(l.dims[0])) continue;
    const p = post(l.dims[0]);
    if (l.dims[1] === 'blog_leitura_completa') p.completas += l.mets[0];
    if (l.dims[1] === 'blog_compartilhar') p.sh += l.mets[0];
    if (l.dims[1] === 'blog_card_click') p.cardIn += l.mets[0];
  }
  for (const l of linhas(engaj)) {
    const id = idDe(l.dims[0]);
    if (!id) continue;
    const p = post(id);
    p.engaj += l.mets[0]; p.usuariosPag += l.mets[1];
  }
  const cliqTot = { contato: 0, interno: 0, redes: 0, continuar: 0 };
  for (const l of linhas(cliques)) {
    const id = idDe(l.dims[0]);
    if (!id) continue;
    const p = post(id);
    const k = { cta_click: 'ct', link_interno_click: 'interno', rede_social_click: 'redes', blog_card_click: 'continuar' }[l.dims[1]];
    if (k) p[k] += l.mets[0];
    const kt = { cta_click: 'contato', link_interno_click: 'interno', rede_social_click: 'redes', blog_card_click: 'continuar' }[l.dims[1]];
    if (kt) cliqTot[kt] += l.mets[0];
  }
  const origemBlog = {};
  for (const l of linhas(origem)) {
    const id = idDe(l.dims[0]);
    if (!id) continue;
    const c = canal(l.dims[1]);
    const p = post(id);
    p.origem[c] = (p.origem[c] || 0) + l.mets[0];
    origemBlog[c] = (origemBlog[c] || 0) + l.mets[0];
  }
  let entradasTot = 0;
  for (const l of linhas(entradas)) {
    const id = idDe(l.dims[0]);
    entradasTot += l.mets[0];
    if (id) post(id).entradas += l.mets[0];
  }

  // partes que dependem de dimensões personalizadas: só pede se existirem na propriedade
  let disponiveis = new Set();
  try { disponiveis = await ga4Dimensoes(); } catch (x) { erros['blog_dimensoes'] = String(x.message || x); }
  const tem = (d) => disponiveis.has(`customEvent:${d}`);
  const redesTot = {};
  let newsTot = 0;
  const funil = { p25: 0, p50: 0, p75: 0 };
  const ctaLocais = {};
  const opcionais = [];
  if (tem('rede')) opcionais.push({ k: 'rede', r: { dateRanges: [P.atual], dimensions: dims('customEvent:post_id', 'customEvent:rede'), metrics: mets('eventCount'), dimensionFilter: evento('blog_compartilhar'), limit: 600 } });
  if (tem('progresso')) opcionais.push({ k: 'progresso', r: { dateRanges: [P.atual], dimensions: dims('customEvent:post_id', 'customEvent:progresso'), metrics: mets('eventCount'), dimensionFilter: evento('blog_leitura'), limit: 600 } });
  if (tem('cta_local')) opcionais.push({ k: 'cta_local', r: { dateRanges: [P.atual], dimensions: dims('pagePath', 'customEvent:cta_local'), metrics: mets('eventCount'), dimensionFilter: e(naBlog, evento('cta_click')), limit: 600 } });
  if (opcionais.length) {
    try {
      const rels = await ga4Lote(opcionais.map((o) => o.r));
      opcionais.forEach((o, k) => {
        for (const l of linhas(rels[k])) {
          if (o.k === 'rede') {
            if (NAO(l.dims[0])) continue;
            const p = post(l.dims[0]);
            const rede = NAO(l.dims[1]) ? 'outro' : l.dims[1];
            if (rede.startsWith('newsletter')) { p.news += l.mets[0]; p.sh -= l.mets[0]; newsTot += l.mets[0]; continue; }
            p.shRede[rede] = (p.shRede[rede] || 0) + l.mets[0];
            redesTot[rede] = (redesTot[rede] || 0) + l.mets[0];
          } else if (o.k === 'progresso') {
            if (NAO(l.dims[0])) continue;
            const m = `p${String(l.dims[1]).replace(/\D/g, '')}`;
            if (m in funil) { post(l.dims[0])[m] += l.mets[0]; funil[m] += l.mets[0]; }
          } else if (o.k === 'cta_local') {
            const id = idDe(l.dims[0]);
            const loc = NAO(l.dims[1]) ? 'outro' : l.dims[1];
            ctaLocais[loc] = (ctaLocais[loc] || 0) + l.mets[0];
            if (id) post(id).ctaLocais[loc] = (post(id).ctaLocais[loc] || 0) + l.mets[0];
          }
        }
      });
    } catch (x) { erros['blog_detalhes'] = String(x.message || x); }
  }

  // Google: cliques, impressões, posição e a busca que mais trouxe gente para cada artigo
  try {
    const [pag, pq] = await Promise.all([
      searchConsole({ startDate: P.atual.startDate, endDate: P.atual.endDate, dimensions: ['page'], dimensionFilterGroups: [{ filters: [{ dimension: 'page', operator: 'contains', expression: '/blog/' }] }], rowLimit: 500 }),
      searchConsole({ startDate: P.atual.startDate, endDate: P.atual.endDate, dimensions: ['page', 'query'], dimensionFilterGroups: [{ filters: [{ dimension: 'page', operator: 'contains', expression: '/blog/' }] }], rowLimit: 1000 }),
    ]);
    const caminho = (u) => { try { return new URL(u).pathname; } catch { return u; } };
    for (const r of pag.rows || []) {
      const id = idDe(caminho(r.keys[0]));
      if (!id) continue;
      const p = post(id);
      p.g = p.g || { cliques: 0, impressoes: 0, posSoma: 0, busca: null, buscaImpr: 0 };
      p.g.cliques += r.clicks; p.g.impressoes += r.impressions; p.g.posSoma += r.position * r.impressions;
    }
    for (const r of pq.rows || []) {
      const id = idDe(caminho(r.keys[0]));
      if (!id || !posts[id] || !posts[id].g) continue;
      if (r.impressions > posts[id].g.buscaImpr) { posts[id].g.busca = r.keys[1]; posts[id].g.buscaImpr = r.impressions; }
    }
  } catch (x) { erros['blog_google'] = String(x.message || x); }

  // séries diárias
  const chaves = Array.from({ length: diasSerie }, (_, k) => ymd(menos(P.hoje, diasSerie - 1 - k)).replace(/-/g, ''));
  const idx = Object.fromEntries(chaves.map((c, k) => [c, k]));
  const serie = { blogLeitores: Array(diasSerie).fill(0), blogViews: Array(diasSerie).fill(0), blogCompletas: Array(diasSerie).fill(0) };
  for (const l of linhas(serieLeit)) if (idx[l.dims[0]] !== undefined) serie.blogLeitores[idx[l.dims[0]]] = l.mets[0];
  for (const l of linhas(serieEv)) {
    const k = idx[l.dims[0]];
    if (k === undefined) continue;
    if (l.dims[1] === 'blog_artigo_view') serie.blogViews[k] = l.mets[0];
    if (l.dims[1] === 'blog_leitura_completa') serie.blogCompletas[k] = l.mets[0];
  }

  const t = porPeriodo(tot);
  const ev2 = (per, nome, m = 0) => (t[per].find((x) => x.dims[0] === nome) || { mets: [0, 0] }).mets[m];
  const ct = porPeriodo(ctaTot);
  const ctV = (per) => (ct[per][0] ? ct[per][0].mets[0] : 0);

  return {
    leitores: ev2('atual', 'blog_artigo_view', 1), leitoresAnt: ev2('ant', 'blog_artigo_view', 1),
    views: ev2('atual', 'blog_artigo_view'), viewsAnt: ev2('ant', 'blog_artigo_view'),
    completas: ev2('atual', 'blog_leitura_completa'), completasAnt: ev2('ant', 'blog_leitura_completa'),
    sh: ev2('atual', 'blog_compartilhar') - newsTot, shAnt: ev2('ant', 'blog_compartilhar'),
    ct: ctV('atual'), ctAnt: ctV('ant'),
    news: newsTot, redes: redesTot, funil, ctaLocais, cliques: cliqTot,
    origem: Object.entries(origemBlog).sort((a, b) => b[1] - a[1]),
    entradas: entradasTot,
    serie,
    detalhes: { rede: tem('rede'), progresso: tem('progresso'), cta_local: tem('cta_local') },
    posts: Object.values(posts).map((p) => ({
      id: p.id, t: p.t, c: p.c || 'Sem categoria', l: p.l, lAnt: p.lAnt, views: p.views, viewsAnt: p.viewsAnt,
      p25: p.p25, p50: p.p50, p75: p.p75, completas: p.completas,
      comp: p.views ? Math.min(100, (p.completas / p.views) * 100) : 0,
      tempo: p.usuariosPag ? p.engaj / p.usuariosPag : 0,
      shN: Math.max(0, p.sh), shRede: p.shRede, news: p.news,
      sh: p.l ? (Math.max(0, p.sh) / p.l) * 100 : 0,
      ctN: p.ct, ct: p.l ? (p.ct / p.l) * 100 : 0,
      interno: p.interno, redes: p.redes, continuar: p.continuar, cardIn: p.cardIn,
      origem: Object.entries(p.origem).sort((a, b) => b[1] - a[1]), entradas: p.entradas, ctaLocais: p.ctaLocais,
      g: p.g ? { cliques: p.g.cliques, impressoes: p.g.impressoes, pos: p.g.impressoes ? p.g.posSoma / p.g.impressoes : 0, busca: p.g.busca } : null,
    })),
  };
}
