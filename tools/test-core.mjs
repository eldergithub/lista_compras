/**
 * Testes do núcleo (texto, link, categorias). Rodam sem navegador: `npm test`.
 * O workflow roda antes de publicar: se algo quebrar, a versão boa continua no ar.
 */

import { adivinharCategoria, categoriaCanonica } from '../src/core/categorias.js';
import { criarItem, juntar, adicionarItens, LISTA_INICIAL, formatarQtd } from '../src/core/lista.js';
import { paraTexto, lerTexto, lerEntrada, separarItens } from '../src/core/texto.js';
import { procurarNoCatalogo, sugerirDoCatalogo } from '../src/core/catalogo.js';
import { registrar, sugerir, deSempre, gradeDaCategoria } from '../src/core/historico.js';
import { CATEGORIAS_POR_TIPO, TIPOS } from '../src/core/categorias.js';
import { MODELOS, modelosPara, itensDoModelo } from '../src/core/modelos.js';
import { complementar, novosDesdeOEnvio, marcarComoEnviados, textoDoComplemento, listaDoTextoDeComplemento } from '../src/core/complemento.js';
import { listaDoComplemento, ligar, listaEmCompra } from '../src/core/listas.js';
import { codigoDeComplemento, montarLinkDeComplemento } from '../src/core/link.js';
import { guardarOuAtualizar } from '../src/core/compras.js';
import { codificarRetorno, decodificarRetorno, oQueFaltou, textoDoRetorno } from '../src/core/retorno.js';
import { codigoDeRetorno, montarLinkDeRetorno, decodificarLista } from '../src/core/link.js';
import { criarLista, migrar, nomeLivre, listaAtiva } from '../src/core/listas.js';
import { registroDaCompra, guardarCompra, totalDoMes, itensQueFaltaram, LIMITE_DE_COMPRAS } from '../src/core/compras.js';
import { montarBackup, lerBackup } from '../src/core/backup.js';
import { categoriasEmUso } from '../src/core/lista.js';
import { ordenarParaCompra, resumoDaCompra, lerPreco, formatarPreco, novaCompra } from '../src/core/compra.js';
import { codificar, decodificar, montarLink, codigoDoEndereco } from '../src/core/link.js';

import { trechoNovo, juntarOuvidos, textoDaSessao, limparFala, separarPendente } from '../src/core/fala.js';
import { alternarObs, temObs, sugestoesDeObs } from '../src/core/observacoes.js';

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
ok(igual(ent('3 tomates'), [['Tomate', 3, 'un', 'Hortifrúti']]), 'plural vira o nome do catálogo e, contado, unidade');
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

// Grade de sugestões e fala
{
  const h = registrar(registrar({}, [criarItem('Macaxeira', 'Hortifrúti', 2, 'kg')]), [criarItem('Macaxeira', 'Hortifrúti', 2, 'kg')]);
  const g = gradeDaCategoria(h, 'Hortifrúti');
  ok(g[0].nome === 'Macaxeira' && g[0].doHistorico && g[0].qtd === 2 && g.length === 24, 'grade começa pelo que a pessoa compra');
  ok(new Set(g.map((x) => x.nome)).size === g.length, 'grade sem repetidos');
  ok(gradeDaCategoria({}, 'Farmácia').some((x) => x.nome === 'Dipirona'), 'grade de farmácia');
  ok(Object.keys(TIPOS).every((t) => CATEGORIAS_POR_TIPO[t]?.length && CATEGORIAS_POR_TIPO[t].every((c) => gradeDaCategoria({}, c).length)), 'todo tipo tem categorias com sugestões');
  ok(igual(lerEntrada('dois quilos de frango vírgula pão vírgula seis leites').map((i) => [i.nome, i.qtd]), [['Frango', 2], ['Pão', null], ['Leite', 6]]), '"vírgula" falada separa itens');
}

