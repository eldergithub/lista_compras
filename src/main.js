import qrcode from 'qrcode-generator';
// Fontes empacotadas no app (só o alfabeto latino): funcionam offline.
import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import '@fontsource/bricolage-grotesque/latin-600.css';
import '@fontsource/bricolage-grotesque/latin-800.css';
import './styles.css';
import { CATEGORIAS, UNIDADES, PASSO, TIPOS, CATEGORIAS_POR_TIPO } from './core/categorias.js';
import {
  criarItem, formatarNumero, formatarQtd, categoriasEmUso, juntar, adicionarItens, LISTA_INICIAL,
} from './core/lista.js';
import { paraTexto, lerTexto, lerEntrada, separarItens, lerPedaco } from './core/texto.js';
import { montarLink, decodificarLista, codigoDoEndereco, codigoDeRetorno, montarLinkDeRetorno } from './core/link.js';
import { criarLista, migrar, listaAtiva, nomeLivre, listasPorUso } from './core/listas.js';
import { registroDaCompra, guardarCompra, totalDoMes, itensQueFaltaram } from './core/compras.js';
import { montarBackup, lerBackup, nomeDoArquivo } from './core/backup.js';
import { codificarRetorno, decodificarRetorno, oQueFaltou, textoDoRetorno } from './core/retorno.js';
import { registrar, doHistorico, sugerir, deSempre, gradeDaCategoria } from './core/historico.js';
import {
  ordenarParaCompra, resumoDaCompra, lerPreco, formatarPreco, novaCompra, resolvido,
} from './core/compra.js';
import {
  carregar, carregarHistorico, salvarHistorico, carregarUltima,
  carregarOrcamento, salvarOrcamento, carregarListas, salvarListas, carregarCompras, salvarCompras,
  lerTudo, gravarTudo,
} from './storage.js';

// ---------------------------------------------------------------- estado
// Várias listas: `lista` é a que está aberta e `itens` são os itens dela.
// Quem tinha a versão de uma lista só ganha a lista "Mercado" com os mesmos itens.
const guardadoAntes = carregarListas();
let estado = migrar(guardadoAntes, carregar(), LISTA_INICIAL);
if (!guardadoAntes && carregarUltima()) estado.listas[0].ultima = carregarUltima();
let lista = listaAtiva(estado);
let itens = lista.itens;
let historico = carregarHistorico();
let compras = carregarCompras();
let editando = false;
let orcamento = carregarOrcamento();
function guardar() {
  lista.itens = itens;
  lista.atualizada = Date.now();
  salvarListas(estado);
}
salvarListas(estado);

const ICONES_TIPO = {
  mercado: '<path d="M3 9h18l-1.6 9.2a2 2 0 0 1-2 1.8H6.6a2 2 0 0 1-2-1.8L3 9z"/><path d="M8 9l3-5M16 9l-3-5"/><path d="M9 13v3M12 13v3M15 13v3"/>',
  farmacia: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M12 10.5v6M9 13.5h6"/>',
  casa: '<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  festa: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11"/><path d="M12 9c-1.5-3.5-5-4-5-1.5S10 9 12 9zM12 9c1.5-3.5 5-4 5-1.5S14 9 12 9z"/>',
  outros: '<path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5"/><path d="M8.5 13l2 2 4-4"/>',
};
const iconeTipo = (tipo) => `<svg class="icone-tipo tipo-${tipo}" viewBox="0 0 24 24" aria-hidden="true">${ICONES_TIPO[tipo] || ICONES_TIPO.outros}</svg>`;
const copiaDe = (lista) => lista.map((i) => ({ ...i }));

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const MARCA = '<svg viewBox="0 0 24 24" fill="none" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

function lembrar(lista, contar = true) {
  historico = registrar(historico, lista, Date.now(), contar);
  salvarHistorico(historico);
}

// ---------------------------------------------------------------- avisos e desfazer
let antesDeDesfazer = null;
function aviso(msg, podeDesfazer = false) {
  const t = $('aviso');
  t.innerHTML = `<span>${esc(msg)}</span>${podeDesfazer ? '<button type="button" id="aDesfazer">Desfazer</button>' : ''}`;
  t.classList.add('mostrar');
  t.classList.toggle('com-acao', podeDesfazer);
  if (podeDesfazer) {
    $('aDesfazer').onclick = () => {
      if (!antesDeDesfazer) return;
      if (antesDeDesfazer.lista !== lista.id) trocarPara(antesDeDesfazer.lista, false);
      itens = antesDeDesfazer.itens; antesDeDesfazer = null;
      guardar(); desenhar(); aviso('Desfeito');
    };
  }
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => t.classList.remove('mostrar', 'com-acao'), podeDesfazer ? 5000 : 2000);
}
/** Guarda a lista antes de uma mudança, para o "Desfazer" do aviso. */
const marcarParaDesfazer = () => { antesDeDesfazer = { lista: lista.id, itens: copiaDe(itens) }; };

// ---------------------------------------------------------------- lista
function desenhar() {
  const quadro = $('lista');
  quadro.innerHTML = '';
  if (!itens.length) {
    quadro.innerHTML = editando
      ? '<p class="vazio">Escreva ou fale os itens na caixa acima.</p>'
      : '<p class="vazio">Lista vazia. Toque em <b>Editar</b> para montar a lista ou em <b>Importar</b> para colar uma.</p>';
  }
  const grupos = editando
    ? categoriasEmUso(itens).map((cat) => [cat, itens.filter((i) => i.cat === cat)])
    : ordenarParaCompra(itens);
  for (const [cat, doGrupo] of grupos) {
    const sec = document.createElement('section');
    const contagem = editando ? doGrupo.length : `${doGrupo.filter(resolvido).length}/${doGrupo.length}`;
    sec.innerHTML = `<h2><span>${esc(cat)}</span><span>${contagem}</span></h2>`;
    const ul = document.createElement('ul');
    for (const item of doGrupo) ul.appendChild(editando ? linhaEdicao(item) : linhaCompra(item));
    sec.appendChild(ul);
    quadro.appendChild(sec);
  }
  desenharMontagem();
  atualizarContagem();
  $('bListas').innerHTML = `${iconeTipo(lista.tipo)}<span>${esc(lista.nome)}</span>${estado.listas.length > 1 ? `<span class="cinza">${estado.listas.length}</span>` : ''}<svg class="seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`;
  document.title = `${lista.nome} · NaLista`;
  $('bEditar').textContent = editando ? 'Pronto' : 'Editar';
  $('bEditar').classList.toggle('primario', editando);
  rearmarLimpar();
  manterTelaAcesa();
}

const textoNome = (item) => `${esc(item.nome)}${item.obs ? `<small>${esc(item.obs)}</small>` : ''}`;

