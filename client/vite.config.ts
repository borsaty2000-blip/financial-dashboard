import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		tsconfigPaths: true,
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
