// Presença no painel /metricas: revisar menções do Google Alerts e cadastrar menções à mão.
// POST /api/painel/presenca/coletar  → lê os feeds agora
// POST /api/painel/presenca/marcar   → { id, estado: confirmado|descartado|novo, tipo, marco }
// POST /api/painel/presenca/cadastrar → { titulo, link, data, tipo, marco, fonte }
// Todas devolvem o estado atualizado da Presença.
import { sessaoValida, CABECALHOS_PRIVADOS } from '../lib/sessao.mjs';
import { coletarAlerts, marcar, cadastrar, dadosPresenca } from '../lib/presenca.mjs';

const json = (dados, status = 200) => new Response(JSON.stringify(dados), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CABECALHOS_PRIVADOS } });

export default async (req) => {
  if (req.method !== 'POST') return json({ erro: 'método' }, 405);
  if (!(await sessaoValida(req))) return json({ erro: 'sem_sessao' }, 401);
  const origem = req.headers.get('origin');
  if (origem && origem !== new URL(req.url).origin) return json({ erro: 'origem' }, 403);
  const acao = new URL(req.url).pathname.split('/').pop();
  let corpo = {};
  try { corpo = await req.json(); } catch { /* sem corpo */ }
  try {
    if (acao === 'coletar') await coletarAlerts();
    else if (acao === 'marcar') await marcar(String(corpo.id || ''), corpo);
    else if (acao === 'cadastrar') await cadastrar(corpo);
    else return json({ erro: 'não encontrado' }, 404);
    return json({ ok: true, presenca: await dadosPresenca() });
  } catch (e) {
    return json({ erro: String(e.message || e) }, 400);
  }
};

export const config = { path: ['/api/painel/presenca/coletar', '/api/painel/presenca/marcar', '/api/painel/presenca/cadastrar'] };
