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
];

export const ORDEM_NA_TELA = [
  'Hortifrúti', 'Açougue', 'Padaria', 'Frios e laticínios', 'Mercearia', 'Bebidas',
  'Limpeza', 'Higiene', 'Farmácia', 'Material e ferramentas', 'Festa', 'Utilidades', 'Outros',
];

/** Categorias da grade de sugestões, por tipo de lista (a primeira abre selecionada). */
export const CATEGORIAS_POR_TIPO = {
  mercado: ['Hortifrúti', 'Açougue', 'Padaria', 'Frios e laticínios', 'Mercearia', 'Bebidas', 'Limpeza', 'Higiene'],
  farmacia: ['Farmácia', 'Higiene'],
  casa: ['Limpeza', 'Material e ferramentas', 'Utilidades'],
  festa: ['Festa', 'Bebidas', 'Mercearia', 'Utilidades'],
  outros: ['Hortifrúti', 'Mercearia', 'Limpeza', 'Higiene', 'Farmácia', 'Material e ferramentas', 'Festa', 'Utilidades'],
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
  'Bebidas': 'agua refrigerante suco cerveja vinho cha energetico',
  'Limpeza': 'detergente sabao amaciante desinfetante sanitaria esponja multiuso alvejante limpador vassoura rodo pano',
  'Higiene': 'higienico pasta sabonete shampoo xampu condicionador desodorante escova absorvente fio fralda cotonete',
  'Utilidades': 'amanteigado aluminio filme guardanapo saco sacos lixo pilha lampada fosforo vela',
  'Farmácia': 'remedio remedios dipirona paracetamol ibuprofeno amoxicilina omeprazol loratadina dorflex neosaldina buscopan vitamina soro curativo curativos esparadrapo gaze termometro xarope pomada colirio antialergico antiacido band-aid seringa',
  'Material e ferramentas': 'parafuso parafusos prego pregos tinta pincel rolo fita cola cimento argamassa areia tijolo cano torneira tomada interruptor broca serra lixa chave martelo bucha veda-rosca',
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
