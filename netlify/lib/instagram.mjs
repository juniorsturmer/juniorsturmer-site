// Instagram do painel /metricas: Login do Facebook para Empresas (OAuth), token guardado no Netlify Blobs
// e coleta dos dados (perfil, insights da conta, posts, reels e stories).
// Ninguém copia token: o painel recebe a permissão direto da Meta. O token da Página
// gerado a partir de um token de usuário de longa duração não expira.
import { getStore } from '@netlify/blobs';
import { env, assinarTexto } from './sessao.mjs';

const VERSAO = 'v25.0';
const GRAPH = `https://graph.facebook.com/${VERSAO}`;
export const REDIRECT = 'https://juniorsturmer.com.br/api/painel/instagram/retorno';
// Só esta conta pode ser ligada ao painel. Qualquer outra é recusada e os dados dela são apagados.
export const CONTA = () => String(env('IG_USERNAME') || 'juniorsturmer').toLowerCase().replace(/^@/, '');
const CHAVES = ['token', 'perfil', 'seguidores', 'serie', 'periodos', 'meses', 'midias', 'stories', 'coleta', 'token-invalido'];
export async function apagarTudo() { await Promise.all(CHAVES.map((k) => loja().delete(k))); }
const contaCerta = (t) => t && String(t.usuario || '').toLowerCase() === CONTA();

export const loja = () => getStore({ name: 'painel-instagram', consistency: 'strong' });
const lerJSON = async (k, padrao) => (await loja().get(k, { type: 'json' })) ?? padrao;
const salvarJSON = (k, v) => loja().setJSON(k, v);

// ---------- datas (São Paulo, UTC-3 o ano todo) ----------
export function hojeSP() {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [a, m, d] = p.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}
export const ymd = (d) => d.toISOString().slice(0, 10);
export const menos = (d, dias) => new Date(d.getTime() - dias * 864e5);
const inicioDiaSP = (d) => Math.floor(d.getTime() / 1000) + 3 * 3600; // 00:00 em São Paulo
const diaSP = (iso) => ymd(new Date(new Date(iso).getTime() - 3 * 3600 * 1000));
const horaSP = (iso) => new Date(new Date(iso).getTime() - 3 * 3600 * 1000).getUTCHours();
// sobe quando a lista de métricas por post muda: força uma nova leitura de todos os posts guardados
const VERSAO_METRICAS = 2;

export function periodosPainel() {
  const hoje = hojeSP();
  const n = (q) => ({ atual: [menos(hoje, q - 1), hoje], ant: [menos(hoje, 2 * q - 1), menos(hoje, q)] });
  const dia = hoje.getUTCDate();
  const iniMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));
  const iniAnt = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 1, 1));
  const ultAnt = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 0)).getUTCDate();
  return {
    7: n(7), 30: n(30), 90: n(90),
    mes: { atual: [iniMes, hoje], ant: [iniAnt, new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 1, Math.min(dia, ultAnt)))] },
  };
}

// ---------- chamadas à API ----------
async function ig(caminho, params, token) {
  const u = new URL(caminho.startsWith('http') ? caminho : `${GRAPH}/${caminho}`);
  for (const [k, v] of Object.entries(params || {})) if (v !== undefined) u.searchParams.set(k, v);
  if (token) u.searchParams.set('access_token', token);
  const r = await fetch(u);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) {
    const msg = (j.error && (j.error.error_user_msg || j.error.message)) || `HTTP ${r.status}`;
    if (j.error && j.error.code === 190) await salvarJSON('token-invalido', { em: Date.now(), msg });
    throw new Error(msg);
  }
  return j;
}

// ---------- login (OAuth) ----------
export function urlAutorizacao(state) {
  const u = new URL(`https://www.facebook.com/${VERSAO}/dialog/oauth`);
  u.searchParams.set('client_id', env('META_APP_ID'));
  u.searchParams.set('redirect_uri', REDIRECT);
  u.searchParams.set('config_id', env('META_CONFIG_ID'));
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('override_default_response_type', 'true');
  u.searchParams.set('state', state);
  return u.toString();
}

