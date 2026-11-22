// Gerador do blog "Além do Logo" | juniorsturmer.com.br
// Roda no Netlify a cada publicação (npm run build).
// Lê os artigos em conteudo/blog/*.md e monta o site final na pasta _site.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import yaml from 'js-yaml';
import { marked } from 'marked';

let sharp = null;
try { sharp = (await import('sharp')).default; } catch (e) { console.warn('[blog] sharp indisponível, imagens seguem sem otimização'); }

const ROOT = process.cwd();
const OUT = path.join(ROOT, '_site');
const POSTS_DIR = path.join(ROOT, 'conteudo', 'blog');
const SITE = 'https://juniorsturmer.com.br';
const CFG = {
  nome: 'Além do Logo',
  base: '/blog/',
  newsletter: 'https://www.linkedin.com/build-relation/newsletter-follow?entityUrn=7515239013696385024',
  descricao: 'Blog de Junior Sturmer sobre marca, posicionamento e estratégia para quem lidera empresas.',
  porPagina: 9,
  categorias: ['Branding', 'Posicionamento', 'Estratégia', 'Identidade visual', 'Negócios', 'Bastidores'],
};

// ---------- utilidades ----------
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const iso = (d) => d.toISOString().slice(0, 10);
const dataCurta = (d) => `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const dataLonga = (d) => `${d.getUTCDate()} de ${MESES_LONGOS[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
const write = (rel, html) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
const nbspLast = (s) => esc(s).replace(/ (\S+)$/, '&nbsp;$1');

function parseDate(v) {
  if (v instanceof Date && !isNaN(v)) return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
  const m = String(v || '').match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return null;
}
const truthy = (v, def) => (v === undefined || v === null || v === '' ? def : v === true || v === 'true' || v === 'sim');

// ---------- 1. copia o site estático para _site ----------
const PULAR = new Set(['.git', 'node_modules', '_site', 'conteudo', 'ferramentas', 'juniorsturmer-site', 'package.json', 'package-lock.json', 'netlify.toml', 'README.md']);
function copiar(dir, rel = '') {
  for (const nome of fs.readdirSync(dir)) {
    if (PULAR.has(nome) && rel === '') continue;
    if (nome.startsWith('.') && nome !== '.well-known') continue;
    const src = path.join(dir, nome);
    const dst = path.join(OUT, rel, nome);
    if (fs.statSync(src).isDirectory()) { fs.mkdirSync(dst, { recursive: true }); copiar(src, path.join(rel, nome)); }
    else fs.copyFileSync(src, dst);
  }
}
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
copiar(ROOT);

// ---------- 2. lê os artigos ----------
function lerArtigo(arquivo) {
  const bruto = fs.readFileSync(path.join(POSTS_DIR, arquivo), 'utf8').replace(/^﻿/, '');
  const m = bruto.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
  const fm = m ? (yaml.load(m[1]) || {}) : {};
  const corpo = m ? m[2] : bruto;
  const slug = slugify(arquivo.replace(/\.md$/i, '').replace(/^\d{4}-\d{2}-\d{2}-/, ''));
  const data = parseDate(fm.data) || new Date(fs.statSync(path.join(POSTS_DIR, arquivo)).mtime);
  const titulo = String(fm.titulo || slug).trim();
  const palavras = corpo.replace(/<[^>]+>/g, ' ').replace(/[#>*_`\[\]()!-]/g, ' ').split(/\s+/).filter(Boolean).length;
  const categoria = String(fm.categoria || 'Branding').trim();
  return {
    arquivo, slug, titulo, data,
    resumo: String(fm.resumo || '').replace(/\s+/g, ' ').trim(),
    categoria, catSlug: slugify(categoria),
    capa: fm.capa ? String(fm.capa).trim() : '',
    capaAlt: String(fm.capa_alt || titulo).trim(),
    destaque: truthy(fm.destaque, false),
    publicado: truthy(fm.publicado, true) && !truthy(fm.rascunho, false),
    linkedin: fm.linkedin ? String(fm.linkedin).trim() : '',
    seoTitulo: fm.seo_titulo ? String(fm.seo_titulo).trim() : '',
    leitura: Math.max(1, Math.round(palavras / 200)),
    corpo,
    url: `${CFG.base}${slug}/`,
  };
}

const artigos = (fs.existsSync(POSTS_DIR) ? fs.readdirSync(POSTS_DIR) : [])
  .filter((f) => f.toLowerCase().endsWith('.md'))
  .map(lerArtigo)
  .filter((a) => a.publicado)
  .sort((a, b) => b.data - a.data || a.titulo.localeCompare(b.titulo, 'pt-BR'));

// slugs repetidos ganham sufixo
const vistos = {};
for (const a of artigos) { if (vistos[a.slug]) { a.slug = `${a.slug}-${++vistos[a.slug]}`; a.url = `${CFG.base}${a.slug}/`; } else vistos[a.slug] = 1; }

// ---------- 3. imagens: versões leves em webp ----------
const cacheImg = new Map();
async function imagem(src, larguras = [480, 960, 1600]) {
  if (!src) return null;
  if (cacheImg.has(src)) return cacheImg.get(src);
  let res = { src, srcset: '', w: 1600, h: 1000 };
  const local = src.startsWith('/') ? path.join(ROOT, decodeURI(src)) : null;
  if (local && !fs.existsSync(local)) { console.warn('[blog] imagem não encontrada:', src); cacheImg.set(src, null); return null; }
  if (sharp && local && fs.existsSync(local)) {
    try {
      const meta = await sharp(local).metadata();
      const hash = crypto.createHash('md5').update(src + fs.statSync(local).size).digest('hex').slice(0, 8);
      const base = slugify(path.basename(local).replace(/\.[^.]+$/, '')).slice(0, 50) + '-' + hash;
      const usadas = larguras.filter((w) => w < meta.width).concat(meta.width > 1600 ? [] : [meta.width]);
      const lista = [...new Set(usadas.map((w) => Math.min(w, 1600)))].sort((x, y) => x - y);
      for (const w of lista) {
        const rel = `blog/img/${base}-${w}.webp`;
        if (!fs.existsSync(path.join(OUT, rel))) {
          fs.mkdirSync(path.join(OUT, 'blog/img'), { recursive: true });
          await sharp(local).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(OUT, rel));
        }
      }
      const maior = lista[lista.length - 1];
      res = {
        src: `/blog/img/${base}-${maior}.webp`,
        srcset: lista.map((w) => `/blog/img/${base}-${w}.webp ${w}w`).join(', '),
        w: maior, h: Math.round((meta.height / meta.width) * maior), local, base,
      };
    } catch (e) { console.warn('[blog] falha ao otimizar', src, e.message); }
  }
  cacheImg.set(src, res);
  return res;
}
async function og(artigo) {
  if (!sharp || !artigo.capa) return `${SITE}/assets/og.jpg`;
  const local = path.join(ROOT, decodeURI(artigo.capa));
  if (!fs.existsSync(local)) return `${SITE}/assets/og.jpg`;
  const rel = `blog/og/${artigo.slug}.jpg`;
  fs.mkdirSync(path.join(OUT, 'blog/og'), { recursive: true });
  await sharp(local).rotate().resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(OUT, rel));
  return `${SITE}/${rel}`;
}
function picture(img, alt, cls, sizes, eager) {
  if (!img) return `<div class="${cls} sem-capa" aria-hidden="true"><span>${esc(CFG.nome)}</span></div>`;
  return `<picture class="${cls}"><img src="${esc(img.src)}"${img.srcset ? ` srcset="${esc(img.srcset)}" sizes="${sizes}"` : ''} width="${img.w}" height="${img.h}" alt="${esc(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"'}></picture>`;
}

// ---------- 4. markdown -> html ----------
marked.setOptions({ gfm: true, breaks: false });
async function corpoHtml(md) {
  let html = marked.parse(md);
  html = html.replace(/<h1(\s|>)/g, '<h2$1').replace(/<\/h1>/g, '</h2>');
  const ids = {};
  html = html.replace(/<h2>([\s\S]*?)<\/h2>/g, (_, t) => {
    let id = slugify(t.replace(/<[^>]+>/g, '')) || 'secao';
    if (ids[id]) id += '-' + (++ids[id]); else ids[id] = 1;
    return `<h2 id="${id}">${t}</h2>`;
  });
  html = html.replace(/<a href="(https?:\/\/(?!juniorsturmer\.com\.br)[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener"');
  // imagens do corpo: versões leves, carregamento preguiçoso
  const imgs = [...html.matchAll(/<img\s[^>]*src="([^"]+)"[^>]*>/g)];
  for (const [tag, src] of imgs) {
    const info = await imagem(src, [480, 960, 1400]);
    const alt = (tag.match(/alt="([^"]*)"/) || [])[1] || '';
    const nova = info && info.srcset
      ? `<img src="${info.src}" srcset="${info.srcset}" sizes="(max-width: 760px) 100vw, 720px" width="${info.w}" height="${info.h}" alt="${alt}" loading="lazy" decoding="async">`
      : tag.replace('<img ', '<img loading="lazy" decoding="async" ');
    html = html.replace(tag, nova);
  }
  html = html.replace(/<p>\s*(<img [^>]+>)\s*<\/p>/g, '<figure>$1</figure>');
  return html;
}

// ---------- 5. peças comuns de layout ----------
const ICON = {
  seta: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>',
  setaVolta: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 8H3M7 4L3 8l4 4"/></svg>',
  diag: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 11l6-6M6 5h5v5"/></svg>',
  balao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.4-4.4A7.5 7.5 0 1 1 20 11.5z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" stroke-width="2.4"/></svg>',
  ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
  li: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM10 9.5h3.8v1.6h.06c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.77 2.65 4.77 6.1V21h-4v-5.1c0-1.22-.02-2.79-1.7-2.79-1.7 0-1.96 1.33-1.96 2.7V21h-4z"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.3z"/><path d="M9 8.5c0 3.5 2.5 6.5 6.5 6.5l1-1.6-2-1-1 1c-1.2-.5-2.4-1.7-2.9-2.9l1-1-1-2L9 8.5z" stroke-width="1.3"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/></svg>',
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  rss: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M5 11a8 8 0 0 1 8 8M5 5a14 14 0 0 1 14 14"/><circle cx="6" cy="18" r="1.4" fill="currentColor" stroke="none"/></svg>',
};

const PERSON = { '@type': 'Person', '@id': `${SITE}/#junior`, name: 'Junior Sturmer', url: `${SITE}/`, sameAs: ['https://www.instagram.com/juniorsturmer/', 'https://www.linkedin.com/in/juniorsturmer/'], jobTitle: 'Estrategista de marca' };

function head({ titulo, descricao, url, imagem, tipo = 'website', extra = '', schema = [] }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
<meta name="author" content="Junior Sturmer">
<link rel="canonical" href="${SITE}${url}">
<meta property="og:type" content="${tipo}">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="Junior Sturmer">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:url" content="${SITE}${url}">
<meta property="og:image" content="${esc(imagem || SITE + '/assets/og.jpg')}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#ffffff">
${extra}<link rel="alternate" type="application/rss+xml" title="${esc(CFG.nome)} | Junior Sturmer" href="${SITE}${CFG.base}feed.xml">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,700;1,400;1,500&family=Archivo:wdth,wght@62..125,700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/v2.css">
<link rel="stylesheet" href="/assets/blog.css">
${schema.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n')}
</head>
<body class="blog">
<header class="hd">
  <div class="wrap hd-in">
    <a class="name" href="/" aria-label="Junior Sturmer">Junior Sturmer</a>
    <nav class="pills" aria-label="Menu"><a href="/">Início</a><a href="/minha-historia/">Sobre</a><a href="/servicos/">Serviços</a><a href="/#projetos">Projetos</a><a href="${CFG.base}" aria-current="page">Blog</a><a href="/contato/">Contato</a></nav>
    <div class="hd-r">
      <div class="lang" aria-label="Idioma / Language"><a href="${CFG.base}" hreflang="pt-BR" lang="pt-BR" aria-current="true">PT</a><span>/</span><a href="/en/" hreflang="en" lang="en">EN</a></div>
      <a class="btn btn-ink btn-sm hd-cta" href="/contato/">Vamos conversar<span class="ar">${ICON.diag}</span></a>
      <button class="menu-btn" type="button" aria-label="Abrir menu" aria-expanded="false"><i></i></button>
    </div>
  </div>
</header>
`;
}

function rodape() {
  return `<footer class="dark ft" data-theme="dark">
  <div class="wrap">
    <div class="ft-g">
      <div class="fc">
        <span class="name">Junior Sturmer</span>
        <p>Estrategista de marca. Branding, posicionamento e identidade visual para empresas que precisam de direção.</p>
        <nav class="fnav" aria-label="Footer"><a href="/">Início</a><a href="/minha-historia/">Sobre</a><a href="/servicos/">Serviços</a><a href="${CFG.base}">Blog</a><a href="/contato/">Contato</a></nav>
      </div>
      <div class="fc">
        <h3>Acompanhe<br>meu trabalho</h3>
        <div class="soc">
          <a href="https://www.instagram.com/juniorsturmer/" target="_blank" rel="noopener me" aria-label="Instagram">${ICON.ig}</a>
          <a href="https://www.linkedin.com/in/juniorsturmer/" target="_blank" rel="noopener me" aria-label="LinkedIn">${ICON.li}</a>
        </div>
        <p class="base">Cascavel, Paraná, Brasil</p>
      </div>
    </div>
    <div class="ft-b"><span>&copy; <span data-year>${new Date().getFullYear()}</span> Junior Sturmer. Todos os direitos reservados.</span></div>
  </div>
</footer>
<a class="fab" href="/contato/" aria-label="Fale comigo">${ICON.balao}<span>Fale comigo</span></a>
<script src="/assets/v2.js" defer></script>
<script src="/assets/blog.js" defer></script>
</body>
</html>
`;
}

const meta = (a) => `<span class="bmeta"><time datetime="${iso(a.data)}">${dataCurta(a.data)}</time><i aria-hidden="true"></i>${a.leitura} min de leitura</span>`;
const pill = (a, link = false) => link
  ? `<a class="bpill" href="${CFG.base}categoria/${a.catSlug}/">${esc(a.categoria)}</a>`
  : `<span class="bpill">${esc(a.categoria)}</span>`;

function card(a, img) {
  return `<article class="bc rv">
  <a class="bc-in" href="${a.url}">
    <div class="bc-img">${picture(img, a.capaAlt, 'bc-pic', '(max-width: 860px) 100vw, 380px')}</div>
    <div class="bc-tx">
      ${pill(a)}
      <h3>${nbspLast(a.titulo)}</h3>
      ${a.resumo ? `<p>${esc(a.resumo)}</p>` : ''}
      <div class="bc-ft">${meta(a)}<span class="bc-go" aria-hidden="true">${ICON.seta}</span></div>
    </div>
  </a>
</article>`;
}

function linkNewsletter() {
  return `<p class="bnews"><span class="li">${ICON.li}</span><span>Toda quarta tem artigo mais longo na newsletter do LinkedIn. <a href="${CFG.newsletter}" target="_blank" rel="noopener" data-share="newsletter_linkedin">Assinar no LinkedIn${ICON.diag}</a></span></p>`;
}

function ctaContato() {
  return `<section class="dark ct" data-theme="dark" aria-labelledby="c-h-blog">
  <div class="wrap ct-g">
    <div class="badge-d rv" aria-hidden="true">
      <svg class="ring" viewBox="0 0 140 140"><defs><path id="ringc-blog" d="M70,70 m-56,0 a56,56 0 1,1 112,0 a56,56 0 1,1 -112,0"/></defs><text><textPath href="#ringc-blog">estratégia · marca · direção · negócio · </textPath></text></svg>
      <span class="core">${ICON.balao}</span>
    </div>
    <div class="ct-r rv">
      <p class="pre">Vamos começar?</p>
      <h2 id="c-h-blog" class="t">Conversar sobre<br><em>a sua marca.</em></h2>
      <a class="btn btn-lime" href="/contato/">Quero conversar<span class="ar">${ICON.seta}</span></a>
    </div>
  </div>
</section>`;
}

function paginacao(atual, total, baseUrl) {
  if (total <= 1) return '';
  const href = (n) => (n === 1 ? baseUrl : `${baseUrl}pagina/${n}/`);
  const nums = [];
  for (let n = 1; n <= total; n++) {
    if (n === 1 || n === total || Math.abs(n - atual) <= 1) nums.push(n);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  const ant = atual > 1 ? `<a class="bpg-ar" href="${href(atual - 1)}" rel="prev" aria-label="Página anterior">${ICON.setaVolta}</a>` : `<span class="bpg-ar off" aria-hidden="true">${ICON.setaVolta}</span>`;
  const prox = atual < total ? `<a class="bpg-ar" href="${href(atual + 1)}" rel="next" aria-label="Próxima página">${ICON.seta}</a>` : `<span class="bpg-ar off" aria-hidden="true">${ICON.seta}</span>`;
  return `<nav class="bpg" aria-label="Paginação">${ant}<div class="bpg-n">${nums.map((n) => (n === '…' ? '<span class="gap">…</span>' : n === atual ? `<span aria-current="page">${n}</span>` : `<a href="${href(n)}">${n}</a>`)).join('')}</div>${prox}</nav>`;
}

function filtros(ativa) {
  const usadas = CFG.categorias.filter((c) => artigos.some((a) => a.categoria === c))
    .concat([...new Set(artigos.map((a) => a.categoria))].filter((c) => !CFG.categorias.includes(c)));
  const item = (rot, href, on) => `<a href="${href}"${on ? ' aria-current="page"' : ''}>${esc(rot)}</a>`;
  return `<nav class="bcat-f" aria-label="Categorias">${item('Todos', CFG.base, !ativa)}${usadas.map((c) => item(c, `${CFG.base}categoria/${slugify(c)}/`, ativa === c)).join('')}</nav>`;
}

// ---------- 6. páginas de listagem ----------
const imgs = new Map();
for (const a of artigos) imgs.set(a.slug, await imagem(a.capa));

function blogSchema(lista, url) {
  return [
    { '@context': 'https://schema.org', '@type': 'Blog', '@id': `${SITE}${CFG.base}#blog`, name: CFG.nome, description: CFG.descricao, url: `${SITE}${url}`, inLanguage: 'pt-BR', author: PERSON, publisher: PERSON,
      blogPost: lista.map((a) => ({ '@type': 'BlogPosting', headline: a.titulo, url: `${SITE}${a.url}`, datePublished: iso(a.data) })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Junior Sturmer', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: CFG.nome, item: `${SITE}${CFG.base}` }] },
  ];
}

function paginaLista({ lista, pagina, totalPaginas, baseUrl, categoria }) {
  const url = pagina === 1 ? baseUrl : `${baseUrl}pagina/${pagina}/`;
  const ini = (pagina - 1) * CFG.porPagina;
  const fatia = lista.slice(ini, ini + CFG.porPagina);
  const home = !categoria && pagina === 1;
  const sufixo = pagina > 1 ? ` | Página ${pagina}` : '';
  const titulo = categoria ? `${categoria} | ${CFG.nome}, blog de Junior Sturmer${sufixo}` : `${CFG.nome} | Blog de Junior Sturmer sobre marca e estratégia${sufixo}`;
  const descricao = categoria ? `Artigos de Junior Sturmer sobre ${categoria.toLowerCase()}: marca, posicionamento e estratégia com visão de negócio.` : CFG.descricao;
  const rel = [pagina > 1 ? `<link rel="prev" href="${SITE}${pagina === 2 ? baseUrl : `${baseUrl}pagina/${pagina - 1}/`}">` : '', pagina < totalPaginas ? `<link rel="next" href="${SITE}${baseUrl}pagina/${pagina + 1}/">` : ''].filter(Boolean).join('\n');

  let destaqueHtml = '';
  if (home && DESTAQUE) {
    const d = DESTAQUE;
    const recentes = lista.filter((a) => a !== d).slice(0, 4);
    destaqueHtml = `<section class="bf" data-theme="light" aria-label="Destaques">
  <div class="wrap bf-g">
    <a class="bf-main rv" href="${d.url}">
      ${picture(imgs.get(d.slug), d.capaAlt, 'bf-pic', '(max-width: 860px) 100vw, 720px', true)}
      <div class="bf-ov" aria-hidden="true"></div>
      <div class="bf-tx">
        ${pill(d)}
        <h2 class="bf-h">${nbspLast(d.titulo)}</h2>
        ${meta(d)}
      </div>
    </a>
    ${recentes.length ? `<div class="bf-side rv" style="--d:.1s">
      <h2 class="bf-st">Mais recentes</h2>
      <ul>${recentes.map((a) => `<li><a href="${a.url}">${picture(imgs.get(a.slug), a.capaAlt, 'bf-th', '120px')}<span><b>${nbspLast(a.titulo)}</b>${meta(a)}</span></a></li>`).join('')}</ul>
    </div>` : ''}
  </div>
</section>`;
  }

  const topo = home
    ? `<section class="bh" data-theme="light" aria-labelledby="h1">
  <div class="wrap bh-g">
    <div>
      <h1 id="h1" class="t"><span class="l1">Além</span> <span class="l2"><em>do Logo.</em></span></h1>
    </div>
    <div class="bh-r rv" style="--d:.25s">
      <p>Marca, posicionamento e estratégia para quem lidera empresas. Ideias e bastidores de quem constrói marca com visão de negócio, publicados sempre que fizer&nbsp;sentido.</p>
      ${linkNewsletter()}
    </div>
  </div>
</section>`
    : `<section class="bh bh-sm" data-theme="light" aria-labelledby="h1">
  <div class="wrap">
    <a class="bback" href="${CFG.base}">${ICON.setaVolta}${esc(CFG.nome)}</a>
    <h1 id="h1" class="t"><span class="l1">${categoria ? esc(categoria) : 'Todos os artigos'}</span>${pagina > 1 ? ` <span class="l2"><em>página ${pagina}.</em></span>` : ''}</h1>
  </div>
</section>`;

  const html = head({ titulo, descricao, url, extra: rel ? rel + '\n' : '', schema: blogSchema(fatia, url) })
    + `<main>
${topo}
${destaqueHtml}
<section class="bl" id="artigos" data-theme="light" aria-labelledby="bl-h">
  <div class="wrap">
    <div class="bcat">
      <h2 id="bl-h" class="${home ? 't' : 'sr-only'}">${home ? 'Todos os <em>artigos.</em>' : 'Artigos'}</h2>
      ${filtros(categoria)}
    </div>
    ${fatia.length ? `<div class="bgrid">${fatia.map((a) => card(a, imgs.get(a.slug))).join('\n')}</div>` : '<p class="bvazio">Em breve, novos artigos por aqui.</p>'}
    ${paginacao(pagina, totalPaginas, baseUrl)}
  </div>
</section>
${ctaContato()}
</main>
` + rodape();
  write(path.join(url, 'index.html'), html);
}

function gerarListas(lista, baseUrl, categoria) {
  const total = Math.max(1, Math.ceil(lista.length / CFG.porPagina));
  for (let p = 1; p <= total; p++) paginaLista({ lista, pagina: p, totalPaginas: total, baseUrl, categoria });
}
// o artigo em destaque fica no topo e sai da grade principal (volta à grade quando outro assumir o destaque)
const DESTAQUE = artigos.find((a) => a.destaque) || artigos[0] || null;
gerarListas(artigos.length > 1 ? artigos.filter((a) => a !== DESTAQUE) : artigos, CFG.base, null);
for (const c of new Set(artigos.map((a) => a.categoria))) gerarListas(artigos.filter((a) => a.categoria === c), `${CFG.base}categoria/${slugify(c)}/`, c);

// ---------- 7. páginas de artigo ----------
for (const a of artigos) {
  const corpo = await corpoHtml(a.corpo);
  const ogImg = await og(a);
  const img = imgs.get(a.slug);
  const relacionados = artigos.filter((x) => x !== a && x.categoria === a.categoria)
    .concat(artigos.filter((x) => x !== a && x.categoria !== a.categoria)).slice(0, 3);
  const urlAbs = `${SITE}${a.url}`;
  const titulo = a.seoTitulo || `${a.titulo} | ${CFG.nome}`;
  const schema = [
    { '@context': 'https://schema.org', '@type': 'BlogPosting', '@id': `${urlAbs}#artigo`, headline: a.titulo, description: a.resumo, image: ogImg,
      datePublished: iso(a.data), dateModified: iso(a.data), inLanguage: 'pt-BR', url: urlAbs, mainEntityOfPage: urlAbs,
      articleSection: a.categoria, wordCount: a.corpo.split(/\s+/).length, author: PERSON, publisher: PERSON,
      isPartOf: { '@type': 'Blog', '@id': `${SITE}${CFG.base}#blog`, name: CFG.nome }, ...(a.linkedin ? { sameAs: [a.linkedin] } : {}) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Junior Sturmer', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: CFG.nome, item: `${SITE}${CFG.base}` },
      { '@type': 'ListItem', position: 3, name: a.titulo, item: urlAbs }] },
  ];
  const extra = `<meta property="article:published_time" content="${iso(a.data)}">\n<meta property="article:section" content="${esc(a.categoria)}">\n<meta property="article:author" content="Junior Sturmer">\n`;
  const compartilhar = `<div class="bshare">
      <span>Compartilhe</span>
      <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(urlAbs)}" target="_blank" rel="noopener" aria-label="Compartilhar no LinkedIn" data-share="linkedin">${ICON.li}</a>
      <a href="https://wa.me/?text=${encodeURIComponent(a.titulo + ' ' + urlAbs)}" target="_blank" rel="noopener" aria-label="Compartilhar no WhatsApp" data-share="whatsapp">${ICON.wa}</a>
      <button type="button" class="bcopy" data-url="${urlAbs}" aria-label="Copiar link">${ICON.link}${ICON.ok}</button>
    </div>`;

  const html = head({ titulo, descricao: a.resumo || CFG.descricao, url: a.url, imagem: ogImg, tipo: 'article', extra, schema })
    + `<div class="bprog" aria-hidden="true"><i></i></div>
<main>
<article class="art" data-theme="light">
  <header class="ah">
    <div class="wrap ah-in">
      <nav class="ah-bc" aria-label="Você está em"><a href="${CFG.base}">${esc(CFG.nome)}</a><span aria-hidden="true">/</span><a href="${CFG.base}categoria/${a.catSlug}/">${esc(a.categoria)}</a></nav>
      <h1 class="t"><span class="l1">${nbspLast(a.titulo)}</span></h1>
      ${a.resumo ? `<p class="ah-sub rv" style="--d:.2s">${esc(a.resumo)}</p>` : ''}
      <div class="ah-by rv" style="--d:.3s">
        <span class="av"><picture><source srcset="/assets/img/junior-sturmer-rosto.webp" type="image/webp"><img src="/assets/img/junior-sturmer-rosto.jpg" width="96" height="96" alt="Junior Sturmer"></picture></span>
        <span><b>Junior Sturmer</b><span class="bmeta"><time datetime="${iso(a.data)}">${dataLonga(a.data)}</time><i aria-hidden="true"></i>${a.leitura} min de leitura</span></span>
      </div>
    </div>
  </header>
  ${img ? `<div class="wrap ah-cover rv" style="--d:.35s">${picture(img, a.capaAlt, 'ah-pic', '(max-width: 1180px) 100vw, 1124px', true)}</div>` : ''}
  <div class="wrap">
    <div class="prose">
${corpo}
    </div>
    <div class="art-ft">
      ${linkNewsletter()}
      ${compartilhar}
    </div>
    ${a.linkedin ? `<div class="art-orig"><a class="borig" href="${esc(a.linkedin)}" target="_blank" rel="noopener">${ICON.li}Este artigo também foi publicado no LinkedIn ${ICON.diag}</a></div>` : ''}
    <aside class="bauthor" aria-label="Sobre o autor">
      <span class="av"><picture><source srcset="/assets/img/junior-sturmer-rosto.webp" type="image/webp"><img src="/assets/img/junior-sturmer-rosto.jpg" width="96" height="96" alt="" loading="lazy"></picture></span>
      <div>
        <span class="kicker">Quem escreve</span>
        <p class="ba-n">Junior Sturmer</p>
        <p>Estrategista de marca. Desde 2019 constrói do zero o marketing e o branding da TruckPag e ajuda empresas de vários segmentos a construir marcas com visão de negócio.</p>
        <div class="ba-acts"><a class="btn btn-ink btn-sm" href="/contato/">Conversar sobre minha marca<span class="ar">${ICON.seta}</span></a><a class="lnk" href="/minha-historia/">Minha história ${ICON.seta}</a></div>
      </div>
    </aside>
  </div>
</article>
${relacionados.length ? `<section class="bl brel" data-theme="light" aria-labelledby="rel-h">
  <div class="wrap">
    <div class="bcat"><h2 id="rel-h" class="t">Continue <em>lendo.</em></h2><a class="lnk" href="${CFG.base}">Ver todos os artigos ${ICON.seta}</a></div>
    <div class="bgrid">${relacionados.map((r) => card(r, imgs.get(r.slug))).join('\n')}</div>
  </div>
</section>` : ''}
${ctaContato()}
</main>
` + rodape();
  write(path.join(a.url, 'index.html'), html);
}

// ---------- 8. RSS, sitemap e llms.txt ----------
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(CFG.nome)} | Junior Sturmer</title>
<link>${SITE}${CFG.base}</link>
<description>${esc(CFG.descricao)}</description>
<language>pt-BR</language>
<atom:link href="${SITE}${CFG.base}feed.xml" rel="self" type="application/rss+xml"/>
${artigos.slice(0, 30).map((a) => `<item><title>${esc(a.titulo)}</title><link>${SITE}${a.url}</link><guid>${SITE}${a.url}</guid><pubDate>${a.data.toUTCString()}</pubDate><category>${esc(a.categoria)}</category><description>${esc(a.resumo)}</description></item>`).join('\n')}
</channel>
</rss>
`;
write('blog/feed.xml', rss);

const smFile = path.join(OUT, 'sitemap.xml');
if (fs.existsSync(smFile)) {
  const hoje = iso(artigos[0]?.data || new Date());
  const urls = [`  <url><loc>${SITE}${CFG.base}</loc><lastmod>${hoje}</lastmod><priority>0.8</priority></url>`]
    .concat([...new Set(artigos.map((a) => a.catSlug))].map((c) => `  <url><loc>${SITE}${CFG.base}categoria/${c}/</loc><lastmod>${hoje}</lastmod><priority>0.5</priority></url>`))
    .concat(artigos.map((a) => `  <url><loc>${SITE}${a.url}</loc><lastmod>${iso(a.data)}</lastmod><priority>0.7</priority></url>`));
  const sm = fs.readFileSync(smFile, 'utf8').replace('</urlset>', urls.join('\n') + '\n</urlset>');
  fs.writeFileSync(smFile, sm);
}

const llmsFile = path.join(OUT, 'llms.txt');
if (fs.existsSync(llmsFile) && artigos.length) {
  const bloco = `\n## Blog ${CFG.nome}\n${CFG.descricao}\n- Blog: ${SITE}${CFG.base}\n${artigos.map((a) => `- [${a.titulo}](${SITE}${a.url}): ${a.resumo}`).join('\n')}\n`;
  fs.appendFileSync(llmsFile, bloco);
}

console.log(`[blog] ${artigos.length} artigos publicados em ${CFG.base}`);
