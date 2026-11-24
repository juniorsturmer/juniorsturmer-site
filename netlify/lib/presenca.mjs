// Presença: menções ao nome vindas do Google Alerts (feeds RSS/Atom) e cadastradas à mão.
// Tudo fica no Netlify Blobs, numa lista só: cada item é "novo" (para revisar), "confirmado" ou "descartado".
import { getStore } from '@netlify/blobs';
import { env } from './sessao.mjs';

const loja = () => getStore({ name: 'painel-presenca', consistency: 'strong' });

export const TIPOS = {
  portal: { nome: 'Portal ou jornal', pontos: 5 },
  entrevista: { nome: 'Entrevista', pontos: 4 },
  podcast: { nome: 'Podcast', pontos: 4 },
  palestra: { nome: 'Palestra', pontos: 4 },
  artigo: { nome: 'Artigo assinado', pontos: 4 },
  blog: { nome: 'Blog de nicho', pontos: 2 },
  social: { nome: 'Post de terceiros', pontos: 1 },
};
export const MARCOS = ['entrevista', 'palestra'];

// domínios que são canais seus: não contam como menção de fora
const PROPRIOS = [/(^|\.)juniorsturmer\.com\.br$/i];
const PERFIS_PROPRIOS = [/instagram\.com\/juniorsturmer(\/|$)/i];

const DIA = 864e5;
const GUARDA_DESCARTADOS = 180 * DIA;

export function feeds() {
  return String(env('ALERTS_FEED_URLS') || '')
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => /^https:\/\/www\.google\.[a-z.]+\/alerts\/feeds\//i.test(s));
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '-', mdash: '-', laquo: '«', raquo: '»', ldquo: '"', rdquo: '"', lsquo: "'", rsquo: "'", ordf: 'ª', ordm: 'º' };
// acentos do português e do espanhol: aacute, Atilde, ccedil...
for (const [sufixo, marca] of [['acute', '\u0301'], ['grave', '\u0300'], ['tilde', '\u0303'], ['circ', '\u0302'], ['uml', '\u0308'], ['cedil', '\u0327']]) {
  for (const l of 'aeioucnyAEIOUCNY') ENT[`${l}${sufixo}`] = `${l}${marca}`.normalize('NFC');
}
function decodificar(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, e) => {
      if (e[0] === '#') { const c = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(c) ? String.fromCodePoint(c) : m; }
      return ENT[e] ?? ENT[e.toLowerCase()] ?? m;
    });
}
const semTags = (s) => decodificar(decodificar(s)).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const tag = (xml, nome) => { const m = xml.match(new RegExp(`<${nome}\\b[^>]*>([\\s\\S]*?)</${nome}>`, 'i')); return m ? m[1] : ''; };