export async function trocarCodigo(code) {
  const segredo = env('META_APP_SECRET');
  if (!segredo) throw new Error('META_APP_SECRET não configurada no Netlify');
  const app = env('META_APP_ID');
  const curto = await ig('oauth/access_token', { client_id: app, client_secret: segredo, redirect_uri: REDIRECT, code });
  const longo = await ig('oauth/access_token', { grant_type: 'fb_exchange_token', client_id: app, client_secret: segredo, fb_exchange_token: curto.access_token });
  const paginas = await ig('me/accounts', { fields: 'id,name,access_token,instagram_business_account{id,username}', limit: 50 }, longo.access_token);
  const pagina = (paginas.data || []).find((p) => p.instagram_business_account && String(p.instagram_business_account.username || '').toLowerCase() === CONTA());
  await apagarTudo();
  if (!pagina) throw new Error(`A Página ligada ao @${CONTA()} não foi autorizada. Conecte de novo e, na tela da Meta, marque só a Página do @${CONTA()}.`);
  const dados = {
    token: pagina.access_token, // token da Página: não expira
    expiraEm: null,
    criadoEm: Date.now(),
    id: pagina.instagram_business_account.id,
    usuario: pagina.instagram_business_account.username,
    pagina: { id: pagina.id, nome: pagina.name },
  };
  await salvarJSON('token', dados);
  return dados;
}

export async function lerToken() { return lerJSON('token', null); }

// ---------- insights da conta ----------
// janelas de no máximo 30 dias, que é o limite da API
function janelas(ini, fim) {
  const out = [];
  let a = ini;
  while (a <= fim) {
    const b = new Date(Math.min(fim.getTime(), a.getTime() + 29 * 864e5));
    out.push([inicioDiaSP(a), inicioDiaSP(b) + 86400]);
    a = new Date(b.getTime() + 864e5);
  }
  return out;
}

const TOTAIS = ['reach', 'views', 'total_interactions', 'likes', 'comments', 'shares', 'saves', 'profile_links_taps', 'accounts_engaged'];

async function totaisJanela(t, since, until, erros) {
  const out = {};
  const ler = (j) => { for (const d of j.data || []) out[d.name] = (d.total_value && d.total_value.value) || 0; };
  try {
    ler(await ig(`${t.id}/insights`, { metric: TOTAIS.join(','), period: 'day', metric_type: 'total_value', since, until }, t.token));
  } catch (e) {
    // se alguma métrica não for aceita, pede uma por uma para salvar as outras
    for (const m of TOTAIS) {
      try { ler(await ig(`${t.id}/insights`, { metric: m, period: 'day', metric_type: 'total_value', since, until }, t.token)); }
      catch (e2) { erros[`conta:${m}`] = e2.message; }
    }
  }
  const quebra = async (metric) => {
    try {
      const j = await ig(`${t.id}/insights`, { metric, period: 'day', metric_type: 'total_value', breakdown: 'follow_type', since, until }, t.token);
      const res = {};
      const b = j.data && j.data[0] && j.data[0].total_value && j.data[0].total_value.breakdowns && j.data[0].total_value.breakdowns[0];
      for (const r of (b && b.results) || []) res[r.dimension_values[0]] = r.value;
      return res;
    } catch (e) { erros[`conta:${metric}:follow_type`] = e.message; return null; }
  };
  const alc = await quebra('reach');
  const seg = await quebra('follows_and_unfollows');
  if (alc) out.reach_nao_seguidores = alc.NON_FOLLOWER || 0;
  if (seg) { out.follows = seg.FOLLOWER || 0; out.unfollows = seg.NON_FOLLOWER || 0; }
  return out;
}

async function totaisPeriodo(t, ini, fim, erros) {
  const soma = {};
  for (const [s, u] of janelas(ini, fim)) {
    const r = await totaisJanela(t, s, u, erros);
    for (const [k, v] of Object.entries(r)) soma[k] = (soma[k] || 0) + v;
  }
  return soma;
}

