import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
	globalIgnores(['dist', 'coverage']),
	{
		files: ['**/*.{ts,tsx}'],
		extends: [
			js.configs.recommended,
			tseslint.configs.recommended,
			reactHooks.configs.flat.recommended,
			reactRefresh.configs.vite,
		],
		languageOptions: {
			globals: globals.browser,
		},
	},
	{
		files: ['**/*.ts'],
		rules: {
			'func-style': ['error', 'expression'],
		},
	},
	{
		files: ['**/*.tsx'],
		rules: {
			'no-restricted-syntax': [
				'error',
				{
					selector: 'FunctionDeclaration[id.name=/^[a-z]/]',
					message: 'Use a const arrow function for non-component functions.',
				},
				{
					selector:
						'VariableDeclarator[id.name=/^[A-Z]/] > ArrowFunctionExpression',
					message: 'Use a named function declaration for React components.',
				},
				{
					selector: 'Property[key.name=/^[A-Z]/] > ArrowFunctionExpression',
					message: 'Use a named function declaration for React components.',
				},
			],
		},
	},
])
