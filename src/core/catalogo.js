/**
 * Catálogo de itens comuns: nome, categoria e a unidade em que costumam
 * ser comprados. Serve para completar o nome enquanto a pessoa digita e
 * para já trazer a unidade certa (banana em dúzia, carne em kg).
 *
 * Formato: "Nome/unidade", com a unidade omitida quando é "un".
 */

import { normalizar } from './categorias.js';

const BRUTO = {
  'Açougue': 'Frango/kg Peito de frango/kg Coxa de frango/kg Sobrecoxa/kg Asa de frango/kg Frango em cubos/kg Filé de frango/kg Carne moída/kg Patinho/kg Alcatra/kg Picanha/kg Maminha/kg Fraldinha/kg Contrafilé/kg Acém/kg Músculo/kg Costela/kg Cupim/kg Colchão mole/kg Carne de sol/kg Charque/kg Carne de porco/kg Bisteca/kg Lombo/kg Linguiça/kg Linguiça calabresa/pct Bacon/pct Salsicha/pct Peixe/kg Tilápia/kg Pescada/kg Salmão/kg Camarão/kg Carne/kg Fígado/kg Hambúrguer/cx Almôndega/pct Carne seca/kg Paleta/kg Lagarto/kg Costela de porco/kg Pernil/kg Panceta/kg Linguiça toscana/kg Linguiça de frango/kg Frango inteiro/kg Coração de frango/kg Moela/kg Bucho/kg Mocotó/kg Carne de bode/kg Carneiro/kg Merluza/kg Bacalhau/kg Camarão seco/pct Siri/kg Caranguejo',
  'Padaria': 'Pão/un Pão francês/un Pão de forma/pct Pão integral/pct Pão de queijo/pct Pão de hambúrguer/pct Bisnaguinha/pct Torrada/pct Bolo/un Croissant/un Rosca/un Sonho/un Pão de sal Pão doce Pão sírio/pct Pão australiano Pão de milho Pão careca Pão de leite/pct Pão de batata Broa Baguete Biscoito de polvilho/pct Bolo de rolo Bolo de milho Bolo de macaxeira Cuca Rosquinha/pct Torta Esfiha',
  'Frios e laticínios': 'Leite/cx Leite em caixa/cx Leite em pó/pct Leite desnatado/cx Iogurte/un Iogurte natural/un Bebida láctea/un Queijo/g Queijo muçarela/g Queijo coalho/pct Queijo prato/g Queijo parmesão/g Gorgonzola/g Requeijão/un Ricota/g Cream cheese/un Manteiga/un Margarina/un Creme de leite/cx Leite condensado/cx Nata/un Ovos/dz Presunto/g Mortadela/g Peito de peru/g Salame/g Coalhada/un Petit suisse/pct Queijo manteiga/g Queijo minas/g Queijo cottage Queijo ralado/pct Queijo provolone/g Manteiga da terra Ovo caipira/dz Ovo de codorna/pct Iogurte grego Leite fermentado/pct Leite integral/cx Leite semidesnatado/cx Leite sem lactose/cx Apresuntado/g Blanquet de peru/g Catupiry Kefir',
  'Hortifrúti': 'Banana/dz Maçã/kg Laranja/kg Limão/kg Tangerina/kg Uva/kg Melancia Melão Mamão Abacaxi Manga/kg Pera/kg Kiwi/kg Morango/cx Goiaba/kg Maracujá/kg Abacate Acerola/kg Caju/kg Coco Pitaya Tomate/kg Cebola/kg Cebola roxa/kg Alho Batata/kg Batata doce/kg Cenoura/kg Beterraba/kg Abobrinha/kg Berinjela/kg Chuchu/kg Pepino/kg Pimentão/kg Jerimum/kg Abóbora/kg Macaxeira/kg Inhame/kg Quiabo/kg Maxixe/kg Vagem/kg Milho verde Alface Rúcula Agrião Couve Repolho Brócolis Couve-flor Espinafre Coentro Cebolinha Cheiro-verde Salsa Hortelã Manjericão Gengibre Pimenta de cheiro Feijão verde/kg Batata inglesa/kg Batata baroa/kg Cará/kg Pimenta/kg Alho-poró Salsão Cebola branca/kg Tomate cereja/cx Graviola/kg Pinha/kg Sapoti/kg Umbu/kg Seriguela/kg Cajá/kg Jaca Mangaba/kg Ameixa/kg Pêssego/kg Banana-prata/dz Banana-da-terra/dz Banana-maçã/dz Mexerica/kg Laranja-lima/kg Couve manteiga Alface americana Rabanete/kg Cogumelo/cx Mix de folhas/pct',
  'Mercearia': 'Arroz/pct Arroz integral/pct Feijão/pct Feijão preto/pct Feijão carioca/pct Feijão macassar/pct Cuscuz/pct Flocão/pct Farinha de mandioca/pct Farinha de trigo/pct Tapioca/pct Goma/pct Açúcar/pct Adoçante Café/pct Achocolatado Aveia/pct Granola/pct Cereal/cx Macarrão/pct Espaguete/pct Lasanha/pct Miojo/pct Óleo Azeite Vinagre Sal/pct Maizena/cx Fermento Gelatina/cx Extrato de tomate Molho de tomate Milho em lata Ervilha em lata Atum Sardinha Azeitona Palmito Ketchup Maionese Mostarda Shoyu Tempero pronto/pct Colorau/pct Pimenta do reino/pct Orégano/pct Cominho/pct Caldo de galinha/cx Biscoito/pct Bolacha/pct Biscoito cream cracker/pct Biscoito recheado/pct Pipoca/pct Amendoim/pct Castanha/pct Mel Doce de leite Goiabada Geleia Leite de coco Chocolate Granulado/pct Fubá/pct Polvilho/pct Mistura para bolo/pct Batata palha/pct Pão de alho/pct Nescau Chá/cx Feijão fradinho/pct Feijão branco/pct Lentilha/pct Grão-de-bico/pct Arroz parboilizado/pct Farinha de milho/pct Farinha láctea Farofa pronta/pct Rapadura Açúcar mascavo/pct Açúcar demerara/pct Melado Café em cápsula/cx Macarrão instantâneo/pct Pasta de amendoim Aveia em flocos/pct Linhaça/pct Chia/pct Quinoa/pct Uva-passa/pct Coco ralado/pct Fermento biológico Bicarbonato Cravo/pct Canela/pct Louro/pct Páprica/pct Açafrão/pct Alho em pó/pct Molho de pimenta Molho barbecue Creme de cebola/pct Sopa instantânea/pct Purê instantâneo/pct Feijoada pronta Canjica/pct Mungunzá/pct Xerém/pct Massa de pastel/pct Massa de lasanha/pct Óleo de coco Azeite de dendê Caldo de carne/cx',
  'Bebidas': 'Água/L Água mineral/L Gelo/pct Água com gás Refrigerante/L Suco/L Suco em pó/pct Polpa de fruta/pct Cerveja Vinho Energético Água de coco/L Café solúvel Isotônico Guaraná/L Refrigerante zero/L Água tônica Cachaça Vodka Whisky Espumante Vinho tinto Vinho branco Suco de caixinha/cx Suco integral/L Néctar/L Chá gelado/L Água saborizada Kombucha Leite de soja/L Bebida vegetal/L Achocolatado pronto/cx Cajuína',
  'Limpeza': 'Detergente Sabão em pó/cx Sabão líquido/L Sabão em barra/pct Amaciante/L Água sanitária/L Desinfetante/L Multiuso Álcool/L Álcool em gel Limpa vidro Lustra móveis Esponja/pct Palha de aço/pct Pano de chão Pano de prato Flanela Saco de lixo/pct Vassoura Rodo Luva Inseticida Tira manchas Pedra sanitária Sabão de coco/pct Desengordurante Limpa forno Cloro/L Alvejante/L Cera/L Limpa piso/L Saponáceo Limpador de banheiro Desentupidor Purificador de ar Pá de lixo Balde Prendedor/pct Escova de lavar Lava-louças/L Tira-limo Naftalina/pct Pano multiuso/pct',
  'Higiene': 'Papel higiênico/pct Sabonete Sabonete líquido Shampoo Condicionador Creme de cabelo Pasta de dente Escova de dente Fio dental Enxaguante bucal Desodorante Absorvente/pct Lenço umedecido/pct Cotonete/cx Algodão/pct Aparelho de barbear Creme de barbear Protetor solar Hidratante Papel toalha/pct Lenço de papel/cx Fralda geriátrica/pct Sabonete íntimo Gel de cabelo Creme para pentear Escova de cabelo Pente Esmalte Removedor de esmalte Talco Perfume Colônia Protetor labial Demaquilante Protetor diário/pct Preservativo/cx Tintura de cabelo Óleo corporal Lâmina de barbear/pct',
  'Farmácia': 'Dipirona/cx Paracetamol/cx Ibuprofeno/cx Dorflex/cx Neosaldina/cx Buscopan/cx Omeprazol/cx Loratadina/cx Antiácido Vitamina C Vitamina D Soro fisiológico Curativo/cx Esparadrapo Gaze/pct Termômetro Xarope Pomada Colírio Repelente Teste de gravidez Seringa/pct Amoxicilina/cx Azitromicina/cx Nimesulida/cx Cetirizina/cx Simeticona Sal de frutas/cx Probiótico Polivitamínico Ômega 3 Fita de glicemia/cx Lanceta/cx Medidor de pressão Spray nasal Soro de reidratação/pct Pastilha para garganta/cx Água oxigenada Antisséptico Atadura Máscara/cx Anticoncepcional/cx',
  'Material e ferramentas': 'Parafuso/pct Prego/pct Bucha/pct Fita isolante Fita crepe Fita dupla face Cola Silicone Veda-rosca Tinta/L Pincel Rolo de pintura Lixa Lâmpada LED Tomada Interruptor Extensão Benjamim Cano Torneira Cimento/kg Argamassa/kg Broca Martelo Chave de fenda Alicate Trena Serrote Abraçadeira/pct Arame Mangueira Registro Sifão Disjuntor Fio elétrico Massa corrida/kg Rejunte/kg Gesso/kg Cadeado Dobradiça Fechadura Solvente/L Thinner/L Lona Escada',
  'Festa': 'Balão/pct Vela de aniversário Confete/pct Serpentina Chapeuzinho/pct Lembrancinha Papel de presente Fita de cetim Forminha/pct Topo de bolo Docinho Salgadinho Guardanapo de festa/pct Prato de papel/pct Talher descartável/pct Toalha de mesa descartável Painel de festa Vela estrela Brigadeiro Beijinho Cajuzinho Saquinho surpresa/pct Enfeite de mesa Fita de balão Bolo de festa',
  'Congelados': 'Pizza Lasanha congelada Nuggets/pct Sorvete Picolé Açaí Polpa congelada/pct Batata frita/pct Pão de queijo congelado/pct Legumes congelados/pct Ervilha congelada/pct Hambúrguer congelado/cx Frango empanado/pct Peixe empanado/pct Pastel congelado/pct Coxinha congelada/pct Kibe/pct Mandioca congelada/pct Torta congelada Macarrão congelado',
  'Doces e lanches': 'Bombom/pct Bala/pct Pirulito/pct Chiclete/pct Paçoca/pct Cocada Salgadinho de pacote/pct Batata chips/pct Amendoim japonês/pct Barra de cereal/cx Barra de chocolate Biscoito wafer/pct Cookie/pct Bolinho/pct Pastel Coxinha Empada Pão de mel Brownie Pudim Mousse Marshmallow/pct Jujuba/pct Castanha de caju/pct Mix de castanhas/pct Pipoca de micro-ondas/pct Nachos/pct',
  'Pet': 'Ração/kg Ração de gato/kg Ração de cachorro/kg Sachê Petisco/pct Areia de gato/pct Areia sanitária/pct Granulado higiênico/pct Tapete higiênico/pct Antipulgas Vermífugo Coleira Shampoo pet Brinquedo pet Comedouro Bebedouro Alpiste/pct Ração de peixe/pct Ração de pássaro/pct',
  'Bebê': 'Fralda/pct Fralda infantil/pct Fralda de pano/pct Pomada para assadura Cereal infantil Papinha Fórmula infantil Leite infantil Mamadeira Chupeta Bico de mamadeira Shampoo infantil Sabonete infantil Colônia infantil Talco infantil Óleo infantil Babador Escova infantil Creme dental infantil Repelente infantil Absorvente de seios/cx',
  'Papelaria': 'Caneta Lápis Borracha Apontador Caderno Caderno de desenho Cola bastão Tesoura Régua Papel sulfite/pct Marca-texto Corretivo Grampeador Grampo/cx Clipe/cx Pasta de arquivo Envelope/pct Bloco adesivo Fichário Estojo Lápis de cor/cx Giz de cera/cx Massinha/cx Cartolina Papel crepom Tinta guache/cx Calculadora Agenda',
  'Utilidades': 'Papel alumínio Papel filme Papel manteiga Papel amanteigado Guardanapo/pct Copo descartável/pct Prato descartável/pct Pilha/pct Lâmpada Fósforo/cx Vela/pct Saco plástico/pct Carvão/pct Gás Filtro de café/cx Coador Pano de copa Saco zip/pct Pote plástico Marmita descartável/pct Canudo/pct Palito de dente/cx Palito de churrasco/pct Espeto/pct Isqueiro Lanterna Bateria Carregador Sacola retornável Fita adesiva Elástico/pct Acendedor Saco de gelo/pct',
};

