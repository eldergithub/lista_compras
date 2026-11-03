/**
 * Várias listas no mesmo aparelho, cada uma com nome e tipo.
 *
 * Estado guardado: { v: 2, listas: [Lista], ativa: id }
 * Lista: { id, uid, uids, nome, tipo, itens, criada, atualizada, compraRegistrada?, enviados? }
 *   uid: identidade que vai no link; uids: todas as identidades que esta lista aceita
 *     (a dela e a das cópias de onde ela veio), para o complemento achar a lista certa.
 *   enviados: nomes que já foram mandados, para "mandar só o que é novo".
 *   tipo: mercado | farmacia | casa | festa | outros (ver categorias.js TIPOS)
 *   compraRegistrada: a compra atual já entrou nas compras anteriores
 *     (zera quando a pessoa começa uma compra nova ou desmarca um item).
 */

import { TIPOS } from './categorias.js';
import { novoId, semDuzia } from './lista.js';

export const tipoValido = (t) => (t in TIPOS ? t : 'outros');

export function criarLista(nome, tipo = 'mercado', itens = [], agora = Date.now()) {
  const t = tipoValido(tipo);
  const id = novoId();
  return { id, uid: id, uids: [id], nome: String(nome || TIPOS[t].nome).trim().slice(0, 60), tipo: t, itens, criada: agora, atualizada: agora };
}

/**
 * Lê o que estiver guardado. Aceita o formato antigo (um array de itens,
 * de antes de existirem várias listas): vira a lista "Mercado".
 */
export function migrar(guardado, itensAntigos, padrao) {
  if (guardado && guardado.v === 2 && Array.isArray(guardado.listas) && guardado.listas.length) {
    const ativa = guardado.listas.some((l) => l.id === guardado.ativa) ? guardado.ativa : guardado.listas[0].id;
    return { v: 2, listas: guardado.listas.map((l) => ({ ...l, uid: l.uid || l.id, uids: Array.isArray(l.uids) ? l.uids : [l.uid || l.id], tipo: tipoValido(l.tipo), itens: Array.isArray(l.itens) ? l.itens.map(semDuzia) : [], ...(Array.isArray(l.ultima) ? { ultima: l.ultima.map(semDuzia) } : {}) })), ativa };
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

/**
 * Para onde vai um complemento: a lista ligada pela identidade, senão a de
 * mesmo nome. Devolve null quando nenhuma serve (a pessoa escolhe).
 */
export function listaDoComplemento(estado, meta) {
  if (!meta) return null;
  if (meta.uid) {
    const ligada = estado.listas.find((l) => (l.uids || [l.uid || l.id]).includes(meta.uid));
    if (ligada) return ligada;
  }
  if (!meta.nome) return null;
  // "Mercado" também serve para "Mercado 2" (a cópia recebida ganha número quando o nome já existe).
  const alvo = meta.nome.toLowerCase();
  const candidatas = listasPorUso(estado).filter((l) => {
    const n = l.nome.toLowerCase();
    return n === alvo || (n.startsWith(alvo + ' ') && /^\d+$/.test(n.slice(alvo.length + 1)));
  });
  return candidatas.find((l) => l.itens.some((i) => i.feito || i.faltou)) || candidatas[0] || null;
}

/** Liga esta lista a uma identidade que chegou de fora. */
export function ligar(lista, uid) {
  if (!uid) return;
  lista.uids = [...new Set([...(lista.uids || [lista.uid || lista.id]), uid])];
}

/** A lista em compra (tem item pego ou "não tinha"), para sugerir como destino. */
export const listaEmCompra = (estado) => listasPorUso(estado).find((l) => l.itens.some((i) => i.feito || i.faltou)) || null;
