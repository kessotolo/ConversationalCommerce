/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // Admin-specific color palette
                admin: {
                    primary: '#3a36e0',
                    secondary: '#6c63ff',
                    accent: '#2d2b9a',
                    background: '#f8fafc',
                    surface: '#ffffff',
                    text: '#1e293b',
                    muted: '#64748b',
                },
                // Status colors
                status: {
                    success: '#10b981',
                    warning: '#f59e0b',
                    error: '#ef4444',
                    info: '#3b82f6',
                },
                // Context-aware colors
                context: {
                    admin: '#3a36e0',
                    tenant: '#0d904f',
                    impersonated: '#e74c3c',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            spacing: {
                '18': '4.5rem',
                '88': '22rem',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('tailwindcss-animate'),
    ],
}