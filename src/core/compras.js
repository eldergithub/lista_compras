/**
 * Compras anteriores: um registro curto por compra concluída (ou por
 * retorno recebido), para ver o que foi comprado, o que faltou e quanto deu.
 *
 * Registro: { id, data, lista, tipo, pegos: [nome], faltaram: [nome],
 *             naoComprados: [nome], gasto, itens: [Item limpo], origem }
 */

import { novoId } from './lista.js';
import { novaCompra, resumoDaCompra } from './compra.js';

export const LIMITE_DE_COMPRAS = 60;

export function registroDaCompra(lista, itens, data = Date.now(), origem = 'compra') {
  const r = resumoDaCompra(itens);
  return {
    id: novoId(), data, lista: lista.nome, tipo: lista.tipo, origem,
    pegos: itens.filter((i) => i.feito).map((i) => i.nome),
    faltaram: itens.filter((i) => !i.feito && i.faltou).map((i) => i.nome),
    naoComprados: itens.filter((i) => !i.feito && !i.faltou).map((i) => i.nome),
    gasto: r.gasto,
    itens: novaCompra(itens),
  };
}

/** Põe na frente e corta as mais antigas. */
export const guardarCompra = (compras, registro) => [registro, ...compras].slice(0, LIMITE_DE_COMPRAS);

/** Total e quantidade de compras no mês da data dada. */
export function totalDoMes(compras, agora = Date.now()) {
  const d = new Date(agora);
  const doMes = compras.filter((c) => {
    const x = new Date(c.data);
    return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth();
  });
  return { compras: doMes.length, gasto: Math.round(doMes.reduce((s, c) => s + (c.gasto || 0), 0) * 100) / 100 };
}

/** Itens que faltaram numa compra, prontos para virar lista. */
export const itensQueFaltaram = (registro) => {
  const faltando = new Set([...registro.faltaram, ...registro.naoComprados]);
  return registro.itens.filter((i) => faltando.has(i.nome)).map((i) => ({ ...i, id: novoId(), feito: false }));
};