/** [{ nome, cat, un, chave }] — chave é o nome normalizado. */
export const CATALOGO = Object.entries(BRUTO).flatMap(([cat, texto]) =>
  texto.split(' ').reduce((acc, parte) => {
    // Os nomes têm espaço; o separador real é a maiúscula inicial de cada item.
    // "Vitamina C" e "Lâmpada LED": letra solta ou sigla continuam o nome.
    const continua = !/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(parte) || /^[A-Z]$/.test(parte) || /^[A-Z]{2,}$/.test(parte);
    if (acc.length && continua) acc[acc.length - 1] += ' ' + parte;
    else acc.push(parte);
    return acc;
  }, []).map((entrada) => {
    const [nome, un = 'un'] = entrada.split('/');
    return { nome, cat, un, chave: normalizar(nome) };
  })
);

const POR_CHAVE = new Map(CATALOGO.map((c) => [c.chave, c]));

/**
 * Outros nomes para o mesmo produto: viram o nome do catálogo
 * ("aipim" → Macaxeira, "refri" → Refrigerante).
 */
const SINONIMOS = {
  aipim: 'Macaxeira', mandioca: 'Macaxeira', refri: 'Refrigerante', 'creme dental': 'Pasta de dente', xampu: 'Shampoo',
  mussarela: 'Queijo muçarela', mucarela: 'Queijo muçarela', mozarela: 'Queijo muçarela', 'queijo mussarela': 'Queijo muçarela',
  'papel a4': 'Papel sulfite', 'papel oficio': 'Papel sulfite', candida: 'Água sanitária', 'cheiro verde': 'Cheiro-verde', 'couve flor': 'Couve-flor',
  'feijao de corda': 'Feijão verde', 'batata inglesa': 'Batata inglesa', 'pao frances': 'Pão francês', 'pao de forma': 'Pão de forma',
  'sabao em barra': 'Sabão em barra', 'esponja de aco': 'Palha de aço', 'leite de caixinha': 'Leite em caixa', 'agua de garrafao': 'Água mineral',
  'papel toalha': 'Papel toalha', 'pasta dental': 'Pasta de dente', 'fio-dental': 'Fio dental', 'alho poro': 'Alho-poró', 'grao de bico': 'Grão-de-bico',
  'uva passa': 'Uva-passa', 'marca texto': 'Marca-texto', 'lava loucas': 'Lava-louças', 'tira limo': 'Tira-limo', mexerica: 'Mexerica', bergamota: 'Mexerica',
  macaxera: 'Macaxeira', abobora: 'Abóbora', 'cafe soluvel': 'Café solúvel', 'salgadinho de festa': 'Salgadinho', biscoitos: 'Biscoito',
};

