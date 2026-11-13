/**
 * IA (teste): conversa com o "porteiro" (worker/nalista-ia.js na Cloudflare).
 * O app não guarda chave nenhuma: só o endereço do porteiro e o código da família.
 * Sem configuração ou sem internet, nada disso aparece e o app segue igual.
 */

const CHAVE = 'nalista-ia';

export function lerConfigIA() {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE));
    return v && v.url && v.codigo ? v : null;
  } catch { return null; }
}

export function salvarConfigIA(cfg) {
  try {
    if (cfg) localStorage.setItem(CHAVE, JSON.stringify(cfg));
    else localStorage.removeItem(CHAVE);
  } catch { /* ok */ }
}

/** Aceita "nalista-ia.fulano.workers.dev" ou o endereço completo. */
export function normalizarUrl(url) {
  const s = String(url || '').trim().replace(/\/+$/, '');
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

async function chamar(cfg, corpo, tempo = 90000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), tempo);
  try {
    const r = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Codigo': cfg.codigo },
      body: JSON.stringify(corpo),
      signal: ctl.signal,
    });
    const dados = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(dados.erro || `Erro ${r.status}`);
    return dados;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Demorou demais. Tente de novo.');
    if (e instanceof TypeError) throw new Error(navigator.onLine === false ? 'Sem internet agora.' : 'Não consegui falar com o porteiro. Confira o endereço.');
    throw e;
  } finally {
    clearTimeout(t);
  }
}

export const testarIA = (cfg) => chamar(cfg, { tarefa: 'ping' }, 20000);

/**
 * Reduz a foto antes de mandar: lado maior com até 1600 px (ainda dá para ler letra
 * de mão) em JPEG. Fica mais rápido, gasta menos dados e cabe no limite do porteiro.
 */
export async function prepararFoto(arquivo, lado = 1600) {
  const img = await createImageBitmap(arquivo);
  const escala = Math.min(1, lado / Math.max(img.width, img.height));
  const w = Math.round(img.width * escala);
  const h = Math.round(img.height * escala);
  const tela = document.createElement('canvas');
  tela.width = w; tela.height = h;
  tela.getContext('2d').drawImage(img, 0, 0, w, h);
  img.close?.();
  return tela.toDataURL('image/jpeg', 0.85);
}

/** Lê uma foto de lista: devolve o texto, um item por linha (ou '' se não achou lista). */
export async function lerListaDaFoto(cfg, arquivo) {
  const imagem = await prepararFoto(arquivo);
  const { texto } = await chamar(cfg, { tarefa: 'lista-foto', imagem });
  return /^\s*NENHUM\s*$/i.test(texto || '') ? '' : (texto || '');
}