// Listas prontas
{
  for (const m of MODELOS) {
    const its = itensDoModelo(m);
    const semCategoria = its.filter((i) => i.cat === 'Outros').map((i) => i.nome);
    ok(its.length >= 10 && semCategoria.length === 0, `lista pronta ${m.nome}: ${its.length} itens, todos com categoria${semCategoria.length ? ' (sem: ' + semCategoria.join(', ') + ')' : ''}`);
    ok(new Set(its.map((i) => i.nome.toLowerCase())).size === its.length, `lista pronta ${m.nome} sem repetidos`);
    ok(m.tipo in TIPOS, `lista pronta ${m.nome} com tipo válido`);
  }
  ok(modelosPara('farmacia')[0].id === 'farmacia', 'listas prontas do tipo vêm primeiro');
  const ovos = itensDoModelo(MODELOS[0]).find((i) => i.nome === 'Ovos');
  ok(ovos.qtd === 1 && ovos.un === 'dz', 'quantidade da lista pronta');
}

// Complemento
{
  const naRua = [
    { ...criarItem('Pão', 'Padaria'), feito: true, preco: 8 },
    { ...criarItem('Leite', 'Frios e laticínios', 2, 'cx'), feito: true },
    { ...criarItem('Gorgonzola', 'Frios e laticínios'), faltou: true },
    criarItem('Ovos', 'Frios e laticínios', 1, 'dz'),
    criarItem('Café', 'Mercearia'),
  ];
  const chegou = [criarItem('Pilha', 'Utilidades', 4), criarItem('leite', 'Frios e laticínios', 4, 'cx'), criarItem('Gorgonzola', 'Frios e laticínios'), criarItem('Ovos', 'Frios e laticínios', 2, 'dz'), criarItem('Café', 'Mercearia')];
  const r = complementar(naRua, chegou);
  const por = (n) => r.itens.find((i) => i.nome.toLowerCase() === n.toLowerCase());
  ok(igual(r.novos, ['Pilha']) && por('Pilha').novo && !por('Pilha').feito, 'item novo entra pendente com selo');
  ok(por('Leite').qtd === 6 && !por('Leite').feito && por('Leite').obs === 'pediram mais' && por('Leite').novo, 'item já pego volta somando e com "pediram mais"');
  ok(!por('Gorgonzola').faltou && por('Gorgonzola').novo, '"não tinha" pedido de novo volta a pendente');
  ok(por('Ovos').qtd === 2 && r.atualizados.includes('Ovos'), 'pendente só atualiza a quantidade');
  ok(!por('Café').novo && por('Pão').feito && por('Pão').preco === 8, 'o resto não muda');
  ok(r.reabertos.length === 2 && r.itens.length === 6, 'contagem do complemento');
  ok(ordenarParaCompra(r.itens).find(([c]) => c === 'Frios e laticínios')[1][0].novo, 'novos em cima na hora da compra');
  const inteira = complementar(naRua, chegou, { reabrir: false });
  const porI = (n) => inteira.itens.find((i) => i.nome.toLowerCase() === n.toLowerCase());
  ok(porI('Leite').feito && porI('Gorgonzola').faltou && porI('Pilha').novo && porI('Ovos').qtd === 2, 'lista inteira de novo não reabre o que já foi resolvido');

  const l = { itens: [criarItem('Pão', 'Padaria')] };
  ok(novosDesdeOEnvio(l).length === 0, 'nunca enviada: nada é "novo"');
  marcarComoEnviados(l);
  l.itens.push(criarItem('Pilha', 'Utilidades'));
  ok(igual(novosDesdeOEnvio(l).map((i) => i.nome), ['Pilha']), 'novo desde o último envio');
  l.itens[0].qtd = 3; ok(igual(novosDesdeOEnvio(l).map((i) => i.nome), ['Pão', 'Pilha']), 'quantidade mudada também conta como novo');

  const a = criarLista('Mercado', 'mercado'), bl = criarLista('Farmácia', 'farmacia');
  const est = { v: 2, listas: [a, bl], ativa: a.id };
  ok(listaDoComplemento(est, { uid: bl.uid, nome: 'Outra' }) === bl, 'complemento acha a lista pela identidade');
  ok(listaDoComplemento(est, { uid: 'x', nome: 'mercado' }) === a, 'sem identidade conhecida, acha pelo nome');
  ok(listaDoComplemento(est, { uid: 'x', nome: 'Festa' }) === null, 'sem lista certa, a pessoa escolhe');
  const m2 = criarLista('Mercado 2', 'mercado', [{ ...criarItem('Pão', 'Padaria'), feito: true }]); est.listas.push(m2);
  ok(listaDoComplemento(est, { nome: 'Mercado' }) === m2, 'pelo nome, prefere a cópia numerada que está em compra');
  est.listas.pop();
  ligar(a, 'de-fora');
  ok(listaDoComplemento(est, { uid: 'de-fora' }) === a, 'lista recebida fica ligada à de origem');
  a.itens = [{ ...criarItem('Pão', 'Padaria'), feito: true }];
  ok(listaEmCompra(est) === a, 'sugere a lista que está em compra');

  const link = await montarLinkDeComplemento([criarItem('Pilha', 'Utilidades', 4)], 'https://eldergithub.github.io/lista_compras/', { nome: 'Mercado', tipo: 'mercado', uid: a.uid });
  const cod = codigoDeComplemento(new URL(link).hash);
  ok(cod && codigoDoEndereco(new URL(link).hash) === null, 'link de complemento é próprio');
  const lc = await decodificarLista(cod);
  ok(lc.meta.uid === a.uid && lc.meta.nome === 'Mercado' && lc.itens[0].qtd === 4, 'complemento leva identidade, nome e itens');
  const t = textoDoComplemento([criarItem('Pilha', 'Utilidades', 4)], 'Mercado', formatarQtd);
  ok(listaDoTextoDeComplemento(t) === 'Mercado' && lerTexto(t).length === 1 && lerTexto(t)[0].nome === 'Pilha', 'texto de complemento: lista e itens');

  const reg1 = { id: 'r1', listaId: 'L', origem: 'compra', data: 1000 };
  const reg2 = { id: 'r2', listaId: 'L', origem: 'compra', data: 1000 + 3600e3 };
  ok(guardarOuAtualizar([reg1], reg2).length === 1 && guardarOuAtualizar([reg1], reg2)[0].id === 'r1', 'compra reaberta atualiza o registro');
  ok(guardarOuAtualizar([reg1], { ...reg2, data: 1000 + 13 * 3600e3 }).length === 2, 'outro dia é outra compra');
}

