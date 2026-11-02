import qrcode from 'qrcode-generator';
// Fontes empacotadas no app (só o alfabeto latino): funcionam offline.
import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import '@fontsource/bricolage-grotesque/latin-600.css';
import '@fontsource/bricolage-grotesque/latin-800.css';
import './styles.css';
import { CATEGORIAS, UNIDADES, PASSO, adivinharCategoria } from './core/categorias.js';
import {
  criarItem, formatarNumero, formatarQtd, categoriasEmUso, juntar, LISTA_INICIAL,
} from './core/lista.js';
import { paraTexto, lerTexto } from './core/texto.js';
import { montarLink, decodificar, codigoDoEndereco } from './core/link.js';
import { carregar, salvar } from './storage.js';

// ---------------------------------------------------------------- estado
let itens = carregar() || LISTA_INICIAL;
let editando = false;
const guardar = () => salvar(itens);

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));
const MARCA = '<svg viewBox="0 0 24 24" fill="none" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

// ---------------------------------------------------------------- lista
function desenhar() {
  const lista = $('lista');
  lista.innerHTML = '';
  if (!itens.length) {
    lista.innerHTML = '<p class="vazio">Lista vazia. Toque em <b>Editar</b> para adicionar itens ou em <b>Importar</b> para colar uma lista.</p>';
  }
  for (const cat of categoriasEmUso(itens)) {
    const doGrupo = itens.filter((i) => i.cat === cat);
    const sec = document.createElement('section');
    const contagem = editando ? doGrupo.length : `${doGrupo.filter((i) => i.feito).length}/${doGrupo.length}`;
    sec.innerHTML = `<h2><span>${esc(cat)}</span><span>${contagem}</span></h2>`;
    const ul = document.createElement('ul');
    for (const item of doGrupo) ul.appendChild(editando ? linhaEdicao(item) : linhaCompra(item));
    sec.appendChild(ul);
    lista.appendChild(sec);
  }
  desenharAdicionar();
  atualizarContagem();
  $('bEditar').textContent = editando ? 'Pronto' : 'Editar';
  $('bEditar').classList.toggle('primario', editando);
  $('dica').textContent = editando ? 'Ajuste as quantidades' : 'Toque para marcar';
  rearmarLimpar();
}

function linhaCompra(item) {
  const li = document.createElement('li');
  const q = formatarQtd(item);
  li.innerHTML = `<label class="linha"><input type="checkbox" ${item.feito ? 'checked' : ''}><span class="caixa">${MARCA}</span><span class="nome">${esc(item.nome)}</span>${q ? `<span class="qtd">${q}</span>` : ''}</label>`;
  li.querySelector('input').addEventListener('change', (e) => {
    item.feito = e.target.checked; guardar(); atualizarContagem();
    e.target.closest('section').querySelector('h2 span:last-child').textContent =
      (() => { const g = itens.filter((i) => i.cat === item.cat); return `${g.filter((i) => i.feito).length}/${g.length}`; })();
  });
  return li;
}

function linhaEdicao(item) {
  const li = document.createElement('li');
  li.innerHTML = `<div class="linha-ed"><span class="nome">${esc(item.nome)}</span><div class="passo"><button type="button" aria-label="Menos">−</button><span></span><button type="button" aria-label="Mais">+</button></div><select aria-label="Unidade">${UNIDADES.map((u) => `<option ${u === item.un ? 'selected' : ''}>${u}</option>`).join('')}</select><button class="remover" type="button" aria-label="Remover ${esc(item.nome)}">×</button></div>`;
  const [menos, mais] = li.querySelectorAll('.passo button');
  const valor = li.querySelector('.passo span');
  const passo = () => PASSO[item.un] || 1;
  const mostrar = () => { valor.textContent = item.qtd == null ? '–' : formatarNumero(item.qtd); guardar(); };
  mais.onclick = () => { item.qtd = item.qtd == null ? passo() : item.qtd + passo(); mostrar(); };
  menos.onclick = () => {
    if (item.qtd == null) return;
    item.qtd -= passo();
    if (item.qtd <= 0.0001) item.qtd = null;
    mostrar();
  };
  li.querySelector('select').onchange = (e) => {
    item.un = e.target.value;
    // Trocar g ↔ outra unidade com o número antigo daria "500 kg" ou "1 g".
    if (item.qtd != null && item.un === 'g' && item.qtd < 100) item.qtd = 100;
    else if (item.qtd != null && item.un !== 'g' && item.qtd >= 100) item.qtd = 1;
    mostrar();
  };
  li.querySelector('.remover').onclick = () => { itens = itens.filter((x) => x !== item); guardar(); desenhar(); };
  mostrar();
  return li;
}

function desenharAdicionar() {
  const caixa = $('adicionar');
  if (!editando) { caixa.innerHTML = ''; return; }
  caixa.innerHTML = `<form class="novo" id="fNovo"><input class="texto" id="nNome" placeholder="Novo item (ex.: Tomate)" autocomplete="off" enterkeyhint="done"><div class="duas"><select id="nCat" aria-label="Categoria">${CATEGORIAS.map((c) => `<option>${c}</option>`).join('')}</select><button class="btn primario" type="submit">Adicionar</button></div></form><p class="obs">A categoria é escolhida pelo nome; troque se quiser.</p>`;
  const nome = $('nNome'), cat = $('nCat');
  let escolhida = false;
  nome.oninput = () => { if (!escolhida) cat.value = adivinharCategoria(nome.value); };
  cat.onchange = () => { escolhida = true; };
  $('fNovo').onsubmit = (e) => {
    e.preventDefault();
    const v = nome.value.trim();
    if (!v) return;
    itens.push(criarItem(v, cat.value));
    guardar(); desenhar();
    $('nNome').focus();
  };
}

