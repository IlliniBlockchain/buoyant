module.exports = {
  env: {
    browser: false,
    es2021: true,
    mocha: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: [],
  rules: {
    // 1 is 'warning', 2 is 'error' (error prevents compiling)
    semi: [1, 'never'],
    'comma-dangle': [1, 'always-multiline'],
    'consistent-return': 'warn',
    // NOTE: 4-space tab (default by VSCode)
    indent: ['warn', 2],
    'import/first': 'off',
    'import/no-extraneous-dependencies': [1, {
      devDependencies: false, optionalDependencies: false, peerDependencies: false,
    }],
    radix: 0,
    'max-classes-per-file': 'off',
    'max-len': [1, { code: 200 }],
    'no-console': 0,
    'no-nested-ternary': 'off',
    'no-plusplus': 'off',
    'no-underscore-dangle': 'off',
    'no-unused-vars': 'warn',
    'no-param-reassign': 0,
  },
}
