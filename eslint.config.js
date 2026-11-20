import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
    { ignores: ['dist', 'node_modules', 'docs', 'public/sw.js', 'MockAPIswithLive.js'] },
    {
        files: ['**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { ...globals.browser },
            parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
        rules: {
            ...js.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules,
            // Unused imports and variables are reported but do not fail the run. Names used only as JSX
            // tags (<Icon />, <motion.div>) look unused to core ESLint, so capitalised names and `motion` are exempt.
            'no-unused-vars': ['warn', { varsIgnorePattern: '^(_|[A-Z]|motion$)', argsIgnorePattern: '^(_|[A-Z])', caughtErrors: 'none' }],
            'react-refresh/only-export-components': 'off',
        },
    },
    {
        // Build and tooling files run in Node
        files: ['*.config.js', 'scripts/**/*.{js,mjs}'],
        languageOptions: { globals: { ...globals.node } },
    },
    {
        files: ['public/sw.js'],
        languageOptions: { globals: { ...globals.serviceworker } },
    },
];
