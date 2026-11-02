/**
 * Testes do núcleo (texto, link, categorias). Rodam sem navegador: `npm test`.
 * O workflow roda antes de publicar: se algo quebrar, a versão boa continua no ar.
 */

import { adivinharCategoria, categoriaCanonica } from '../src/core/categorias.js';
import { criarItem, juntar, LISTA_INICIAL, formatarQtd } from '../src/core/lista.js';
import { paraTexto, lerTexto } from '../src/core/texto.js';
import { codificar, decodificar, montarLink, codigoDoEndereco } from '../src/core/link.js';

let passou = 0, falhou = 0;
function ok(cond, nome) {
  if (cond) { passou++; return; }
  falhou++; console.error('  FALHOU: ' + nome);
}
// Sem quantidade, a unidade não importa (e não vai no texto).
const resumo = (l) => l.map((i) => [i.nome, i.cat, i.qtd, i.qtd == null ? 'un' : i.un]);
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Categorias
ok(adivinharCategoria('Frango em cubos') === 'Açougue', 'frango → açougue');
ok(adivinharCategoria('Maçã') === 'Hortifrúti', 'maçã com acento → hortifrúti');
ok(adivinharCategoria('Queijo muçarela') === 'Frios e laticínios', 'muçarela → frios');
ok(adivinharCategoria('Papel higiênico') === 'Higiene', 'papel higiênico → higiene');
ok(adivinharCategoria('Coisa estranha') === 'Outros', 'desconhecido → outros');
ok(categoriaCanonica('hortifruti') === 'Hortifrúti', 'cabeçalho sem acento vira categoria conhecida');

// Texto: lista solta, como a que chega no WhatsApp
const solta = lerTexto('Frango em cubos\n2 kg carne\nLeite - 6 cx\n3x iogurte\n500 g de muçarela\n\nBanana: 1 dz\nUva');
ok(igual(resumo(solta), [
  ['Frango em cubos', 'Açougue', null, 'un'],
  ['Carne', 'Açougue', 2, 'kg'],
  ['Leite', 'Frios e laticínios', 6, 'cx'],
  ['Iogurte', 'Frios e laticínios', 3, 'un'],
  ['Muçarela', 'Frios e laticínios', 500, 'g'],
  ['Banana', 'Hortifrúti', 1, 'dz'],
  ['Uva', 'Hortifrúti', null, 'un'],
]), 'lista solta com quantidades em vários formatos');

ok(lerTexto('Carne 0,5 kg - 1,5 kg')[0].qtd === 1.5, 'decimal com vírgula');
ok(lerTexto('*Festa*\n- Balão — 20 un')[0].cat === 'Festa', 'categoria criada pela pessoa');
ok(lerTexto('').length === 0, 'texto vazio');

// Texto: ida e volta com o próprio formato do app
const lista = LISTA_INICIAL.map((i, n) => ({ ...i, qtd: n % 3 ? n * 0.5 : null }));
ok(igual(resumo(lerTexto(paraTexto(lista))), resumo(lista)), 'texto do app volta igual');

// Link: ida e volta, com e sem compressão
const variada = [
  ...lista,
  criarItem('Balão de festa 🎈', 'Festa', 20),
  criarItem('Água "com gás" & limão', 'Bebidas', 6, 'L'),
];
const z = await codificar(variada);
ok(z[0] === 'z', 'link comprimido quando o ambiente comprime');
ok(igual(resumo(await decodificar(z)), resumo(variada)), 'link comprimido volta igual');
const j = 'j' + Buffer.from(JSON.stringify([1, [['Pão', 1, 0], ['Leite', 'Outros', 2, 'L']]])).toString('base64url');
ok(igual(resumo(await decodificar(j)), [['Pão', 'Padaria', null, 'un'], ['Leite', 'Outros', 2, 'L']]), 'link sem compressão também é lido');
let recusou = false;
try { await decodificar('xabc'); } catch { recusou = true; }
ok(recusou, 'link estragado é recusado');

const link = await montarLink(lista, 'https://eldergithub.github.io/lista_compras/?a=1#velho');
ok(link.startsWith('https://eldergithub.github.io/lista_compras/#l=z'), 'link usa a pasta do app');
ok(codigoDoEndereco('#l=zAbC-_9') === 'zAbC-_9' && codigoDoEndereco('#outra') === null, 'código sai do endereço');
ok(igual(resumo(await decodificar(codigoDoEndereco(new URL(link).hash))), resumo(lista)), 'lista sai do link montado');

const grande = Array.from({ length: 120 }, (_, n) => criarItem('Item de compra número ' + n, 'Mercearia', n % 5, 'un'));
const tamanho = (await montarLink(grande, 'https://eldergithub.github.io/lista_compras/')).length;
ok(tamanho < 2000, `120 itens cabem num link curto (${tamanho} caracteres)`);
console.log(`  link com a lista inicial: ${link.length} caracteres; com 120 itens: ${tamanho}`);

// Juntar
const unida = juntar([criarItem('Pão', 'Padaria', 2)], [criarItem('pão', 'Padaria', 4), criarItem('Ovos', 'Frios e laticínios')]);
ok(unida.length === 2 && unida[0].qtd === 4, 'juntar não duplica e atualiza quantidade');
ok(formatarQtd({ qtd: 0.5, un: 'kg' }) === '0,5 kg', 'quantidade com vírgula');

console.log(`\n${passou} verificações passaram, ${falhou} falharam.`);
if (falhou) process.exit(1);
