import qrcode from 'qrcode-generator';
// Fontes empacotadas no app (só o alfabeto latino): funcionam offline.
import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import '@fontsource/bricolage-grotesque/latin-600.css';
import '@fontsource/bricolage-grotesque/latin-800.css';
import './styles.css';
import { CATEGORIAS, UNIDADES, PASSO } from './core/categorias.js';
import {
  criarItem, formatarNumero, formatarQtd, categoriasEmUso, juntar, adicionarItens, LISTA_INICIAL,
} from './core/lista.js';
import { paraTexto, lerTexto, lerEntrada, separarItens, lerPedaco } from './core/texto.js';
import { montarLink, decodificar, codigoDoEndereco } from './core/link.js';
import { registrar, doHistorico, sugerir, deSempre } from './core/historico.js';
import {
  carregar, salvar, carregarHistorico, salvarHistorico, carregarUltima, salvarUltima,
} from './storage.js';

// ---------------------------------------------------------------- estado
let itens = carregar() || LISTA_INICIAL;
let historico = carregarHistorico();
let ultima = carregarUltima();
let editando = false;
const guardar = () => salvar(itens);
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
      itens = antesDeDesfazer; antesDeDesfazer = null;
      guardar(); desenhar(); aviso('Desfeito');
    };
  }
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => t.classList.remove('mostrar', 'com-acao'), podeDesfazer ? 5000 : 2000);
}
/** Guarda a lista antes de uma mudança, para o "Desfazer" do aviso. */
const marcarParaDesfazer = () => { antesDeDesfazer = copiaDe(itens); };

// ---------------------------------------------------------------- lista
function desenhar() {
  const lista = $('lista');
  lista.innerHTML = '';
  if (!itens.length) {
    lista.innerHTML = editando
      ? '<p class="vazio">Escreva ou fale os itens na caixa acima.</p>'
      : '<p class="vazio">Lista vazia. Toque em <b>Editar</b> para montar a lista ou em <b>Importar</b> para colar uma.</p>';
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
  desenharMontagem();
  atualizarContagem();
  $('bEditar').textContent = editando ? 'Pronto' : 'Editar';
  $('bEditar').classList.toggle('primario', editando);
  $('dica').textContent = editando ? 'Toque no nome para detalhes' : 'Toque para marcar';
  rearmarLimpar();
}

const textoNome = (item) => `${esc(item.nome)}${item.obs ? `<small>${esc(item.obs)}</small>` : ''}`;

function linhaCompra(item) {
  const li = document.createElement('li');
  const q = formatarQtd(item);
  li.innerHTML = `<label class="linha"><input type="checkbox" ${item.feito ? 'checked' : ''}><span class="caixa">${MARCA}</span><span class="nome">${textoNome(item)}</span>${q ? `<span class="qtd">${q}</span>` : ''}</label>`;
  li.querySelector('input').addEventListener('change', (e) => {
    item.feito = e.target.checked; guardar(); atualizarContagem();
    const g = itens.filter((i) => i.cat === item.cat);
    e.target.closest('section').querySelector('h2 span:last-child').textContent = `${g.filter((i) => i.feito).length}/${g.length}`;
  });
  return li;
}

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
  lembrar(novos);
  guardar(); desenhar();
  const novosDeVerdade = novos.length - r.somados.length;
  const partes = [];
  if (novosDeVerdade) partes.push(novos.length === 1 ? `${novos[0].nome} adicionado` : plural(novosDeVerdade, 'item adicionado', 'itens adicionados'));
  if (r.somados.length) partes.push(`${r.somados.join(', ')} já ${r.somados.length === 1 ? 'estava' : 'estavam'} na lista: somei`);
  aviso(partes.join('. '), true);
}

