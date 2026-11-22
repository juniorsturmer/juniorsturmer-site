// Gerador do blog "Além do Logo" | juniorsturmer.com.br
// Roda no Netlify a cada publicação (npm run build).
// Lê os artigos em conteudo/blog/*.md e monta o site final na pasta _site,
// com o blog em português (/blog/) e em inglês (/en/blog/).

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
  newsletter: 'https://www.linkedin.com/build-relation/newsletter-follow?entityUrn=7515239013696385024',
  porPagina: 9,
  // categorias em português (nome usado no painel) e o nome em inglês
  categorias: {
    'Branding': 'Branding',
    'Posicionamento': 'Positioning',
    'Estratégia': 'Strategy',
    'Identidade visual': 'Visual identity',
    'Negócios': 'Business',
    'Bastidores': 'Behind the scenes',
  },
};

// ---------- textos de cada idioma ----------
const LANGS = {
  pt: {
    id: 'pt', html: 'pt-BR', og: 'pt_BR', base: '/blog/', catSeg: 'categoria', pagSeg: 'pagina',
    home: '/', contato: '/contato/', sobre: '/minha-historia/',
    nav: [['Início', '/'], ['Sobre', '/minha-historia/'], ['Serviços', '/servicos/'], ['Projetos', '/#projetos'], ['Blog', '/blog/'], ['Contato', '/contato/']],
    fnav: [['Início', '/'], ['Sobre', '/minha-historia/'], ['Serviços', '/servicos/'], ['Blog', '/blog/'], ['Contato', '/contato/']],
    descricao: 'Blog de Junior Sturmer sobre marca, posicionamento e estratégia para quem lidera empresas.',
    intro: 'Marca, posicionamento e estratégia para quem lidera empresas. Ideias e bastidores de quem constrói marca com visão de negócio, publicados sempre que fizer&nbsp;sentido.',
    tituloHome: `${CFG.nome} | Blog de Junior Sturmer sobre marca e estratégia`,
    tituloCat: (c) => `${c} | ${CFG.nome}, blog de Junior Sturmer`,
    descCat: (c) => `Artigos de Junior Sturmer sobre ${c.toLowerCase()}: marca, posicionamento e estratégia com visão de negócio.`,
    pagina: 'Página', paginaMin: 'página', anterior: 'Página anterior', proxima: 'Próxima página', paginacao: 'Paginação',
    todos: 'Todos', todosArtigos: 'Todos os artigos', todosOs: 'Todos os <em>artigos.</em>', artigos: 'Artigos', categorias: 'Categorias',
    destaques: 'Destaques', recentes: 'Mais recentes', vazio: 'Em breve, novos artigos por aqui.',
    leitura: (n) => `${n} min de leitura`,
    voceEsta: 'Você está em', compartilhe: 'Compartilhe', compLi: 'Compartilhar no LinkedIn', compWa: 'Compartilhar no WhatsApp', copiar: 'Copiar link',
    noLinkedin: 'Este artigo também foi publicado no LinkedIn',
    quemEscreve: 'Quem escreve', sobreAutor: 'Sobre o autor',
    bio: 'Estrategista de marca. Desde 2019 constrói do zero o marketing e o branding da TruckPag e ajuda empresas de vários segmentos a construir marcas com visão de negócio.',
    conversarMarca: 'Conversar sobre minha marca', minhaHistoria: 'Minha história',
    continue: 'Continue <em>lendo.</em>', verTodos: 'Ver todos os artigos',
    newsCurta: 'Toda quarta tem artigo mais longo na newsletter do LinkedIn.',
    newsKicker: 'Newsletter no LinkedIn',
    newsLonga: `Toda quarta tem um artigo mais longo do ${CFG.nome} na minha newsletter do LinkedIn.`,
    assinar: 'Assinar no LinkedIn',
    ctaPre: 'Vamos começar?', ctaH: 'Conversar sobre<br><em>a sua marca.</em>', ctaBtn: 'Quero conversar', ctaRing: 'estratégia · marca · direção · negócio · ',
    hdCta: 'Vamos conversar', abrirMenu: 'Abrir menu', fab: 'Fale comigo',
    rodapeTx: 'Estrategista de marca. Branding, posicionamento e identidade visual para empresas que precisam de direção.',
    acompanhe: 'Acompanhe<br>meu trabalho', cidade: 'Cascavel, Paraná, Brasil', direitos: 'Todos os direitos reservados.',
    jobTitle: 'Estrategista de marca',
    meses: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
    mesesLongos: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
    dataCurta(d) { return `${d.getUTCDate()} ${this.meses[d.getUTCMonth()]} ${d.getUTCFullYear()}`; },
    dataLonga(d) { return `${d.getUTCDate()} de ${this.mesesLongos[d.getUTCMonth()]} de ${d.getUTCFullYear()}`; },
  },
  en: {
    id: 'en', html: 'en', og: 'en_US', base: '/en/blog/', catSeg: 'category', pagSeg: 'page',
    home: '/en/', contato: '/en/contact/', sobre: '/en/about/',
    nav: [['Home', '/en/'], ['About', '/en/about/'], ['Services', '/en/services/'], ['Work', '/en/#work'], ['Blog', '/en/blog/'], ['Contact', '/en/contact/']],
    fnav: [['Home', '/en/'], ['About', '/en/about/'], ['Services', '/en/services/'], ['Blog', '/en/blog/'], ['Contact', '/en/contact/']],
    descricao: 'Junior Sturmer\'s blog on brand, positioning and strategy for people who run companies.',
    intro: 'Brand, positioning and strategy for people who run companies. Ideas and behind the scenes from someone who builds brands with a business mindset, published whenever it makes&nbsp;sense.',
    tituloHome: `${CFG.nome} | Junior Sturmer's blog on brand and strategy`,
    tituloCat: (c) => `${c} | ${CFG.nome}, Junior Sturmer's blog`,
    descCat: (c) => `Articles by Junior Sturmer on ${c.toLowerCase()}: brand, positioning and strategy with a business mindset.`,
    pagina: 'Page', paginaMin: 'page', anterior: 'Previous page', proxima: 'Next page', paginacao: 'Pagination',
    todos: 'All', todosArtigos: 'All articles', todosOs: 'All <em>articles.</em>', artigos: 'Articles', categorias: 'Categories',
    destaques: 'Featured', recentes: 'Latest', vazio: 'New articles coming soon.',
    leitura: (n) => `${n} min read`,
    voceEsta: 'You are here', compartilhe: 'Share', compLi: 'Share on LinkedIn', compWa: 'Share on WhatsApp', copiar: 'Copy link',
    noLinkedin: 'This article was also published on LinkedIn',
    quemEscreve: 'Written by', sobreAutor: 'About the author',
    bio: 'Brand strategist. Since 2019 he has built TruckPag\'s marketing and branding from scratch, and helps companies in many industries build brands with a business mindset.',
    conversarMarca: 'Talk about my brand', minhaHistoria: 'About me',
    continue: 'Keep <em>reading.</em>', verTodos: 'See all articles',
    newsCurta: 'Every Wednesday there is a longer article in my LinkedIn newsletter, written in Portuguese.',
    newsKicker: 'LinkedIn newsletter',
    newsLonga: `Every Wednesday there is a longer ${CFG.nome} article in my LinkedIn newsletter, written in Portuguese.`,
    assinar: 'Subscribe on LinkedIn',
    ctaPre: 'Ready to start?', ctaH: 'Let\'s talk about<br><em>your brand.</em>', ctaBtn: 'Get in touch', ctaRing: 'strategy · brand · direction · business · ',
    hdCta: 'Let\'s talk', abrirMenu: 'Open menu', fab: 'Get in touch',
    rodapeTx: 'Brand strategist. Branding, positioning and visual identity for companies that need direction.',
    acompanhe: 'Follow<br>my work', cidade: 'Cascavel, Paraná, Brazil', direitos: 'All rights reserved.',
    jobTitle: 'Brand strategist',
    meses: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    mesesLongos: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    dataCurta(d) { return `${this.meses[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`; },
    dataLonga(d) { return `${this.mesesLongos[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`; },
  },
};
const OUTRO = { pt: 'en', en: 'pt' };
// páginas fixas do site: endereço em português -> endereço em inglês (usado nos links dentro dos artigos em inglês)
const PAGINAS_EN = { '/': '/en/', '/servicos/': '/en/services/', '/contato/': '/en/contact/', '/minha-historia/': '/en/about/', '/obrigado/': '/en/thanks/' };

