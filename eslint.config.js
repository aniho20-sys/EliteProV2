import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import react from 'eslint-plugin-react'
import { defineConfig, globalIgnores } from 'eslint/config'

// Files whose user-facing text has been moved into src/i18n/en.js. In these files a bare
// string in JSX is a bug — it is a sentence the Chinese user will never see translated —
// so react/jsx-no-literals is enforced on exactly this list. Add a file here in the same
// commit that translates it. Empty until the first page is converted.
const TRANSLATED_FILES = [
  'src/pages/ClientDashboard.jsx',
  'src/pages/MyWorkoutsPage.jsx',
  'src/pages/RoleSelectPage.jsx',
  'src/components/RenewalPromptModal.jsx',
  'src/components/PaymentSheetModal.jsx',
  'src/components/Navigation.jsx',
  'src/pages/LoginPage.jsx',
  'src/pages/SchedulePage.jsx',
  'src/pages/ProfilePage.jsx',
  'src/components/LanguagePicker.jsx',
]

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['src/**/*.{js,jsx}'],
    rules: {
      // t() takes a literal key. t(exercise.name), t(plan.name), t(label) are how a piece of
      // data ends up in a translation dictionary — exercise names, units and tags are data
      // and are never translated (CLAUDE.md #28, #39). A template literal is refused too,
      // because a key built at runtime cannot be checked against en.js by the tests.
      'no-restricted-syntax': ['error', {
        selector: "CallExpression[callee.name='t'][arguments.0.type!='Literal']",
        message: 't() takes a literal key. Data (exercise names, plan names, tags, units) is never translated — render it directly.',
      }],
    },
  },
  ...(TRANSLATED_FILES.length ? [{
    files: TRANSLATED_FILES,
    plugins: { react },
    rules: {
      // Catches visible text sitting directly in JSX. ignoreProps is on because prop values
      // are overwhelmingly className/to/style, and flagging those buries the real finding.
      // Literal placeholder/aria-label/title props are covered instead by the
      // "no untranslated prop text" test in src/i18n/dictionary.test.js.
      'react/jsx-no-literals': ['error', {
        noStrings: true,
        ignoreProps: true,
        allowedStrings: [
          // Punctuation and glyphs that are not words in any language.
          '·', '—', '–', '×', '/', '(', ')', ':', '%', '+', '-', '.', ',', '&nbsp;',
          // A warning glyph is an icon, not a word.
          '⚠️',
          // Step numerals in an ordered list.
          '1', '2', '3',
          // Training units. Never translated — CLAUDE.md #39.
          'kg', 'cm', 'reps', 'sets', 'RPE',
          // The wordmark, rendered as two spans for the gradient.
          'Elite', 'Pro',
          // The word the user must type to confirm account deletion. It is compared
          // literally against 'DELETE', so translating it would make the confirmation
          // impossible to satisfy in that language.
          'DELETE',
          // Developer tools behind import.meta.env.DEV. No user ever sees these.
          'Send Test', 'Re-register Token',
        ],
      }],
    },
  }] : []),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
])
