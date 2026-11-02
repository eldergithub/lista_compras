/**
 * Tudo o que transforma texto em itens, e itens em texto.
 *
 * O leitor entende:
 * - o texto que o próprio app gera para o WhatsApp;
 * - listas soltas, um item por linha ("2 kg frango", "Leite - 6 cx");
 * - vários itens numa linha só ("pão, 6 leite, banana e tomate");
 * - o que sai do microfone do teclado ("dois quilos de frango",
 *   "meia dúzia de ovos", "um quilo e meio de carne");
 * - observação entre parênteses ("Banana — 1 dz (maduras)").
 *
 * Quando a pessoa não diz a unidade, vale a do catálogo: "6 leite" vira
 * 6 cx, "2 carne" vira 2 kg.
 */

import { adivinharCategoria, categoriaCanonica, normalizar } from './categorias.js';
import { categoriasEmUso, criarItem, formatarQtd } from './lista.js';
import { procurarNoCatalogo } from './catalogo.js';
import { inicioDaObs, tamanhoDoModificador } from './observacoes.js';

// ---------------------------------------------------------------- saída

export function paraTexto(itens, nomeDaLista) {
  const linhas = [nomeDaLista ? `🛒 *${nomeDaLista}* · NaLista` : '🛒 *NaLista*', ''];
  for (const cat of categoriasEmUso(itens)) {
    linhas.push(`*${cat}*`);
    for (const i of itens.filter((x) => x.cat === cat)) {
      const q = formatarQtd(i);
      linhas.push(`- ${i.nome}${q ? ' — ' + q : ''}${i.obs ? ` (${i.obs})` : ''}`);
    }
    linhas.push('');
  }
  return linhas.join('\n').trim();
}

// ---------------------------------------------------------------- números e unidades

const NUMEROS = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7,
  oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14,
  quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20,
  trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80,
  noventa: 90, cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300,
  trezentas: 300, quatrocentos: 400, quatrocentas: 400, quinhentos: 500, quinhentas: 500,
  seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900, mil: 1000,
};
const MEIO = new Set(['meio', 'meia']);

const UNIDADE = {
  un: 'un', unid: 'un', und: 'un', unidade: 'un', unidades: 'un', x: 'un',
  kg: 'kg', kgs: 'kg', k: 'kg', quilo: 'kg', quilos: 'kg', kilo: 'kg', kilos: 'kg',
  g: 'g', gr: 'g', grs: 'g', grama: 'g', gramas: 'g',
  l: 'L', lt: 'L', lts: 'L', litro: 'L', litros: 'L',
  cx: 'cx', caixa: 'cx', caixas: 'cx', caixinha: 'cx', caixinhas: 'cx',
  pct: 'pct', pc: 'pct', pacote: 'pct', pacotes: 'pct', pacotinho: 'pct',
  dz: 'dz', duzia: 'dz', duzias: 'dz',
};
const ehNumero = (p) => /^\d+(?:[.,]\d+)?$/.test(p) || p in NUMEROS || MEIO.has(p);

/**
 * Lê um número escrito ou falado a partir da palavra `i`:
 * "2", "1,5", "dois", "trezentos e cinquenta", "meia".
 * Devolve [valor, próxima palavra] ou null.
 */
function lerNumero(palavras, i) {
  const p = palavras[i];
  if (p == null) return null;
  if (/^\d+(?:[.,]\d+)?$/.test(p)) return [Number(p.replace(',', '.')), i + 1];
  if (MEIO.has(p)) return [0.5, i + 1];
  if (!(p in NUMEROS)) return null;
  let total = NUMEROS[p], j = i + 1;
  // "trezentos e cinquenta", "vinte e dois": soma enquanto vier "e" + número.
  while (palavras[j] === 'e' && palavras[j + 1] in NUMEROS) { total += NUMEROS[palavras[j + 1]]; j += 2; }
  if (p === 'mil' && total === 1000 && palavras[j] in NUMEROS) { total += NUMEROS[palavras[j]]; j++; }
  return [total, j];
}

// ---------------------------------------------------------------- um item

/**
 * Lê um pedaço que descreve um item só. Devolve { nome, qtd, un, obs }
 * (un = null quando não foi dita) ou null se não sobrou nome.
 */
