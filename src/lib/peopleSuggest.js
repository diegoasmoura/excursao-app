import { foldText } from './format';

export function filterPeopleSuggestions(people, query, { limit = 8 } = {}) {
  const term = foldText(query);
  if (term.length < 2) return [];

  return [...people]
    .map((person) => {
      const name = foldText(person.name);
      return { person, name, starts: name.startsWith(term), match: name.includes(term) };
    })
    .filter((item) => item.match)
    .sort((a, b) => {
      if (a.starts !== b.starts) return a.starts ? -1 : 1;
      return (a.person.name || '').localeCompare(b.person.name || '', 'pt');
    })
    .slice(0, limit)
    .map((item) => item.person);
}
