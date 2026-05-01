/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        'primary-hover': '#4f46e5',
        background: '#0f172a',
        surface: '#1e293b',
        text: '#f8fafc',
        'text-muted': '#94a3b8',
        success: '#10b981',
        error: '#ef4444',
      },
    },
  },
  plugins: [],
}