function atualizarContagem() {
  const total = itens.length, feitos = itens.filter((i) => i.feito).length;
  $('contagem').innerHTML = editando
    ? `<b>${total}</b> ${total === 1 ? 'item' : 'itens'} na lista`
    : `<b>${feitos}</b> de ${total} no carrinho`;
  $('barra').style.width = total ? `${(feitos / total) * 100}%` : '0';
  $('tudo').classList.toggle('mostrar', !editando && total > 0 && feitos === total);
}

// Desmarcar tudo / Apagar a lista: pede um segundo toque para confirmar.
const bLimpar = $('limpar');
let prazo;
function rearmarLimpar() {
  clearTimeout(prazo);
  bLimpar.classList.remove('armado');
  bLimpar.textContent = editando ? 'Apagar a lista inteira' : 'Desmarcar tudo';
}
bLimpar.onclick = () => {
  if (!bLimpar.classList.contains('armado')) {
    bLimpar.classList.add('armado');
    bLimpar.textContent = 'Toque de novo para confirmar';
    prazo = setTimeout(rearmarLimpar, 3000);
    return;
  }
  if (editando) itens = []; else itens.forEach((i) => { i.feito = false; });
  guardar(); desenhar();
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

function aviso(msg) {
  const t = $('aviso');
  t.textContent = msg;
  t.classList.add('mostrar');
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => t.classList.remove('mostrar'), 2000);
}

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
$('bEnviar').onclick = async () => {
  if (!itens.length) { aviso('A lista está vazia'); return; }
  const link = await montarLink(itens.map((i) => ({ ...i, feito: false })), location.href);
  const texto = paraTexto(itens);
  const n = itens.length;
  abrirPainel(`<h3>Enviar a lista</h3>
    <p>Quem receber toca no link e a lista abre pronta no celular, com ${n} ${n === 1 ? 'item' : 'itens'}.</p>
    <button class="btn primario grande" id="eLink" type="button">Enviar link</button>
    <div class="fileira">
      <button class="btn" id="eQr" type="button">Mostrar QR code</button>
      <button class="btn" id="eTexto" type="button">Enviar como texto</button>
    </div>
    <div id="qr" class="qr" hidden></div>
    <button class="btn discreto" data-fechar type="button">Fechar</button>`);
  $('eLink').onclick = () => compartilhar({ title: 'Lista de Compras', text: '🛒 Lista de compras — toque para abrir:', url: link }, link);
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
function painelRecebida(novos, origem) {
  const n = novos.length;
  const nomes = novos.slice(0, 8).map((i) => esc(i.nome) + (i.qtd != null ? ` <span class="cinza">${formatarQtd(i)}</span>` : '')).join(', ');
  const resto = n > 8 ? ` e mais ${n - 8}` : '';
  abrirPainel(`<h3>${origem === 'link' ? 'Você recebeu uma lista' : 'Lista encontrada'}</h3>
    <p><b>${n} ${n === 1 ? 'item' : 'itens'}:</b> ${nomes}${resto}.</p>
    ${itens.length ? `<p>Sua lista atual tem ${itens.length} ${itens.length === 1 ? 'item' : 'itens'}. Juntar mantém os dois, sem repetir.</p>` : ''}
    <div class="fileira">
      <button class="btn primario" id="rTrocar" type="button">${itens.length ? 'Substituir' : 'Usar esta lista'}</button>
      ${itens.length ? '<button class="btn" id="rJuntar" type="button">Juntar</button>' : ''}
    </div>
    <button class="btn discreto" data-fechar type="button">Agora não</button>`);
  const aplicar = (trocar) => {
    itens = trocar ? novos : juntar(itens, novos);
    editando = false; guardar(); fecharPainel(); desenhar();
    aviso(trocar ? 'Lista recebida' : 'Listas juntadas');
  };
  $('rTrocar').onclick = () => aplicar(true);
  if ($('rJuntar')) $('rJuntar').onclick = () => aplicar(false);
}

$('bImportar').onclick = () => {
  abrirPainel(`<h3>Importar uma lista</h3>
    <p>Cole o link ou o texto que você recebeu. Também serve uma lista simples, um item por linha (ex.: "2 kg frango", "Leite - 6 cx").</p>
    <textarea id="iTexto" placeholder="Cole aqui"></textarea>
    <button class="btn primario grande" id="iLer" type="button">Continuar</button>
    <button class="btn discreto" data-fechar type="button">Fechar</button>`);
  $('iLer').onclick = async () => {
    const texto = $('iTexto').value;
    const codigo = codigoDoEndereco(texto);
    let novos = [];
    try { novos = codigo ? await decodificar(codigo) : lerTexto(texto); } catch { novos = []; }
    if (!novos.length) { aviso('Nenhum item encontrado'); return; }
    painelRecebida(novos, 'texto');
  };
};

async function lerLinkDoEndereco() {
  const codigo = codigoDoEndereco(location.hash);
  if (!codigo) return;
  // Tira a lista do endereço: recarregar a página não pergunta de novo.
  history.replaceState(null, '', location.pathname + location.search);
  try {
    const novos = await decodificar(codigo);
    if (novos.length) painelRecebida(novos, 'link');
  } catch {
    aviso('Esse link de lista está incompleto');
  }
}
addEventListener('hashchange', lerLinkDoEndereco);

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
