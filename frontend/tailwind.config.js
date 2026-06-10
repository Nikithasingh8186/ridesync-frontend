/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0d0f14',
          card: '#151820',
          elevated: '#1c2030',
        },
        border: {
          DEFAULT: '#252a38',
        },
        accent: {
          DEFAULT: '#4f8ef7',
          soft: 'rgba(79, 142, 247, 0.12)',
          green: '#22d3a5',
          'green-soft': 'rgba(34, 211, 165, 0.12)',
          amber: '#f5a623',
        },
        text: {
          primary: '#eef0f6',
          secondary: '#8b91a8',
          muted: '#545b72',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '12px',
        sm: '8px',
      },
      boxShadow: {
        card: '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
}