// ---------- mídias ----------
const CAMPOS_MIDIA = 'id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count';
const METRICAS = {
  FEED: ['reach', 'views', 'saved', 'shares', 'likes', 'comments', 'total_interactions', 'follows', 'profile_visits'],
  REELS: ['reach', 'views', 'saved', 'shares', 'likes', 'comments', 'total_interactions', 'ig_reels_avg_watch_time'],
  STORY: ['reach', 'views', 'replies', 'shares', 'follows', 'profile_visits', 'total_interactions'],
};

async function insightsMidia(t, m, tipo, erros) {
  const out = {};
  const ler = (j) => { for (const d of j.data || []) out[d.name] = (d.values && d.values[0] && d.values[0].value) ?? (d.total_value && d.total_value.value) ?? 0; };
  try { ler(await ig(`${m.id}/insights`, { metric: METRICAS[tipo].join(',') }, t.token)); }
  catch (e) {
    for (const met of METRICAS[tipo]) {
      try { ler(await ig(`${m.id}/insights`, { metric: met }, t.token)); } catch (e2) { /* métrica indisponível para esta mídia */ }
    }
    if (!Object.keys(out).length) erros[`midia:${m.id}`] = e.message;
  }
  if (tipo === 'REELS') {
    // pedidas uma a uma: são métricas novas ou nem sempre aceitas em reels, e uma recusa não pode derrubar as outras
    for (const met of ['reels_skip_rate', 'ig_reels_video_view_total_time', 'follows', 'profile_visits']) {
      try { ler(await ig(`${m.id}/insights`, { metric: met }, t.token)); } catch (e) { /* indisponível para este reel */ }
    }
  }
  if (tipo === 'STORY') {
    try {
      const j = await ig(`${m.id}/insights`, { metric: 'navigation', breakdown: 'story_navigation_action_type' }, t.token);
      const b = j.data && j.data[0] && j.data[0].total_value && j.data[0].total_value.breakdowns && j.data[0].total_value.breakdowns[0];
      out.navegacao = {};
      for (const r of (b && b.results) || []) out.navegacao[r.dimension_values[0]] = r.value;
    } catch (e) { /* stories com poucas visualizações não retornam */ }
  }
  return out;
}

async function emLotes(itens, n, fn) {
  for (let i = 0; i < itens.length; i += n) await Promise.all(itens.slice(i, i + n).map(fn));
}

const tipoMidia = (m) => (m.media_product_type === 'REELS' ? 'REELS' : m.media_product_type === 'STORY' ? 'STORY' : 'FEED');
const formato = (m) => (m.media_product_type === 'REELS' ? 'reel' : m.media_product_type === 'STORY' ? 'story' : m.media_type === 'CAROUSEL_ALBUM' ? 'carrossel' : 'estatico');

