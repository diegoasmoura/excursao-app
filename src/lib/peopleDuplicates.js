import { foldText } from './format';

/** Tem que bater com as regras .is-dup-0 ... .is-dup-5 do index.css. */
const DUPLICATE_COLORS = 6;

/** Chave do nome: sem acento, sem caixa e com um espaço só entre as palavras. */
export function nameKey(name) {
  return foldText(name).replace(/\s+/g, ' ').trim();
}

/**
 * Agrupa quem tem o mesmo nome.
 *
 * Devolve dois mapas por id de pessoa: a cor do grupo (0 a 5, repetindo se
 * houver mais grupos) e quantos cadastros têm aquele nome. Mais
 * `duplicatedPeople` (pessoas marcadas) e `groupCount` (nomes repetidos).
 *
 * A ordem dos grupos segue a ordem da lista, que já vem por nome, então as
 * cores não pulam de uma tela para outra.
 */
export function findDuplicates(people) {
  const groups = new Map();
  for (const person of people ?? []) {
    const key = nameKey(person.name);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(person.id);
  }

  const color = new Map();
  const count = new Map();
  let index = 0;

  for (const ids of groups.values()) {
    if (ids.length < 2) continue;
    for (const id of ids) {
      color.set(id, index % DUPLICATE_COLORS);
      count.set(id, ids.length);
    }
    index += 1;
  }

  return { color, count, duplicatedPeople: color.size, groupCount: index };
}
