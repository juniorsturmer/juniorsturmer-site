// Login e saída do painel /metricas.
// 5 senhas erradas seguidas do mesmo endereço bloqueiam por 15 minutos.
import { getStore } from '@netlify/blobs';
import { env, criarToken, senhaConfere, cookieSessao, cookieSair, CABECALHOS_PRIVADOS } from '../lib/sessao.mjs';

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 15 * 60 * 1000;

function redirecionar(destino, cookie) {
  const headers = new Headers({ Location: destino, ...CABECALHOS_PRIVADOS });
  if (cookie) headers.append('Set-Cookie', cookie);
  return new Response(null, { status: 303, headers });
}

async function chaveIp(req, context) {
  const ip = (context && context.ip) || req.headers.get('x-nf-client-connection-ip') || 'desconhecido';
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('painel|' + ip));
  return 'ip-' + Array.from(new Uint8Array(h)).slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default async (req, context) => {
  const url = new URL(req.url);

  if (url.pathname.endsWith('/sair')) return redirecionar('/metricas/', cookieSair());
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405, headers: CABECALHOS_PRIVADOS });

  const senha = env('DASH_PASSWORD');
  if (!senha) return redirecionar('/metricas/?erro=config');

  const store = getStore('painel-login');
  const chave = await chaveIp(req, context);
  const agora = Date.now();
  const registro = (await store.get(chave, { type: 'json' })) || { erros: 0, ate: 0 };

  if (registro.ate > agora) return redirecionar('/metricas/?erro=bloqueado');

  let digitada = '';
  try { digitada = String((await req.formData()).get('senha') || ''); } catch (e) { /* formulário vazio */ }

  if (await senhaConfere(digitada, senha)) {
    await store.delete(chave);
    return redirecionar('/metricas/', cookieSessao(await criarToken(senha)));
  }

  registro.erros += 1;
  if (registro.erros >= MAX_TENTATIVAS) { registro.erros = 0; registro.ate = agora + BLOQUEIO_MS; }
  await store.setJSON(chave, registro);
  await new Promise((r) => setTimeout(r, 600));
  return redirecionar(registro.ate > agora ? '/metricas/?erro=bloqueado' : '/metricas/?erro=1');
};

export const config = { path: ['/api/painel/login', '/api/painel/sair'] };
