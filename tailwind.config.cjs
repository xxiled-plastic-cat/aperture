/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				bg: '#0A0C0F',
				panel: '#111418',
				panelAlt: '#151922',
				border: '#23272E',
				textPrimary: '#F2F2EE',
				textSecondary: '#A8B0B8',
				textMuted: '#6B7280',
				terminalGreen: '#7FDB7F',
				mutedGold: '#B89B5E',
				amber: '#D6A756',
				danger: '#C56B6B',
				signalCyan: '#5FA3A3'
			},
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
				mono: ['IBM Plex Mono', 'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace']
			}
		}
	},
	plugins: []
};
