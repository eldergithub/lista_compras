/**
 * Listas prontas: pontos de partida para montar uma lista em poucos toques.
 * Os itens são escritos como a pessoa digitaria ("1 dz ovos") e passam pelo
 * mesmo leitor da caixa de adicionar, então ganham categoria e unidade do catálogo.
 */

import { lerEntrada } from './texto.js';
import { criarItem } from './lista.js';

export const MODELOS = [
  { id: 'mes', nome: 'Compra do mês', tipo: 'mercado', descricao: 'Mercearia, limpeza e higiene que acabam todo mês',
    itens: 'arroz, feijão, açúcar, café, óleo, sal, macarrão, cuscuz, farinha de mandioca, molho de tomate, leite, 1 dz ovos, manteiga, biscoito, papel higiênico, pasta de dente, sabonete, desodorante, detergente, sabão em pó, amaciante, água sanitária, esponja, saco de lixo' },
  { id: 'feira', nome: 'Feira da semana', tipo: 'mercado', descricao: 'Frutas, verduras e temperos',
    itens: '1 dz banana, tomate, cebola, alho, batata, cenoura, macaxeira, alface, coentro, cebolinha, limão, laranja, maçã, mamão, melancia, abacaxi, pimentão, chuchu' },
  { id: 'cafe', nome: 'Café da manhã', tipo: 'mercado', descricao: 'Para a semana começar bem',
    itens: 'pão, manteiga, queijo, presunto, leite, café, iogurte, requeijão, 1 dz ovos, banana, mamão, tapioca, cuscuz, achocolatado, geleia' },
  { id: 'churrasco', nome: 'Churrasco', tipo: 'mercado', descricao: 'Carne, acompanhamentos e bebida',
    itens: 'picanha, linguiça, coxa de frango, pão de alho, carvão, sal grosso, farinha de mandioca, tomate, cebola, pimentão, limão, refrigerante, cerveja, gelo, copo descartável, guardanapo' },
  { id: 'farmacia', nome: 'Farmácia de casa', tipo: 'farmacia', descricao: 'O básico para ter na gaveta',
    itens: 'dipirona, paracetamol, antiácido, soro fisiológico, curativo, gaze, esparadrapo, termômetro, álcool em gel, repelente, protetor solar' },
  { id: 'limpeza', nome: 'Limpeza da casa', tipo: 'casa', descricao: 'Produtos e utensílios de faxina',
    itens: 'detergente, água sanitária, desinfetante, multiuso, sabão em pó, amaciante, limpa vidro, lustra móveis, esponja, palha de aço, pano de chão, flanela, saco de lixo, luva, papel toalha' },
  { id: 'reparos', nome: 'Pequenos reparos', tipo: 'casa', descricao: 'Para consertar sem sair duas vezes',
    itens: 'lâmpada led, fita isolante, fita crepe, parafuso, bucha, cola, silicone, veda-rosca, lixa, pincel, tomada, extensão' },
  { id: 'aniversario', nome: 'Aniversário', tipo: 'festa', descricao: 'Decoração, mesa e comes e bebes',
    itens: 'balão, vela de aniversário, chapeuzinho, forminha, topo de bolo, guardanapo de festa, copo descartável, prato descartável, salgadinho, docinho, bolo, refrigerante, suco, gelo' },
  { id: 'viagem', nome: 'Viagem', tipo: 'outros', descricao: 'Higiene e farmácia de mala',
    itens: 'escova de dente, pasta de dente, fio dental, shampoo, condicionador, desodorante, protetor solar, repelente, aparelho de barbear, lenço umedecido, dipirona, curativo' },
];

/** Modelos com os do tipo da lista primeiro. */
export const modelosPara = (tipo) => [...MODELOS.filter((m) => m.tipo === tipo), ...MODELOS.filter((m) => m.tipo !== tipo)];

/** Os itens de um modelo, já com categoria e unidade. */
export const itensDoModelo = (modelo) => lerEntrada(modelo.itens).map((l) => criarItem(l.nome, l.cat, l.qtd, l.un));
