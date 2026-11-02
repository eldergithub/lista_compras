/**
 * Complemento: itens que chegam para uma lista que já está na rua.
 *
 * Regras, pensando em quem está no mercado com a lista na mão:
 * - nada do que já foi pego se perde (marcas, preços, "não tinha" dos outros);
 * - item novo entra pendente com o selo "novo";
 * - item que já tinha sido pego volta a pendente, soma a quantidade
 *   e ganha a observação "pediram mais";
 * - item que estava "não tinha" volta a pendente (pediram de novo);
 * - item ainda pendente só atualiza a quantidade, se a nova for maior.
 *
 * Quando chega a lista inteira de novo (reabrir = false), o que já foi pego
 * ou não tinha fica como está: só entra o que é novo e o que aumentou.
 */

import { novoId } from './lista.js';

const mesmo = (a, b) => a.nome.toLowerCase() === b.nome.toLowerCase();

export function complementar(atuais, chegaram, { reabrir = true } = {}) {
  const itens = atuais.map((i) => ({ ...i }));
  const r = { novos: [], reabertos: [], atualizados: [] };
  for (const c of chegaram) {
    const ja = itens.find((i) => mesmo(i, c));
    if (!ja) {
      itens.push({ ...c, id: novoId(), feito: false, faltou: false, novo: true });
      r.novos.push(c.nome);
      continue;
    }
    if (ja.feito || ja.faltou) {
      if (!reabrir) continue;
      const somavel = ja.feito && ja.qtd != null && c.qtd != null && ja.un === c.un;
      if (somavel) ja.qtd += c.qtd; else if (c.qtd != null) { ja.qtd = c.qtd; ja.un = c.un; }
      if (ja.feito) ja.obs = ja.obs ? `${ja.obs} · pediram mais` : 'pediram mais';
      ja.feito = false; ja.faltou = false; ja.novo = true;
      r.reabertos.push(ja.nome);
      continue;
    }
    if (c.qtd != null && (ja.qtd == null || ja.un !== c.un || c.qtd > ja.qtd)) {
      ja.qtd = c.qtd; ja.un = c.un; ja.novo = true;
      r.atualizados.push(ja.nome);
    }
    if (c.obs && !ja.obs) ja.obs = c.obs;
  }
  return { itens, ...r };
}

/** O que entrou na lista desde o último envio (para "mandar só o que é novo"). */
// Nome e quantidade: um item cuja quantidade mudou também conta como novo.
const chave = (i) => `${i.nome.toLowerCase()}|${i.qtd ?? ''}|${i.qtd == null ? '' : i.un}`;

export function novosDesdeOEnvio(lista) {
  if (!Array.isArray(lista.enviados)) return [];
  const enviados = new Set(lista.enviados);
  return lista.itens.filter((i) => !enviados.has(chave(i)));
}

export const marcarComoEnviados = (lista) => { lista.enviados = lista.itens.map(chave); };

/** Texto do complemento para o WhatsApp. */
export function textoDoComplemento(itens, nomeDaLista, formatarQtd) {
  const linhas = [`➕ *Mais ${itens.length} ${itens.length === 1 ? 'item' : 'itens'} para ${nomeDaLista}* · NaLista`, ''];
  for (const i of itens) {
    const q = formatarQtd(i);
    linhas.push(`- ${i.nome}${q ? ' — ' + q : ''}${i.obs ? ` (${i.obs})` : ''}`);
  }
  return linhas.join('\n');
}

/** Lê o cabeçalho "➕ *Mais N itens para Mercado*": devolve o nome da lista, ou null. */
export function listaDoTextoDeComplemento(texto) {
  const m = String(texto).match(/➕\s*\*?\s*mais \d+ (?:item|itens) para (.+?)\*?(?:\s*·\s*NaLista)?\s*$/im);
  return m ? m[1].replace(/\*$/, '').trim() : null;
}
