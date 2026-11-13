/**
 * Tudo fica guardado só neste aparelho (localStorage).
 * Qualquer falha (modo anônimo, armazenamento cheio) não derruba o app:
 * ele segue funcionando, só não lembra depois de fechar.
 */

function ler(chave, padrao) {
  try {
    const v = JSON.parse(localStorage.getItem(chave));
    return v ?? padrao;
  } catch {
    return padrao;
  }
}
/*
 * No Android, o app instalado e o Chrome guardam no mesmo lugar. Quando a
 * lista é importada numa aba do Chrome, o app aberto em segundo plano ainda
 * tem a versão antiga na memória e, no próximo toque, gravaria por cima.
 * Cada gravação deixa uma marca; quem vê uma marca que não é a sua recarrega.
 */
const REVISAO = 'nalista-revisao';
let minhaRevisao = null;
try { minhaRevisao = localStorage.getItem(REVISAO); } catch { /* ok */ }

function gravar(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    minhaRevisao = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(REVISAO, minhaRevisao);
  } catch { /* segue sem guardar */ }
}

/** Outra janela (aba do navegador ou o app) gravou depois desta. */
export function mudouEmOutroLugar() {
  try { return localStorage.getItem(REVISAO) !== minhaRevisao; } catch { return false; }
}

/*
 * Lista esperando o app: o link abriu numa aba do navegador, mas a pessoa usa
 * o app instalado. A aba deixa o link aqui e o app abre ao ser aberto.
 */
const ESPERANDO = 'nalista-esperando-v1';
const VALIDADE_ESPERANDO = 7 * 24 * 3600 * 1000;
export function deixarParaOApp(hash) {
  try { localStorage.setItem(ESPERANDO, JSON.stringify({ hash, quando: Date.now() })); } catch { /* ok */ }
}
/** Tira e devolve o link que estava esperando (ou null). */
export function pegarDoApp() {
  try {
    const v = JSON.parse(localStorage.getItem(ESPERANDO));
    localStorage.removeItem(ESPERANDO);
    return v && typeof v.hash === 'string' && Date.now() - v.quando < VALIDADE_ESPERANDO ? v.hash : null;
  } catch { return null; }
}
export function esqueceEsperando() {
  try { localStorage.removeItem(ESPERANDO); } catch { /* ok */ }
}

/* O app instalado deixa um sinal de vida: a aba do Chrome sabe que ele existe. */
const APP_USADO = 'nalista-app-usado';
export function marcarAppUsado() {
  try { localStorage.setItem(APP_USADO, String(Date.now())); } catch { /* ok */ }
}
export function appUsadoHaPouco(dias = 45) {
  try { return Date.now() - Number(localStorage.getItem(APP_USADO) || 0) < dias * 24 * 3600 * 1000; } catch { return false; }
}

const LISTA = 'lista-compras-v1';
const LISTAS = 'nalista-listas-v2';
const COMPRAS = 'nalista-compras-v1';
const HISTORICO = 'lista-compras-historico-v1';
const ULTIMA = 'lista-compras-ultima-v1';

export function carregar() {
  const v = ler(LISTA, null);
  return Array.isArray(v) ? v : null;
}
export const salvar = (itens) => gravar(LISTA, itens);

export const carregarHistorico = () => ler(HISTORICO, {});
export const salvarHistorico = (h) => gravar(HISTORICO, h);

/** A última compra: a lista como estava quando foi concluída ou apagada. */
export const carregarUltima = () => ler(ULTIMA, null);
export const salvarUltima = (itens) => gravar(ULTIMA, itens);

const ORCAMENTO = 'lista-compras-orcamento-v1';
export const carregarOrcamento = () => { const v = ler(ORCAMENTO, null); return typeof v === 'number' && v > 0 ? v : null; };
export const salvarOrcamento = (v) => gravar(ORCAMENTO, v);

/** Várias listas (fase 6). O formato antigo, de uma lista só, fica em LISTA até migrar. */
export const carregarListas = () => ler(LISTAS, null);
export const salvarListas = (estado) => gravar(LISTAS, estado);
export const carregarCompras = () => { const v = ler(COMPRAS, []); return Array.isArray(v) ? v : []; };
export const salvarCompras = (c) => gravar(COMPRAS, c);

const MERCADOS = 'nalista-mercados-v1';
export const carregarMercados = () => { const v = ler(MERCADOS, []); return Array.isArray(v) ? v : []; };
export const salvarMercados = (m) => gravar(MERCADOS, m);

const PRONTAS = 'nalista-prontas-v1';
export const carregarProntas = () => { const v = ler(PRONTAS, []); return Array.isArray(v) ? v : []; };
export const salvarProntas = (p) => gravar(PRONTAS, p);

/** Tudo o que vai no backup, e o caminho de volta. */
export function lerTudo() {
  return {
    listas: carregarListas(), historico: carregarHistorico(), ultima: carregarUltima(),
    compras: carregarCompras(), orcamento: carregarOrcamento(), prontas: carregarProntas(),
    mercados: carregarMercados(),
  };
}
export function gravarTudo(d) {
  salvarListas(d.listas);
  salvarHistorico(d.historico || {});
  salvarUltima(d.ultima || null);
  salvarCompras(Array.isArray(d.compras) ? d.compras : []);
  salvarOrcamento(typeof d.orcamento === 'number' ? d.orcamento : null);
  salvarProntas(Array.isArray(d.prontas) ? d.prontas : []);
  salvarMercados(Array.isArray(d.mercados) ? d.mercados : []);
}
