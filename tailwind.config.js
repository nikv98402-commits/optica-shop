/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        display: ['Unbounded', 'Manrope', 'system-ui', 'sans-serif'],
      },
      colors: {
        neutral: {
          50: '#fafafa',
          900: '#111111',
          950: '#0a0a0a',
        },
        accent: {
          500: '#000000',
          600: '#111111',
        }
      },
      borderRadius: {
        '4xl': '2.5rem',
      },
      boxShadow: {
        'apple': '0 10px 30px -10px rgb(0 0 0 / 0.08)',
        'apple-lg': '0 20px 50px -15px rgb(0 0 0 / 0.12)',
      }
    },
  },
  plugins: [],
};