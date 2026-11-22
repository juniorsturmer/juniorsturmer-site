// De hora em hora: pede a coleta do Instagram à função em segundo plano
// (stories só ficam disponíveis por 24 h na API, e a coleta completa passa do limite de uma função agendada).
import { env } from '../lib/sessao.mjs';
import { dispararColeta, lerToken } from '../lib/instagram.mjs';

export default async () => {
  if (!(await lerToken())) return;
  const site = env('URL') || 'https://juniorsturmer.com.br';
  console.log('[instagram] coleta agendada disparada:', await dispararColeta(site));
};

export const config = { schedule: '@hourly' };
