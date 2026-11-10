import qrcode from 'qrcode-generator';
// Fontes empacotadas no app (só o alfabeto latino): funcionam offline.
import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import '@fontsource/bricolage-grotesque/latin-600.css';
import '@fontsource/bricolage-grotesque/latin-800.css';
import './styles.css';
import { CATEGORIAS, UNIDADES, PASSO, TIPOS, CATEGORIAS_POR_TIPO } from './core/categorias.js';
import {
  criarItem, semDuzia, formatarNumero, formatarQtd, categoriasEmUso, juntar, adicionarItens, LISTA_INICIAL,
} from './core/lista.js';
import { paraTexto, lerTexto, lerEntrada, separarItens, lerPedaco } from './core/texto.js';
import { montarLink, montarLinkDeComplemento, decodificarLista, codigoDoEndereco, codigoDeRetorno, codigoDeComplemento, montarLinkDeRetorno } from './core/link.js';
import { complementar, novosDesdeOEnvio, marcarComoEnviados, textoDoComplemento, listaDoTextoDeComplemento } from './core/complemento.js';
import { criarLista, migrar, listaAtiva, nomeLivre, listasPorUso, listaDoComplemento, ligar, listaEmCompra } from './core/listas.js';
import { registroDaCompra, guardarCompra, guardarOuAtualizar, totalDoMes, itensQueFaltaram } from './core/compras.js';
import { montarBackup, lerBackup, nomeDoArquivo } from './core/backup.js';
import { modelosPara, itensDoModelo } from './core/modelos.js';
import { criarPronta, guardarPronta, existePronta, apagarPronta, renomearPronta, prontasPara, itensDaPronta, marcarUso } from './core/prontas.js';
import { codificarRetorno, decodificarRetorno, oQueFaltou, textoDoRetorno } from './core/retorno.js';
import { sugestoesDeObs, alternarObs, temObs } from './core/observacoes.js';
import { iniciarTour } from './tour.js';
import { juntarOuvidos, textoDaSessao, limparFala, separarPendente } from './core/fala.js';
import { registrar, doHistorico, sugerir, deSempre, gradeDaCategoria, esquecer, paraRevisar } from './core/historico.js';
import {
  ordenarParaCompra, resumoDaCompra, lerPreco, formatarPreco, novaCompra, resolvido,
} from './core/compra.js';
import {
  carregar, carregarHistorico, salvarHistorico, carregarUltima,
  carregarOrcamento, salvarOrcamento, carregarListas, salvarListas, carregarCompras, salvarCompras,
  lerTudo, gravarTudo, carregarProntas, salvarProntas,
  mudouEmOutroLugar, deixarParaOApp, pegarDoApp, esqueceEsperando, marcarAppUsado, appUsadoHaPouco,
} from './storage.js';

// ---------------------------------------------------------------- estado
// Várias listas: `lista` é a que está aberta e `itens` são os itens dela.
// Quem tinha a versão de uma lista só ganha a lista "Mercado" com os mesmos itens.
const guardadoAntes = carregarListas();
let estado = migrar(guardadoAntes, carregar(), LISTA_INICIAL);
if (!guardadoAntes && carregarUltima()) estado.listas[0].ultima = carregarUltima();
let lista = listaAtiva(estado);
let itens = lista.itens;
// Dúzia saiu do app: o que estiver guardado em dz vira unidades ao abrir.
let historico = Object.fromEntries(Object.entries(carregarHistorico()).map(([k, h]) => [k, semDuzia(h)]));
let prontas = carregarProntas().map((p) => ({ ...p, itens: (p.itens || []).map(semDuzia) }));
let compras = carregarCompras();
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

// Painéis que o botão voltar sabe reabrir (ver navegavel, mais abaixo).
/* eslint-disable no-func-assign */
painelItem = navegavel(painelItem);
painelEscolher = navegavel(painelEscolher);
painelDitado = navegavel(painelDitado);
painelMais = navegavel(painelMais);
painelOrcamento = navegavel(painelOrcamento);
painelEnviar = navegavel(painelEnviar);
painelRecebida = navegavel(painelRecebida);
painelComplemento = navegavel(painelComplemento);
painelRetorno = navegavel(painelRetorno);
painelImportar = navegavel(painelImportar);
painelModelos = navegavel(painelModelos);
painelModelo = navegavel(painelModelo);
painelListas = navegavel(painelListas);
painelDaLista = navegavel(painelDaLista);
painelCompras = navegavel(painelCompras);
painelUmaCompra = navegavel(painelUmaCompra);
painelBackup = navegavel(painelBackup);
painelSugestoes = navegavel(painelSugestoes);
painelTema = navegavel(painelTema);
confirmar = navegavel(confirmar);
painelSalvarPronta = navegavel(painelSalvarPronta);
painelRenomearPronta = navegavel(painelRenomearPronta);

// ---------------------------------------------------------------- avisos e desfazer
let antesDeDesfazer = null;
function aviso(msg, podeDesfazer = false, desfazerOutro = null) {
  const t = $('aviso');
  const dura = podeDesfazer ? 5000 : 2200;
  // A faixa fina embaixo vai encolhendo: mostra quanto tempo ainda dá para desfazer.
  t.innerHTML = `<span class="aviso-texto">${esc(msg)}</span>${podeDesfazer ? '<button type="button" class="aviso-acao" id="aDesfazer">Desfazer</button>' : ''}${podeDesfazer ? `<span class="aviso-tempo" style="animation-duration:${dura}ms" aria-hidden="true"></span>` : ''}`;
  t.classList.add('mostrar');
  t.classList.toggle('com-acao', podeDesfazer);
  if (podeDesfazer && desfazerOutro) {
    $('aDesfazer').onclick = () => { desfazerOutro(); t.classList.remove('mostrar', 'com-acao'); };
  } else if (podeDesfazer) {
    $('aDesfazer').onclick = () => {
      if (!antesDeDesfazer) return;
      if (antesDeDesfazer.lista !== lista.id) trocarPara(antesDeDesfazer.lista, false);
      itens = antesDeDesfazer.itens; antesDeDesfazer = null;
      guardar(); desenhar(); aviso('Desfeito');
    };
  }
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => t.classList.remove('mostrar', 'com-acao'), dura);
}
/** Guarda a lista antes de uma mudança, para o "Desfazer" do aviso. */
const marcarParaDesfazer = () => { antesDeDesfazer = { lista: lista.id, itens: copiaDe(itens) }; };

// ---------------------------------------------------------------- lista
// Uma tela só: marcar, adicionar, tirar e ajustar, sem modo de edição.
let ajustando = null; // item com − e + abertos na própria linha
const DICA_GESTOS = 'nalista-dica-gestos-v1';
const lerMarca = (k) => { try { return localStorage.getItem(k) === '1'; } catch { return true; } };
const gravarMarca = (k) => { try { localStorage.setItem(k, '1'); } catch { /* ok */ } };

function desenhar() {
  const quadro = $('lista');
  quadro.innerHTML = '';
  if (!itens.length) {
    quadro.innerHTML = '<div class="vazio"><p><b>A lista está vazia.</b><br>Escreva ou fale na barra aqui em cima, ou comece por uma lista pronta.</p><button class="btn primario grande" id="vProntas" type="button">Começar com uma lista pronta</button></div>';
  }
  if (!lerMarca(DICA_GESTOS)) {
    const d = document.createElement('div');
    d.className = 'dica-gestos';
    d.innerHTML = `<b>Primeira vez por aqui?</b>
      <p>Um tour rápido mostra o que cada parte do app faz: adicionar, falar, marcar, enviar para outra pessoa e mais.</p>
      <div class="fileira"><button class="btn primario" id="dgTour" type="button">Fazer o tour</button><button class="btn" id="dgOk" type="button">Agora não</button></div>`;
    quadro.prepend(d);
    $('dgTour').onclick = () => comecarTour();
    $('dgOk').onclick = () => { gravarMarca(DICA_GESTOS); d.remove(); aviso('O tour fica em Ajustes, quando quiser'); };
  }
  for (const [cat, doGrupo] of ordenarParaCompra(itens)) {
    const sec = document.createElement('section');
    sec.innerHTML = `<h2><span>${esc(cat)}</span><span>${doGrupo.filter(resolvido).length}/${doGrupo.length}</span></h2>`;
    const ul = document.createElement('ul');
    for (const item of doGrupo) ul.appendChild(linhaItem(item));
    sec.appendChild(ul);
    quadro.appendChild(sec);
  }
  if ($('vProntas')) $('vProntas').onclick = painelModelos;
  atualizarContagem();
  $('tituloLista').innerHTML = `${iconeTipo(lista.tipo)}<span>${esc(lista.nome)}</span>`;
  $('nListas').hidden = estado.listas.length < 2;
  $('nListas').textContent = estado.listas.length;
  document.title = `${lista.nome} · NaLista`;
  rearmarLimpar();
  manterTelaAcesa();
  if (painelAtual === 'escolher') painelEscolher();
}

function linhaItem(item) {
  const li = document.createElement('li');
  const faltou = item.faltou && !item.feito;
  li.className = 'item' + (item.feito ? ' feito' : '') + (faltou ? ' faltou' : '');
  li.dataset.nome = item.nome.toLowerCase();
  const q = formatarQtd(item);
  const preco = typeof item.preco === 'number' ? formatarPreco(item.preco) : '';
  const detalhe = [item.obs ? esc(item.obs) : '', preco ? `<span class="preco">${preco}</span>` : ''].filter(Boolean).join(' · ');
  const abrindo = ajustando === item;
  li.innerHTML = `<div class="fundo-remover" aria-hidden="true"><span>Remover</span><span>Remover</span></div>
    <div class="linha-item">
      <button class="marcar-bt" type="button" role="checkbox" aria-checked="${!!item.feito}" aria-label="${faltou ? 'Não tinha: ' : ''}${esc(item.nome)}"><span class="caixa">${MARCA}</span></button>
      <button class="nome-bt" type="button" aria-label="Detalhes de ${esc(item.nome)}"><span class="nome">${esc(item.nome)}${item.novo && !resolvido(item) ? ' <span class="selo-novo">novo</span>' : ''}${faltou ? ' <span class="tag-faltou">não tinha</span>' : ''}</span>${detalhe ? `<small>${detalhe}</small>` : ''}</button>
      ${abrindo
        ? '<div class="passo passo-linha"><button type="button" aria-label="Menos">−</button><span aria-live="polite"></span><button type="button" aria-label="Mais">+</button></div>'
        : `<button class="qtd-bt${q ? '' : ' vazia'}" type="button" aria-label="Quantidade de ${esc(item.nome)}: ${q || 'sem quantidade'}">${q || '+ qtd'}</button>`}
    </div>`;

  li.querySelector('.marcar-bt').onclick = (e) => {
    const bt = e.currentTarget;
    if (item.faltou && !item.feito) item.faltou = false;
    else { item.feito = !item.feito; if (item.feito) { item.faltou = false; delete item.novo; } }
    bt.setAttribute('aria-checked', String(!!item.feito));
    li.classList.toggle('feito', !!item.feito);
    li.classList.remove('faltou');
    guardar(); atualizarContagem();
    // Dá tempo de ver a marca antes de o item descer para o fim da categoria.
    clearTimeout(linhaItem.t);
    linhaItem.t = setTimeout(desenhar, 450);
  };
  li.querySelector('.nome-bt').onclick = () => painelItem(item);
  if (abrindo) ligarPassoDaLinha(li, item);
  else li.querySelector('.qtd-bt').onclick = () => { ajustando = item; desenhar(); armarFimDoAjuste(); };
  arrastarParaRemover(li, item);
  return li;
}

/** − e + direto na linha. Fecha sozinho depois de uns segundos sem mexer. */
function ligarPassoDaLinha(li, item) {
  const [menos, mais] = li.querySelectorAll('.passo-linha button');
  const valor = li.querySelector('.passo-linha span');
  const passo = () => PASSO[item.un] || 1;
  const mostrar = () => { valor.textContent = item.qtd == null ? '–' : formatarQtd(item); };
  const mudou = () => { mostrar(); guardar(); lembrar([item], false); armarFimDoAjuste(); };
  mais.onclick = () => { item.qtd = item.qtd == null ? passo() : item.qtd + passo(); mudou(); };
  menos.onclick = () => {
    if (item.qtd == null) return;
    item.qtd -= passo();
    if (item.qtd <= 0.0001) item.qtd = null;
    mudou();
  };
  mostrar();
}
function armarFimDoAjuste() {
  clearTimeout(armarFimDoAjuste.t);
  armarFimDoAjuste.t = setTimeout(fecharAjuste, 3500);
}
function fecharAjuste() {
  clearTimeout(armarFimDoAjuste.t);
  if (!ajustando) return;
  ajustando = null; desenhar();
}
// Tocar fora do − e + fecha o ajuste.
document.addEventListener('pointerdown', (e) => {
  if (ajustando && !e.target.closest('.passo-linha')) fecharAjuste();
}, true);

