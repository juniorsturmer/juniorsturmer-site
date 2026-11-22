// Protege tudo em /metricas. Sem sessão válida, devolve só a tela de senha:
// o HTML do painel nunca sai do servidor sem login.
import { sessaoValida, env, CABECALHOS_PRIVADOS } from '../lib/sessao.mjs';

const MENSAGENS = {
  '1': 'Senha incorreta. Tente de novo.',
  bloqueado: 'Muitas tentativas. Aguarde 15 minutos e tente de novo.',
  config: 'A senha do painel ainda não foi configurada no Netlify (DASH_PASSWORD).',
};

function telaDeSenha(erro) {
  const msg = MENSAGENS[erro] || '';
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Acesso restrito</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
/* Helvetica Neue instalada no computador, chamada pelo nome exato de cada peso.
   Assim o navegador nunca pega uma variação Outline/Contorno da família. */
@font-face { font-family: "Painel Sans"; font-weight: 100; font-style: normal; font-display: swap; src: local("HelveticaNeue-Thin"), local("Helvetica Neue Thin"), local("HelveticaNeueLTStd-Th"), local("Helvetica Neue LT Std 35 Thin"), local("HelveticaNeueLTPro-Th"), local("Helvetica Neue LT Pro 35 Thin"), local("HelveticaNeue-UltraLight"), local("Helvetica Neue UltraLight"); }
@font-face { font-family: "Painel Sans"; font-weight: 100; font-style: italic; font-display: swap; src: local("HelveticaNeue-ThinItalic"), local("Helvetica Neue Thin Italic"), local("HelveticaNeueLTStd-ThIt"), local("Helvetica Neue LT Std 36 Thin Italic"), local("HelveticaNeueLTPro-ThIt"), local("Helvetica Neue LT Pro 36 Thin Italic"), local("HelveticaNeue-UltraLightItalic"); }
@font-face { font-family: "Painel Sans"; font-weight: 300; font-style: normal; font-display: swap; src: local("HelveticaNeue-Light"), local("Helvetica Neue Light"), local("HelveticaNeueLTStd-Lt"), local("Helvetica Neue LT Std 45 Light"), local("HelveticaNeueLTPro-Lt"), local("Helvetica Neue LT Pro 45 Light"); }
@font-face { font-family: "Painel Sans"; font-weight: 300; font-style: italic; font-display: swap; src: local("HelveticaNeue-LightItalic"), local("Helvetica Neue Light Italic"), local("HelveticaNeueLTStd-LtIt"), local("Helvetica Neue LT Std 46 Light Italic"), local("HelveticaNeueLTPro-LtIt"), local("Helvetica Neue LT Pro 46 Light Italic"); }
@font-face { font-family: "Painel Sans"; font-weight: 400; font-style: normal; font-display: swap; src: local("HelveticaNeue"), local("Helvetica Neue Regular"), local("HelveticaNeue-Roman"), local("HelveticaNeueLTStd-Roman"), local("Helvetica Neue LT Std 55 Roman"), local("HelveticaNeueLTPro-Roman"), local("Helvetica Neue LT Pro 55 Roman"); }
@font-face { font-family: "Painel Sans"; font-weight: 400; font-style: italic; font-display: swap; src: local("HelveticaNeue-Italic"), local("Helvetica Neue Italic"), local("HelveticaNeueLTStd-It"), local("Helvetica Neue LT Std 56 Italic"), local("HelveticaNeueLTPro-It"), local("Helvetica Neue LT Pro 56 Italic"); }
@font-face { font-family: "Painel Sans"; font-weight: 500; font-style: normal; font-display: swap; src: local("HelveticaNeue-Medium"), local("Helvetica Neue Medium"), local("HelveticaNeueLTStd-Md"), local("Helvetica Neue LT Std 65 Medium"), local("HelveticaNeueLTPro-Md"), local("Helvetica Neue LT Pro 65 Medium"); }
@font-face { font-family: "Painel Sans"; font-weight: 500; font-style: italic; font-display: swap; src: local("HelveticaNeue-MediumItalic"), local("Helvetica Neue Medium Italic"), local("HelveticaNeueLTStd-MdIt"), local("Helvetica Neue LT Std 66 Medium Italic"), local("HelveticaNeueLTPro-MdIt"); }
@font-face { font-family: "Painel Sans"; font-weight: 700; font-style: normal; font-display: swap; src: local("HelveticaNeue-Bold"), local("Helvetica Neue Bold"), local("HelveticaNeueLTStd-Bd"), local("Helvetica Neue LT Std 75 Bold"), local("HelveticaNeueLTPro-Bd"), local("Helvetica Neue LT Pro 75 Bold"); }
@font-face { font-family: "Painel Sans"; font-weight: 700; font-style: italic; font-display: swap; src: local("HelveticaNeue-BoldItalic"), local("Helvetica Neue Bold Italic"), local("HelveticaNeueLTStd-BdIt"), local("Helvetica Neue LT Std 76 Bold Italic"), local("HelveticaNeueLTPro-BdIt"), local("Helvetica Neue LT Pro 76 Bold Italic"); }
@font-face { font-family: "Painel Sans"; font-weight: 900; font-style: normal; font-display: swap; src: local("HelveticaNeue-Black"), local("Helvetica Neue Black"), local("HelveticaNeueLTStd-Blk"), local("Helvetica Neue LT Std 95 Black"), local("HelveticaNeueLTPro-Blk"), local("Helvetica Neue LT Pro 95 Black"), local("HelveticaNeue-CondensedBlack"); }
@font-face { font-family: "Painel Sans"; font-weight: 900; font-style: italic; font-display: swap; src: local("HelveticaNeue-BlackItalic"), local("HelveticaNeueLTStd-BlkIt"), local("Helvetica Neue LT Std 96 Black Italic"), local("HelveticaNeueLTPro-BlkIt"); }
  *{box-sizing:border-box;margin:0}
  body{min-height:100vh;display:grid;place-items:center;background:#f4f4f1;color:#111;font:16px/1.5 "Painel Sans",Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;padding:24px}
  .card{width:100%;max-width:380px;background:#fff;border:1px solid #e6e6e1;border-radius:20px;padding:36px 32px}
  .marca{display:flex;align-items:center;gap:10px;font-size:13px;color:#6b6b66;margin-bottom:28px}
  .dot{width:10px;height:10px;border-radius:50%;background:#111;box-shadow:inset 0 0 0 3px #111,inset 0 0 0 5px #d0ff0d}
  h1{font-weight:700;font-size:32px;letter-spacing:-.03em;line-height:1}
  h1 em{font-weight:300;font-style:italic}
  p{color:#6b6b66;font-size:14px;margin:10px 0 26px}
  label{display:block;font-size:13px;font-weight:500;margin-bottom:8px}
  input{width:100%;height:48px;border:1px solid #d9d9d3;border-radius:12px;padding:0 14px;font:inherit;background:#fafaf8}
  input:focus{outline:2px solid #111;outline-offset:1px;background:#fff}
  button{margin-top:16px;width:100%;height:48px;border:0;border-radius:999px;background:#111;color:#fff;font-weight:700;font-size:15px;font-family:inherit;cursor:pointer}
  button:hover{background:#000}
  .erro{margin-top:14px;font-size:13px;color:#b3261e}
</style>
</head>
<body>
  <form class="card" method="post" action="/api/painel/login">
    <div class="marca"><span class="dot"></span>Junior Sturmer</div>
    <h1>Painel de <em>métricas.</em></h1>
    <p>Área privada. Digite a senha para entrar.</p>
    <input type="text" name="usuario" value="junior" autocomplete="username" hidden>
    <label for="senha">Senha</label>
    <input id="senha" name="senha" type="password" autocomplete="current-password" required autofocus>
    <button type="submit">Entrar</button>
    ${msg ? `<div class="erro" role="alert">${msg}</div>` : ''}
  </form>
</body>
</html>`;
}

// Tira o Google Tag Manager das páginas do painel para as suas visitas não entrarem no Analytics
function semRastreio(html) {
  return html
    .replace(/<!--\s*Google Tag Manager\s*-->[\s\S]*?<!--\s*End Google Tag Manager\s*-->/gi, '')
    .replace(/<!--\s*Google Tag Manager \(noscript\)\s*-->[\s\S]*?<!--\s*End Google Tag Manager \(noscript\)\s*-->/gi, '')
    .replace(/<script[^>]*googletagmanager\.com[^>]*><\/script>/gi, '');
}

export default async (req, context) => {
  const url = new URL(req.url);
  const temSenha = Boolean(env('DASH_PASSWORD'));

  if (!temSenha || !(await sessaoValida(req))) {
    const erro = temSenha ? url.searchParams.get('erro') : 'config';
    return new Response(telaDeSenha(erro), {
      status: 401,
      headers: { 'Content-Type': 'text/html; charset=utf-8', ...CABECALHOS_PRIVADOS },
    });
  }

  const res = await context.next();
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CABECALHOS_PRIVADOS)) headers.set(k, v);
  headers.delete('content-length');

  if ((res.headers.get('content-type') || '').includes('text/html')) {
    return new Response(semRastreio(await res.text()), { status: res.status, headers });
  }
  return new Response(res.body, { status: res.status, headers });
};

export const config = { path: ['/metricas', '/metricas/*'] };
