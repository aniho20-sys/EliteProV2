import { exerciseLibrary, equipmentTypes, movementPatterns } from '../data/exercises';

// Training vocabulary (#39): exercise names, equipment, movement patterns and the
// measurement words. Never translated, never a dictionary value, and — since the word is
// identical in every language — allowed to stay a literal in a visible prop as well
// (title="Reps" on a reps input). t() would refuse it anyway: the dictionaries ban both
// the namespace and the bare value.
//
// It lives here rather than inside one of the two test files because both guardians need
// it, and the last thing this area needs is two lists that disagree (#37.3). Not imported
// by any component — nothing at runtime should be consulting this.
export const TRAINING_VOCAB = [
  ...exerciseLibrary.map(e => e.name),
  ...equipmentTypes,
  ...movementPatterns,
  'sets', 'reps', 'kg', 'RPE', 'tempo', 'PR', 'PRs',
  // The unit abbreviations as they appear inside a set row: placeholder="kg",
  // placeholder="sec", placeholder="m". Same words, same ruling.
  'set', 'sec', 's', 'm', 'cm',
].map(s => s.toLowerCase());

// Props that carry user-visible text. react/jsx-no-literals runs with ignoreProps (or
// every className would be a finding), so these are counted separately by both guardians.
export const VISIBLE_PROPS = ['placeholder', 'aria-label', 'title', 'alt'];

// Every hardcoded visible-prop string in a source file, as `prop="value"` strings.
// Block comments are stripped first, or a JSDoc usage example counts as real UI text
// (EmptyState.jsx documents itself with title="No clients yet").
// Prop values that are never a translation target. The training vocabulary, plus the
// product's own name: alt="ElitePro" labels the logo and is the same word everywhere.
// Kept separate from TRAINING_VOCAB because 'ElitePro' inside a dictionary *sentence* is
// perfectly fine — it is only a bare prop value that needs the exemption.
const LITERAL_PROP_VALUES = [...TRAINING_VOCAB, 'elitepro'];

export function visiblePropText(source) {
  const src = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const found = [];
  for (const prop of VISIBLE_PROPS) {
    for (const m of src.matchAll(new RegExp(`${prop}=(["'])([^"']{2,})\\1`, 'g'))) {
      // A value with no letters is a number or punctuation — a sample rate like "65",
      // not a sentence. Those read the same in every language.
      if (!/\p{L}/u.test(m[2])) continue;
      if (LITERAL_PROP_VALUES.includes(m[2].trim().toLowerCase())) continue;
      found.push(`${prop}="${m[2]}"`);
    }
  }
  return found;
}
