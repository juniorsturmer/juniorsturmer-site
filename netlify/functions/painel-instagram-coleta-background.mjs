// Coleta do Instagram em segundo plano (até 15 min). Só aceita chamada assinada pelas outras funções do painel.
import { conferirAssinatura } from '../lib/sessao.mjs';
import { coletar } from '../lib/instagram.mjs';

export default async (req) => {
  const ts = req.headers.get('x-painel-ts') || '';
  const ok = Math.abs(Date.now() - Number(ts)) < 5 * 60 * 1000 && (await conferirAssinatura(`coleta-ig|${ts}`, req.headers.get('x-painel-sig')));
  if (!ok) return;
  try { console.log('[instagram] coleta', JSON.stringify(await coletar())); }
  catch (e) { console.error('[instagram] coleta falhou', e.message); }
};

export const config = { path: '/api/painel/instagram/coleta-bg' };
