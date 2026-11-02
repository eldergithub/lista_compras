/**
 * Listas prontas da pessoa: "salvar esta lista como pronta" e usar de novo
 * depois (o churrasco do fim do ano, a compra do mês do jeito da casa).
 * Ficam só no aparelho, ao lado das prontas que vêm com o app (modelos.js).
 */

import { criarItem } from './lista.js';

const novoId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const mesmoNome = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Uma lista pronta a partir dos itens de uma lista (sem marcas, preços ou "não tinha"). */
export function criarPronta(nome, tipo, itens, { comQuantidades = true } = {}, agora = Date.now()) {
  return {
    id: novoId(),
    nome: nome.trim() || 'Minha lista',
    tipo,
    itens: itens.map((i) => ({
      nome: i.nome, cat: i.cat, un: i.un,
      qtd: comQuantidades ? (i.qtd ?? null) : null,
      ...(i.obs ? { obs: i.obs } : {}),
    })),
    criada: agora,
    usada: null,
  };
}

/** Guarda; se já existe uma com o mesmo nome, ela é substituída (mantém id e data de criação). */
export function guardarPronta(prontas, pronta) {
  const antiga = prontas.find((p) => mesmoNome(p.nome, pronta.nome));
  if (!antiga) return { prontas: [...prontas, pronta], substituiu: false };
  return {
    prontas: prontas.map((p) => (p === antiga ? { ...pronta, id: antiga.id, criada: antiga.criada, usada: antiga.usada } : p)),
    substituiu: true,
  };
}

export const existePronta = (prontas, nome) => prontas.some((p) => mesmoNome(p.nome, nome));
export const apagarPronta = (prontas, id) => prontas.filter((p) => p.id !== id);

/** Renomeia; devolve null se o nome novo já é de outra lista pronta. */
export function renomearPronta(prontas, id, nome) {
  const limpo = nome.trim();
  if (!limpo) return null;
  if (prontas.some((p) => p.id !== id && mesmoNome(p.nome, limpo))) return null;
  return prontas.map((p) => (p.id === id ? { ...p, nome: limpo } : p));
}

export const marcarUso = (prontas, id, agora = Date.now()) => prontas.map((p) => (p.id === id ? { ...p, usada: agora } : p));

/** As do tipo da lista primeiro; dentro disso, as usadas mais recentemente. */
export const prontasPara = (prontas, tipo) => [...prontas].sort((a, b) =>
  (b.tipo === tipo) - (a.tipo === tipo) || (b.usada || b.criada) - (a.usada || a.criada));

/** Os itens prontos para entrar numa lista. */
export const itensDaPronta = (p) => p.itens.map((i) => {
  const item = criarItem(i.nome, i.cat, i.qtd ?? null, i.un);
  if (i.obs) item.obs = i.obs;
  return item;
});
