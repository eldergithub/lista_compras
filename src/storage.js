/**
 * A lista fica guardada só neste aparelho (localStorage).
 * Qualquer falha (modo anônimo, armazenamento cheio) não derruba o app:
 * ele segue funcionando, só não lembra da lista depois de fechar.
 */

const CHAVE = 'lista-compras-v1';

export function carregar() {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE));
    return Array.isArray(dados) ? dados : null;
  } catch {
    return null;
  }
}

export function salvar(itens) {
  try { localStorage.setItem(CHAVE, JSON.stringify(itens)); } catch { /* segue sem guardar */ }
}
