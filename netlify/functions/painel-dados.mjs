// Dados do painel /metricas. Só responde com sessão válida.
// Fontes ligadas: GA4 (site, blog, tempo real, sites que mandam visitas) e Search Console (buscas).
// Instagram e Google Alerts entram nas próximas etapas; até lá a tela usa dados de exemplo nessas partes.
import { sessaoValida, env, CABECALHOS_PRIVADOS } from '../lib/sessao.mjs';
import { ga4Lote, ga4TempoReal, searchConsole, linhas } from '../lib/google.mjs';
import { dadosPainel as dadosInstagram } from '../lib/instagram.mjs';

const json = (dados, status = 200) =>
  new Response(JSON.stringify(dados), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CABECALHOS_PRIVADOS } });

const DIAS_SERIE = 200;
const cache = new Map();
const CACHE_MS = 5 * 60 * 1000;

// ---------- datas no fuso de São Paulo ----------
function hojeSP() {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [a, m, d] = p.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}
const ymd = (d) => d.toISOString().slice(0, 10);
const menos = (d, dias) => new Date(d.getTime() - dias * 864e5);

function periodos(periodo) {
  const hoje = hojeSP();
  if (periodo === 'mes') {
    const dia = hoje.getUTCDate();
    const ini = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));
    const iniAnt = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 1, 1));
    const ultAnt = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 0)).getUTCDate();
    const fimAnt = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 1, Math.min(dia, ultAnt)));
    return { hoje, atual: { startDate: ymd(ini), endDate: ymd(hoje), name: 'atual' }, ant: { startDate: ymd(iniAnt), endDate: ymd(fimAnt), name: 'ant' } };
  }
  const n = [7, 30, 90].includes(Number(periodo)) ? Number(periodo) : 30;
  return {
    hoje,
    atual: { startDate: ymd(menos(hoje, n - 1)), endDate: ymd(hoje), name: 'atual' },
    ant: { startDate: ymd(menos(hoje, 2 * n - 1)), endDate: ymd(menos(hoje, n)), name: 'ant' },
  };
}

// ---------- filtros do GA4 ----------
const evento = (nome) => ({ filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: nome } } });
const eventos = (nomes) => ({ filter: { fieldName: 'eventName', inListFilter: { values: nomes } } });
const dims = (...n) => n.map((name) => ({ name }));
const mets = (...n) => n.map((name) => ({ name }));
const desc = (metrica) => [{ metric: { metricName: metrica }, desc: true }];

// separa linhas de relatórios com dois períodos (o GA4 acrescenta a dimensão do período no fim)
function porPeriodo(rel) {
  const out = { atual: [], ant: [] };
  for (const l of linhas(rel)) {
    const p = l.dims[l.dims.length - 1];
    (out[p] || out.atual).push({ dims: l.dims.slice(0, -1), mets: l.mets });
  }
  return out;
}

