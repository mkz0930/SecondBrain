// ESLint 配置

module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    mocha: true
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: [
    'vue'
  ],
  rules: {
    // 基础规则
    'indent': ['error', 2],
    'linebreak-style': 'off', // 关闭换行符检查，兼容 Windows CRLF
    'quotes': ['error', 'single'],
    'semi': ['error', 'never'],
    'no-console': 'off',
    'no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],

    // Vue 规则
    'vue/multi-word-component-names': 'off',
    'vue/no-v-html': 'warn',
    'vue/require-default-prop': 'off',
    'vue/require-prop-types': 'warn',

    // 代码质量
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'warn',
    'no-duplicate-imports': 'error',

    // 最佳实践
    'eqeqeq': ['error', 'always'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-return-await': 'error',
    'require-await': 'warn'
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'coverage/',
    'mobile/',
    '*.min.js'
  ]
}