function linhaCompra(item) {
  const li = document.createElement('li');
  const q = formatarQtd(item);
  const preco = typeof item.preco === 'number' ? formatarPreco(item.preco) : '';
  if (item.faltou && !item.feito) li.className = 'faltou';
  li.innerHTML = `<div class="linha-compra"><label class="linha"><input type="checkbox" ${item.feito ? 'checked' : ''}><span class="caixa">${MARCA}</span><span class="nome">${textoNome(item)}</span>${q ? `<span class="qtd">${q}</span>` : ''}${li.className ? '<span class="tag-faltou">não tinha</span>' : ''}</label><button class="preco-bt${preco ? ' tem' : ''}" type="button" aria-label="Preço ou não tinha: ${esc(item.nome)}">${preco || 'R$'}</button></div>`;
  li.querySelector('input').addEventListener('change', (e) => {
    if (item.faltou && !item.feito) { item.faltou = false; e.target.checked = false; }
    else { item.feito = e.target.checked; if (item.feito) item.faltou = false; }
    guardar(); atualizarContagem();
    // Dá tempo de ver a marca antes de o item descer para o fim da categoria.
    clearTimeout(linhaCompra.t);
    linhaCompra.t = setTimeout(desenhar, 350);
  });
  li.querySelector('.preco-bt').onclick = () => painelDoItemNaCompra(item);
  return li;
}

/** Preço do item e "não tinha", na hora da compra. */
function painelDoItemNaCompra(item) {
  const q = formatarQtd(item);
  const valor = typeof item.preco === 'number' ? String(item.preco.toFixed(2)).replace('.', ',') : '';
  abrirPainel(`<h3>${esc(item.nome)}${q ? ` <span class="cinza">${q}</span>` : ''}</h3>
    <label class="campo">Quanto deu este item?<input class="texto preco-campo" id="pValor" inputmode="decimal" placeholder="R$ 0,00" value="${valor}" autocomplete="off"></label>
    <p>Use o valor total do item, o que aparece na etiqueta ou na balança.</p>
    <button class="btn primario grande" id="pPego" type="button">Salvar e marcar como pego</button>
    <div class="fileira">
      <button class="btn" id="pFaltou" type="button">${item.faltou && !item.feito ? 'Achei, tinha sim' : 'Não tinha'}</button>
      ${typeof item.preco === 'number' ? '<button class="btn" id="pLimpar" type="button">Tirar o preço</button>' : ''}
    </div>
    <button class="btn discreto" data-fechar type="button">Cancelar</button>`);
  const campo = $('pValor');
  setTimeout(() => campo.focus(), 50);
  const salvarPego = () => {
    const preco = lerPreco(campo.value);
    if (campo.value.trim() && preco == null) { aviso('Valor inválido'); campo.focus(); return; }
    if (preco != null) item.preco = preco; else delete item.preco;
    item.feito = true; item.faltou = false;
    guardar(); fecharPainel(); desenhar();
  };
  $('pPego').onclick = salvarPego;
  campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') salvarPego(); });
  $('pFaltou').onclick = () => {
    if (item.faltou && !item.feito) item.faltou = false;
    else { item.faltou = true; item.feito = false; delete item.preco; }
    guardar(); fecharPainel(); desenhar();
  };
  if ($('pLimpar')) $('pLimpar').onclick = () => { delete item.preco; guardar(); fecharPainel(); desenhar(); };
}

function painelOrcamento() {
  const valor = orcamento ? String(orcamento.toFixed(2)).replace('.', ',') : '';
  abrirPainel(`<h3>Orçamento da compra</h3>
    <p>O total fica em destaque quando passar do valor.</p>
    <label class="campo">Quanto pretende gastar?<input class="texto preco-campo" id="oValor" inputmode="decimal" placeholder="R$ 0,00" value="${valor}" autocomplete="off"></label>
    <div class="fileira">
      <button class="btn primario" id="oSalvar" type="button">Salvar</button>
      ${orcamento ? '<button class="btn" id="oTirar" type="button">Sem orçamento</button>' : ''}
    </div>
    <button class="btn discreto" data-fechar type="button">Cancelar</button>`);
  const definir = (v) => { orcamento = v; salvarOrcamento(v); fecharPainel(); atualizarContagem(); };
  $('oSalvar').onclick = () => {
    const v = lerPreco($('oValor').value);
    if (!v) { aviso('Digite um valor'); return; }
    definir(v);
  };
  if ($('oTirar')) $('oTirar').onclick = () => definir(null);
}
$('gasto').onclick = painelOrcamento;

function linhaEdicao(item) {
  const li = document.createElement('li');
  li.innerHTML = `<div class="linha-ed"><button class="nome nome-bt" type="button">${textoNome(item)}</button><div class="passo"><button type="button" aria-label="Menos">−</button><span></span><button type="button" aria-label="Mais">+</button></div><select aria-label="Unidade">${UNIDADES.map((u) => `<option ${u === item.un ? 'selected' : ''}>${u}</option>`).join('')}</select><button class="remover" type="button" aria-label="Remover ${esc(item.nome)}">×</button></div>`;
  const [menos, mais] = li.querySelectorAll('.passo button');
  const valor = li.querySelector('.passo span');
  ligarPasso(item, menos, mais, valor, li.querySelector('select'), () => { guardar(); lembrar([item], false); });
  li.querySelector('.nome-bt').onclick = () => editarItem(item);
  li.querySelector('.remover').onclick = () => {
    marcarParaDesfazer();
    itens = itens.filter((x) => x !== item); guardar(); desenhar();
    aviso(`${item.nome} removido`, true);
  };
  return li;
}

/** Botões − e + e a unidade. Serve para a linha e para o painel do item. */
function ligarPasso(item, menos, mais, valor, unidade, aoMudar) {
  const passo = () => PASSO[item.un] || 1;
  const mostrar = (mudou = true) => {
    valor.textContent = item.qtd == null ? '–' : formatarNumero(item.qtd);
    if (mudou) aoMudar();
  };
  mais.onclick = () => { item.qtd = item.qtd == null ? passo() : item.qtd + passo(); mostrar(); };
  menos.onclick = () => {
    if (item.qtd == null) return;
    item.qtd -= passo();
    if (item.qtd <= 0.0001) item.qtd = null;
    mostrar();
  };
  unidade.onchange = (e) => {
    item.un = e.target.value;
    // Trocar g ↔ outra unidade com o número antigo daria "500 kg" ou "1 g".
    if (item.qtd != null && item.un === 'g' && item.qtd < 100) item.qtd = 100;
    else if (item.qtd != null && item.un !== 'g' && item.qtd >= 100) item.qtd = 1;
    mostrar();
  };
  mostrar(false);
}

// ---------------------------------------------------------------- montar a lista
/** Transforma o que foi lido em itens, com a unidade e a categoria que a pessoa costuma usar. */
function paraItens(lidos) {
  return lidos.map((l) => {
    const h = doHistorico(historico, l.nome);
    const item = criarItem(l.nome, h?.cat || l.cat, l.qtd, l.unDita ? l.un : (h?.un || l.un));
    if (l.obs) item.obs = l.obs;
    return item;
  });
}

function adicionar(novos) {
  if (!novos.length) return;
  marcarParaDesfazer();
  const r = adicionarItens(itens, novos);
  itens = r.itens;
  lista.compraRegistrada = false;
  lembrar(novos);
  guardar(); desenhar();
  const novosDeVerdade = novos.length - r.somados.length;
  const partes = [];
  if (novosDeVerdade) partes.push(novos.length === 1 ? `${novos[0].nome} adicionado` : plural(novosDeVerdade, 'item adicionado', 'itens adicionados'));
  if (r.somados.length) partes.push(`${r.somados.join(', ')} já ${r.somados.length === 1 ? 'estava' : 'estavam'} na lista: somei`);
  aviso(partes.join('. '), true);
}