function urlFinal(href) {
  try {
    const u = new URL(decodificar(href));
    if (/google\./i.test(u.hostname) && u.pathname === '/url') return u.searchParams.get('url') || u.searchParams.get('q') || u.href;
    return u.href;
  } catch { return ''; }
}
function normalizar(link) {
  try {
    const u = new URL(link);
    u.hash = '';
    [...u.searchParams.keys()].filter((k) => /^(utm_|fbclid|gclid|ref$)/i.test(k)).forEach((k) => u.searchParams.delete(k));
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}${u.search}`.toLowerCase();
  } catch { return link; }
}
async function hash(texto) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(b)].slice(0, 9).map((x) => x.toString(16).padStart(2, '0')).join('');
}
const dominio = (link) => { try { return new URL(link).hostname.replace(/^www\./, ''); } catch { return ''; } };
const proprio = (link) => PROPRIOS.some((r) => r.test(dominio(link))) || PERFIS_PROPRIOS.some((r) => r.test(link));

export function lerFeed(xml) {
  const alerta = semTags(tag(xml, 'title')).replace(/^(Alerta do Google|Google Alert)\s*[-–]\s*/i, '');
  const itens = [];
  for (const m of xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)) {
    const e = m[0];
    const href = (e.match(/<link\b[^>]*href="([^"]+)"/i) || [])[1] || '';
    const link = urlFinal(href);
    if (!link) continue;
    itens.push({
      titulo: semTags(tag(e, 'title')).slice(0, 220),
      trecho: semTags(tag(e, 'content')).slice(0, 320),
      link,
      data: (tag(e, 'published') || tag(e, 'updated') || '').trim().slice(0, 10),
      alerta,
    });
  }
  return itens;
}

export async function lerItens() {
  const s = await loja().get('itens', { type: 'json' });
  return s && typeof s === 'object' ? s : {};
}
async function salvarItens(itens) {
  const agora = Date.now();
  for (const [k, v] of Object.entries(itens)) {
    if (v.estado === 'descartado' && agora - (v.mudouEm || v.achadoEm || 0) > GUARDA_DESCARTADOS) delete itens[k];
  }
  await loja().setJSON('itens', itens);
}

export async function coletarAlerts() {
  const lista = feeds();
  const coleta = { em: Date.now(), feeds: lista.length, novos: 0, erros: {} };
  if (!lista.length) { await loja().setJSON('coleta', coleta); return coleta; }
  const itens = await lerItens();
  for (const [k, url] of lista.entries()) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (painel juniorsturmer.com.br)', Accept: 'application/atom+xml, application/xml, text/xml' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      for (const it of lerFeed(await r.text())) {
        const id = await hash(normalizar(it.link));
        if (itens[id]) continue;
        const meu = proprio(it.link);
        itens[id] = { id, ...it, fonte: dominio(it.link), origem: 'alerts', estado: meu ? 'descartado' : 'novo', motivo: meu ? 'canal próprio' : undefined, achadoEm: Date.now() };
        if (!meu) coleta.novos += 1;
      }
    } catch (e) {
      coleta.erros[`feed ${k + 1}`] = String(e.message || e);
    }
  }
  await salvarItens(itens);
  await loja().setJSON('coleta', coleta);
  return coleta;
}

export async function marcar(id, { estado, tipo, marco }) {
  const itens = await lerItens();
  const it = itens[id];
  if (!it) throw new Error('Menção não encontrada');
  if (!['novo', 'confirmado', 'descartado'].includes(estado)) throw new Error('Estado inválido');
  if (estado === 'confirmado' && !TIPOS[tipo]) throw new Error('Escolha o tipo');
  if (estado === 'novo' && it.origem === 'manual') { delete itens[id]; await salvarItens(itens); return; }
  Object.assign(it, { estado, mudouEm: Date.now() });
  if (estado === 'confirmado') { it.tipo = tipo; it.marco = MARCOS.includes(marco) ? marco : undefined; } else { delete it.tipo; delete it.marco; }
  await salvarItens(itens);
}

export async function cadastrar({ titulo, link, data, tipo, marco, fonte }) {
  titulo = String(titulo || '').trim().slice(0, 220);
  if (!titulo) throw new Error('Falta o título');
  if (!TIPOS[tipo]) throw new Error('Escolha o tipo');
  link = String(link || '').trim();
  if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
  if (link) { try { new URL(link); } catch { throw new Error('Link inválido'); } }
  data = /^\d{4}-\d{2}-\d{2}$/.test(String(data)) ? data : new Date().toISOString().slice(0, 10);
  const itens = await lerItens();
  const id = await hash(link ? normalizar(link) : `manual|${titulo}|${data}`);
  itens[id] = { id, titulo, link, data, fonte: String(fonte || '').trim().slice(0, 80) || dominio(link), trecho: '', origem: 'manual', estado: 'confirmado', tipo, marco: MARCOS.includes(marco) ? marco : undefined, achadoEm: Date.now(), mudouEm: Date.now() };
  await salvarItens(itens);
}

// o que o painel recebe
export async function dadosPresenca() {
  const lista = feeds();
  const [itens, coleta] = await Promise.all([lerItens(), loja().get('coleta', { type: 'json' })]);
  const todos = Object.values(itens).sort((a, b) => String(b.data).localeCompare(String(a.data)) || (b.achadoEm || 0) - (a.achadoEm || 0));
  const limpo = (x) => ({ id: x.id, titulo: x.titulo, link: x.link, fonte: x.fonte, data: x.data, trecho: x.trecho, alerta: x.alerta, origem: x.origem, tipo: x.tipo, marco: x.marco });
  return {
    conectado: lista.length > 0,
    feeds: lista.length,
    coleta: coleta || null,
    tipos: TIPOS,
    revisar: todos.filter((x) => x.estado === 'novo').slice(0, 60).map(limpo),
    confirmadas: todos.filter((x) => x.estado === 'confirmado').map(limpo),
    descartadas: todos.filter((x) => x.estado === 'descartado').length,
  };
}

// coleta junto com a abertura do painel quando a última passou de 6 h
export async function coletarSeVelho() {
  if (!feeds().length) return;
  const c = await loja().get('coleta', { type: 'json' });
  if (!c || Date.now() - c.em > 6 * 36e5) await coletarAlerts();
}
