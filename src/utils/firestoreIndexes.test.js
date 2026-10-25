// Every query the app makes that needs a composite index has it in firestore.indexes.json
// (B76, CLAUDE.md #34).
//
// A query with an equality filter on one field and a range or sort on another is refused in
// production until a composite index for exactly those fields exists. The emulator never
// refuses it, so every other test passes on a query production will reject — and the
// coach's dashboard would load empty. This reads the queries in AppContext and checks each
// one that needs an index against the index file CI deploys.

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

const read = (rel) => readFileSync(join(cwd(), rel), 'utf8');
const indexes = JSON.parse(read('firestore.indexes.json')).indexes;
const workflow = read('.github/workflows/firebase-hosting.yml');

// query(collection(db, 'col'), where(...), orderBy(...), limit(...)) — a top-level
// collection named by one literal. Subcollections (several path parts) are not matched.
function queriesNeedingIndexes(source) {
  const found = [];
  const re = /query\(\s*collection\(\s*db,\s*'(\w+)'\s*\)((?:\s*,\s*(?:where|orderBy|limit)\([^()]*\))+)\s*\)/g;
  for (const m of source.matchAll(re)) {
    const [, col, parts] = m;
    const equal = [];
    const ranged = [];
    for (const w of parts.matchAll(/where\(\s*'(\w+)'\s*,\s*'([^']+)'/g)) (w[2] === '==' ? equal : ranged).push(w[1]);
    for (const o of parts.matchAll(/orderBy\(\s*'(\w+)'/g)) ranged.push(o[1]);
    const others = ranged.filter(f => !equal.includes(f));
    if (equal.length && others.length) found.push({ col, fields: [...equal, ...new Set(others)] });
  }
  return found;
}

const hasIndex = ({ col, fields }) => indexes.some(ix => ix.collectionGroup === col
  && ix.fields.length === fields.length
  && fields.every((f, i) => ix.fields[i].fieldPath === f));

describe('composite indexes', () => {
  const needed = queriesNeedingIndexes(read('src/context/AppContext.jsx'));

  test('the windowed queries of B76 are found (so the check below is really checking)', () => {
    expect(needed).toEqual(expect.arrayContaining([
      { col: 'workoutLogs', fields: ['clientId', 'date'] },
      { col: 'schedule', fields: ['trainerId', 'date'] },
    ]));
  });

  test.each(queriesNeedingIndexes(read('src/context/AppContext.jsx')).map(q => [`${q.col} (${q.fields.join(', ')})`, q]))(
    '%s has an index in firestore.indexes.json', (_label, q) => {
      expect(hasIndex(q)).toBe(true);
    });

  test('CI deploys the index file', () => {
    expect(workflow).toMatch(/deploy --only firestore:indexes/);
  });

  test('the reader recognises a range query and ignores an equality-only one', () => {
    const planted = "query(collection(db, 'x'), where('a', '==', v), where('b', '>=', w))\n"
      + "query(collection(db, 'y'), where('a', '==', v), where('c', '==', w))";
    expect(queriesNeedingIndexes(planted)).toEqual([{ col: 'x', fields: ['a', 'b'] }]);
  });
});
