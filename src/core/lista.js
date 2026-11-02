/**
 * O modelo da lista: um array de itens, sem nada de tela.
 *
 * Item: { id, nome, cat, qtd, un, feito }
 *   qtd = null quando ninguém definiu a quantidade.
 */

import { CATEGORIAS } from './categorias.js';

export function novoId() {
  return Math.random().toString(36).slice(2, 9);
}

export function criarItem(nome, cat, qtd = null, un = 'un') {
  return { id: novoId(), nome, cat, qtd, un, feito: false };
}

/** 0.5 → "0,5"; 2 → "2". */
export function formatarNumero(n) {
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

export function formatarQtd(item) {
  return item.qtd == null ? '' : `${formatarNumero(item.qtd)} ${item.un}`;
}

/** Categorias com itens, na ordem fixa; as criadas pela pessoa vêm no fim. */
export function categoriasEmUso(itens) {
  const usadas = new Set(itens.map((i) => i.cat));
  const extras = [...usadas].filter((c) => !CATEGORIAS.includes(c));
  return [...CATEGORIAS.filter((c) => usadas.has(c)), ...extras];
}

/**
 * Junta duas listas. Um item que já existe (mesmo nome, ignorando
 * maiúsculas) não é duplicado: fica a quantidade que veio de fora, se ela
 * tiver uma.
 */
export function juntar(atuais, novos) {
  const resultado = atuais.map((i) => ({ ...i }));
  for (const novo of novos) {
    const igual = resultado.find((i) => i.nome.toLowerCase() === novo.nome.toLowerCase());
    if (igual) {
      if (novo.qtd != null) { igual.qtd = novo.qtd; igual.un = novo.un; }
    } else {
      resultado.push({ ...novo, id: novoId(), feito: false });
    }
  }
  return resultado;
}

export const LISTA_INICIAL = [
  criarItem('Frango em cubos', 'Açougue', null, 'kg'),
  criarItem('Carne', 'Açougue', null, 'kg'),
  criarItem('Pão', 'Padaria'),
  criarItem('Leite em caixa', 'Frios e laticínios', null, 'cx'),
  criarItem('Iogurte', 'Frios e laticínios'),
  criarItem('Queijo muçarela', 'Frios e laticínios', null, 'g'),
  criarItem('Gorgonzola', 'Frios e laticínios', null, 'g'),
  criarItem('Cenoura', 'Hortifrúti', null, 'kg'),
  criarItem('Brócolis', 'Hortifrúti'),
  criarItem('Banana', 'Hortifrúti', null, 'dz'),
  criarItem('Uva', 'Hortifrúti', null, 'kg'),
  criarItem('Laranja', 'Hortifrúti', null, 'kg'),
  criarItem('Maçã', 'Hortifrúti', null, 'kg'),
  criarItem('Melancia', 'Hortifrúti'),
];