// ---------- site ----------
async function dadosSite(P) {
  const ini200 = ymd(menos(P.hoje, DIAS_SERIE - 1));
  const fim = ymd(P.hoje);
  const [serieUsuarios, serieEventos, kpis, kpiEventos, origem] = await ga4Lote([
    { dateRanges: [{ startDate: ini200, endDate: fim }], dimensions: dims('date'), metrics: mets('activeUsers'), limit: 400 },
    { dateRanges: [{ startDate: ini200, endDate: fim }], dimensions: dims('date', 'eventName'), metrics: mets('eventCount'), dimensionFilter: eventos(['generate_lead', 'cta_click']), limit: 1000 },
    { dateRanges: [P.atual, P.ant], metrics: mets('activeUsers', 'sessions', 'userEngagementDuration') },
    { dateRanges: [P.atual, P.ant], dimensions: dims('eventName'), metrics: mets('eventCount'), dimensionFilter: eventos(['generate_lead', 'cta_click']) },
    { dateRanges: [P.atual], dimensions: dims('sessionDefaultChannelGroup'), metrics: mets('activeUsers'), orderBys: desc('activeUsers'), limit: 6 },
  ]);

  // séries diárias alinhadas aos últimos 200 dias
  const chaves = Array.from({ length: DIAS_SERIE }, (_, k) => ymd(menos(P.hoje, DIAS_SERIE - 1 - k)).replace(/-/g, ''));
  const idx = Object.fromEntries(chaves.map((c, k) => [c, k]));
  const serie = { visitas: Array(DIAS_SERIE).fill(0), leads: Array(DIAS_SERIE).fill(0), cta: Array(DIAS_SERIE).fill(0) };
  for (const l of linhas(serieUsuarios)) if (idx[l.dims[0]] !== undefined) serie.visitas[idx[l.dims[0]]] = l.mets[0];
  for (const l of linhas(serieEventos)) {
    const k = idx[l.dims[0]];
    if (k === undefined) continue;
    if (l.dims[1] === 'generate_lead') serie.leads[k] = l.mets[0];
    if (l.dims[1] === 'cta_click') serie.cta[k] = l.mets[0];
  }

  const k = porPeriodo(kpis);
  const ev = porPeriodo(kpiEventos);
  const resumo = (p) => {
    const m = (k[p][0] && k[p][0].mets) || [0, 0, 0];
    const e = (nome) => (ev[p].find((x) => x.dims[0] === nome) || { mets: [0] }).mets[0];
    return { usuarios: m[0], sessoes: m[1], engajamento: m[2], leads: e('generate_lead'), cta: e('cta_click') };
  };

  const origemLinhas = linhas(origem);
  const totalOrigem = origemLinhas.reduce((s, l) => s + l.mets[0], 0) || 1;
  const NOMES = { 'Organic Search': 'Google e buscadores', Direct: 'Direto', 'Organic Social': 'Redes sociais', Referral: 'Outros sites', Unassigned: 'Não identificado', Email: 'E-mail', 'Paid Search': 'Busca paga', 'Paid Social': 'Social pago' };

  return {
    serie,
    atual: resumo('atual'),
    ant: resumo('ant'),
    origem: origemLinhas.map((l) => [NOMES[l.dims[0]] || l.dims[0], Math.round((l.mets[0] / totalOrigem) * 100)]),
  };
}

