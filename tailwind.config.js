/** @type {import('tailwindcss').Config} */

/** Allow custom colors to work with Tailwind v3 opacity modifier (e.g. bg-card/80) */
function withOpacity(colorVar) {
    return ({ opacityValue }) => {
        if (opacityValue !== undefined) {
            return `rgba(${colorVar}, ${opacityValue})`;
        }
        return `rgb(${colorVar})`;
    };
}

// Raw RGB triplets for each token
const rgb = {
    background: '8, 12, 20',
    'background-secondary': '13, 18, 31',
    card: '15, 22, 38',
    'card-hover': '21, 30, 50',
    'card-subtle': '10, 15, 26',
    primary: '0, 229, 255',
    'primary-hover': '56, 237, 255',
    secondary: '59, 130, 246',
    text: '241, 245, 249',
    'text-muted': '148, 163, 184',
    muted: '136, 152, 170',
    danger: '239, 68, 68',
    warning: '245, 158, 11',
    success: '16, 185, 129',
};

export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: Object.fromEntries(
                Object.entries(rgb).map(([key, value]) => [key, withOpacity(value)])
            ),
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
            },
            boxShadow: {
                'panel': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
                'panel-glow': '0 0 25px -5px rgba(0, 229, 255, 0.15)',
                'card-inset': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
            }
        },
    },
    plugins: [],
}