// ---------- utilidades ----------
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const iso = (d) => d.toISOString().slice(0, 10);
const write = (rel, html) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
const nbspLast = (s) => esc(s).replace(/ (\S+)$/, '&nbsp;$1');
const catNome = (L, catPt) => (L.id === 'en' ? CFG.categorias[catPt] || catPt : catPt);
const catUrl = (L, nome) => `${L.base}${L.catSeg}/${slugify(nome)}/`;

function parseDate(v) {
  if (v instanceof Date && !isNaN(v)) return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
  const m = String(v || '').match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return null;
}
const truthy = (v, def) => (v === undefined || v === null || v === '' ? def : v === true || v === 'true' || v === 'sim');
const contaPalavras = (t) => t.replace(/<[^>]+>/g, ' ').replace(/[#>*_`\[\]()!-]/g, ' ').split(/\s+/).filter(Boolean).length;

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

// ---------- 2. lê os artigos (português + versão em inglês opcional no mesmo arquivo) ----------
function lerArquivo(arquivo) {
  const bruto = fs.readFileSync(path.join(POSTS_DIR, arquivo), 'utf8').replace(/^﻿/, '');
  const m = bruto.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
  const fm = m ? (yaml.load(m[1]) || {}) : {};
  const corpo = m ? m[2] : bruto;
  const slug = slugify(arquivo.replace(/\.md$/i, '').replace(/^\d{4}-\d{2}-\d{2}-/, ''));
  const data = parseDate(fm.data) || new Date(fs.statSync(path.join(POSTS_DIR, arquivo)).mtime);
  const catPt = String(fm.categoria || 'Branding').trim();
  const titulo = String(fm.titulo || slug).trim();
  const comum = {
    id: slug, tituloPt: titulo, catPt, data,
    capa: fm.capa ? String(fm.capa).trim() : '',
    destaque: truthy(fm.destaque, false),
  };
  const pt = {
    ...comum, lang: 'pt', slug, titulo,
    resumo: String(fm.resumo || '').replace(/\s+/g, ' ').trim(),
    capaAlt: String(fm.capa_alt || titulo).trim(),
    linkedin: fm.linkedin ? String(fm.linkedin).trim() : '',
    seoTitulo: fm.seo_titulo ? String(fm.seo_titulo).trim() : '',
    corpo,
  };
  let en = null;
  const e = fm.en && typeof fm.en === 'object' ? fm.en : null;
  const textoEn = e && e.texto ? String(e.texto) : '';
  if (e && String(e.titulo || '').trim() && textoEn.trim() && !truthy(e.rascunho, false)) {
    const tEn = String(e.titulo).trim();
    en = {
      ...comum, lang: 'en', slug: slugify(e.slug || tEn), titulo: tEn,
      resumo: String(e.resumo || '').replace(/\s+/g, ' ').trim(),
      capaAlt: String(e.capa_alt || fm.capa_alt || tEn).trim(),
      linkedin: e.linkedin ? String(e.linkedin).trim() : '',
      seoTitulo: e.seo_titulo ? String(e.seo_titulo).trim() : '',
      corpo: textoEn,
    };
  }
  const publicado = truthy(fm.publicado, true) && !truthy(fm.rascunho, false);
  return publicado ? { pt, en } : null;
}

const lidos = (fs.existsSync(POSTS_DIR) ? fs.readdirSync(POSTS_DIR) : [])
  .filter((f) => f.toLowerCase().endsWith('.md'))
  .map(lerArquivo)
  .filter(Boolean);

const POSTS = { pt: [], en: [] };
for (const { pt, en } of lidos) {
  POSTS.pt.push(pt);
  if (en) { POSTS.en.push(en); en.par = pt; pt.par = en; }
}
for (const id of ['pt', 'en']) {
  const L = LANGS[id];
  POSTS[id].sort((a, b) => b.data - a.data || a.titulo.localeCompare(b.titulo, L.html));
  const vistos = {};
  for (const a of POSTS[id]) {
    if (vistos[a.slug]) a.slug = `${a.slug}-${++vistos[a.slug]}`; else vistos[a.slug] = 1;
    a.url = `${L.base}${a.slug}/`;
    a.categoria = catNome(L, a.catPt);
    a.catSlug = slugify(a.categoria);
    a.leitura = Math.max(1, Math.round(contaPalavras(a.corpo) / 200));
  }
}

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
// imagem de compartilhamento 1200 x 630 (uma por artigo, usada nos dois idiomas)
const cacheOg = new Map();
async function og(artigo) {
  if (!sharp || !artigo.capa) return `${SITE}/assets/og.jpg`;
  if (cacheOg.has(artigo.id)) return cacheOg.get(artigo.id);
  const local = path.join(ROOT, decodeURI(artigo.capa));
  if (!fs.existsSync(local)) return `${SITE}/assets/og.jpg`;
  const rel = `blog/og/${artigo.id}.jpg`;
  fs.mkdirSync(path.join(OUT, 'blog/og'), { recursive: true });
  await sharp(local).rotate().resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(OUT, rel));
  cacheOg.set(artigo.id, `${SITE}/${rel}`);
  return `${SITE}/${rel}`;
}
function picture(img, alt, cls, sizes, eager) {
  if (!img) return `<div class="${cls} sem-capa" aria-hidden="true"><span>${esc(CFG.nome)}</span></div>`;
  return `<picture class="${cls}"><img src="${esc(img.src)}"${img.srcset ? ` srcset="${esc(img.srcset)}" sizes="${sizes}"` : ''} width="${img.w}" height="${img.h}" alt="${esc(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"'}></picture>`;
}

// ---------- 4. markdown -> html ----------
marked.setOptions({ gfm: true, breaks: false });
// nos artigos em inglês, links para artigos e páginas em português apontam para a versão em inglês quando ela existe
function localizaLinks(html, L) {
  if (L.id !== 'en') return html;
  const porId = new Map(POSTS.pt.filter((a) => a.par).map((a) => [a.slug, a.par.url]));
  return html.replace(/href="(?:https?:\/\/(?:www\.)?juniorsturmer\.com\.br)?(\/[^"#?]*)([^"]*)"/g, (tudo, p, resto) => {
    const m = p.match(/^\/blog\/([^/]+)\/?$/);
    if (m && porId.has(m[1])) return `href="${porId.get(m[1])}${resto}"`;
    if (p === '/blog/' || p === '/blog') return `href="${L.base}${resto}"`;
    if (PAGINAS_EN[p]) return `href="${PAGINAS_EN[p]}${resto}"`;
    return tudo;
  });
}
async function corpoHtml(md, L) {
  let html = marked.parse(md);
  html = html.replace(/<h1(\s|>)/g, '<h2$1').replace(/<\/h1>/g, '</h2>');
  const ids = {};
  html = html.replace(/<h2>([\s\S]*?)<\/h2>/g, (_, t) => {
    let id = slugify(t.replace(/<[^>]+>/g, '')) || 'secao';
    if (ids[id]) id += '-' + (++ids[id]); else ids[id] = 1;
    return `<h2 id="${id}">${t}</h2>`;
  });
  html = localizaLinks(html, L);
  html = html.replace(/<a href="(https?:\/\/(?!(?:www\.)?juniorsturmer\.com\.br)[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener"');
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
};

const person = (L) => ({ '@type': 'Person', '@id': `${SITE}/#junior`, name: 'Junior Sturmer', url: `${SITE}${L.home}`, sameAs: ['https://www.instagram.com/juniorsturmer/', 'https://www.linkedin.com/in/juniorsturmer/'], jobTitle: L.jobTitle });

// alternates: { pt: '/blog/...', en: '/en/blog/...' } (só os idiomas que existem)
function head(L, { titulo, descricao, url, imagem, tipo = 'website', extra = '', schema = [], alternates = {}, trocaIdioma, post = null }) {
  const alt = Object.keys(alternates).length > 1
    ? Object.entries(alternates).map(([id, u]) => `<link rel="alternate" hreflang="${LANGS[id].html}" href="${SITE}${u}">`).join('\n')
      + `\n<link rel="alternate" hreflang="x-default" href="${SITE}${alternates.pt || url}">\n`
    : '';
  const idiomaLink = (id) => {
    const o = LANGS[id];
    const href = id === L.id ? url : trocaIdioma;
    return `<a href="${href}" hreflang="${o.html}" lang="${o.html}"${id === L.id ? ' aria-current="true"' : ''}>${id.toUpperCase()}</a>`;
  };
  const navItem = ([rot, href]) => `<a href="${href}"${href === L.base ? ' aria-current="page"' : ''}>${rot}</a>`;
  const ogAlt = alternates[OUTRO[L.id]] ? `<meta property="og:locale:alternate" content="${LANGS[OUTRO[L.id]].og}">\n` : '';
  return `<!doctype html>
<html lang="${L.html}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
<meta name="author" content="Junior Sturmer">
<link rel="canonical" href="${SITE}${url}">
${alt}<meta property="og:type" content="${tipo}">
<meta property="og:locale" content="${L.og}">
${ogAlt}<meta property="og:site_name" content="Junior Sturmer">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:url" content="${SITE}${url}">
<meta property="og:image" content="${esc(imagem || SITE + '/assets/og.jpg')}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#ffffff">
${extra}<link rel="alternate" type="application/rss+xml" title="${esc(CFG.nome)} | Junior Sturmer" href="${SITE}${L.base}feed.xml">
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
<body class="blog"${post ? ` data-post-id="${esc(post.id)}"` : ''}>
<header class="hd">
  <div class="wrap hd-in">
    <a class="name" href="${L.home}" aria-label="Junior Sturmer">Junior Sturmer</a>
    <nav class="pills" aria-label="Menu">${L.nav.map(navItem).join('')}</nav>
    <div class="hd-r">
      <div class="lang" aria-label="Idioma / Language">${idiomaLink('pt')}<span>/</span>${idiomaLink('en')}</div>
      <a class="btn btn-ink btn-sm hd-cta" href="${L.contato}">${L.hdCta}<span class="ar">${ICON.diag}</span></a>
      <button class="menu-btn" type="button" aria-label="${L.abrirMenu}" aria-expanded="false"><i></i></button>
    </div>
  </div>
</header>
`;
}

function rodape(L) {
  return `<footer class="dark ft" data-theme="dark">
  <div class="wrap">
    <div class="ft-g">
      <div class="fc">
        <span class="name">Junior Sturmer</span>
        <p>${L.rodapeTx}</p>
        <nav class="fnav" aria-label="Footer">${L.fnav.map(([r, h]) => `<a href="${h}">${r}</a>`).join('')}</nav>
      </div>
      <div class="fc">
        <h3>${L.acompanhe}</h3>
        <div class="soc">
          <a href="https://www.instagram.com/juniorsturmer/" target="_blank" rel="noopener me" aria-label="Instagram">${ICON.ig}</a>
          <a href="https://www.linkedin.com/in/juniorsturmer/" target="_blank" rel="noopener me" aria-label="LinkedIn">${ICON.li}</a>
        </div>
        <p class="base">${L.cidade}</p>
      </div>
    </div>
    <div class="ft-b"><span>&copy; <span data-year>${new Date().getFullYear()}</span> Junior Sturmer. ${L.direitos}</span></div>
  </div>
</footer>
<a class="fab" href="${L.contato}" aria-label="${L.fab}">${ICON.balao}<span>${L.fab}</span></a>
<script src="/assets/v2.js" defer></script>
<script src="/assets/blog.js" defer></script>
</body>
</html>
`;
}

// atributos usados pela mensuração (GA4): id do artigo = endereço em português, igual nos dois idiomas
const dataPost = (a) => ` data-post-id="${esc(a.id)}" data-post-titulo="${esc(a.tituloPt)}" data-post-categoria="${esc(a.catPt)}"`;

const meta = (L, a) => `<span class="bmeta"><time datetime="${iso(a.data)}">${L.dataCurta(a.data)}</time><i aria-hidden="true"></i>${L.leitura(a.leitura)}</span>`;
const pill = (a) => `<span class="bpill">${esc(a.categoria)}</span>`;

function card(L, a, img) {
  return `<article class="bc rv">
  <a class="bc-in" href="${a.url}"${dataPost(a)}>
    <div class="bc-img">${picture(img, a.capaAlt, 'bc-pic', '(max-width: 860px) 100vw, 380px')}</div>
    <div class="bc-tx">
      ${pill(a)}
      <h3>${nbspLast(a.titulo)}</h3>
      ${a.resumo ? `<p>${esc(a.resumo)}</p>` : ''}
      <div class="bc-ft">${meta(L, a)}<span class="bc-go" aria-hidden="true">${ICON.seta}</span></div>
    </div>
  </a>
</article>`;
}

// link discreto no fim de cada artigo
function linkNewsletter(L) {
  return `<p class="bnews"><span class="li">${ICON.li}</span><span>${L.newsCurta} <a href="${CFG.newsletter}" target="_blank" rel="noopener" data-share="newsletter_linkedin" data-local="fim_artigo">${L.assinar}${ICON.diag}</a></span></p>`;
}
// faixa no fim das páginas de listagem, depois que a pessoa já navegou pelos artigos
function newsletterFim(L) {
  return `<div class="bnl rv">
      <span class="bnl-ic">${ICON.li}</span>
      <div class="bnl-tx"><span class="bnl-k">${L.newsKicker}</span><p>${L.newsLonga}</p></div>
      <a class="btn btn-line btn-sm bnl-btn" href="${CFG.newsletter}" target="_blank" rel="noopener" data-share="newsletter_linkedin" data-local="fim_blog">${L.assinar}<span class="ar">${ICON.diag}</span></a>
    </div>`;
}

function ctaContato(L) {
  return `<section class="dark ct" data-theme="dark" aria-labelledby="c-h-blog">
  <div class="wrap ct-g">
    <div class="badge-d rv" aria-hidden="true">
      <svg class="ring" viewBox="0 0 140 140"><defs><path id="ringc-blog" d="M70,70 m-56,0 a56,56 0 1,1 112,0 a56,56 0 1,1 -112,0"/></defs><text><textPath href="#ringc-blog">${L.ctaRing}</textPath></text></svg>
      <span class="core">${ICON.balao}</span>
    </div>
    <div class="ct-r rv">
      <p class="pre">${L.ctaPre}</p>
      <h2 id="c-h-blog" class="t">${L.ctaH}</h2>
      <a class="btn btn-lime" href="${L.contato}">${L.ctaBtn}<span class="ar">${ICON.seta}</span></a>
    </div>
  </div>
</section>`;
}

function paginacao(L, atual, total, baseUrl) {
  if (total <= 1) return '';
  const href = (n) => (n === 1 ? baseUrl : `${baseUrl}${L.pagSeg}/${n}/`);
  const nums = [];
  for (let n = 1; n <= total; n++) {
    if (n === 1 || n === total || Math.abs(n - atual) <= 1) nums.push(n);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  const ant = atual > 1 ? `<a class="bpg-ar" href="${href(atual - 1)}" rel="prev" aria-label="${L.anterior}">${ICON.setaVolta}</a>` : `<span class="bpg-ar off" aria-hidden="true">${ICON.setaVolta}</span>`;
  const prox = atual < total ? `<a class="bpg-ar" href="${href(atual + 1)}" rel="next" aria-label="${L.proxima}">${ICON.seta}</a>` : `<span class="bpg-ar off" aria-hidden="true">${ICON.seta}</span>`;
  return `<nav class="bpg" aria-label="${L.paginacao}">${ant}<div class="bpg-n">${nums.map((n) => (n === '…' ? '<span class="gap">…</span>' : n === atual ? `<span aria-current="page">${n}</span>` : `<a href="${href(n)}">${n}</a>`)).join('')}</div>${prox}</nav>`;
}

function filtros(L, artigos, ativa) {
  const ordem = Object.keys(CFG.categorias).map((c) => catNome(L, c));
  const usadas = ordem.filter((c) => artigos.some((a) => a.categoria === c))
    .concat([...new Set(artigos.map((a) => a.categoria))].filter((c) => !ordem.includes(c)));
  const item = (rot, href, on, cat) => `<a href="${href}"${on ? ' aria-current="page"' : ''}${cat ? ` data-categoria="${esc(cat)}"` : ''}>${esc(rot)}</a>`;
  return `<nav class="bcat-f" aria-label="${L.categorias}">${item(L.todos, L.base, !ativa)}${usadas.map((c) => {
    const pt = artigos.find((a) => a.categoria === c)?.catPt || c;
    return item(c, catUrl(L, c), ativa === c, pt);
  }).join('')}</nav>`;
}

// ---------- 6. páginas de listagem ----------
const imgs = new Map();
for (const a of [...POSTS.pt, ...POSTS.en]) if (!imgs.has(a.capa)) imgs.set(a.capa, await imagem(a.capa));
const imgDe = (a) => imgs.get(a.capa) || null;

function blogSchema(L, lista, url) {
  const P = person(L);
  return [
    { '@context': 'https://schema.org', '@type': 'Blog', '@id': `${SITE}${L.base}#blog`, name: CFG.nome, description: L.descricao, url: `${SITE}${url}`, inLanguage: L.html, author: P, publisher: P,
      blogPost: lista.map((a) => ({ '@type': 'BlogPosting', headline: a.titulo, url: `${SITE}${a.url}`, datePublished: iso(a.data), inLanguage: L.html })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Junior Sturmer', item: `${SITE}${L.home}` },
      { '@type': 'ListItem', position: 2, name: CFG.nome, item: `${SITE}${L.base}` }] },
  ];
}

function paginaLista(L, { lista, todos, destaque, pagina, totalPaginas, baseUrl, categoria }) {
  const url = pagina === 1 ? baseUrl : `${baseUrl}${L.pagSeg}/${pagina}/`;
  const ini = (pagina - 1) * CFG.porPagina;
  const fatia = lista.slice(ini, ini + CFG.porPagina);
  const home = !categoria && pagina === 1;
  const sufixo = pagina > 1 ? ` | ${L.pagina} ${pagina}` : '';
  const titulo = (categoria ? L.tituloCat(categoria) : L.tituloHome) + sufixo;
  const descricao = categoria ? L.descCat(categoria) : L.descricao;
  const rel = [pagina > 1 ? `<link rel="prev" href="${SITE}${pagina === 2 ? baseUrl : `${baseUrl}${L.pagSeg}/${pagina - 1}/`}">` : '', pagina < totalPaginas ? `<link rel="next" href="${SITE}${baseUrl}${L.pagSeg}/${pagina + 1}/">` : ''].filter(Boolean).join('\n');

  // página equivalente no outro idioma
  const O = LANGS[OUTRO[L.id]];
  let trocaIdioma = O.base;
  const alternates = {};
  if (POSTS[O.id].length && !categoria && pagina === 1) { alternates[L.id] = url; alternates[O.id] = O.base; }
  if (categoria) {
    const catPt = todos.find((a) => a.categoria === categoria)?.catPt;
    const nomeO = catPt && catNome(O, catPt);
    if (nomeO && POSTS[O.id].some((a) => a.categoria === nomeO)) trocaIdioma = catUrl(O, nomeO);
  }

  let destaqueHtml = '';
  if (home && destaque) {
    const d = destaque;
    const recentes = todos.filter((a) => a !== d).slice(0, 4);
    destaqueHtml = `<section class="bf" data-theme="light" aria-label="${L.destaques}">
  <div class="wrap bf-g">
    <a class="bf-main rv" href="${d.url}"${dataPost(d)}>
      ${picture(imgDe(d), d.capaAlt, 'bf-pic', '(max-width: 860px) 100vw, 720px', true)}
      <div class="bf-ov" aria-hidden="true"></div>
      <div class="bf-tx">
        ${pill(d)}
        <h2 class="bf-h">${nbspLast(d.titulo)}</h2>
        ${meta(L, d)}
      </div>
    </a>
    ${recentes.length ? `<div class="bf-side rv" style="--d:.1s">
      <h2 class="bf-st">${L.recentes}</h2>
      <ul>${recentes.map((a) => `<li><a href="${a.url}"${dataPost(a)}>${picture(imgDe(a), a.capaAlt, 'bf-th', '120px')}<span><b>${nbspLast(a.titulo)}</b>${meta(L, a)}</span></a></li>`).join('')}</ul>
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
      <p>${L.intro}</p>
    </div>
  </div>
</section>`
    : `<section class="bh bh-sm" data-theme="light" aria-labelledby="h1">
  <div class="wrap">
    <a class="bback" href="${L.base}">${ICON.setaVolta}${esc(CFG.nome)}</a>
    <h1 id="h1" class="t"><span class="l1">${categoria ? esc(categoria) : L.todosArtigos}</span>${pagina > 1 ? ` <span class="l2"><em>${L.paginaMin} ${pagina}.</em></span>` : ''}</h1>
  </div>
</section>`;

  const html = head(L, { titulo, descricao, url, extra: rel ? rel + '\n' : '', schema: blogSchema(L, fatia, url), alternates, trocaIdioma })
    + `<main>
${topo}
${destaqueHtml}
<section class="bl" id="artigos" data-theme="light" aria-labelledby="bl-h">
  <div class="wrap">
    <div class="bcat">
      <h2 id="bl-h" class="${home ? 't' : 'sr-only'}">${home ? L.todosOs : L.artigos}</h2>
      ${filtros(L, todos, categoria)}
    </div>
    ${fatia.length ? `<div class="bgrid">${fatia.map((a) => card(L, a, imgDe(a))).join('\n')}</div>` : `<p class="bvazio">${L.vazio}</p>`}
    ${paginacao(L, pagina, totalPaginas, baseUrl)}
    ${newsletterFim(L)}
  </div>
</section>
${ctaContato(L)}
</main>
` + rodape(L);
  write(path.join(url, 'index.html'), html);
}

function gerarListas(L, lista, extra) {
  const total = Math.max(1, Math.ceil(lista.length / CFG.porPagina));
  for (let p = 1; p <= total; p++) paginaLista(L, { ...extra, lista, pagina: p, totalPaginas: total });
}

// ---------- 7. páginas de artigo ----------
async function paginaArtigo(L, a, todos) {
  const corpo = await corpoHtml(a.corpo, L);
  const ogImg = await og(a);
  const img = imgDe(a);
  const relacionados = todos.filter((x) => x !== a && x.categoria === a.categoria)
    .concat(todos.filter((x) => x !== a && x.categoria !== a.categoria)).slice(0, 3);
  const urlAbs = `${SITE}${a.url}`;
  const titulo = a.seoTitulo || `${a.titulo} | ${CFG.nome}`;
  const P = person(L);
  const schema = [
    { '@context': 'https://schema.org', '@type': 'BlogPosting', '@id': `${urlAbs}#artigo`, headline: a.titulo, description: a.resumo, image: ogImg,
      datePublished: iso(a.data), dateModified: iso(a.data), inLanguage: L.html, url: urlAbs, mainEntityOfPage: urlAbs,
      articleSection: a.categoria, wordCount: a.corpo.split(/\s+/).length, author: P, publisher: P,
      isPartOf: { '@type': 'Blog', '@id': `${SITE}${L.base}#blog`, name: CFG.nome },
      ...(a.par ? { [L.id === 'en' ? 'translationOfWork' : 'workTranslation']: { '@id': `${SITE}${a.par.url}#artigo` } } : {}),
      ...(a.linkedin ? { sameAs: [a.linkedin] } : {}) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Junior Sturmer', item: `${SITE}${L.home}` },
      { '@type': 'ListItem', position: 2, name: CFG.nome, item: `${SITE}${L.base}` },
      { '@type': 'ListItem', position: 3, name: a.titulo, item: urlAbs }] },
  ];
  const alternates = a.par ? { [L.id]: a.url, [a.par.lang]: a.par.url } : {};
  const trocaIdioma = a.par ? a.par.url : LANGS[OUTRO[L.id]].base;
  const extra = `<meta property="article:published_time" content="${iso(a.data)}">\n<meta property="article:section" content="${esc(a.categoria)}">\n<meta property="article:author" content="Junior Sturmer">\n`;
  const compartilhar = `<div class="bshare">
      <span>${L.compartilhe}</span>
      <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(urlAbs)}" target="_blank" rel="noopener" aria-label="${L.compLi}" data-share="linkedin">${ICON.li}</a>
      <a href="https://wa.me/?text=${encodeURIComponent(a.titulo + ' ' + urlAbs)}" target="_blank" rel="noopener" aria-label="${L.compWa}" data-share="whatsapp">${ICON.wa}</a>
      <button type="button" class="bcopy" data-url="${urlAbs}" aria-label="${L.copiar}" data-label="${L.copiar}">${ICON.link}${ICON.ok}</button>
    </div>`;

  const html = head(L, { titulo, descricao: a.resumo || L.descricao, url: a.url, imagem: ogImg, tipo: 'article', extra, schema, alternates, trocaIdioma, post: a })
    + `<div class="bprog" aria-hidden="true"><i></i></div>
<main>
<article class="art" data-theme="light"${dataPost(a)} data-post-leitura="${a.leitura}">
  <header class="ah">
    <div class="wrap ah-in">
      <nav class="ah-bc" aria-label="${L.voceEsta}"><a href="${L.base}">${esc(CFG.nome)}</a><span aria-hidden="true">/</span><a href="${catUrl(L, a.categoria)}">${esc(a.categoria)}</a></nav>
      <h1 class="t"><span class="l1">${nbspLast(a.titulo)}</span></h1>
      ${a.resumo ? `<p class="ah-sub rv" style="--d:.2s">${esc(a.resumo)}</p>` : ''}
      <div class="ah-by rv" style="--d:.3s">
        <span class="av"><picture><source srcset="/assets/img/junior-sturmer-rosto.webp" type="image/webp"><img src="/assets/img/junior-sturmer-rosto.jpg" width="96" height="96" alt="Junior Sturmer"></picture></span>
        <span><b>Junior Sturmer</b><span class="bmeta"><time datetime="${iso(a.data)}">${L.dataLonga(a.data)}</time><i aria-hidden="true"></i>${L.leitura(a.leitura)}</span></span>
      </div>
    </div>
  </header>
  ${img ? `<div class="wrap ah-cover rv" style="--d:.35s">${picture(img, a.capaAlt, 'ah-pic', '(max-width: 1180px) 100vw, 1124px', true)}</div>` : ''}
  <div class="wrap">
    <div class="prose">
${corpo}
    </div>
    <div class="art-ft">
      ${linkNewsletter(L)}
      ${compartilhar}
    </div>
    ${a.linkedin ? `<div class="art-orig"><a class="borig" href="${esc(a.linkedin)}" target="_blank" rel="noopener">${ICON.li}${L.noLinkedin} ${ICON.diag}</a></div>` : ''}
    <aside class="bauthor" aria-label="${L.sobreAutor}">
      <span class="av"><picture><source srcset="/assets/img/junior-sturmer-rosto.webp" type="image/webp"><img src="/assets/img/junior-sturmer-rosto.jpg" width="96" height="96" alt="" loading="lazy"></picture></span>
      <div>
        <span class="kicker">${L.quemEscreve}</span>
        <p class="ba-n">Junior Sturmer</p>
        <p>${L.bio}</p>
        <div class="ba-acts"><a class="btn btn-ink btn-sm" href="${L.contato}">${L.conversarMarca}<span class="ar">${ICON.seta}</span></a><a class="lnk" href="${L.sobre}">${L.minhaHistoria} ${ICON.seta}</a></div>
      </div>
    </aside>
  </div>
</article>
${relacionados.length ? `<section class="bl brel" data-theme="light" aria-labelledby="rel-h">
  <div class="wrap">
    <div class="bcat"><h2 id="rel-h" class="t">${L.continue}</h2><a class="lnk" href="${L.base}">${L.verTodos} ${ICON.seta}</a></div>
    <div class="bgrid">${relacionados.map((r) => card(L, r, imgDe(r))).join('\n')}</div>
  </div>
</section>` : ''}
${ctaContato(L)}
</main>
` + rodape(L);
  write(path.join(a.url, 'index.html'), html);
}