// ---------- coleta (de hora em hora e logo depois de conectar) ----------
export async function coletar() {
  let t = await lerToken();
  if (!t) return { ok: false, motivo: 'sem_token' };
  if (!contaCerta(t)) { await apagarTudo(); return { ok: false, motivo: 'conta_errada_apagada' }; }
  const erros = {};
  const agora = Date.now();
  const hoje = hojeSP();

  // perfil e foto diária dos seguidores
  const perfil = await ig(t.id, { fields: 'id,username,followers_count,follows_count,media_count,profile_picture_url' }, t.token);
  await salvarJSON('perfil', { usuario: perfil.username, seguidores: perfil.followers_count, seguindo: perfil.follows_count, posts: perfil.media_count, foto: perfil.profile_picture_url, em: agora });
  const fotos = await lerJSON('seguidores', {});
  fotos[ymd(hoje)] = perfil.followers_count;
  await salvarJSON('seguidores', fotos);

  // série diária: alcance e novos seguidores (últimos 30 dias, somados ao histórico guardado)
  const serie = await lerJSON('serie', {});
  const [s30, u30] = [inicioDiaSP(menos(hoje, 29)), inicioDiaSP(hoje) + 86400];
  const lerSerie = async (metric, campo) => {
    try {
      const j = await ig(`${t.id}/insights`, { metric, period: 'day', metric_type: 'time_series', since: s30, until: u30 }, t.token);
      for (const v of (j.data && j.data[0] && j.data[0].values) || []) {
        const d = diaSP(new Date(new Date(v.end_time).getTime() - 864e5).toISOString());
        serie[d] = { ...(serie[d] || {}), [campo]: v.value };
      }
    } catch (e) { erros[`serie:${metric}`] = e.message; }
  };
  await lerSerie('reach', 'alcance');
  await lerSerie('follower_count', 'novos');
  const limite = ymd(menos(hoje, 220));
  for (const d of Object.keys(serie)) if (d < limite) delete serie[d];
  await salvarJSON('serie', serie);

  // totais da conta por período do painel (90 dias recalcula a cada 6 h)
  const periodos = await lerJSON('periodos', {});
  for (const [k, p] of Object.entries(periodosPainel())) {
    const velho = !periodos[k] || agora - periodos[k].em > (k === '90' ? 6 : 1) * 3600e3 || periodos[k].dia !== ymd(hoje);
    if (!velho) continue;
    periodos[k] = { em: agora, dia: ymd(hoje), atual: await totaisPeriodo(t, p.atual[0], p.atual[1], erros), ant: await totaisPeriodo(t, p.ant[0], p.ant[1], erros) };
  }
  await salvarJSON('periodos', periodos);

  // seguidores líquidos dos 3 meses anteriores (para a meta), 1 vez por dia
  const meses = await lerJSON('meses', {});
  if (meses.dia !== ymd(hoje)) {
    const lista = [];
    for (let m = 1; m <= 3; m++) {
      const ini = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - m, 1));
      const fim = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - m + 1, 0));
      const r = await totaisPeriodo(t, ini, fim, erros);
      lista.push({ mes: ymd(ini).slice(0, 7), follows: r.follows || 0, unfollows: r.unfollows || 0, liquidos: (r.follows || 0) - (r.unfollows || 0) });
    }
    await salvarJSON('meses', { dia: ymd(hoje), lista });
  }

  // posts e reels dos últimos 200 dias
  const midias = await lerJSON('midias', {});
  const corte = agora - 200 * 864e5;
  let url = `${t.id}/media`, params = { fields: CAMPOS_MIDIA, limit: 50 }, paginas = 0;
  const vistos = [];
  while (url && paginas < 5) {
    const j = await ig(url, params, url.startsWith('http') ? undefined : t.token);
    paginas++;
    let parar = false;
    for (const m of j.data || []) {
      if (new Date(m.timestamp).getTime() < corte) { parar = true; break; }
      vistos.push(m);
    }
    url = !parar && j.paging && j.paging.next; params = {};
  }
  const atualizar = vistos.filter((m) => {
    const ant = midias[m.id];
    const idade = agora - new Date(m.timestamp).getTime();
    if (!ant || !ant.insights || ant.vm !== VERSAO_METRICAS) return true;
    const desde = agora - (ant.em || 0);
    return idade < 7 * 864e5 ? desde > 3600e3 : idade < 60 * 864e5 ? desde > 24 * 3600e3 : desde > 7 * 24 * 3600e3;
  });
  await emLotes(atualizar, 5, async (m) => {
    midias[m.id] = { ...m, formato: formato(m), dia: diaSP(m.timestamp), insights: await insightsMidia(t, m, tipoMidia(m), erros), em: agora, vm: VERSAO_METRICAS };
  });
  for (const m of vistos) if (midias[m.id] && !atualizar.includes(m)) Object.assign(midias[m.id], { caption: m.caption, thumbnail_url: m.thumbnail_url, media_url: m.media_url, like_count: m.like_count, comments_count: m.comments_count });
  for (const [id, m] of Object.entries(midias)) if (new Date(m.timestamp).getTime() < corte) delete midias[id];
  await salvarJSON('midias', midias);

  // stories (a Meta só libera por 24 h, por isso a coleta é de hora em hora)
  const stories = await lerJSON('stories', {});
  try {
    const j = await ig(`${t.id}/stories`, { fields: 'id,media_type,media_product_type,timestamp,permalink,thumbnail_url,media_url' }, t.token);
    await emLotes(j.data || [], 5, async (s) => {
      const ins = await insightsMidia(t, { ...s, media_product_type: 'STORY' }, 'STORY', erros);
      if (Object.keys(ins).length) stories[s.id] = { id: s.id, timestamp: s.timestamp, dia: diaSP(s.timestamp), media_type: s.media_type, insights: ins, em: agora };
    });
  } catch (e) { erros.stories = e.message; }
  for (const [id, s] of Object.entries(stories)) if (new Date(s.timestamp).getTime() < agora - 200 * 864e5) delete stories[id];
  await salvarJSON('stories', stories);

  if (!contaCerta(await lerToken())) { await apagarTudo(); return { ok: false, motivo: 'conta_trocada' }; }
  await salvarJSON('coleta', { em: agora, erros, usuario: perfil.username });
  return { ok: true, erros };
}