/** Arrastar a linha para o lado tira o item da lista (com Desfazer). */
function arrastarParaRemover(li, item) {
  const linha = li.querySelector('.linha-item');
  let x0 = null, y0 = 0, dx = 0, arrastando = false, id = null;
  const limite = () => linha.offsetWidth * 0.35;
  linha.addEventListener('pointerdown', (e) => {
    if (e.button || e.target.closest('.passo-linha')) return;
    x0 = e.clientX; y0 = e.clientY; dx = 0; arrastando = false; id = e.pointerId;
  });
  linha.addEventListener('pointermove', (e) => {
    if (x0 == null || e.pointerId !== id) return;
    const mx = e.clientX - x0, my = e.clientY - y0;
    if (!arrastando) {
      if (Math.abs(my) > 14 && Math.abs(my) > Math.abs(mx)) { x0 = null; return; }
      if (Math.abs(mx) < 14 || Math.abs(mx) < Math.abs(my) * 1.4) return;
      arrastando = true;
      try { linha.setPointerCapture(id); } catch { /* ok */ }
      li.classList.add('arrastando');
    }
    dx = mx;
    linha.style.transform = `translateX(${dx}px)`;
    li.classList.toggle('vai-remover', Math.abs(dx) > limite());
  });
  const soltar = (cancelou) => {
    if (x0 == null) return;
    x0 = null;
    if (!arrastando) return;
    arrastando = false;
    li.dataset.arrastou = '1';
    setTimeout(() => { delete li.dataset.arrastou; }, 80);
    li.classList.remove('arrastando');
    if (!cancelou && Math.abs(dx) > limite()) {
      linha.style.transform = `translateX(${dx > 0 ? 110 : -110}%)`;
      setTimeout(() => removerItem(item), 170);
    } else {
      linha.style.transform = '';
      li.classList.remove('vai-remover');
    }
  };
  linha.addEventListener('pointerup', () => soltar(false));
  linha.addEventListener('pointercancel', () => soltar(true));
  // O toque que termina um arrasto não marca nem abre o item.
  li.addEventListener('click', (e) => { if (li.dataset.arrastou) { e.stopPropagation(); e.preventDefault(); } }, true);
}

function removerItem(item) {
  marcarParaDesfazer();
  itens = itens.filter((x) => x !== item);
  if (ajustando === item) ajustando = null;
  guardar(); desenhar();
  aviso(`Saiu da lista: ${item.nome}`, true);
}

