// Acesso às APIs do Google (GA4 e Search Console) com a conta de serviço.
// A chave vem de GOOGLE_SERVICE_ACCOUNT_JSON (variável secreta do Netlify) e nunca sai do servidor.
import { env } from './sessao.mjs';

const ESCOPOS = 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly';
let tokenCache = null;

function credenciais() {
  const bruto = env('GOOGLE_SERVICE_ACCOUNT_JSON');
  if (!bruto) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON não configurada');
  let c;
  try { c = JSON.parse(bruto); } catch (e) { throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON não é um JSON válido (copie o arquivo inteiro, do { ao })'); }
  if (!c.client_email || !c.private_key) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON sem client_email ou private_key');
  return { email: c.client_email, chave: c.private_key.replace(/\\n/g, '\n') };
}

const b64url = (txt) => Buffer.from(txt).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function assinarJwt(email, pem) {
  const agora = Math.floor(Date.now() / 1000);
  const cab = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const corpo = b64url(JSON.stringify({ iss: email, scope: ESCOPOS, aud: 'https://oauth2.googleapis.com/token', iat: agora, exp: agora + 3600 }));
  const der = Buffer.from(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''), 'base64');
  const chave = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', chave, new TextEncoder().encode(`${cab}.${corpo}`));
  return `${cab}.${corpo}.${Buffer.from(sig).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

export async function tokenGoogle() {
  if (tokenCache && tokenCache.exp > Date.now() + 60_000) return tokenCache.token;
  const { email, chave } = credenciais();
  const jwt = await assinarJwt(email, chave);
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Google recusou a chave: ${j.error_description || j.error || r.status}`);
  tokenCache = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return tokenCache.token;
}

async function chamar(url, corpo) {
  const token = await tokenGoogle();
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (j.error && j.error.message) || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return j;
}

// GA4: dimensões personalizadas registradas na propriedade (para só pedir o que existe)
let metaCache = null;
export async function ga4Dimensoes() {
  if (metaCache && metaCache.em > Date.now() - 6 * 36e5) return metaCache.dims;
  const id = env('GA4_PROPERTY_ID');
  const token = await tokenGoogle();
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(id)}/metadata`, { headers: { Authorization: `Bearer ${token}` } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || `HTTP ${r.status}`);
  const dims = new Set((j.dimensions || []).map((d) => d.apiName).filter((n) => n.startsWith('customEvent:')));
  metaCache = { em: Date.now(), dims };
  return dims;
}

// GA4: até 5 relatórios por chamada
export async function ga4Lote(relatorios) {
  const id = env('GA4_PROPERTY_ID');
  if (!id) throw new Error('GA4_PROPERTY_ID não configurada');
  const j = await chamar(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(id)}:batchRunReports`, { requests: relatorios });
  return j.reports || [];
}

export async function ga4TempoReal(corpo) {
  const id = env('GA4_PROPERTY_ID');
  return chamar(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(id)}:runRealtimeReport`, corpo);
}

export async function searchConsole(corpo, site = 'sc-domain:juniorsturmer.com.br') {
  return chamar(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, corpo);
}

// Converte as linhas do GA4 em objetos simples: { dims: [...], mets: [...] }
export function linhas(relatorio) {
  return ((relatorio && relatorio.rows) || []).map((r) => ({
    dims: (r.dimensionValues || []).map((d) => d.value),
    mets: (r.metricValues || []).map((m) => Number(m.value) || 0),
  }));
}