// Reconhecimento de fala do navegador (Chrome no Android). Sem ele, fica a dica do microfone do teclado.
const Reconhecimento = window.SpeechRecognition || window.webkitSpeechRecognition;
const MICROFONE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
let categoriaDaGrade = null;
let ouvindo = null;

function desenharMontagem() {
  const caixa = $('adicionar');
  // O que estava sendo digitado sobrevive ao redesenho (um toque na grade redesenha a lista).
  const digitado = $('nTexto')?.value || '';
  if (!editando) { pararDeOuvir(); caixa.innerHTML = ''; return; }
  const sempre = deSempre(historico, itens);
  const faltaNaLista = lista.ultima ? juntar(itens, lista.ultima).length - itens.length : 0;
  const cats = CATEGORIAS_POR_TIPO[lista.tipo] || CATEGORIAS_POR_TIPO.outros;
  if (!cats.includes(categoriaDaGrade)) categoriaDaGrade = cats[0];
  const naLista = new Map(itens.map((i) => [i.nome.toLowerCase(), i]));
  const grade = gradeDaCategoria(historico, categoriaDaGrade);
  caixa.innerHTML = `
    <form class="novo" id="fNovo" autocomplete="off">
      <div class="entrada${Reconhecimento ? ' com-mic' : ''}">
        <input class="texto" id="nTexto" placeholder="Ex.: 2 kg frango, pão, 6 leite" enterkeyhint="done" autocapitalize="sentences" aria-label="Itens para adicionar">
        ${Reconhecimento ? `<button class="btn mic" id="nMic" type="button" aria-label="Falar os itens" aria-pressed="false">${MICROFONE}</button>` : ''}
        <button class="btn primario" type="submit">Adicionar</button>
      </div>
      <div class="chips" id="nSug" aria-label="Sugestões"></div>
      <ul class="previa" id="nPrevia" hidden></ul>
      <p class="obs" id="nDica">${Reconhecimento
        ? 'Toque no microfone e fale um item de cada vez, com uma pausa entre eles: “dois quilos de frango… pão… seis leites”. Confira e toque em Adicionar.'
        : 'Prefere falar? Toque no microfone do teclado e diga, por exemplo: “dois quilos de frango, pão e seis leites”.'}</p>
    </form>
    ${sempre.length ? `<div class="atalho"><h2><span>Itens de sempre</span></h2><div class="chips">${sempre.map((h, n) => `<button class="chip" type="button" data-sempre="${n}">+ ${esc(h.nome)}${h.qtd != null ? ` <span class="cinza">${formatarNumero(h.qtd)} ${esc(h.un)}</span>` : ''}</button>`).join('')}</div></div>` : ''}
    ${faltaNaLista > 0 ? `<button class="btn repetir" id="nRepetir" type="button">↻ Repetir a última compra <span class="cinza">(+${plural(faltaNaLista, 'item', 'itens')})</span></button>` : ''}
    <div class="atalho grade-bloco">
      <h2><span>Escolher por categoria</span></h2>
      <div class="abas" role="tablist" aria-label="Categorias">${cats.map((c) => `<button type="button" role="tab" class="aba" aria-selected="${c === categoriaDaGrade}" data-aba="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <div class="grade" role="tabpanel" aria-label="${esc(categoriaDaGrade)}">${grade.map((g, n) => {
        const ja = naLista.get(g.nome.toLowerCase());
        return `<button type="button" class="grade-item${ja ? ' tem' : ''}" data-grade="${n}"><span>${esc(g.nome)}</span>${ja ? `<span class="grade-qtd">${ja.qtd != null ? formatarQtd(ja) : '✓'}</span>` : ''}</button>`;
      }).join('')}</div>
      <p class="obs">Um toque põe na lista; outro toque aumenta a quantidade.</p>
    </div>`;

  const campo = $('nTexto');
  campo.value = digitado;
  if (digitado) atualizarPrevia(campo);
  campo.addEventListener('input', () => atualizarPrevia(campo));
  $('fNovo').onsubmit = (e) => {
    e.preventDefault();
    pararDeOuvir();
    const novos = paraItens(lerEntrada(campo.value));
    if (!novos.length) { campo.focus(); return; }
    campo.value = '';
    adicionar(novos);
    $('nTexto').focus();
  };
  if ($('nMic')) $('nMic').onclick = () => (ouvindo ? pararDeOuvir() : ouvir());
  caixa.querySelectorAll('[data-sempre]').forEach((b) => {
    b.onclick = () => {
      const h = sempre[Number(b.dataset.sempre)];
      adicionar([criarItem(h.nome, h.cat, h.qtd, h.un)]);
    };
  });
  if ($('nRepetir')) {
    $('nRepetir').onclick = () => {
      marcarParaDesfazer();
      const antes = itens.length;
      itens = juntar(itens, novaCompra(lista.ultima));
      guardar(); desenhar();
      aviso(`${plural(itens.length - antes, 'item voltou', 'itens voltaram')} da última compra`, true);
    };
  }
  // A aba escolhida fica à vista, mesmo quando está lá no fim da fileira.
  const abaAtual = caixa.querySelector('.aba[aria-selected="true"]');
  if (abaAtual) abaAtual.parentElement.scrollLeft = abaAtual.offsetLeft - abaAtual.parentElement.offsetLeft - 16;
  caixa.querySelectorAll('[data-aba]').forEach((b) => {
    b.onclick = () => { categoriaDaGrade = b.dataset.aba; desenharMontagem(); };
  });
  caixa.querySelectorAll('[data-grade]').forEach((b) => {
    b.onclick = () => tocarNaGrade(grade[Number(b.dataset.grade)]);
  });
}

/** Grade: o primeiro toque põe o item na lista; os seguintes somam um passo da unidade. */
function tocarNaGrade(g) {
  marcarParaDesfazer();
  const ja = itens.find((i) => i.nome.toLowerCase() === g.nome.toLowerCase());
  if (!ja) {
    const h = doHistorico(historico, g.nome);
    const item = criarItem(g.nome, g.cat, h?.qtd ?? null, h?.un || g.un);
    itens = [...itens, item];
    lembrar([item]);
    lista.compraRegistrada = false;
    guardar(); desenhar();
    aviso(`${g.nome} adicionado`, true);
    return;
  }
  const passo = PASSO[ja.un] || 1;
  ja.qtd = ja.qtd == null ? passo : ja.qtd + passo;
  ja.feito = false;
  lembrar([ja], false);
  guardar(); desenhar();
  aviso(`${ja.nome}: ${formatarQtd(ja)}`, true);
}

/**
 * Microfone do app: cada pausa vira um item separado por vírgula, e o texto
 * fica na caixa para a pessoa conferir na prévia antes de adicionar.
 */
function ouvir() {
  const campo = $('nTexto'), bt = $('nMic'), dica = $('nDica');
  if (!campo || !bt) return;
  const rec = new Reconhecimento();
  rec.lang = 'pt-BR';
  rec.continuous = true;
  rec.interimResults = true;
  const inicio = campo.value.trim();
  const finais = [];
  rec.onresult = (e) => {
    let parcial = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript.trim();
      if (!t) continue;
      if (e.results[i].isFinal) finais.push(t); else parcial = t;
    }
    campo.value = [inicio, ...finais, parcial].filter(Boolean).join(', ');
    atualizarPrevia(campo);
  };
  rec.onerror = (e) => {
    const motivo = {
      'not-allowed': 'Libere o microfone para o NaLista nas permissões do navegador.',
      'service-not-allowed': 'Libere o microfone para o NaLista nas permissões do navegador.',
      network: 'Falar precisa de internet. Sem sinal, use o microfone do teclado.',
      'no-speech': 'Não ouvi nada. Toque no microfone e tente de novo.',
      'audio-capture': 'Não encontrei o microfone do aparelho.',
    }[e.error];
    if (motivo) aviso(motivo);
  };
  rec.onend = () => {
    ouvindo = null;
    const b = $('nMic');
    if (b) { b.classList.remove('ouvindo'); b.setAttribute('aria-pressed', 'false'); }
    const d = $('nDica');
    if (d && finais.length) d.textContent = 'Confira a prévia e toque em Adicionar.';
  };
  try { rec.start(); } catch { aviso('Não deu para ligar o microfone agora.'); return; }
  ouvindo = rec;
  bt.classList.add('ouvindo');
  bt.setAttribute('aria-pressed', 'true');
  if (dica) dica.textContent = 'Ouvindo… fale um item de cada vez. Toque no microfone para parar.';
}

function pararDeOuvir() {
  if (ouvindo) { try { ouvindo.stop(); } catch { /* já parou */ } }
}

/** Prévia do que vai entrar e sugestões para a palavra que está sendo digitada. */
function atualizarPrevia(campo) {
  const valor = campo.value;
  const novos = paraItens(lerEntrada(valor));
  const previa = $('nPrevia');
  previa.hidden = !novos.length;
  previa.innerHTML = novos.map((i) => {
    const ja = itens.some((x) => x.nome.toLowerCase() === i.nome.toLowerCase());
    const q = formatarQtd(i);
    return `<li><b>${esc(i.nome)}</b>${q ? ` <span class="qtd">${q}</span>` : ''}<span class="cinza"> · ${esc(i.cat)}</span>${ja ? ' <span class="ja">já na lista: soma</span>' : ''}</li>`;
  }).join('');

  const sug = $('nSug');
  sug.innerHTML = '';
  // Só sugere enquanto a pessoa ainda está escrevendo o último item.
  if (/[,;]\s*$/.test(valor) || /\se\s*$/.test(valor)) return;
  const pedacos = separarItens(valor);
  const ultimo = pedacos[pedacos.length - 1];
  if (!ultimo) return;
  const lido = lerPedaco(ultimo);
  if (!lido || lido.digitado.length < 2) return;
  const opcoes = sugerir(historico, lido.digitado, 5);
  const inicioDoPedaco = valor.lastIndexOf(ultimo);
  const antesDoNome = ultimo.slice(0, ultimo.lastIndexOf(lido.digitado));
  for (const o of opcoes) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (o.doHistorico ? ' meu' : '');
    b.innerHTML = esc(o.nome) + (o.doHistorico ? ' <span class="cinza">já comprou</span>' : '');
    b.onclick = () => {
      campo.value = valor.slice(0, inicioDoPedaco) + antesDoNome + o.nome + ', ';
      campo.focus();
      atualizarPrevia(campo);
    };
    sug.appendChild(b);
  }
}

// ---------------------------------------------------------------- detalhes de um item
function editarItem(item) {
  const rascunho = { ...item };
  const cats = CATEGORIAS.includes(item.cat) ? CATEGORIAS : [...CATEGORIAS, item.cat];
  abrirPainel(`<h3>Detalhes do item</h3>
    <label class="campo">Nome<input class="texto" id="dNome" value="${esc(item.nome)}" autocomplete="off"></label>
    <label class="campo">Observação<input class="texto" id="dObs" value="${esc(item.obs || '')}" placeholder="Ex.: maduras, marca X, sem lactose" autocomplete="off"></label>
    <label class="campo">Categoria<select id="dCat">${cats.map((c) => `<option ${c === item.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
    <div class="campo">Quantidade<div class="fileira"><div class="passo"><button type="button" aria-label="Menos">−</button><span></span><button type="button" aria-label="Mais">+</button></div><select id="dUn" aria-label="Unidade">${UNIDADES.map((u) => `<option ${u === item.un ? 'selected' : ''}>${u}</option>`).join('')}</select></div></div>
    <div class="fileira">
      <button class="btn primario" id="dSalvar" type="button">Salvar</button>
      <button class="btn perigo" id="dRemover" type="button">Remover</button>
    </div>
    <button class="btn discreto" data-fechar type="button">Cancelar</button>`);
  const [menos, mais] = painel.querySelectorAll('.passo button');
  ligarPasso(rascunho, menos, mais, painel.querySelector('.passo span'), $('dUn'), () => {});
  $('dSalvar').onclick = () => {
    const nome = $('dNome').value.trim();
    if (!nome) { $('dNome').focus(); return; }
    const obs = $('dObs').value.trim();
    Object.assign(item, { nome, cat: $('dCat').value, qtd: rascunho.qtd, un: rascunho.un });
    if (obs) item.obs = obs; else delete item.obs;
    guardar(); lembrar([item], false); fecharPainel(); desenhar();
  };
  $('dRemover').onclick = () => {
    marcarParaDesfazer();
    itens = itens.filter((x) => x !== item); guardar(); fecharPainel(); desenhar();
    aviso(`${item.nome} removido`, true);
  };
}

