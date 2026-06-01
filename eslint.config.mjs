import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
})

const eslintConfig = [
  {
    ignores: ['.next/**', 'node_modules/**', 'dist/**', 'src/visual-edits/**'],
  },
  ...compat.config({
    extends: ['next/core-web-vitals'],
  }),
  {
    rules: {
      // Style — keep off
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      // NOTE: @typescript-eslint/* rules require the plugin to be explicitly
      // loaded in flat config — omitting them here to avoid the "plugin not found"
      // error. TypeScript catches these at tsc level instead.
    },
  },
]

export default eslintConfig
