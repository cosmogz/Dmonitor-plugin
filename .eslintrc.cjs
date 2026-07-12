module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['dist/', 'backend/', 'node_modules/', 'pr-artifacts/', 'tmp/'],
  rules: {
    '@typescript-eslint/no-var-requires': 'off',
  },
};