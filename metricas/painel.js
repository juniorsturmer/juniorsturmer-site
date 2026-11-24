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
    top_ig: ['Os posts que mais funcionaram no período, pelo conjunto dos sinais.', 'Ordenados pelo Índice de Desempenho (0 a 100). Cada post é comparado com a mediana dos seus posts dos últimos 90 dias, em que a mediana vale 50. O destaque mostra o sinal em que o post mais superou a sua média.'],
    top_blog: ['Os artigos com melhor aderência no período.', 'Ordenados pelo Índice de Aderência. Veja a aba Blog para o cálculo completo.'],
    agora: ['Quem está no seu site neste momento.', 'API de tempo real do GA4: usuários ativos nos últimos 30 minutos. Atualiza a cada 60 segundos.'],
    site_sessoes: ['Visitas ao site, contando retornos da mesma pessoa.', 'Sessões no GA4. Uma pessoa pode ter várias sessões no período.'],
    site_tempo: ['Tempo médio em que o site esteve aberto e em foco por pessoa.', 'Tempo de engajamento do GA4 ÷ usuários. Abas em segundo plano não contam.'],
    site_conv: ['De cada 100 visitantes, quantos pediram contato.', 'Leads ÷ usuários × 100.'],
    site_cta: ['Cliques em botões que levam para a página de contato.', 'Evento cta_click no GA4. Mostra quais chamadas puxam mais gente para o contato.'],
    site_origem: ['De onde as pessoas chegaram.', 'Canal da sessão no GA4: Google, redes sociais, acesso direto, outros sites.'],
    site_paginas: ['Páginas mais vistas do site.', 'Visualizações de página no GA4, somando português e inglês.'],
    site_buscas: ['O que as pessoas digitaram no Google antes de clicar no seu site.', 'Search Console: cliques, impressões e posição média por busca. Tem 2 a 3 dias de atraso.'],
    blog_leitores: ['Pessoas diferentes que abriram pelo menos um artigo.', 'Usuários com o evento blog_artigo_view no período.'],
    blog_completa: ['De cada 100 leitores, quantos chegaram ao fim do texto.', 'blog_leitura_completa ÷ blog_artigo_view × 100.'],
    blog_tempo: ['Tempo médio de leitura ativa por leitor.', 'Tempo de engajamento nas páginas dos artigos ÷ leitores. Só conta com a aba em foco.'],
    blog_posts: ['Artigos publicados no mês contra a meta.', 'Conta pela data de publicação dos artigos. Meta: 3 por semana.'],
    blog_indice: ['Nota de 0 a 100 que resume se o artigo prende, espalha e gera contato.', 'Cada métrica é comparada com a média do blog (média = 50). Pesos: leitura completa 25%, tempo engajado 20%, leitores 20%, compartilhamentos 15%, contato 20%. Entra todo artigo com pelo menos 1 leitor; com poucos leitores a nota oscila bastante, por isso aparece a marca "amostra pequena" abaixo de 5.'],
    blog_views: ['Quantas vezes os artigos foram abertos.', 'Evento blog_artigo_view. Uma pessoa que abre o mesmo artigo duas vezes conta duas visualizações e um leitor.'],
    blog_shares: ['Cliques em compartilhar no fim do artigo.', 'blog_compartilhar com LinkedIn, WhatsApp e copiar link. Cliques para assinar a newsletter ficam separados.'],
    blog_ctas: ['Cliques que levam do artigo para a página de contato.', 'cta_click nas páginas dos artigos: o botão do fim do texto e o "Vamos conversar" do topo.'],
    blog_serie: ['Movimento diário do blog.', 'Leitores, visualizações e leituras completas por dia no período escolhido, contra o período anterior.'],
    blog_artigos: ['Todos os artigos publicados com as métricas do período.', 'Clique no nome do artigo para abrir o detalhe: de onde vieram os leitores, até onde leram, o que clicaram e como foi no Google. Clique no título de uma coluna para ordenar.'],
    blog_origem: ['Canal que trouxe as pessoas até os artigos.', 'Canal da sessão no GA4 (Google, redes sociais, direto, outros sites) para quem viu páginas de artigo. "Entradas" conta quem chegou ao site direto pelo artigo.'],
    blog_funil: ['Até onde as pessoas leem.', 'Visualizações que chegaram a 25%, 50% e 75% do texto (blog_leitura), ao fim (blog_leitura_completa) e que clicaram em contato.'],
    blog_acoes: ['O que as pessoas fazem dentro do artigo.', 'Compartilhamentos por rede, newsletter, botões de contato, cards de continue lendo, links internos e redes sociais.'],
    blog_diag: ['Leitura automática de cada artigo para decidir o próximo passo.', 'Compara visualizações e leitura completa com a mediana do blog. Atrai e segura: repetir. Atrai e perde: ajustar o texto. Segura mas pouca gente vê: distribuir mais. Nem atrai nem segura: revisar título e capa.'],
    blog_destaques: ['Os campeões do período em cada métrica.', 'Mais lido, mais tempo de tela, mais compartilhado, mais cliques em contato e melhor porta de entrada pelo Google.'],
    blog_google: ['Como o artigo aparece no Google.', 'Search Console: cliques, impressões, posição média e a busca que mais mostrou o artigo. Tem 2 a 3 dias de atraso.'],
    blog_comp: ['Compartilhamentos a cada 100 leitores.', 'blog_compartilhar (LinkedIn, WhatsApp e copiar link) ÷ leitores × 100.'],
    blog_contato: ['Cliques para contato a cada 100 leitores.', 'cta_click na página do artigo ÷ leitores × 100.'],
    blog_cat: ['Qual tema prende mais o seu leitor.', 'Média do Índice de Aderência dos artigos de cada categoria. Use para escolher as próximas pautas.'],
    blog_gerou: ['Artigos que levaram alguém a pedir contato.', 'Leads cuja sessão passou pelo artigo antes do formulário. Fica separado porque contato é raro e sumiria na média.'],
    blog_sinais: ['Leituras rápidas para decidir a próxima pauta.', 'Repetir: artigo no top 3 com leitura completa acima da média. Revisar: menor índice do período.'],
    ig_liquidos: ['Seguidores ganhos menos os perdidos no mês.', 'follows_and_unfollows da API do Instagram. É o número da sua meta mensal.'],
    ig_cresc: ['Quanto o perfil cresceu em relação ao tamanho que tinha.', 'Seguidores líquidos no período ÷ seguidores no início × 100.'],
    ig_naoseg: ['Parte do alcance que veio de quem ainda não te segue.', 'Alcance de não seguidores ÷ alcance total × 100. É o melhor sinal de que o perfil está sendo descoberto.'],
    ig_perfil: ['Visitas ao seu perfil vindas dos posts e stories.', 'Soma de profile_visits das publicações do período.'],
    ig_formato: ['Qual formato está entregando mais, com os números lado a lado.', 'Posts do feed no período agrupados por formato e ordenados pelo índice médio. Taxas somam o formato inteiro (total de envios ÷ total de alcance). Escolha "Este mês" no topo para o comparativo mês contra mês.'],
    ig_envios: ['Quantas pessoas mandaram o post por direct a cada 100 que viram.', 'Envios ÷ alcance × 100. Segundo o chefe do Instagram, é o sinal que mais ajuda a alcançar quem não te segue.'],
    ig_curtidas: ['Curtidas a cada 100 pessoas que viram.', 'Curtidas ÷ alcance × 100. Pesa mais para aparecer para quem já te segue.'],
    ig_salvos: ['Quantos guardaram o post para ver depois, a cada 100 que viram.', 'Salvamentos ÷ alcance × 100. Mostra conteúdo útil, de referência.'],
    ig_watch: ['Tempo médio que as pessoas assistem aos seus reels.', 'ig_reels_avg_watch_time, média dos reels do período. Tempo de visualização é um dos 3 sinais que mais pesam.'],
    ig_skip: ['Parte das visualizações que pulou o reel nos 3 primeiros segundos.', 'reels_skip_rate da API (métrica nova, ainda marcada como em desenvolvimento pela Meta). Quanto menor, melhor o gancho.'],
    ig_stories: ['Desempenho médio dos seus stories.', 'Coletado de hora em hora, porque a Meta só libera os dados de um story por 24 h. Stories com menos de 5 visualizações não retornam dados.'],
    ig_saida: ['Parte de quem viu o story e saiu dele.', 'Ações de saída (navigation: exit) ÷ alcance × 100. Quanto menor, mais o story segura.'],
    ig_conv: ['Quanto do alcance vira relação e negócio.', 'Etapas do período: alcance da conta, visitas ao perfil (soma dos posts e stories), novos seguidores, toques nos botões do perfil (link, e-mail, WhatsApp), visitas ao site vindas do Instagram e leads no GA4. Cada etapa mostra o % da anterior para achar onde o funil vaza.'],
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
    ig_indice: ['Nota de 0 a 100 que resume se o post espalhou, engajou e trouxe gente para o perfil.', 'Cada sinal é dividido pela mediana dos seus posts dos últimos 90 dias e vira pontos (mediana = 50, o dobro = 100). Pesos: envios 25%, alcance 20%, salvamentos 15%, tempo assistido 15% (só reels), curtidas 10%, comentários 10%, novos seguidores 10% e visitas ao perfil 10%. Sinais que o post não tem saem da conta e os pesos se redistribuem.'],
    ig_ranking: ['Todos os posts do feed publicados no período, com todos os sinais.', 'Taxas por alcance para comparar posts de tamanhos diferentes; o número pequeno embaixo é o total. Verde: 30% ou mais acima da sua mediana. Vermelho: 30% ou mais abaixo. Clique no título para ver o post contra a mediana, os números absolutos e o ponto mais forte e mais fraco.'],
    ig_diag: ['O que fazer com cada post, pelo que ele espalhou e pelo que engajou.', 'Dois eixos contra a sua mediana: distribuição (alcance) e valor (média de envios e salvamentos por alcance). Os dois acima: repetir. Só alcance acima: aprofundar o conteúdo. Só valor acima: reaproveitar com outro gancho. Os dois abaixo: não repetir. Posts com menos de 3 dias ficam como "ainda rodando".'],
    ig_vs: ['Quantas vezes o post fez em cada sinal, comparado à sua mediana.', '1,0x é igual à mediana dos posts dos últimos 90 dias. 2,0x é o dobro. A barra cheia equivale a 2x ou mais.'],
    ig_alcance_post: ['Contas únicas que viram o post.', 'reach da API. Embaixo, quantas vezes isso representa da sua mediana de alcance.'],
    ig_coment: ['Comentários a cada 100 pessoas que viram.', 'Comentários ÷ alcance × 100. Mostra conteúdo que puxa conversa, um sinal forte para quem já te segue.'],
    ig_seg_post: ['Seguidores que o post trouxe.', 'follows da API. Embaixo, seguidores a cada mil contas alcançadas. Nos reels a Meta nem sempre libera esse número; quando não vem, aparece um traço.'],
    ig_pf_post: ['Visitas ao perfil vindas do post.', 'profile_visits da API. Embaixo, visitas a cada 100 contas alcançadas. Quem visita o perfil está avaliando se te segue ou te chama.'],
    ig_fmt_indice: ['Média do Índice de Desempenho dos posts do formato.', 'Usa só posts com 3 dias ou mais (se todos forem recentes, usa os que houver). Ao lado, a diferença em pontos para o mesmo formato no período anterior.'],
    ig_acerto: ['De cada 100 posts do formato, quantos ficaram acima da sua média.', 'Posts com índice 50 ou mais ÷ posts do formato × 100. Um formato com índice alto e acerto baixo depende de poucos posts que estouraram.'],
    ig_seg_fmt: ['Seguidores ganhos, em média, por post do formato.', 'Soma de follows dos posts ÷ posts que têm esse dado.'],
    ig_pf_fmt: ['Visitas ao perfil, em média, por post do formato.', 'Soma de profile_visits dos posts ÷ posts que têm esse dado.'],
    ig_segk: ['Quantos seguidores você ganha a cada mil contas alcançadas.', 'Seguidores ganhos na conta ÷ alcance × 1.000. Mostra se o conteúdo converte em seguidor, não só se aparece.'],
    ig_leituras: ['Conclusões prontas a partir dos números do período.', 'Compara formatos, dias, horários, posts que trouxeram seguidores, posts para reaproveitar e os que não repetir, ritmo de publicação, retenção dos reels e descoberta. Verde: manter. Amarelo: atenção. Cinza: informação.'],
    ig_nao_repetir: ['Os posts mais fracos do período e o sinal em que cada um mais perdeu.', 'Posts com diagnóstico "não repetir" e os de "aprofundar" com índice abaixo de 45, do menor índice para o maior. Use para cortar temas, ganchos ou formatos que não funcionam com o seu público.'],
    ig_padroes: ['Em que dia, horário e tamanho de legenda seus posts rendem mais.', 'Índice médio dos posts dos últimos 90 dias (sem os de menos de 3 dias) agrupados por dia da semana, faixa de horário de São Paulo e tamanho da legenda. O destaque em negrito só aparece em grupos com 2 posts ou mais.'],
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
  S.blogLeitores = serie(5, 0.04, 0.3, 0.8, 31, true);
  S.blogViews = S.blogLeitores.map((v) => Math.round(v * 1.3));
  S.blogCompletas = S.blogLeitores.map((v) => Math.round(v * 0.45));
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
    const validos = POSTS_BLOG.filter((p) => p.l > 0);
    const media = {};
    for (const k of Object.keys(PESOS)) media[k] = soma(validos.map((p) => p[k])) / validos.length || 1;
    for (const p of POSTS_BLOG) {
      p.valido = p.l > 0;
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

  // posts de exemplo no mesmo formato que a API devolve, para usar a mesma análise dos dados reais
  const EXEMPLO_IG = (() => {
    const r = rnd(41);
    const ganchos = [
      'O logo é a última coisa que eu desenho', '5 sinais de que sua marca precisa de posicionamento', 'Bastidores de um projeto de identidade',
      'O erro de copiar o concorrente', 'Marca não é custo, é ativo do negócio', 'Por que empresa B2B também precisa de marca',
      'O que a Batavo ensina sobre marca', 'Território de marca em 60 segundos', 'Quando vale fazer rebranding',
      'Sua empresa cresceu e a marca ficou pequena', 'O briefing que mudou um projeto inteiro', 'Marca forte começa dentro de casa',
      'Três perguntas antes de contratar quem faz sua marca', 'Posicionamento é escolher o que deixar de fora', 'Como eu apresento uma marca para o cliente',
      'O que aprendi construindo uma marca do zero', 'Identidade visual não é decoração', 'Marketing de baixo custo começa no que você já paga',
      'A pergunta que eu faço antes de abrir o Illustrator', 'Marca de transportadora não precisa ter caminhão',
    ];
    const fmts = ['reel', 'carrossel', 'carrossel', 'reel', 'estatico', 'reel', 'carrossel', 'estatico'];
    const horas = [7, 8, 12, 12, 18, 19, 20, 21];
    let idade = 1;
    return ganchos.map((t, k) => {
      const f = fmts[k % fmts.length];
      const dt = new Date(HOJE); dt.setHours(12, 0, 0, 0); dt.setDate(dt.getDate() - idade);
      idade += 3 + Math.floor(r() * 3);
      const q = 0.45 + r() * 1.3;
      const base = f === 'reel' ? 5200 : f === 'carrossel' ? 3600 : 1700;
      const reach = Math.round(base * (0.45 + r() * 1.3) * (k === 0 ? 0.35 : 1));
      const taxa = (b) => Math.round((reach * b * q * (0.6 + r() * 0.8)) / 100);
      const i = {
        reach, views: Math.round(reach * (f === 'reel' ? 2.4 : 1.5)), shares: taxa(f === 'reel' ? 2.6 : 2.1), saved: taxa(f === 'carrossel' ? 4.2 : 1.9),
        likes: taxa(5.6), comments: taxa(0.6), follows: taxa(0.4), profile_visits: taxa(1.7),
      };
      if (f === 'reel') { i.ig_reels_avg_watch_time = Math.round((5 + r() * 8 * q) * 1000); i.reels_skip_rate = Math.round(28 + r() * 30); }
      return { id: `ex${k}`, formato: f, dia: ymdLocal(dt), hora: horas[Math.floor(r() * horas.length)], texto: t, link: null, thumb: null, th: ['t1', 't2', 't3', 't4'][k % 4], legenda: Math.round(120 + r() * 1400), hashtags: Math.floor(r() * 6), i };
    });
  })();
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
  // ---------- blog: peças da tela ----------
  let ORD_BLOG = { k: 'indice', dir: -1 };
  let ABERTO_BLOG = null;
  const NOME_REDE = { linkedin: 'LinkedIn', whatsapp: 'WhatsApp', copiar_link: 'Copiar link', outro: 'Outro' };
  const NOME_LOCAL = { menu_topo: 'Botão do topo', fim_artigo: 'Fim do artigo', rodape: 'Rodapé', botao_flutuante: 'Botão flutuante', 'c-blog': 'Convite do fim do artigo', contato: 'Convite do fim do artigo' };
  function barrasLista(lista, emPct) {
    if (!lista || !lista.length) return '<div class="card-s">Sem dados no período.</div>';
    const total = soma(lista.map((x) => x[1])) || 1;
    const max = Math.max(...lista.map((x) => x[1])) || 1;
    return lista.slice(0, 7).map(([nome, v]) => `<div class="hbar"><span>${esc(nome)}</span><div class="bar"><span style="width:${(v / max) * 100}%"></span></div><b>${emPct ? `${n((v / total) * 100, 0)}%` : n(v)}</b></div>`).join('');
  }
  function funilBlog(f) {
    const v = f.v || 0;
    const etapas = [['Abriram', v]];
    if (f.temProg) etapas.push(['Leram 25%', f.p25], ['Leram 50%', f.p50], ['Leram 75%', f.p75]);
    etapas.push(['Leram até o fim', f.fim], ['Clicaram em contato', f.ct]);
    const linhasF = etapas.map(([nome, q]) => `<div class="hbar"><span>${nome}</span><div class="bar"><span style="width:${v ? clamp((q / v) * 100, 0, 100) : 0}%"></span></div><b>${v ? `${n((q / v) * 100, 0)}%` : '–'}</b></div>`).join('');
    return linhasF + (f.temProg ? '' : '<div class="card-s" style="margin-top:8px">As marcas de 25, 50 e 75% aparecem quando a dimensão "progresso" estiver registrada no GA4.</div>');
  }
  function acoesBlog(RB) {
    if (!RB) return barrasLista([['Compartilhar: LinkedIn', 18], ['Compartilhar: WhatsApp', 11], ['Botão de contato', 9], ['Continue lendo', 22], ['Links internos', 7]]);
    const itens = [];
    Object.entries(RB.redes || {}).forEach(([r, q]) => itens.push([`Compartilhar: ${NOME_REDE[r] || r}`, q]));
    if (!Object.keys(RB.redes || {}).length && RB.sh) itens.push(['Compartilhamentos', RB.sh]);
    if (RB.news) itens.push(['Assinar a newsletter', RB.news]);
    const locais = Object.entries(RB.ctaLocais || {});
    if (locais.length) locais.forEach(([l, q]) => itens.push([`Contato: ${NOME_LOCAL[l] || l}`, q]));
    else if (RB.ct) itens.push(['Botões de contato', RB.ct]);
    itens.push(['Continue lendo', RB.cliques.continuar], ['Links internos', RB.cliques.interno], ['Redes sociais', RB.cliques.redes]);
    const comCliques = itens.filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]);
    return comCliques.length ? barrasLista(comCliques) : '<div class="card-s">Ninguém clicou em nada dentro dos artigos no período.</div>';
  }
  function mediana(arr) { const a = [...arr].sort((x, y) => x - y); if (!a.length) return 0; const m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
  function diagnostico(p, medV, medC) {
    if (!p.valido) return { k: 'sem', nome: 'Sem leitura', dica: 'Ninguém abriu no período. Vale repostar nas redes ou linkar em artigos mais lidos.' };
    const v = p.views || p.l;
    if (v >= medV && p.comp >= medC) return { k: 'repetir', nome: 'Repetir', dica: 'Atrai e segura. Faça mais artigos nesse tema e formato.' };
    if (v >= medV) return { k: 'ajustar', nome: 'Ajustar o texto', dica: 'O título atrai, mas o texto perde o leitor no caminho. Encurte a abertura e traga a ideia principal mais cedo.' };
    if (p.comp >= medC) return { k: 'distribuir', nome: 'Distribuir mais', dica: 'Quem abre lê até o fim, mas pouca gente chega. Leve para o LinkedIn, o Instagram e a newsletter.' };
    return { k: 'revisar', nome: 'Revisar título e capa', dica: 'Pouca gente abre e pouca gente termina. Teste outro título, resumo e imagem.' };
  }
  function medianasBlog() {
    const lidos = POSTS_BLOG.filter((p) => p.valido);
    return { medV: mediana(lidos.map((p) => p.views || p.l)), medC: mediana(lidos.map((p) => p.comp)) };
  }
  function destaquesBlog() {
    const lidos = POSTS_BLOG.filter((p) => p.valido);
    if (!lidos.length) return '<div class="card-s">Nenhum artigo lido no período.</div>';
    const top = (f, min) => { const l = lidos.filter((p) => f(p) > (min || 0)).sort((a, b) => f(b) - f(a)); return l[0] || null; };
    const itens = [
      ['Mais lido', top((p) => p.l), (p) => `${n(p.l)} ${p.l === 1 ? 'leitor' : 'leitores'}`],
      ['Mais tempo de tela', top((p) => p.tempo), (p) => tempo(p.tempo)],
      ['Mais compartilhado', top((p) => p.shN || 0), (p) => `${n(p.shN)} ${p.shN === 1 ? 'compartilhamento' : 'compartilhamentos'}`],
      ['Mais cliques em contato', top((p) => p.ctN || 0), (p) => `${n(p.ctN)} ${p.ctN === 1 ? 'clique' : 'cliques'}`],
      ['Porta de entrada pelo Google', top((p) => (p.g ? p.g.cliques : 0)), (p) => `${n(p.g.cliques)} ${p.g.cliques === 1 ? 'clique' : 'cliques'} no Google`],
      ['Melhor índice', top((p) => p.indice || 0), (p) => `índice ${p.indice}`],
    ];
    return `<div class="lst">${itens.map(([rot, p, f]) => `<div class="lst-i"><div><small>${rot}</small>${p ? esc(p.t) : '<span class="card-s">Ninguém ainda</span>'}</div><div class="r">${p ? `<b>${f(p)}</b>` : ''}</div></div>`).join('')}</div>`;
  }
  function diagnosticoBlog() {
    const { medV, medC } = medianasBlog();
    const grupos = { repetir: [], ajustar: [], distribuir: [], revisar: [], sem: [] };
    POSTS_BLOG.forEach((p) => grupos[diagnostico(p, medV, medC).k].push(p));
    const blocos = [
      ['repetir', 'Repetir', 'Atrai e segura o leitor.'],
      ['distribuir', 'Distribuir mais', 'Segura quem abre, mas pouca gente chega.'],
      ['ajustar', 'Ajustar o texto', 'Atrai, mas o leitor desiste no meio.'],
      ['revisar', 'Revisar título e capa', 'Pouca gente abre e pouca termina.'],
    ];
    return `<div class="diag">${blocos.map(([k, nome, desc]) => `<div class="diag-b diag-${k}"><b>${nome} <span>${grupos[k].length}</span></b><small>${desc}</small>${grupos[k].length ? `<ul>${grupos[k].map((p) => `<li>${esc(p.t)}</li>`).join('')}</ul>` : ''}</div>`).join('')}</div>
      ${grupos.sem.length ? `<div class="callout mt"><b>Sem leitores no período (${grupos.sem.length})</b>${grupos.sem.map((p) => esc(p.t)).join(' · ')}. Bons candidatos para repostar nas redes ou linkar nos artigos mais lidos.</div>` : ''}
      <div class="card-s" style="margin-top:8px">Referência: mediana de ${n(medV, 0)} visualizações e ${n(medC, 0)}% de leitura completa entre os artigos lidos.</div>`;
  }
  function temasBlog() {
    const cats = {};
    POSTS_BLOG.filter((p) => p.valido).forEach((p) => { (cats[p.c] = cats[p.c] || { i: [], l: 0 }); cats[p.c].i.push(p.indice); cats[p.c].l += p.l; });
    const lista = Object.entries(cats).map(([c, o]) => [c, Math.round(soma(o.i) / o.i.length), o.i.length, o.l]).sort((a, b) => b[1] - a[1]);
    if (!lista.length) return '<div class="card-s">Nenhum artigo lido no período.</div>';
    return lista.map(([c, v, q, l]) => `<div class="hbar"><span>${esc(c)} <small style="color:#8c8c86">(${q} · ${n(l)} leit.)</small></span><div class="bar"><span style="width:${v}%"></span></div><b>${v}</b></div>`).join('');
  }
  function detalheBlog(p) {
    const v = p.views || 0;
    const org = barrasLista(p.origem, true);
    const funil = funilBlog({ v, p25: p.p25, p50: p.p50, p75: p.p75, fim: p.completas, ct: p.ctN, temProg: DADOS && DADOS.blog && DADOS.blog.detalhes && DADOS.blog.detalhes.progresso });
    const acoes = [];
    Object.entries(p.shRede || {}).forEach(([r, q]) => acoes.push([`Compartilhar: ${NOME_REDE[r] || r}`, q]));
    if (!Object.keys(p.shRede || {}).length && p.shN) acoes.push(['Compartilhamentos', p.shN]);
    if (p.news) acoes.push(['Assinar a newsletter', p.news]);
    const loc = Object.entries(p.ctaLocais || {});
    if (loc.length) loc.forEach(([l, q]) => acoes.push([`Contato: ${NOME_LOCAL[l] || l}`, q])); else if (p.ctN) acoes.push(['Botões de contato', p.ctN]);
    acoes.push(['Continue lendo', p.continuar], ['Links internos', p.interno], ['Redes sociais', p.redes]);
    const acoesF = acoes.filter((x) => x[1] > 0);
    const g = p.g;
    const { medV, medC } = medianasBlog();
    const d = diagnostico(p, medV, medC);
    return `<div class="bdet">
      <div class="bdet-d"><span class="tag diag-tag diag-${d.k}">${d.nome}</span> ${d.dica}${p.url ? ` <a class="lnk" href="${esc(p.url)}" target="_blank" rel="noopener">Abrir o artigo</a>` : ''}</div>
      <div class="bdet-g">
        <div><div class="bdet-t">De onde vieram</div>${org}${p.entradas ? `<div class="card-s" style="margin-top:6px">${n(p.entradas)} ${p.entradas === 1 ? 'entrou' : 'entraram'} no site por este artigo</div>` : ''}${p.cardIn ? `<div class="card-s">${n(p.cardIn)} ${p.cardIn === 1 ? 'veio' : 'vieram'} de cards do próprio blog</div>` : ''}</div>
        <div><div class="bdet-t">Até onde leram</div>${funil}</div>
        <div><div class="bdet-t">O que clicaram</div>${acoesF.length ? barrasLista(acoesF.sort((a, b) => b[1] - a[1])) : '<div class="card-s">Nenhum clique no período.</div>'}</div>
        <div><div class="bdet-t">No Google ${i('blog_google')}</div>${g ? `<div class="bdet-n"><div><b>${n(g.cliques)}</b><small>cliques</small></div><div><b>${n(g.impressoes)}</b><small>impressões</small></div><div><b>${g.impressoes ? n(g.pos, 1) : '–'}</b><small>posição</small></div></div>${g.busca ? `<div class="card-s" style="margin-top:8px">Busca que mais mostrou: <b>${esc(g.busca)}</b></div>` : ''}` : '<div class="card-s">Sem aparições no Google no período (o Search Console tem 2 a 3 dias de atraso).</div>'}</div>
      </div>
    </div>`;
  }
  function tabelaBlog() {
    const { medV, medC } = medianasBlog();
    const val = (p, k) => (k === 't' ? String(p.t).toLowerCase() : k === 'g' ? (p.g ? p.g.cliques : -1) : k === 'indice' ? (p.indice === null ? -1 : p.indice) : Number(p[k]) || 0);
    const lista = [...POSTS_BLOG].sort((a, b) => { const x = val(a, ORD_BLOG.k), y = val(b, ORD_BLOG.k); return (x > y ? 1 : x < y ? -1 : 0) * ORD_BLOG.dir || b.l - a.l; });
    const col = (k, rot, tip, num) => `<th class="${num ? 'n ' : ''}ord" data-ord="${k}" aria-sort="${ORD_BLOG.k === k ? (ORD_BLOG.dir < 0 ? 'descending' : 'ascending') : 'none'}">${rot}${ORD_BLOG.k === k ? (ORD_BLOG.dir < 0 ? ' ↓' : ' ↑') : ''} ${tip ? i(tip) : ''}</th>`;
    const tend = (p) => (p.lAnt || p.l ? (p.l > p.lAnt ? '<span class="up-s">▲</span>' : p.l < p.lAnt ? '<span class="dn-s">▼</span>' : '') : '');
    const linhasT = lista.map((p) => {
      const d = diagnostico(p, medV, medC);
      const aberto = ABERTO_BLOG === p.id;
      return `<tr class="brow ${p.valido ? '' : 'apagado'} ${aberto ? 'aberto' : ''}" data-post="${esc(p.id)}">
        <td><button type="button" class="t-tit lnk-t" data-abrir="${esc(p.id)}" aria-expanded="${aberto}">${esc(p.t)}</button><div class="t-cat">${esc(p.c)}${p.valido && p.l < 5 ? ' · amostra pequena' : ''}</div></td>
        <td class="n">${n(p.views || 0)}</td>
        <td class="n">${n(p.l)} ${tend(p)}</td>
        <td class="n">${p.valido ? tempo(p.tempo) : '–'}</td>
        <td class="n">${p.valido ? pct(p.comp, 0) : '–'}</td>
        <td class="n">${n(p.shN || 0)}</td>
        <td class="n">${n(p.ctN || 0)}</td>
        <td class="n">${p.g ? n(p.g.cliques) : '–'}</td>
        <td class="n">${p.indice === null ? '–' : `<div class="score"><div class="bar"><span style="width:${p.indice}%"></span></div><b>${p.indice}</b></div>`}</td>
        <td><span class="tag diag-tag diag-${d.k}">${d.nome}</span></td>
      </tr>${aberto ? `<tr class="bdet-row"><td colspan="10">${detalheBlog(p)}</td></tr>` : ''}`;
    }).join('');
    return `<div class="tbl-wrap"><table class="tbl tbl-blog"><thead><tr>
      ${col('t', 'Artigo', '', false)}${col('views', 'Visualiz.', 'blog_views', true)}${col('l', 'Leitores', 'blog_leitores', true)}${col('tempo', 'Tempo', 'blog_tempo', true)}${col('comp', 'Leu tudo', 'blog_completa', true)}${col('shN', 'Compart.', 'blog_shares', true)}${col('ctN', 'Contato', 'blog_ctas', true)}${col('g', 'Google', 'blog_google', true)}${col('indice', 'Índice', 'blog_indice', true)}<th>Próximo passo ${i('blog_diag')}</th>
    </tr></thead><tbody>${linhasT}</tbody></table></div>`;
  }
  function ligarBlog() {
    if (viewAtual() !== 'blog') return;
    const v = $('#view');
    v.querySelectorAll('[data-ord]').forEach((th) => th.addEventListener('click', (e) => {
      if (e.target.closest('.i')) return;
      const k = th.dataset.ord;
      ORD_BLOG = ORD_BLOG.k === k ? { k, dir: -ORD_BLOG.dir } : { k, dir: k === 't' ? 1 : -1 };
      const y = window.scrollY; render(); window.scrollTo(0, y);
    }));
    v.querySelectorAll('[data-abrir]').forEach((b) => b.addEventListener('click', () => {
      ABERTO_BLOG = ABERTO_BLOG === b.dataset.abrir ? null : b.dataset.abrir;
      const y = window.scrollY; render(); window.scrollTo(0, y);
    }));
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
        segK: 4.1, segKA: 3.6,
        conv: { visitas: Math.round(total('visitas').atual * 0.17), leads: 1, toques: 58, perfilPorPost: pf.atual / 13 },
        fol: Math.round(soma(fatia(S.ganhos, j.ini, j.fim))),
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
      segK: razao(v(A, 'follows'), v(A, 'reach')) * 10, segKA: razao(v(B, 'follows'), v(B, 'reach')) * 10,
      fol: v(A, 'follows'),
    };
  }

  // ---------- Instagram: análise estratégica dos posts ----------
  // Cada post é comparado com a mediana dos seus próprios posts dos últimos 90 dias (mediana = 50 pontos).
  const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const SINAIS_IG = [
    // chave, nome, peso no índice
    ['alc', 'Alcance', 0.20],
    ['env', 'Envios', 0.25],
    ['sal', 'Salvamentos', 0.15],
    ['cur', 'Curtidas', 0.10],
    ['com', 'Comentários', 0.10],
    ['seg', 'Novos seguidores', 0.10],
    ['pf', 'Visitas ao perfil', 0.10],
    ['watch', 'Tempo assistido', 0.15],
  ];
  const NOME_SINAL = Object.fromEntries(SINAIS_IG.map(([k, nome]) => [k, nome]));
  const FORMATOS_FEED = [['reel', 'Reels'], ['carrossel', 'Carrosséis'], ['estatico', 'Estáticos']];
  const DIAG_IG = {
    repetir: { nome: 'Repetir', dica: 'Espalhou e engajou acima da sua média. Repita o tema, o tipo de gancho e o formato.' },
    aprofundar: { nome: 'Aprofundar', dica: 'O gancho levou o post longe, mas pouca gente salvou ou enviou. O começo funciona; entregue mais valor no meio.' },
    reaproveitar: { nome: 'Reaproveitar', dica: 'Quem viu valorizou (salvou e enviou acima da média), mas o post circulou pouco. Refaça com outro gancho ou em outro formato.' },
    naorepetir: { nome: 'Não repetir', dica: 'Ficou abaixo da sua média em alcance e em engajamento. Evite esse ângulo ou mude a abordagem antes de voltar ao tema.' },
    recente: { nome: 'Ainda rodando', dica: 'Publicado há menos de 3 dias. Os números ainda estão subindo, por isso não entra na base de comparação.' },
    sem: { nome: 'Sem base', dica: 'Ainda não há posts suficientes nos últimos 90 dias para comparar.' },
  };
  const FAIXAS_HORA = [['Madrugada', 0, 5], ['Manhã', 6, 11], ['Tarde', 12, 17], ['Noite', 18, 23]];
  const FAIXAS_LEGENDA = [['Curta (até 300)', 0, 300], ['Média (300 a 900)', 301, 900], ['Longa (mais de 900)', 901, Infinity]];

  const midiasIg = () => (REAL.ig ? DADOS.instagram.midias : EXEMPLO_IG);
  const ymdMenos = (dias) => ymdLocal(new Date(HOJE.getTime() - dias * 864e5));
  function postIg(m) {
    const i = m.i || {};
    const alc = Number(i.reach || 0);
    const num = (k) => (i[k] === undefined || i[k] === null ? null : Number(i[k]));
    const por = (k, base) => { const v = num(k); return v === null || !alc ? null : (v / alc) * (base || 100); };
    const dd = new Date(m.dia + 'T12:00:00');
    const idade = Math.round((HOJE - dd) / 864e5);
    const reel = m.formato === 'reel';
    const skip = num('reels_skip_rate');
    return {
      id: m.id, formato: m.formato, f: NOME_FORMATO[m.formato] || m.formato, dia: m.dia, dow: dd.getDay(), hora: m.hora === undefined ? null : m.hora,
      t: m.texto || NOME_FORMATO[m.formato] || 'Post', link: m.link, img: m.thumb, th: m.th || 't1',
      legenda: m.legenda === undefined ? null : m.legenda, hashtags: m.hashtags === undefined ? null : m.hashtags,
      idade, recente: idade < 3,
      alc, views: num('views') || 0,
      envN: num('shares') || 0, salN: num('saved') || 0, curN: num('likes') || 0, comN: num('comments') || 0, segN: num('follows'), pfN: num('profile_visits'),
      env: por('shares'), sal: por('saved'), cur: por('likes'), com: por('comments'), seg: por('follows', 1000), pf: por('profile_visits'),
      watch: reel && num('ig_reels_avg_watch_time') ? num('ig_reels_avg_watch_time') / 1000 : null,
      skip: reel && skip ? (skip <= 1 ? skip * 100 : skip) : null,
    };
  }
  function baseIg(posts) {
    const lim = ymdMenos(89);
    const b = posts.filter((p) => !p.recente && p.dia >= lim);
    const out = { n: b.length };
    for (const [k] of SINAIS_IG) {
      const vals = b.map((p) => p[k]).filter((v) => v !== null && v !== undefined);
      out[k] = mediana(vals) || media(vals) || 0;
      out[`${k}N`] = vals.length;
    }
    return out;
  }
  function pontuarIg(p, B) {
    p.vs = {};
    let s = 0, w = 0;
    for (const [k, , peso] of SINAIS_IG) {
      if (p[k] === null || p[k] === undefined || !B[k] || B[`${k}N`] < 2) continue;
      const x = p[k] / B[k];
      p.vs[k] = x;
      s += peso * clamp(50 * x, 0, 100);
      w += peso;
    }
    p.indice = w ? Math.round(s / w) : null;
    const ord = Object.entries(p.vs).sort((a, b) => b[1] - a[1]);
    p.melhor = ord.length ? ord[0] : null;
    p.pior = ord.length ? ord[ord.length - 1] : null;
    p.gerouSeg = (p.vs.seg || 0) >= 1.5 && (p.segN || 0) >= 1;
    if (p.recente) p.diag = 'recente';
    else if (p.indice === null) p.diag = 'sem';
    else {
      const dist = p.vs.alc === undefined ? 1 : p.vs.alc;
      const resL = ['env', 'sal'].filter((k) => p.vs[k] !== undefined).map((k) => p.vs[k]);
      const res = resL.length ? media(resL) : 1;
      p.res = res;
      p.diag = dist >= 1 && res >= 1 ? 'repetir' : dist >= 1 ? 'aprofundar' : res >= 1 ? 'reaproveitar' : 'naorepetir';
    }
    return p;
  }
  const vezes = (x) => (x >= 1 ? `${n(x, x >= 10 ? 0 : 1)}x a mediana` : `${n(x * 100, 0)}% da mediana`);
  const sinalTxt = (par) => (par ? `${vezes(par[1])} em ${NOME_SINAL[par[0]].toLowerCase()}` : '');

  function resumoGrupo(l) {
    const maduros = l.filter((p) => !p.recente && p.indice !== null);
    const idx = (maduros.length ? maduros : l.filter((p) => p.indice !== null)).map((p) => p.indice);
    const alcT = soma(l.map((p) => p.alc));
    const somaK = (k) => soma(l.map((p) => p[k] || 0));
    const comSeg = l.filter((p) => p.segN !== null), comPf = l.filter((p) => p.pfN !== null);
    const ws = l.map((p) => p.watch).filter((x) => x !== null);
    return {
      q: l.length,
      alc: l.length ? alcT / l.length : 0,
      env: razao(somaK('envN'), alcT), sal: razao(somaK('salN'), alcT), cur: razao(somaK('curN'), alcT), com: razao(somaK('comN'), alcT),
      segPost: comSeg.length ? soma(comSeg.map((p) => p.segN)) / comSeg.length : null,
      pfPost: comPf.length ? soma(comPf.map((p) => p.pfN)) / comPf.length : null,
      watch: ws.length ? media(ws) : null,
      indice: idx.length ? Math.round(media(idx)) : null,
      acerto: idx.length ? (idx.filter((x) => x >= 50).length / idx.length) * 100 : null,
      nIdx: idx.length,
    };
  }
  function rankingFormatos(atual, ant) {
    const lista = FORMATOS_FEED.map(([k, nome]) => {
      const cur = resumoGrupo(atual.filter((p) => p.formato === k));
      const prev = resumoGrupo(ant.filter((p) => p.formato === k));
      return Object.assign({ k, nome, qa: prev.q, indiceAnt: prev.indice }, cur);
    });
    return lista.sort((a, b) => (b.indice === null ? -1 : b.indice) - (a.indice === null ? -1 : a.indice) || b.q - a.q);
  }
  function lideresFormatos(lista) {
    const com = lista.filter((f) => f.q > 0);
    if (com.length < 2) return [];
    const melhor = (k, rot, fmt) => {
      const v = com.filter((f) => f[k] !== null && f[k] > 0).sort((a, b) => b[k] - a[k])[0];
      return v ? [rot, v.nome, fmt(v[k])] : null;
    };
    return [
      melhor('alc', 'Alcance', (x) => `${compacto(Math.round(x))} por post`),
      melhor('env', 'Descoberta (envios)', (x) => pct(x, 2)),
      melhor('sal', 'Autoridade (salvos)', (x) => pct(x, 2)),
      melhor('com', 'Conversa (comentários)', (x) => pct(x, 2)),
      melhor('segPost', 'Crescimento (seguidores)', (x) => `${n(x, 1)} por post`),
    ].filter(Boolean);
  }
  function agrupar(l, chave, rotulos) {
    return rotulos.map(([rot, test]) => {
      const g = l.filter((p) => p.indice !== null && test(p));
      return [rot, g.length ? Math.round(media(g.map((p) => p.indice))) : null, g.length];
    });
  }
  function padroesIg(l) {
    return {
      dia: agrupar(l, 'dow', [1, 2, 3, 4, 5, 6, 0].map((d) => [DIAS_SEMANA[d], (p) => p.dow === d])),
      hora: agrupar(l.filter((p) => p.hora !== null), 'hora', FAIXAS_HORA.map(([rot, a, b]) => [rot, (p) => p.hora >= a && p.hora <= b])),
      legenda: agrupar(l.filter((p) => p.legenda !== null), 'legenda', FAIXAS_LEGENDA.map(([rot, a, b]) => [rot, (p) => p.legenda >= a && p.legenda <= b])),
    };
  }
  const melhorGrupo = (lista) => lista.filter((x) => x[2] >= 2 && x[1] !== null).sort((a, b) => b[1] - a[1])[0] || null;

  let CACHE_IG = null;
  function analiseIg() {
    const j = janela();
    const chave = `${REAL.ig}|${periodo}|${DADOS ? DADOS.geradoEm : ''}`;
    if (CACHE_IG && CACHE_IG.chave === chave) return CACHE_IG.a;
    const todos = midiasIg().filter((m) => m.formato !== 'story').map(postIg).filter((p) => p.alc > 0);
    const B = baseIg(todos);
    todos.forEach((p) => pontuarIg(p, B));
    const atual = todos.filter((p) => noPeriodo(p.dia, j.ini, j.fim));
    const ant = todos.filter((p) => noPeriodo(p.dia, j.pIni, j.pFim));
    const ult90 = todos.filter((p) => !p.recente && p.dia >= ymdMenos(89));
    const a = { B, todos, atual, ant, ult90, formatos: rankingFormatos(atual, ant), padroes: padroesIg(ult90) };
    CACHE_IG = { chave, a };
    return a;
  }

  // ---------- Instagram: leituras automáticas ----------
  function leiturasIg(A, G) {
    const out = [];
    const F = A.formatos.filter((f) => f.q > 0 && f.indice !== null);
    if (A.B.n < 5) out.push(['info', `A base de comparação tem só ${n(A.B.n)} ${A.B.n === 1 ? 'post' : 'posts'} nos últimos 90 dias. Leia o índice como tendência, não como regra.`]);
    if (!A.atual.length) { out.push(['alerta', 'Nenhum post no feed neste período. Sem publicação, o perfil perde alcance e não há o que comparar.']); return out; }
    if (F.length) {
      const top = F[0];
      out.push(['bom', `<b>${top.nome}</b> lideram o período com índice médio ${top.indice}${F.length > 1 ? `, contra ${F[F.length - 1].indice} dos ${F[F.length - 1].nome.toLowerCase()}` : ''}. Dê prioridade a esse formato na pauta da semana.`]);
      if (F.length > 1) {
        const fraco = F[F.length - 1];
        if (fraco.indice < 50) out.push(['alerta', `<b>${fraco.nome}</b> ficaram abaixo da sua média (índice ${fraco.indice}, ${n(fraco.acerto, 0)}% dos posts acima da mediana). Reveja o tipo de conteúdo que vai nesse formato antes de publicar mais.`]);
      }
    }
    const dia = melhorGrupo(A.padroes.dia), hora = melhorGrupo(A.padroes.hora);
    if (dia || hora) out.push(['info', `Nos últimos 90 dias, ${dia ? `os posts de <b>${dia[0].toLowerCase()}</b> (índice ${dia[1]}, ${dia[2]} posts)` : ''}${dia && hora ? ' e ' : ''}${hora ? `os publicados à <b>${hora[0].toLowerCase()}</b> (índice ${hora[1]})` : ''} renderam mais. Teste concentrar os posts mais fortes ${dia ? 'nesse dia' : ''}${dia && hora ? ' e ' : ''}${hora ? 'nesse horário' : ''}.`]);
    const seg = A.atual.filter((p) => (p.segN || 0) > 0).sort((a, b) => b.segN - a.segN)[0];
    if (seg) out.push(['bom', `<b>“${esc(seg.t)}”</b> foi o post que mais trouxe seguidores (${n(seg.segN)}). Esse tema converte: vale uma sequência sobre ele.`]);
    const reap = A.atual.filter((p) => p.diag === 'reaproveitar').sort((a, b) => b.res - a.res)[0];
    if (reap) out.push(['info', `<b>“${esc(reap.t)}”</b> tem conteúdo forte (${sinalTxt(reap.melhor)}) mas circulou pouco. Refaça com outro gancho ou leve para ${reap.formato === 'reel' ? 'carrossel' : 'reel'}.`]);
    const ruins = A.atual.filter((p) => p.diag === 'naorepetir');
    if (ruins.length) {
      const cont = {};
      ruins.forEach((p) => { cont[p.f] = (cont[p.f] || 0) + 1; });
      const [fmt, q] = Object.entries(cont).sort((a, b) => b[1] - a[1])[0];
      out.push(['alerta', `${n(ruins.length)} ${ruins.length === 1 ? 'post ficou' : 'posts ficaram'} abaixo da média em alcance e em engajamento${ruins.length > 1 && q > 1 ? `, a maioria em ${fmt.toLowerCase()}` : ''}. Veja em "O que não repetir" o ponto mais fraco de cada um.`]);
    }
    const semanas = (janela().fim - janela().ini + 1) / 7;
    if (semanas >= 1) {
      const datasP = [...new Set(A.atual.map((p) => p.dia))].sort();
      let maior = 0;
      for (let k = 1; k < datasP.length; k++) maior = Math.max(maior, Math.round((new Date(datasP[k]) - new Date(datasP[k - 1])) / 864e5));
      out.push([A.atual.length / semanas >= 3 ? 'bom' : 'info', `Ritmo de ${n(A.atual.length / semanas, 1)} posts por semana no feed${maior > 6 ? `, com um intervalo de ${maior} dias sem postar` : ''}. Constância pesa no alcance de quem já te segue.`]);
    }
    if (G.watch && G.watchA) out.push([G.watch >= G.watchA ? 'bom' : 'alerta', `Tempo médio nos reels ${G.watch >= G.watchA ? 'subiu' : 'caiu'} para ${tempo(G.watch)} (antes ${tempo(G.watchA)}). ${G.watch >= G.watchA ? 'Os ganchos estão segurando mais.' : 'Teste ganchos mais diretos nos 3 primeiros segundos.'}`]);
    if (G.ns && G.nsA) out.push([G.ns >= G.nsA ? 'bom' : 'alerta', `${n(G.ns, 0)}% do alcance veio de quem ainda não te segue (antes ${n(G.nsA, 0)}%). ${G.ns >= G.nsA ? 'O perfil está sendo mais descoberto.' : 'Para voltar a crescer, priorize conteúdo que as pessoas mandam para outras (envios).'}`]);
    return out;
  }

  // ---------- Instagram: componentes ----------
  const dataPost = (p) => { const d = new Date(p.dia + 'T12:00:00'); return `${DIAS_SEMANA[d.getDay()].slice(0, 3).toLowerCase()}, ${d.getDate()} ${MESES[d.getMonth()]}${p.hora !== null ? ` · ${String(p.hora).padStart(2, '0')}h` : ''}`; };
  const linkPost = (p, txt) => (p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">${txt}</a>` : txt);
  const thumbPost = (p, cls) => `<div class="thumb ${cls || ''} ${p.img ? 'com-img' : p.th}">${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ICO.instagram}</div>`;
  function topPostsIg(A, limite) {
    const lista = [...A.atual].filter((p) => p.indice !== null).sort((a, b) => b.indice - a.indice || b.alc - a.alc).slice(0, limite || 4);
    if (!lista.length) return '<div class="card-s">Nenhum post no período.</div>';
    return `<div class="posts">${lista.map((p, k) => `<article class="post">
        <div class="post-b">
          <div class="post-top"><span class="rank ${k === 0 ? 'r1' : ''}">${k + 1}</span><span class="post-d">${dataPost(p)}</span><span class="score-pill" title="Índice de Desempenho">${p.indice}</span></div>
          <div class="post-t">${linkPost(p, esc(p.t))}</div>
          <div class="post-why">${p.recente ? 'Ainda rodando, números parciais' : p.melhor ? `Destaque: ${sinalTxt(p.melhor)}` : ''}</div>
          <div class="post-m">
            <div><span class="pi">${ICO.olho}</span><b>${compacto(p.alc)}</b>Alcance</div>
            <div><span class="pi">${ICO.envio}</span><b>${p.env === null ? '–' : pct(p.env)}</b>Envios</div>
            <div><span class="pi">${ICO.salvo}</span><b>${p.sal === null ? '–' : pct(p.sal)}</b>Salvos</div>
            <div><span class="pi">${ICO.pessoas}</span><b>${p.segN === null ? '–' : n(p.segN)}</b>Seguid.</div>
          </div>
        </div>
        <div class="thumb ${p.img ? 'com-img' : p.th}"><span class="fmt">${p.f}</span>${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ICO.instagram}</div>
      </article>`).join('')}</div>`;
  }

  let ORD_IG = { k: 'indice', dir: -1 };
  let ABERTO_IG = null;
  function celTaxa(p, k, nk, d) {
    if (p[k] === null || p[k] === undefined) return '<td class="n">–</td>';
    const x = p.vs && p.vs[k];
    const cls = x === undefined ? '' : x >= 1.3 ? 'hi' : x <= 0.7 ? 'lo' : '';
    return `<td class="n ${cls}">${pct(p[k], d === undefined ? 1 : d)}<small>${n(p[nk] || 0)}</small></td>`;
  }
  function celNum(p, k, txt) {
    if (p[k] === null || p[k] === undefined) return '<td class="n">–</td>';
    const x = p.vs && p.vs[k];
    const cls = x === undefined ? '' : x >= 1.3 ? 'hi' : x <= 0.7 ? 'lo' : '';
    return `<td class="n ${cls}">${txt}</td>`;
  }
  function detalheIg(p, B) {
    const d = DIAG_IG[p.diag];
    const barras = SINAIS_IG.filter(([k]) => p.vs[k] !== undefined).map(([k, nome]) => {
      const x = p.vs[k];
      return `<div class="hbar vsbar"><span>${nome}</span><div class="bar"><i class="mid"></i><span class="${x >= 1 ? '' : 'neg'}" style="width:${clamp((x / 2) * 100, 2, 100)}%"></span></div><b>${n(x, 1)}x</b></div>`;
    }).join('');
    const abs = [
      ['Alcance', n(p.alc)], ['Visualizações', n(p.views)], ['Envios', n(p.envN)], ['Salvamentos', n(p.salN)], ['Curtidas', n(p.curN)], ['Comentários', n(p.comN)],
      ['Novos seguidores', p.segN === null ? '–' : n(p.segN)], ['Visitas ao perfil', p.pfN === null ? '–' : n(p.pfN)],
    ];
    if (p.formato === 'reel') abs.push(['Tempo médio assistido', p.watch ? tempo(p.watch) : '–'], ['Pulo nos 3 primeiros segundos', p.skip ? pct(p.skip, 0) : '–']);
    const contexto = [
      ['Publicado', dataPost(p)],
      ['Formato', p.f],
      ['Legenda', p.legenda === null ? '–' : `${n(p.legenda)} caracteres`],
      ['Hashtags', p.hashtags === null ? '–' : n(p.hashtags)],
    ];
    return `<div class="bdet">
      <div class="bdet-d"><span class="tag diag-tag diag-${p.diag}">${d.nome}</span> ${d.dica}${p.link ? ` <a class="lnk" href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">Abrir no Instagram</a>` : ''}</div>
      <div class="bdet-g ig-det">
        <div><div class="bdet-t">Contra a sua mediana ${i('ig_vs')}</div>${barras || '<div class="card-s">Sem base de comparação ainda.</div>'}</div>
        <div><div class="bdet-t">Números do post</div><div class="lst lst-c">${abs.map(([a, b]) => `<div class="lst-i"><div>${a}</div><div class="r"><b>${b}</b></div></div>`).join('')}</div></div>
        <div><div class="bdet-t">Leitura</div>
          ${p.melhor ? `<div class="callout callout-s"><b>Ponto mais forte</b>${sinalTxt(p.melhor)}</div>` : ''}
          ${p.pior && p.pior !== p.melhor ? `<div class="callout callout-s mt-s"><b>${p.pior[1] >= 1 ? 'Sinal mais baixo' : 'Ponto mais fraco'}</b>${sinalTxt(p.pior)}</div>` : ''}
          <div class="lst lst-c mt-s">${contexto.map(([a, b]) => `<div class="lst-i"><div>${a}</div><div class="r">${b}</div></div>`).join('')}</div>
        </div>
      </div>
    </div>`;
  }
  function tabelaIg(A) {
    if (!A.atual.length) return '<div class="card-s">Nenhum post no feed neste período.</div>';
    const val = (p, k) => (k === 't' ? String(p.t).toLowerCase() : k === 'dia' ? p.dia : p[k] === null || p[k] === undefined ? -1 : Number(p[k]));
    const lista = [...A.atual].sort((a, b) => { const x = val(a, ORD_IG.k), y = val(b, ORD_IG.k); return (x > y ? 1 : x < y ? -1 : 0) * ORD_IG.dir || b.alc - a.alc; });
    const col = (k, rot, tip, num) => `<th class="${num ? 'n ' : ''}ord" data-ordig="${k}" aria-sort="${ORD_IG.k === k ? (ORD_IG.dir < 0 ? 'descending' : 'ascending') : 'none'}">${rot}${ORD_IG.k === k ? (ORD_IG.dir < 0 ? ' ↓' : ' ↑') : ''} ${tip ? i(tip) : ''}</th>`;
    const linhasT = lista.map((p) => {
      const aberto = ABERTO_IG === p.id;
      return `<tr class="brow ${aberto ? 'aberto' : ''}">
        <td><div class="ig-cel">${thumbPost(p, 'mini')}<div><button type="button" class="t-tit lnk-t" data-abririg="${esc(p.id)}" aria-expanded="${aberto}">${esc(p.t)}</button><div class="t-cat">${p.f} · ${dataPost(p)}</div><div class="t-tags"><span class="tag diag-tag diag-${p.diag}">${DIAG_IG[p.diag].nome}</span>${p.gerouSeg ? '<span class="tag ok">gera seguidor</span>' : ''}</div></div></div></td>
        <td class="n">${n(p.alc)}${p.vs.alc !== undefined ? `<small>${vezes(p.vs.alc).replace(' a mediana', '').replace(' da mediana', '')}</small>` : ''}</td>
        ${celTaxa(p, 'env', 'envN', 2)}${celTaxa(p, 'sal', 'salN', 2)}${celTaxa(p, 'cur', 'curN')}${celTaxa(p, 'com', 'comN', 2)}
        ${celNum(p, 'seg', p.segN === null ? '–' : `${n(p.segN)}<small>${n(p.seg, 1)}/mil</small>`)}
        ${celNum(p, 'pf', p.pfN === null ? '–' : `${n(p.pfN)}<small>${pct(p.pf)}</small>`)}
        ${celNum(p, 'watch', p.watch ? tempo(p.watch) : '–')}
        <td class="n">${p.indice === null ? '–' : `<div class="score"><div class="bar"><span style="width:${p.indice}%"></span></div><b>${p.indice}</b></div>`}</td>
      </tr>${aberto ? `<tr class="bdet-row"><td colspan="10">${detalheIg(p, A.B)}</td></tr>` : ''}`;
    }).join('');
    return `<div class="tbl-wrap"><table class="tbl tbl-blog tbl-ig"><thead><tr>
      ${col('t', 'Post e próximo passo', 'ig_diag', false)}${col('alc', 'Alcance', 'ig_alcance_post', true)}${col('env', 'Envios', 'ig_envios', true)}${col('sal', 'Salvos', 'ig_salvos', true)}${col('cur', 'Curtidas', 'ig_curtidas', true)}${col('com', 'Coment.', 'ig_coment', true)}${col('seg', 'Seguid.', 'ig_seg_post', true)}${col('pf', 'Perfil', 'ig_pf_post', true)}${col('watch', 'Assistido', 'ig_watch', true)}${col('indice', 'Índice', 'ig_indice', true)}
    </tr></thead><tbody>${linhasT}</tbody></table></div>
    <div class="card-s" style="margin-top:10px">Base de comparação: mediana de ${n(A.B.n)} ${A.B.n === 1 ? 'post' : 'posts'} dos últimos 90 dias (sem os publicados há menos de 3 dias). Fundo verde: 30% ou mais acima da mediana. Fundo vermelho: 30% ou mais abaixo.</div>`;
  }
  function diagResumoIg(A) {
    const grupos = { repetir: [], reaproveitar: [], aprofundar: [], naorepetir: [] };
    A.atual.forEach((p) => { if (grupos[p.diag]) grupos[p.diag].push(p); });
    const blocos = [
      ['repetir', 'Espalhou e engajou.'], ['reaproveitar', 'Engajou, mas circulou pouco.'],
      ['aprofundar', 'Circulou, mas engajou pouco.'], ['naorepetir', 'Ficou abaixo nos dois.'],
    ];
    const css = { repetir: 'repetir', reaproveitar: 'distribuir', aprofundar: 'ajustar', naorepetir: 'revisar' };
    return `<div class="diag">${blocos.map(([k, desc]) => `<div class="diag-b diag-${css[k]}"><b>${DIAG_IG[k].nome} <span>${grupos[k].length}</span></b><small>${desc}</small>${grupos[k].length ? `<ul>${grupos[k].sort((a, b) => b.indice - a.indice).map((p) => `<li>${esc(p.t)} <span class="card-s">(${p.f.toLowerCase()})</span></li>`).join('')}</ul>` : ''}</div>`).join('')}</div>`;
  }
  function naoRepetirIg(A) {
    const ruins = A.atual.filter((p) => p.diag === 'naorepetir' || (p.diag === 'aprofundar' && p.indice < 45)).sort((a, b) => a.indice - b.indice).slice(0, 5);
    if (!ruins.length) return '<div class="card-s">Nenhum post do período ficou abaixo da sua média nos dois eixos. Bom sinal.</div>';
    return `<div class="lst">${ruins.map((p) => `<div class="lst-i lst-top"><div class="ig-cel">${thumbPost(p, 'mini')}<div>${linkPost(p, esc(p.t))}<small>${p.f} · ${dataPost(p)} · índice ${p.indice}</small><small class="lo-t">Mais fraco: ${sinalTxt(p.pior)}</small></div></div></div>`).join('')}</div>`;
  }
  function formatosIg(A) {
    const L = A.formatos;
    const lideres = lideresFormatos(L);
    const linhasF = L.map((f, k) => {
      const vazio = !f.q;
      return `<tr class="${vazio ? 'apagado' : ''}">
        <td><span class="rank ${k === 0 && !vazio && f.indice !== null ? 'r1' : ''}">${k + 1}</span></td>
        <td class="t-tit">${f.nome}</td>
        <td class="n">${n(f.q)} <small>antes ${n(f.qa)}</small></td>
        <td class="n">${f.indice === null ? '–' : `<div class="score"><div class="bar"><span style="width:${f.indice}%"></span></div><b>${f.indice}</b></div>`}${f.indice !== null && f.indiceAnt !== null ? `<small>${deltaPts(f.indice, f.indiceAnt, ' pts')} vs anterior</small>` : ''}</td>
        <td class="n">${f.acerto === null ? '–' : pct(f.acerto, 0)}</td>
        <td class="n">${vazio ? '–' : compacto(Math.round(f.alc))}</td>
        <td class="n">${vazio ? '–' : pct(f.env, 2)}</td>
        <td class="n">${vazio ? '–' : pct(f.sal, 2)}</td>
        <td class="n">${vazio ? '–' : pct(f.cur)}</td>
        <td class="n">${vazio ? '–' : pct(f.com, 2)}</td>
        <td class="n">${f.segPost === null ? '–' : n(f.segPost, 1)}</td>
        <td class="n">${f.pfPost === null ? '–' : n(f.pfPost, 1)}</td>
      </tr>`;
    }).join('');
    return `<div class="tbl-wrap"><table class="tbl tbl-fmt"><thead><tr><th></th><th>Formato</th><th class="n">Posts</th><th class="n">Índice médio ${i('ig_fmt_indice')}</th><th class="n">Acerto ${i('ig_acerto')}</th><th class="n">Alcance</th><th class="n">Envios ${i('ig_envios')}</th><th class="n">Salvos ${i('ig_salvos')}</th><th class="n">Curtidas ${i('ig_curtidas')}</th><th class="n">Coment. ${i('ig_coment')}</th><th class="n">Seguid. ${i('ig_seg_fmt')}</th><th class="n">Perfil ${i('ig_pf_fmt')}</th></tr></thead><tbody>${linhasF}</tbody></table></div>
      ${lideres.length ? `<div class="lideres">${lideres.map(([rot, nome, val]) => `<div><small>${rot}</small><b>${nome}</b><span>${val}</span></div>`).join('')}</div>` : ''}`;
  }
  function padroesHtml(A) {
    const bloco = (titulo, lista, vazio) => {
      const best = melhorGrupo(lista);
      const com = lista.filter((x) => x[2] > 0);
      return `<div><div class="bdet-t">${titulo}</div>${com.length ? lista.map(([rot, v, q]) => `<div class="hbar ${best && best[0] === rot ? 'best' : ''} ${q ? '' : 'apagado'}"><span>${rot} <small>(${q})</small></span><div class="bar"><span style="width:${v === null ? 0 : v}%"></span></div><b>${v === null ? '–' : v}</b></div>`).join('') : `<div class="card-s">${vazio}</div>`}</div>`;
    };
    return `<div class="padroes">
      ${bloco('Dia da semana', A.padroes.dia, 'Sem posts nos últimos 90 dias.')}
      ${bloco('Horário de publicação', A.padroes.hora, 'O horário entra na próxima coleta.')}
      ${bloco('Tamanho da legenda (caracteres)', A.padroes.legenda, 'O tamanho da legenda entra na próxima coleta.')}
    </div><div class="card-s" style="margin-top:10px">Índice médio dos ${n(A.ult90.length)} posts dos últimos 90 dias. Entre parênteses, quantos posts há em cada grupo; o destaque só aparece com 2 ou mais.</div>`;
  }
  function funilIg(G) {
    const etapas = [
      ['Alcance', G.alcance.atual],
      ['Visitas ao perfil', G.perfil.atual],
      ['Novos seguidores', G.fol],
      ['Toques no link e contato do perfil', G.conv.toques],
      ['Visitas ao site', G.conv.visitas],
      ['Leads', G.conv.leads],
    ];
    const max = etapas[0][1] || 1;
    return `<div class="funil">${etapas.map(([nome, v], k) => {
      const antv = k ? etapas[k - 1][1] : null;
      const doAlc = razao(v, etapas[0][1]);
      const txt = !k ? 'contas únicas no período' : `${pct(doAlc, doAlc < 1 ? 2 : 1)} do alcance${antv && v <= antv ? ` · ${pct(razao(v, antv), v / antv < 0.1 ? 2 : 1)} da etapa anterior` : ''}`;
      return `<div class="funil-i"><div class="funil-h"><span>${nome}</span><b>${n(v)}</b></div><div class="bar"><span style="width:${clamp(Math.sqrt(v / max) * 100, v ? 2 : 0, 100)}%"></span></div><small>${txt}</small></div>`;
    }).join('')}</div>`;
  }
  function leiturasHtml(A, G) {
    const l = leiturasIg(A, G);
    return `<ul class="leit">${l.map(([tipo, t]) => `<li class="leit-${tipo}"><span></span><div>${t}</div></li>`).join('')}</ul>`;
  }
  function ligarIg() {
    if (viewAtual() !== 'instagram') return;
    const v = $('#view');
    v.querySelectorAll('[data-ordig]').forEach((th) => th.addEventListener('click', (e) => {
      if (e.target.closest('.i')) return;
      const k = th.dataset.ordig;
      ORD_IG = ORD_IG.k === k ? { k, dir: -ORD_IG.dir } : { k, dir: k === 't' ? 1 : -1 };
      const y = window.scrollY; render(); window.scrollTo(0, y);
    }));
    v.querySelectorAll('[data-abririg]').forEach((b) => b.addEventListener('click', () => {
      ABERTO_IG = ABERTO_IG === b.dataset.abririg ? null : b.dataset.abririg;
      const y = window.scrollY; render(); window.scrollTo(0, y);
    }));
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
    blogLeitores: { nome: 'Leitores', serie: 'blogLeitores' },
    blogViews: { nome: 'Visualizações', serie: 'blogViews' },
    blogCompletas: { nome: 'Leituras completas', serie: 'blogCompletas' },
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
    const bruto = Math.max(1, ...atual, ...ant) * 1.12;
    const passoY = (() => { const c = bruto / 4; const e = 10 ** Math.floor(Math.log10(c)); const m = c / e; return Math.max(1, (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * e); })();
    const max = passoY * 4;
    const passo = (W - pl - pr) / Math.max(1, atual.length - 1);
    const x = (k) => pl + k * passo;
    const y = (v) => pt + (H - pt - pb) * (1 - v / max);
    const linha = (arr) => arr.map((v, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)},${y(v).toFixed(1)}`).join('');
    const area = `${linha(atual)}L${x(atual.length - 1).toFixed(1)},${y(0)}L${x(0)},${y(0)}Z`;
    let grade = '';
    for (let g = 0; g <= 4; g++) {
      const v = passoY * g;
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
        <div class="card mt">${cardH('Top posts do Instagram', 'Índice de Desempenho no período, contra a sua mediana de 90 dias', 'top_ig', 'trofeu', '<a class="btn" href="#/instagram">Ver ranking completo</a>')}${topPostsIg(analiseIg())}</div>
        <div class="grid g-main mt">
          <div class="card">${cardH('Top 5 do blog', 'Índice de Aderência no período', 'top_blog', 'livro', '<a class="btn" href="#/blog">Ver ranking completo</a>')}${POSTS_BLOG.some((p) => p.valido) ? rankingBlog(5, true) : '<div class="card-s">Nenhum artigo lido no período.</div>'}</div>
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
      nome: 'Blog', ico: 'blog', sub: 'Além do Logo: o que atrai, prende, espalha e gera contato.',
      html() {
        const RB = real('blog') ? DADOS.blog : null;
        const lidos = POSTS_BLOG.filter((p) => p.valido);
        const somaP = (k) => soma(POSTS_BLOG.map((p) => Number(p[k]) || 0));
        const leitores = RB ? RB.leitores : somaP('l');
        const views = RB ? RB.views : Math.round(somaP('l') * 1.3);
        const completas = RB ? RB.completas : soma(lidos.map((p) => (p.comp / 100) * p.l * 1.3));
        const comp = views ? (completas / views) * 100 : 0;
        const tmp = soma(lidos.map((p) => p.tempo * p.l)) / (soma(lidos.map((p) => p.l)) || 1);
        const shares = RB ? RB.sh : Math.round(soma(lidos.map((p) => (p.sh * p.l) / 100)));
        const ctas = RB ? RB.ct : Math.round(soma(lidos.map((p) => (p.ct * p.l) / 100)));
        const metas = metasDoMes();
        return `
        <div class="grid g-kpi">
          ${kpi({ ico: 'pessoas', label: 'Leitores', tip: 'blog_leitores', valor: n(leitores), delta: RB ? delta(leitores, RB.leitoresAnt) : delta(leitores, 1290) })}
          ${kpi({ ico: 'olho', label: 'Visualizações', tip: 'blog_views', valor: n(views), delta: RB ? delta(views, RB.viewsAnt) : '' })}
          ${kpi({ ico: 'relogio', label: 'Tempo de tela por leitor', tip: 'blog_tempo', valor: lidos.length ? tempo(tmp) : '–', nota: 'média dos artigos lidos' })}
          ${kpi({ ico: 'livro', label: 'Leitura completa', tip: 'blog_completa', valor: views ? pct(comp, 0) : '–', delta: RB && RB.viewsAnt ? deltaPts(comp, (RB.completasAnt / RB.viewsAnt) * 100) : '' })}
          ${kpi({ ico: 'envio', label: 'Compartilhamentos', tip: 'blog_shares', valor: n(shares), delta: RB ? delta(shares, RB.shAnt) : '' })}
          ${kpi({ ico: 'clique', label: 'Cliques em contato', tip: 'blog_ctas', valor: n(ctas), delta: RB ? delta(ctas, RB.ctAnt) : '', nota: `posts no mês: ${metas.blog.atual}/${metas.blog.meta}` })}
        </div>
        <div class="grid g-main mt">
          ${graficoCard('blog', ['blogLeitores', 'blogViews', 'blogCompletas'], 'Movimento do blog', 'Diário, no período escolhido')}
          <div class="card">${cardH('Destaques do período', 'Quem liderou cada métrica', 'blog_destaques', 'trofeu')}${destaquesBlog()}</div>
        </div>
        <div class="card mt">${cardH('Todos os artigos', `${n(lidos.length)} de ${n(POSTS_BLOG.length)} artigos lidos no período · clique no nome para ver o detalhe`, 'blog_artigos', 'livro')}${tabelaBlog()}</div>
        <div class="grid g-3 mt">
          <div class="card">${cardH('De onde chegam os leitores', RB ? `${n(RB.entradas)} ${RB.entradas === 1 ? 'pessoa entrou' : 'pessoas entraram'} no site direto por um artigo` : 'Canal de quem leu os artigos', 'blog_origem', 'site')}${barrasLista(RB ? RB.origem : [['Google e buscadores', 41], ['Redes sociais', 33], ['Direto', 18], ['Outros sites', 8]], true)}</div>
          <div class="card">${cardH('Até onde leem', 'Visualizações que chegaram a cada ponto do texto', 'blog_funil', 'grafico')}${funilBlog(RB ? { v: RB.views, p25: RB.funil.p25, p50: RB.funil.p50, p75: RB.funil.p75, fim: RB.completas, ct: RB.ct, temProg: RB.detalhes && RB.detalhes.progresso } : { v: 1000, p25: 780, p50: 610, p75: 520, fim: 470, ct: 12, temProg: true })}</div>
          <div class="card">${cardH('O que fazem no artigo', 'Cliques dentro das páginas dos artigos', 'blog_acoes', 'clique')}${acoesBlog(RB)}</div>
        </div>
        <div class="grid g-2 mt">
          <div class="card">${cardH('Diagnóstico dos artigos', 'O que fazer com cada um, pelo que atrai e pelo que segura', 'blog_diag', 'faisca')}${diagnosticoBlog()}</div>
          <div class="card">${cardH('Temas que mais prendem', 'Índice médio por categoria', 'blog_cat')}${temasBlog()}</div>
        </div>`;
      },
    },

    instagram: {
      nome: 'Instagram', ico: 'instagram', sub: '@juniorsturmer · dados da API da Meta (atraso de até 48 h).',
      html() {
        const G = igDados();
        const A = analiseIg();
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
        <div class="grid g-kpi mt">
          ${kpi({ ico: 'envio', label: 'Envios por alcance', tip: 'ig_envios', valor: pct(G.env, 2), delta: deltaPts(G.env, G.envA) })}
          ${kpi({ ico: 'salvo', label: 'Salvamentos por alcance', tip: 'ig_salvos', valor: pct(G.sal, 2), delta: deltaPts(G.sal, G.salA) })}
          ${kpi({ ico: 'coracao', label: 'Curtidas por alcance', tip: 'ig_curtidas', valor: pct(G.cur), delta: deltaPts(G.cur, G.curA) })}
          ${kpi({ ico: 'pessoas', label: 'Seguidores por mil de alcance', tip: 'ig_segk', valor: n(G.segK, 1), delta: G.segKA ? delta(G.segK, G.segKA) : '' })}
          ${kpi({ ico: 'relogio', label: 'Tempo médio nos reels', tip: 'ig_watch', valor: G.watch ? tempo(G.watch) : '–', delta: G.watch && G.watchA ? delta(G.watch, G.watchA) : '', nota: G.watch ? undefined : 'sem reels no período' })}
          ${kpi({ ico: 'faisca', label: 'Pulo nos 3 primeiros segundos', tip: 'ig_skip', valor: G.skip ? pct(G.skip) : '–', delta: G.skip && G.skipA ? deltaPts(G.skip, G.skipA) : '', nota: 'quanto menor, melhor' })}
        </div>
        <div class="card mt">${cardH('O que fazer agora', 'Leitura automática do período para a próxima pauta', 'ig_leituras', 'faisca')}${leiturasHtml(A, G)}</div>
        <div class="card mt">${cardH('Top posts', 'Índice de Desempenho no período, contra a sua mediana de 90 dias', 'top_ig', 'trofeu')}${topPostsIg(A)}</div>
        <div class="card mt">${cardH('Ranking de posts', `${n(A.atual.length)} ${A.atual.length === 1 ? 'post' : 'posts'} no feed no período · clique no título para ver o detalhe e no nome da coluna para ordenar`, 'ig_ranking', 'trofeu')}${tabelaIg(A)}</div>
        <div class="card mt">${cardH('Ranking de formatos', `Período escolhido contra ${janela().rotulo}`, 'ig_formato', 'grafico')}${formatosIg(A)}</div>
        <div class="grid g-2 mt">
          <div class="card">${cardH('Diagnóstico dos posts', 'O que fazer com cada post do período', 'ig_diag', 'alvo')}${diagResumoIg(A)}</div>
          <div class="card">${cardH('O que não repetir', 'Os posts mais fracos do período e onde eles perderam', 'ig_nao_repetir', 'alvo')}${naoRepetirIg(A)}</div>
        </div>
        <div class="card mt">${cardH('Quando e como postar', 'Padrões dos seus posts nos últimos 90 dias', 'ig_padroes', 'calendario')}${padroesHtml(A)}</div>
        <div class="grid g-2 mt">
          <div class="card">${cardH('Do Instagram para o negócio', 'Funil do alcance até o lead, no período', 'ig_conv', 'alvo')}${funilIg(G)}</div>
          <div class="card">${cardH('Stories', G.real ? `${n(G.stories.qtd)} stories no período · média por story` : 'Média por story no período', 'ig_stories', 'olho')}
            <div class="lst">
              <div class="lst-i"><div>Alcance médio</div><div class="r"><b>${n(G.stories.alc)}</b> ${G.stories.alcA ? delta(G.stories.alc, G.stories.alcA) : ''}</div></div>
              <div class="lst-i"><div>Taxa de saída ${i('ig_saida')}</div><div class="r"><b>${pct(G.stories.saida)}</b> ${G.stories.saidaA ? deltaPts(G.stories.saida, G.stories.saidaA) : ''}</div></div>
              <div class="lst-i"><div>Respostas</div><div class="r"><b>${n(G.stories.resp)}</b> no período</div></div>
              <div class="lst-i"><div>Visitas ao perfil vindas de stories</div><div class="r"><b>${n(G.stories.perfil)}</b> no período</div></div>
              <div class="lst-i"><div>Visitas ao perfil por post do feed</div><div class="r"><b>${n(G.conv.perfilPorPost, 0)}</b></div></div>
            </div>
          </div>
        </div>`;
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
    ligarBlog();
    ligarIg();
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
    if (DADOS.blog && DADOS.blog.serie && DADOS.blog.serie.blogLeitores.length === DIAS) Object.assign(S, DADOS.blog.serie);
    if (REAL.site && DADOS.site.serie && DADOS.site.serie.visitas.length === DIAS) {
      S.visitas = DADOS.site.serie.visitas; S.leads = DADOS.site.serie.leads; S.cta = DADOS.site.serie.cta;
    }
    if (DADOS.blog) {
      REAL.blog = true;
      const porId = Object.fromEntries(DADOS.blog.posts.map((p) => [p.id, p]));
      const vazio = (a) => ({ id: a.id, t: a.titulo, c: a.categoria, l: 0, lAnt: 0, views: 0, viewsAnt: 0, p25: 0, p50: 0, p75: 0, completas: 0, comp: 0, tempo: 0, shN: 0, shRede: {}, news: 0, sh: 0, ctN: 0, ct: 0, interno: 0, redes: 0, continuar: 0, cardIn: 0, origem: [], entradas: 0, ctaLocais: {}, g: null });
      const base = LISTA_POSTS ? LISTA_POSTS.map((a) => Object.assign(vazio(a), porId[a.id] || {}, { t: a.titulo, c: a.categoria, url: a.url, data: a.data })) : DADOS.blog.posts;
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