// ---------------------------------------------------------------- fala e observações
{
  const nomes = (t) => lerEntrada(t).map((i) => i.nome).join('|');
  ok(nomes('frango pão leite') === 'Frango|Pão|Leite', 'itens falados sem pausa se separam');
  const d = lerEntrada('dois quilos de frango pão seis leites');
  ok(d.length === 3 && d[0].qtd === 2 && d[0].un === 'kg' && d[2].qtd === 6, 'sem pausa e com quantidades');
  ok(nomes('pão de queijo e leite') === 'Pão de queijo|Leite', 'produto mais comprido vence');
  ok(nomes('queijo coalho presunto') === 'Queijo coalho|Presunto', 'dois produtos de duas palavras');
  ok(lerEntrada('sabão de coco biscoito da vó').length === 1, 'palavra desconhecida: não separa');
  ok(nomes('alface, tomate próximo cebola') === 'Alface|Tomate|Cebola', '"próximo" separa');
  const lz = lerEntrada('leite zero lactose')[0];
  ok(lz.nome === 'Leite' && lz.obs === 'zero lactose', 'observação no fim do nome');
  ok(lerEntrada('arroz integral')[0].nome === 'Arroz integral' && !lerEntrada('arroz integral')[0].obs, 'produto do catálogo não vira observação');
  const cm = lerEntrada('café da marca Santa Clara')[0];
  ok(cm.nome === 'Café' && cm.obs === 'marca Santa Clara', 'marca vira observação');
  const co = lerEntrada('carne sem osso e magra');
  ok(co.length === 1 && co[0].obs === 'sem osso e magra', '"e" entre observações não separa');
  const fl = lerEntrada('6 leites zero lactose, banana madura');
  ok(fl.length === 2 && fl[0].qtd === 6 && fl[0].obs === 'zero lactose' && fl[1].obs === 'madura', 'quantidade e observação juntas');
  ok(lerEntrada('Banana (maduras)')[0].obs === 'maduras', 'parênteses continuam valendo');
  const so = adicionarItens([criarItem('Banana', 'Hortifrúti', 1, 'dz')], [{ ...criarItem('Banana', 'Hortifrúti'), obs: 'maduras' }]).itens[0];
  ok(so.qtd === 1 && so.obs === 'maduras', 'item repetido sem quantidade ainda leva a observação');

  ok(trechoNovo('', 'frango') === 'frango', 'primeira frase');
  ok(trechoNovo('frango', 'frango pão') === 'pão', 'frase acumulada: só o novo');
  ok(trechoNovo('frango pão', 'frango pão') === '', 'frase repetida: nada');
  ok(trechoNovo('Frango.', 'frango') === '', 'repetição com pontuação diferente');
  ok(trechoNovo('frango', 'leite') === 'leite', 'frase nova');
  const j = juntarOuvidos([criarItem('Pão', 'Padaria')], [criarItem('Pão', 'Padaria'), criarItem('Leite', 'Frios e laticínios', 6)]);
  ok(j.length === 2, 'eco do mesmo item não duplica');

  ok(alternarObs('', 'maduras') === 'maduras' && alternarObs('maduras', 'para hoje') === 'maduras, para hoje', 'chip acrescenta observação');
  ok(alternarObs('maduras, para hoje', 'maduras') === 'para hoje', 'chip tira observação');
  ok(temObs('Zero lactose', 'zero lactose') && sugestoesDeObs('Frios e laticínios').includes('zero lactose'), 'sugestões por categoria');
}

