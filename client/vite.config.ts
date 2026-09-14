import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	root: fileURLToPath(new URL('.', import.meta.url)),
	plugins: [react(), tailwindcss()],
	resolve: {
		tsconfigPaths: true,
		dedupe: ['react', 'react-dom'],
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	optimizeDeps: {
		include: ['react', 'react-dom'],
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks: (id) => {
					if (
						id.includes('node_modules/react') ||
						id.includes('node_modules/react-dom')
					)
						return 'react-vendor'
					if (id.includes('node_modules/recharts')) return 'financial-report'
					if (id.includes('node_modules/lucide-react')) return 'ui'
				},
			},
		},
	},
	server: {
		allowedHosts: true,
		proxy: {
			'/api': {
				target: 'http://localhost:4000',
				changeOrigin: true,
			},
		},
	},
})