async function dadosPaginasEBlog(P) {
  const filtroBlog = { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'CONTAINS', value: '/blog/' } } };
  const [paginas, leitores, evBlog, mapa, engaj] = await ga4Lote([
    { dateRanges: [P.atual], dimensions: dims('pagePath'), metrics: mets('screenPageViews'), orderBys: desc('screenPageViews'), limit: 6 },
    { dateRanges: [P.atual], dimensions: dims('customEvent:post_id', 'customEvent:post_titulo', 'customEvent:post_categoria'), metrics: mets('activeUsers', 'eventCount'), dimensionFilter: evento('blog_artigo_view'), limit: 300 },
    { dateRanges: [P.atual], dimensions: dims('customEvent:post_id', 'eventName'), metrics: mets('eventCount'), dimensionFilter: eventos(['blog_leitura_completa', 'blog_compartilhar']), limit: 600 },
    { dateRanges: [P.atual], dimensions: dims('pagePath', 'customEvent:post_id'), metrics: mets('eventCount'), dimensionFilter: evento('blog_artigo_view'), limit: 600 },
    { dateRanges: [P.atual], dimensions: dims('pagePath'), metrics: mets('userEngagementDuration', 'activeUsers'), dimensionFilter: filtroBlog, limit: 600 },
  ]);
  const doInstagram = { filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'CONTAINS', value: 'instagram', caseSensitive: false } } };
  const [cta, leitoresTotal, igUsuarios, igLeads] = await ga4Lote([
    { dateRanges: [P.atual], dimensions: dims('pagePath'), metrics: mets('eventCount'), dimensionFilter: { andGroup: { expressions: [evento('cta_click'), filtroBlog] } }, limit: 600 },
    { dateRanges: [P.atual, P.ant], metrics: mets('activeUsers'), dimensionFilter: evento('blog_artigo_view') },
    { dateRanges: [P.atual], metrics: mets('activeUsers'), dimensionFilter: doInstagram },
    { dateRanges: [P.atual], metrics: mets('eventCount'), dimensionFilter: { andGroup: { expressions: [evento('generate_lead'), doInstagram] } } },
  ]);
  const primeiro = (rel) => { const l = linhas(rel)[0]; return l ? l.mets[0] : 0; };

  const pagLinhas = linhas(paginas);
  const totalPag = pagLinhas.reduce((s, l) => s + l.mets[0], 0) || 1;

  const posts = {};
  const post = (id) => (posts[id] = posts[id] || { id, t: id, c: '', l: 0, views: 0, completas: 0, sh: 0, engaj: 0, usuariosPag: 0, ct: 0 });
  for (const l of linhas(leitores)) {
    if (!l.dims[0] || l.dims[0] === '(not set)') continue;
    const p = post(l.dims[0]);
    p.l += l.mets[0]; p.views += l.mets[1];
    if (l.dims[1] && l.dims[1] !== '(not set)') p.t = l.dims[1];
    if (l.dims[2] && l.dims[2] !== '(not set)') p.c = l.dims[2];
  }
  for (const l of linhas(evBlog)) {
    if (!posts[l.dims[0]]) continue;
    if (l.dims[1] === 'blog_leitura_completa') posts[l.dims[0]].completas += l.mets[0];
    if (l.dims[1] === 'blog_compartilhar') posts[l.dims[0]].sh += l.mets[0];
  }
  const paginaDoPost = {};
  for (const l of linhas(mapa)) if (l.dims[1] && l.dims[1] !== '(not set)') paginaDoPost[l.dims[0]] = l.dims[1];
  for (const l of linhas(engaj)) {
    const id = paginaDoPost[l.dims[0]];
    if (id && posts[id]) { posts[id].engaj += l.mets[0]; posts[id].usuariosPag += l.mets[1]; }
  }
  for (const l of linhas(cta)) {
    const id = paginaDoPost[l.dims[0]];
    if (id && posts[id]) posts[id].ct += l.mets[0];
  }
  const lt = porPeriodo(leitoresTotal);

  return {
    vindosDoInstagram: { usuarios: primeiro(igUsuarios), leads: primeiro(igLeads) },
    paginas: pagLinhas.map((l) => [l.dims[0], Math.round((l.mets[0] / totalPag) * 100)]),
    blog: {
      leitores: (lt.atual[0] && lt.atual[0].mets[0]) || 0,
      leitoresAnt: (lt.ant[0] && lt.ant[0].mets[0]) || 0,
      posts: Object.values(posts).map((p) => ({
        id: p.id, t: p.t, c: p.c || 'Sem categoria', l: p.l,
        comp: p.views ? Math.min(100, (p.completas / p.views) * 100) : 0,
        tempo: p.usuariosPag ? p.engaj / p.usuariosPag : 0,
        sh: p.l ? (p.sh / p.l) * 100 : 0,
        ct: p.l ? (p.ct / p.l) * 100 : 0,
      })),
    },
  };
}

async function dadosAgora() {
  const [total, telas] = await Promise.all([
    ga4TempoReal({ metrics: mets('activeUsers') }),
    ga4TempoReal({ dimensions: dims('unifiedScreenName'), metrics: mets('activeUsers'), orderBys: desc('activeUsers'), limit: 5 }),
  ]);
  return {
    usuarios: Number((total.rows && total.rows[0] && total.rows[0].metricValues[0].value) || 0),
    paginas: linhas(telas).map((l) => [l.dims[0], l.mets[0]]),
  };
}

async function dadosReferencias(P) {
  const [ref] = await ga4Lote([{
    dateRanges: [{ startDate: ymd(menos(P.hoje, 89)), endDate: ymd(P.hoje) }],
    dimensions: dims('sessionSource'),
    metrics: mets('sessions'),
    dimensionFilter: { filter: { fieldName: 'sessionDefaultChannelGroup', stringFilter: { matchType: 'EXACT', value: 'Referral' } } },
    orderBys: desc('sessions'),
    limit: 50,
  }]);
  return linhas(ref).map((l) => [l.dims[0], l.mets[0]]);
}

