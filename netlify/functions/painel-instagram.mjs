// Conexão do Instagram com o painel /metricas.
// /api/painel/instagram/conectar  → leva para a tela de autorização da Meta (Login do Facebook para Empresas) (precisa estar logado no painel)
// /api/painel/instagram/retorno   → a Meta volta para cá; guarda o token e dispara a primeira coleta
// /api/painel/instagram/coletar   → "Atualizar agora" no painel
import { sessaoValida, assinarTexto, conferirAssinatura, env, CABECALHOS_PRIVADOS } from '../lib/sessao.mjs';
import { urlAutorizacao, trocarCodigo, dispararColeta } from '../lib/instagram.mjs';

const html = (corpo, status = 200) => new Response(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Instagram | Painel</title>
<style>body{font:16px/1.5 Helvetica,Arial,sans-serif;background:#f4f4f1;color:#111;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px}main{background:#fff;border:1px solid #e6e6e1;border-radius:20px;padding:32px;max-width:420px}h1{font-size:22px;margin:0 0 8px}a{color:#111}</style></head><body><main>${corpo}</main></body></html>`,
  { status, headers: { 'Content-Type': 'text/html; charset=utf-8', ...CABECALHOS_PRIVADOS } });

export default async (req) => {
  const url = new URL(req.url);
  const acao = url.pathname.split('/').pop();

  if (acao === 'conectar') {
    if (!(await sessaoValida(req))) return Response.redirect(`${url.origin}/metricas/`, 303);
    if (!env('META_APP_ID') || !env('META_CONFIG_ID')) return html('<h1>Falta configurar</h1><p>As variáveis META_APP_ID e META_CONFIG_ID não estão no Netlify.</p>', 500);
    const exp = String(Math.floor(Date.now() / 1000) + 900);
    const state = `${exp}.${await assinarTexto(`ig-state|${exp}`)}`;
    return new Response(null, { status: 303, headers: { Location: urlAutorizacao(state), ...CABECALHOS_PRIVADOS } });
  }

  if (acao === 'retorno') {
    const [exp, sig] = String(url.searchParams.get('state') || '').split('.');
    const okState = exp && Number(exp) > Date.now() / 1000 && (await conferirAssinatura(`ig-state|${exp}`, sig));
    if (!okState) return html('<h1>Link expirado</h1><p>Volte ao painel e clique em Conectar Instagram de novo.</p><p><a href="/metricas/#/instagram">Voltar ao painel</a></p>', 400);
    if (url.searchParams.get('error')) return html(`<h1>Conexão cancelada</h1><p>${String(url.searchParams.get('error_description') || 'O acesso não foi autorizado.').replace(/[<>&]/g, '')}</p><p><a href="/metricas/#/instagram">Voltar ao painel</a></p>`, 400);
    try {
      const t = await trocarCodigo(String(url.searchParams.get('code') || ''));
      await dispararColeta(url.origin);
      // navegação iniciada pela própria página, para o cookie do painel (SameSite=Strict) ir junto
      return html(`<h1>Instagram conectado</h1><p>Conta @${String(t.usuario || '').replace(/[<>&]/g, '')} ligada ao painel. A primeira coleta leva alguns minutos.</p><p><a id="v" href="/metricas/#/instagram">Voltar ao painel</a></p><script>setTimeout(function(){location.href='/metricas/#/instagram'},2500)</script>`);
    } catch (e) {
      return html(`<h1>Não foi possível conectar</h1><p>${String(e.message).replace(/[<>&]/g, '')}</p><p><a href="/metricas/#/instagram">Voltar ao painel</a></p>`, 500);
    }
  }

  if (acao === 'coletar') {
    if (req.method !== 'POST' || !(await sessaoValida(req))) return new Response('Não autorizado', { status: 401, headers: CABECALHOS_PRIVADOS });
    await dispararColeta(url.origin);
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', ...CABECALHOS_PRIVADOS } });
  }

  return new Response('Não encontrado', { status: 404, headers: CABECALHOS_PRIVADOS });
};

export const config = { path: ['/api/painel/instagram/conectar', '/api/painel/instagram/retorno', '/api/painel/instagram/coletar'] };
