// Sessão do painel /metricas.
// Usa só Web Crypto, então roda tanto na Edge Function (Deno) quanto nas Functions (Node).
// O cookie guarda "validade.assinatura". A chave da assinatura sai da senha (DASH_PASSWORD):
// trocar a senha no Netlify derruba todas as sessões abertas.

export const COOKIE = 'painel_sessao';
export const DIAS_SESSAO = 7;

const enc = new TextEncoder();

export function env(nome) {
  try {
    if (globalThis.Netlify && globalThis.Netlify.env) {
      const v = globalThis.Netlify.env.get(nome);
      if (v) return v;
    }
  } catch (e) { /* segue */ }
  if (typeof process !== 'undefined' && process.env) return process.env[nome];
  return undefined;
}

function b64url(buf) {
  let s = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function iguais(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function chave(senha) {
  const raw = await crypto.subtle.digest('SHA-256', enc.encode('painel-metricas-v1|' + senha));
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

async function assinar(texto, senha) {
  const k = await chave(senha);
  return b64url(await crypto.subtle.sign('HMAC', k, enc.encode(texto)));
}

export async function criarToken(senha) {
  const validade = Math.floor(Date.now() / 1000) + DIAS_SESSAO * 86400;
  return `${validade}.${await assinar(String(validade), senha)}`;
}

export async function tokenValido(token, senha) {
  if (!token || !senha) return false;
  const [validade, sig] = token.split('.');
  if (!/^\d+$/.test(validade || '') || !sig) return false;
  if (Number(validade) < Date.now() / 1000) return false;
  return iguais(await assinar(validade, senha), sig);
}

// Compara a senha digitada com a correta sem vazar tempo de comparação
export async function senhaConfere(digitada, senha) {
  if (!digitada || !senha) return false;
  const a = b64url(await crypto.subtle.digest('SHA-256', enc.encode(String(digitada))));
  const b = b64url(await crypto.subtle.digest('SHA-256', enc.encode(String(senha))));
  return iguais(a, b);
}

export function lerCookie(req, nome = COOKIE) {
  const c = req.headers.get('cookie') || '';
  for (const parte of c.split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nome) return decodeURIComponent(v.join('='));
  }
  return null;
}

export async function sessaoValida(req) {
  return tokenValido(lerCookie(req), env('DASH_PASSWORD'));
}

export function cookieSessao(token) {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${DIAS_SESSAO * 86400}`;
}

export function cookieSair() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

// Cabeçalhos de toda resposta do painel: fora do Google, sem cache, sem iframe
export const CABECALHOS_PRIVADOS = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};