// ---------- 8. gera os dois idiomas ----------
for (const id of ['pt', 'en']) {
  const L = LANGS[id];
  const todos = POSTS[id];
  // o artigo em destaque fica no topo e sai da grade principal (volta à grade quando outro assumir o destaque)
  const destaque = todos.find((a) => a.destaque) || todos[0] || null;
  gerarListas(L, todos.length > 1 ? todos.filter((a) => a !== destaque) : todos, { todos, destaque, baseUrl: L.base, categoria: null });
  for (const c of new Set(todos.map((a) => a.categoria))) gerarListas(L, todos.filter((a) => a.categoria === c), { todos, destaque: null, baseUrl: catUrl(L, c), categoria: c });
  for (const a of todos) await paginaArtigo(L, a, todos);

  // RSS
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(CFG.nome)} | Junior Sturmer</title>
<link>${SITE}${L.base}</link>
<description>${esc(L.descricao)}</description>
<language>${L.html}</language>
<atom:link href="${SITE}${L.base}feed.xml" rel="self" type="application/rss+xml"/>
${todos.slice(0, 30).map((a) => `<item><title>${esc(a.titulo)}</title><link>${SITE}${a.url}</link><guid>${SITE}${a.url}</guid><pubDate>${a.data.toUTCString()}</pubDate><category>${esc(a.categoria)}</category><description>${esc(a.resumo)}</description></item>`).join('\n')}
</channel>
</rss>
`;
  write(path.join(L.base, 'feed.xml'), rss);
}

// ---------- 9. sitemap e llms.txt ----------
const smFile = path.join(OUT, 'sitemap.xml');
if (fs.existsSync(smFile)) {
  const urls = [];
  for (const id of ['pt', 'en']) {
    const L = LANGS[id];
    const todos = POSTS[id];
    if (!todos.length) continue;
    const hoje = iso(todos[0].data);
    urls.push(`  <url><loc>${SITE}${L.base}</loc><lastmod>${hoje}</lastmod><priority>0.8</priority></url>`);
    for (const c of new Set(todos.map((a) => a.categoria))) urls.push(`  <url><loc>${SITE}${catUrl(L, c)}</loc><lastmod>${hoje}</lastmod><priority>0.5</priority></url>`);
    for (const a of todos) urls.push(`  <url><loc>${SITE}${a.url}</loc><lastmod>${iso(a.data)}</lastmod><priority>0.7</priority></url>`);
  }
  const sm = fs.readFileSync(smFile, 'utf8').replace('</urlset>', urls.join('\n') + '\n</urlset>');
  fs.writeFileSync(smFile, sm);
}

const llmsFile = path.join(OUT, 'llms.txt');
if (fs.existsSync(llmsFile) && POSTS.pt.length) {
  let bloco = `\n## Blog ${CFG.nome}\n${LANGS.pt.descricao}\n- Blog: ${SITE}${LANGS.pt.base}\n${POSTS.pt.map((a) => `- [${a.titulo}](${SITE}${a.url}): ${a.resumo}`).join('\n')}\n`;
  if (POSTS.en.length) bloco += `\n## Blog ${CFG.nome} (English)\n${LANGS.en.descricao}\n- Blog: ${SITE}${LANGS.en.base}\n${POSTS.en.map((a) => `- [${a.titulo}](${SITE}${a.url}): ${a.resumo}`).join('\n')}\n`;
  fs.appendFileSync(llmsFile, bloco);
}

console.log(`[blog] ${POSTS.pt.length} artigos em ${LANGS.pt.base} e ${POSTS.en.length} em ${LANGS.en.base}`);
const semIngles = POSTS.pt.filter((a) => !a.par);
if (semIngles.length) console.warn(`[blog] ATENÇÃO: ${semIngles.length} artigo(s) sem versão em inglês (aparecem só em /blog/): ${semIngles.map((a) => a.slug).join(', ')}`);
