module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 11,
    sourceType: 'module',
  },
  extends: ['react-app', 'plugin:prettier/recommended'],
  rules: {
    eqeqeq: 0,
    '@typescript-eslint/no-unused-vars': 0,
    '@typescript-eslint/consistent-type-assertions': 0,
    'react/react-in-jsx-scope': 0,
    'react/proptypes': 0,
    'import/no-webpack-loader-syntax': 0,
    'react/jsx-filename-extension': [
      1,
      {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    ],
    // allow Next.js nested empty <a> tags in <Link>
    'jsx-a11y/anchor-is-valid': [
      'error',
      {
        components: ['Link'],
        specialLink: ['hrefLeft', 'hrefRight'],
        aspects: ['invalidHref', 'preferButton'],
      },
    ],
    semi: [2, 'never'],
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
}
