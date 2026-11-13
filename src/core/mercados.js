/**
 * Supermercados e corredores.
 *
 * Mercado: { id, nome, corredores: [Corredor], aprendidos: { [nomeDoItem]: corredorId } }
 * Corredor: { id, nome, cats: [categoria], termos: [palavra] }
 *   nome: o que está na placa ("Corredor 7", "Hortifrúti").
 *   cats: categorias do app que ficam ali (para itens que o mercado nunca viu).
 *   termos: produtos escritos na placa ("macarrão", "molho de tomate").
 * aprendidos: onde a pessoa disse que um item fica; vale mais que tudo.
 *
 * Uma lista ligada a um mercado (lista.mercadoId) aparece na ordem dos corredores.
 */

import { novoId } from './lista.js';
import { resolvido } from './compra.js';

export const SEM_CORREDOR = 'Onde fica? Sem corredor';

/** "Sabão em Pó" → "sabao em po": compara sem acento, caixa e espaços sobrando. */
export const normalizar = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Tira o plural simples, para "biscoitos" casar com "biscoito". */
const singular = (p) => (p.length > 4 && p.endsWith('s') ? p.slice(0, -1) : p);
const palavras = (s) => normalizar(s).split(' ').filter(Boolean).map(singular);

export function criarMercado(nome) {
  return { id: novoId(), nome: String(nome || 'Mercado').trim().slice(0, 60), corredores: [], aprendidos: {} };
}

/** Número do corredor, para a ordem de caminhada: "Corredor 12" vem depois de "Corredor 9". */
const numero = (nome) => { const m = String(nome).match(/\d+/); return m ? Number(m[0]) : Infinity; };
export const ordenarCorredores = (lista) => [...lista].sort((a, b) => numero(a.nome) - numero(b.nome));

/**
 * O que a IA devolveu sobre as placas: uma linha por corredor,
 *   Corredor 7 | Mercearia; Doces e lanches | macarrão, molho de tomate
 * As categorias só valem se forem do app (o resto é ignorado).
 */
export function lerCorredores(texto, categoriasValidas = []) {
  const validas = new Map(categoriasValidas.map((c) => [normalizar(c), c]));
  const corredores = [];
  for (const bruta of String(texto || '').split(/\r?\n/)) {
    const s = bruta.replace(/^[-•*\s]+/, '').trim();
    if (!s || !s.includes('|')) continue;
    const [nome, cats = '', termos = ''] = s.split('|').map((p) => p.trim());
    if (!nome || /^nenhum$/i.test(nome)) continue;
    corredores.push({
      id: novoId(),
      nome: nome.slice(0, 40),
      cats: [...new Set(cats.split(/[;,]/).map((c) => validas.get(normalizar(c))).filter(Boolean))],
      termos: [...new Set(termos.split(/[;,]/).map((t) => t.trim().toLowerCase()).filter((t) => t && t.length <= 40))].slice(0, 40),
    });
  }
  return corredores;
}

/** Junta corredores novos aos que o mercado já tem: mesmo nome soma categorias e produtos. */
export function juntarCorredores(atuais, novos) {
  const lista = atuais.map((c) => ({ ...c, cats: [...c.cats], termos: [...c.termos] }));
  for (const n of novos) {
    const igual = lista.find((c) => normalizar(c.nome) === normalizar(n.nome));
    if (igual) {
      igual.cats = [...new Set([...igual.cats, ...n.cats])];
      igual.termos = [...new Set([...igual.termos, ...n.termos])];
    } else lista.push({ ...n });
  }
  return ordenarCorredores(lista);
}

/**
 * Em que corredor fica o item, neste mercado. Na ordem:
 * 1. onde a pessoa disse que fica (aprendidos);
 * 2. o corredor cuja placa cita o produto (o termo mais longo ganha: "molho de tomate" > "molho");
 * 3. o corredor da categoria do item;
 * senão, null.
 */
export function corredorDoItem(mercado, item) {
  if (!mercado || !item) return null;
  const existe = (id) => mercado.corredores.find((c) => c.id === id) || null;
  const aprendido = mercado.aprendidos?.[normalizar(item.nome)];
  if (aprendido && existe(aprendido)) return existe(aprendido);
  const nome = ` ${palavras(item.nome).join(' ')} `;
  let melhor = null, tamanho = 0;
  for (const c of mercado.corredores) {
    for (const t of c.termos) {
      const p = palavras(t).join(' ');
      if (p && nome.includes(` ${p} `) && p.length > tamanho) { melhor = c; tamanho = p.length; }
    }
  }
  if (melhor) return melhor;
  return mercado.corredores.find((c) => c.cats.includes(item.cat)) || null;
}

/** A pessoa disse onde o item fica (ou null para esquecer). */
export function aprender(mercado, nomeDoItem, corredorId) {
  const aprendidos = { ...(mercado.aprendidos || {}) };
  if (corredorId) aprendidos[normalizar(nomeDoItem)] = corredorId;
  else delete aprendidos[normalizar(nomeDoItem)];
  return { ...mercado, aprendidos };
}

/** Tira um corredor e o que foi aprendido sobre ele. */
export function tirarCorredor(mercado, corredorId) {
  const aprendidos = Object.fromEntries(Object.entries(mercado.aprendidos || {}).filter(([, id]) => id !== corredorId));
  return { ...mercado, corredores: mercado.corredores.filter((c) => c.id !== corredorId), aprendidos };
}

/**
 * Grupos na ordem dos corredores, com o mesmo jeito da compra por categoria:
 * corredores com algo pendente primeiro (na ordem de caminhada), os já
 * resolvidos por inteiro no fim; o que não tem corredor fica por último.
 * Devolve [[nome, itens, corredorId|null], ...].
 */
export function ordenarPorCorredor(itens, mercado) {
  const grupos = new Map();
  for (const item of itens) {
    const c = corredorDoItem(mercado, item);
    const chave = c ? c.id : null;
    if (!grupos.has(chave)) grupos.set(chave, { nome: c ? c.nome : SEM_CORREDOR, itens: [], ordem: c ? mercado.corredores.indexOf(c) : Infinity });
    grupos.get(chave).itens.push(item);
  }
  const lista = [...grupos.entries()].sort((a, b) => a[1].ordem - b[1].ordem).map(([id, g]) => {
    const pendentes = [...g.itens.filter((i) => !resolvido(i) && i.novo), ...g.itens.filter((i) => !resolvido(i) && !i.novo)];
    const pegos = g.itens.filter((i) => i.feito);
    const faltaram = g.itens.filter((i) => !i.feito && i.faltou);
    return [g.nome, [...pendentes, ...pegos, ...faltaram], id, pendentes.length];
  });
  return [...lista.filter((g) => g[3] > 0), ...lista.filter((g) => g[3] === 0)].map(([n, l, id]) => [n, l, id]);
}
