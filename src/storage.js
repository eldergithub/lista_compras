/**
 * Tudo fica guardado só neste aparelho (localStorage).
 * Qualquer falha (modo anônimo, armazenamento cheio) não derruba o app:
 * ele segue funcionando, só não lembra depois de fechar.
 */

function ler(chave, padrao) {
  try {
    const v = JSON.parse(localStorage.getItem(chave));
    return v ?? padrao;
  } catch {
    return padrao;
  }
}
function gravar(chave, valor) {
  try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* segue sem guardar */ }
}

const LISTA = 'lista-compras-v1';
const LISTAS = 'nalista-listas-v2';
const COMPRAS = 'nalista-compras-v1';
const HISTORICO = 'lista-compras-historico-v1';
const ULTIMA = 'lista-compras-ultima-v1';

export function carregar() {
  const v = ler(LISTA, null);
  return Array.isArray(v) ? v : null;
}
export const salvar = (itens) => gravar(LISTA, itens);

export const carregarHistorico = () => ler(HISTORICO, {});
export const salvarHistorico = (h) => gravar(HISTORICO, h);

/** A última compra: a lista como estava quando foi concluída ou apagada. */
export const carregarUltima = () => ler(ULTIMA, null);
export const salvarUltima = (itens) => gravar(ULTIMA, itens);

const ORCAMENTO = 'lista-compras-orcamento-v1';
export const carregarOrcamento = () => { const v = ler(ORCAMENTO, null); return typeof v === 'number' && v > 0 ? v : null; };
export const salvarOrcamento = (v) => gravar(ORCAMENTO, v);

/** Várias listas (fase 6). O formato antigo, de uma lista só, fica em LISTA até migrar. */
export const carregarListas = () => ler(LISTAS, null);
export const salvarListas = (estado) => gravar(LISTAS, estado);
export const carregarCompras = () => { const v = ler(COMPRAS, []); return Array.isArray(v) ? v : []; };
export const salvarCompras = (c) => gravar(COMPRAS, c);

/** Tudo o que vai no backup, e o caminho de volta. */
export function lerTudo() {
  return {
    listas: carregarListas(), historico: carregarHistorico(), ultima: carregarUltima(),
    compras: carregarCompras(), orcamento: carregarOrcamento(),
  };
}
export function gravarTudo(d) {
  salvarListas(d.listas);
  salvarHistorico(d.historico || {});
  salvarUltima(d.ultima || null);
  salvarCompras(Array.isArray(d.compras) ? d.compras : []);
  salvarOrcamento(typeof d.orcamento === 'number' ? d.orcamento : null);
}
