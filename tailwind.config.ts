import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        adapta: {
          50:  '#F2F7F6',
          100: '#EBF2F0',
          200: '#D5DEDB',
          300: '#CDD6D4',
          400: '#ABB8B5',
          500: '#697A76',
          600: '#52615E',
          700: '#404C4A',
          800: '#2E3836',
          900: '#191F1E',
          950: '#0C0F0F',
        },
        brand: {
          50:  '#D4F3EA',
          100: '#D4F3EA',
          200: '#A9E6D6',
          300: '#77D1BE',
          400: '#4AB7A3',
          500: '#319C8A',
          600: '#257C70',
          700: '#21645B',
          800: '#1F504A',
          900: '#1D443F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-md': '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)',
      },
    },
  },
  plugins: [],
}
export default config
