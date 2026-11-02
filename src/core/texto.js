/**
 * A lista como texto de WhatsApp, e o caminho de volta.
 *
 * O leitor aceita o texto que o próprio app gera e também listas soltas,
 * um item por linha: "2 kg frango", "Leite - 6 cx", "Tomate".
 */

import { adivinharCategoria, categoriaCanonica, normalizar } from './categorias.js';
import { categoriasEmUso, criarItem, formatarQtd } from './lista.js';

export function paraTexto(itens) {
  const linhas = ['🛒 *Lista de Compras*', ''];
  for (const cat of categoriasEmUso(itens)) {
    linhas.push(`*${cat}*`);
    for (const i of itens.filter((x) => x.cat === cat)) {
      const q = formatarQtd(i);
      linhas.push(`- ${i.nome}${q ? ' — ' + q : ''}`);
    }
    linhas.push('');
  }
  return linhas.join('\n').trim();
}

const UNIDADE = {
  un: 'un', unid: 'un', und: 'un', unidade: 'un', unidades: 'un', x: 'un',
  kg: 'kg', quilo: 'kg', quilos: 'kg', g: 'g', gr: 'g', gramas: 'g',
  l: 'L', lt: 'L', litro: 'L', litros: 'L',
  cx: 'cx', caixa: 'cx', caixas: 'cx',
  pct: 'pct', pacote: 'pct', pacotes: 'pct',
  dz: 'dz', duzia: 'dz', duzias: 'dz',
};
const PALAVRAS_UNIDADE = Object.keys(UNIDADE).join('|');
const NUM = '(\\d+(?:[.,]\\d+)?)';

const QTD_NO_FIM = new RegExp(`^(.*?)\\s*(?:[—–-]|:)\\s*${NUM}\\s*([a-zA-Zçúí]+)?\\.?$`);
const QTD_NO_INICIO = new RegExp(`^${NUM}\\s*(${PALAVRAS_UNIDADE})?\\.?\\s+(?:de\\s+)?(.+)$`, 'i');

function unidade(texto) {
  return UNIDADE[normalizar(texto || 'un')] || 'un';
}

function numero(texto) {
  return Number(texto.replace(',', '.'));
}

export function lerTexto(texto) {
  const itens = [];
  let cat = null;

  for (const bruta of String(texto).split(/\r?\n/)) {
    let s = bruta.trim();
    if (!s || s.startsWith('🛒') || /^\*?lista d[eo] (compras|mercado)/i.test(s)) continue;

    const cabecalho = s.match(/^\*([^*]+)\*$/) || s.match(/^([^\-•\d*][^:]*):$/);
    if (cabecalho) { cat = categoriaCanonica(cabecalho[1]); continue; }

    s = s.replace(/^[-•*·]\s*/, '').replace(/^\[.?\]\s*/, '').trim();
    if (!s) continue;

    let nome = s, qtd = null, un = 'un', m;
    if ((m = s.match(QTD_NO_FIM)) && m[1]) {
      nome = m[1]; qtd = numero(m[2]); un = unidade(m[3]);
    } else if ((m = s.match(QTD_NO_INICIO))) {
      qtd = numero(m[1]); un = unidade(m[2]); nome = m[3];
    }

    nome = nome.trim();
    if (!nome) continue;
    nome = nome.charAt(0).toUpperCase() + nome.slice(1);
    itens.push(criarItem(nome, cat || adivinharCategoria(nome), qtd, un));
  }
  return itens;
}