// Dispara a coleta na função em segundo plano (responde 202 na hora e roda até 15 min)
export async function dispararColeta(origem) {
  const ts = String(Date.now());
  const sig = await assinarTexto(`coleta-ig|${ts}`);
  const r = await fetch(`${origem}/api/painel/instagram/coleta-bg`, { method: 'POST', headers: { 'x-painel-ts': ts, 'x-painel-sig': sig } }).catch((e) => ({ status: String(e.message) }));
  return r.status;
}

// ---------- leitura para o painel ----------
export async function dadosPainel(periodo, diasSerie) {
  const t = await lerToken();
  if (!t) return { conectado: false };
  if (!contaCerta(t)) { await apagarTudo(); return { conectado: false, contaErradaApagada: true }; }
  const [perfil, periodos, serie, midias, stories, meses, coleta] = await Promise.all([
    lerJSON('perfil', null), lerJSON('periodos', {}), lerJSON('serie', {}), lerJSON('midias', {}), lerJSON('stories', {}), lerJSON('meses', null), lerJSON('coleta', null),
  ]);
  if ((perfil && String(perfil.usuario || '').toLowerCase() !== CONTA()) || (coleta && coleta.usuario && String(coleta.usuario).toLowerCase() !== CONTA())) {
    await Promise.all(CHAVES.filter((k) => k !== 'token').map((k) => loja().delete(k)));
    return { conectado: true, usuario: t.usuario, perfil: null, periodo: null, mes: null, serie: { alcance: [], novos: [] }, midias: [], stories: [], meses: null, coleta: null };
  }
  const hoje = hojeSP();
  const dias = Array.from({ length: diasSerie }, (_, k) => ymd(menos(hoje, diasSerie - 1 - k)));
  const corte = ymd(menos(hoje, 200));
  const enxuta = (m) => {
    const legenda = m.caption || '';
    const gancho = legenda.split('\n').map((l) => l.trim()).find(Boolean) || '';
    return {
      id: m.id, formato: m.formato, dia: m.dia, hora: m.timestamp ? horaSP(m.timestamp) : null, link: m.permalink, thumb: m.thumbnail_url || m.media_url || null,
      texto: gancho.slice(0, 140), legenda: legenda.length, hashtags: (legenda.match(/#[\p{L}\p{N}_]+/gu) || []).length, i: m.insights || {},
    };
  };
  return {
    conectado: true,
    usuario: t.usuario,
    expiraEm: t.expiraEm,
    perfil,
    periodo: periodos[periodo] || null,
    mes: periodos.mes || null,
    serie: { alcance: dias.map((d) => (serie[d] && serie[d].alcance) || 0), novos: dias.map((d) => (serie[d] && serie[d].novos) || 0) },
    midias: Object.values(midias).filter((m) => m.dia >= corte).map(enxuta),
    stories: Object.values(stories).filter((s) => s.dia >= corte).map((s) => ({ id: s.id, dia: s.dia, i: s.insights || {} })),
    meses: meses && meses.lista,
    coleta,
  };
}