export function lerPedaco(texto) {
  let s = String(texto).trim().replace(/^[-•*·]\s*/, '').replace(/^\[.?\]\s*/, '').trim();
  let obs = '';
  const parenteses = s.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (parenteses) { s = parenteses[1]; obs = parenteses[2].trim(); }
  if (!s) return null;

  // Formatos escritos com o número no fim: "Leite - 6 cx", "Banana: 1 dz", "frango 2kg".
  let m = s.match(/^(.+?)\s*(?:[—–-]|:)\s*(\d+(?:[.,]\d+)?)\s*([a-zA-Zçú]+)?\.?$/) ||
    s.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*([a-zA-Zçú]+)\.?$/);
  if (m && (!m[3] || normalizar(m[3]) in UNIDADE)) {
    return montar(m[1], Number(m[2].replace(',', '.')), m[3] ? UNIDADE[normalizar(m[3])] : null, obs);
  }

  // Número no começo, em algarismos ou por extenso: "2 kg de frango",
  // "dois quilos de frango", "um quilo e meio de carne", "meia dúzia de ovos", "3x iogurte".
  const original = s.replace(/(\d)([a-zA-Z])/g, '$1 $2').split(/\s+/);
  const palavras = original.map(normalizar);
  const num = lerNumero(palavras, 0);
  if (num) {
    let [qtd, j] = num;
    let un = null;
    if (palavras[j] in UNIDADE) { un = UNIDADE[palavras[j]]; j++; }
    if (palavras[j] === 'e' && MEIO.has(palavras[j + 1])) { qtd += 0.5; j += 2; }
    if (['de', 'do', 'da', 'dos', 'das'].includes(palavras[j])) j++;
    const nome = original.slice(j).join(' ');
    // "meia dúzia de ovos" fica mais claro como 6 unidades.
    if (un === 'dz' && qtd === 0.5) { qtd = 6; un = 'un'; }
    if (nome) return montar(nome, qtd, un, obs);
  }

  return montar(s, null, null, obs);
}

/** Completa o item com o catálogo: nome bem escrito, categoria e unidade de costume. */
function montar(nomeBruto, qtd, un, obs) {
  let nome = nomeBruto.trim().replace(/\s+/g, ' ');
  if (!nome) return null;
  let doCatalogo = procurarNoCatalogo(nome);
  // "leite zero lactose", "banana bem madura", "café da marca Santa Clara":
  // o fim que não é produto vira observação. "Arroz integral" é produto.
  if (!doCatalogo) {
    const palavras = nome.split(' ');
    const corte = inicioDaObs(palavras.map(normalizar), 1);
    if (corte < palavras.length) {
      const extra = palavras.slice(corte).join(' ').replace(/^(e|d[aeo])\s+/i, '').replace(/^\S+/, (p) => p.toLowerCase());
      nome = palavras.slice(0, corte).join(' ');
      obs = [extra, obs].filter(Boolean).join(', ');
      doCatalogo = procurarNoCatalogo(nome);
    }
  }
  if (doCatalogo) nome = doCatalogo.nome;
  else nome = nome.charAt(0).toUpperCase() + nome.slice(1);
  return {
    nome,
    digitado: nomeBruto.trim(),
    cat: doCatalogo ? doCatalogo.cat : adivinharCategoria(nome),
    qtd: qtd != null && qtd > 0 ? qtd : null,
    un: un || (doCatalogo ? doCatalogo.un : 'un'),
    unDita: !!un,
    obs,
  };
}

// ---------------------------------------------------------------- vários itens

/**
 * Separa uma linha em itens: por vírgula, ponto e vírgula e pelo "e" que
 * liga dois itens ("arroz e feijão"). O "e" que faz parte de um número
 * ("trezentos e cinquenta", "um quilo e meio") não separa.
 */
