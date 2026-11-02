/**
 * A lista dentro do link: `.../lista_compras/#l=<código>`.
 *
 * Fica depois do `#` de propósito: essa parte do endereço nunca vai para o
 * servidor. A lista passa de um celular para o outro sem ninguém no meio.
 *
 * Formato antes de comprimir (curto, para o link caber no WhatsApp):
 *   [1, [[nome, cat, qtd, un?, obs?], ...]]
 *   cat é o número da categoria conhecida, ou o próprio texto.
 *   qtd é 0 quando não foi definida; un é omitida quando é "un" e não há obs.
 *
 * Código: "z" + deflate em base64url quando o aparelho comprime, ou
 * "j" + JSON em base64url quando não comprime. Os dois são lidos sempre.
 */

import { CATEGORIAS } from './categorias.js';
import { criarItem } from './lista.js';

const VERSAO = 1;

function paraBase64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(texto) {
  const b64 = texto.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function passarPor(bytes, transformacao) {
  const fluxo = new Blob([bytes]).stream().pipeThrough(transformacao);
  return new Uint8Array(await new Response(fluxo).arrayBuffer());
}

function compactar(itens) {
  return [VERSAO, itens.map((i) => {
    const c = CATEGORIAS.indexOf(i.cat);
    const linha = [i.nome, c >= 0 ? c : i.cat, i.qtd ?? 0];
    if (i.un !== 'un' || i.obs) linha.push(i.un);
    if (i.obs) linha.push(i.obs);
    return linha;
  })];
}

function descompactar(dados) {
  if (!Array.isArray(dados) || dados[0] !== VERSAO || !Array.isArray(dados[1])) {
    throw new Error('Link de lista inválido');
  }
  return dados[1]
    .filter((l) => Array.isArray(l) && typeof l[0] === 'string' && l[0].trim())
    .map(([nome, c, qtd, un, obs]) => {
      const item = criarItem(
        nome.trim().slice(0, 120),
        typeof c === 'number' ? (CATEGORIAS[c] || 'Outros') : String(c || 'Outros').slice(0, 40),
        typeof qtd === 'number' && qtd > 0 ? qtd : null,
        typeof un === 'string' ? un.slice(0, 6) : 'un',
      );
      if (typeof obs === 'string' && obs.trim()) item.obs = obs.trim().slice(0, 120);
      return item;
    });
}

export async function codificar(itens) {
  const bytes = new TextEncoder().encode(JSON.stringify(compactar(itens)));
  if (typeof CompressionStream === 'function') {
    try {
      return 'z' + paraBase64Url(await passarPor(bytes, new CompressionStream('deflate-raw')));
    } catch { /* cai no formato sem compressão */ }
  }
  return 'j' + paraBase64Url(bytes);
}

export async function decodificar(codigo) {
  const tipo = codigo[0];
  let bytes = deBase64Url(codigo.slice(1));
  if (tipo === 'z') {
    bytes = await passarPor(bytes, new DecompressionStream('deflate-raw'));
  } else if (tipo !== 'j') {
    throw new Error('Link de lista inválido');
  }
  return descompactar(JSON.parse(new TextDecoder().decode(bytes)));
}

/** Endereço do app + a lista: funciona na raiz e em subpasta do Pages. */
export async function montarLink(itens, endereco) {
  const base = endereco.split('#')[0].split('?')[0];
  return `${base}#l=${await codificar(itens)}`;
}

/** O código que está no `#l=` do endereço, ou null. */
export function codigoDoEndereco(hash) {
  const m = String(hash).match(/[#&]l=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}
