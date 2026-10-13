/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'sk-paper': '#f4f1e8',
        'sk-ink': '#101827',
        'sk-lime': '#d7f264',
        'sk-blue': '#2563eb',
        'sk-orange': '#ff6b4a',
        'sk-yellow': '#ffd166',
      },
    },
  },
  plugins: [],
};
