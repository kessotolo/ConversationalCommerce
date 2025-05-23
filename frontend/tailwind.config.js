/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    darkMode: 'media',
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-geist-sans)'],
                mono: ['var(--font-geist-mono)'],
            },
            colors: {
                ivory: '#FFFFF0',
                green: {
                    sage: '#A8D5BA',
                    laurel: '#6C9A8B',
                },
                charcoal: {
                    dark: '#2F3E46',
                    medium: '#4A4A4A',
                },
                gray: {
                    light: '#F4F4F5',
                    medium: '#E5E7EB',
                },
                white: '#FFFFFF',
            },
            boxShadow: {
                'glow-green': '0 0 16px 2px #3FFFA8',
                'glass': '0 4px 32px 0 rgba(35,213,171,0.08)',
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    plugins: [],
}