async function dadosBuscas(P) {
  // o Search Console tem 2 a 3 dias de atraso; usa o mesmo período do painel
  const [top, marca1, marca2] = await Promise.all([
    searchConsole({ startDate: P.atual.startDate, endDate: P.atual.endDate, dimensions: ['query'], rowLimit: 8 }),
    searchConsole({ startDate: ymd(menos(P.hoje, 89)), endDate: ymd(P.hoje), dimensionFilterGroups: [{ filters: [{ dimension: 'query', operator: 'contains', expression: 'sturmer' }] }] }),
    searchConsole({ startDate: ymd(menos(P.hoje, 89)), endDate: ymd(P.hoje), dimensionFilterGroups: [{ filters: [{ dimension: 'query', operator: 'contains', expression: 'jacir' }] }] }),
  ]);
  const tot = (r) => (r.rows && r.rows[0]) || { clicks: 0, impressions: 0 };
  return {
    top: (top.rows || []).map((r) => [r.keys[0], r.clicks, r.impressions, r.position]),
    marca90: { impressoes: tot(marca1).impressions + tot(marca2).impressions, cliques: tot(marca1).clicks + tot(marca2).clicks },
  };
}

async function tentar(fn, erros, chave) {
  try { return await fn(); } catch (e) { erros[chave] = String(e.message || e); return null; }
}

export default async (req) => {
  if (!(await sessaoValida(req))) return json({ erro: 'sem_sessao' }, 401);

  const url = new URL(req.url);
  const periodo = url.searchParams.get('periodo') || '30';
  const conexoes = {
    ga4: Boolean(env('GA4_PROPERTY_ID') && env('GOOGLE_SERVICE_ACCOUNT_JSON')),
    searchConsole: Boolean(env('GOOGLE_SERVICE_ACCOUNT_JSON')),
    instagram: false,
    instagramApp: Boolean(env('INSTAGRAM_APP_ID') && env('INSTAGRAM_APP_SECRET')),
    alerts: Boolean(env('ALERTS_FEED_URLS')),
  };

  const chaveCache = `${periodo}`;
  const emCache = cache.get(chaveCache);
  const agoraSo = url.searchParams.get('so') === 'agora';

  if (agoraSo) {
    const erros = {};
    const agora = conexoes.ga4 ? await tentar(dadosAgora, erros, 'agora') : null;
    return json({ agora, erros });
  }
  if (emCache && Date.now() - emCache.em < CACHE_MS && url.searchParams.get('novo') !== '1') return json(emCache.dados);

  const P = periodos(periodo);
  const erros = {};
  const saida = { conexoes, periodo, geradoEm: new Date().toISOString(), hoje: ymd(P.hoje), diasSerie: DIAS_SERIE, erros };

  const tarefas = [];
  if (conexoes.ga4) {
    tarefas.push(tentar(() => dadosSite(P), erros, 'ga4').then((v) => { if (v) saida.site = v; }));
    tarefas.push(tentar(() => dadosPaginasEBlog(P), erros, 'blog').then((v) => { if (v) { saida.paginas = v.paginas; saida.blog = v.blog; saida.vindosDoInstagram = v.vindosDoInstagram; } }));
    tarefas.push(tentar(dadosAgora, erros, 'agora').then((v) => { if (v) saida.agora = v; }));
    tarefas.push(tentar(() => dadosReferencias(P), erros, 'referencias').then((v) => { if (v) saida.referencias = v; }));
  }
  if (conexoes.searchConsole) tarefas.push(tentar(() => dadosBuscas(P), erros, 'searchConsole').then((v) => { if (v) saida.buscas = v; }));
  tarefas.push(tentar(() => dadosInstagram(periodo, DIAS_SERIE), erros, 'instagram').then((v) => { if (v) { saida.instagram = v; conexoes.instagram = Boolean(v.conectado); } }));
  await Promise.all(tarefas);

  saida.demo = !saida.site;
  if (!Object.keys(erros).length) cache.set(chaveCache, { em: Date.now(), dados: saida });
  return json(saida);
};

export const config = { path: '/api/painel/dados' };
