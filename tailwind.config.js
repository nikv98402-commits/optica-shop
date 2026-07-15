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
        vilu: {
          ink: '#07110d',
          paper: '#f8f3e8',
          cream: '#fbf7ee',
          mist: '#14231d',
          green: '#2f6658',
          lime: '#d8ef4f',
          clay: '#8a6a35',
          line: 'rgba(7, 17, 13, 0.14)',
          night: '#07110d',
          foam: '#eef5e7',
          card: '#fffdf7',
          success: '#15803d',
          warning: '#92400e',
          error: '#b91c1c',
          info: '#1d4ed8',
        },
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
        'vilu-sm': '0.75rem',
        'vilu-md': '1rem',
        'vilu-lg': '1.5rem',
        'vilu-xl': '2rem',
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
