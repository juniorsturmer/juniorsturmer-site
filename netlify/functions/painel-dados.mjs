// Dados do painel /metricas. Só responde com sessão válida.
// Nesta primeira versão devolve { demo: true } e a tela usa os dados de exemplo.
// As próximas etapas ligam GA4, Search Console, Instagram e Google Alerts aqui.
import { sessaoValida, env, CABECALHOS_PRIVADOS } from '../lib/sessao.mjs';

const json = (dados, status = 200) =>
  new Response(JSON.stringify(dados), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CABECALHOS_PRIVADOS } });

export default async (req) => {
  if (!(await sessaoValida(req))) return json({ erro: 'sem_sessao' }, 401);

  const conexoes = {
    ga4: Boolean(env('GA4_PROPERTY_ID') && env('GOOGLE_SERVICE_ACCOUNT_JSON')),
    searchConsole: Boolean(env('GOOGLE_SERVICE_ACCOUNT_JSON')),
    instagram: Boolean(env('IG_USER_ID') && env('IG_ACCESS_TOKEN')),
    alerts: Boolean(env('ALERTS_FEED_URLS')),
  };

  return json({ demo: true, conexoes, geradoEm: new Date().toISOString() });
};

export const config = { path: '/api/painel/dados' };
