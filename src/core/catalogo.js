/**
 * Catálogo de itens comuns: nome, categoria e a unidade em que costumam
 * ser comprados. Serve para completar o nome enquanto a pessoa digita e
 * para já trazer a unidade certa (banana em dúzia, carne em kg).
 *
 * Formato: "Nome/unidade", com a unidade omitida quando é "un".
 */

import { normalizar } from './categorias.js';

const BRUTO = {
  'Açougue': 'Frango/kg Peito de frango/kg Coxa de frango/kg Sobrecoxa/kg Asa de frango/kg Frango em cubos/kg Filé de frango/kg Carne moída/kg Patinho/kg Alcatra/kg Picanha/kg Maminha/kg Fraldinha/kg Contrafilé/kg Acém/kg Músculo/kg Costela/kg Cupim/kg Colchão mole/kg Carne de sol/kg Charque/kg Carne de porco/kg Bisteca/kg Lombo/kg Linguiça/kg Linguiça calabresa/pct Bacon/pct Salsicha/pct Peixe/kg Tilápia/kg Pescada/kg Salmão/kg Camarão/kg Carne/kg Fígado/kg Hambúrguer/cx Almôndega/pct',
  'Padaria': 'Pão/un Pão francês/un Pão de forma/pct Pão integral/pct Pão de queijo/pct Pão de hambúrguer/pct Bisnaguinha/pct Torrada/pct Bolo/un Croissant/un Rosca/un Sonho/un',
  'Frios e laticínios': 'Leite/cx Leite em caixa/cx Leite em pó/pct Leite desnatado/cx Iogurte/un Iogurte natural/un Bebida láctea/un Queijo/g Queijo muçarela/g Queijo coalho/pct Queijo prato/g Queijo parmesão/g Gorgonzola/g Requeijão/un Ricota/g Cream cheese/un Manteiga/un Margarina/un Creme de leite/cx Leite condensado/cx Nata/un Ovos/dz Presunto/g Mortadela/g Peito de peru/g Salame/g Coalhada/un Petit suisse/pct',
  'Hortifrúti': 'Banana/dz Maçã/kg Laranja/kg Limão/kg Tangerina/kg Uva/kg Melancia Melão Mamão Abacaxi Manga/kg Pera/kg Kiwi/kg Morango/cx Goiaba/kg Maracujá/kg Abacate Acerola/kg Caju/kg Coco Pitaya Tomate/kg Cebola/kg Cebola roxa/kg Alho Batata/kg Batata doce/kg Cenoura/kg Beterraba/kg Abobrinha/kg Berinjela/kg Chuchu/kg Pepino/kg Pimentão/kg Jerimum/kg Abóbora/kg Macaxeira/kg Inhame/kg Quiabo/kg Maxixe/kg Vagem/kg Milho verde Alface Rúcula Agrião Couve Repolho Brócolis Couve-flor Espinafre Coentro Cebolinha Cheiro-verde Salsa Hortelã Manjericão Gengibre Pimenta de cheiro Feijão verde/kg',
  'Mercearia': 'Arroz/pct Arroz integral/pct Feijão/pct Feijão preto/pct Feijão carioca/pct Feijão macassar/pct Cuscuz/pct Flocão/pct Farinha de mandioca/pct Farinha de trigo/pct Tapioca/pct Goma/pct Açúcar/pct Adoçante Café/pct Achocolatado Aveia/pct Granola/pct Cereal/cx Macarrão/pct Espaguete/pct Lasanha/pct Miojo/pct Óleo Azeite Vinagre Sal/pct Maizena/cx Fermento Gelatina/cx Extrato de tomate Molho de tomate Milho em lata Ervilha em lata Atum Sardinha Azeitona Palmito Ketchup Maionese Mostarda Shoyu Tempero pronto/pct Colorau/pct Pimenta do reino/pct Orégano/pct Cominho/pct Caldo de galinha/cx Biscoito/pct Bolacha/pct Biscoito cream cracker/pct Biscoito recheado/pct Pipoca/pct Amendoim/pct Castanha/pct Mel Doce de leite Goiabada Geleia Leite de coco Chocolate Granulado/pct Fubá/pct Polvilho/pct Mistura para bolo/pct Batata palha/pct Pão de alho/pct Nescau Chá/cx',
  'Bebidas': 'Água/L Água mineral/L Água com gás Refrigerante/L Suco/L Suco em pó/pct Polpa de fruta/pct Cerveja Vinho Energético Água de coco/L Café solúvel Isotônico',
  'Limpeza': 'Detergente Sabão em pó/cx Sabão líquido/L Sabão em barra/pct Amaciante/L Água sanitária/L Desinfetante/L Multiuso Álcool/L Álcool em gel Limpa vidro Lustra móveis Esponja/pct Palha de aço/pct Pano de chão Pano de prato Flanela Saco de lixo/pct Vassoura Rodo Luva Inseticida Tira manchas Pedra sanitária',
  'Higiene': 'Papel higiênico/pct Sabonete Sabonete líquido Shampoo Condicionador Creme de cabelo Pasta de dente Escova de dente Fio dental Enxaguante bucal Desodorante Absorvente/pct Fralda/pct Lenço umedecido/pct Cotonete/cx Algodão/pct Aparelho de barbear Creme de barbear Protetor solar Hidratante Papel toalha/pct Lenço de papel/cx',
  'Farmácia': 'Dipirona/cx Paracetamol/cx Ibuprofeno/cx Dorflex/cx Neosaldina/cx Buscopan/cx Omeprazol/cx Loratadina/cx Antiácido Vitamina C Vitamina D Soro fisiológico Curativo/cx Esparadrapo Gaze/pct Termômetro Xarope Pomada Colírio Repelente Teste de gravidez Seringa/pct',
  'Material e ferramentas': 'Parafuso/pct Prego/pct Bucha/pct Fita isolante Fita crepe Fita dupla face Cola Silicone Veda-rosca Tinta/L Pincel Rolo de pintura Lixa Lâmpada LED Tomada Interruptor Extensão Benjamim Cano Torneira Cimento/kg Argamassa/kg Broca',
  'Festa': 'Balão/pct Vela de aniversário Confete/pct Serpentina Chapeuzinho/pct Lembrancinha Papel de presente Fita de cetim Forminha/pct Topo de bolo Docinho Salgadinho Guardanapo de festa/pct',
  'Utilidades': 'Papel alumínio Papel filme Papel manteiga Papel amanteigado Guardanapo/pct Copo descartável/pct Prato descartável/pct Pilha/pct Lâmpada Fósforo/cx Vela/pct Saco plástico/pct Carvão/pct Gás',
};