// ---------------------------------------------------------------- contagem e limpar
function atualizarContagem() {
  const r = resumoDaCompra(itens);
  $('contagem').innerHTML = editando
    ? `<b>${r.total}</b> ${r.total === 1 ? 'item' : 'itens'} na lista`
    : `<b>${r.pegos}</b> de ${r.total} no carrinho${r.faltaram ? ` · ${r.faltaram} não tinha` : ''}`;
  // A dica some quando a compra começa, para a contagem caber numa linha.
  $('dica').textContent = editando ? 'Toque no nome para detalhes' : (r.resolvidos ? '' : 'Toque para marcar');
  $('barra').style.width = r.total && !editando ? `${(r.resolvidos / r.total) * 100}%` : '0';

  // Total gasto e orçamento: só na hora da compra.
  const gasto = $('gasto');
  gasto.hidden = editando || !r.total;
  const passou = orcamento && r.gasto > orcamento;
  gasto.classList.toggle('passou', !!passou);
  gasto.innerHTML = r.comPreco || orcamento
    ? `Total <b>${formatarPreco(r.gasto)}</b>${orcamento ? ` <span class="cinza">de ${formatarPreco(orcamento)}</span>` : ''}${passou ? ` · passou ${formatarPreco(Math.round((r.gasto - orcamento) * 100) / 100)} do combinado` : ''}`
    : 'Toque em <b>R$</b> no item para anotar o preço · <u>orçamento</u>';

  const concluida = !editando && r.total > 0 && r.resolvidos === r.total;
  const tudo = $('tudo');
  tudo.classList.toggle('mostrar', concluida);
  if (concluida) {
    const partes = [`${plural(r.pegos, 'item pego', 'itens pegos')}`];
    if (r.faltaram) partes.push(`${r.faltaram} não tinha`);
    if (r.comPreco) partes.push(`total ${formatarPreco(r.gasto)}`);
    tudo.innerHTML = `Tá tudo na sacola. Boa compra<span>${partes.join(' · ')}</span><button class="btn primario grande" id="tRetorno" type="button">Enviar retorno para quem fez a lista</button>`;
    $('tRetorno').onclick = enviarRetorno;
    // Compra concluída vira a "última compra", que dá para repetir depois.
    lista.ultima = novaCompra(itens);
    // Entra uma vez só nas compras anteriores, até a próxima compra começar.
    if (!lista.compraRegistrada) {
      compras = guardarCompra(compras, registroDaCompra(lista, itens));
      salvarCompras(compras);
      lista.compraRegistrada = true;
    }
    guardar();
  }
}

