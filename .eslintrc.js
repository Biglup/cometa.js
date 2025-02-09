module.exports = {
  env: {
    jest: true
  },
  extends: ['@atixlabs/eslint-config/configurations/node', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['sort-keys-fix', 'sort-imports-es6-autofix', 'jest'],
  root: true,
  rules: {
    '@typescript-eslint/ban-types': 0,
    // covered by unicorn/prefer-module
    '@typescript-eslint/explicit-module-boundary-types': 0,
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/no-shadow': ['error'],
    '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],

    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

    // needed for inference from type guards
    '@typescript-eslint/no-var-requires': 0,

    // typescript checks return types
    camelcase: 0,
    'consistent-return': 0,

    'import/no-extraneous-dependencies': ['error', { devDependencies: ['**/test/**/*.ts'] }],

    // eslint compains about TS enums hence disable here and enable @typescript-eslint/no-shadow
    'import/no-unresolved': 0,
    'linebreak-style': [2, 'unix'],
    'max-len': [
      'warn',
      {
        code: 120, // Keep the existing max line length of 120
        ignoreComments: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreUrls: true
      }
    ],
    'new-cap': 0,
    'no-bitwise': 0,
    'no-magic-numbers': 0,
    'no-restricted-imports': [
      'error',
      {
        paths: ['lodash'],
        patterns: ['src/*']
      }
    ],
    'no-shadow': 'off',
    'no-unused-expressions': 'off',
    'no-unused-vars': 0,
    'no-useless-constructor': 0,
    'promise/always-return': 0,
    'promise/avoid-new': 0,
    quotes: ['error', 'single', { avoidEscape: true }],
    'sort-imports': ['warn', { ignoreDeclarationSort: true }],
    'sort-imports-es6-autofix/sort-imports-es6': 'warn',
    'sort-keys-fix/sort-keys-fix': ['warn', 'asc', { natural: true }],
    'template-tag-spacing': 0,
    'unicorn/better-regex': 0,
    'unicorn/filename-case': 0,
    'unicorn/no-array-callback-reference': 0,
    'unicorn/no-array-reduce': 0,
    'unicorn/no-nested-ternary': 0,
    'unicorn/no-null': 0,
    'unicorn/number-literal-case': 0,
    'unicorn/numeric-separators-style': 0,
    'unicorn/prefer-module': 0,
    'unicorn/prefer-node-protocol': 0,
    'unicorn/prevent-abbreviations': 0
  },
  settings: {
    'import/resolver': {
      typescript: {}
    }
  }
};
