/**
 * Observações dos itens: as sugestões que aparecem como toque nos detalhes
 * e as que o leitor reconhece no fim do nome ("leite zero lactose").
 */

import { normalizar } from './categorias.js';

/** Sugestões por categoria, na ordem em que aparecem. */
export const OBS_POR_CATEGORIA = {
  'Hortifrúti': ['maduras', 'verdes', 'para hoje', 'pequenas', 'grandes', 'orgânico'],
  'Açougue': ['sem osso', 'sem pele', 'moída', 'em bife', 'em cubos', 'magra', 'congelado'],
  'Padaria': ['quentinho', 'fatiado', 'integral', 'sem glúten'],
  'Frios e laticínios': ['zero lactose', 'integral', 'desnatado', 'fatiado', 'ralado', 'light'],
  'Mercearia': ['integral', 'sem glúten', 'zero açúcar', 'tipo 1', 'pacote grande'],
  'Bebidas': ['gelada', 'zero', 'lata', 'garrafa 2 L', 'sem gás', 'com gás'],
  'Limpeza': ['refil', 'sem perfume', 'pacote grande', 'neutro'],
  'Higiene': ['sem perfume', 'pacote grande', 'para criança', 'refil'],
  'Farmácia': ['genérico', 'infantil', 'em gotas', 'comprimido', 'pedir receita'],
  'Material e ferramentas': ['ver a medida', 'qualquer marca'],
  'Festa': ['colorido', 'descartável', 'tema da festa'],
  'Utilidades': ['qualquer marca', 'ver a medida'],
  'Outros': [],
};
const GERAIS = ['qualquer marca', 'a mais barata', 'se tiver promoção'];

export function sugestoesDeObs(cat) {
  const daCat = OBS_POR_CATEGORIA[cat] || [];
  return [...daCat, ...GERAIS.filter((g) => !daCat.includes(g))].slice(0, 8);
}

/** Liga ou desliga uma sugestão no texto da observação ("maduras, para hoje"). */
export function alternarObs(texto, sugestao) {
  const partes = String(texto || '').split(',').map((p) => p.trim()).filter(Boolean);
  const alvo = normalizar(sugestao);
  const sem = partes.filter((p) => normalizar(p) !== alvo);
  return (sem.length === partes.length ? [...partes, sugestao] : sem).join(', ');
}

export const temObs = (texto, sugestao) =>
  String(texto || '').split(',').some((p) => normalizar(p.trim()) === normalizar(sugestao));

/**
 * Palavras que, no fim do nome, são observação e não parte do produto.
 * Só valem quando o nome inteiro não é um item do catálogo
 * ("Arroz integral" continua sendo o produto).
 */
const MODIFICADORES = [
  'zero lactose', 'sem lactose', 'sem gluten', 'zero acucar', 'sem acucar', 'zero', 'diet', 'light',
  'integral', 'desnatado', 'desnatada', 'semidesnatado', 'semidesnatada', 'organico', 'organica', 'organicos', 'organicas',
  'madura', 'maduras', 'maduro', 'maduros', 'bem madura', 'bem maduras', 'verde', 'verdes',
  'grande', 'grandes', 'pequena', 'pequenas', 'pequeno', 'pequenos', 'media', 'medias', 'medio', 'medios',
  'congelado', 'congelada', 'congelados', 'congeladas', 'fresco', 'fresca', 'frescos', 'frescas',
  'fatiado', 'fatiada', 'ralado', 'ralada', 'moido', 'moida', 'em cubos', 'em bife', 'em tiras', 'em po',
  'sem osso', 'com osso', 'sem pele', 'com pele', 'sem semente', 'sem sal', 'com sal', 'magra', 'magro',
  'gelada', 'gelado', 'geladas', 'gelados', 'sem gas', 'com gas', 'lata', 'em lata', 'garrafa',
  'refil', 'sem perfume', 'neutro', 'neutra', 'infantil', 'generico', 'quentinho', 'quentinhos',
  'para hoje', 'pra hoje', 'qualquer marca', 'a mais barata', 'mais barata', 'mais barato', 'pacote grande',
].sort((a, b) => b.split(' ').length - a.split(' ').length);

/**
 * Quantas palavras do fim de `palavras` (já normalizadas) formam uma
 * observação: modificadores em sequência e "marca X" / "da marca X".
 * Devolve o índice onde a observação começa (palavras.length = nenhuma).
 */
export function inicioDaObs(palavras, desde = 1) {
  let fim = palavras.length;
  let inicio = fim;
  // "da marca Nestlé", "marca Italac": a marca vai até o fim.
  for (let i = Math.max(desde, 0); i < fim; i++) {
    if (palavras[i] === 'marca' && i + 1 < fim) {
      inicio = ['da', 'de', 'do'].includes(palavras[i - 1]) && i - 1 >= desde ? i - 1 : i;
      fim = inicio;
      break;
    }
  }
  // Modificadores colados no fim (pode haver mais de um: "maduras para hoje").
  let achou = true;
  while (achou) {
    achou = false;
    for (const m of MODIFICADORES) {
      const n = m.split(' ').length;
      if (fim - n < desde) continue;
      if (palavras.slice(fim - n, fim).join(' ') === m) {
        fim -= n; inicio = fim; achou = true;
        // "e" ou "bem" ligando dois modificadores ("sem osso e magra").
        if (palavras[fim - 1] === 'e' && fim - 1 > desde) { fim -= 1; inicio = fim; }
        break;
      }
    }
  }
  return inicio;
}

/** Quantas palavras, a partir de `i`, formam um modificador (0 se nenhum). */
export function tamanhoDoModificador(palavras, i) {
  for (const m of MODIFICADORES) {
    const n = m.split(' ').length;
    if (palavras.slice(i, i + n).join(' ') === m) return n;
  }
  if (palavras[i] === 'marca' && palavras[i + 1]) return 2;
  if (['da', 'de', 'do'].includes(palavras[i]) && palavras[i + 1] === 'marca' && palavras[i + 2]) return 3;
  return 0;
}
