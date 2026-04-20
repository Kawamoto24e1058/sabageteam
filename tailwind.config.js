/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				sans: [
					'-apple-system',
					'BlinkMacSystemFont',
					'"Hiragino Sans"',
					'"Noto Sans JP"',
					'sans-serif'
				]
			},
			colors: {
				red: {
					team: '#FF3B30'
				},
				yellow: {
					team: '#FFCC00'
				}
			}
		}
	},
	plugins: []
};
