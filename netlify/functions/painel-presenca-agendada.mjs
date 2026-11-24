// A cada 6 horas: lê os feeds do Google Alerts e guarda as menções novas para revisão.
import { coletarAlerts, feeds } from '../lib/presenca.mjs';

export default async () => {
  if (!feeds().length) return;
  const c = await coletarAlerts();
  console.log('[presenca] coleta:', c.novos, 'novas', Object.keys(c.erros).length ? c.erros : '');
};

export const config = { schedule: '17 */6 * * *' };