/**
 * Tela acesa enquanto há itens para pegar: ninguém quer desbloquear o
 * celular a cada corredor. O navegador solta sozinho ao sair do app.
 */
let travaDaTela = null;
async function manterTelaAcesa() {
  const precisa = !editando && document.visibilityState === 'visible' && itens.some((i) => !resolvido(i));
  if (!('wakeLock' in navigator)) return;
  if (precisa && !travaDaTela) {
    try {
      travaDaTela = await navigator.wakeLock.request('screen');
      travaDaTela.addEventListener('release', () => { travaDaTela = null; });
    } catch { travaDaTela = null; }
  } else if (!precisa && travaDaTela) {
    travaDaTela.release().catch(() => {}); travaDaTela = null;
  }
}
document.addEventListener('visibilitychange', manterTelaAcesa);

const bLimpar = $('limpar');
let prazo;
function rearmarLimpar() {
  clearTimeout(prazo);
  bLimpar.classList.remove('armado');
  bLimpar.textContent = editando ? 'Apagar a lista inteira' : 'Começar nova compra';
  bLimpar.hidden = !itens.length;
}
bLimpar.onclick = () => {
  if (!bLimpar.classList.contains('armado')) {
    bLimpar.classList.add('armado');
    bLimpar.textContent = 'Toque de novo para confirmar';
    prazo = setTimeout(rearmarLimpar, 3000);
    return;
  }
  marcarParaDesfazer();
  if (editando) {
    lista.ultima = novaCompra(itens);
    itens = [];
    lista.compraRegistrada = false;
  } else {
    itens = novaCompra(itens);
    lista.compraRegistrada = false;
  }
  guardar(); desenhar();
  aviso(editando ? 'Lista apagada' : 'Marcas e preços zerados', true);
};

$('bEditar').onclick = () => { editando = !editando; desenhar(); window.scrollTo({ top: 0 }); };

// ---------------------------------------------------------------- painel
const fundo = $('fundo'), painel = $('painel');
function abrirPainel(html) {
  painel.innerHTML = html;
  fundo.classList.add('aberto');
  painel.querySelectorAll('[data-fechar]').forEach((b) => { b.onclick = fecharPainel; });
}
function fecharPainel() { fundo.classList.remove('aberto'); }
fundo.addEventListener('click', (e) => { if (e.target === fundo) fecharPainel(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharPainel(); });

async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); aviso('Copiado'); return; } catch { /* segue */ }
  const ta = document.createElement('textarea');
  ta.value = texto; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); aviso('Copiado'); } catch { aviso('Não deu para copiar'); }
  ta.remove();
}

