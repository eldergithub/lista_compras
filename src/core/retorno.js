/**
 * Retorno da compra: quem foi ao mercado devolve para quem montou a lista
 * o que pegou, o que não tinha, o que ficou sem comprar e o total.
 *
 * Vai no link como `#r=<código>`, no mesmo esquema da lista:
 *   [1, data (ms), [[nome, cat, qtd, un, situação, preço], ...]]
 *   situação: "p" pego, "f" não tinha, "n" não comprou;
 *   cat é o número da categoria conhecida ou o texto; preço 0 = sem preço.
 */

import { CATEGORIAS } from './categorias.js';
import { criarItem, formatarQtd } from './lista.js';
import { formatarPreco } from './compra.js';
import { codificarDados, decodificarDados } from './link.js';

const VERSAO = 1;
const situacao = (i) => (i.feito ? 'p' : i.faltou ? 'f' : 'n');

export function codificarRetorno(itens, data = Date.now()) {
  return codificarDados([VERSAO, data, itens.map((i) => {
    const c = CATEGORIAS.indexOf(i.cat);
    return [i.nome, c >= 0 ? c : i.cat, i.qtd ?? 0, i.un, situacao(i), typeof i.preco === 'number' ? i.preco : 0];
  })]);
}

/** Devolve { data, pegos, faltaram, naoComprados, gasto } com itens comuns. */
export async function decodificarRetorno(codigo) {
  const dados = await decodificarDados(codigo);
  if (!Array.isArray(dados) || dados[0] !== VERSAO || !Array.isArray(dados[2])) throw new Error('Retorno inválido');
  const r = { data: Number(dados[1]) || null, pegos: [], faltaram: [], naoComprados: [], gasto: 0 };
  for (const l of dados[2]) {
    if (!Array.isArray(l) || typeof l[0] !== 'string' || !l[0].trim()) continue;
    const [nome, c, qtd, un, sit, preco] = l;
    const item = criarItem(
      nome.trim().slice(0, 120),
      typeof c === 'number' ? (CATEGORIAS[c] || 'Outros') : String(c || 'Outros').slice(0, 40),
      typeof qtd === 'number' && qtd > 0 ? qtd : null,
      typeof un === 'string' ? un.slice(0, 6) : 'un',
    );
    if (sit === 'p') {
      if (typeof preco === 'number' && preco > 0) { item.preco = preco; r.gasto += preco; }
      r.pegos.push(item);
    } else if (sit === 'f') {
      r.faltaram.push(item);
    } else {
      r.naoComprados.push(item);
    }
  }
  r.gasto = Math.round(r.gasto * 100) / 100;
  return r;
}

/** O que ainda precisa ser comprado: o que não tinha e o que ficou sem comprar. */
export const oQueFaltou = (r) => [...r.faltaram, ...r.naoComprados].map((i) => ({ ...i, feito: false }));

const linha = (i, comPreco) => {
  const q = formatarQtd(i);
  return `- ${i.nome}${q ? ' — ' + q : ''}${comPreco && typeof i.preco === 'number' ? ` (${formatarPreco(i.preco)})` : ''}`;
};

/** O mesmo retorno como texto, para quem prefere mandar mensagem. */
export function textoDoRetorno(itens) {
  const pegos = itens.filter((i) => i.feito);
  const faltaram = itens.filter((i) => !i.feito && i.faltou);
  const nao = itens.filter((i) => !i.feito && !i.faltou);
  const gasto = pegos.reduce((s, i) => s + (typeof i.preco === 'number' ? i.preco : 0), 0);
  const partes = ['🧾 *Retorno da compra*', ''];
  if (pegos.length) partes.push(`✅ *Comprei (${pegos.length})*`, ...pegos.map((i) => linha(i, true)), '');
  if (faltaram.length) partes.push(`❌ *Não tinha (${faltaram.length})*`, ...faltaram.map((i) => linha(i)), '');
  if (nao.length) partes.push(`⏳ *Não comprei (${nao.length})*`, ...nao.map((i) => linha(i)), '');
  if (gasto > 0) partes.push(`💰 *Total: ${formatarPreco(Math.round(gasto * 100) / 100)}*`);
  return partes.join('\n').trim();
}
