/**
 * Testes do núcleo (texto, link, categorias). Rodam sem navegador: `npm test`.
 * O workflow roda antes de publicar: se algo quebrar, a versão boa continua no ar.
 */

import { adivinharCategoria, categoriaCanonica } from '../src/core/categorias.js';
import { criarItem, juntar, adicionarItens, LISTA_INICIAL, formatarQtd } from '../src/core/lista.js';
import { paraTexto, lerTexto, lerEntrada, separarItens } from '../src/core/texto.js';
import { procurarNoCatalogo, sugerirDoCatalogo } from '../src/core/catalogo.js';
import { registrar, sugerir, deSempre } from '../src/core/historico.js';
import { codificarRetorno, decodificarRetorno, oQueFaltou, textoDoRetorno } from '../src/core/retorno.js';
import { codigoDeRetorno, montarLinkDeRetorno, decodificarLista } from '../src/core/link.js';
import { criarLista, migrar, nomeLivre, listaAtiva } from '../src/core/listas.js';
import { registroDaCompra, guardarCompra, totalDoMes, itensQueFaltaram, LIMITE_DE_COMPRAS } from '../src/core/compras.js';
import { montarBackup, lerBackup } from '../src/core/backup.js';
import { categoriasEmUso } from '../src/core/lista.js';
import { ordenarParaCompra, resumoDaCompra, lerPreco, formatarPreco, novaCompra } from '../src/core/compra.js';
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
const porNome = (l) => resumo(l).sort((x, y) => x[0].localeCompare(y[0]));
ok(igual(porNome(lerTexto(paraTexto(lista))), porNome(lista)), 'texto do app volta igual');
ok(lerTexto(paraTexto(lista)).find((i) => i.nome === 'Pão').obs === 'bem quentinho, sem casca', 'observação com vírgula volta igual pelo texto');

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

// Hora da compra
{
  const c = [
    { ...criarItem('Pão', 'Padaria'), feito: true, preco: 8.5 },
    { ...criarItem('Carne', 'Açougue', 1, 'kg'), feito: true, preco: 42.9 },
    { ...criarItem('Frango', 'Açougue', 1, 'kg') },
    { ...criarItem('Gorgonzola', 'Frios e laticínios'), faltou: true },
    { ...criarItem('Leite', 'Frios e laticínios', 6, 'cx') },
  ];
  const ordem = ordenarParaCompra(c).map(([cat, l]) => cat + ':' + l.map((i) => i.nome).join('+'));
  ok(igual(ordem, ['Açougue:Frango+Carne', 'Frios e laticínios:Leite+Gorgonzola', 'Padaria:Pão']), 'pendentes em cima e categorias resolvidas no fim');
  const r = resumoDaCompra(c);
  ok(r.pegos === 2 && r.faltaram === 1 && r.resolvidos === 3 && r.gasto === 51.4 && r.comPreco === 2, 'resumo da compra');
  ok(lerPreco('12,90') === 12.9 && lerPreco('R$ 1.234,50') === 1234.5 && lerPreco('7.5') === 7.5 && lerPreco('') === null && lerPreco('abc') === null, 'lê preço em vários formatos');
  ok(formatarPreco(51.4) === 'R$ 51,40', 'formata em reais');
  const nova = novaCompra(c);
  ok(nova.every((i) => !i.feito && !i.faltou && i.preco === undefined) && nova[1].qtd === 1, 'nova compra limpa marcas e preços');
}

// Retorno da compra
{
  const c = [
    { ...criarItem('Pão', 'Padaria'), feito: true, preco: 8.5 },
    { ...criarItem('Carne', 'Açougue', 1.5, 'kg'), feito: true, preco: 42.9 },
    { ...criarItem('Gorgonzola', 'Frios e laticínios', 200, 'g'), faltou: true },
    { ...criarItem('Balão', 'Festa', 10) },
  ];
  const cod = await codificarRetorno(c, 1700000000000);
  const link = montarLinkDeRetorno(cod, 'https://eldergithub.github.io/lista_compras/#l=velho');
  ok(link === 'https://eldergithub.github.io/lista_compras/#r=' + cod && codigoDeRetorno(new URL(link).hash) === cod, 'link de retorno');
  ok(codigoDoEndereco(new URL(link).hash) === null, 'retorno não é confundido com lista');
  const r = await decodificarRetorno(cod);
  ok(r.data === 1700000000000 && r.pegos.length === 2 && r.faltaram[0].nome === 'Gorgonzola' && r.naoComprados[0].cat === 'Festa', 'retorno volta separado por situação');
  ok(r.gasto === 51.4 && r.pegos[1].qtd === 1.5 && r.faltaram[0].un === 'g', 'retorno mantém preço, quantidade e unidade');
  ok(igual(oQueFaltou(r).map((i) => i.nome), ['Gorgonzola', 'Balão']), 'o que faltou: não tinha + não comprou');
  const t = textoDoRetorno(c);
  ok(t.includes('Comprei (2)') && t.includes('Carne — 1,5 kg (R$ 42,90)') && t.includes('Não tinha (1)') && t.includes('Total: R$ 51,40'), 'texto do retorno');
  let recusou = false;
  try { await decodificarRetorno(await codificar([criarItem('x', 'Outros')])); } catch { recusou = true; }
  ok(recusou, 'código de lista não passa como retorno');
}

