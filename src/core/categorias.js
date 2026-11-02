/**
 * Categorias, unidades e o palpite de categoria pelo nome do item.
 *
 * A ordem de CATEGORIAS é a ordem em que aparecem na tela. Hoje ela é fixa;
 * na fase 3 cada pessoa vai poder reordenar pelos corredores do seu mercado.
 */

export const CATEGORIAS = [
  'Açougue', 'Padaria', 'Frios e laticínios', 'Hortifrúti',
  'Mercearia', 'Bebidas', 'Limpeza', 'Higiene', 'Utilidades', 'Outros',
];

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
