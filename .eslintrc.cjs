module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['.eslintrc.cjs', 'out', 'postcss.config.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', "react"],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'semi': ['error', 'always'],
    'quotes': ['error', 'double'],
    'indent': ['error', 2],
    "jsx-quotes": ["error", 'prefer-double'],
  },
}