/**
 * Marcas que muita gente escreve no lugar do produto: o item fica com o nome
 * da marca ("Omo") e ganha a categoria e a unidade do produto (Limpeza, cx).
 */
const MARCAS = {
  'Coca-Cola': 'Refrigerante', Coca: 'Refrigerante', Fanta: 'Refrigerante', Sprite: 'Refrigerante', Pepsi: 'Refrigerante', Kuat: 'Refrigerante',
  Danone: 'Iogurte', Activia: 'Iogurte', 'Leite Ninho': 'Leite em pó', Yakult: 'Leite fermentado', Ninho: 'Leite em pó', Toddy: 'Achocolatado', Toddynho: 'Achocolatado pronto',
  Mucilon: 'Cereal infantil', Nestogeno: 'Fórmula infantil', Nan: 'Fórmula infantil', Aptamil: 'Fórmula infantil', Nescafé: 'Café solúvel',
  Omo: 'Sabão em pó', Ariel: 'Sabão em pó', Brilhante: 'Sabão em pó', Tixan: 'Sabão em pó', Ypê: 'Detergente', Limpol: 'Detergente',
  Bombril: 'Palha de aço', Assolan: 'Palha de aço', Veja: 'Multiuso', 'Pinho Sol': 'Desinfetante', Qboa: 'Água sanitária', Comfort: 'Amaciante', Downy: 'Amaciante',
  'Bom Ar': 'Purificador de ar', SBP: 'Inseticida', Raid: 'Inseticida', Baygon: 'Inseticida',
  Colgate: 'Pasta de dente', Sorriso: 'Pasta de dente', 'Close Up': 'Pasta de dente', Rexona: 'Desodorante', Nivea: 'Hidratante',
  Pampers: 'Fralda', Huggies: 'Fralda', MamyPoko: 'Fralda', Always: 'Absorvente', Intimus: 'Absorvente', Neve: 'Papel higiênico', Personal: 'Papel higiênico',
  Gillette: 'Aparelho de barbear', Nissin: 'Macarrão instantâneo', 'Leite Moça': 'Leite condensado', Moça: 'Leite condensado', Sazón: 'Tempero pronto',
  Knorr: 'Caldo de galinha', Maggi: 'Caldo de galinha', Hellmanns: 'Maionese', Heinz: 'Ketchup', Tylenol: 'Paracetamol', Novalgina: 'Dipirona',
  Eno: 'Sal de frutas', Luftal: 'Simeticona', 'Band-aid': 'Curativo', Mertiolate: 'Antisséptico', 'Post-it': 'Bloco adesivo', Durex: 'Fita adesiva',
  Whiskas: 'Ração de gato', Pedigree: 'Ração de cachorro', Doritos: 'Salgadinho de pacote', Cheetos: 'Salgadinho de pacote', Ruffles: 'Salgadinho de pacote',
  Fandangos: 'Salgadinho de pacote', Pringles: 'Batata chips', Trident: 'Chiclete', Halls: 'Bala', Bis: 'Bombom', 'Kit Kat': 'Barra de chocolate',
  'Red Bull': 'Energético', Monster: 'Energético', Gatorade: 'Isotônico', Heineken: 'Cerveja', Skol: 'Cerveja', Brahma: 'Cerveja', Amstel: 'Cerveja',
  Itaipava: 'Cerveja', Budweiser: 'Cerveja', Stella: 'Cerveja', Ades: 'Bebida vegetal', Maguary: 'Suco', 'Del Valle': 'Suco', Tang: 'Suco em pó',
};

for (const [apelido, nome] of Object.entries(SINONIMOS)) {
  const alvo = POR_CHAVE.get(normalizar(nome));
  if (alvo && !POR_CHAVE.has(apelido)) POR_CHAVE.set(apelido, alvo);
}
for (const [marca, produto] of Object.entries(MARCAS)) {
  const alvo = POR_CHAVE.get(normalizar(produto));
  if (alvo && !POR_CHAVE.has(normalizar(marca))) POR_CHAVE.set(normalizar(marca), { ...alvo, nome: marca, chave: normalizar(marca), marca: true });
}

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