function desenharMontagem() {
  const caixa = $('adicionar');
  if (!editando) { caixa.innerHTML = ''; return; }
  const sempre = deSempre(historico, itens);
  const faltaNaLista = ultima ? juntar(itens, ultima).length - itens.length : 0;
  caixa.innerHTML = `
    <form class="novo" id="fNovo" autocomplete="off">
      <div class="entrada">
        <input class="texto" id="nTexto" placeholder="Ex.: 2 kg frango, pão, 6 leite" enterkeyhint="done" autocapitalize="sentences" aria-label="Itens para adicionar">
        <button class="btn primario" type="submit">Adicionar</button>
      </div>
      <div class="chips" id="nSug" aria-label="Sugestões"></div>
      <ul class="previa" id="nPrevia" hidden></ul>
      <p class="obs">🎤 Prefere falar? Toque no microfone do teclado e diga, por exemplo: “dois quilos de frango, pão e seis leites”.</p>
    </form>
    ${sempre.length ? `<div class="atalho"><h2><span>Itens de sempre</span></h2><div class="chips">${sempre.map((h, n) => `<button class="chip" type="button" data-sempre="${n}">+ ${esc(h.nome)}${h.qtd != null ? ` <span class="cinza">${formatarNumero(h.qtd)} ${esc(h.un)}</span>` : ''}</button>`).join('')}</div></div>` : ''}
    ${faltaNaLista > 0 ? `<button class="btn repetir" id="nRepetir" type="button">↻ Repetir a última compra <span class="cinza">(+${plural(faltaNaLista, 'item', 'itens')})</span></button>` : ''}`;

  const campo = $('nTexto');
  campo.addEventListener('input', () => atualizarPrevia(campo));
  $('fNovo').onsubmit = (e) => {
    e.preventDefault();
    const novos = paraItens(lerEntrada(campo.value));
    if (!novos.length) { campo.focus(); return; }
    adicionar(novos);
    $('nTexto').focus();
  };
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
      itens = juntar(itens, ultima.map((i) => ({ ...i, feito: false })));
      guardar(); desenhar();
      aviso(`${plural(itens.length - antes, 'item voltou', 'itens voltaram')} da última compra`, true);
    };
  }
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
  const total = itens.length, feitos = itens.filter((i) => i.feito).length;
  $('contagem').innerHTML = editando
    ? `<b>${total}</b> ${total === 1 ? 'item' : 'itens'} na lista`
    : `<b>${feitos}</b> de ${total} no carrinho`;
  $('barra').style.width = total ? `${(feitos / total) * 100}%` : '0';
  const concluida = !editando && total > 0 && feitos === total;
  $('tudo').classList.toggle('mostrar', concluida);
  // Compra concluída vira a "última compra", que dá para repetir depois.
  if (concluida) { ultima = copiaDe(itens); salvarUltima(ultima); }
}

const bLimpar = $('limpar');
let prazo;
function rearmarLimpar() {
  clearTimeout(prazo);
  bLimpar.classList.remove('armado');
  bLimpar.textContent = editando ? 'Apagar a lista inteira' : 'Desmarcar tudo';
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
    ultima = copiaDe(itens); salvarUltima(ultima);
    itens = [];
  } else {
    itens.forEach((i) => { i.feito = false; });
  }
  guardar(); desenhar();
  aviso(editando ? 'Lista apagada' : 'Tudo desmarcado', true);
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
$('bEnviar').onclick = async () => {
  if (!itens.length) { aviso('A lista está vazia'); return; }
  const link = await montarLink(itens.map((i) => ({ ...i, feito: false })), location.href);
  const texto = paraTexto(itens);
  abrirPainel(`<h3>Enviar a lista</h3>
    <p>Quem receber toca no link e a lista abre pronta no celular, com ${plural(itens.length, 'item', 'itens')}.</p>
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
    <p><b>${plural(n, 'item', 'itens')}:</b> ${nomes}${resto}.</p>
    ${itens.length ? `<p>Sua lista atual tem ${plural(itens.length, 'item', 'itens')}. Juntar mantém os dois, sem repetir.</p>` : ''}
    <div class="fileira">
      <button class="btn primario" id="rTrocar" type="button">${itens.length ? 'Substituir' : 'Usar esta lista'}</button>
      ${itens.length ? '<button class="btn" id="rJuntar" type="button">Juntar</button>' : ''}
    </div>
    <button class="btn discreto" data-fechar type="button">Agora não</button>`);
  const aplicar = (trocar) => {
    marcarParaDesfazer();
    itens = trocar ? novos : juntar(itens, novos);
    editando = false; guardar(); fecharPainel(); desenhar();
    aviso(trocar ? 'Lista recebida' : 'Listas juntadas', true);
  };
  $('rTrocar').onclick = () => aplicar(true);
  if ($('rJuntar')) $('rJuntar').onclick = () => aplicar(false);
}

/** Um link ou um texto de lista: decide sozinho qual é. */
async function lerRecebido(texto) {
  const codigo = codigoDoEndereco(texto);
  try { return codigo ? await decodificar(codigo) : lerTexto(texto); } catch { return []; }
}

$('bImportar').onclick = () => {
  abrirPainel(`<h3>Importar uma lista</h3>
    <p>Cole o link ou o texto que você recebeu. Também serve uma lista simples, um item por linha ou separada por vírgula.</p>
    <textarea id="iTexto" placeholder="Cole aqui"></textarea>
    <button class="btn primario grande" id="iLer" type="button">Continuar</button>
    <button class="btn discreto" data-fechar type="button">Fechar</button>`);
  $('iLer').onclick = async () => {
    const novos = await lerRecebido($('iTexto').value);
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

/**
 * Menu "Compartilhar" do Android: com o app instalado, quem recebe uma
 * lista no WhatsApp compartilha com o "Compras" e ela chega aqui como
 * `?text=...` (ver share_target no manifest).
 */
async function lerCompartilhado() {
  const p = new URLSearchParams(location.search);
  const texto = ['title', 'text', 'url'].map((k) => p.get(k)).filter(Boolean).join('\n');
  if (!texto) return;
  history.replaceState(null, '', location.pathname);
  const novos = await lerRecebido(texto);
  if (novos.length) painelRecebida(novos, codigoDoEndereco(texto) ? 'link' : 'texto');
  else aviso('Não encontrei itens no que foi compartilhado');
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
