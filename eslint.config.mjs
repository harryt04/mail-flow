import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import i18next from 'eslint-plugin-i18next'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Guards against new hardcoded UI strings creeping back in — see docs/i18n.md.
  // Scoped to app/component source only; markup-heavy but non-translatable
  // props (className, data-*, href, etc.) and test files are excluded.
  {
    files: ['src/app/**/*.tsx', 'src/components/**/*.tsx'],
    ignores: ['**/*.test.tsx', 'src/app/__scratch_sidebar_preview/**'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        'warn',
        {
          markupOnly: true,
          ignoreAttribute: [
            'className',
            'style',
            'href',
            'src',
            'rel',
            'target',
            'type',
            'variant',
            'tone',
            'size',
            'id',
            'htmlFor',
            'name',
            'data-sidebar',
            'data-slot',
            'data-mobile',
            'data-side',
            'data-variant',
            'data-state',
            'data-collapsible',
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'coverage/**',
  ]),
])

export default eslintConfig
