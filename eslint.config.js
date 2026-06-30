import js from '@eslint/js';
import globals from 'globals';

/**
 * Config plana de ESLint (flat config). Reglas recomendadas + globals de Node.
 * El formato lo maneja Prettier, así que aquí solo van reglas de correctitud.
 */
export default [
  {
    ignores: ['node_modules/**', 'repomix-output.md'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
];
