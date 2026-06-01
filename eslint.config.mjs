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
      // Cosmetic / low-risk — keep off
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'warn',
      // These hide real bugs — turned back to warn so build surfaces them without hard-failing
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]

export default eslintConfig