{
  const fala = (pedacos) => lerEntrada(limparFala(textoDaSessao(pedacos))).map((i) => [i.nome, i.qtd, i.un]);
  ok(JSON.stringify(fala(['uma', 'dipirona', 'um', 'paracetamol', 'e', 'também', 'dois', 'dorflex'])) === JSON.stringify([['Dipirona', 1, 'cx'], ['Paracetamol', 1, 'cx'], ['Dorflex', 2, 'cx']]), 'fala picada palavra por palavra (Android)');
  ok(fala(['frango', 'frango pão', 'frango pão seis leites']).length === 3, 'fala acumulada não repete');
  ok(fala(['pão', 'pão', 'leite']).length === 2, 'pedaço repetido não duplica');
  const g = fala(['uma dipirona e também um xarope de guaco coloca protetor solar fator 50']);
  ok(g.length === 3 && g[1][0] === 'Xarope de guaco' && g[2][0] === 'Protetor solar fator 50', 'número abre item novo; "fator 50" fica');
  ok(fala(['dois quilos de frango três cebolas mais um leite zero lactose']).map((i) => i[0]).join('|') === 'Frango|Cebola|Leite', '"mais um" separa, "zero lactose" não');
  ok(JSON.stringify(fala(['um quilo e meio de carne meia dúzia de ovos'])) === JSON.stringify([['Carne', 1.5, 'kg'], ['Ovos', 6, 'un']]), 'quantidades faladas sem pausa');
  ok(lerEntrada(limparFala('banana a mais barata'))[0].obs === 'a mais barata', '"a mais barata" continua observação');
}

{
  const a = separarPendente('uma dipirona e dois quilos de');
  ok(a.completo === 'uma dipirona' && a.pendente === 'e dois quilos de', 'pausa no meio do item: o resto espera');
  ok(separarPendente('pão leite').pendente === '' && separarPendente('3').completo === '', 'fala completa e só número');
  ok(separarPendente('seis leites sem').pendente === 'sem', '"sem" no fim espera a observação');
}

{
  ok(procurarNoCatalogo('vitamina c')?.nome === 'Vitamina C' && procurarNoCatalogo('lâmpada led')?.nome === 'Lâmpada LED', 'catálogo: "Vitamina C" e "Lâmpada LED" inteiros');
  ok(!procurarNoCatalogo('c'), 'letra solta não é item do catálogo');
  ok(lerEntrada('2').length === 0 && lerEntrada('também').length === 0 && lerEntrada('uma').length === 0, 'número ou palavra solta não vira item');
  const h = registrar({}, [criarItem('2', 'Outros'), criarItem('Também', 'Outros'), criarItem('Pão', 'Padaria')]);
  ok(Object.keys(h).length === 1, 'histórico ignora itens sem nome de verdade');
  const h2 = registrar(registrar({}, [criarItem('Frango', 'Açougue'), criarItem('Dipirona', 'Farmácia')]), [criarItem('Frango', 'Açougue'), criarItem('Dipirona', 'Farmácia')]);
  ok(deSempre(h2, [], 12, CATEGORIAS_POR_TIPO.farmacia).map((x) => x.nome).join() === 'Dipirona', 'de sempre só do tipo da lista');
}

console.log(`\n${passou} verificações passaram, ${falhou} falharam.`);
if (falhou) process.exit(1);
