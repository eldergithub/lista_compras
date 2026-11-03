/**
 * Categorias, unidades e o palpite de categoria pelo nome do item.
 *
 * CATEGORIAS só cresce no fim: a posição de cada uma vai dentro dos links
 * já enviados (ver link.js), então reordenar quebraria links antigos.
 * A ordem em que aparecem na tela é ORDEM_NA_TELA.
 */

export const CATEGORIAS = [
  'Açougue', 'Padaria', 'Frios e laticínios', 'Hortifrúti',
  'Mercearia', 'Bebidas', 'Limpeza', 'Higiene', 'Utilidades', 'Outros',
  'Farmácia', 'Material e ferramentas', 'Festa',
  'Congelados', 'Doces e lanches', 'Pet', 'Bebê', 'Papelaria',
];

export const ORDEM_NA_TELA = [
  'Hortifrúti', 'Açougue', 'Padaria', 'Frios e laticínios', 'Mercearia', 'Doces e lanches', 'Bebidas', 'Congelados',
  'Limpeza', 'Higiene', 'Bebê', 'Pet', 'Farmácia', 'Papelaria', 'Material e ferramentas', 'Festa', 'Utilidades', 'Outros',
];

/** Categorias da grade de sugestões, por tipo de lista (a primeira abre selecionada). */
export const CATEGORIAS_POR_TIPO = {
  mercado: ['Hortifrúti', 'Açougue', 'Padaria', 'Frios e laticínios', 'Mercearia', 'Doces e lanches', 'Bebidas', 'Congelados', 'Limpeza', 'Higiene', 'Bebê', 'Pet'],
  farmacia: ['Farmácia', 'Higiene', 'Bebê'],
  casa: ['Limpeza', 'Material e ferramentas', 'Utilidades', 'Papelaria'],
  festa: ['Festa', 'Doces e lanches', 'Bebidas', 'Mercearia', 'Utilidades'],
  outros: ['Hortifrúti', 'Mercearia', 'Limpeza', 'Higiene', 'Farmácia', 'Bebê', 'Pet', 'Papelaria', 'Material e ferramentas', 'Festa', 'Utilidades'],
};

/** Tipos de lista: dão cor, ícone e o nome sugerido. */
export const TIPOS = {
  mercado: { nome: 'Mercado' },
  farmacia: { nome: 'Farmácia' },
  casa: { nome: 'Casa' },
  festa: { nome: 'Festa' },
  outros: { nome: 'Outros' },
};

export const UNIDADES = ['un', 'kg', 'g', 'L', 'cx', 'pct', 'dz'];

/** Passo dos botões − e +. O que não está aqui anda de 1 em 1. */
export const PASSO = { kg: 0.5, g: 100 };

/** Palavras-chave (sem acento, minúsculas) que indicam cada categoria. */
const PALAVRAS = {
  'Açougue': 'frango carne peixe linguica bacon costela picanha patinho alcatra colchao file moida porco calabresa coxa sobrecoxa peito charque fraldinha maminha acem musculo cupim tilapia camarao salsicha',
  'Padaria': 'pao paes bolo torrada bisnaga croissant',
  'Frios e laticínios': 'leite iogurte queijo mucarela mussarela gorgonzola presunto manteiga requeijao ovo ovos creme nata margarina coalhada ricota parmesao mortadela peru',
  'Hortifrúti': 'cenoura brocolis banana uva laranja maca melancia tomate cebola alho batata alface limao mamao abacaxi manga pepino abobrinha pimentao morango melao coentro cebolinha macaxeira inhame abacate goiaba maracuja beterraba repolho couve chuchu jerimum abobora rucula espinafre kiwi pera tangerina',
  'Mercearia': 'arroz feijao cuscuz farinha acucar cafe oleo macarrao sal maizena fermento molho azeite aveia granola biscoito bolacha extrato milho ervilha atum sardinha tapioca leite-condensado achocolatado gelatina tempero vinagre ketchup maionese mostarda pipoca',
  'Bebidas': 'agua refrigerante suco cerveja vinho cha energetico gelo',
  'Limpeza': 'detergente sabao amaciante desinfetante sanitaria esponja multiuso alvejante limpador vassoura rodo pano',
  'Higiene': 'higienico pasta sabonete shampoo xampu condicionador desodorante escova absorvente fio cotonete perfume esmalte talco',
  'Utilidades': 'amanteigado aluminio filme guardanapo saco sacos lixo pilha lampada fosforo vela',
  'Farmácia': 'remedio remedios dipirona paracetamol ibuprofeno amoxicilina omeprazol loratadina dorflex neosaldina buscopan vitamina soro curativo curativos esparadrapo gaze termometro xarope pomada colirio antialergico antiacido band-aid seringa',
  'Material e ferramentas': 'parafuso parafusos prego pregos tinta pincel rolo fita cola cimento argamassa areia tijolo cano torneira tomada interruptor broca serra lixa chave martelo bucha veda-rosca',
  'Congelados': 'congelado congelada congelados congeladas sorvete picole acai nuggets pizza empanado empanados',
  'Doces e lanches': 'bala balas pirulito chiclete bombom chocolate pacoca cocada chips pastel coxinha empada brownie pudim doce doces',
  'Pet': 'racao pet gato gatos cachorro cachorros cao petisco coleira antipulgas',
  'Bebê': 'bebe fralda fraldas mamadeira chupeta papinha',
  'Papelaria': 'caneta canetas lapis caderno cadernos borracha apontador regua sulfite grampeador clipe envelope cartolina',
  'Festa': 'balao baloes bexiga bexigas confete serpentina chapeuzinho lembrancinha lembrancinhas presente embrulho docinho docinhos salgadinho salgadinhos forminha forminhas topo',
};

const INDICE = Object.fromEntries(
  Object.entries(PALAVRAS).map(([cat, texto]) => [cat, new Set(texto.split(' '))])
);

/** Minúsculas e sem acento: "Maçã" → "maca". */
export function normalizar(texto) {
  return String(texto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Primeira categoria cuja palavra-chave aparece no nome; senão "Outros". */
export function adivinharCategoria(nome) {
  const palavras = normalizar(nome).split(/[^a-z-]+/).filter(Boolean);
  for (const cat of CATEGORIAS) {
    const chaves = INDICE[cat];
    if (chaves && palavras.some((p) => chaves.has(p))) return cat;
  }
  return 'Outros';
}

/** Devolve a categoria conhecida com a mesma grafia, ou o texto como veio. */
export function categoriaCanonica(texto) {
  const alvo = normalizar(texto.trim());
  return CATEGORIAS.find((c) => normalizar(c) === alvo) || texto.trim();
}

// Palavras soltas que o microfone às vezes entrega e que não são item.
const NAO_E_ITEM = new Set(['um', 'uma', 'dois', 'duas', 'e', 'de', 'do', 'da', 'tambem', 'mais', 'ai', 'depois', 'agora', 'entao',
  'ne', 'ok', 'isso', 'item', 'itens', 'coloca', 'bota', 'poe', 'quero', 'preciso', 'com', 'sem', 'o', 'a', 'os', 'as']);

/** Um nome que dá para ser item: tem letras e não é uma palavra de ligação solta. */
export function nomeValido(nome) {
  const n = normalizar(nome || '').trim();
  return /[a-z]{2}/.test(n) && !NAO_E_ITEM.has(n);
}
