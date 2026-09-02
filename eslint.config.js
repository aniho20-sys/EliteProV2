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
const TRANSLATED_FILES = []

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
      'react/jsx-no-literals': ['error', {
        noStrings: true,
        ignoreProps: false,
        // Punctuation and glyphs that are not words in any language.
        allowedStrings: ['·', '—', '–', '×', '/', '(', ')', ':', '%', '+', '-', '&nbsp;'],
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
