/**
 * Microfone: o Chrome do Android às vezes entrega a mesma frase duas vezes,
 * ou entrega a frase acumulada ("frango", depois "frango pão"). Aqui sai só
 * o trecho que ainda não tinha sido ouvido.
 */

import { normalizar } from './categorias.js';

const limpo = (t) => normalizar(t).replace(/[.,!?;]/g, ' ').replace(/\s+/g, ' ').trim();

/** O que há de novo em `atual` em relação à última frase final (`anterior`). */
export function trechoNovo(anterior, atual) {
  const a = limpo(anterior || '');
  const b = limpo(atual || '');
  if (!b) return '';
  if (!a) return String(atual).trim();
  if (b === a || a.endsWith(b)) return '';
  if (b.startsWith(a + ' ')) {
    // Corta pelo número de palavras: o original mantém acentos e maiúsculas.
    const n = a.split(' ').length;
    return String(atual).trim().split(/\s+/).slice(n).join(' ');
  }
  return String(atual).trim();
}

/**
 * Junta os itens ouvidos sem repetir: o mesmo item dito de novo logo em
 * seguida (eco do reconhecimento) não entra duas vezes.
 */
export function juntarOuvidos(ouvidos, novos) {
  const lista = [...ouvidos];
  for (const n of novos) {
    const ultimo = lista[lista.length - 1];
    if (ultimo && ultimo.nome.toLowerCase() === n.nome.toLowerCase() && ultimo.qtd === n.qtd && (ultimo.obs || '') === (n.obs || '')) continue;
    lista.push(n);
  }
  return lista;
}

/**
 * O texto de uma sessão do microfone, a partir de todos os resultados que o
 * navegador entregou até agora (finais e parciais). Há Androids que mandam
 * palavra por palavra ("uma", "dipirona"), outros que mandam a frase
 * acumulada ("frango", "frango pão") ou repetem o mesmo pedaço: aqui sai o
 * texto corrido, sem repetição.
 */
export function textoDaSessao(pedacos) {
  const partes = [];
  for (const bruto of pedacos) {
    const t = String(bruto || '').trim();
    if (!t) continue;
    const ultimo = partes[partes.length - 1];
    if (ultimo != null) {
      const a = limpo(ultimo), b = limpo(t);
      if (b === a || a.endsWith(' ' + b)) continue;
      if (b.startsWith(a + ' ')) { partes[partes.length - 1] = t; continue; }
    }
    partes.push(t);
  }
  return partes.join(' ');
}

// Palavras que a gente fala entre um item e outro e que não são item.
const SEPARA = new Set(['tambem', 'ai', 'depois', 'agora', 'entao', 'ne', 'ok', 'okay', 'beleza', 'coloca', 'colocar', 'coloque',
  'bota', 'botar', 'bote', 'poe', 'adiciona', 'adicionar', 'anota', 'anotar', 'compra', 'comprar', 'traz', 'trazer', 'pega', 'pegar',
  'quero', 'preciso', 'precisa', 'faltou', 'falta', 'acabou', 'item']);
const NUMERO_FALADO = /^(\d+|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|doze|meia|meio)$/;

/**
 * Tira da fala as palavras de ligação e põe vírgula no lugar:
 * "uma dipirona e também um paracetamol, coloca pão" → "uma dipirona , um paracetamol , pão".
 * "mais" só separa antes de número ("mais dois leites"); "a mais barata" fica.
 */
export function limparFala(texto) {
  const palavras = String(texto || '').split(/\s+/).filter(Boolean);
  const saida = [];
  palavras.forEach((p, i) => {
    const n = normalizar(p).replace(/[.,!?;]/g, '');
    const seguinte = normalizar(palavras[i + 1] || '').replace(/[.,!?;]/g, '');
    if (SEPARA.has(n) || (n === 'de' && normalizar(palavras[i - 1] || '') === 'preciso') || (n === 'mais' && NUMERO_FALADO.test(seguinte))) {
      if (saida.length && saida[saida.length - 1] !== ',') saida.push(',');
      return;
    }
    saida.push(p);
  });
  // "e ," que sobrou de "e também".
  return saida.join(' ').replace(/(^|\s)e\s*,/gi, ' ,').replace(/^\s*,\s*/, '').replace(/\s*,\s*$/, '').replace(/\s+,/g, ',');
}

// Palavras que, no fim da fala, mostram que a pessoa ainda não disse o produto.
const INCOMPLETO = new Set(['um', 'uma', 'dois', 'duas', 'tres', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze',
  'quinze', 'vinte', 'trinta', 'cem', 'cento', 'duzentos', 'duzentas', 'trezentos', 'trezentas', 'quinhentos', 'quinhentas', 'mil', 'meia', 'meio',
  'quilo', 'quilos', 'kilo', 'kilos', 'kg', 'grama', 'gramas', 'g', 'litro', 'litros', 'caixa', 'caixas', 'caixinha', 'pacote', 'pacotes',
  'duzia', 'duzias', 'unidade', 'unidades', 'lata', 'latas', 'garrafa', 'garrafas', 'saco', 'sacos', 'de', 'do', 'da', 'dos', 'das', 'e', 'mais', 'com', 'sem']);

/**
 * Separa o fim da fala que ainda está pela metade ("…e dois quilos de")
 * do que já dá para virar item. Enquanto a pessoa pensa, o pedaço pela
 * metade fica esperando em vez de virar um item estranho.
 */
export function separarPendente(texto) {
  const palavras = String(texto || '').trim().split(/\s+/).filter(Boolean);
  let fim = palavras.length;
  while (fim > 0) {
    const p = normalizar(palavras[fim - 1]).replace(/[.,!?;]/g, '');
    if (!(INCOMPLETO.has(p) || /^\d+([.,]\d+)?$/.test(p))) break;
    fim--;
  }
  return { completo: palavras.slice(0, fim).join(' '), pendente: palavras.slice(fim).join(' ') };
}
