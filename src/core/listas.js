/**
 * Várias listas no mesmo aparelho, cada uma com nome e tipo.
 *
 * Estado guardado: { v: 2, listas: [Lista], ativa: id }
 * Lista: { id, nome, tipo, itens, criada, atualizada, compraRegistrada? }
 *   tipo: mercado | farmacia | casa | festa | outros (ver categorias.js TIPOS)
 *   compraRegistrada: a compra atual já entrou nas compras anteriores
 *     (zera quando a pessoa começa uma compra nova ou desmarca um item).
 */

import { TIPOS } from './categorias.js';
import { novoId } from './lista.js';

export const tipoValido = (t) => (t in TIPOS ? t : 'outros');

export function criarLista(nome, tipo = 'mercado', itens = [], agora = Date.now()) {
  const t = tipoValido(tipo);
  return { id: novoId(), nome: String(nome || TIPOS[t].nome).trim().slice(0, 60), tipo: t, itens, criada: agora, atualizada: agora };
}

/**
 * Lê o que estiver guardado. Aceita o formato antigo (um array de itens,
 * de antes de existirem várias listas): vira a lista "Mercado".
 */
export function migrar(guardado, itensAntigos, padrao) {
  if (guardado && guardado.v === 2 && Array.isArray(guardado.listas) && guardado.listas.length) {
    const ativa = guardado.listas.some((l) => l.id === guardado.ativa) ? guardado.ativa : guardado.listas[0].id;
    return { v: 2, listas: guardado.listas.map((l) => ({ ...l, tipo: tipoValido(l.tipo), itens: Array.isArray(l.itens) ? l.itens : [] })), ativa };
  }
  const primeira = criarLista('Mercado', 'mercado', Array.isArray(itensAntigos) ? itensAntigos : padrao);
  return { v: 2, listas: [primeira], ativa: primeira.id };
}

export const listaAtiva = (estado) => estado.listas.find((l) => l.id === estado.ativa) || estado.listas[0];

/** Um nome que ainda não existe: "Farmácia", "Farmácia 2"… */
export function nomeLivre(estado, base) {
  const usados = new Set(estado.listas.map((l) => l.nome.toLowerCase()));
  if (!usados.has(base.toLowerCase())) return base;
  for (let n = 2; ; n++) if (!usados.has(`${base} ${n}`.toLowerCase())) return `${base} ${n}`;
}

/** Listas na ordem do seletor: a mais mexida por último em cima. */
export const listasPorUso = (estado) => [...estado.listas].sort((a, b) => b.atualizada - a.atualizada);
