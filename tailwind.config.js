/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { "50": "#eff6ff", "100": "#dbeafe", "200": "#bfdbfe", "300": "#93c5fd", "400": "#60a5fa", "500": "#3b82f6", "600": "#2563eb", "700": "#1d4ed8", "800": "#1e40af", "900": "#1e3a8a", "950": "#172554" },
        rupee: '#2563eb',
        dark: {
          background: '#111827',
          card: '#1f2937',
          text: '#d1d5db',
          'text-secondary': '#9ca3af',
          border: '#374151',
          primary: '#60a5fa',
          input: '#374151'
        }
      }
    },
    fontFamily: {
      'body': ['Inter', 'ui-sans-serif', 'system-ui'],
      'sans': ['Inter', 'ui-sans-serif', 'system-ui']
    }
  },
  plugins: [],
}