/** [{ nome, cat, un, chave }] — chave é o nome normalizado. */
export const CATALOGO = Object.entries(BRUTO).flatMap(([cat, texto]) =>
  texto.split(' ').reduce((acc, parte) => {
    // Os nomes têm espaço; o separador real é a maiúscula inicial de cada item.
    if (acc.length && !/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(parte)) acc[acc.length - 1] += ' ' + parte;
    else acc.push(parte);
    return acc;
  }, []).map((entrada) => {
    const [nome, un = 'un'] = entrada.split('/');
    return { nome, cat, un, chave: normalizar(nome) };
  })
);

const POR_CHAVE = new Map(CATALOGO.map((c) => [c.chave, c]));

/** "tomates" → "tomate"; "pães" → "pao"; "limões" → "limao". */
function singular(chave) {
  return chave
    .split(' ')
    .map((p) => p.replace(/oes$|aes$/, 'ao').replace(/(r|z)es$/, '$1').replace(/is$/, 'l').replace(/s$/, ''))
    .join(' ');
}

/** O item do catálogo com esse nome (no singular ou no plural), ou null. */
export function procurarNoCatalogo(nome) {
  const chave = normalizar(nome).trim();
  return POR_CHAVE.get(chave) || POR_CHAVE.get(singular(chave)) || POR_CHAVE.get(chave + 's') || null;
}

/**
 * Sugestões para o que está sendo digitado: primeiro os que começam com o
 * texto, depois os que têm uma palavra começando com ele.
 */
export function sugerirDoCatalogo(texto, limite = 6) {
  const alvo = normalizar(texto).trim();
  if (alvo.length < 2) return [];
  const comeca = [], palavra = [];
  for (const c of CATALOGO) {
    if (c.chave.startsWith(alvo)) comeca.push(c);
    else if (c.chave.split(/[ -]/).some((p) => p.startsWith(alvo))) palavra.push(c);
  }
  return [...comeca.sort((a, b) => a.nome.length - b.nome.length), ...palavra].slice(0, limite);
}