export function separarItens(linha) {
  const pedacos = [];
  // A vírgula do decimal ("1,5 kg") não separa: só a que vem antes de não-dígito.
  for (const parte of String(linha).split(/;|,(?!\d)/)) {
    const palavras = parte.trim().split(/\s+/).filter(Boolean);
    let atual = [];
    palavras.forEach((p, i) => {
      const seguinte = normalizar(palavras[i + 1] || '');
      const anterior = normalizar(palavras[i - 1] || '');
      // "um quilo e meio", "trezentos e cinquenta": o "e" está no meio de uma quantidade.
      const dentroDeQuantidade = ehNumero(seguinte) && (ehNumero(anterior) || anterior in UNIDADE);
      // "carne sem osso e magra": o "e" liga duas observações do mesmo item.
      const resto = palavras.slice(i + 1).map(normalizar);
      const ligaObservacao = tamanhoDoModificador(resto, 0) > 0 && !procurarNoCatalogo(palavras[i + 1]);
      if (normalizar(p) === 'e' && atual.length && seguinte && !dentroDeQuantidade && !ligaObservacao) {
        pedacos.push(atual.join(' ')); atual = [];
      } else {
        atual.push(p);
      }
    });
    if (atual.length) pedacos.push(atual.join(' '));
  }
  return pedacos.filter((p) => p.trim());
}

/**
 * Itens ditos um atrás do outro, sem vírgula nem pausa: "frango pão seis leites".
 * Só separa quando todas as palavras se encaixam (quantidade + produto do
 * catálogo + observação); se sobrar uma palavra desconhecida, devolve null
 * e o pedaço fica como um item só.
 */
export function segmentar(pedaco) {
  const original = String(pedaco).trim().replace(/(\d)([a-zA-Z])/g, '$1 $2').split(/\s+/).filter(Boolean);
  const palavras = original.map(normalizar);
  const partes = [];
  let i = 0;
  while (i < palavras.length) {
    const inicio = i;
    const num = lerNumero(palavras, i);
    if (num) {
      i = num[1];
      if (palavras[i] in UNIDADE) i++;
      if (palavras[i] === 'e' && MEIO.has(palavras[i + 1])) i += 2;
      if (['de', 'do', 'da', 'dos', 'das'].includes(palavras[i])) i++;
    }
    // O produto mais comprido que o catálogo conhece ("pão de queijo" antes de "pão").
    let fim = 0;
    for (let j = Math.min(palavras.length, i + 4); j > i; j--) {
      if (procurarNoCatalogo(original.slice(i, j).join(' '))) { fim = j; break; }
    }
    if (!fim) return null;
    i = fim;
    let n;
    while (i < palavras.length && (n = tamanhoDoModificador(palavras, i))) i += n;
    partes.push(original.slice(inicio, i).join(' '));
  }
  return partes.length > 1 ? partes : null;
}

/** O que a pessoa digitou ou falou na caixa de adicionar. */
export function lerEntrada(texto) {
  // Quem fala pelo microfone às vezes diz "vírgula" ou "próximo" entre os itens.
  const falado = String(texto)
    .replace(/\s+v[ií]rgula\b\s*/gi, ', ')
    .replace(/\s*\bpr[oó]ximo( item)?\b\s*/gi, ', ');
  return falado.split(/\r?\n/).flatMap(separarItens)
    .flatMap((p) => segmentar(p) || [p])
    .map(lerPedaco).filter(Boolean);
}

/** Um texto inteiro colado: aceita cabeçalhos de categoria ("*Açougue*", "Feira:"). */
export function lerTexto(texto) {
  const itens = [];
  let cat = null;
  for (const bruta of String(texto).split(/\r?\n/)) {
    const s = bruta.trim();
    // Cabeçalhos do texto do app e do retorno (🛒, 🧾, ✅, ❌, ⏳, 💰) não são itens.
    if (!s || /^(🛒|🧾|✅|❌|⏳|💰|➕)/u.test(s) || /^\*?(nalista|lista d[eo] (compras|mercado))\*?$/i.test(s)) continue;
    const cabecalho = s.match(/^\*([^*]+)\*$/) || s.match(/^([^\-•\d*][^:]*):$/);
    if (cabecalho) { cat = categoriaCanonica(cabecalho[1]); continue; }
    // Linha do app ("- Nome — 2 kg (obs)") é um item só; o resto pode ter vários.
    const pedacos = /^[-•*·]\s/.test(s) ? [s] : separarItens(s);
    for (const pedaco of pedacos) {
      const lido = lerPedaco(pedaco);
      if (!lido) continue;
      const item = criarItem(lido.nome, cat || lido.cat, lido.qtd, lido.un);
      if (lido.obs) item.obs = lido.obs;
      itens.push(item);
    }
  }
  return itens;
}
