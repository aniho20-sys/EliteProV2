// Follows a soft-merged exercise's mergedInto pointer to the surviving exercise doc.
// Merges never rewrite exerciseId on existing workoutPlans/workoutLogs — this lets old
// references keep resolving to the current (merged-into) exercise instead.
export const canonicalExercise = (library, id) => {
  let ex = library.find(e => e.id === id);
  const seen = new Set();
  while (ex?.mergedInto && !seen.has(ex.id)) {
    seen.add(ex.id);
    const next = library.find(e => e.id === ex.mergedInto);
    if (!next) break;
    ex = next;
  }
  return ex;
};

export const resolveExerciseName = (library, id, fallback) =>
  canonicalExercise(library, id)?.name || fallback || id;

// Title-cases a name while preserving words that are already all-caps acronyms (e.g. "RDL", "HIIT")
export const titleCaseExerciseName = (name) =>
  name.trim().replace(/\s+/g, ' ').split(' ').map(w =>
    (w === w.toUpperCase() && w.length > 1) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join(' ');

// Shared "≥1 muscle group + equipment" requirement for any UI that creates/edits exercises
export const exerciseFieldsValid = ({ muscle, equipment }) =>
  !!(muscle && muscle.split(',').map(s => s.trim()).filter(Boolean).length) && !!(equipment && equipment.trim());

// Canonical A-Z sort for every UI that lists exercises, applied at render time so a newly
// added exercise appears in its correct alphabetical position rather than at the bottom.
export const sortExercisesByName = (list) =>
  [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

// Soft-merged exercises stay in the library array forever so canonicalExercise() can keep
// resolving historical exerciseIds through them (CLAUDE.md #27) — but they must never be
// offered for selection again, or a trainer would just re-add the thing that was merged
// away. Every list and picker filters through this; resolution paths deliberately do not.
export const liveExercises = (library) => (library || []).filter(e => !e?.mergedInto);

// ---------------------------------------------------------------------------
// Movement pattern inference
// ---------------------------------------------------------------------------
// Keyword rules approved by Ani. Order of the entries below is NOT the priority —
// PATTERN_PRIORITY decides that. Multi-word entries match as consecutive tokens.
const PATTERN_KEYWORDS = {
  Squat: ['squat', 'lunge', 'step up', 'split squat', 'leg press', 'leg extension', 'wall sit'],
  Hinge: ['deadlift', 'rdl', 'hinge', 'swing', 'good morning', 'hip thrust', 'kickback', 'glute bridge'],
  Push: ['press', 'push', 'dip', 'fly', 'tricep extension', 'pushdown', 'skull crusher', 'lateral raise'],
  Pull: ['row', 'pull', 'curl', 'pulldown', 'chin', 'face pull', 'shrug'],
  Carry: ['carry', 'farmer', 'suitcase', 'waiter'],
  Core: ['plank', 'crunch', 'leg raise', 'hold', 'dead bug', 'bird dog', 'pallof', 'shoulder tap', 'boat', 'hollow'],
  Locomotion: ['crawl', 'bear', 'crab', 'beast', 'ape', 'scorpion'],
  Rotation: ['twist', 'rotation', 'chop', 'russian'],
};

// When a name matches more than one pattern, the first entry here wins.
//
// The governing rule is Ani's: whichever pattern describes the dominant hip/knee action.
// That puts the lower-body patterns above the upper-body ones, so "Squat push press" is a
// Squat and "Sumo deadlift high pull" is a Hinge. Carry and Locomotion sit at the top
// because their keywords name the whole exercise rather than one component of it, and
// Rotation/Core sit above Push/Pull so "Pallof press" reads as Core rather than Push.
const PATTERN_PRIORITY = ['Carry', 'Locomotion', 'Hinge', 'Squat', 'Rotation', 'Core', 'Push', 'Pull'];

// A keyword that must be ignored when another word in the name contradicts it. Both of
// these would otherwise land in the batch-approved "high confidence" bucket while being
// wrong — a tricep kickback is not a hinge and a leg curl is not a pull. Suppressing them
// leaves those names with no match at all, which surfaces them for a human decision
// instead of quietly mis-filing them.
const KEYWORD_BLOCKERS = {
  kickback: ['tricep', 'triceps'],
  curl: ['leg', 'hamstring', 'nordic'],
};

const tokenize = (name) =>
  String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);

// Tokens are matched by prefix, not by substring or exact equality. Prefix matching gets
// plurals and closed compounds for free ("rows", "pullup", "pushdown", "crabwalk") while
// still refusing a match in the middle of an unrelated word — "throw" does not start with
// "row", which naive substring matching would have filed under Pull.
const matchesKeyword = (tokens, keyword) => {
  const parts = keyword.split(' ');
  return tokens.some((_, i) =>
    parts.every((part, j) => {
      const token = tokens[i + j];
      // Only the final word of a phrase may be a prefix match; earlier words must be whole
      // tokens, so "leg press" cannot be satisfied by "legs pressure".
      return token && (j === parts.length - 1 ? token.startsWith(part) : token === part);
    }),
  );
};

// Full result for review UIs and tests: which patterns matched, on which keywords, and how
// much the answer should be trusted.
export const explainMovementPattern = (name) => {
  const tokens = tokenize(name);
  const hits = [];
  for (const [pattern, keywords] of Object.entries(PATTERN_KEYWORDS)) {
    const matched = keywords.filter(kw => {
      if (!matchesKeyword(tokens, kw)) return false;
      const blockers = KEYWORD_BLOCKERS[kw];
      return !blockers || !blockers.some(b => tokens.includes(b));
    });
    if (matched.length) hits.push({ pattern, keywords: matched });
  }
  const pattern = PATTERN_PRIORITY.find(p => hits.some(h => h.pattern === p)) || '';
  // "High" means one pattern claimed the name outright — several keywords from that same
  // pattern still count as one claim. "Medium" means priority had to break a tie.
  const confidence = hits.length === 0 ? 'low' : hits.length === 1 ? 'high' : 'medium';
  return { pattern, confidence, hits };
};

export const inferMovementPattern = (name) => explainMovementPattern(name).pattern;
