/**
 * Backup em arquivo: tudo o que o app guarda no aparelho, num .json que a
 * pessoa salva onde quiser e restaura em outro celular.
 */

export const FORMATO = 'nalista-backup';

export function montarBackup(dados, agora = new Date()) {
  return { formato: FORMATO, versao: 1, exportadoEm: agora.toISOString(), ...dados };
}

/** Confere o arquivo antes de restaurar. Devolve os dados ou lança um erro com mensagem para a pessoa. */
export function lerBackup(texto) {
  let dados;
  try { dados = JSON.parse(texto); } catch { throw new Error('Esse arquivo não é um backup do NaLista.'); }
  if (!dados || dados.formato !== FORMATO) throw new Error('Esse arquivo não é um backup do NaLista.');
  if (dados.versao !== 1) throw new Error('Esse backup é de uma versão mais nova do app. Atualize e tente de novo.');
  if (!dados.listas || dados.listas.v !== 2 || !Array.isArray(dados.listas.listas)) throw new Error('O backup está incompleto.');
  return dados;
}

export const nomeDoArquivo = (agora = new Date()) => `nalista-backup-${agora.toISOString().slice(0, 10)}.json`;
