/* Painel de métricas | juniorsturmer.com.br/metricas
   Versão 1: tela completa com dados de exemplo. As conexões reais (GA4, Search Console,
   Instagram e Google Alerts) entram pela função /api/painel/dados. */
(function () {
  'use strict';

  // ---------- utilidades ----------
  const $ = (s, el) => (el || document).querySelector(s);
  const n = (v, d) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  const compacto = (v) => (v >= 10000 ? n(v / 1000, v >= 100000 ? 0 : 1) + ' mil' : n(v));
  const pct = (v, d) => n(v, d === undefined ? 1 : d) + '%';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const soma = (a) => a.reduce((x, y) => x + y, 0);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const MESES_L = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const tempo = (s) => (s >= 60 ? `${Math.floor(s / 60)}min ${String(Math.round(s % 60)).padStart(2, '0')}s` : `${Math.round(s)}s`);

  // ---------- ícones (traço fino) ----------
  const svg = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICO = {
    geral: svg('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>'),
    site: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z"/>'),
    blog: svg('<path d="M5 4h10l4 4v12H5z"/><path d="M14 4v5h5M8.5 13h7M8.5 16.5h5"/>'),
    instagram: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17" cy="7" r=".6" fill="currentColor"/>'),
    presenca: svg('<path d="M12 3.5 14.6 9l6 .6-4.5 4 1.3 5.9L12 16.6l-5.4 2.9 1.3-5.9-4.5-4 6-.6z"/>'),
    linkedin: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 10.5V16M8 7.8v.1M11.5 16v-5.5M11.5 13c0-1.5 1-2.5 2.3-2.5S16 11.3 16 13v3"/>'),
    tiktok: svg('<path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 4c.4 2.3 2 4 4.5 4.3"/>'),
    sair: svg('<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>'),
    calendario: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>'),
    pessoas: svg('<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><path d="M16 5.6a3 3 0 0 1 0 5.8M17.5 14.7c1.6.6 2.7 2.2 3 4.8"/>'),
    olho: svg('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>'),
    faisca: svg('<path d="M12 3c.7 4.2 2.8 6.3 7 7-4.2.7-6.3 2.8-7 7-.7-4.2-2.8-6.3-7-7 4.2-.7 6.3-2.8 7-7Z"/>'),
    clique: svg('<path d="M9 4v3M4 9h3M5.5 5.5l2 2M12 11l8 3-3.5 1.5L15 19z"/>'),
    alvo: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>'),
    grafico: svg('<path d="M4 19h16"/><path d="M5 15l4.5-5 4 3L19 6"/>'),
    trofeu: svg('<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7"/>'),
    relogio: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    livro: svg('<path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z"/><path d="M12 6v13.5"/>'),
    coracao: svg('<path d="M12 19.5S4 15 4 9.4A4 4 0 0 1 12 7.6a4 4 0 0 1 8 1.8c0 5.6-8 10.1-8 10.1Z"/>'),
    envio: svg('<path d="M20.5 3.5 10 14M20.5 3.5 14 20.5l-4-6.5-6.5-4z"/>'),
    salvo: svg('<path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/>'),
    comentario: svg('<path d="M20 12a7.5 7.5 0 0 1-11 6.6L4 20l1.4-4.6A7.5 7.5 0 1 1 20 12Z"/>'),
    mega: svg('<path d="M4 10v4h3l7 4V6L7 10z"/><path d="M17.5 9a4 4 0 0 1 0 6"/>'),
    check: svg('<path d="M5 12.5 10 17l9-10"/>'),
    lupa: svg('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>'),
  };
  const ico = (k) => `<span class="ico">${ICO[k] || ''}</span>`;
  const badge = (k) => `<span class="badge-ico">${ICO[k] || ''}</span>`;

  // ---------- explicações do ícone "i" ----------
  // [o que é, como calcula]
  const TIPS = {
    ig_seguidores: ['Total de seguidores do seu Instagram hoje.', 'Número da conta (followers_count). A variação compara com o total no fim do período anterior.'],
    ig_alcance: ['Contas únicas que viram seu conteúdo no período.', 'Soma diária do alcance da conta (reach). É estimado pela Meta e pode atrasar até 48 h.'],
    ig_engajamento: ['Quanto do público que viu também interagiu.', 'Interações (curtidas, comentários, salvamentos e envios) ÷ alcance × 100. Usamos alcance, e não seguidores, porque é quem de fato viu.'],
    site_visitas: ['Pessoas que entraram no seu site.', 'Usuários ativos no GA4 no período. Suas visitas de casa ficam fora pelo filtro de tráfego interno.'],
    site_leads: ['Pedidos de contato enviados pelo formulário.', 'Evento generate_lead no GA4, que dispara na página de obrigado depois do envio.'],
    presenca: ['Sua nota de relevância como nome na sua área, de 0 a 100.', 'Média ponderada de 5 partes: buscas pelo seu nome (30%), menções na web (30%), marcações no Instagram (15%), sites que mandam visitas (10%) e presença nas IAs (15%). Janela dos últimos 90 dias.'],
    grafico: ['Evolução diária do indicador escolhido.', 'Linha cheia: período atual. Linha tracejada: período anterior de mesmo tamanho, para comparar o ritmo.'],
    metas: ['Metas do mês e se você está no ritmo para bater.', 'Projeção = resultado até hoje ÷ dias passados × dias do mês. "No ritmo" quando a projeção alcança a meta.'],
    meta_seg: ['Seguidores líquidos que você quer ganhar no mês.', 'Meta sugerida = média de seguidores líquidos dos últimos 3 meses × 1,15. Se o mês anterior foi melhor que isso, a meta passa a ser o mês anterior.'],
    meta_leads: ['Pedidos de contato pelo site no mês.', 'Meta sugerida = média dos últimos 3 meses × 1,15, com mínimo de 2.'],
    meta_blog: ['Posts publicados no Além do Logo no mês.', 'Sua meta é 3 posts por semana. No mês, isso vira 3 × semanas do mês.'],
    meta_ig: ['Publicações no feed (reels, carrosséis e estáticos) no mês.', 'Meta sugerida a partir da média de publicações dos últimos 3 meses. Stories ficam fora dessa conta.'],
    top_ig: ['Os posts que mais espalharam no período.', 'Ordenados por envios por alcance, o sinal que o Instagram mais usa para mostrar conteúdo a quem ainda não te segue. Empate decide pelo alcance.'],
    top_blog: ['Os artigos com melhor aderência no período.', 'Ordenados pelo Índice de Aderência. Veja a aba Blog para o cálculo completo.'],
    agora: ['Quem está no seu site neste momento.', 'API de tempo real do GA4: usuários ativos nos últimos 30 minutos. Atualiza a cada 60 segundos.'],
    site_sessoes: ['Visitas ao site, contando retornos da mesma pessoa.', 'Sessões no GA4. Uma pessoa pode ter várias sessões no período.'],
    site_tempo: ['Tempo médio em que o site esteve aberto e em foco por pessoa.', 'Tempo de engajamento do GA4 ÷ usuários. Abas em segundo plano não contam.'],
    site_conv: ['De cada 100 visitantes, quantos pediram contato.', 'Leads ÷ usuários × 100.'],
    site_cta: ['Cliques em botões que levam para a página de contato.', 'Evento cta_click no GA4. Mostra quais chamadas puxam mais gente para o contato.'],
    site_origem: ['De onde as pessoas chegaram.', 'Canal da sessão no GA4: Google, redes sociais, acesso direto, outros sites.'],
    site_paginas: ['Páginas mais vistas do site.', 'Visualizações de página no GA4, somando português e inglês.'],
    site_buscas: ['O que as pessoas digitaram no Google antes de clicar no seu site.', 'Search Console: cliques, impressões e posição média por busca. Tem 2 a 3 dias de atraso.'],
    blog_leitores: ['Pessoas que abriram pelo menos um artigo.', 'Usuários com o evento blog_artigo_view no período.'],
    blog_completa: ['De cada 100 leitores, quantos chegaram ao fim do texto.', 'blog_leitura_completa ÷ blog_artigo_view × 100.'],
    blog_tempo: ['Tempo médio de leitura ativa por leitor.', 'Tempo de engajamento nas páginas dos artigos ÷ leitores. Só conta com a aba em foco.'],
    blog_posts: ['Artigos publicados no mês contra a meta.', 'Conta pela data de publicação dos artigos. Meta: 3 por semana.'],
    blog_indice: ['Nota de 0 a 100 que resume se o artigo prende, espalha e gera contato.', 'Cada métrica é comparada com a média do blog (média = 50). Pesos: leitura completa 25%, tempo engajado 20%, leitores 20%, compartilhamentos 15%, contato 20%. Só entra quem tem 20 leitores ou mais.'],
    blog_comp: ['Compartilhamentos a cada 100 leitores.', 'blog_compartilhar (LinkedIn, WhatsApp e copiar link) ÷ leitores × 100.'],
    blog_contato: ['Cliques para contato a cada 100 leitores.', 'cta_click na página do artigo ÷ leitores × 100.'],
    blog_cat: ['Qual tema prende mais o seu leitor.', 'Média do Índice de Aderência dos artigos de cada categoria. Use para escolher as próximas pautas.'],
    blog_gerou: ['Artigos que levaram alguém a pedir contato.', 'Leads cuja sessão passou pelo artigo antes do formulário. Fica separado porque contato é raro e sumiria na média.'],
    blog_sinais: ['Leituras rápidas para decidir a próxima pauta.', 'Repetir: artigo no top 3 com leitura completa acima da média. Revisar: menor índice do período.'],
    ig_liquidos: ['Seguidores ganhos menos os perdidos no mês.', 'follows_and_unfollows da API do Instagram. É o número da sua meta mensal.'],
    ig_cresc: ['Quanto o perfil cresceu em relação ao tamanho que tinha.', 'Seguidores líquidos no período ÷ seguidores no início × 100.'],
    ig_naoseg: ['Parte do alcance que veio de quem ainda não te segue.', 'Alcance de não seguidores ÷ alcance total × 100. É o melhor sinal de que o perfil está sendo descoberto.'],
    ig_perfil: ['Visitas ao seu perfil vindas dos posts e stories.', 'Soma de profile_visits das publicações do período.'],
    ig_formato: ['Como cada formato está performando, mês contra mês.', 'Quantidade publicada e médias por post. As taxas são por alcance, para comparar posts de tamanhos diferentes.'],
    ig_envios: ['Quantas pessoas mandaram o post por direct a cada 100 que viram.', 'Envios ÷ alcance × 100. Segundo o chefe do Instagram, é o sinal que mais ajuda a alcançar quem não te segue.'],
    ig_curtidas: ['Curtidas a cada 100 pessoas que viram.', 'Curtidas ÷ alcance × 100. Pesa mais para aparecer para quem já te segue.'],
    ig_salvos: ['Quantos guardaram o post para ver depois, a cada 100 que viram.', 'Salvamentos ÷ alcance × 100. Mostra conteúdo útil, de referência.'],
    ig_watch: ['Tempo médio que as pessoas assistem aos seus reels.', 'ig_reels_avg_watch_time, média dos reels do período. Tempo de visualização é um dos 3 sinais que mais pesam.'],
    ig_skip: ['Parte das visualizações que pulou o reel nos 3 primeiros segundos.', 'reels_skip_rate da API (métrica nova, ainda marcada como em desenvolvimento pela Meta). Quanto menor, melhor o gancho.'],
    ig_stories: ['Desempenho médio dos seus stories.', 'Coletado de hora em hora, porque a Meta só libera os dados de um story por 24 h. Stories com menos de 5 visualizações não retornam dados.'],
    ig_saida: ['Parte de quem viu o story e saiu dele.', 'Ações de saída (navigation: exit) ÷ alcance × 100. Quanto menor, mais o story segura.'],
    ig_conv: ['O quanto o Instagram traz gente para o seu negócio.', 'Cruza GA4 e Instagram: visitas e leads no site com origem Instagram, e cliques no link da bio.'],
    ig_meta: ['Sua meta de seguidores do mês e a projeção.', 'Meta = média de seguidores líquidos dos últimos 3 meses × 1,15. A linha tracejada mostra onde você fecha o mês no ritmo atual.'],
    pr_busca: ['Quantas vezes seu nome foi buscado no Google.', 'Search Console: impressões de buscas com "sturmer" ou "jacir junior". Peso 30%. Meta de 12 meses: 1.500 impressões em 90 dias.'],
    pr_web: ['Citações suas em portais, jornais, blogs, podcasts e eventos.', 'Pontos por menção: portal ou jornal 5; entrevista, podcast, palestra ou artigo assinado 4; blog de nicho 2; post de terceiros 1. Peso 30%. Meta: 60 pontos em 90 dias.'],
    pr_ig: ['Posts de outros perfis que te marcaram.', 'Endpoint de marcações (tags) da API do Instagram. Peso 15%. Meta: 15 marcações em 90 dias.'],
    pr_sites: ['Outros sites que mandaram visitas para o seu.', 'GA4: domínios de referência externos, sem contar redes sociais nem buscadores. Peso 10%. Meta: 10 domínios em 90 dias.'],
    pr_ia: ['Se as IAs te citam quando alguém pergunta sobre marca.', 'Checagem mensal de 5 perguntas fixas no ChatGPT, Gemini, Claude e Perplexity. Nota = citações ÷ 20. Peso 15%.'],
    pr_escala: ['Como cada parte vira nota de 0 a 100.', 'Nota = raiz quadrada (resultado ÷ meta de 12 meses) × 100, limitada a 100. A raiz faz as primeiras conquistas aparecerem mais rápido.'],
    pr_marcos: ['Os marcos que você definiu para se sentir um nome relevante.', 'Marcados como feitos quando uma menção confirmada atende o marco.'],
    pr_mencoes: ['Menções confirmadas por você.', 'Vêm do Google Alerts (depois da sua revisão) ou do cadastro manual.'],
    pr_mapa: ['Todos os lugares onde você já foi citado, de qualquer data.', 'Cada citação vale pelos pesos da nota: portal ou jornal 5; entrevista, podcast, palestra ou artigo assinado 4; blog de nicho 2; post de terceiros 1. Só as dos últimos 90 dias entram na nota; as mais antigas formam seu histórico. A base inicial veio de uma varredura na web em 24/11/2026.'],
    pr_revisar: ['Possíveis menções encontradas pelo Google Alerts.', 'Os 3 alertas são lidos a cada 6 horas. O feed traz tudo que cita os nomes monitorados; páginas do seu próprio site já saem descartadas. Você confirma o que é você e escolhe o tipo, que define os pontos.'],
    ig_conectar: ['Liga o painel à sua conta profissional do Instagram.', 'Você autoriza só a leitura (perfil e estatísticas) na tela da Meta, escolhendo a Página ligada ao @juniorsturmer. O acesso fica guardado no servidor, não expira e pode ser removido no Facebook em Configurações > Integrações comerciais.'],
    pr_nomes: ['Nomes que o Google Alerts monitora.', 'Junior Sturmer, Jacir Sturmer e Selzler Sturmer pegam todas as formas do seu nome completo. "Jacir Junior" é comum demais, então só conta junto com TruckPag.'],
  };
  const i = (k) => (TIPS[k] ? `<button class="i" type="button" data-tip="${k}" aria-label="O que é este indicador">i</button>` : '');

  // ---------- dados de exemplo ----------
  function rnd(seed) {
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const HOJE = new Date();
  const DIAS = 200;
  const datas = Array.from({ length: DIAS }, (_, k) => { const d = new Date(HOJE); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - (DIAS - 1 - k)); return d; });
  function serie(base, tend, amp, ruido, seed, inteiro) {
    const r = rnd(seed);
    return datas.map((d, k) => {
      const fimDeSemana = d.getDay() === 0 || d.getDay() === 6 ? 0.72 : 1;
      const onda = 1 + amp * Math.sin(k / 5.3) + amp * 0.6 * Math.sin(k / 13.1);
      const v = (base + tend * k) * fimDeSemana * onda * (1 + (r() - 0.5) * ruido);
      return inteiro ? Math.max(0, Math.round(v)) : Math.max(0, v);
    });
  }
  const S = {
    visitas: serie(14, 0.16, 0.18, 0.5, 11, true),
    leads: (() => { const r = rnd(12); return datas.map(() => (r() < 0.12 ? 1 : 0)); })(),
    cta: serie(1.1, 0.012, 0.25, 1.1, 13, true),
    alcance: serie(820, 3.2, 0.32, 0.55, 21, true),
    envios: serie(23, 0.12, 0.4, 0.7, 22, true),
    interacoes: serie(34, 0.12, 0.3, 0.6, 23, true),
    ganhos: serie(5.5, 0.025, 0.45, 1.0, 24, true),
    perdidos: serie(1.8, 0.002, 0.3, 1.2, 25, true),
    perfil: serie(46, 0.2, 0.3, 0.6, 26, true),
  };
  S.liquidos = S.ganhos.map((g, k) => g - S.perdidos[k]);
  let SEGUIDORES_HOJE = 3184;

  const POSTS_BLOG = [
    { t: 'Sua marca não é o seu logo', c: 'Branding', l: 312, comp: 61, tempo: 214, sh: 4.2, ct: 1.3, gerou: 2 },
    { t: 'Posicionamento é escolher o que deixar de fora', c: 'Posicionamento', l: 248, comp: 66, tempo: 236, sh: 5.1, ct: 1.6, gerou: 1 },
    { t: 'Território de marca: o espaço que sua empresa pode ocupar', c: 'Estratégia', l: 176, comp: 58, tempo: 251, sh: 3.4, ct: 1.1, gerou: 1 },
    { t: 'Marca não é custo de marketing, é ativo do negócio', c: 'Negócios', l: 204, comp: 49, tempo: 188, sh: 3.9, ct: 0.5, gerou: 0 },
    { t: 'O que aprendi construindo uma marca do zero', c: 'Bastidores', l: 286, comp: 54, tempo: 198, sh: 2.8, ct: 0.3, gerou: 0 },
    { t: 'Por que empresa B2B também precisa de marca', c: 'Branding', l: 131, comp: 52, tempo: 176, sh: 2.3, ct: 0.8, gerou: 0 },
    { t: 'Rebranding: quando mudar e quando só arrumar a casa', c: 'Identidade visual', l: 97, comp: 44, tempo: 162, sh: 2.1, ct: 1.0, gerou: 1 },
    { t: 'Marca forte começa dentro de casa', c: 'Branding', l: 88, comp: 39, tempo: 141, sh: 1.1, ct: 0, gerou: 0 },
    { t: 'Marketing de baixo custo começa no que você já paga', c: 'Estratégia', l: 14, comp: 50, tempo: 170, sh: 0, ct: 0, gerou: 0 },
  ];
  const PESOS = { comp: 0.25, tempo: 0.2, l: 0.2, sh: 0.15, ct: 0.2 };
  function calcularIndice() {
    const validos = POSTS_BLOG.filter((p) => p.l >= 20);
    const media = {};
    for (const k of Object.keys(PESOS)) media[k] = soma(validos.map((p) => p[k])) / validos.length || 1;
    for (const p of POSTS_BLOG) {
      p.valido = p.l >= 20;
      p.indice = p.valido ? Math.round(soma(Object.keys(PESOS).map((k) => PESOS[k] * clamp((50 * p[k]) / (media[k] || 1), 0, 100)))) : null;
    }
  }
  calcularIndice();

  // ---------- dados reais (preenchidos por /api/painel/dados) ----------
  let DADOS = null;
  let LISTA_POSTS = null;
  const REAL = { site: false, blog: false, buscas: false, agora: false, referencias: false, ig: false, presenca: false };
  const real = (k) => REAL[k];
  const tagExemplo = '<span class="tag alerta" title="Esta parte ainda usa dados de exemplo">exemplo</span>';

  const POSTS_IG = [
    { t: 'O logo é a última coisa que eu desenho', f: 'Reel', th: 't2', alc: 9840, env: 4.1, sal: 3.2, cur: 6.8, d: 3 },
    { t: '5 sinais de que sua marca precisa de posicionamento', f: 'Carrossel', th: 't1', alc: 6210, env: 3.6, sal: 5.4, cur: 5.9, d: 8 },
    { t: 'Bastidores de um projeto de identidade', f: 'Carrossel', th: 't3', alc: 4980, env: 2.4, sal: 3.9, cur: 7.2, d: 12 },
    { t: 'O erro de copiar o concorrente', f: 'Reel', th: 't4', alc: 7120, env: 2.2, sal: 1.8, cur: 5.1, d: 17 },
  ];
  const FORMATOS = [
    { f: 'Reels', q: 6, qa: 4, alc: 5930, env: 2.9, sal: 2.1, cur: 5.6 },
    { f: 'Carrosséis', q: 5, qa: 6, alc: 4120, env: 2.6, sal: 4.4, cur: 6.3 },
    { f: 'Estáticos', q: 2, qa: 3, alc: 1880, env: 0.9, sal: 1.2, cur: 4.8 },
    { f: 'Stories', q: 38, qa: 31, alc: 412, env: 0.6, sal: null, cur: null },
  ];
  const PRESENCA = {
    nota: 17, nota90: 11,
    comp: [
      { k: 'pr_busca', nome: 'Buscas pelo seu nome', det: '420 impressões em 90 dias', peso: 30, nota: 26 },
      { k: 'pr_web', nome: 'Menções na web', det: '9 pontos em 90 dias', peso: 30, nota: 12 },
      { k: 'pr_ig', nome: 'Marcações no Instagram', det: '6 marcações em 90 dias', peso: 15, nota: 20 },
      { k: 'pr_sites', nome: 'Sites que mandam visitas', det: '2 domínios em 90 dias', peso: 10, nota: 15 },
      { k: 'pr_ia', nome: 'Presença nas IAs', det: '1 citação em 20 checagens', peso: 15, nota: 8 },
    ],
    marcos: [
      { t: 'Entrevista em um portal nacional de marketing', ok: false },
      { t: 'Palestra em um evento do setor', ok: false },
      { t: 'Ser citado pelas IAs em perguntas sobre estratégia de marca', ok: false },
    ],
    mencoes: [
      { t: 'Entrevista sobre marca no B2B', v: 'Podcast de negócios (exemplo)', tipo: 'Podcast', p: 4, d: '12 nov' },
      { t: 'Artigo citado em newsletter de marketing', v: 'Blog de nicho (exemplo)', tipo: 'Blog', p: 2, d: '28 out' },
      { t: 'Post de cliente marcando o projeto de marca', v: 'LinkedIn (exemplo)', tipo: 'Rede social', p: 1, d: '19 out' },
      { t: 'Matéria sobre ação de marca no setor', v: 'Portal regional (exemplo)', tipo: 'Portal', p: 5, d: '02 out' },
    ],
    revisar: [
      { t: '"Junior Sturmer" em lista de palestrantes', v: 'site de evento (exemplo)' },
      { t: '"Jacir Junior" em resultado de corrida de rua', v: 'site esportivo (exemplo)' },
    ],
    ia: {
      perguntas: [
        'Quem é Junior Sturmer?',
        'Quais estrategistas de marca você indica no Brasil para empresas B2B?',
        'Quem faz consultoria de branding em Cascavel, Paraná?',
        'Quem são especialistas em posicionamento de marca para empresas de médio porte?',
        'Quem escreve sobre marca e estratégia para donos de empresa no Brasil?',
      ],
      ias: ['ChatGPT', 'Gemini', 'Claude', 'Perplexity'],
      res: [[0, 0, 0, 1], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
    },
  };

  // ---------- período ----------
  const PERIODOS = [['7', '7 dias'], ['30', '30 dias'], ['90', '90 dias'], ['mes', 'Este mês']];
  let periodo = '30';
  function janela() {
    const fim = DIAS - 1;
    if (periodo === 'mes') {
      const d = HOJE.getDate();
      const ini = fim - d + 1;
      const diasMesAnt = new Date(HOJE.getFullYear(), HOJE.getMonth(), 0).getDate();
      const pIni = ini - diasMesAnt;
      return { ini, fim, pIni, pFim: pIni + d - 1, rotulo: 'mesmos dias do mês anterior' };
    }
    const q = Number(periodo);
    return { ini: fim - q + 1, fim, pIni: fim - 2 * q + 1, pFim: fim - q, rotulo: `${q} dias anteriores` };
  }
  const fatia = (a, x, y) => a.slice(x, y + 1);
  function total(chave) {
    const j = janela();
    return { atual: soma(fatia(S[chave], j.ini, j.fim)), ant: soma(fatia(S[chave], j.pIni, j.pFim)) };
  }
  function delta(atual, ant, sufixo) {
    if (!ant) return `<span class="delta flat">novo</span>`;
    const v = ((atual - ant) / Math.abs(ant)) * 100;
    const cls = Math.abs(v) < 0.5 ? 'flat' : v > 0 ? 'up' : 'down';
    return `<span class="delta ${cls}">${v > 0 ? '+' : ''}${n(v, 0)}${sufixo || '%'}</span>`;
  }
  function deltaPts(atual, ant, sufixo) {
    const v = atual - ant;
    const cls = Math.abs(v) < 0.05 ? 'flat' : v > 0 ? 'up' : 'down';
    return `<span class="delta ${cls}">${v > 0 ? '+' : ''}${n(v, Math.abs(v) < 10 ? 1 : 0)}${sufixo || ' p.p.'}</span>`;
  }

  // ---------- componentes ----------
  function kpi(o) {
    return `<div class="card kpi">
      <div class="card-h-l">${badge(o.ico)}</div>
      <div class="kpi-l">${esc(o.label)} ${i(o.tip)}</div>
      <div class="kpi-v">${o.valor}</div>
      <div class="kpi-d">${o.delta || ''}<span>${o.nota || 'vs ' + janela().rotulo}</span></div>
    </div>`;
  }
  function cardH(t, s, tip, icone, dir) {
    return `<div class="card-h"><div class="card-h-l">${icone ? badge(icone) : ''}<div><div class="card-t">${t} ${i(tip)}</div>${s ? `<div class="card-s">${s}</div>` : ''}</div></div>${dir || ''}</div>`;
  }
  function metaBloco(o) {
    const pctFeito = clamp((o.atual / o.meta) * 100, 0, 100);
    const proj = o.proj !== undefined ? clamp((o.proj / o.meta) * 100, 0, 100) : null;
    const tag = o.atual >= o.meta ? '<span class="tag feito">Meta batida</span>' : (o.proj || o.atual) >= o.meta ? '<span class="tag ok">No ritmo</span>' : '<span class="tag alerta">Abaixo do ritmo</span>';
    return `<div class="meta">
      <div class="meta-h"><strong>${esc(o.nome)} ${i(o.tip)}</strong>${tag}</div>
      <div class="meta-row"><span><b class="tnum">${n(o.atual)}</b> de ${n(o.meta)}</span><span>${n(pctFeito, 0)}%</span></div>
      <div class="bar"><span style="width:${pctFeito}%"></span>${proj !== null ? `<i class="proj" style="left:0;width:${proj}%"></i>` : ''}</div>
      ${o.rodape ? `<div class="meta-f">${o.rodape}</div>` : ''}
    </div>`;
  }
  function postsIg(lista) {
    const ordenados = [...lista].sort((a, b) => b.env - a.env || b.alc - a.alc).slice(0, 4);
    if (!ordenados.length) return '<div class="card-s">Nenhum post no período.</div>';
    return `<div class="posts">${ordenados.map((p) => {
      const d = new Date(HOJE); d.setDate(d.getDate() - p.d);
      return `<article class="post">
        <div class="post-b">
          <div class="post-d">${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}</div>
          <div class="post-t">${p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">${esc(p.t)}</a>` : esc(p.t)}</div>
          <div class="post-m">
            <div><span class="pi">${ICO.olho}</span><b>${compacto(p.alc)}</b>Alcance</div>
            <div><span class="pi">${ICO.envio}</span><b>${pct(p.env)}</b>Envios</div>
            <div><span class="pi">${ICO.salvo}</span><b>${pct(p.sal)}</b>Salvos</div>
            <div><span class="pi">${ICO.coracao}</span><b>${pct(p.cur)}</b>Curtidas</div>
          </div>
        </div>
        <div class="thumb ${p.img ? 'com-img' : p.th}"><span class="fmt">${p.f}</span>${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ICO.instagram}</div>
      </article>`;
    }).join('')}</div>`;
  }
  function rankingBlog(limite, compacto_) {
    const lista = POSTS_BLOG.filter((p) => p.valido).sort((a, b) => b.indice - a.indice).slice(0, limite || 99);
    const linhas = lista.map((p, k) => `<tr>
      <td><span class="rank ${k === 0 ? 'r1' : ''}">${k + 1}</span></td>
      <td><div class="t-tit">${esc(p.t)}</div><div class="t-cat">${esc(p.c)}</div></td>
      ${compacto_ ? '' : `<td class="n">${n(p.l)}</td><td class="n">${pct(p.comp, 0)}</td><td class="n">${tempo(p.tempo)}</td><td class="n">${n(p.sh, 1)}</td><td class="n">${n(p.ct, 1)}</td>`}
      <td class="n"><div class="score"><div class="bar"><span style="width:${p.indice}%"></span></div><b>${p.indice}</b></div></td>
    </tr>`).join('');
    const cab = compacto_
      ? `<th></th><th>Artigo</th><th class="n">Índice ${i('blog_indice')}</th>`
      : `<th></th><th>Artigo</th><th class="n">Leitores ${i('blog_leitores')}</th><th class="n">Leitura completa ${i('blog_completa')}</th><th class="n">Tempo ${i('blog_tempo')}</th><th class="n">Compart./100 ${i('blog_comp')}</th><th class="n">Contato/100 ${i('blog_contato')}</th><th class="n">Índice ${i('blog_indice')}</th>`;
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${cab}</tr></thead><tbody>${linhas}</tbody></table></div>`;
  }
  function anel(valor, tam) {
    const r = tam === 'sm' ? 38 : 64;
    const c = 2 * Math.PI * r;
    const box = tam === 'sm' ? 92 : 150;
    return `<div class="ring ${tam || ''}"><svg viewBox="0 0 ${box} ${box}"><circle cx="${box / 2}" cy="${box / 2}" r="${r}" fill="none" stroke="#ecece7" stroke-width="${tam === 'sm' ? 8 : 12}"/><circle cx="${box / 2}" cy="${box / 2}" r="${r}" fill="none" stroke="#111" stroke-width="${tam === 'sm' ? 8 : 12}" stroke-linecap="round" stroke-dasharray="${(c * valor) / 100} ${c}"/></svg><div class="ring-c"><div><b class="tnum">${valor}</b><small>de 100</small></div></div></div>`;
  }
  const FAIXAS = ['Começando', 'Em construção', 'Reconhecido no nicho', 'Referência regional', 'Referência nacional'];
  const faixa = (v) => FAIXAS[Math.min(4, Math.floor(Math.max(0, v - 1) / 20))];

  // ---------- Instagram: números usados nas telas (exemplo ou reais) ----------
  const razao = (a, b) => (b ? (a / b) * 100 : 0);
  const media = (arr) => (arr.length ? soma(arr) / arr.length : 0);
  const NOME_FORMATO = { reel: 'Reel', carrossel: 'Carrossel', estatico: 'Estático', story: 'Story' };
  function noPeriodo(dia, ini, fim) { const a = ymdLocal(datas[ini]), b = ymdLocal(datas[fim]); return dia >= a && dia <= b; }
  function ymdLocal(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function igDados() {
    const j = janela();
    if (!REAL.ig) {
      const liq = total('liquidos'), a = total('alcance'), it = total('interacoes'), en = total('envios'), pf = total('perfil');
      return {
        real: false, seguidores: SEGUIDORES_HOJE, liq, alcance: a, perfil: pf,
        eng: razao(it.atual, a.atual), engA: razao(it.ant, a.ant),
        env: razao(en.atual, a.atual), envA: razao(en.ant, a.ant), cur: 5.7, curA: 5.2, sal: 3.1, salA: 3.3,
        ns: 38.4, nsA: 33.9, watch: 11.4, watchA: 9.8, skip: 41, skipA: 46,
        stories: { alc: 412, alcA: 377, saida: 7.8, saidaA: 9.1, resp: 27, perfil: 34 },
        conv: { visitas: Math.round(total('visitas').atual * 0.17), leads: 1, toques: 58, perfilPorPost: pf.atual / 13 },
        posts: POSTS_IG, formatos: FORMATOS,
      };
    }
    const I = DADOS.instagram;
    const P = I.periodo || { atual: {}, ant: {} };
    const A = P.atual || {}, B = P.ant || {};
    const v = (o, k) => Number(o[k] || 0);
    const feed = I.midias.filter((m) => m.formato !== 'story');
    const atual = feed.filter((m) => noPeriodo(m.dia, j.ini, j.fim));
    const ant = feed.filter((m) => noPeriodo(m.dia, j.pIni, j.pFim));
    const st = I.stories.filter((x) => noPeriodo(x.dia, j.ini, j.fim));
    const stA = I.stories.filter((x) => noPeriodo(x.dia, j.pIni, j.pFim));
    const reels = (l) => l.filter((m) => m.formato === 'reel');
    const watch = (l) => media(reels(l).map((m) => Number(m.i.ig_reels_avg_watch_time || 0) / 1000).filter(Boolean));
    const skip = (l) => media(reels(l).map((m) => Number(m.i.reels_skip_rate || 0)).filter(Boolean).map((x) => (x <= 1 ? x * 100 : x)));
    const saida = (l) => razao(soma(l.map((x) => Number((x.i.navegacao && (x.i.navegacao.TAP_EXIT || x.i.navegacao.tap_exit)) || 0))), soma(l.map((x) => Number(x.i.reach || 0))));
    const perfilPosts = soma(atual.map((m) => Number(m.i.profile_visits || 0))) + soma(st.map((x) => Number(x.i.profile_visits || 0)));
    const perfilAnt = soma(ant.map((m) => Number(m.i.profile_visits || 0))) + soma(stA.map((x) => Number(x.i.profile_visits || 0)));
    // formatos: mês atual contra o anterior
    const mesAtual = ymdLocal(HOJE).slice(0, 7);
    const dAnt = new Date(HOJE.getFullYear(), HOJE.getMonth() - 1, 1);
    const mesAnt = ymdLocal(dAnt).slice(0, 7);
    const doMes = (l, m) => l.filter((x) => x.dia.slice(0, 7) === m);
    const linhaFormato = (nome, chave) => {
      const l = chave === 'story' ? I.stories : feed.filter((m) => m.formato === chave);
      const cur = doMes(l, mesAtual), prev = doMes(l, mesAnt);
      const sumI = (arr, k) => soma(arr.map((x) => Number(x.i[k] || 0)));
      const alc = sumI(cur, 'reach');
      return { f: nome, q: cur.length, qa: prev.length, alc: cur.length ? alc / cur.length : 0, env: razao(sumI(cur, 'shares'), alc), sal: chave === 'story' ? null : razao(sumI(cur, 'saved'), alc), cur: chave === 'story' ? null : razao(sumI(cur, 'likes'), alc) };
    };
    return {
      real: true,
      seguidores: (I.perfil && I.perfil.seguidores) || 0,
      liq: { atual: v(A, 'follows') - v(A, 'unfollows'), ant: v(B, 'follows') - v(B, 'unfollows') },
      alcance: { atual: v(A, 'reach'), ant: v(B, 'reach') },
      perfil: { atual: perfilPosts, ant: perfilAnt },
      eng: razao(v(A, 'total_interactions'), v(A, 'reach')), engA: razao(v(B, 'total_interactions'), v(B, 'reach')),
      env: razao(v(A, 'shares'), v(A, 'reach')), envA: razao(v(B, 'shares'), v(B, 'reach')),
      cur: razao(v(A, 'likes'), v(A, 'reach')), curA: razao(v(B, 'likes'), v(B, 'reach')),
      sal: razao(v(A, 'saves'), v(A, 'reach')), salA: razao(v(B, 'saves'), v(B, 'reach')),
      ns: razao(v(A, 'reach_nao_seguidores'), v(A, 'reach')), nsA: razao(v(B, 'reach_nao_seguidores'), v(B, 'reach')),
      watch: watch(atual), watchA: watch(ant), skip: skip(atual), skipA: skip(ant),
      stories: { alc: media(st.map((x) => Number(x.i.reach || 0))), alcA: media(stA.map((x) => Number(x.i.reach || 0))), saida: saida(st), saidaA: saida(stA), resp: soma(st.map((x) => Number(x.i.replies || 0))), perfil: soma(st.map((x) => Number(x.i.profile_visits || 0))), qtd: st.length },
      conv: { visitas: DADOS.vindosDoInstagram ? DADOS.vindosDoInstagram.usuarios : 0, leads: DADOS.vindosDoInstagram ? DADOS.vindosDoInstagram.leads : 0, toques: v(A, 'profile_links_taps'), perfilPorPost: atual.length ? perfilPosts / atual.length : 0 },
      posts: atual.map((m) => {
        const alc = Number(m.i.reach || 0);
        const dd = new Date(m.dia + 'T12:00:00');
        return { t: m.texto || NOME_FORMATO[m.formato], f: NOME_FORMATO[m.formato], th: 't1', img: m.thumb, link: m.link, alc, env: razao(Number(m.i.shares || 0), alc), sal: razao(Number(m.i.saved || 0), alc), cur: razao(Number(m.i.likes || 0), alc), d: Math.round((HOJE - dd) / 864e5) };
      }),
      formatos: [linhaFormato('Reels', 'reel'), linhaFormato('Carrosséis', 'carrossel'), linhaFormato('Estáticos', 'estatico'), linhaFormato('Stories', 'story')],
    };
  }

  // ---------- gráfico ----------
  const GRAF = {
    visitas: { nome: 'Visitas ao site', serie: 'visitas' },
    leads: { nome: 'Leads', serie: 'leads' },
    cta: { nome: 'Cliques em contato', serie: 'cta' },
    alcance: { nome: 'Alcance no Instagram', serie: 'alcance' },
    envios: { nome: 'Envios no Instagram', serie: 'envios' },
    liquidos: { nome: 'Seguidores líquidos', serie: 'liquidos' },
    interacoes: { nome: 'Interações no Instagram', serie: 'interacoes' },
  };
  function graficoCard(id, opcoes, titulo, sub) {
    return `<div class="card" data-graf="${id}" data-opcoes="${opcoes.join(',')}">
      ${cardH(titulo, sub, 'grafico', 'grafico')}
      <div class="chart-top">
        <div class="tabs" role="tablist">${opcoes.map((o, k) => `<button type="button" role="tab" data-g="${o}" aria-selected="${k === 0}">${GRAF[o].nome}</button>`).join('')}</div>
        <div class="legend"><span><i></i>Período atual</span><span><i class="prev"></i>Período anterior</span></div>
      </div>
      <div class="chart"></div>
    </div>`;
  }
  function desenharGrafico(card) {
    const alvo = $('.chart', card);
    const sel = $('.tabs [aria-selected="true"]', card).dataset.g;
    const j = janela();
    const atual = fatia(S[GRAF[sel].serie], j.ini, j.fim);
    const ant = fatia(S[GRAF[sel].serie], j.pIni, j.pFim);
    const W = Math.max(300, alvo.clientWidth), H = Math.max(260, Math.min(420, alvo.clientHeight || 260)), pl = 40, pr = 10, pt = 14, pb = 28;
    const max = Math.max(1, ...atual, ...ant) * 1.12;
    const passo = (W - pl - pr) / Math.max(1, atual.length - 1);
    const x = (k) => pl + k * passo;
    const y = (v) => pt + (H - pt - pb) * (1 - v / max);
    const linha = (arr) => arr.map((v, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)},${y(v).toFixed(1)}`).join('');
    const area = `${linha(atual)}L${x(atual.length - 1).toFixed(1)},${y(0)}L${x(0)},${y(0)}Z`;
    let grade = '';
    for (let g = 0; g <= 4; g++) {
      const v = (max / 4) * g;
      grade += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="#efefea"/><text x="${pl - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#8c8c86">${compacto(Math.round(v))}</text>`;
    }
    const marcas = Math.min(7, atual.length);
    let rotulos = '';
    for (let m = 0; m < marcas; m++) {
      const k = Math.round((m * (atual.length - 1)) / Math.max(1, marcas - 1));
      const d = datas[j.ini + k];
      rotulos += `<text x="${x(k)}" y="${H - 6}" text-anchor="middle" font-size="11" fill="#8c8c86">${d.getDate()} ${MESES[d.getMonth()]}</text>`;
    }
    alvo.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}">
      <defs><linearGradient id="ga-${card.dataset.graf}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#111" stop-opacity=".10"/><stop offset="1" stop-color="#111" stop-opacity="0"/></linearGradient></defs>
      ${grade}${rotulos}
      <path d="${linha(ant)}" fill="none" stroke="#b9b9b2" stroke-width="1.5" stroke-dasharray="4 4"/>
      <path d="${area}" fill="url(#ga-${card.dataset.graf})"/>
      <path d="${linha(atual)}" fill="none" stroke="#111" stroke-width="2"/>
      <line class="cx" x1="0" x2="0" y1="${pt}" y2="${H - pb}" stroke="#111" stroke-opacity=".25" visibility="hidden"/>
      <circle class="cp" r="4.5" fill="#111" stroke="#fff" stroke-width="2" visibility="hidden"/>
      <rect x="${pl}" y="0" width="${W - pl - pr}" height="${H}" fill="transparent" class="hit"/>
    </svg><div class="hover-box" hidden></div>`;
    const svgEl = $('svg', alvo), hit = $('.hit', alvo), cx = $('.cx', alvo), cp = $('.cp', alvo), box = $('.hover-box', alvo);
    const inteiro = sel !== 'leads';
    hit.addEventListener('pointermove', (e) => {
      const r = svgEl.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * W;
      const k = clamp(Math.round((px - pl) / passo), 0, atual.length - 1);
      cx.setAttribute('x1', x(k)); cx.setAttribute('x2', x(k)); cx.setAttribute('visibility', 'visible');
      cp.setAttribute('cx', x(k)); cp.setAttribute('cy', y(atual[k])); cp.setAttribute('visibility', 'visible');
      const d = datas[j.ini + k];
      box.hidden = false;
      box.style.left = `${(x(k) / W) * 100}%`;
      box.innerHTML = `${d.getDate()} ${MESES[d.getMonth()]}<b>${inteiro ? n(atual[k]) : n(atual[k])}</b>${GRAF[sel].nome}${ant[k] !== undefined ? `<br><span style="color:#8c8c86">Anterior: ${n(ant[k])}</span>` : ''}`;
    });
    hit.addEventListener('pointerleave', () => { cx.setAttribute('visibility', 'hidden'); cp.setAttribute('visibility', 'hidden'); box.hidden = true; });
  }
  function ativarGraficos() {
    document.querySelectorAll('[data-graf]').forEach((card) => {
      desenharGrafico(card);
      $('.tabs', card).addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        card.querySelectorAll('.tabs button').forEach((x) => x.setAttribute('aria-selected', x === b));
        desenharGrafico(card);
      });
    });
  }

  // ---------- metas do mês ----------
  function metasDoMes() {
    const dia = HOJE.getDate();
    const diasMes = new Date(HOJE.getFullYear(), HOJE.getMonth() + 1, 0).getDate();
    const iniMes = DIAS - dia;
    const doMes = (k) => soma(S[k].slice(iniMes));
    const media3 = (k) => {
      const tot = [];
      for (let m = 1; m <= 3; m++) {
        const ini = new Date(HOJE.getFullYear(), HOJE.getMonth() - m, 1);
        const fim = new Date(HOJE.getFullYear(), HOJE.getMonth() - m + 1, 0);
        tot.push(soma(S[k].filter((_, idx) => datas[idx] >= ini && datas[idx] <= new Date(fim.getTime() + 864e5 - 1))));
      }
      return { media: soma(tot) / 3, ultimo: tot[0] };
    };
    const projetar = (v) => Math.round((v / dia) * diasMes);
    let seg = media3('liquidos');
    let liqMes = doMes('liquidos');
    let rodapeSeg = null;
    if (REAL.ig) {
      const I = DADOS.instagram;
      const lista = (I.meses || []).filter((m) => m.follows || m.unfollows);
      liqMes = I.mes && I.mes.atual ? (I.mes.atual.follows || 0) - (I.mes.atual.unfollows || 0) : 0;
      if (lista.length) seg = { media: soma(lista.map((m) => m.liquidos)) / lista.length, ultimo: lista[0].liquidos };
      else { seg = { media: (liqMes / Math.max(1, Math.min(dia, 7))) * diasMes / 1.15, ultimo: 0 }; rodapeSeg = `Meta provisória pelo ritmo dos primeiros dias, revista no dia 8 · projeção: ${n(projetar(liqMes))}`; }
    }
    const metaSeg = Math.max(1, Math.round(Math.max(seg.media * 1.15, seg.ultimo)));
    const ld = media3('leads');
    const metaLeads = Math.max(2, Math.round(ld.media * 1.15));
    const semanas = Math.round((diasMes / 7) * 10) / 10;
    const metaBlog = Math.round(3 * semanas);
    const blogFeitos = LISTA_POSTS
      ? LISTA_POSTS.filter((a) => { const d = new Date(a.data + 'T12:00:00'); return d.getFullYear() === HOJE.getFullYear() && d.getMonth() === HOJE.getMonth(); }).length
      : Math.min(metaBlog, Math.round((dia / diasMes) * metaBlog * 0.82));
    let metaIg = 14;
    let igFeitos = Math.round((dia / diasMes) * 13 * 0.96);
    if (REAL.ig) {
      const feed = DADOS.instagram.midias.filter((m) => m.formato !== 'story');
      const mesStr = (k) => { const d = new Date(HOJE.getFullYear(), HOJE.getMonth() - k, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
      igFeitos = feed.filter((m) => m.dia.slice(0, 7) === mesStr(0)).length;
      metaIg = Math.max(4, Math.round(soma([1, 2, 3].map((k) => feed.filter((m) => m.dia.slice(0, 7) === mesStr(k)).length)) / 3));
    }
    return {
      seg: { nome: 'Seguidores líquidos', tip: 'meta_seg', atual: liqMes, meta: metaSeg, proj: projetar(liqMes), rodape: rodapeSeg || `Projeção para ${MESES_L[HOJE.getMonth()]}: ${n(projetar(liqMes))} · meta sugerida pela média de 3 meses (${n(seg.media, 0)}) + 15%` },
      leads: { nome: 'Leads pelo site', tip: 'meta_leads', atual: doMes('leads'), meta: metaLeads, proj: projetar(doMes('leads')), rodape: `Projeção: ${n(projetar(doMes('leads')))}` },
      blog: { nome: 'Posts no blog', tip: 'meta_blog', atual: blogFeitos, meta: metaBlog, proj: projetar(blogFeitos), rodape: `3 por semana · projeção: ${n(projetar(blogFeitos))}` },
      ig: { nome: 'Posts no feed do Instagram', tip: 'meta_ig', atual: igFeitos, meta: metaIg, proj: projetar(igFeitos), rodape: `Reels, carrosséis e estáticos · projeção: ${n(projetar(igFeitos))}` },
    };
  }

  // ---------- telas ----------
  const VIEWS = {
    geral: {
      nome: 'Visão geral', ico: 'geral', sub: 'Site, blog, Instagram e presença em uma tela.',
      html() {
        const R = real('site') ? DADOS.site : null;
        const v = R ? { atual: R.atual.usuarios, ant: R.ant.usuarios } : total('visitas');
        const l = R ? { atual: R.atual.leads, ant: R.ant.leads } : total('leads');
        const G = igDados();
        const a = G.alcance, liq = G.liq;
        const j = janela();
        const itA = G.eng, itP = G.engA;
        const metas = metasDoMes();
        return `
        <div class="grid g-kpi">
          ${kpi({ ico: 'pessoas', label: 'Seguidores no Instagram', tip: 'ig_seguidores', valor: n(G.seguidores), delta: delta(liq.atual, liq.ant), nota: `${liq.atual >= 0 ? '+' : ''}${n(liq.atual)} no período` })}
          ${kpi({ ico: 'olho', label: 'Alcance no Instagram', tip: 'ig_alcance', valor: compacto(a.atual), delta: delta(a.atual, a.ant) })}
          ${kpi({ ico: 'faisca', label: 'Engajamento por alcance', tip: 'ig_engajamento', valor: pct(itA), delta: deltaPts(itA, itP) })}
          ${kpi({ ico: 'site', label: 'Visitas ao site', tip: 'site_visitas', valor: n(v.atual), delta: delta(v.atual, v.ant) })}
          ${kpi({ ico: 'alvo', label: 'Leads pelo site', tip: 'site_leads', valor: n(l.atual), delta: delta(l.atual, l.ant) })}
          ${kpi({ ico: 'presenca', label: 'Nota de Presença', tip: 'presenca', valor: `${PRESENCA.nota}<small>/100</small>`, delta: deltaPresenca(), nota: PRESENCA.nota90 === null ? 'sem comparação ainda' : 'vs 90 dias anteriores' })}
        </div>
        <div class="grid g-main mt">
          ${graficoCard('geral', REAL.ig ? ['visitas', 'leads', 'alcance'] : ['visitas', 'leads', 'alcance', 'envios'], 'Desempenho', 'Evolução diária no período escolhido')}
          <div class="card">${cardH('Metas do mês', `${MESES_L[HOJE.getMonth()]} de ${HOJE.getFullYear()}`, 'metas', 'alvo')}
            ${metaBloco(metas.seg)}${metaBloco(metas.leads)}${metaBloco(metas.blog)}${metaBloco(metas.ig)}
          </div>
        </div>
        <div class="card mt">${cardH('Top posts do Instagram', 'Ordenados por envios por alcance', 'top_ig', 'trofeu', '<a class="btn" href="#/instagram">Ver Instagram</a>')}${postsIg(G.posts)}</div>
        <div class="grid g-main mt">
          <div class="card">${cardH('Top 5 do blog', 'Índice de Aderência no período', 'top_blog', 'livro', '<a class="btn" href="#/blog">Ver ranking completo</a>')}${POSTS_BLOG.some((p) => p.valido) ? rankingBlog(5, true) : '<div class="card-s">Nenhum artigo com 20 leitores ou mais no período.</div>'}</div>
          <div class="card">${cardH('Nota de Presença', 'Junior Sturmer nas redes e na web', 'presenca', 'presenca', '<a class="btn" href="#/presenca">Detalhes</a>')}
            <div class="ring-w">${anel(PRESENCA.nota)}<div><div class="faixa-n">${faixa(PRESENCA.nota)}</div><div class="card-s">${deltaPresenca()} ${PRESENCA.nota90 === null ? 'sem comparação ainda' : 'em relação aos 90 dias anteriores'}</div>
            <div class="faixas">${FAIXAS.map((_, k) => `<span class="${k <= FAIXAS.indexOf(faixa(PRESENCA.nota)) ? 'on' : ''}"></span>`).join('')}</div></div></div>
          </div>
        </div>`;
      },
    },

    site: {
      nome: 'Site', ico: 'site', sub: 'juniorsturmer.com.br no GA4 e no Search Console.',
      html() {
        const R = real('site') ? DADOS.site : null;
        const v = R ? { atual: R.atual.usuarios, ant: R.ant.usuarios } : total('visitas');
        const l = R ? { atual: R.atual.leads, ant: R.ant.leads } : total('leads');
        const c = R ? { atual: R.atual.cta, ant: R.ant.cta } : total('cta');
        const sessoes = R ? { atual: R.atual.sessoes, ant: R.ant.sessoes } : { atual: Math.round(v.atual * 1.34), ant: Math.round(v.ant * 1.31) };
        const eng = R ? { atual: R.atual.usuarios ? R.atual.engajamento / R.atual.usuarios : 0, ant: R.ant.usuarios ? R.ant.engajamento / R.ant.usuarios : 0 } : { atual: 84, ant: 77 };
        const conv = v.atual ? (l.atual / v.atual) * 100 : 0, convA = v.ant ? (l.ant / v.ant) * 100 : 0;
        const origem = R ? R.origem : [['Google e buscadores', 41], ['Redes sociais', 41], ['Direto', 13], ['Outros sites', 5]];
        const paginas = real('site') && DADOS.paginas ? DADOS.paginas.map(([u, pc]) => [nomePagina(u), u, pc]) : [['Início', '/', 38], ['Blog', '/blog/', 19], ['Serviços', '/servicos/', 14], ['Minha história', '/minha-historia/', 11], ['Contato', '/contato/', 8]];
        const buscas = real('buscas') ? DADOS.buscas.top : [['junior sturmer', 38, 96, 1.2], ['estrategista de marca cascavel', 6, 140, 6.4], ['posicionamento de marca', 4, 820, 18.3], ['território de marca', 3, 210, 9.1], ['marca não é logo', 2, 75, 7.7]];
        const agora = real('agora') ? DADOS.agora : { usuarios: 3, paginas: [['Sua marca não é o seu logo | Além do Logo', 1], ['Serviços | Junior Sturmer', 1], ['Junior Sturmer | Estrategista de marca', 1]] };
        return `
        <div class="grid g-kpi">
          ${kpi({ ico: 'pessoas', label: 'Usuários', tip: 'site_visitas', valor: n(v.atual), delta: delta(v.atual, v.ant) })}
          ${kpi({ ico: 'site', label: 'Sessões', tip: 'site_sessoes', valor: n(sessoes.atual), delta: delta(sessoes.atual, sessoes.ant) })}
          ${kpi({ ico: 'relogio', label: 'Tempo médio de engajamento', tip: 'site_tempo', valor: tempo(eng.atual), delta: delta(eng.atual, eng.ant) })}
          ${kpi({ ico: 'alvo', label: 'Leads', tip: 'site_leads', valor: n(l.atual), delta: delta(l.atual, l.ant) })}
          ${kpi({ ico: 'faisca', label: 'Taxa de conversão', tip: 'site_conv', valor: pct(conv), delta: deltaPts(conv, convA) })}
          ${kpi({ ico: 'clique', label: 'Cliques em contato', tip: 'site_cta', valor: n(c.atual), delta: delta(c.atual, c.ant) })}
        </div>
        <div class="grid g-main mt">
          ${graficoCard('site', ['visitas', 'leads', 'cta'], 'Visitas e conversão', 'Evolução diária no período escolhido')}
          <div class="card agora">${cardH('<span class="pulse"></span> Agora no site', 'Últimos 30 minutos', 'agora')}
            <div id="agora-box">${agoraHtml(agora)}</div>
          </div>
        </div>
        <div class="grid g-3 mt">
          <div class="card">${cardH('Origem das visitas', '% dos usuários', 'site_origem')}${origem.length ? origem.map(([o, p]) => `<div class="hbar"><span>${esc(o)}</span><div class="bar"><span style="width:${p}%"></span></div><b>${p}%</b></div>`).join('') : '<div class="card-s">Sem visitas no período.</div>'}</div>
          <div class="card">${cardH('Páginas mais vistas', '% das visualizações', 'site_paginas')}<div class="lst">${paginas.map(([t, u, p]) => `<div class="lst-i"><div>${esc(t)}<small>${esc(u)}</small></div><div class="r"><b>${p}%</b></div></div>`).join('')}</div></div>
          <div class="card">${cardH('Buscas no Google', real('buscas') ? 'Search Console · 2 a 3 dias de atraso' : 'Search Console', 'site_buscas', 'lupa')}
            <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Busca</th><th class="n">Cliques</th><th class="n">Impr.</th><th class="n">Posição</th></tr></thead><tbody>
            ${buscas.length ? '' : '<tr><td colspan="4" class="card-s">Ainda sem buscas registradas no período.</td></tr>'}${buscas.map(([b, c2, im, po]) => `<tr><td>${esc(b)}</td><td class="n">${c2}</td><td class="n">${n(im)}</td><td class="n">${n(po, 1)}</td></tr>`).join('')}
            </tbody></table></div></div>
        </div>`;
      },
    },

    blog: {
      nome: 'Blog', ico: 'blog', sub: 'Além do Logo: o que prende, espalha e gera contato.',
      html() {
        const validos = POSTS_BLOG.filter((p) => p.valido);
        const RB = real('blog') ? DADOS.blog : null;
        const leitores = RB ? RB.leitores : soma(POSTS_BLOG.map((p) => p.l));
        const comp = soma(validos.map((p) => p.comp * p.l)) / soma(validos.map((p) => p.l));
        const tmp = soma(validos.map((p) => p.tempo * p.l)) / soma(validos.map((p) => p.l));
        const metas = metasDoMes();
        const cats = {};
        validos.forEach((p) => { (cats[p.c] = cats[p.c] || []).push(p.indice); });
        const catLista = Object.entries(cats).map(([c, v]) => [c, Math.round(soma(v) / v.length), v.length]).sort((a, b) => b[1] - a[1]);
        const ord = [...validos].sort((a, b) => b.indice - a.indice);
        const mediaComp = soma(validos.map((p) => p.comp)) / validos.length;
        const repetir = ord.slice(0, 3).filter((p) => p.comp > mediaComp);
        const pior = ord[ord.length - 1] || null;
        const gerou = POSTS_BLOG.filter((p) => p.gerou > 0).sort((a, b) => b.gerou - a.gerou);
        return `
        <div class="grid g-kpi-4">
          ${kpi({ ico: 'pessoas', label: 'Leitores', tip: 'blog_leitores', valor: n(leitores), delta: RB ? delta(leitores, RB.leitoresAnt) : delta(leitores, 1290) })}
          ${kpi({ ico: 'livro', label: 'Leitura completa média', tip: 'blog_completa', valor: validos.length ? pct(comp, 0) : '–', delta: RB ? '' : deltaPts(comp, 51.2), nota: RB ? 'artigos com 20+ leitores' : undefined })}
          ${kpi({ ico: 'relogio', label: 'Tempo médio por leitor', tip: 'blog_tempo', valor: validos.length ? tempo(tmp) : '–', delta: RB ? '' : delta(tmp, 181), nota: RB ? 'artigos com 20+ leitores' : undefined })}
          ${kpi({ ico: 'alvo', label: 'Posts publicados no mês', tip: 'blog_posts', valor: `${metas.blog.atual}<small>/${metas.blog.meta}</small>`, nota: 'meta de 3 por semana' })}
        </div>
        <div class="card mt">${cardH('Ranking de aderência', 'Português e inglês somados por artigo · mínimo de 20 leitores', 'blog_indice', 'trofeu')}${POSTS_BLOG.some((p) => p.valido) ? rankingBlog() : '<div class="card-s">Nenhum artigo com 20 leitores ou mais no período. Aumente o período no topo.</div>'}
          ${POSTS_BLOG.some((p) => !p.valido) ? `<div class="card-s" style="margin-top:10px">Fora do ranking por ter menos de 20 leitores: ${POSTS_BLOG.filter((p) => !p.valido).map((p) => esc(p.t)).join(', ')}.</div>` : ''}
        </div>
        <div class="grid g-3 mt">
          <div class="card">${cardH('Temas que mais prendem', 'Índice médio por categoria', 'blog_cat')}${catLista.map(([c, v, q]) => `<div class="hbar"><span>${c} <small style="color:#8c8c86">(${q})</small></span><div class="bar"><span style="width:${v}%"></span></div><b>${v}</b></div>`).join('')}</div>
          <div class="card">${cardH('Posts que geraram contato', 'Leads que passaram pelo artigo', 'blog_gerou', 'alvo')}${RB ? '<div class="callout"><b>Próxima etapa</b>Para saber qual artigo levou ao contato, o formulário vai passar a registrar o último artigo lido antes do envio.</div>' : `<div class="lst">${gerou.map((p) => `<div class="lst-i"><div>${esc(p.t)}<small>${esc(p.c)}</small></div><div class="r"><b>${p.gerou}</b> ${p.gerou > 1 ? 'leads' : 'lead'}</div></div>`).join('')}</div>`}</div>
          <div class="card">${cardH('Sinais para a pauta', 'O que repetir e o que revisar', 'blog_sinais', 'faisca')}
            <div class="callout"><b>Repetir o formato</b>${repetir.map((p) => esc(p.t)).join('; ') || 'Nenhum artigo no top 3 com leitura acima da média.'}</div>
            <div class="callout mt"><b>Revisar</b>${pior && ord.length > 1 ? `${esc(pior.t)} (índice ${pior.indice}). Teste outro título, resumo e capa antes de escrever mais sobre o tema.` : 'Ainda não há artigos suficientes com 20 leitores ou mais no período.'}</div>
          </div>
        </div>`;
      },
    },

    instagram: {
      nome: 'Instagram', ico: 'instagram', sub: '@juniorsturmer · dados da API da Meta (atraso de até 48 h).',
      html() {
        const G = igDados();
        const liq = G.liq, a = G.alcance, pf = G.perfil;
        const segIni = G.seguidores - liq.atual;
        const cresc = razao(liq.atual, segIni), crescA = razao(liq.ant, segIni - liq.ant);
        const metas = metasDoMes();
        const I = DADOS && DADOS.instagram;
        const conectar = !G.real && !(I && I.conectado) ? `<div class="card mt-0 conectar">${cardH('Conectar o Instagram', DADOS && DADOS.conexoes && DADOS.conexoes.instagramApp ? 'Clique para autorizar a leitura dos dados na tela da Meta. Os números abaixo ainda são exemplo.' : 'Falta cadastrar o app do Instagram no Netlify. Os números abaixo ainda são exemplo.', 'ig_conectar', 'instagram', DADOS && DADOS.conexoes && DADOS.conexoes.instagramApp ? '<a class="btn dark" href="/api/painel/instagram/conectar">Conectar Instagram</a>' : '')}</div>` : '';
        const conectadoSemDados = !G.real && I && I.conectado;
        const status = (G.real || conectadoSemDados) ? `<div class="card-s" style="margin:-6px 0 14px">@${esc(I.usuario || '')} · ${I.coleta ? `atualizado ${horaColeta(I.coleta.em)}` : 'primeira coleta em andamento, volte em alguns minutos'} · <button class="lnk" type="button" id="ig-atualizar">Atualizar agora</button> · <button class="lnk" type="button" id="ig-desconectar">Desconectar</button></div>` : '';
        return `${conectar}${status}
        <div class="grid g-kpi">
          ${kpi({ ico: 'pessoas', label: 'Seguidores', tip: 'ig_seguidores', valor: n(G.seguidores), delta: delta(G.seguidores, segIni), nota: `vs início do período (${n(segIni)})` })}
          ${kpi({ ico: 'grafico', label: 'Seguidores líquidos', tip: 'ig_liquidos', valor: `${liq.atual >= 0 ? '+' : ''}${n(liq.atual)}`, delta: delta(liq.atual, liq.ant) })}
          ${kpi({ ico: 'faisca', label: 'Taxa de crescimento', tip: 'ig_cresc', valor: pct(cresc), delta: deltaPts(cresc, crescA) })}
          ${kpi({ ico: 'olho', label: 'Alcance', tip: 'ig_alcance', valor: compacto(a.atual), delta: delta(a.atual, a.ant) })}
          ${kpi({ ico: 'lupa', label: 'Alcance de não seguidores', tip: 'ig_naoseg', valor: pct(G.ns), delta: deltaPts(G.ns, G.nsA) })}
          ${kpi({ ico: 'clique', label: 'Visitas ao perfil', tip: 'ig_perfil', valor: n(pf.atual), delta: delta(pf.atual, pf.ant) })}
        </div>
        <div class="grid g-main mt">
          ${graficoCard('ig', G.real ? ['liquidos', 'alcance'] : ['liquidos', 'alcance', 'envios', 'interacoes'], 'Evolução do perfil', 'Diário, no período escolhido')}
          <div class="card">${cardH('Meta de seguidores', `${MESES_L[HOJE.getMonth()]} de ${HOJE.getFullYear()}`, 'ig_meta', 'alvo')}
            <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px"><span class="kpi-v" style="font-size:40px">${n(metas.seg.atual)}</span><span class="card-s">de ${n(metas.seg.meta)} seguidores líquidos</span></div>
            ${metaBloco(Object.assign({}, metas.seg, { nome: 'Progresso do mês' }))}
            <div class="meta">
              <div class="meta-h"><strong>Envios por alcance ${i('ig_envios')}</strong>${G.env >= G.envA ? '<span class="tag ok">Acima do período anterior</span>' : '<span class="tag alerta">Abaixo do período anterior</span>'}</div>
              <div class="meta-row"><span><b>${pct(G.env, 2)}</b> agora</span><span>anterior ${pct(G.envA, 2)}</span></div>
            </div>
            <div class="meta">
              <div class="meta-h"><strong>Alcance de não seguidores ${i('ig_naoseg')}</strong>${G.ns >= G.nsA ? '<span class="tag ok">Acima do período anterior</span>' : '<span class="tag alerta">Abaixo do período anterior</span>'}</div>
              <div class="meta-row"><span><b>${pct(G.ns)}</b> agora</span><span>anterior ${pct(G.nsA)}</span></div>
            </div>
          </div>
        </div>
        <div class="card mt">${cardH('Desempenho por formato', `${MESES_L[HOJE.getMonth()]} contra ${MESES_L[(HOJE.getMonth() + 11) % 12]}`, 'ig_formato', 'grafico')}
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Formato</th><th class="n">Posts no mês</th><th class="n">Mês anterior</th><th class="n">Alcance médio</th><th class="n">Envios/alcance ${i('ig_envios')}</th><th class="n">Salvos/alcance ${i('ig_salvos')}</th><th class="n">Curtidas/alcance ${i('ig_curtidas')}</th></tr></thead><tbody>
          ${G.formatos.map((f) => `<tr><td class="t-tit">${f.f}</td><td class="n">${f.q} ${delta(f.q, f.qa)}</td><td class="n">${f.qa}</td><td class="n">${n(f.alc)}</td><td class="n">${pct(f.env)}</td><td class="n">${f.sal === null ? '–' : pct(f.sal)}</td><td class="n">${f.cur === null ? '–' : pct(f.cur)}</td></tr>`).join('')}
          </tbody></table></div>
        </div>
        <div class="grid g-kpi-5 mt">
          ${kpi({ ico: 'envio', label: 'Envios por alcance', tip: 'ig_envios', valor: pct(G.env, 2), delta: deltaPts(G.env, G.envA) })}
          ${kpi({ ico: 'coracao', label: 'Curtidas por alcance', tip: 'ig_curtidas', valor: pct(G.cur), delta: deltaPts(G.cur, G.curA) })}
          ${kpi({ ico: 'salvo', label: 'Salvamentos por alcance', tip: 'ig_salvos', valor: pct(G.sal), delta: deltaPts(G.sal, G.salA) })}
          ${kpi({ ico: 'relogio', label: 'Tempo médio nos reels', tip: 'ig_watch', valor: G.watch ? tempo(G.watch) : '–', delta: G.watch && G.watchA ? delta(G.watch, G.watchA) : '', nota: G.watch ? undefined : 'sem reels no período' })}
          ${kpi({ ico: 'faisca', label: 'Pulo nos 3 primeiros segundos', tip: 'ig_skip', valor: G.skip ? pct(G.skip) : '–', delta: G.skip && G.skipA ? deltaPts(G.skip, G.skipA) : '', nota: 'quanto menor, melhor' })}
        </div>
        <div class="grid g-2 mt">
          <div class="card">${cardH('Stories', G.real ? `${n(G.stories.qtd)} stories no período · média por story` : 'Média por story no período', 'ig_stories', 'olho')}
            <div class="lst">
              <div class="lst-i"><div>Alcance médio</div><div class="r"><b>${n(G.stories.alc)}</b> ${G.stories.alcA ? delta(G.stories.alc, G.stories.alcA) : ''}</div></div>
              <div class="lst-i"><div>Taxa de saída ${i('ig_saida')}</div><div class="r"><b>${pct(G.stories.saida)}</b> ${G.stories.saidaA ? deltaPts(G.stories.saida, G.stories.saidaA) : ''}</div></div>
              <div class="lst-i"><div>Respostas</div><div class="r"><b>${n(G.stories.resp)}</b> no período</div></div>
              <div class="lst-i"><div>Visitas ao perfil vindas de stories</div><div class="r"><b>${n(G.stories.perfil)}</b> no período</div></div>
            </div>
          </div>
          <div class="card">${cardH('Do Instagram para o negócio', 'Cruzando Instagram e GA4', 'ig_conv', 'alvo')}
            <div class="lst">
              <div class="lst-i"><div>Visitas ao site vindas do Instagram</div><div class="r"><b>${n(G.conv.visitas)}</b></div></div>
              <div class="lst-i"><div>Leads com origem Instagram</div><div class="r"><b>${n(G.conv.leads)}</b></div></div>
              <div class="lst-i"><div>Toques nos botões de contato do perfil</div><div class="r"><b>${n(G.conv.toques)}</b></div></div>
              <div class="lst-i"><div>Visitas ao perfil por post</div><div class="r"><b>${n(G.conv.perfilPorPost, 0)}</b></div></div>
            </div>
          </div>
        </div>
        <div class="card mt">${cardH('Top posts', 'Ordenados por envios por alcance', 'top_ig', 'trofeu')}${postsIg(G.posts)}</div>`;
      },
    },

    presenca: {
      nome: 'Presença', ico: 'presenca', sub: 'O quanto "Junior Sturmer" aparece e é citado fora dos seus canais.',
      html() {
        const P = PRESENCA;
        atualizarPresenca();
        const citacoes = soma(P.ia.res.map((r) => soma(r)));
        return `
        <div class="grid g-main">
          <div class="card">${cardH('Nota de Presença', 'Últimos 90 dias', 'presenca', 'presenca')}
            <div class="ring-w">${anel(P.nota)}
              <div style="flex:1;min-width:0">
                <div class="faixa-n">${faixa(P.nota)}</div>
                <div class="card-s">${deltaPresenca()} ${PRESENCA.nota90 === null ? 'sem comparação ainda' : 'em relação aos 90 dias anteriores'}</div>
                <div class="faixas">${FAIXAS.map((_, k) => `<span class="${k <= FAIXAS.indexOf(faixa(P.nota)) ? 'on' : ''}"></span>`).join('')}</div>
                <div class="card-s" style="margin-top:6px">0 a 20 começando · 21 a 40 em construção · 41 a 60 reconhecido no nicho · 61 a 80 referência regional · 81 a 100 referência nacional</div>
              </div>
            </div>
            <div class="mt">
              <div class="card-t" style="font-size:13px;margin-bottom:4px">Composição da nota ${i('pr_escala')}</div>
              ${P.comp.map((c) => `<div class="comp"><div><div class="comp-n">${c.nome} ${i(c.k)} ${c.real ? '' : tagExemplo}</div><small>${c.det} · peso ${c.peso}%</small></div><div class="bar"><span style="width:${c.nota}%"></span></div><b class="tnum">${c.nota}</b></div>`).join('')}
            </div>
          </div>
          <div class="card marcos">${cardH('Marcos de 12 meses', 'O que faria você se sentir um nome relevante', 'pr_marcos', 'trofeu')}
            <div class="lst">${P.marcos.map((m) => `<div class="lst-i" style="gap:12px"><span class="chk ${m.ok ? 'ok' : ''}">${m.ok ? ICO.check : ''}</span><div>${esc(m.t)}<small>${m.ok ? 'Feito' : 'Em aberto'}</small></div></div>`).join('')}</div>
            <div class="callout mt"><b>Nomes monitorados ${i('pr_nomes')}</b>Junior Sturmer · Jacir Sturmer · Jacir Sturmer Junior · Jacir Alexandre Selzler Sturmer Junior · Jacir Junior (só com TruckPag)</div>
          </div>
        </div>
        ${presencaListas()}
        <div class="card mt">${cardH('Presença nas IAs', `${citacoes} citação${citacoes === 1 ? '' : 'ões'} em ${P.ia.perguntas.length * P.ia.ias.length} checagens · checagem mensal`, 'pr_ia', 'faisca')}
          <div class="tbl-wrap"><table class="ia"><thead><tr><th>Pergunta</th>${P.ia.ias.map((x) => `<th>${x}</th>`).join('')}</tr></thead><tbody>
          ${P.ia.perguntas.map((q, k) => `<tr><td>${esc(q)}</td>${P.ia.res[k].map((r) => `<td><span class="d ${r ? 'ok' : ''}" title="${r ? 'Citou você' : 'Não citou'}"></span></td>`).join('')}</tr>`).join('')}
          </tbody></table></div>
        </div>`;
      },
    },
  };

  // ---------- navegação ----------
  function montarNav() {
    $('#nav').innerHTML = Object.entries(VIEWS).map(([k, v]) => `<a class="nav-i" href="#/${k}" data-v="${k}">${ico(v.ico)}${v.nome}</a>`).join('');
    document.querySelectorAll('[data-ico]').forEach((el) => { el.innerHTML = ICO[el.dataset.ico] || ''; });
    $('#periodo').innerHTML = PERIODOS.map(([k, t]) => `<button type="button" role="tab" data-p="${k}" aria-selected="${k === periodo}">${t}</button>`).join('');
    $('#periodo').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      periodo = b.dataset.p;
      try { localStorage.setItem('painel_periodo', periodo); } catch (err) { /* sem armazenamento */ }
      $('#periodo').querySelectorAll('button').forEach((x) => x.setAttribute('aria-selected', x === b));
      if (DADOS) carregar(); else render();
    });
    $('#hoje span:last-child').textContent = `${HOJE.getDate()} de ${MESES_L[HOJE.getMonth()]} de ${HOJE.getFullYear()}`;
  }
  function viewAtual() {
    const k = (location.hash || '').replace('#/', '');
    return VIEWS[k] ? k : 'geral';
  }
  function render() {
    const k = viewAtual();
    const v = VIEWS[k];
    document.querySelectorAll('#nav .nav-i').forEach((a) => a.classList.toggle('is-on', a.dataset.v === k));
    $('#titulo').innerHTML = k === 'geral' ? 'Visão <em>geral.</em>' : `${v.nome}<em>.</em>`;
    $('#subtitulo').textContent = v.sub;
    document.title = `${v.nome} | Painel de métricas`;
    $('#view').innerHTML = v.html();
    ativarGraficos();
    ligarPresenca();
    const bd = $('#ig-desconectar');
    if (bd) bd.addEventListener('click', async () => {
      bd.disabled = true;
      try { await fetch('/api/painel/instagram/desconectar', { method: 'POST', credentials: 'same-origin' }); } catch (e) { /* segue */ }
      DADOS = null; carregar();
    });
    const bt = $('#ig-atualizar');
    if (bt) bt.addEventListener('click', async () => {
      bt.disabled = true; bt.textContent = 'coletando, volte em alguns minutos';
      try { await fetch('/api/painel/instagram/coletar', { method: 'POST', credentials: 'same-origin' }); } catch (e) { /* tenta na próxima hora */ }
    });
  }

  // ---------- balão do ícone i ----------
  const tip = $('#tip');
  let tipAtivo = null;
  function mostrarTip(btn) {
    const t = TIPS[btn.dataset.tip]; if (!t) return;
    tipAtivo = btn;
    tip.innerHTML = `<span class="tip-k">O que é</span><b>${t[0]}</b><span class="tip-k" style="margin-top:8px">Como calcula</span><span>${t[1]}</span>`;
    tip.hidden = false;
    const r = btn.getBoundingClientRect();
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let left = r.left + r.width / 2 - tw / 2;
    left = clamp(left, 10, window.innerWidth - tw - 10);
    let top = r.bottom + 8;
    if (top + th > window.innerHeight - 10) top = r.top - th - 8;
    tip.style.left = `${left}px`; tip.style.top = `${top}px`;
  }
  function esconderTip() { tip.hidden = true; tipAtivo = null; }
  document.addEventListener('pointerover', (e) => { const b = e.target.closest('.i'); if (b && e.pointerType === 'mouse') mostrarTip(b); });
  document.addEventListener('pointerout', (e) => { if (e.target.closest('.i') && e.pointerType === 'mouse') esconderTip(); });
  document.addEventListener('focusin', (e) => { const b = e.target.closest('.i'); if (b) mostrarTip(b); });
  document.addEventListener('focusout', (e) => { if (e.target.closest('.i')) esconderTip(); });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.i');
    if (b) { e.preventDefault(); if (tipAtivo === b) esconderTip(); else mostrarTip(b); }
    else if (tipAtivo) esconderTip();
  });
  window.addEventListener('scroll', esconderTip, { passive: true });

  // ---------- conexões ----------
  function mostrarConexoes(c) {
    const itens = [['ga4', 'GA4'], ['searchConsole', 'Search Console'], ['instagram', 'Instagram'], ['alerts', 'Google Alerts']];
    $('#conexoes').innerHTML = `<b>Conexões</b>${itens.map(([k, t]) => `<div><span class="st ${c && c[k] ? 'ok' : ''}"></span>${t}</div>`).join('')}`;
  }
  function nomePagina(u) {
    const mapa = { '/': 'Início', '/en/': 'Home (EN)', '/blog/': 'Blog', '/en/blog/': 'Blog (EN)', '/servicos/': 'Serviços', '/minha-historia/': 'Minha história', '/contato/': 'Contato', '/obrigado/': 'Obrigado' };
    if (mapa[u]) return mapa[u];
    const post = LISTA_POSTS && LISTA_POSTS.find((a) => a.url === u || a.urlEn === u);
    return post ? post.titulo : u;
  }
  function agoraHtml(ag) {
    return `<div class="kpi-v" style="font-size:44px">${n(ag.usuarios)}</div><div class="card-s" style="margin:6px 0 14px">${ag.usuarios === 1 ? 'pessoa navegando' : 'pessoas navegando'}</div>
      <div class="lst">${ag.paginas.length ? ag.paginas.map(([t, q]) => `<div class="lst-i"><div>${esc(t)}</div><div class="r">${n(q)}</div></div>`).join('') : '<div class="lst-i"><div><small>Ninguém no site agora.</small></div></div>'}</div>`;
  }
  // ---------- Presença: menções (Google Alerts + cadastro manual) ----------
  const OPCOES_TIPO = [
    ['portal', 'Portal ou jornal · 5 pts'],
    ['entrevista|entrevista', 'Entrevista em portal nacional de marketing · marco · 4 pts'],
    ['entrevista', 'Entrevista · 4 pts'],
    ['palestra|palestra', 'Palestra em evento do setor · marco · 4 pts'],
    ['palestra', 'Palestra · 4 pts'],
    ['podcast', 'Podcast · 4 pts'],
    ['artigo', 'Artigo assinado · 4 pts'],
    ['blog', 'Blog de nicho · 2 pts'],
    ['social', 'Post de terceiros · 1 pt'],
  ];
  const selTipo = (attr) => `<select class="sel" ${attr} aria-label="Tipo da menção"><option value="">Tipo</option>${OPCOES_TIPO.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>`;
  function dataCurta(ymd) {
    if (!ymd) return '';
    const [a, m, d] = ymd.split('-').map(Number);
    return `${String(d).padStart(2, '0')} ${MESES[m - 1]}${a !== HOJE.getFullYear() ? ` ${a}` : ''}`;
  }
  const pontosDe = (x) => (DADOS.presenca.tipos[x.tipo] || { pontos: 0 }).pontos;
  const nomeTipo = (x) => (DADOS.presenca.tipos[x.tipo] || { nome: x.tipo }).nome;
  const tituloLink = (x) => (x.link ? `<a class="pr-t" href="${esc(x.link)}" target="_blank" rel="noopener noreferrer">${esc(x.titulo)}</a>` : `<span class="pr-t">${esc(x.titulo)}</span>`);
  function presencaListas() {
    const P = PRESENCA;
    if (!REAL.presenca) {
      return `<div class="grid g-2 mt">
          <div class="card">${cardH('Menções confirmadas', 'Pontos por tipo de veículo', 'pr_mencoes', 'mega', '<button class="btn dark" type="button" disabled title="Disponível quando o Google Alerts for conectado">Registrar menção</button>')}
            <div class="lst">${P.mencoes.map((m) => `<div class="lst-i"><div>${esc(m.t)}<small>${esc(m.v)} · ${m.tipo} · ${m.d}</small></div><div class="r"><b>+${m.p}</b> ${m.p === 1 ? 'pt' : 'pts'}</div></div>`).join('')}</div>
          </div>
          <div class="card">${cardH('Para revisar', 'Encontradas pelo Google Alerts', 'pr_revisar', 'lupa')}
            <div class="lst">${P.revisar.map((m) => `<div class="lst-i"><div>${esc(m.t)}<small>${esc(m.v)}</small></div><div class="acoes"><button class="btn" type="button" disabled>É você</button><button class="btn" type="button" disabled>Descartar</button></div></div>`).join('')}</div>
          </div>
        </div>`;
    }
    const D = DADOS.presenca;
    const c = D.coleta;
    const subRev = c ? `Google Alerts · lido ${horaColeta(c.em)} · ${D.feeds} ${D.feeds === 1 ? 'alerta' : 'alertas'}` : 'Google Alerts · primeira leitura em andamento';
    const corte = ymdLocal(new Date(HOJE.getTime() - 89 * 864e5));
    const recentes = D.confirmadas.filter((x) => String(x.data) >= corte);
    const ptsRec = soma(recentes.map(pontosDe));
    const acaoVoltar = (x) => `<button class="lnk" type="button" data-pr="voltar" data-id="${esc(x.id)}">${x.origem === 'manual' ? 'remover' : 'voltar para revisão'}</button>`;
    const conf = recentes.map((x) => `<div class="lst-i"><div class="pr-i">${tituloLink(x)}<small>${esc(x.fonte || (x.origem === 'manual' ? 'cadastro manual' : ''))} · ${esc(nomeTipo(x))}${x.marco ? ' · marco' : ''} · ${dataCurta(x.data)} · ${acaoVoltar(x)}</small></div><div class="r"><b>+${pontosDe(x)}</b> ${pontosDe(x) === 1 ? 'pt' : 'pts'}</div></div>`).join('');
    const rev = D.revisar.map((x) => `<div class="lst-i pr-rev" data-linha="${esc(x.id)}"><div class="pr-i">${tituloLink(x)}<small>${[esc(x.fonte || ''), dataCurta(x.data), x.alerta ? `alerta ${esc(x.alerta)}` : ''].filter(Boolean).join(' · ')}</small>${x.trecho ? `<small class="pr-trecho">${esc(x.trecho)}</small>` : ''}</div><div class="acoes">${selTipo(`data-tipo="${esc(x.id)}"`)}<button class="btn dark" type="button" data-pr="confirmar" data-id="${esc(x.id)}">É você</button><button class="btn" type="button" data-pr="descartar" data-id="${esc(x.id)}">Descartar</button></div></div>`).join('');
    const form = `<form class="pr-form" id="pr-form" hidden>
        <input class="inp" name="titulo" required maxlength="220" placeholder="Título ou assunto">
        <input class="inp" name="fonte" maxlength="80" placeholder="Veículo (ex.: Meio & Mensagem)">
        <input class="inp" name="link" placeholder="Link (opcional)">
        <div class="pr-form-l"><input class="inp" type="date" name="data" value="${ymdLocal(HOJE)}">${selTipo('name="tipo" required')}</div>
        <div class="acoes"><button class="btn dark" type="submit">Salvar menção</button><button class="btn" type="button" data-pr="fechar-form">Cancelar</button></div>
      </form>`;
    return `<div class="grid g-2 mt pr-g">
          <div class="card">${cardH('Contam na nota agora', `${recentes.length} ${recentes.length === 1 ? 'menção' : 'menções'} · ${n(ptsRec)} ${ptsRec === 1 ? 'ponto' : 'pontos'} nos últimos 90 dias`, 'pr_mencoes', 'mega', '<button class="btn dark" type="button" data-pr="abrir-form">Registrar menção</button>')}
            ${form}
            <div class="lst pr-lst">${conf || `<div class="lst-i"><div><small>Nenhuma citação nos últimos 90 dias${D.confirmadas.length ? `. A mais recente é de ${dataCurta(D.confirmadas[0].data)} e está no mapa abaixo` : ''}. Confirme as que o Google Alerts trouxer ou registre uma à mão.</small></div></div>`}</div>
          </div>
          <div class="card">${cardH('Para revisar', subRev, 'pr_revisar', 'lupa', '<button class="btn" type="button" data-pr="coletar">Buscar agora</button>')}
            <div class="lst pr-lst">${rev || '<div class="lst-i"><div><small>Nada para revisar. Os alertas são lidos a cada 6 horas e cada vez que você abre o painel depois disso.</small></div></div>'}</div>
            ${D.descartadas ? `<div class="card-s" style="margin-top:10px">${n(D.descartadas)} ${D.descartadas === 1 ? 'resultado descartado' : 'resultados descartados'} (inclui páginas do seu próprio site)</div>` : ''}
          </div>
        </div>
        ${mapaCitacoes(D, corte, acaoVoltar)}`;
  }
  let FILTRO_MAPA = 'todos';
  function mapaCitacoes(D, corte, acaoVoltar) {
    const todas = D.confirmadas;
    if (!todas.length) return '';
    const tipos = Object.keys(D.tipos).filter((k) => todas.some((x) => x.tipo === k));
    if (FILTRO_MAPA !== 'todos' && !tipos.includes(FILTRO_MAPA)) FILTRO_MAPA = 'todos';
    const lista = FILTRO_MAPA === 'todos' ? todas : todas.filter((x) => x.tipo === FILTRO_MAPA);
    const pts = soma(todas.map(pontosDe));
    const veiculos = new Set(todas.map((x) => String(x.fonte || '').toLowerCase())).size;
    const anos = [...new Set(todas.map((x) => String(x.data).slice(0, 4)).filter(Boolean))].sort();
    const chip = (k, rot, q, p) => `<button type="button" class="mapa-f" data-mapa="${k}" aria-pressed="${FILTRO_MAPA === k}">${rot} <b>${q}</b>${p !== null ? `<span>${n(p)} pts</span>` : ''}</button>`;
    const linhas = lista.map((x) => {
      const p = pontosDe(x);
      const conta = String(x.data) >= corte;
      return `<tr><td class="nw">${dataCurta(x.data) || '-'}</td><td class="mapa-t">${tituloLink(x)}<small>${esc(x.fonte || '')}${x.obs ? ` · ${esc(x.obs)}` : ''} · ${acaoVoltar(x)}</small></td><td class="nw">${esc(nomeTipo(x))}${x.marco ? ' <span class="tag feito">marco</span>' : ''}</td><td class="n"><b>${p}</b> ${p === 1 ? 'pt' : 'pts'}</td><td>${conta ? '<span class="tag ok">conta agora</span>' : '<span class="tag">histórico</span>'}</td></tr>`;
    }).join('');
    return `<div class="card mt">${cardH('Onde você já foi citado', `Todas as citações confirmadas${anos.length ? `, de ${anos[0]} a ${anos[anos.length - 1]}` : ''}`, 'pr_mapa', 'mega')}
      <div class="mapa-k">
        <div><span>Citações</span><b>${n(todas.length)}</b></div>
        <div><span>Pontos acumulados</span><b>${n(pts)}</b></div>
        <div><span>Veículos diferentes</span><b>${n(veiculos)}</b></div>
        <div><span>Mais recente</span><b>${dataCurta(todas[0].data) || '-'}</b></div>
      </div>
      <div class="mapa-fs">${chip('todos', 'Todas', todas.length, null)}${tipos.map((k) => { const l = todas.filter((x) => x.tipo === k); return chip(k, D.tipos[k].nome, l.length, soma(l.map(pontosDe))); }).join('')}</div>
      <div class="tbl-wrap"><table class="tbl mapa"><thead><tr><th>Data</th><th>Onde</th><th>Tipo</th><th class="n">Peso</th><th>Na nota</th></tr></thead><tbody>${linhas}</tbody></table></div>
    </div>`;
  }
  async function acaoPresenca(rota, corpo, botao) {
    if (botao) botao.disabled = true;
    try {
      const r = await fetch(`/api/painel/presenca/${rota}`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo || {}) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { location.reload(); return; }
      if (!r.ok) throw new Error(j.erro || `erro ${r.status}`);
      DADOS.presenca = j.presenca;
      atualizarPresenca();
      render();
    } catch (e) {
      if (botao) botao.disabled = false;
      console.warn('[presença]', e.message);
      const box = $('#pr-msg') || Object.assign(document.createElement('div'), { id: 'pr-msg', className: 'callout mt' });
      box.textContent = `Não foi possível salvar: ${e.message}`;
      $('#view').prepend(box);
    }
  }
  function ligarPresenca() {
    const v = $('#view');
    if (!REAL.presenca || viewAtual() !== 'presenca') return;
    v.querySelectorAll('[data-pr]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.id;
      const acao = b.dataset.pr;
      if (acao === 'abrir-form') { $('#pr-form').hidden = false; $('#pr-form [name=titulo]').focus(); return; }
      if (acao === 'fechar-form') { $('#pr-form').hidden = true; return; }
      if (acao === 'coletar') { b.textContent = 'buscando...'; acaoPresenca('coletar', {}, b); return; }
      if (acao === 'descartar') { acaoPresenca('marcar', { id, estado: 'descartado' }, b); return; }
      if (acao === 'voltar') { acaoPresenca('marcar', { id, estado: 'novo' }, b); return; }
      if (acao === 'confirmar') {
        const sel = v.querySelector(`[data-tipo="${CSS.escape(id)}"]`);
        if (!sel.value) { sel.classList.add('falta'); sel.focus(); return; }
        const [tipo, marco] = sel.value.split('|');
        acaoPresenca('marcar', { id, estado: 'confirmado', tipo, marco }, b);
      }
    }));
    v.querySelectorAll('.sel').forEach((s) => s.addEventListener('change', () => s.classList.remove('falta')));
    v.querySelectorAll('[data-mapa]').forEach((b) => b.addEventListener('click', () => { FILTRO_MAPA = b.dataset.mapa; const y = window.scrollY; render(); window.scrollTo(0, y); }));
    const f = $('#pr-form');
    if (f) f.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      const [tipo, marco] = String(d.tipo || '').split('|');
      acaoPresenca('cadastrar', { ...d, tipo, marco }, f.querySelector('[type=submit]'));
    });
  }
  function deltaPresenca() {
    return PRESENCA.nota90 === null ? '<span class="delta flat">1ª medição</span>' : deltaPts(PRESENCA.nota, PRESENCA.nota90, ' pts');
  }
  function atualizarPresenca() {
    const nota = (v, meta) => Math.round(Math.min(100, Math.sqrt(Math.max(0, v) / meta) * 100));
    const c = Object.fromEntries(PRESENCA.comp.map((x) => [x.k, x]));
    if (real('buscas')) { const im = DADOS.buscas.marca90.impressoes; Object.assign(c.pr_busca, { real: true, nota: nota(im, 1500), det: `${n(im)} impressões em 90 dias` }); }
    if (real('referencias')) { const d = DADOS.referencias.length; Object.assign(c.pr_sites, { real: true, nota: nota(d, 10), det: `${n(d)} ${d === 1 ? 'domínio' : 'domínios'} em 90 dias` }); }
    if (real('presenca')) {
      const corte = ymdLocal(new Date(HOJE.getTime() - 89 * 864e5));
      const conf = DADOS.presenca.confirmadas;
      const pts = soma(conf.filter((x) => String(x.data) >= corte).map(pontosDe));
      Object.assign(c.pr_web, { real: true, nota: nota(pts, 60), det: `${n(pts)} ${pts === 1 ? 'ponto' : 'pontos'} em 90 dias` });
      PRESENCA.marcos[0].ok = conf.some((x) => x.marco === 'entrevista');
      PRESENCA.marcos[1].ok = conf.some((x) => x.marco === 'palestra');
    }
    PRESENCA.nota = Math.round(soma(PRESENCA.comp.map((x) => (x.peso / 100) * x.nota)));
    if (PRESENCA.comp.some((x) => x.real)) PRESENCA.nota90 = null;
  }
  function aplicarDados() {
    if (!DADOS) return;
    REAL.site = Boolean(DADOS.site);
    REAL.buscas = Boolean(DADOS.buscas);
    REAL.agora = Boolean(DADOS.agora);
    REAL.referencias = Boolean(DADOS.referencias);
    REAL.presenca = Boolean(DADOS.presenca && DADOS.presenca.conectado);
    if (REAL.site && DADOS.site.serie && DADOS.site.serie.visitas.length === DIAS) {
      S.visitas = DADOS.site.serie.visitas; S.leads = DADOS.site.serie.leads; S.cta = DADOS.site.serie.cta;
    }
    if (DADOS.blog) {
      REAL.blog = true;
      const porId = Object.fromEntries(DADOS.blog.posts.map((p) => [p.id, p]));
      const base = LISTA_POSTS ? LISTA_POSTS.map((a) => Object.assign({ id: a.id, t: a.titulo, c: a.categoria, l: 0, comp: 0, tempo: 0, sh: 0, ct: 0 }, porId[a.id] || {}, { t: a.titulo, c: a.categoria })) : DADOS.blog.posts;
      POSTS_BLOG.length = 0;
      base.forEach((p) => POSTS_BLOG.push(Object.assign({ gerou: 0 }, p)));
      calcularIndice();
    }
    const I = DADOS.instagram;
    REAL.ig = Boolean(I && I.conectado && I.perfil);
    if (REAL.ig) {
      SEGUIDORES_HOJE = I.perfil.seguidores || 0;
      if (I.serie && I.serie.alcance.length === DIAS) { S.alcance = I.serie.alcance; S.liquidos = I.serie.novos; }
      GRAF.liquidos.nome = 'Novos seguidores';
    }
    atualizarPresenca();
  }
  function horaColeta(ms) {
    const d = new Date(ms);
    const mesmoDia = d.toDateString() === new Date().toDateString();
    return `${mesmoDia ? 'hoje' : `${d.getDate()} ${MESES[d.getMonth()]}`} às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  function avisos() {
    const exemplo = [];
    if (!REAL.site) exemplo.push('Site');
    if (!REAL.blog) exemplo.push('Blog');
    if (!REAL.ig) exemplo.push('Instagram');
    exemplo.push(REAL.presenca ? 'Presença (marcações e IAs)' : 'Presença (menções, marcações e IAs)');
    const erros = DADOS && DADOS.erros ? Object.entries(DADOS.erros) : [];
    const ig = DADOS && DADOS.instagram && DADOS.instagram.coleta && DADOS.instagram.coleta.erros ? Object.entries(DADOS.instagram.coleta.erros).filter(([k]) => !k.startsWith('midia:')).slice(0, 3) : [];
    ig.forEach(([k, m]) => erros.push([`instagram ${k}`, m]));
    const al = DADOS && DADOS.presenca && DADOS.presenca.coleta && DADOS.presenca.coleta.erros ? Object.entries(DADOS.presenca.coleta.erros) : [];
    al.forEach(([k, m]) => erros.push([`Google Alerts ${k}`, m]));
    const el = $('#demo');
    el.hidden = false;
    const tudo = !REAL.site && !REAL.blog && !REAL.ig;
    el.innerHTML = `<span class="demo-dot" aria-hidden="true"></span><span>${tudo ? '<strong>Dados de exemplo.</strong> Os números reais entram conforme cada conexão for configurada no Netlify.' : `<strong>Dados de exemplo em:</strong> ${exemplo.join(', ')}. O resto já é real.`}${erros.length ? `<br><strong>Erro na conexão</strong> ${erros.map(([k, m]) => `${esc(k)}: ${esc(m)}`).join(' · ')}` : ''}</span>`;
  }
  async function carregar() {
    try {
      if (!LISTA_POSTS) {
        const rp = await fetch('/metricas/posts.json', { credentials: 'same-origin', cache: 'no-store' });
        if (rp.ok) LISTA_POSTS = await rp.json();
      }
    } catch (e) { /* sem lista de posts */ }
    try {
      const r = await fetch(`/api/painel/dados?periodo=${encodeURIComponent(periodo)}`, { credentials: 'same-origin', cache: 'no-store' });
      if (r.status === 401) { location.reload(); return; }
      if (r.ok) DADOS = await r.json();
    } catch (e) { /* sem API (teste local): segue com exemplo */ }
    aplicarDados();
    avisos();
    mostrarConexoes(DADOS && DADOS.conexoes);
    render();
  }
  async function atualizarAgora() {
    const box = $('#agora-box');
    if (!box || !REAL.agora || document.hidden) return;
    try {
      const r = await fetch('/api/painel/dados?so=agora', { credentials: 'same-origin', cache: 'no-store' });
      if (r.ok) { const j = await r.json(); if (j.agora) { DADOS.agora = j.agora; box.innerHTML = agoraHtml(j.agora); } }
    } catch (e) { /* tenta de novo no próximo ciclo */ }
  }
  setInterval(atualizarAgora, 60000);

  // ---------- início ----------
  try { const p = localStorage.getItem('painel_periodo'); if (p && PERIODOS.some(([k]) => k === p)) periodo = p; } catch (e) { /* sem armazenamento */ }
  montarNav();
  render();
  carregar();
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
  let timer;
  window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(() => document.querySelectorAll('[data-graf]').forEach(desenharGrafico), 150); });
})();
