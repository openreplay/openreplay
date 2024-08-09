/** @type {import('tailwindcss').Config} */
export default {
  content: ['./entrypoints/**/*.{html,tsx,ts,js,jsx}', "./components/**/*.{ts,tsx,jsx,js}"],
  darkMode: 'false',
  theme: {
    extend: {},
  },
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    darkTheme: "false",
  }
};