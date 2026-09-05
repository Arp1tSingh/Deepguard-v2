import { fixupConfigRules } from '@eslint/compat';
import eslintConfigNext from 'eslint-config-next';

const config = [
  ...fixupConfigRules(eslintConfigNext),
  {
    rules: {
      '@next/next/no-img-element': 'off',
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    ignores: ['postcss.config.mjs', 'tailwind.config.js', 'next.config.mjs'],
  },
];

export default config;