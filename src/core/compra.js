/**
 * A hora da compra: ordem da lista, preços e o resumo.
 *
 * Um item está "resolvido" quando foi pego (feito) ou quando não tinha
 * no mercado (faltou). O preço é o que deu aquele item no total
 * (o que aparece na balança ou na etiqueta), não o preço por quilo.
 */

import { categoriasEmUso } from './lista.js';

export const resolvido = (i) => !!(i.feito || i.faltou);

/**
 * Grupos na ordem da compra: categorias com algo pendente primeiro,
 * as já resolvidas por inteiro vão para o fim. Dentro de cada uma,
 * o que falta pegar vem em cima.
 * Devolve [[categoria, itens], ...].
 */
export function ordenarParaCompra(itens) {
  const grupos = categoriasEmUso(itens).map((cat) => {
    const doGrupo = itens.filter((i) => i.cat === cat);
    // Pendentes, com os que acabaram de chegar num complemento em cima.
    const pendentes = [...doGrupo.filter((i) => !resolvido(i) && i.novo), ...doGrupo.filter((i) => !resolvido(i) && !i.novo)];
    const pegos = doGrupo.filter((i) => i.feito);
    const faltaram = doGrupo.filter((i) => !i.feito && i.faltou);
    return [cat, [...pendentes, ...pegos, ...faltaram], pendentes.length];
  });
  return [...grupos.filter((g) => g[2] > 0), ...grupos.filter((g) => g[2] === 0)].map(([c, l]) => [c, l]);
}

export function resumoDaCompra(itens) {
  const comPreco = itens.filter((i) => i.feito && typeof i.preco === 'number');
  return {
    total: itens.length,
    pegos: itens.filter((i) => i.feito).length,
    faltaram: itens.filter((i) => !i.feito && i.faltou).length,
    resolvidos: itens.filter(resolvido).length,
    gasto: Math.round(comPreco.reduce((s, i) => s + i.preco, 0) * 100) / 100,
    comPreco: comPreco.length,
  };
}

/** "12,90", "R$ 12.90", "1.234,50" → número; vazio ou inválido → null. */
export function lerPreco(texto) {
  let s = String(texto ?? '').replace(/[R$\s]/gi, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatarPreco = (n) => MOEDA.format(n).replace(/ /g, ' ');

/** Começa uma compra nova: tira marcas, "não tinha" e preços. */
export function novaCompra(itens) {
  return itens.map(({ feito, faltou, preco, novo, ...resto }) => ({ ...resto, feito: false }));
}
