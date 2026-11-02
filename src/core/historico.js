/**
 * O que a pessoa costuma comprar, guardado só no aparelho.
 *
 * Histórico: { [nome normalizado]: { nome, cat, un, qtd, vezes, ultima } }
 *   vezes  = quantas listas tiveram o item (conta uma vez por lista);
 *   ultima = data (ms) da última vez.
 *
 * Funções puras: quem chama decide quando guardar.
 */

import { nomeValido, normalizar } from './categorias.js';
import { sugerirDoCatalogo, CATALOGO } from './catalogo.js';

/** Registra itens que entraram na lista. `contar` = false só atualiza a quantidade. */
export function registrar(historico, itens, agora = Date.now(), contar = true) {
  const novo = { ...historico };
  for (const i of itens) {
    if (!nomeValido(i.nome)) continue;
    const chave = normalizar(i.nome);
    const antes = novo[chave];
    novo[chave] = {
      nome: i.nome,
      cat: i.cat,
      un: i.un,
      qtd: i.qtd ?? antes?.qtd ?? null,
      vezes: (antes?.vezes || 0) + (contar ? 1 : 0),
      ultima: contar ? agora : (antes?.ultima || agora),
    };
  }
  return novo;
}

/** O histórico daquele nome, para trazer unidade e quantidade de costume. */
export function doHistorico(historico, nome) {
  return historico[normalizar(nome)] || null;
}

/**
 * Sugestões enquanto digita: primeiro o que a pessoa já comprou (mais
 * vezes primeiro), depois o catálogo. Não repete nomes.
 */
export function sugerir(historico, texto, limite = 6) {
  const alvo = normalizar(texto).trim();
  if (alvo.length < 2) return [];
  const proprias = Object.values(historico)
    .filter((h) => nomeValido(h.nome))
    .filter((h) => normalizar(h.nome).split(/[ -]/).some((p) => p.startsWith(alvo)) || normalizar(h.nome).startsWith(alvo))
    .sort((a, b) => b.vezes - a.vezes || b.ultima - a.ultima);
  const vistos = new Set();
  const resultado = [];
  for (const s of [...proprias, ...sugerirDoCatalogo(texto, limite)]) {
    const chave = normalizar(s.nome);
    if (vistos.has(chave) || chave === alvo) continue;
    vistos.add(chave);
    resultado.push({ nome: s.nome, cat: s.cat, un: s.un, qtd: s.qtd ?? null, doHistorico: 'vezes' in s });
    if (resultado.length === limite) break;
  }
  return resultado;
}

/** Itens de sempre: comprados em 2 ou mais listas e que não estão na lista atual. */
export function deSempre(historico, itensAtuais, limite = 12, categorias = null) {
  const naLista = new Set(itensAtuais.map((i) => normalizar(i.nome)));
  return Object.entries(historico)
    .filter(([chave, h]) => h.vezes >= 2 && !naLista.has(chave) && nomeValido(h.nome))
    // Numa lista de farmácia não aparece frango: só as categorias daquele tipo de lista.
    .filter(([, h]) => !categorias || categorias.includes(h.cat))
    .map(([, h]) => h)
    .sort((a, b) => b.vezes - a.vezes || b.ultima - a.ultima)
    .slice(0, limite);
}

/**
 * Grade de uma categoria: primeiro o que a pessoa já comprou nela (mais
 * vezes primeiro), depois o catálogo na ordem de sempre. Sem repetir.
 */
export function gradeDaCategoria(historico, cat, limite = 24) {
  const proprias = Object.values(historico).filter((h) => h.cat === cat && nomeValido(h.nome)).sort((a, b) => b.vezes - a.vezes || b.ultima - a.ultima);
  const vistos = new Set();
  const resultado = [];
  for (const s of [...proprias, ...CATALOGO.filter((c) => c.cat === cat)]) {
    const chave = normalizar(s.nome);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    resultado.push({ nome: s.nome, cat, un: s.un, qtd: s.qtd ?? null, doHistorico: 'vezes' in s });
    if (resultado.length === limite) break;
  }
  return resultado;
}
