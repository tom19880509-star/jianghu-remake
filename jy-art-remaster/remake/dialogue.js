import edition from './dialogue-remaster.json' with {type:'json'};

// Edit the displayed wording only. Original Lua strings and event IDs remain
// intact, including the source's byte-oriented encoding and script conditions.
export function dialogueText(id, source) {
  if (id !== undefined && id !== null && Object.hasOwn(edition.talks, id))
    return edition.talks[id];
  return Object.hasOwn(edition.literals, source) ? edition.literals[source] : source;
}