// Fase 6: várias listas
{
  const antigo = migrar(null, [criarItem('Pão', 'Padaria')], []);
  ok(antigo.listas.length === 1 && antigo.listas[0].nome === 'Mercado' && antigo.listas[0].itens[0].nome === 'Pão', 'lista antiga vira a lista Mercado');
  const vazio = migrar(null, null, LISTA_INICIAL);
  ok(vazio.listas[0].itens.length === LISTA_INICIAL.length, 'primeira vez: lista de exemplo');
  const farm = criarLista('Farmácia', 'farmacia', []);
  const e = { v: 2, listas: [antigo.listas[0], farm], ativa: farm.id };
  ok(migrar(e).ativa === farm.id && listaAtiva(migrar(e)).nome === 'Farmácia', 'estado novo é lido como está');
  ok(migrar({ ...e, ativa: 'sumiu' }).ativa === antigo.listas[0].id, 'lista ativa inexistente cai na primeira');
  ok(criarLista('x', 'inventado').tipo === 'outros', 'tipo desconhecido vira outros');
  ok(nomeLivre(e, 'Farmácia') === 'Farmácia 2' && nomeLivre(e, 'Festa') === 'Festa', 'nome livre para lista nova');

  const comMeta = await codificar([criarItem('Dipirona', 'Farmácia', 1, 'cx')], { nome: 'Farmácia da vó', tipo: 'farmacia' });
  const lido = await decodificarLista(comMeta);
  ok(lido.meta.nome === 'Farmácia da vó' && lido.meta.tipo === 'farmacia' && lido.itens[0].cat === 'Farmácia', 'link leva nome e tipo da lista');
  ok((await decodificarLista(await codificar([criarItem('Pão', 'Padaria')]))).meta === null, 'link sem nome continua valendo');
  ok(lerEntrada('dipirona, 2 parafusos, balões')[0].cat === 'Farmácia' && lerEntrada('2 parafusos')[0].cat === 'Material e ferramentas' && lerEntrada('balões')[0].cat === 'Festa', 'catálogo de farmácia, material e festa');
  ok(categoriasEmUso([criarItem('a', 'Padaria'), criarItem('b', 'Hortifrúti')])[0] === 'Hortifrúti', 'hortifrúti aparece primeiro, como na entrada do mercado');
  ok(paraTexto([criarItem('Pão', 'Padaria')], 'Padaria de domingo').startsWith('🛒 *Padaria de domingo* · NaLista'), 'texto leva o nome da lista');
  ok(lerTexto(paraTexto([criarItem('Pão', 'Padaria')], 'Padaria de domingo')).length === 1, 'cabeçalho com nome não vira item');

  // Compras anteriores
  const itensCompra = [{ ...criarItem('Pão', 'Padaria'), feito: true, preco: 10 }, { ...criarItem('Leite', 'Frios e laticínios', 6, 'cx'), faltou: true }, criarItem('Ovos', 'Frios e laticínios')];
  const reg = registroDaCompra({ nome: 'Mercado', tipo: 'mercado' }, itensCompra, new Date(2026, 10, 2).getTime());
  ok(reg.pegos.join() === 'Pão' && reg.faltaram.join() === 'Leite' && reg.naoComprados.join() === 'Ovos' && reg.gasto === 10, 'registro da compra');
  ok(reg.itens.every((i) => !i.feito && i.preco === undefined), 'registro guarda itens limpos');
  ok(igual(itensQueFaltaram(reg).map((i) => [i.nome, i.qtd]), [['Leite', 6], ['Ovos', null]]), 'o que faltou numa compra anterior');
  let lista = [];
  for (let n = 0; n < LIMITE_DE_COMPRAS + 5; n++) lista = guardarCompra(lista, { ...reg, id: String(n) });
  ok(lista.length === LIMITE_DE_COMPRAS && lista[0].id === String(LIMITE_DE_COMPRAS + 4), 'guarda as mais recentes até o limite');
  const mes = totalDoMes([reg, { ...reg, gasto: 5.5 }, { ...reg, data: new Date(2026, 9, 30).getTime(), gasto: 100 }], new Date(2026, 10, 20).getTime());
  ok(mes.compras === 2 && mes.gasto === 15.5, 'total do mês');

  // Backup
  const b = montarBackup({ listas: e, historico: {}, compras: [reg], orcamento: 300 }, new Date('2026-11-02T12:00:00Z'));
  const volta = lerBackup(JSON.stringify(b));
  ok(volta.listas.listas.length === 2 && volta.compras.length === 1 && volta.orcamento === 300, 'backup vai e volta');
  let msg = '';
  try { lerBackup('{"formato":"outro"}'); } catch (err) { msg = err.message; }
  ok(msg.includes('não é um backup'), 'arquivo estranho é recusado com mensagem clara');
  try { lerBackup('isso não é json'); msg = ''; } catch (err) { msg = err.message; }
  ok(msg.includes('não é um backup'), 'arquivo que não é JSON é recusado');
}

console.log(`\n${passou} verificações passaram, ${falhou} falharam.`);
if (falhou) process.exit(1);
