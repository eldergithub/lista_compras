/**
 * Gera os ícones PNG e a imagem de prévia do link a partir de public/icons/icon.svg
 * (rodar quando o desenho mudar):  node tools/gen-icons.mjs
 * O maskable tem o bilhete menor sobre o verde inteiro, para o Android recortar em círculo.
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
// Playwright não é dependência do projeto: usa o que estiver instalado na máquina.
const { chromium } = createRequire(import.meta.url)('playwright');

const svg = readFileSync(new URL('../public/icons/icon.svg', import.meta.url), 'utf8');
const semFundo = svg.replace(/<rect width="512" height="512" rx="116" fill="#2F7D4F"\/>/, '');
const saida = (nome) => new URL(`../public/${nome}`, import.meta.url).pathname;

const navegador = await chromium.launch();
const pagina = await navegador.newPage();
async function gerar(arquivo, lado, maskable = false) {
  await pagina.setViewportSize({ width: lado, height: lado });
  const corpo = maskable
    ? `<div style="width:${lado}px;height:${lado}px;background:#2F7D4F;display:grid;place-items:center">${semFundo.replace('<svg ', `<svg style="width:${lado * 0.8}px;height:${lado * 0.8}px" `)}</div>`
    : svg.replace('<svg ', `<svg style="width:${lado}px;height:${lado}px;display:block" `);
  await pagina.setContent(`<body style="margin:0;background:transparent">${corpo}</body>`);
  await pagina.screenshot({ path: saida(`icons/${arquivo}`), omitBackground: !maskable, clip: { x: 0, y: 0, width: lado, height: lado } });
}
await gerar('icon-192.png', 192);
await gerar('icon-512.png', 512);
await gerar('icon-180.png', 180, true);
await gerar('icon-maskable-512.png', 512, true);

// Prévia do link (WhatsApp, Telegram): 1200×630, com as fontes empacotadas do app.
const fonte = (pacote, arquivo) => new URL(`../node_modules/@fontsource/${pacote}/files/${arquivo}`, import.meta.url).href;
const html = `<!doctype html><html><head><style>
@font-face{font-family:B;font-weight:600;src:url(${fonte('bricolage-grotesque', 'bricolage-grotesque-latin-600-normal.woff2')})}
@font-face{font-family:B;font-weight:800;src:url(${fonte('bricolage-grotesque', 'bricolage-grotesque-latin-800-normal.woff2')})}
@font-face{font-family:A;font-weight:400;src:url(${fonte('atkinson-hyperlegible', 'atkinson-hyperlegible-latin-400-normal.woff2')})}
</style></head><body style="margin:0">
<div style="width:1200px;height:630px;background:#F3F5F1;display:flex;align-items:center;gap:72px;padding:0 96px;box-sizing:border-box;font-family:A,sans-serif;color:#1D2420">
  <div style="flex:none;width:300px;height:300px">${svg.replace('<svg ', '<svg style="width:300px;height:300px" ')}</div>
  <div style="display:flex;flex-direction:column;gap:20px">
    <div style="font-family:B;font-size:48px;letter-spacing:-0.02em"><span style="font-weight:600;color:#2F7D4F">Na</span><span style="font-weight:800">Lista</span></div>
    <div style="font-family:B;font-weight:800;font-size:82px;line-height:.95;letter-spacing:-0.02em">Chegou uma lista para você</div>
    <div style="font-size:30px;color:#56605A">Toque para abrir e ir marcando.</div>
  </div>
</div></body></html>`;
const temporario = new URL('../node_modules/.og-preview.html', import.meta.url);
writeFileSync(temporario, html);
await pagina.setViewportSize({ width: 1200, height: 630 });
await pagina.goto(temporario.href);
await pagina.evaluate(() => document.fonts.ready);
await pagina.screenshot({ path: saida('og.png') });
await navegador.close();
console.log('Ícones e prévia gerados.');