// ---------------------------------------------------------------- detalhes do item
/** Tudo de um item num lugar só: nome, observação, quantidade, preço, "não tinha". */
function painelItem(item) {
  const rascunho = { ...item };
  const cats = CATEGORIAS.includes(item.cat) ? CATEGORIAS : [...CATEGORIAS, item.cat];
  const valor = typeof item.preco === 'number' ? item.preco.toFixed(2).replace('.', ',') : '';
  const faltou = item.faltou && !item.feito;
  abrirPainel(`<h3>${esc(item.nome)}</h3>
    <div class="campo">Observação
      <input class="texto" id="dObs" value="${esc(item.obs || '')}" placeholder="Escreva ou toque numa sugestão" autocomplete="off" enterkeyhint="done">
      <div class="chips obs-chips" id="dChips"></div>
    </div>
    <div class="campo">Quantidade<div class="fileira"><div class="passo"><button type="button" aria-label="Menos">−</button><span></span><button type="button" aria-label="Mais">+</button></div><select id="dUn" aria-label="Unidade">${UNIDADES.map((u) => `<option ${u === item.un ? 'selected' : ''}>${u}</option>`).join('')}</select></div></div>
    <label class="campo"><span>Preço do item <span class="opcional">· opcional</span></span><input class="texto" id="dPreco" inputmode="decimal" placeholder="R$ 0,00" value="${valor}" autocomplete="off" enterkeyhint="done"></label>
    <button class="btn primario grande" id="dSalvar" type="button">Salvar</button>
    <div class="fileira">
      <button class="btn" id="dFaltou" type="button">${faltou ? 'Achei, tinha sim' : 'Não tinha'}</button>
      <button class="btn perigo" id="dRemover" type="button">Tirar da lista</button>
    </div>
    <details class="mais-campos"><summary>Nome e categoria</summary>
      <label class="campo">Nome<input class="texto" id="dNome" value="${esc(item.nome)}" autocomplete="off"></label>
      <label class="campo">Categoria<select id="dCat">${cats.map((c) => `<option ${c === item.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
    </details>
    <button class="btn discreto" data-fechar type="button">Cancelar</button>`);
  const obs = $('dObs'), preco = $('dPreco'), salvar = $('dSalvar');
  const desenharChips = () => {
    $('dChips').innerHTML = sugestoesDeObs($('dCat').value).map((s) =>
      `<button type="button" class="chip escolha" aria-pressed="${temObs(obs.value, s)}" data-obs="${esc(s)}">${esc(s)}</button>`).join('');
    $('dChips').querySelectorAll('[data-obs]').forEach((b) => {
      b.onclick = () => { obs.value = alternarObs(obs.value, b.dataset.obs); desenharChips(); };
    });
  };
  desenharChips();
  obs.addEventListener('input', desenharChips);
  $('dCat').onchange = desenharChips;
  const [menos, mais] = painel.querySelectorAll('.passo button');
  ligarPasso(rascunho, menos, mais, painel.querySelector('.passo span'), $('dUn'), () => {});
  // Anotar o preço de um item que ainda não foi pego é sinal de que ele está no carrinho.
  const rotulo = () => { salvar.textContent = preco.value.trim() && !item.feito ? 'Salvar e marcar como pego' : 'Salvar'; };
  preco.addEventListener('input', rotulo);
  rotulo();
  const gravar = () => {
    const nome = $('dNome').value.trim() || item.nome;
    const p = lerPreco(preco.value);
    if (preco.value.trim() && p == null) { aviso('Esse preço não está certo'); preco.focus(); return; }
    Object.assign(item, { nome, cat: $('dCat').value, qtd: rascunho.qtd, un: rascunho.un });
    const o = obs.value.trim().replace(/,\s*$/, '');
    if (o) item.obs = o; else delete item.obs;
    if (p != null) { item.preco = p; if (!item.feito) { item.feito = true; item.faltou = false; delete item.novo; } } else delete item.preco;
    guardar(); lembrar([item], false); fecharPainel(); desenhar();
  };
  salvar.onclick = gravar;
  [obs, preco].forEach((c) => c.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); gravar(); } }));
  $('dFaltou').onclick = () => {
    if (item.faltou && !item.feito) item.faltou = false;
    else { item.faltou = true; item.feito = false; delete item.preco; delete item.novo; }
    guardar(); fecharPainel(); desenhar();
  };
  $('dRemover').onclick = () => { fecharPainel(); removerItem(item); };
}

/** Botões − e + e a unidade, no painel do item. */
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

// ---------------------------------------------------------------- adicionar
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
  mostrarItem(novos[novos.length - 1]);
  const novosDeVerdade = novos.length - r.somados.length;
  const partes = [];
  // "Na lista: Manga" serve para qualquer item (sem "adicionado/adicionada").
  if (novosDeVerdade) partes.push(novos.length === 1 ? `Na lista: ${novos[0].nome}` : `Na lista: ${plural(novosDeVerdade, 'item', 'itens')}`);
  if (r.somados.length) partes.push(`${r.somados.join(', ')}: somei à quantidade`);
  aviso(partes.join('. '), true);
}

/** Rola até o item e faz ele piscar: quem adicionou vê onde ele foi parar. */
function mostrarItem(item) {
  const li = $('lista').querySelector(`li[data-nome="${CSS.escape(item.nome.toLowerCase())}"]`);
  if (!li) return;
  li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  li.classList.add('piscar');
  setTimeout(() => li.classList.remove('piscar'), 1400);
}

// Reconhecimento de fala do navegador (Chrome no Android). Sem ele, fica a dica do microfone do teclado.
const Reconhecimento = window.SpeechRecognition || window.webkitSpeechRecognition;

/** A barra de baixo: monta uma vez e fica sempre lá. */
function montarBarra() {
  const campo = $('nTexto');
  // O + é sempre o mesmo botão: com a caixa vazia ele abre a caixa (e o teclado); com texto, adiciona.
  const atualizarBotoes = () => {
    const tem = !!campo.value.trim();
    $('nEnviar').classList.toggle('pronto', tem);
    $('nEnviar').setAttribute('aria-label', tem ? 'Adicionar' : 'Escrever um item');
  };
  campo.addEventListener('input', () => { atualizarBotoes(); atualizarPrevia(); });
  campo.addEventListener('focus', atualizarPrevia);
  campo.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== campo) esconderSobe(); }, 150));
  $('fNovo').onsubmit = (e) => {
    e.preventDefault();
    const novos = paraItens(lerEntrada(campo.value));
    if (!novos.length) { campo.focus(); atualizarPrevia(); return; }
    campo.value = '';
    atualizarBotoes();
    adicionar(novos);
    atualizarPrevia();
    campo.focus();
  };
  $('nMic').onclick = () => {
    if (Reconhecimento) { painelDitado(); return; }
    campo.focus();
    aviso('Use o microfone do teclado para falar os itens');
  };
  $('nEscolher').onclick = painelEscolher;
  // Toque nas sugestões e no + não tira o foco da caixa (o teclado continua aberto, a tela não pula).
  $('sobe').addEventListener('pointerdown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
  $('nEnviar').addEventListener('pointerdown', (e) => { if (document.activeElement === campo) e.preventDefault(); });
  atualizarBotoes();
}

function esconderSobe() { $('sobe').hidden = true; }

/*
 * Modo "digitando": com o teclado aberto sobra pouca tela. O menu de baixo
 * some e o cabeçalho encolhe (ver body.digitando no CSS), e a lista fica
 * com o espaço. Espera um instante no focusout: tocar de um campo para
 * outro não pode fazer a tela pular.
 */
const abreTeclado = (el) => !!el?.matches?.('input:not([type=radio]):not([type=checkbox]):not([type=file]):not([type=range]), textarea');
document.addEventListener('focusin', (e) => { if (abreTeclado(e.target)) document.body.classList.add('digitando'); });
document.addEventListener('focusout', () => {
  setTimeout(() => { if (!abreTeclado(document.activeElement)) document.body.classList.remove('digitando'); }, 120);
});

/** Acima da barra: o que vai entrar (prévia), sugestões da palavra e, com a caixa vazia, os itens de sempre. */
function atualizarPrevia() {
  const campo = $('nTexto');
  const valor = campo.value;
  const sobe = $('sobe'), sug = $('nSug'), previa = $('nPrevia');
  sug.innerHTML = '';
  previa.innerHTML = '';
  if (!valor.trim()) {
    const sempre = deSempre(historico, itens, 10, catsDoTipo());
    sobe.hidden = !sempre.length || document.activeElement !== campo;
    if (!sempre.length) return;
    sug.innerHTML = `<span class="rotulo">De sempre</span>${sempre.map((h, n) => `<button class="chip" type="button" data-sempre="${n}">+ ${esc(h.nome)}</button>`).join('')}`;
    sug.querySelectorAll('[data-sempre]').forEach((b) => {
      b.onclick = () => { const h = sempre[Number(b.dataset.sempre)]; adicionar([criarItem(h.nome, h.cat, h.qtd, h.un)]); atualizarPrevia(); };
    });
    return;
  }
  sobe.hidden = false;
  const novos = paraItens(lerEntrada(valor));
  previa.hidden = !novos.length;
  previa.innerHTML = novos.map((i) => {
    const ja = itens.some((x) => x.nome.toLowerCase() === i.nome.toLowerCase());
    const q = formatarQtd(i);
    return `<li><b>${esc(i.nome)}</b>${q ? ` <span class="qtd">${q}</span>` : ''}${i.obs ? ` <span class="cinza">(${esc(i.obs)})</span>` : ''}${ja ? ' <span class="ja">já na lista: soma</span>' : ''}</li>`;
  }).join('');

  // Só sugere enquanto a pessoa ainda está escrevendo o último item.
  if (/[,;]\s*$/.test(valor) || /\se\s*$/.test(valor)) return;
  const pedacos = separarItens(valor);
  const ultimo = pedacos[pedacos.length - 1];
  if (!ultimo) return;
  const lido = lerPedaco(ultimo);
  if (!lido || lido.digitado.length < 2) return;
  const opcoes = sugerir(historico, lido.digitado, 5).filter((o) => o.nome.toLowerCase() !== lido.digitado.toLowerCase());
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
      campo.dispatchEvent(new Event('input'));
    };
    sug.appendChild(b);
  }
}

/** Escolher sem digitar: listas prontas, repetir a última, de sempre e a grade por categoria. */
let categoriaDaGrade = null;
function painelEscolher() {
  const rolagem = painelAtual === 'escolher' ? painel.scrollTop : 0;
  const sempre = deSempre(historico, itens, 12, catsDoTipo());
  const faltaNaLista = lista.ultima ? juntar(itens, lista.ultima).length - itens.length : 0;
  const cats = CATEGORIAS_POR_TIPO[lista.tipo] || CATEGORIAS_POR_TIPO.outros;
  if (!cats.includes(categoriaDaGrade)) categoriaDaGrade = cats[0];
  const naLista = new Map(itens.map((i) => [i.nome.toLowerCase(), i]));
  const grade = gradeDaCategoria(historico, categoriaDaGrade);
  abrirPainel(`<h3>Escolher itens</h3>
    <div class="atalhos-linha">
      <button class="btn" id="eProntas" type="button">Listas prontas</button>
      ${faltaNaLista > 0 ? `<button class="btn" id="eRepetir" type="button">Repetir a última <span class="cinza">(+${faltaNaLista})</span></button>` : ''}
    </div>
    ${sempre.length ? `<h4 class="sub sub-acao"><span>De sempre</span><button type="button" class="link" id="eAjustar">Ajustar</button></h4><div class="chips">${sempre.map((h, n) => `<button class="chip" type="button" data-sempre="${n}">+ ${esc(h.nome)}${h.qtd != null ? ` <span class="cinza">${formatarNumero(h.qtd)} ${esc(h.un)}</span>` : ''}</button>`).join('')}</div>` : ''}
    <h4 class="sub">Por categoria</h4>
    <div class="abas" role="tablist" aria-label="Categorias">${cats.map((c) => `<button type="button" role="tab" class="aba" aria-selected="${c === categoriaDaGrade}" data-aba="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div class="grade" role="tabpanel" aria-label="${esc(categoriaDaGrade)}">${grade.map((g, n) => {
      const ja = naLista.get(g.nome.toLowerCase());
      return `<div class="grade-celula"><button type="button" class="grade-item${ja ? ' tem' : ''}" data-grade="${n}" aria-label="${esc(g.nome)}${ja ? `, na lista${ja.qtd != null ? `: ${formatarQtd(ja)}` : ''}. Toque para somar` : ''}"><span>${esc(g.nome)}</span>${ja ? `<span class="grade-qtd">${ja.qtd != null ? formatarQtd(ja) : '✓ na lista'}</span>` : ''}</button>${ja ? `<button type="button" class="grade-menos" data-menos="${n}" aria-label="Diminuir ou tirar ${esc(g.nome)}">−</button>` : ''}</div>`;
    }).join('')}</div>
    <p class="obs">Um toque põe na lista; outro toque soma mais.</p>
    <button class="btn primario grande" data-fechar type="button">Pronto · ${plural(itens.length, 'item', 'itens')} na lista</button>`, 'escolher');
  painel.scrollTop = rolagem;
  const abaAtual = painel.querySelector('.aba[aria-selected="true"]');
  if (abaAtual) abaAtual.parentElement.scrollLeft = abaAtual.offsetLeft - abaAtual.parentElement.offsetLeft - 16;
  $('eProntas').onclick = painelModelos;
  if ($('eAjustar')) $('eAjustar').onclick = () => painelSugestoes();
  if ($('eRepetir')) {
    $('eRepetir').onclick = () => {
      marcarParaDesfazer();
      const antes = itens.length;
      itens = juntar(itens, novaCompra(lista.ultima));
      guardar(); desenhar();
      aviso(`${plural(itens.length - antes, 'item voltou', 'itens voltaram')} da última compra`, true);
    };
  }
  painel.querySelectorAll('[data-sempre]').forEach((b) => {
    b.onclick = () => { const h = sempre[Number(b.dataset.sempre)]; adicionar([criarItem(h.nome, h.cat, h.qtd, h.un)]); };
  });
  painel.querySelectorAll('[data-aba]').forEach((b) => { b.onclick = () => { categoriaDaGrade = b.dataset.aba; painelEscolher(); }; });
  painel.querySelectorAll('[data-grade]').forEach((b) => { b.onclick = () => tocarNaGrade(grade[Number(b.dataset.grade)]); });
  painel.querySelectorAll('[data-menos]').forEach((b) => { b.onclick = () => menosNaGrade(grade[Number(b.dataset.menos)]); });
}

/** Categorias que fazem sentido para o tipo da lista aberta (null = todas). */
const catsDoTipo = () => (lista.tipo === 'outros' ? null : CATEGORIAS_POR_TIPO[lista.tipo] || null);

/** O − da grade: tira um passo da quantidade; sem quantidade (ou no último passo), tira o item da lista. */
function menosNaGrade(g) {
  const ja = itens.find((i) => i.nome.toLowerCase() === g.nome.toLowerCase());
  if (!ja) return;
  const passo = PASSO[ja.un] || 1;
  if (ja.qtd != null && ja.qtd - passo > 0.0001) {
    marcarParaDesfazer();
    ja.qtd -= passo;
    guardar(); desenhar();
    aviso(`${ja.nome}: ${formatarQtd(ja)}`, true);
    return;
  }
  removerItem(ja);
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
    aviso(`Na lista: ${g.nome}`, true);
    return;
  }
  const passo = PASSO[ja.un] || 1;
  ja.qtd = ja.qtd == null ? passo : ja.qtd + passo;
  ja.feito = false;
  lembrar([ja], false);
  guardar(); desenhar();
  aviso(`${ja.nome}: ${formatarQtd(ja)}`, true);
}

// ---------------------------------------------------------------- ditado
/**
 * Falar a lista. O app junta tudo o que foi ouvido num texto corrido e
 * lê os itens desse texto inteiro (não de cada pedaço): há Androids que
 * entregam palavra por palavra. O microfone religa sozinho quando o Chrome
 * desliga numa pausa. A pessoa vê o que foi ouvido e os itens, e tira o que
 * saiu errado.
 */
function painelDitado() {
  let falado = '';        // o que já foi ouvido nas sessões anteriores (ou corrigido à mão)
  let daSessao = '';      // o que a sessão atual ouviu até agora
  const tirados = new Set();
  let querOuvir = true;
  let rec = null;
  let itensOuvidos = [];
  let ultimaFala = Date.now();
  let corrigindo = false;
  const PACIENCIA = 120000; // dois minutos em silêncio e o microfone descansa
  abrirPainel(`<h3>Fale os itens</h3>
    <p id="ftEstado" class="estado-mic ouvindo">Ouvindo… fale do seu jeito e pare para pensar quando quiser: o microfone espera.</p>
    <div class="ouvi-caixa" id="ftOuviCaixa" hidden>
      <p class="ouvi" id="ftOuvi"></p>
      <button class="btn discreto corrigir" id="ftCorrigir" type="button">Corrigir o texto</button>
    </div>
    <ul class="ouvidos" id="ftLista" hidden></ul>
    <div class="fileira">
      <button class="btn mic-bt ouvindo" id="ftMic" type="button" aria-pressed="true">Parar</button>
      <button class="btn primario" id="ftPor" type="button">Pôr na lista</button>
    </div>
    <button class="btn discreto" id="ftCancelar" type="button">Cancelar</button>`, 'ditado', () => { querOuvir = false; clearInterval(relogio); desligar(); });

  const chave = (i) => `${i.nome.toLowerCase()}|${i.qtd ?? ''}|${i.obs || ''}`;
  const textoTodo = () => [falado, daSessao].filter(Boolean).join(' ');
  const atualizar = () => {
    const texto = textoTodo();
    // O fim pela metade ("…e dois quilos de") espera a pessoa terminar de pensar.
    const { completo, pendente } = separarPendente(texto);
    itensOuvidos = juntarOuvidos([], paraItens(lerEntrada(limparFala(completo), { fala: true }))).filter((i) => !tirados.has(chave(i)));
    const caixa = $('ftOuviCaixa'), ul = $('ftLista');
    if (!ul) return;
    caixa.hidden = !texto;
    if (!corrigindo) $('ftOuvi').innerHTML = texto ? `Ouvi: “${esc(completo)}${pendente ? `${completo ? ' ' : ''}<span class="esperando">${esc(pendente)}…</span>` : ''}”` : '';
    ul.hidden = !itensOuvidos.length;
    ul.innerHTML = itensOuvidos.map((i, n) => {
      const q = formatarQtd(i);
      return `<li><span class="nome">${esc(i.nome)}${i.obs ? `<small>${esc(i.obs)}</small>` : ''}</span>${q ? `<span class="qtd">${q}</span>` : ''}<button type="button" class="tirar" data-tirar="${n}" aria-label="Tirar ${esc(i.nome)}">×</button></li>`;
    }).join('');
    ul.querySelectorAll('[data-tirar]').forEach((b) => { b.onclick = () => { tirados.add(chave(itensOuvidos[Number(b.dataset.tirar)])); atualizar(); }; });
    ul.scrollTop = ul.scrollHeight;
    $('ftPor').textContent = itensOuvidos.length ? `Pôr ${plural(itensOuvidos.length, 'item', 'itens')} na lista` : 'Pôr na lista';
  };
  const estado = (texto, ouvindo) => {
    const e = $('ftEstado'), b = $('ftMic');
    if (!e || !b) return;
    e.textContent = texto;
    e.classList.toggle('ouvindo', ouvindo);
    b.textContent = ouvindo ? 'Parar' : 'Continuar falando';
    b.classList.toggle('ouvindo', ouvindo);
    b.setAttribute('aria-pressed', String(ouvindo));
  };
  // Enquanto a pessoa pensa, o aviso deixa claro que o microfone continua esperando.
  const relogio = setInterval(() => {
    if (!querOuvir) return;
    const parado = Date.now() - ultimaFala;
    const { pendente } = separarPendente(textoTodo());
    if (parado > 2500) estado(pendente ? `Pode continuar: “${pendente}…”` : 'Pode pensar com calma, continuo ouvindo. Quando terminar, toque em Pôr na lista.', true);
    else estado('Ouvindo…', true);
  }, 800);
  const fecharSessao = () => { if (daSessao) { falado = textoTodo(); daSessao = ''; } };
  function ligar() {
    if (!querOuvir) return;
    const r = new Reconhecimento();
    r.lang = 'pt-BR';
    r.continuous = true;
    r.interimResults = true;
    const inicio = Date.now();
    r.onresult = (e) => {
      ultimaFala = Date.now();
      // Remonta a sessão inteira a cada evento: aguenta resultados reenviados, acumulados ou picados.
      daSessao = textoDaSessao(Array.from(e.results, (x) => x[0].transcript));
      atualizar();
    };
    r.onerror = (e) => {
      const motivo = {
        'not-allowed': 'O microfone está bloqueado. Libere o microfone para o NaLista nas permissões do navegador.',
        'service-not-allowed': 'O microfone está bloqueado. Libere o microfone para o NaLista nas permissões do navegador.',
        'audio-capture': 'Não encontrei o microfone do aparelho.',
        network: 'Falar precisa de internet. Sem sinal, use o microfone do teclado na barra de adicionar.',
      }[e.error];
      if (motivo) { querOuvir = false; estado(motivo, false); }
      // "no-speech" é só silêncio: o onend religa.
    };
    r.onend = () => {
      if (rec === r) rec = null;
      fecharSessao();
      // Sessão que caiu logo de cara (sem ouvir nada) religa com uma folga, para não ficar piscando.
      if (querOuvir && Date.now() - ultimaFala < PACIENCIA) { setTimeout(ligar, Date.now() - inicio < 1000 ? 700 : 100); return; }
      if (querOuvir) { querOuvir = false; estado('O microfone descansou depois de um tempo em silêncio. Toque em Continuar falando quando quiser.', false); }
    };
    try { r.start(); rec = r; } catch { querOuvir = false; estado('Não deu para ligar o microfone agora. Tente de novo.', false); }
  }
  function desligar() { if (rec) { try { rec.stop(); } catch { /* já parou */ } } }

  $('ftMic').onclick = () => {
    if (querOuvir) { querOuvir = false; desligar(); estado(itensOuvidos.length ? 'Confira os itens e toque em Pôr na lista.' : 'Parado.', false); return; }
    if (corrigindo) terminarCorrecao();
    querOuvir = true; ultimaFala = Date.now();
    estado('Ouvindo…', true);
    ligar();
  };
  // Corrigir à mão o que o microfone entendeu errado; os itens acompanham.
  const terminarCorrecao = () => { corrigindo = false; $('ftCorrigir').textContent = 'Corrigir o texto'; atualizar(); };
  $('ftCorrigir').onclick = () => {
    if (corrigindo) { terminarCorrecao(); return; }
    querOuvir = false; desligar(); fecharSessao();
    estado('Corrija o texto; os itens mudam junto.', false);
    corrigindo = true;
    $('ftCorrigir').textContent = 'Pronto';
    $('ftOuvi').innerHTML = `<textarea id="ftTexto" class="ouvi-texto" aria-label="Texto ouvido">${esc(falado)}</textarea>`;
    const t = $('ftTexto');
    t.focus();
    t.addEventListener('input', () => { falado = t.value; daSessao = ''; atualizar(); });
  };
  $('ftPor').onclick = () => {
    querOuvir = false; desligar();
    atualizar();
    if (!itensOuvidos.length) { aviso('Nenhum item ouvido ainda'); return; }
    const novos = itensOuvidos;
    fecharPainel();
    adicionar(novos);
  };
  $('ftCancelar').onclick = fecharPainel;
  ligar();
}

// ---------------------------------------------------------------- tour
/** O tour do app: um passo por parte da tela, na ordem em que a pessoa usa. */
function comecarTour() {
  fecharPainel();
  // Fechar o painel mexe no histórico (assíncrono); o tour só começa depois, para o voltar não se confundir.
  if (voltando) { setTimeout(comecarTour, 60); return; }
  // O convite sai da frente: o tour começa já com a lista como ela é.
  gravarMarca(DICA_GESTOS);
  document.querySelector('.dica-gestos')?.remove();
  window.scrollTo({ top: 0 });
  const item = () => $('lista').querySelector('li.item:not(.feito)') || $('lista').querySelector('li.item');
  const daLinha = (sel) => () => item()?.querySelector(sel) || null;
  iniciarTour([
    { titulo: 'Bem-vindo ao NaLista', texto: 'Em um minuto você vê como montar a lista, marcar no mercado e mandar para outra pessoa. Dá para pular quando quiser.' },
    { alvo: () => $('tituloLista'), titulo: 'A lista aberta', texto: 'Este é o nome da lista em que você está. Dá para ter várias: mercado, farmácia, festa. Elas ficam em <b>Listas</b>, no menu de baixo.' },
    { alvo: () => $('contagem'), titulo: 'Quanto falta', texto: 'Mostra quantos itens já estão no carrinho e quantos faltam. A barrinha verde vai enchendo durante a compra.' },
    { alvo: () => $('nTexto'), titulo: 'Escreva vários de uma vez', texto: 'Separe por vírgula: <i>“2 kg frango, pão, 6 leite zero lactose”</i>. O app entende quantidade, unidade e observação, e põe cada item na categoria certa.' },
    { alvo: () => $('nEnviar'), titulo: 'O botão +', texto: 'Põe na lista o que você escreveu. Com a caixa vazia, ele abre o teclado e mostra os itens que você sempre compra.' },
    { alvo: () => $('nMic'), titulo: 'Falar em vez de digitar', texto: 'Fale a lista do seu jeito, com pausas para pensar. Cada item aparece na hora e você tira o que saiu errado antes de pôr na lista.' },
    { alvo: () => $('nEscolher'), titulo: 'Escolher sem digitar', texto: 'Listas prontas (compra do mês, churrasco, farmácia…), as suas listas salvas e uma grade por categoria. Um toque põe, outro soma, o <b>−</b> tira.' },
    { alvo: daLinha('.marcar-bt'), titulo: 'Marcar no mercado', texto: 'Toque na caixinha quando pegar o item. Ele desce para o fim da categoria e a tela fica acesa enquanto você compra.' },
    { alvo: daLinha('.nome-bt'), titulo: 'Detalhes do item', texto: 'Toque no nome para pôr observação (marca, “maduras”, “zero lactose”), anotar o preço ou marcar que <b>não tinha</b>.' },
    { alvo: daLinha('.qtd-bt'), titulo: 'Quantidade', texto: 'Toque aqui para aparecer o <b>−</b> e o <b>+</b> na própria linha.' },
    { alvo: () => item()?.querySelector('.linha-item') || null, gesto: 'arrastar', titulo: 'Arrastar para tirar', texto: 'Arraste o item para o lado para tirar da lista. Se foi sem querer, toque em <b>Desfazer</b>.' },
    { alvo: () => $('bListas'), titulo: 'Suas listas', texto: 'Crie, renomeie e troque de lista. O número mostra quantas você tem.' },
    { alvo: () => $('bCompras'), titulo: 'Compras anteriores', texto: 'Cada compra terminada fica guardada: o que foi pego, o que faltou e quanto deu. Dá para repetir uma compra inteira.' },
    { alvo: () => $('bEnviar'), titulo: 'Mandar para outra pessoa', texto: 'Manda a lista por WhatsApp como um link: quem recebe toca e ela abre pronta. Lembrou de mais coisas? Mande <b>só o que é novo</b>. Na volta, quem comprou manda o <b>retorno</b> com o que faltou.' },
    { alvo: () => $('bImportar'), titulo: 'Importar', texto: 'Cole um link ou uma lista em texto que alguém mandou, de qualquer jeito: um item por linha ou separado por vírgula.' },
    { alvo: () => $('bMais'), titulo: 'Ajustes', texto: 'Orçamento, listas prontas, começar nova compra, tema claro ou escuro, sugestões e backup. Este tour também fica aqui.' },
    { titulo: 'Pronto!', texto: 'Funciona sem internet e tudo fica no seu celular. Para ver o tour de novo, vá em <b>Ajustes → Fazer o tour</b>.' },
  ], { aoTerminar: () => { gravarMarca(DICA_GESTOS); desenhar(); } });
}

// ---------------------------------------------------------------- sugestões
/**
 * O que o app aprendeu com as listas (histórico): aparece no "de sempre",
 * na grade e no autocompletar. Aqui a pessoa tira o que não faz sentido,
 * como palavras que o microfone entendeu errado.
 */
function painelSugestoes() {
  abrirPainel(`<h3>Sugestões</h3>
    <p>O app sugere o que você já pôs em listas. Toque no × para tirar o que não faz sentido: some do "de sempre", da grade e do autocompletar. Não mexe nas suas listas.</p>
    <input class="texto busca" id="sgBusca" type="search" placeholder="Procurar" autocomplete="off" aria-label="Procurar nas sugestões">
    <div id="sgEstranhos"></div>
    <ul class="listas sugestoes" id="sgLista"></ul>
    <button class="btn discreto" data-fechar type="button">Fechar</button>`, 'escolher');
  const busca = $('sgBusca');
  const tirar = (nomes) => {
    const antes = historico;
    for (const n of nomes) historico = esquecer(historico, n);
    salvarHistorico(historico);
    desenharLista();
    aviso(nomes.length === 1 ? `${nomes[0]} não aparece mais` : `${plural(nomes.length, 'sugestão tirada', 'sugestões tiradas')}`, true, () => {
      historico = antes; salvarHistorico(historico); desenharLista();
    });
  };
  function desenharLista() {
    if (!$('sgLista')) return;
    const todos = paraRevisar(historico, busca.value);
    const estranhos = paraRevisar(historico).filter((h) => h.estranho);
    $('sgEstranhos').innerHTML = estranhos.length
      ? `<button class="btn grande" id="sgLimpar" type="button">Tirar ${plural(estranhos.length, 'palavra solta', 'palavras soltas')} (${estranhos.slice(0, 4).map((h) => `“${esc(h.nome)}”`).join(', ')})</button>`
      : '';
    if ($('sgLimpar')) $('sgLimpar').onclick = () => tirar(estranhos.map((h) => h.nome));
    $('sgLista').innerHTML = todos.length
      ? todos.map((h, n) => `<li class="sugestao${h.estranho ? ' estranha' : ''}"><span class="nome">${esc(h.nome)}<small>${esc(h.cat || 'Outros')} · ${h.vezes ? plural(h.vezes, 'lista', 'listas') : 'só ajustado'}</small></span><button type="button" class="tirar" data-tirar="${n}" aria-label="Tirar ${esc(h.nome)} das sugestões">×</button></li>`).join('')
      : `<li class="sugestao"><span class="nome cinza">${busca.value ? 'Nada com esse nome.' : 'Ainda não há sugestões. Elas aparecem conforme você usa as listas.'}</span></li>`;
    $('sgLista').querySelectorAll('[data-tirar]').forEach((b) => { b.onclick = () => tirar([todos[Number(b.dataset.tirar)].nome]); });
  }
  busca.addEventListener('input', desenharLista);
  desenharLista();
}

// ---------------------------------------------------------------- contagem e limpar
function atualizarContagem() {
  const r = resumoDaCompra(itens);
  $('contagem').innerHTML = !r.total
    ? 'Nenhum item'
    : r.resolvidos
      ? `<b>${r.pegos}</b> de ${r.total} no carrinho${r.faltaram ? ` · ${r.faltaram} não tinha` : ''}`
      : `<b>${r.total}</b> ${r.total === 1 ? 'item' : 'itens'} para pegar`;
  $('barra').style.width = r.total ? `${(r.resolvidos / r.total) * 100}%` : '0';

  // Total e orçamento: aparecem quando a compra começa (ou já há preço ou orçamento).
  const gasto = $('gasto');
  // Só aparece quando há preço anotado ou orçamento: a dica de como anotar fica em "Como usar".
  gasto.hidden = !r.total || !(r.comPreco || orcamento);
  const passou = orcamento && r.gasto > orcamento;
  gasto.classList.toggle('passou', !!passou);
  gasto.innerHTML = r.comPreco || orcamento
    ? `Total <b>${formatarPreco(r.gasto)}</b>${orcamento ? ` <span class="cinza">de ${formatarPreco(orcamento)}</span>` : ''}${passou ? ` · passou ${formatarPreco(Math.round((r.gasto - orcamento) * 100) / 100)} do combinado` : ''}`
    : 'Para anotar o preço, toque no nome do item · <u>orçamento</u>';

  const concluida = r.total > 0 && r.resolvidos === r.total;
  const tudo = $('tudo');
  tudo.classList.toggle('mostrar', concluida);
  if (concluida) {
    const partes = [`${plural(r.pegos, 'item pego', 'itens pegos')}`];
    if (r.faltaram) partes.push(`${r.faltaram} não tinha`);
    if (r.comPreco) partes.push(formatarPreco(r.gasto));
    // Fim da compra num cartão só: o resumo, o retorno e a escolha da próxima compra,
    // cada uma com um toque (sem confirmação: a compra já está guardada e tem Desfazer).
    const op = (id, ic, titulo, desc) => `<button class="fim-op" id="${id}" type="button"><svg viewBox="0 0 24 24" aria-hidden="true">${ic}</svg><span><b>${titulo}</b><small>${desc}</small></span></button>`;
    tudo.innerHTML = `<div class="fim-topo">
        <span class="fim-selo" aria-hidden="true">${MARCA}</span>
        <div><b>Tá tudo na sacola. Boa compra!</b><span>${partes.join(' · ')}</span></div>
      </div>
      <button class="btn primario grande" id="tRetorno" type="button">Enviar retorno para quem fez a lista</button>
      <h4 class="fim-sub">Próxima compra</h4>
      <div class="fim-opcoes">
        ${op('tMesmos', ICONE.repetir, 'Mesmos itens', `${plural(r.total, 'item volta', 'itens voltam')} desmarcados`)}
        ${r.faltaram ? op('tFaltou', '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>', 'Só o que não tinha', `${plural(r.faltaram, 'item fica', 'itens ficam')} na lista`) : ''}
        ${op('tVazia', '<path d="M12 5v14M5 12h14"/>', 'Lista vazia', 'Começa do zero')}
      </div>
      <p class="fim-nota">Esta compra já ficou guardada em <b>Compras</b>.</p>`;
    $('tRetorno').onclick = enviarRetorno;
    $('tMesmos').onclick = () => proximaCompra('mesmos');
    if ($('tFaltou')) $('tFaltou').onclick = () => proximaCompra('faltou');
    $('tVazia').onclick = () => proximaCompra('vazia');
    // Compra concluída vira a "última compra", que dá para repetir depois.
    lista.ultima = novaCompra(itens);
    // Entra uma vez só nas compras anteriores, até a próxima compra começar.
    if (!lista.compraRegistrada) {
      compras = guardarOuAtualizar(compras, registroDaCompra(lista, itens));
      salvarCompras(compras);
      lista.compraRegistrada = true;
    }
    guardar();
  }
}

/**
 * Tela acesa enquanto a compra está acontecendo: ninguém quer desbloquear o
 * celular a cada corredor. O navegador solta sozinho ao sair do app.
 */
let travaDaTela = null;
async function manterTelaAcesa() {
  const precisa = document.visibilityState === 'visible' && itens.some(resolvido) && itens.some((i) => !resolvido(i));
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

/**
 * Próxima compra, direto do cartão do fim (ou do menu):
 * - mesmos: os itens ficam e voltam a ficar desmarcados, sem preço nem "não tinha";
 * - faltou: ficam só os que não tinha;
 * - vazia: a lista esvazia (os itens ficam em "Repetir a última compra").
 * Tudo com Desfazer.
 */
function proximaCompra(modo) {
  marcarParaDesfazer();
  const antes = itens;
  if (modo === 'vazia') { lista.ultima = novaCompra(antes); itens = []; }
  else if (modo === 'faltou') itens = novaCompra(antes.filter((i) => !i.feito));
  else itens = novaCompra(antes);
  lista.compraRegistrada = false;
  ajustando = null;
  guardar(); fecharPainel(); desenhar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  aviso(itens.length ? `Nova compra: ${plural(itens.length, 'item', 'itens')} para pegar` : 'Nova compra: lista vazia', true);
}

/** Botão do fim da lista, no meio da compra: desmarca tudo (com confirmação, porque a compra ainda não foi guardada). */
const bLimpar = $('limpar');
function rearmarLimpar() {
  const r = resumoDaCompra(itens);
  bLimpar.textContent = 'Desmarcar tudo e começar de novo';
  // Com a compra concluída, o cartão do fim já traz as opções.
  bLimpar.hidden = !r.resolvidos || r.resolvidos === r.total;
}
function confirmarNovaCompra() {
  const r = resumoDaCompra(itens);
  if (r.total && r.resolvidos === r.total) { proximaCompra('mesmos'); return; }
  confirmar({
    titulo: 'Desmarcar tudo?',
    texto: `Os ${plural(itens.length, 'item', 'itens')} de <b>${esc(lista.nome)}</b> continuam na lista e voltam a ficar para pegar${r.comPreco || r.faltaram ? `. Saem ${[r.comPreco ? 'os preços' : '', r.faltaram ? 'os "não tinha"' : ''].filter(Boolean).join(' e ')}` : ''}.`,
    acao: 'Desmarcar tudo',
    perigo: false,
    aoConfirmar: () => proximaCompra('mesmos'),
  });
}
bLimpar.onclick = confirmarNovaCompra;

// ---------------------------------------------------------------- tema
const TEMAS = { sistema: 'Automático', claro: 'Claro', escuro: 'Escuro' };
const lerTema = () => { try { const t = localStorage.getItem('nalista-tema'); return t in TEMAS ? t : 'sistema'; } catch { return 'sistema'; } };
function aplicarTema(t) {
  if (t === 'sistema') delete document.documentElement.dataset.tema;
  else document.documentElement.dataset.tema = t;
  // A barra do Android acompanha o tema escolhido.
  const escuro = t === 'escuro' || (t === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => { m.removeAttribute('media'); m.content = escuro ? '#121614' : '#f3f5f1'; });
}
aplicarTema(lerTema());
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => aplicarTema(lerTema()));

function painelTema() {
  const atual = lerTema();
  abrirPainel(`<h3>Tema</h3>
    <div class="opcoes-tema" role="radiogroup" aria-label="Tema">${Object.entries(TEMAS).map(([id, nome]) => `
      <label class="opcao-tema"><input type="radio" name="tema" value="${id}" ${id === atual ? 'checked' : ''}><span class="amostra amostra-${id}" aria-hidden="true"></span><span>${nome}${id === 'sistema' ? '<small>Segue o celular</small>' : ''}</span></label>`).join('')}
    </div>
    <button class="btn discreto" data-fechar type="button">Fechar</button>`);
  painel.querySelectorAll('input[name=tema]').forEach((r) => {
    r.onchange = () => {
      try { if (r.value === 'sistema') localStorage.removeItem('nalista-tema'); else localStorage.setItem('nalista-tema', r.value); } catch { /* ok */ }
      aplicarTema(r.value);
    };
  });
}

/** Menu ⋯: o que é usado de vez em quando. */
/**
 * Menu ⋯ (opções e configurações), em três blocos: o que mexe na lista
 * aberta, de onde trazer itens, e o app em si. O tema troca ali mesmo.
 */
const ICONE = {
  orcamento: '<path d="M4 7h16v12H4z"/><path d="M4 11h16M8 15h3"/>',
  pronta: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 11l2 2 4-4M9 17h6"/>',
  repetir: '<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/>',
  zerar: '<path d="M5 12.5l4.5 4.5L19 7.5"/><path d="M3 21h18"/>',
  esvaziar: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  importar: '<path d="M12 3v12M7.5 10.5L12 15l4.5-4.5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  prontas: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  compras: '<path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="9"/>',
  sugestoes: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>',
  backup: '<path d="M7 18a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.6 1.5A3.8 3.8 0 0 1 17.5 18z"/><path d="M12 11v6M9.5 13.5L12 11l2.5 2.5"/>',
  ajuda: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',
};
const icone = (n) => `<svg class="icone-op" viewBox="0 0 24 24" aria-hidden="true">${ICONE[n]}</svg>`;

function painelMais() {
  const faltaNaLista = lista.ultima ? juntar(itens, lista.ultima).length - itens.length : 0;
  const opcao = (id, ic, titulo, desc, extra = '') => `<li><button type="button" class="opcao${extra}" id="${id}">${icone(ic)}<span class="nome">${titulo}<small>${desc}</small></span><svg class="seta-op" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button></li>`;
  const tema = lerTema();
  abrirPainel(`<h3>Ajustes</h3>
    <h4 class="sub">Lista ${esc(lista.nome)}</h4>
    <ul class="listas menu">
      ${opcao('mOrcamento', 'orcamento', 'Orçamento', orcamento ? `Até ${formatarPreco(orcamento)}` : 'Avisa quando o total passar do valor')}
      ${opcao('mProntas', 'prontas', 'Listas prontas', prontas.length ? `${plural(prontas.length, 'sua', 'suas')} e as do app` : 'Mês, feira, churrasco, farmácia e outras')}
      ${itens.length ? opcao('mSalvarPronta', 'pronta', 'Salvar como lista pronta', 'Para montar uma igual depois') : ''}
      ${faltaNaLista > 0 ? opcao('mRepetir', 'repetir', 'Repetir a última compra', `${plural(faltaNaLista, 'item volta', 'itens voltam')} para a lista`) : ''}
      ${itens.some(resolvido) ? opcao('mZerar', 'zerar', 'Começar nova compra', 'Desmarca tudo e tira os preços, mantém os itens') : ''}
      ${itens.length ? opcao('mEsvaziar', 'esvaziar', 'Esvaziar a lista', `Tira os ${plural(itens.length, 'item', 'itens')}`, ' perigo') : ''}
    </ul>
    <h4 class="sub">App</h4>
    <span class="rotulo-tema" id="rotuloTema">Tema</span>
    <div class="tema-linha" role="radiogroup" aria-labelledby="rotuloTema">
      ${Object.entries(TEMAS).map(([id, nome]) => `<label class="tema-op"><input type="radio" name="tema" value="${id}" ${id === tema ? 'checked' : ''}><span class="amostra amostra-${id}" aria-hidden="true"></span>${nome}</label>`).join('')}
    </div>
    <ul class="listas menu">
      ${opcao('mSugestoes', 'sugestoes', 'Sugestões', 'Tirar o que aparece sem fazer sentido')}
      ${opcao('mBackup', 'backup', 'Backup', 'Guardar tudo num arquivo ou levar para outro celular')}
      ${opcao('mDica', 'ajuda', 'Fazer o tour', 'Mostra o que cada parte do app faz')}
    </ul>
    <button class="btn discreto" data-fechar type="button">Fechar</button>`);
  painel.querySelectorAll('input[name=tema]').forEach((r) => {
    r.onchange = () => {
      try { if (r.value === 'sistema') localStorage.removeItem('nalista-tema'); else localStorage.setItem('nalista-tema', r.value); } catch { /* ok */ }
      aplicarTema(r.value);
    };
  });
  $('mProntas').onclick = painelModelos;
  if ($('mSalvarPronta')) $('mSalvarPronta').onclick = () => painelSalvarPronta();
  if ($('mRepetir')) $('mRepetir').onclick = () => {
    marcarParaDesfazer();
    const antes = itens.length;
    itens = juntar(itens, novaCompra(lista.ultima));
    guardar(); fecharPainel(); desenhar();
    aviso(`${plural(itens.length - antes, 'item voltou', 'itens voltaram')} da última compra`, true);
  };
  $('mOrcamento').onclick = painelOrcamento;
  if ($('mZerar')) $('mZerar').onclick = confirmarNovaCompra;
  if ($('mEsvaziar')) {
    $('mEsvaziar').onclick = () => confirmar({
      titulo: `Esvaziar ${esc(lista.nome)}?`,
      texto: `Os ${plural(itens.length, 'item', 'itens')} saem da lista. A lista continua existindo, e dá para trazer estes itens de volta depois em <b>Repetir a última compra</b>.`,
      acao: `Tirar os ${plural(itens.length, 'item', 'itens')}`,
      aoConfirmar: () => {
        marcarParaDesfazer();
        lista.ultima = novaCompra(itens);
        itens = []; lista.compraRegistrada = false;
        guardar(); fecharPainel(); desenhar(); aviso('Lista esvaziada', true);
      },
    });
  }
  $('mBackup').onclick = painelBackup;
  $('mSugestoes').onclick = () => painelSugestoes();
  $('mDica').onclick = () => comecarTour();
}
$('bMais').onclick = () => painelMais();
$('bCompras').onclick = () => painelCompras();
$('bImportar').onclick = () => painelImportar();

// ---------------------------------------------------------------- painel
const fundo = $('fundo'), painel = $('painel');
let painelAtual = null;
let aoFecharPainel = null;

/*
 * Botão voltar do Android: cada painel aberto ganha uma entrada no histórico
 * do navegador. Voltar fecha o painel de cima e reabre o de baixo (Listas →
 * Nova lista → voltar = Listas); com um painel só, voltar fecha. O app só
 * sai quando não há painel aberto.
 *
 * `pilha` guarda como reabrir cada painel; `noHistorico` é quantas entradas
 * já estão no histórico. Como history.back() é assíncrono, `voltando` segura
 * a sincronização até o popstate chegar.
 */
let pilha = [];
let noHistorico = 0;
let voltando = false;
let proximoPainel = null; // quem está abrindo o painel agora (ver navegavel)
let restaurando = false;

/** Marca uma função de painel: o voltar consegue reabri-la com os mesmos argumentos. */
function navegavel(fn) {
  return function (...args) {
    proximoPainel = { fn, reabrir: () => fn(...args) };
    return fn(...args);
  };
}

function sincronizarHistorico() {
  if (voltando) return;
  if (noHistorico < pilha.length) {
    while (noHistorico < pilha.length) { history.pushState({ nalista: noHistorico + 1 }, ''); noHistorico++; }
  } else if (noHistorico > pilha.length) {
    voltando = true;
    const n = noHistorico - pilha.length;
    noHistorico = pilha.length;
    history.go(-n);
  }
}

addEventListener('popstate', () => {
  if (voltando) { voltando = false; sincronizarHistorico(); return; }
  // A pessoa apertou voltar.
  if (noHistorico > 0) noHistorico--;
  if (!pilha.length) { if (ajustando) fecharAjuste(); return; }
  pilha.pop();
  // Desce até um painel que dê para reabrir; se não houver, fecha tudo.
  while (pilha.length && !pilha[pilha.length - 1].reabrir) pilha.pop();
  if (!pilha.length) { fecharDeVez(); sincronizarHistorico(); return; }
  restaurando = true;
  try { pilha[pilha.length - 1].reabrir(); } finally { restaurando = false; }
  sincronizarHistorico();
});

/** Abre o painel de baixo. `tipo` dá o jeito (escolher, ditado); `aoFechar` roda quando ele some. */
function abrirPainel(html, tipo = null, aoFechar = null) {
  if (aoFecharPainel) { const f = aoFecharPainel; aoFecharPainel = null; f(); }
  painel.innerHTML = html;
  painel.className = 'painel' + (tipo ? ` painel-${tipo}` : '');
  painelAtual = tipo;
  aoFecharPainel = aoFechar;
  fundo.classList.add('aberto');
  painel.querySelectorAll('[data-fechar]').forEach((b) => { b.onclick = fecharPainel; });
  const quem = proximoPainel;
  proximoPainel = null;
  const topo = pilha[pilha.length - 1];
  if (restaurando) {
    // Reabrindo o de baixo depois de um voltar: não empilha de novo.
  } else if (topo && quem && topo.fn === quem.fn) {
    topo.reabrir = quem.reabrir; // o mesmo painel se redesenhando (troca de aba, por exemplo)
  } else {
    pilha.push({ fn: quem?.fn || null, reabrir: quem?.reabrir || null });
  }
  sincronizarHistorico();
}
function fecharDeVez() {
  fundo.classList.remove('aberto');
  painelAtual = null;
  pilha = [];
  if (aoFecharPainel) { const f = aoFecharPainel; aoFecharPainel = null; f(); }
}
/** Fecha todos os painéis (Cancelar, Fechar, toque fora, depois de salvar). */
function fecharPainel() {
  fecharDeVez();
  sincronizarHistorico();
}
/** "Voltar" de dentro do painel: o mesmo que o botão voltar do aparelho. */
function voltarPainel(n) {
  // Usado direto como onclick: o evento chega no lugar do número.
  const niveis = typeof n === 'number' ? n : 1;
  if (pilha.length <= niveis) { fecharPainel(); return; }
  pilha.splice(pilha.length - niveis, niveis);
  while (pilha.length && !pilha[pilha.length - 1].reabrir) pilha.pop();
  if (!pilha.length) { fecharPainel(); return; }
  restaurando = true;
  try { pilha[pilha.length - 1].reabrir(); } finally { restaurando = false; }
  sincronizarHistorico();
}

/**
 * Confirmação de algo que apaga ou zera: diz o que vai acontecer, com o
 * botão da ação em vermelho e "Cancelar" (ou o voltar do aparelho) ao lado.
 * `aoConfirmar` faz a ação e decide para onde o painel vai depois.
 */
function confirmar({ titulo, texto, acao, aoConfirmar, perigo = true }) {
  abrirPainel(`<div class="confirmacao">
      <span class="icone-confirmar${perigo ? ' perigo' : ''}" aria-hidden="true">${perigo
        ? '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/></svg>'}</span>
      <h3>${titulo}</h3>
      <p>${texto}</p>
    </div>
    <button class="btn grande ${perigo ? 'perigo-cheio' : 'primario'}" id="cfSim" type="button">${acao}</button>
    <button class="btn grande" id="cfNao" type="button">Cancelar</button>`);
  $('cfNao').onclick = () => voltarPainel();
  $('cfSim').onclick = aoConfirmar;
}
fundo.addEventListener('click', (e) => { if (e.target === fundo) fecharPainel(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && fundo.classList.contains('aberto')) voltarPainel(); });

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

async function painelEnviar() {
  if (!itens.length) { aviso('A lista está vazia'); return; }
  const meta = { nome: lista.nome, tipo: lista.tipo, uid: lista.uid };
  const link = await montarLink(novaCompra(itens), location.href, meta);
  const texto = paraTexto(itens, lista.nome);
  // O que entrou depois do último envio: dá para mandar só isso, como complemento.
  const novos = novosDesdeOEnvio(lista);
  const soNovos = novos.length && novos.length < itens.length;
  const enviou = () => { marcarComoEnviados(lista); guardar(); };
  // Quem já está comprando quer devolver o resultado; quem montou quer mandar a lista.
  const comprando = itens.some(resolvido);
  const r = resumoDaCompra(itens);
  abrirPainel(`<h3>${comprando ? 'Enviar o retorno ou a lista' : 'Enviar a lista'}</h3>
    ${comprando ? `<p>O retorno mostra para quem fez a lista o que você pegou (${r.pegos}), o que não tinha (${r.faltaram}) e o que ficou sem comprar (${r.total - r.resolvidos})${r.comPreco ? `, com o total de ${formatarPreco(r.gasto)}` : ''}.</p>
    <button class="btn primario grande" id="eRetorno" type="button">Enviar retorno</button>
    <button class="btn" id="eRetornoTexto" type="button">Retorno como texto</button>
    <h4 class="sub">Ou mandar a lista</h4>` : ''}
    ${soNovos ? `<p>Desde o último envio entraram <b>${plural(novos.length, 'item', 'itens')}</b>: ${novos.slice(0, 6).map((i) => esc(i.nome)).join(', ')}${novos.length > 6 ? '…' : ''}. Quem está com a lista recebe só isso e põe direto na lista dela.</p>
    <button class="btn ${comprando ? '' : 'primario grande'}" id="eNovos" type="button">Mandar só o que é novo (${novos.length})</button>
    <h4 class="sub">Ou a lista inteira</h4>` : ''}
    <p>Quem receber toca no link e a lista abre pronta no celular, com ${plural(itens.length, 'item', 'itens')}.</p>
    <button class="btn ${comprando || soNovos ? '' : 'primario grande'}" id="eLink" type="button">Enviar link da lista</button>
    <div class="fileira">
      <button class="btn" id="eQr" type="button">QR code</button>
      <button class="btn" id="eTexto" type="button">Como texto</button>
      <button class="btn" id="eComplemento" type="button">Como complemento</button>
    </div>
    <p class="obs">Complemento: para quem já saiu com a lista receber estes itens e juntar à dela, sem perder o que já pegou.</p>
    <div id="qr" class="qr" hidden></div>
    <button class="btn discreto" data-fechar type="button">Fechar</button>`);
  if (comprando) {
    $('eRetorno').onclick = enviarRetorno;
    $('eRetornoTexto').onclick = () => { const t = textoDoRetorno(itens); compartilhar({ text: t }, t); };
  }
  $('eLink').onclick = () => { enviou(); compartilhar({ title: 'NaLista', text: '🛒 Chegou uma lista para você no NaLista — toque para abrir:', url: link }, link); };
  $('eTexto').onclick = () => { enviou(); compartilhar({ text: texto }, texto); };
  $('eComplemento').onclick = () => { enviou(); enviarComplemento(itens, meta); };
  if ($('eNovos')) $('eNovos').onclick = () => { enviou(); enviarComplemento(novos, meta); };
  $('eQr').onclick = () => {
    const caixa = $('qr');
    if (!caixa.hidden) { caixa.hidden = true; return; }
    const q = qrcode(0, 'L');
    enviou();
    q.addData(link);
    q.make();
    caixa.innerHTML = q.createSvgTag({ cellSize: 4, margin: 3, scalable: true }) +
      '<p>Aponte a câmera do outro celular para o código.</p>';
    caixa.hidden = false;
  };
}
$('bEnviar').onclick = () => painelEnviar();

/** Complemento: itens soltos para juntar à lista de quem já está comprando. */
async function enviarComplemento(lista_, meta) {
  const limpos = novaCompra(lista_);
  const link = await montarLinkDeComplemento(limpos, location.href, meta);
  const texto = textoDoComplemento(limpos, meta.nome, formatarQtd);
  compartilhar({ title: 'NaLista', text: `${texto}\n\nToque para pôr na sua lista:`, url: link }, `${texto}\n\n${link}`);
}

// ---------------------------------------------------------------- receber
function painelRecebida(novos, origem, meta) {
  // A mesma lista chegando de novo (já ligada a uma daqui) é um complemento: só entra o que mudou.
  if (meta?.uid && estado.listas.some((l) => (l.uids || []).includes(meta.uid))) { painelComplemento(novos, meta, true); return; }
  const n = novos.length;
  const tipo = meta?.tipo in TIPOS ? meta.tipo : 'outros';
  const nomeNovo = meta?.nome || (origem === 'link' ? 'Lista recebida' : 'Lista lida');
  const atualVazia = !itens.length;
  // Texto colado ou compartilhado (do Google Lens, de uma foto, do WhatsApp) pode vir com erro de leitura:
  // a pessoa confere e tira o que saiu errado antes de entrar.
  const conferir = origem !== 'link';
  const escolhidos = new Set(novos.map((_, k) => k));
  const selecao = () => novos.filter((_, k) => escolhidos.has(k)).map((i) => ({ ...i }));
  const nomes = novos.slice(0, 8).map((i) => esc(i.nome) + (i.qtd != null ? ` <span class="cinza">${formatarQtd(i)}</span>` : '')).join(', ') + (n > 8 ? ` e mais ${n - 8}` : '');
  abrirPainel(`<h3>${origem === 'link' ? 'Chegou uma lista para você' : `Encontrei ${plural(n, 'item', 'itens')}`}</h3>
    ${meta ? `<p class="tag-lista">${iconeTipo(tipo)}<b>${esc(meta.nome)}</b></p>` : ''}
    ${conferir
      ? `<p>Confira o que foi lido. Toque para tirar o que saiu errado; o resto você ajusta depois na lista.</p>
    <div class="chips modelo">${novos.map((i, k) => `<button type="button" class="chip escolha" data-k="${k}" aria-pressed="true">${esc(i.nome)}${i.qtd != null ? ` <span class="cinza">${formatarQtd(i)}</span>` : ''}${i.obs ? ` <span class="cinza">(${esc(i.obs)})</span>` : ''}</button>`).join('')}</div>`
      : `<p><b>${plural(n, 'item', 'itens')}:</b> ${nomes}.</p>`}
    ${atualVazia
      ? '<button class="btn primario grande" id="rAqui" type="button">Usar esta lista</button>'
      : conferir
        ? `<button class="btn primario grande" id="rJuntar" type="button">Pôr em ${esc(lista.nome)}</button>
    <div class="fileira">
      <button class="btn" id="rNova" type="button">Lista nova</button>
      <button class="btn" id="rTrocar" type="button">Substituir ${esc(lista.nome)}</button>
    </div>`
        : `<button class="btn primario grande" id="rNova" type="button">Abrir como lista nova</button>
    <div class="fileira">
      <button class="btn" id="rJuntar" type="button">Juntar à ${esc(lista.nome)}</button>
      <button class="btn" id="rTrocar" type="button">Substituir ${esc(lista.nome)}</button>
    </div>`}
    <button class="btn discreto" data-fechar type="button">Agora não</button>`);
  const acoes = ['rAqui', 'rNova', 'rJuntar', 'rTrocar'].map($).filter(Boolean);
  const contar = () => {
    const k = escolhidos.size;
    acoes.forEach((b) => { b.disabled = !k; });
    if ($('rJuntar') && conferir) $('rJuntar').textContent = k ? `Pôr ${plural(k, 'item', 'itens')} em ${lista.nome}` : 'Escolha pelo menos um item';
    if ($('rAqui') && conferir) $('rAqui').textContent = k ? `Usar ${plural(k, 'item', 'itens')}` : 'Escolha pelo menos um item';
  };
  painel.querySelectorAll('[data-k]').forEach((b) => {
    b.onclick = () => {
      const k = Number(b.dataset.k);
      if (escolhidos.has(k)) escolhidos.delete(k); else escolhidos.add(k);
      b.setAttribute('aria-pressed', String(escolhidos.has(k)));
      contar();
    };
  });
  contar();
  const terminar = (msg, podeDesfazer = true) => { guardar(); fecharPainel(); desenhar(); aviso(msg, podeDesfazer); };
  if ($('rAqui')) {
    $('rAqui').onclick = () => {
      marcarParaDesfazer();
      itens = selecao(); lista.compraRegistrada = false;
      if (meta) { lista.nome = nomeLivre({ listas: estado.listas.filter((l) => l !== lista) }, meta.nome); lista.tipo = tipo; ligar(lista, meta.uid); }
      lembrar(itens);
      terminar(conferir ? plural(itens.length, 'item entrou', 'itens entraram') : 'Lista recebida');
    };
    return;
  }
  $('rNova').onclick = () => {
    const nova = criarLista(nomeLivre(estado, nomeNovo), tipo, selecao());
    // A cópia recebida usa a mesma identidade da original: os complementos de
    // qualquer um dos dois lados acham a lista certa.
    if (meta?.uid) nova.uid = meta.uid;
    ligar(nova, meta?.uid);
    estado.listas.push(nova);
    trocarPara(nova.id, false);
    // Lista nova não mexe em nenhuma outra: nada para desfazer.
    antesDeDesfazer = null;
    terminar(`Lista ${nova.nome} criada`, false);
  };
  $('rJuntar').onclick = () => {
    marcarParaDesfazer();
    const r = complementar(itens, selecao());
    itens = r.itens; ligar(lista, meta?.uid); lista.compraRegistrada = false;
    terminar(conferir ? `${plural(r.novos.length, 'item novo', 'itens novos')} em ${lista.nome}` : 'Listas juntadas');
  };
  $('rTrocar').onclick = () => { marcarParaDesfazer(); itens = selecao(); ligar(lista, meta?.uid); lista.compraRegistrada = false; terminar('Lista substituída'); };
}

/**
 * Chegaram itens para uma lista que já está aberta em algum lugar.
 * Destino: a lista ligada (identidade do link), senão a de mesmo nome,
 * senão a que está em compra, senão a aberta. A pessoa pode trocar.
 */
function painelComplemento(chegaram, meta, mesmaLista = false) {
  const alvo = listaDoComplemento(estado, meta);
  const sugerida = alvo || listaEmCompra(estado) || lista;
  const n = chegaram.length;
  const nomes = chegaram.slice(0, 8).map((i) => esc(i.nome) + (i.qtd != null ? ` <span class="cinza">${formatarQtd(i)}</span>` : '')).join(', ') + (n > 8 ? ` e mais ${n - 8}` : '');
  const outras = listasPorUso(estado).filter((l) => l !== sugerida);
  abrirPainel(`<h3>${mesmaLista ? `A lista ${esc(sugerida.nome)} chegou de novo` : `Chegaram mais ${plural(n, 'item', 'itens')}`}</h3>
    ${meta?.nome && !mesmaLista ? `<p>Para a lista <b>${esc(meta.nome)}</b>.</p>` : ''}
    <p><b>${mesmaLista ? `${plural(n, 'item', 'itens')}:` : 'Itens:'}</b> ${nomes}.</p>
    <p>${mesmaLista ? 'Entra só o que é novo ou aumentou. O que você já pegou ou não tinha fica como está.' : 'Entra só o que é novo ou mudou. Item que você já tinha pegado volta para pegar, com "pediram mais".'}</p>
    <button class="btn primario grande" id="cAqui" type="button">Pôr em ${esc(sugerida.nome)}</button>
    ${outras.length ? `<h4 class="sub">Ou em outra lista</h4><div class="chips">${outras.map((l) => `<button class="chip" type="button" data-destino="${l.id}">${esc(l.nome)}</button>`).join('')}<button class="chip" type="button" id="cNova">+ Lista nova</button></div>`
      : '<button class="btn" id="cNova" type="button">Abrir como lista nova</button>'}
    <button class="btn discreto" data-fechar type="button">Agora não</button>`);
  const aplicar = (destino) => {
    if (destino !== lista) trocarPara(destino.id, false);
    marcarParaDesfazer();
    const r = complementar(itens, chegaram, { reabrir: !mesmaLista });
    itens = r.itens;
    ligar(lista, meta?.uid);
    lista.compraRegistrada = false;
    guardar(); fecharPainel(); desenhar(); window.scrollTo({ top: 0 });
    const partes = [];
    if (r.novos.length) partes.push(plural(r.novos.length, 'item novo', 'itens novos'));
    if (r.reabertos.length) partes.push(`${r.reabertos.length} voltou para pegar`);
    if (r.atualizados.length) partes.push(`${plural(r.atualizados.length, 'quantidade mudou', 'quantidades mudaram')}`);
    aviso(partes.length ? `${partes.join(' · ')} em ${lista.nome}` : `Nada novo para ${lista.nome}`, true);
  };
  $('cAqui').onclick = () => aplicar(sugerida);
  painel.querySelectorAll('[data-destino]').forEach((b) => { b.onclick = () => aplicar(estado.listas.find((l) => l.id === b.dataset.destino)); });
  $('cNova').onclick = () => {
    const nova = criarLista(nomeLivre(estado, meta?.nome || 'Complemento'), meta?.tipo in TIPOS ? meta.tipo : 'outros', chegaram.map((i) => ({ ...i, novo: true })));
    ligar(nova, meta?.uid);
    estado.listas.push(nova);
    trocarPara(nova.id, false);
    antesDeDesfazer = null;
    guardar(); fecharPainel(); desenhar();
    aviso(`Lista ${nova.nome} criada`);
  };
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
      itens = faltando; guardar(); fecharPainel(); desenhar();
      aviso(`Lista nova com ${plural(faltando.length, 'item', 'itens')}`, true);
    };
  }
  if ($('vJuntar')) {
    $('vJuntar').onclick = () => {
      marcarParaDesfazer();
      itens = juntar(itens, faltando); guardar(); fecharPainel(); desenhar();
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
    const complemento = codigoDeComplemento(texto);
    if (complemento) {
      const { itens: chegaram, meta } = await decodificarLista(complemento);
      if (!chegaram.length) return false;
      painelComplemento(chegaram, meta);
      return true;
    }
    // Texto de complemento colado ou compartilhado ("➕ Mais 3 itens para Mercado").
    const doTexto = listaDoTextoDeComplemento(texto);
    if (doTexto && !codigoDoEndereco(texto)) {
      const chegaram = lerTexto(texto);
      if (!chegaram.length) return false;
      painelComplemento(chegaram, { nome: doTexto });
      return true;
    }
    const codigo = codigoDoEndereco(texto);
    const { itens: novos, meta } = codigo ? await decodificarLista(codigo) : { itens: lerTexto(texto), meta: null };
    if (!novos.length) return false;
    painelRecebida(novos, codigo ? 'link' : origem, meta);
    return true;
  } catch {
    return false;
  }
}

function painelImportar(dica = '') {
  abrirPainel(`<h3>Importar uma lista</h3>
    <p>${dica ? esc(dica) : 'Cole o link ou o texto que você recebeu, da lista ou do retorno da compra. Também serve uma lista simples, um item por linha ou separada por vírgula.'}</p>
    <textarea id="iTexto" placeholder="Cole aqui"></textarea>
    <button class="btn primario grande" id="iLer" type="button">Continuar</button>
    <button class="btn discreto" data-fechar type="button">Fechar</button>`);
  $('iLer').onclick = async () => {
    if (!(await receber($('iTexto').value, 'texto'))) aviso('Nenhum item encontrado');
  };
}

const temCodigo = (hash) => !!(codigoDoEndereco(hash) || codigoDeRetorno(hash) || codigoDeComplemento(hash));

// O mesmo link pode chegar duas vezes (endereço e launchQueue): abre uma só.
const jaAbertos = new Set();
async function abrirLink(hash) {
  if (jaAbertos.has(hash)) return;
  jaAbertos.add(hash);
  if (!(await receber(hash, 'link'))) aviso('Esse link está incompleto');
}

async function lerLinkDoEndereco() {
  const hash = location.hash;
  if (!temCodigo(hash)) return;
  // Tira o código do endereço: recarregar a página não pergunta de novo.
  history.replaceState(null, '', location.pathname + location.search);
  if (instalado) { esqueceEsperando(); abrirLink(hash); return; }
  // Aberto numa aba do navegador. Quem usa o app instalado quer a lista lá.
  if (await usaOApp()) { deixarParaOApp(hash); painelNoApp(hash); return; }
  if (ehAndroidForaDoChrome) { painelAbrirNoChrome(hash); return; }
  abrirLink(hash);
}
addEventListener('hashchange', lerLinkDoEndereco);

/**
 * O app está instalado neste celular? No Chrome do Android, o app e a aba
 * guardam no mesmo lugar: o sinal que o app deixa ao abrir aparece aqui.
 * getInstalledRelatedApps confirma quando o navegador sabe responder.
 */
async function usaOApp() {
  if (appUsadoHaPouco()) return true;
  try {
    if (navigator.getInstalledRelatedApps) return (await navigator.getInstalledRelatedApps()).length > 0;
  } catch { /* sem resposta */ }
  return false;
}

async function resumoDoLink(hash) {
  try {
    if (codigoDeRetorno(hash)) return 'o retorno da compra';
    const codigo = codigoDeComplemento(hash) || codigoDoEndereco(hash);
    const { itens: chegaram, meta } = await decodificarLista(codigo);
    return `${meta?.nome ? `a lista <b>${esc(meta.nome)}</b>, com ` : ''}${plural(chegaram.length, 'item', 'itens')}`;
  } catch { return 'a lista'; }
}

/** A lista ficou esperando no app: é só abrir o NaLista pela tela inicial. */
async function painelNoApp(hash) {
  abrirPainel(`<h3>A lista já está no seu app</h3>
    <p>Chegou ${await resumoDoLink(hash)}. Ela ficou esperando no <b>NaLista</b>: abra o app pelo ícone na tela inicial do celular e ela aparece lá.</p>
    <p class="cinza">No Chrome, o menu ⋮ também pode ter a opção <b>Abrir no app</b>.</p>
    <button class="btn primario grande" data-fechar type="button">Entendi</button>
    <button class="btn discreto" id="naAqui" type="button">Abrir aqui no navegador</button>`);
  $('naAqui').onclick = () => { esqueceEsperando(); fecharPainel(); abrirLink(hash); };
}

/**
 * Navegador da Samsung (ou outro): o app foi instalado pelo Chrome, que guarda
 * em outro lugar. O botão leva o link para o Chrome, que entrega ao app.
 */
async function painelAbrirNoChrome(hash) {
  abrirPainel(`<h3>Chegou uma lista para você</h3>
    <p>Chegou ${await resumoDoLink(hash)}. Usa o app <b>NaLista</b> instalado? Toque abaixo para mandar a lista para ele.</p>
    <button class="btn primario grande" id="ncApp" type="button">Abrir no app NaLista</button>
    <button class="btn discreto" id="ncAqui" type="button">Abrir aqui mesmo</button>`);
  $('ncApp').onclick = () => {
    const alvo = endereco + hash;
    location.href = `intent://${endereco.replace(/^https?:\/\//, '')}${hash}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(alvo)};end`;
  };
  $('ncAqui').onclick = () => { fecharPainel(); abrirLink(hash); };
}

/** No app: o que a aba do navegador deixou esperando. */
function abrirOQueEsperava() {
  if (!instalado) return;
  const hash = pegarDoApp();
  if (hash) abrirLink(hash);
}

/**
 * Link tocado com o app já aberto (launch_handler "navigate-existing"):
 * o Chrome não recarrega a página, entrega o endereço por aqui.
 */
if ('launchQueue' in window) {
  window.launchQueue.setConsumer((params) => {
    if (!params.targetURL || !matchMedia('(display-mode: standalone)').matches) return;
    const url = new URL(params.targetURL);
    if (temCodigo(url.hash)) { esqueceEsperando(); abrirLink(url.hash); }
  });
}

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

// ---------------------------------------------------------------- listas prontas
function painelModelos() {
  const naLista = new Set(itens.map((i) => i.nome.toLowerCase()));
  const linha = (m, todos, attr) => {
    const faltam = todos.filter((i) => !naLista.has(i.nome.toLowerCase())).length;
    const resumo = faltam === todos.length ? plural(todos.length, 'item', 'itens') : `${faltam} de ${todos.length} fora da lista`;
    return `<li><button type="button" class="lista-linha" ${attr}>${iconeTipo(m.tipo)}<span class="nome">${esc(m.nome)}<small>${m.descricao ? `${esc(m.descricao)} · ` : ''}${resumo}</small></span></button></li>`;
  };
  const minhas = prontasPara(prontas, lista.tipo);
  abrirPainel(`<h3>Listas prontas</h3>
    <p>Escolha uma, desmarque o que não precisa e adicione tudo de uma vez em ${esc(lista.nome)}.</p>
    ${itens.length ? `<button class="btn grande" id="mSalvar" type="button">+ Salvar ${esc(lista.nome)} como lista pronta</button>` : ''}
    ${minhas.length ? `<h4 class="sub">Suas</h4><ul class="listas">${minhas.map((m) => linha(m, itensDaPronta(m), `data-minha="${m.id}"`)).join('')}</ul>` : ''}
    <h4 class="sub">${minhas.length ? 'Do app' : 'Sugestões do app'}</h4>
    <ul class="listas">${modelosPara(lista.tipo).map((m) => linha(m, itensDoModelo(m), `data-modelo="${m.id}"`)).join('')}</ul>
    <button class="btn discreto" data-fechar type="button">Fechar</button>`);
  if ($('mSalvar')) $('mSalvar').onclick = () => painelSalvarPronta();
  painel.querySelectorAll('[data-modelo]').forEach((b) => {
    b.onclick = () => painelModelo(modelosPara(lista.tipo).find((m) => m.id === b.dataset.modelo));
  });
  painel.querySelectorAll('[data-minha]').forEach((b) => {
    b.onclick = () => painelModelo(prontas.find((m) => m.id === b.dataset.minha));
  });
}

/** Uma lista pronta (do app ou da pessoa): escolher o que entra. As da pessoa também se renomeiam e apagam. */
function painelModelo(m) {
  // Ao voltar para uma lista pronta da pessoa, pega a versão atual (pode ter sido renomeada).
  m = prontas.find((p) => p.id === m.id) || m;
  const propria = prontas.some((p) => p.id === m.id);
  const naLista = new Set(itens.map((i) => i.nome.toLowerCase()));
  const todos = propria ? itensDaPronta(m) : itensDoModelo(m);
  const escolhidos = new Set(todos.filter((i) => !naLista.has(i.nome.toLowerCase())).map((i) => i.nome));
  abrirPainel(`<h3>${esc(m.nome)}</h3>
    <p>Toque para tirar ou pôr de volta.${propria ? '' : ' As quantidades você ajusta depois.'}</p>
    <div class="chips modelo">${todos.map((i) => {
      const ja = naLista.has(i.nome.toLowerCase());
      return `<button type="button" class="chip escolha" data-nome="${esc(i.nome)}" aria-pressed="${escolhidos.has(i.nome)}" ${ja ? 'disabled' : ''}>${esc(i.nome)}${i.qtd != null ? ` <span class="cinza">${formatarQtd(i)}</span>` : ''}${i.obs ? ` <span class="cinza">(${esc(i.obs)})</span>` : ''}${ja ? ' <span class="cinza">já na lista</span>' : ''}</button>`;
    }).join('')}</div>
    <button class="btn primario grande" id="mAdicionar" type="button"></button>
    <div class="fileira">
      <button class="btn" id="mTodos" type="button">Marcar todos</button>
      <button class="btn" id="mNenhum" type="button">Desmarcar todos</button>
    </div>
    ${propria ? `<div class="fileira">
      <button class="btn" id="mRenomear" type="button">Renomear</button>
      <button class="btn perigo" id="mApagar" type="button">Apagar</button>
    </div>` : ''}
    <button class="btn discreto" id="mVoltar" type="button">Voltar</button>`);
  const botoes = [...painel.querySelectorAll('.escolha:not([disabled])')];
  const atualizar = () => {
    botoes.forEach((b) => b.setAttribute('aria-pressed', String(escolhidos.has(b.dataset.nome))));
    const n = escolhidos.size;
    $('mAdicionar').textContent = n ? `Adicionar ${plural(n, 'item', 'itens')}` : 'Escolha pelo menos um item';
    $('mAdicionar').disabled = !n;
  };
  botoes.forEach((b) => { b.onclick = () => { escolhidos.has(b.dataset.nome) ? escolhidos.delete(b.dataset.nome) : escolhidos.add(b.dataset.nome); atualizar(); }; });
  $('mTodos').onclick = () => { botoes.forEach((b) => escolhidos.add(b.dataset.nome)); atualizar(); };
  $('mNenhum').onclick = () => { escolhidos.clear(); atualizar(); };
  $('mVoltar').onclick = voltarPainel;
  $('mAdicionar').onclick = () => {
    const escolha = todos.filter((i) => escolhidos.has(i.nome));
    // As da pessoa entram como foram guardadas (quantidade, unidade, observação); as do app passam pelo histórico.
    const novos = propria
      ? escolha.map((i) => ({ ...i }))
      : paraItens(escolha.map((i) => ({ nome: i.nome, cat: i.cat, qtd: i.qtd, un: i.un, unDita: i.qtd != null })));
    if (propria) { prontas = marcarUso(prontas, m.id); salvarProntas(prontas); }
    fecharPainel();
    adicionar(novos);
  };
  if (propria) {
    $('mRenomear').onclick = () => painelRenomearPronta(m);
    $('mApagar').onclick = () => confirmar({
      titulo: `Apagar a lista pronta ${esc(m.nome)}?`,
      texto: `Ela some das suas listas prontas. As suas listas e os itens que já estão nelas não mudam.`,
      acao: 'Apagar lista pronta',
      aoConfirmar: () => {
        const antes = prontas;
        prontas = apagarPronta(prontas, m.id); salvarProntas(prontas);
        voltarPainel(2); // sai da confirmação e da lista pronta apagada
        aviso(`Lista pronta ${m.nome} apagada`, true, () => { prontas = antes; salvarProntas(prontas); if (fundo.classList.contains('aberto') && pilha[pilha.length - 1]?.reabrir) pilha[pilha.length - 1].reabrir(); });
      },
    });
  }
  atualizar();
}

/** Guardar a lista aberta como lista pronta, para usar de novo depois. */
function painelSalvarPronta() {
  const comQtd = itens.some((i) => i.qtd != null);
  abrirPainel(`<h3>Salvar como lista pronta</h3>
    <p>Os ${plural(itens.length, 'item', 'itens')} de ${esc(lista.nome)} ficam guardados para montar outra lista igual depois. Marcas, preços e "não tinha" não vão junto.</p>
    <label class="campo">Nome da lista pronta<input class="texto" id="spNome" value="${esc(lista.nome)}" autocomplete="off" maxlength="60" enterkeyhint="done"></label>
    ${comQtd ? '<label class="marcar"><input type="checkbox" id="spQtd" checked> Guardar as quantidades</label>' : ''}
    <p class="obs" id="spAviso" hidden></p>
    <button class="btn primario grande" id="spSalvar" type="button">Salvar lista pronta</button>
    <button class="btn discreto" id="spVoltar" type="button">Cancelar</button>`);
  const nome = $('spNome');
  const conferir = () => {
    const ja = existePronta(prontas, nome.value.trim());
    $('spAviso').hidden = !ja;
    $('spAviso').textContent = ja ? `Já existe uma lista pronta com esse nome: ela será trocada por esta.` : '';
    $('spSalvar').textContent = ja ? `Trocar a lista pronta ${nome.value.trim()}` : 'Salvar lista pronta';
  };
  nome.addEventListener('input', conferir);
  conferir();
  const salvar = () => {
    if (!nome.value.trim()) { nome.focus(); return; }
    const p = criarPronta(nome.value, lista.tipo, itens, { comQuantidades: $('spQtd') ? $('spQtd').checked : false });
    const r = guardarPronta(prontas, p);
    prontas = r.prontas; salvarProntas(prontas);
    voltarPainel();
    aviso(r.substituiu ? `Lista pronta ${p.nome} atualizada` : `Lista pronta ${p.nome} salva`);
  };
  $('spSalvar').onclick = salvar;
  nome.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); salvar(); } });
  $('spVoltar').onclick = voltarPainel;
}

