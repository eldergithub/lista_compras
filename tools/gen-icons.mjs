/**
 * Gera os ícones PNG a partir de public/icons/icon.svg (rodar quando o desenho mudar):
 *   node tools/gen-icons.mjs
 * O maskable tem o desenho menor e fundo inteiro, para o Android poder recortar em círculo.
 */
import { createRequire } from 'node:module';
// Playwright não é dependência do projeto: usa o que estiver instalado na máquina.
const { chromium } = createRequire(import.meta.url)('playwright');
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../public/icons/icon.svg', import.meta.url), 'utf8');
const navegador = await chromium.launch();
const pagina = await navegador.newPage();
async function gerar(arquivo, lado, maskable = false) {
  await pagina.setViewportSize({ width: lado, height: lado });
  const corpo = maskable
    ? `<div style="width:${lado}px;height:${lado}px;background:#2f7d4f;display:grid;place-items:center">${svg.replace('<svg ', `<svg style="width:${lado * 0.78}px;height:${lado * 0.78}px" `)}</div>`
    : svg.replace('<svg ', `<svg style="width:${lado}px;height:${lado}px;display:block" `);
  await pagina.setContent(`<body style="margin:0;background:transparent">${corpo}</body>`);
  await pagina.screenshot({ path: new URL(`../public/icons/${arquivo}`, import.meta.url).pathname, omitBackground: !maskable, clip: { x: 0, y: 0, width: lado, height: lado } });
}
await gerar('icon-192.png', 192);
await gerar('icon-512.png', 512);
await gerar('icon-180.png', 180, true);
await gerar('icon-maskable-512.png', 512, true);
await navegador.close();
console.log('Ícones gerados.');
