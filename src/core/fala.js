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