async function compartilhar(dados, reserva) {
  if (navigator.share) {
    try { await navigator.share(dados); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  copiar(reserva);
}

// ---------------------------------------------------------------- enviar
/**
 * Retorno da compra: o que pegou, o que não tinha, o que ficou e o total,
 * num link #r= para quem montou a lista (ver core/retorno.js).
 */
async function enviarRetorno() {
  const link = montarLinkDeRetorno(await codificarRetorno(itens, Date.now(), lista.nome), location.href);
  compartilhar({ title: 'NaLista', text: '🧾 Retorno da compra — toque para ver o que faltou:', url: link }, link);
}

$('bEnviar').onclick = async () => {
  if (!itens.length) { aviso('A lista está vazia'); return; }
  const link = await montarLink(novaCompra(itens), location.href, { nome: lista.nome, tipo: lista.tipo });
  const texto = paraTexto(itens, lista.nome);
  // Quem já está comprando quer devolver o resultado; quem montou quer mandar a lista.
  const comprando = itens.some(resolvido);
  const r = resumoDaCompra(itens);
  abrirPainel(`<h3>${comprando ? 'Enviar o retorno ou a lista' : 'Enviar a lista'}</h3>
    ${comprando ? `<p>O retorno mostra para quem fez a lista o que você pegou (${r.pegos}), o que não tinha (${r.faltaram}) e o que ficou sem comprar (${r.total - r.resolvidos})${r.comPreco ? `, com o total de ${formatarPreco(r.gasto)}` : ''}.</p>
    <button class="btn primario grande" id="eRetorno" type="button">Enviar retorno</button>
    <button class="btn" id="eRetornoTexto" type="button">Retorno como texto</button>
    <h4 class="sub">Ou mandar a lista</h4>` : ''}
    <p>Quem receber toca no link e a lista abre pronta no celular, com ${plural(itens.length, 'item', 'itens')}.</p>
    <button class="btn ${comprando ? '' : 'primario grande'}" id="eLink" type="button">Enviar link da lista</button>
    <div class="fileira">
      <button class="btn" id="eQr" type="button">Mostrar QR code</button>
      <button class="btn" id="eTexto" type="button">Enviar como texto</button>
    </div>
    <div id="qr" class="qr" hidden></div>
    <button class="btn discreto" data-fechar type="button">Fechar</button>`);
  if (comprando) {
    $('eRetorno').onclick = enviarRetorno;
    $('eRetornoTexto').onclick = () => { const t = textoDoRetorno(itens); compartilhar({ text: t }, t); };
  }
  $('eLink').onclick = () => compartilhar({ title: 'NaLista', text: '🛒 Chegou uma lista para você no NaLista — toque para abrir:', url: link }, link);
  $('eTexto').onclick = () => compartilhar({ text: texto }, texto);
  $('eQr').onclick = () => {
    const caixa = $('qr');
    if (!caixa.hidden) { caixa.hidden = true; return; }
    const q = qrcode(0, 'L');
    q.addData(link);
    q.make();
    caixa.innerHTML = q.createSvgTag({ cellSize: 4, margin: 3, scalable: true }) +
      '<p>Aponte a câmera do outro celular para o código.</p>';
    caixa.hidden = false;
  };
};

// ---------------------------------------------------------------- receber
function painelRecebida(novos, origem, meta) {
  const n = novos.length;
  const nomes = novos.slice(0, 8).map((i) => esc(i.nome) + (i.qtd != null ? ` <span class="cinza">${formatarQtd(i)}</span>` : '')).join(', ');
  const resto = n > 8 ? ` e mais ${n - 8}` : '';
  const tipo = meta?.tipo in TIPOS ? meta.tipo : 'outros';
  const nomeNovo = meta?.nome || 'Lista recebida';
  const atualVazia = !itens.length;
  abrirPainel(`<h3>${origem === 'link' ? 'Chegou uma lista para você' : 'Lista encontrada'}</h3>
    ${meta ? `<p class="tag-lista">${iconeTipo(tipo)}<b>${esc(meta.nome)}</b></p>` : ''}
    <p><b>${plural(n, 'item', 'itens')}:</b> ${nomes}${resto}.</p>
    ${atualVazia
      ? `<button class="btn primario grande" id="rAqui" type="button">Usar esta lista</button>`
      : `<button class="btn primario grande" id="rNova" type="button">Abrir como lista nova</button>
    <div class="fileira">
      <button class="btn" id="rJuntar" type="button">Juntar à ${esc(lista.nome)}</button>
      <button class="btn" id="rTrocar" type="button">Substituir ${esc(lista.nome)}</button>
    </div>`}
    <button class="btn discreto" data-fechar type="button">Agora não</button>`);
  const terminar = (msg, podeDesfazer = true) => { editando = false; guardar(); fecharPainel(); desenhar(); aviso(msg, podeDesfazer); };
  if ($('rAqui')) {
    $('rAqui').onclick = () => {
      marcarParaDesfazer();
      itens = novos; lista.compraRegistrada = false;
      if (meta) { lista.nome = nomeLivre({ listas: estado.listas.filter((l) => l !== lista) }, meta.nome); lista.tipo = tipo; }
      terminar('Lista recebida');
    };
    return;
  }
  $('rNova').onclick = () => {
    const nova = criarLista(nomeLivre(estado, nomeNovo), tipo, novos);
    estado.listas.push(nova);
    trocarPara(nova.id, false);
    // Lista nova não mexe em nenhuma outra: nada para desfazer.
    antesDeDesfazer = null;
    terminar(`Lista ${nova.nome} criada`, false);
  };
  $('rJuntar').onclick = () => { marcarParaDesfazer(); itens = juntar(itens, novos); lista.compraRegistrada = false; terminar('Listas juntadas'); };
  $('rTrocar').onclick = () => { marcarParaDesfazer(); itens = novos; lista.compraRegistrada = false; terminar('Lista substituída'); };
}

/** O retorno de uma compra chegou: mostra o resultado e oferece montar a próxima lista com o que faltou. */
function painelRetorno(r) {
  const faltando = oQueFaltou(r);
  const nomes = (lista) => lista.slice(0, 8).map((i) => esc(i.nome) + (i.qtd != null ? ` <span class="cinza">${formatarQtd(i)}</span>` : '')).join(', ') + (lista.length > 8 ? ` e mais ${lista.length - 8}` : '');
  const quando = r.data ? new Date(r.data).toLocaleString('pt-BR', { weekday: 'long', hour: '2-digit', minute: '2-digit' }) : '';
  abrirPainel(`<h3>${faltando.length ? 'A compra voltou' : 'Compra feita: não faltou nada'}</h3>
    <p>${quando ? `Feita ${esc(quando)}. ` : ''}<b>${plural(r.pegos.length, 'item comprado', 'itens comprados')}</b>${r.gasto ? `, total de <b>${formatarPreco(r.gasto)}</b>` : ''}.</p>
    ${r.faltaram.length ? `<p><b>Não tinha (${r.faltaram.length}):</b> ${nomes(r.faltaram)}.</p>` : ''}
    ${r.naoComprados.length ? `<p><b>Não comprou (${r.naoComprados.length}):</b> ${nomes(r.naoComprados)}.</p>` : ''}
    ${faltando.length ? `
    <button class="btn primario grande" id="vNova" type="button">Fazer lista com o que faltou</button>
    ${itens.length ? '<button class="btn" id="vJuntar" type="button">Juntar o que faltou à minha lista</button>' : ''}
    <button class="btn discreto" data-fechar type="button">Só ver</button>`
    : '<button class="btn primario grande" data-fechar type="button">Ok</button>'}`);
  // O retorno vale para a lista de mesmo nome, se houver; senão, para a aberta.
  const daLista = r.lista && estado.listas.find((l) => l.nome.toLowerCase() === r.lista.toLowerCase());
  if (daLista && daLista !== lista) trocarPara(daLista.id, false);
  // A compra que voltou vira a "última compra" dessa lista e entra nas compras anteriores.
  const todos = [...r.pegos.map((i) => ({ ...i, feito: true })), ...r.faltaram.map((i) => ({ ...i, faltou: true })), ...r.naoComprados];
  lista.ultima = novaCompra(todos);
  if (!compras.some((c) => c.origem === 'retorno' && c.data === r.data && c.lista === (r.lista || lista.nome))) {
    compras = guardarCompra(compras, registroDaCompra({ nome: r.lista || lista.nome, tipo: lista.tipo }, todos, r.data || Date.now(), 'retorno'));
    salvarCompras(compras);
  }
  guardar();
  desenhar();
  if ($('vNova')) {
    $('vNova').onclick = () => {
      marcarParaDesfazer();
      itens = faltando; editando = false; guardar(); fecharPainel(); desenhar();
      aviso(`Lista nova com ${plural(faltando.length, 'item', 'itens')}`, true);
    };
  }
  if ($('vJuntar')) {
    $('vJuntar').onclick = () => {
      marcarParaDesfazer();
      itens = juntar(itens, faltando); editando = false; guardar(); fecharPainel(); desenhar();
      aviso('O que faltou entrou na sua lista', true);
    };
  }
}

/**
 * Qualquer coisa que chegou (link de lista, link de retorno, texto colado
 * ou compartilhado): decide sozinho o que é e abre o painel certo.
 * Devolve false quando não achou nada.
 */
async function receber(texto, origem) {
  try {
    const retorno = codigoDeRetorno(texto);
    if (retorno) { painelRetorno(await decodificarRetorno(retorno)); return true; }
    const codigo = codigoDoEndereco(texto);
    const { itens: novos, meta } = codigo ? await decodificarLista(codigo) : { itens: lerTexto(texto), meta: null };
    if (!novos.length) return false;
    painelRecebida(novos, codigo ? 'link' : origem, meta);
    return true;
  } catch {
    return false;
  }
}

$('bImportar').onclick = () => {
  abrirPainel(`<h3>Importar uma lista</h3>
    <p>Cole o link ou o texto que você recebeu, da lista ou do retorno da compra. Também serve uma lista simples, um item por linha ou separada por vírgula.</p>
    <textarea id="iTexto" placeholder="Cole aqui"></textarea>
    <button class="btn primario grande" id="iLer" type="button">Continuar</button>
    <button class="btn discreto" data-fechar type="button">Fechar</button>`);
  $('iLer').onclick = async () => {
    if (!(await receber($('iTexto').value, 'texto'))) aviso('Nenhum item encontrado');
  };
};

async function lerLinkDoEndereco() {
  const hash = location.hash;
  if (!codigoDoEndereco(hash) && !codigoDeRetorno(hash)) return;
  // Tira o código do endereço: recarregar a página não pergunta de novo.
  history.replaceState(null, '', location.pathname + location.search);
  if (!(await receber(hash, 'link'))) aviso('Esse link está incompleto');
}
addEventListener('hashchange', lerLinkDoEndereco);

/**
 * Menu "Compartilhar" do Android: com o app instalado, quem recebe uma
 * lista no WhatsApp compartilha com o "NaLista" e ela chega aqui como
 * `?text=...` (ver share_target no manifest).
 */
async function lerCompartilhado() {
  const p = new URLSearchParams(location.search);
  const texto = ['title', 'text', 'url'].map((k) => p.get(k)).filter(Boolean).join('\n');
  if (!texto) return;
  history.replaceState(null, '', location.pathname);
  if (!(await receber(texto, 'texto'))) aviso('Não encontrei itens no que foi compartilhado');
}

// ---------------------------------------------------------------- várias listas
/** Abre outra lista. `redesenhar` = false quando quem chama ainda vai mexer e desenhar. */
function trocarPara(id, redesenhar = true) {
  guardar();
  estado.ativa = id;
  lista = listaAtiva(estado);
  itens = lista.itens;
  salvarListas(estado);
  if (redesenhar) { editando = !itens.length; desenhar(); window.scrollTo({ top: 0 }); }
}

const resumoDaLista = (l) => {
  const pendentes = l.itens.filter((i) => !resolvido(i)).length;
  if (!l.itens.length) return 'vazia';
  return pendentes === l.itens.length ? plural(l.itens.length, 'item', 'itens') : `${pendentes} de ${l.itens.length} para pegar`;
};

const escolhaDeTipo = (atual) => `<div class="tipos" role="radiogroup" aria-label="Tipo de lista">${Object.entries(TIPOS).map(([id, t]) =>
  `<label class="tipo"><input type="radio" name="tipo" value="${id}" ${id === atual ? 'checked' : ''}>${iconeTipo(id)}<span>${t.nome}</span></label>`).join('')}</div>`;

function painelListas() {
  abrirPainel(`<h3>Suas listas</h3>
    <ul class="listas">${listasPorUso(estado).map((l) => `<li><button type="button" class="lista-linha${l.id === lista.id ? ' atual' : ''}" data-lista="${l.id}">${iconeTipo(l.tipo)}<span class="nome">${esc(l.nome)}<small>${resumoDaLista(l)}</small></span>${l.id === lista.id ? '<span class="aberta">aberta</span>' : ''}</button></li>`).join('')}</ul>
    <button class="btn primario grande" id="lNova" type="button">+ Nova lista</button>
    <div class="fileira">
      <button class="btn" id="lEditar" type="button">Renomear ${esc(lista.nome)}</button>
      ${estado.listas.length > 1 ? '<button class="btn perigo" id="lApagar" type="button">Apagar</button>' : ''}
    </div>
    <div class="fileira">
      <button class="btn" id="lCompras" type="button">Compras anteriores</button>
      <button class="btn" id="lBackup" type="button">Backup</button>
    </div>
    <button class="btn discreto" data-fechar type="button">Fechar</button>`);
  painel.querySelectorAll('[data-lista]').forEach((b) => {
    b.onclick = () => { fecharPainel(); if (b.dataset.lista !== lista.id) trocarPara(b.dataset.lista); };
  });
  $('lNova').onclick = () => painelDaLista(null);
  $('lEditar').onclick = () => painelDaLista(lista);
  $('lCompras').onclick = painelCompras;
  $('lBackup').onclick = painelBackup;
  const apagar = $('lApagar');
  if (apagar) {
    apagar.onclick = () => {
      if (!apagar.classList.contains('armado')) { apagar.classList.add('armado'); apagar.textContent = 'Toque de novo'; return; }
      const nome = lista.nome;
      estado.listas = estado.listas.filter((l) => l !== lista);
      estado.ativa = listasPorUso(estado)[0].id;
      lista = listaAtiva(estado); itens = lista.itens;
      salvarListas(estado); fecharPainel(); editando = false; desenhar();
      aviso(`Lista ${nome} apagada`);
    };
  }
}

/** Criar (lista = null) ou renomear/mudar o tipo de uma lista. */
function painelDaLista(alvo) {
  const tipoInicial = alvo ? alvo.tipo : 'mercado';
  abrirPainel(`<h3>${alvo ? 'Renomear a lista' : 'Nova lista'}</h3>
    ${escolhaDeTipo(tipoInicial)}
    <label class="campo">Nome<input class="texto" id="nlNome" value="${alvo ? esc(alvo.nome) : ''}" placeholder="${TIPOS[tipoInicial].nome}" autocomplete="off" maxlength="60"></label>
    ${alvo ? '' : `<label class="marcar"><input type="checkbox" id="nlSempre" ${deSempre(historico, []).length ? 'checked' : ''}> Começar com os itens de sempre deste tipo</label>`}
    <button class="btn primario grande" id="nlSalvar" type="button">${alvo ? 'Salvar' : 'Criar lista'}</button>
    <button class="btn discreto" data-fechar type="button">Cancelar</button>`);
  const nome = $('nlNome');
  const tipoEscolhido = () => painel.querySelector('input[name=tipo]:checked')?.value || 'outros';
  painel.querySelectorAll('input[name=tipo]').forEach((r) => { r.onchange = () => { nome.placeholder = TIPOS[tipoEscolhido()].nome; }; });
  $('nlSalvar').onclick = () => {
    const tipo = tipoEscolhido();
    const texto = nome.value.trim() || TIPOS[tipo].nome;
    if (alvo) {
      alvo.nome = alvo.nome.toLowerCase() === texto.toLowerCase() ? texto : nomeLivre({ listas: estado.listas.filter((l) => l !== alvo) }, texto);
      alvo.tipo = tipo;
      guardar(); fecharPainel(); desenhar();
      return;
    }
    // Itens de sempre que já apareceram em listas deste tipo.
    const doTipo = new Set(estado.listas.filter((l) => l.tipo === tipo).flatMap((l) => [...l.itens, ...(l.ultima || [])].map((i) => i.nome.toLowerCase())));
    const iniciais = $('nlSempre')?.checked
      ? deSempre(historico, []).filter((h) => doTipo.has(h.nome.toLowerCase())).map((h) => criarItem(h.nome, h.cat, h.qtd, h.un))
      : [];
    const nova = criarLista(nomeLivre(estado, texto), tipo, iniciais);
    estado.listas.push(nova);
    fecharPainel();
    trocarPara(nova.id, false);
    editando = true; desenhar(); window.scrollTo({ top: 0 });
    aviso(iniciais.length ? `${nova.nome} criada com ${plural(iniciais.length, 'item de sempre', 'itens de sempre')}` : `${nova.nome} criada`);
  };
}

$('bListas').onclick = painelListas;

// ---------------------------------------------------------------- compras anteriores
const dataCurta = (ms) => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');

function painelCompras() {
  const mes = totalDoMes(compras);
  abrirPainel(`<h3>Compras anteriores</h3>
    ${compras.length ? `<p>Este mês: <b>${plural(mes.compras, 'compra', 'compras')}</b>${mes.gasto ? `, <b>${formatarPreco(mes.gasto)}</b> anotados` : ''}.</p>
    <ul class="listas">${compras.slice(0, 30).map((c, n) => `<li><button type="button" class="lista-linha" data-compra="${n}">${iconeTipo(c.tipo)}<span class="nome">${esc(c.lista)} <span class="cinza">· ${dataCurta(c.data)}</span><small>${plural(c.pegos.length, 'pego', 'pegos')}${c.faltaram.length ? ` · ${c.faltaram.length} não tinha` : ''}${c.naoComprados.length ? ` · ${c.naoComprados.length} ficou` : ''}${c.origem === 'retorno' ? ' · retorno' : ''}</small></span>${c.gasto ? `<span class="valor">${formatarPreco(c.gasto)}</span>` : ''}</button></li>`).join('')}</ul>`
    : '<p>Quando uma compra termina (tudo marcado ou com "não tinha"), ela aparece aqui com o que foi pego, o que faltou e quanto deu. Retornos que você recebe também entram.</p>'}
    <button class="btn discreto" data-fechar type="button">Fechar</button>`);
  painel.querySelectorAll('[data-compra]').forEach((b) => { b.onclick = () => painelUmaCompra(compras[Number(b.dataset.compra)]); });
}

function painelUmaCompra(c) {
  const faltando = itensQueFaltaram(c);
  const lista_ = (nomes) => nomes.slice(0, 12).map(esc).join(', ') + (nomes.length > 12 ? ` e mais ${nomes.length - 12}` : '');
  abrirPainel(`<h3>${esc(c.lista)} · ${dataCurta(c.data)}</h3>
    <p><b>${plural(c.pegos.length, 'item pego', 'itens pegos')}</b>${c.gasto ? `, total de <b>${formatarPreco(c.gasto)}</b>` : ''}${c.pegos.length ? `: ${lista_(c.pegos)}` : ''}.</p>
    ${c.faltaram.length ? `<p><b>Não tinha:</b> ${lista_(c.faltaram)}.</p>` : ''}
    ${c.naoComprados.length ? `<p><b>Ficou sem comprar:</b> ${lista_(c.naoComprados)}.</p>` : ''}
    ${faltando.length ? `<button class="btn primario grande" id="cFaltou" type="button">Pôr o que faltou em ${esc(lista.nome)}</button>` : ''}
    <button class="btn" id="cRepetir" type="button">Repetir esta compra em ${esc(lista.nome)}</button>
    <button class="btn discreto" id="cVoltar" type="button">Voltar</button>`);
  const aplicar = (novos, msg) => {
    marcarParaDesfazer();
    itens = juntar(itens, novos); lista.compraRegistrada = false;
    guardar(); fecharPainel(); editando = false; desenhar(); aviso(msg, true);
  };
  if ($('cFaltou')) $('cFaltou').onclick = () => aplicar(faltando, `${plural(faltando.length, 'item entrou', 'itens entraram')} na lista`);
  $('cRepetir').onclick = () => aplicar(c.itens.map((i) => ({ ...i })), 'Compra repetida na lista');
  $('cVoltar').onclick = painelCompras;
}

// ---------------------------------------------------------------- backup
function painelBackup() {
  const n = estado.listas.length;
  abrirPainel(`<h3>Backup</h3>
    <p>As listas ficam só neste aparelho. O backup salva tudo num arquivo (${plural(n, 'lista', 'listas')}, ${plural(compras.length, 'compra anterior', 'compras anteriores')} e o que você costuma comprar) para guardar ou levar para outro celular.</p>
    <button class="btn primario grande" id="bkSalvar" type="button">Salvar backup</button>
    <label class="btn arquivo">Restaurar de um arquivo<input type="file" id="bkArquivo" accept="application/json,.json"></label>
    <button class="btn discreto" data-fechar type="button">Fechar</button>`);
  $('bkSalvar').onclick = async () => {
    guardar();
    const conteudo = JSON.stringify(montarBackup(lerTudo()), null, 1);
    const nome = nomeDoArquivo();
    const arquivo = new File([conteudo], nome, { type: 'application/json' });
    // No celular, compartilhar o arquivo deixa salvar no Drive ou mandar para si mesmo.
    if (navigator.canShare?.({ files: [arquivo] })) {
      try { await navigator.share({ files: [arquivo], title: 'Backup do NaLista' }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(arquivo);
    const a = document.createElement('a');
    a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    aviso('Backup salvo');
  };
  $('bkArquivo').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    let dados;
    try { dados = lerBackup(await f.text()); } catch (erro) { aviso(erro.message); return; }
    const quando = new Date(dados.exportadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    abrirPainel(`<h3>Restaurar este backup?</h3>
      <p>Backup de <b>${esc(quando)}</b>, com ${plural(dados.listas.listas.length, 'lista', 'listas')} e ${plural((dados.compras || []).length, 'compra anterior', 'compras anteriores')}.</p>
      <p>Tudo o que está neste aparelho agora será trocado pelo que está no backup.</p>
      <button class="btn primario grande" id="bkConfirmar" type="button">Restaurar</button>
      <button class="btn discreto" data-fechar type="button">Cancelar</button>`);
    $('bkConfirmar').onclick = () => { gravarTudo(dados); location.reload(); };
  };
}

// ---------------------------------------------------------------- instalar e atualizar
const faixa = $('faixa');
function mostrarFaixa(html, aoClicar) {
  faixa.innerHTML = html;
  faixa.hidden = false;
  faixa.querySelector('[data-acao]').onclick = aoClicar;
  faixa.querySelector('[data-dispensar]')?.addEventListener('click', () => { faixa.hidden = true; });
}

const instalado = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
let pedidoDeInstalacao = null;
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  pedidoDeInstalacao = e;
  mostrarFaixa('<span>Instale a lista no celular para abrir como app, mesmo sem internet.</span><button class="btn primario" data-acao type="button">Instalar</button><button class="x" data-dispensar type="button" aria-label="Dispensar">×</button>', async () => {
    faixa.hidden = true;
    pedidoDeInstalacao.prompt();
    pedidoDeInstalacao = null;
  });
});
addEventListener('appinstalled', () => { faixa.hidden = true; });

// No iPhone não existe o pedido de instalação: o caminho é pelo Safari.
const ehIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
let dispensouIos = false;
try { dispensouIos = localStorage.getItem('lista-dica-ios') === '1'; } catch { /* ok */ }
if (ehIos && !instalado && !dispensouIos) {
  mostrarFaixa('<span>Para instalar: toque em <b>Compartilhar</b> no Safari e depois em <b>Adicionar à Tela de Início</b>.</span><button class="btn" data-acao type="button">Entendi</button>', () => {
    faixa.hidden = true;
    try { localStorage.setItem('lista-dica-ios', '1'); } catch { /* ok */ }
  });
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // Só avisa de versão nova se já havia uma versão controlando a página;
  // na primeira visita a troca de controle é só a instalação.
  const tinhaVersao = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!tinhaVersao) return;
    mostrarFaixa('<span>Saiu uma versão nova da lista.</span><button class="btn primario" data-acao type="button">Atualizar</button>', () => location.reload());
  });
  addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}

// ---------------------------------------------------------------- início
desenhar();
lerLinkDoEndereco();
lerCompartilhado();