function painelRenomearPronta(m) {
  abrirPainel(`<h3>Renomear lista pronta</h3>
    <label class="campo">Nome<input class="texto" id="rpNome" value="${esc(m.nome)}" autocomplete="off" maxlength="60" enterkeyhint="done"></label>
    <button class="btn primario grande" id="rpSalvar" type="button">Salvar</button>
    <button class="btn discreto" id="rpVoltar" type="button">Cancelar</button>`);
  const salvar = () => {
    const novas = renomearPronta(prontas, m.id, $('rpNome').value);
    if (!novas) { aviso($('rpNome').value.trim() ? 'Já existe uma lista pronta com esse nome' : 'Escreva um nome'); return; }
    prontas = novas; salvarProntas(prontas);
    voltarPainel(); // a lista pronta reabre já com o nome novo
    aviso('Nome trocado');
  };
  $('rpSalvar').onclick = salvar;
  $('rpNome').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); salvar(); } });
  $('rpVoltar').onclick = voltarPainel;
}

// ---------------------------------------------------------------- várias listas
/** Abre outra lista. `redesenhar` = false quando quem chama ainda vai mexer e desenhar. */
function trocarPara(id, redesenhar = true) {
  guardar();
  estado.ativa = id;
  lista = listaAtiva(estado);
  itens = lista.itens;
  salvarListas(estado);
  if (redesenhar) { desenhar(); window.scrollTo({ top: 0 }); }
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
    <button class="btn discreto" data-fechar type="button">Fechar</button>`);
  painel.querySelectorAll('[data-lista]').forEach((b) => {
    b.onclick = () => { fecharPainel(); if (b.dataset.lista !== lista.id) trocarPara(b.dataset.lista); };
  });
  $('lNova').onclick = () => painelDaLista(null);
  $('lEditar').onclick = () => painelDaLista(lista);
  const apagar = $('lApagar');
  if (apagar) {
    apagar.onclick = () => confirmar({
      titulo: `Apagar a lista ${esc(lista.nome)}?`,
      texto: `A lista e ${itens.length ? `os ${plural(itens.length, 'item', 'itens')} dela` : 'tudo dela'} somem deste celular. Quem recebeu a lista pelo link continua com a cópia. As compras anteriores ficam guardadas.`,
      acao: 'Apagar lista',
      aoConfirmar: () => {
        guardar();
        const antes = { listas: estado.listas, ativa: estado.ativa };
        const nome = lista.nome;
        estado.listas = estado.listas.filter((l) => l !== lista);
        estado.ativa = listasPorUso(estado)[0].id;
        lista = listaAtiva(estado); itens = lista.itens;
        salvarListas(estado); fecharPainel(); desenhar();
        aviso(`Lista ${nome} apagada`, true, () => {
          estado.listas = antes.listas; estado.ativa = antes.ativa;
          lista = listaAtiva(estado); itens = lista.itens;
          salvarListas(estado); desenhar();
        });
      },
    });
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
    desenhar(); window.scrollTo({ top: 0 });
    aviso(iniciais.length ? `${nova.nome} criada com ${plural(iniciais.length, 'item de sempre', 'itens de sempre')}` : `${nova.nome} criada`);
  };
}

$('bListas').onclick = () => painelListas();

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
    guardar(); fecharPainel(); desenhar(); aviso(msg, true);
  };
  if ($('cFaltou')) $('cFaltou').onclick = () => aplicar(faltando, `${plural(faltando.length, 'item entrou', 'itens entraram')} na lista`);
  $('cRepetir').onclick = () => aplicar(c.itens.map((i) => ({ ...i })), 'Compra repetida na lista');
  $('cVoltar').onclick = voltarPainel;
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
/*
 * Samsung Internet: ao instalar, ele mesmo monta o pacote do app, marcado para
 * um Android antigo, e o Play Protect bloqueia ("App de risco bloqueado"). No
 * Chrome o pacote é do Google e instala sem aviso. Então, no navegador da
 * Samsung, em vez de "Instalar", o app sugere abrir no Chrome.
 */
const ehSamsung = /SamsungBrowser/i.test(navigator.userAgent);
// Android fora do Chrome (Samsung, Firefox, navegador do WhatsApp/Instagram...): guarda em outro lugar que o app.
const ehAndroidForaDoChrome = /Android/i.test(navigator.userAgent)
  && (!/Chrome\/\d/.test(navigator.userAgent) || /SamsungBrowser|EdgA|OPR\/|Firefox|YaBrowser|UCBrowser|MiuiBrowser|HeyTap|; wv\)|FBAN|FBAV|Instagram/i.test(navigator.userAgent));
const endereco = location.origin + location.pathname;
function sugerirChrome() {
  let dispensou = false;
  try { dispensou = localStorage.getItem('nalista-dica-samsung') === '1'; } catch { /* ok */ }
  if (instalado || dispensou) return;
  faixa.innerHTML = `<span>No navegador da Samsung, o Android bloqueia a instalação. Para instalar o NaLista, abra no <b>Chrome</b>.</span>
    <div class="faixa-acoes"><button class="btn primario" id="fxChrome" type="button">Abrir no Chrome</button><button class="btn" id="fxCopiar" type="button">Copiar endereço</button></div>
    <button class="x" id="fxFechar" type="button" aria-label="Dispensar">×</button>`;
  faixa.hidden = false;
  faixa.classList.add('faixa-samsung');
  // Link de intenção do Android: abre este endereço direto no Chrome.
  // A lista aberta vai junto no link: no Chrome ela chega pronta para usar.
  $('fxChrome').onclick = async () => {
    const alvo = itens.length ? await montarLink(novaCompra(itens), endereco, { nome: lista.nome, tipo: lista.tipo, uid: lista.uid }) : endereco;
    const [semHash, hash = ''] = alvo.split('#');
    location.href = `intent://${semHash.replace(/^https?:\/\//, '')}${hash ? `#${hash}` : ''}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(alvo)};end`;
  };
  $('fxCopiar').onclick = () => copiar(endereco);
  $('fxFechar').onclick = () => { faixa.hidden = true; try { localStorage.setItem('nalista-dica-samsung', '1'); } catch { /* ok */ } };
}
if (ehSamsung) sugerirChrome();

addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  if (ehSamsung) return; // a faixa do Chrome já está no lugar
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

// O cabeçalho fixo cresce com a barra de adicionar: o item que acabou de entrar não fica escondido atrás dele.
const topo = document.querySelector('header');
const medirTopo = () => document.documentElement.style.setProperty('--altura-topo', `${topo.offsetHeight}px`);
if ('ResizeObserver' in window) new ResizeObserver(medirTopo).observe(topo);
medirTopo();

// ---------------------------------------------------------------- início
montarBarra();
desenhar();
if (instalado) marcarAppUsado();
lerLinkDoEndereco();
lerCompartilhado();
abrirOQueEsperava();

/*
 * Voltando para a tela: se outra janela gravou (a lista importada numa aba
 * do Chrome, por exemplo), recarrega para não gravar a versão velha por cima.
 */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (instalado) marcarAppUsado();
  if (mudouEmOutroLugar()) { location.reload(); return; }
  abrirOQueEsperava();
});
