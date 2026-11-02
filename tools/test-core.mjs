/**
 * Testes do núcleo (texto, link, categorias). Rodam sem navegador: `npm test`.
 * O workflow roda antes de publicar: se algo quebrar, a versão boa continua no ar.
 */

import { adivinharCategoria, categoriaCanonica } from '../src/core/categorias.js';
import { criarItem, juntar, adicionarItens, LISTA_INICIAL, formatarQtd } from '../src/core/lista.js';
import { paraTexto, lerTexto, lerEntrada, separarItens } from '../src/core/texto.js';
import { procurarNoCatalogo, sugerirDoCatalogo } from '../src/core/catalogo.js';
import { registrar, sugerir, deSempre } from '../src/core/historico.js';
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

// Entrada rápida: digitada ou falada pelo microfone do teclado
const ent = (t) => lerEntrada(t).map((i) => [i.nome, i.qtd, i.un, i.cat]);
ok(igual(ent('pão, 6 leite, banana e tomate'), [
  ['Pão', null, 'un', 'Padaria'], ['Leite', 6, 'cx', 'Frios e laticínios'],
  ['Banana', null, 'dz', 'Hortifrúti'], ['Tomate', null, 'kg', 'Hortifrúti'],
]), 'vários itens numa linha, com unidade do catálogo');
ok(igual(ent('dois quilos de frango'), [['Frango', 2, 'kg', 'Açougue']]), 'número falado com unidade');
ok(igual(ent('um quilo e meio de carne e duas caixas de leite'), [['Carne', 1.5, 'kg', 'Açougue'], ['Leite', 2, 'cx', 'Frios e laticínios']]), '"e meio" não separa, "e duas" separa');
ok(igual(ent('meia dúzia de ovos'), [['Ovos', 6, 'un', 'Frios e laticínios']]), 'meia dúzia vira 6');
ok(igual(ent('trezentos e cinquenta gramas de queijo'), [['Queijo', 350, 'g', 'Frios e laticínios']]), 'número composto falado');
ok(igual(ent('dois quilos de carne e três de frango'), [['Carne', 2, 'kg', 'Açougue'], ['Frango', 3, 'kg', 'Açougue']]), 'segundo item com número falado e unidade do catálogo');
ok(igual(ent('arroz e feijão'), [['Arroz', null, 'pct', 'Mercearia'], ['Feijão', null, 'pct', 'Mercearia']]), 'arroz e feijão são dois');
ok(igual(ent('frango 2kg'), [['Frango', 2, 'kg', 'Açougue']]), 'número grudado na unidade, no fim');
ok(igual(ent('3 tomates'), [['Tomate', 3, 'kg', 'Hortifrúti']]), 'plural vira o nome do catálogo');
ok(lerEntrada('banana (maduras)')[0].obs === 'maduras', 'observação entre parênteses');
ok(lerEntrada('Couve-flor')[0].cat === 'Hortifrúti', 'nome com hífen');
ok(separarItens('um quilo e meio de carne').length === 1, 'quantidade com "e" fica junta');
ok(lerEntrada('').length === 0 && lerEntrada(' , , ').length === 0, 'entrada vazia');

// Catálogo
ok(procurarNoCatalogo('pães')?.nome === 'Pão', 'catálogo entende plural');
ok(sugerirDoCatalogo('fei')[0].nome === 'Feijão', 'sugestão começa pelo nome mais curto');
ok(lerTexto('Carne 0,5 kg - 1,5 kg')[0].qtd === 1.5, 'decimal com vírgula');
ok(lerTexto('*Festa*\n- Balão — 20 un')[0].cat === 'Festa', 'categoria criada pela pessoa');
ok(lerTexto('').length === 0, 'texto vazio');

// Texto: ida e volta com o próprio formato do app
const lista = LISTA_INICIAL.map((i, n) => ({ ...i, qtd: n % 3 ? n * 0.5 : null }));
lista[2].obs = 'bem quentinho, sem casca';
ok(igual(resumo(lerTexto(paraTexto(lista))), resumo(lista)), 'texto do app volta igual');
ok(lerTexto(paraTexto(lista))[2].obs === 'bem quentinho, sem casca', 'observação com vírgula volta igual pelo texto');

// Link: ida e volta, com e sem compressão
const variada = [
  ...lista,
  criarItem('Balão de festa 🎈', 'Festa', 20),
  criarItem('Água "com gás" & limão', 'Bebidas', 6, 'L'),
];
const z = await codificar(variada);
ok(z[0] === 'z', 'link comprimido quando o ambiente comprime');
ok(igual(resumo(await decodificar(z)), resumo(variada)), 'link comprimido volta igual');
ok((await decodificar(z))[2].obs === 'bem quentinho, sem casca', 'observação vai no link');
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

// Adicionar soma repetidos
const { itens: somada, somados } = adicionarItens([criarItem('Leite', 'Frios e laticínios', 2, 'cx')], lerEntrada('4 leites, pão'));
ok(somada.length === 2 && somada[0].qtd === 6 && somados[0] === 'Leite', 'adicionar soma o que já estava');

// Histórico
let h = registrar({}, [criarItem('Leite', 'Frios e laticínios', 6, 'cx')], 1);
h = registrar(h, [criarItem('Leite', 'Frios e laticínios', null, 'cx'), criarItem('Leite condensado', 'Frios e laticínios', 1, 'cx')], 2);
ok(h.leite.vezes === 2 && h.leite.qtd === 6, 'histórico conta vezes e guarda a última quantidade');
ok(sugerir(h, 'lei')[0].nome === 'Leite' && sugerir(h, 'lei')[0].doHistorico, 'o que já comprou vem primeiro');
ok(deSempre(h, []).map((x) => x.nome).join() === 'Leite', 'itens de sempre: 2 ou mais vezes');
ok(deSempre(h, [criarItem('Leite', 'x')]).length === 0, 'itens de sempre ignoram o que já está na lista');

console.log(`\n${passou} verificações passaram, ${falhou} falharam.`);
if (falhou) process.exit(1);
